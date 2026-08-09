import assert from "node:assert/strict";
import { mysqlPool } from "../server/mysqlDb.mjs";
import { loadStateFromMysql } from "../server/mysqlStateRepository.mjs";
import { getPublicCultivatorDetail } from "../server/gameLogic.mjs";
import { readCultivatorDetailIncremental } from "../server/cultivatorIncrementalRepository.mjs";
import { readState } from "../server/mysqlStore.mjs";
import { cleanupFixture, createFixture } from "./mysql-test-fixture.mjs";

const fixture = await createFixture({ prefix: "metric-history-test-", preserveMetricHistory: false });
const testId = fixture.saveId;

function assertJsonEqual(actual, expected, message) {
  assert.equal(JSON.stringify(actual), JSON.stringify(expected), message);
}

try {
  const state = await loadStateFromMysql(fixture.sourceSaveId);
  const expected = getPublicCultivatorDetail(state, "player");
  const [[before]] = await mysqlPool.query("SELECT COUNT(DISTINCT day_no) days FROM cultivator_rank_snapshots_v2 WHERE save_id=?", [testId]);
  assert.equal(Number(before.days), 1, "普通写入只应维护当前日快照，避免日常写放大");
  await readState(testId, { skipSettlementEnqueue: true });
  const actual = await readCultivatorDetailIncremental(testId, "player");

  assertJsonEqual(actual.rankingTrends, expected.rankingTrends, "独立接口最近十日战斗力/段位排名应与旧详情一致");
  assertJsonEqual(actual.combatRating, expected.combatRating, "独立接口最近十日战斗评分应与旧详情一致");
  assert.equal(actual.combatRating.daily.length, 10, "有十日战斗记录时应返回十天评分");
  assert.equal(actual.rankingTrends.power.length, 10, "应返回最近十天战斗力排名");
  assert.equal(actual.rankingTrends.duel.length, 10, "应返回最近十天段位排名");
  console.log(JSON.stringify({ verified: true, sourceSaveId: fixture.sourceSaveId, initialDays: Number(before.days), days: actual.combatRating.daily.length }));
} finally {
  await cleanupFixture(testId);
  await mysqlPool.end();
}
