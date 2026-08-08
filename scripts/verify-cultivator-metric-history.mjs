import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mysqlPool } from "../server/mysqlDb.mjs";
import { loadStateFromMysql, saveStateToMysql } from "../server/mysqlStateRepository.mjs";
import { getPublicCultivatorDetail } from "../server/gameLogic.mjs";
import { readCultivatorDetailIncremental } from "../server/cultivatorIncrementalRepository.mjs";
import { readState } from "../server/mysqlStore.mjs";

const [[source]] = await mysqlPool.query(`SELECT s.save_id FROM game_saves s
  JOIN auth_users u ON u.id=s.save_id WHERE u.role <> 'admin' ORDER BY s.updated_at DESC LIMIT 1`);
if (!source) throw new Error("没有可用于验证的人物存档");
const testId = `metric-history-test-${randomUUID()}`;

try {
  const state = await loadStateFromMysql(source.save_id);
  const expected = getPublicCultivatorDetail(state, "player");
  await mysqlPool.query(`INSERT INTO auth_users
    (id,username,username_normalized,password_hash,password_salt,role) VALUES(?,?,?,?,?,'user')`,
  [testId, testId, testId, "test", "test"]);
  await saveStateToMysql(structuredClone(state), testId);
  const [[before]] = await mysqlPool.query("SELECT COUNT(DISTINCT day_no) days FROM cultivator_rank_snapshots_v2 WHERE save_id=?", [testId]);
  assert.equal(Number(before.days), 1, "普通写入只应维护当前日快照，避免日常写放大");
  await readState(testId, { skipSettlementEnqueue: true });
  const actual = await readCultivatorDetailIncremental(testId, "player");

  assert.deepEqual(actual.rankingTrends, expected.rankingTrends, "独立接口最近十日战斗力/段位排名应与旧详情一致");
  assert.deepEqual(actual.combatRating, expected.combatRating, "独立接口最近十日战斗评分应与旧详情一致");
  assert.equal(actual.combatRating.daily.length, 10, "有十日战斗记录时应返回十天评分");
  assert.equal(actual.rankingTrends.power.length, 10, "应返回最近十天战斗力排名");
  assert.equal(actual.rankingTrends.duel.length, 10, "应返回最近十天段位排名");
  console.log(JSON.stringify({ verified: true, sourceSaveId: source.save_id, initialDays: Number(before.days), days: actual.combatRating.daily.length }));
} finally {
  await mysqlPool.query("DELETE FROM auth_users WHERE id=?", [testId]);
  await mysqlPool.end();
}
