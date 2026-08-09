import { randomUUID } from "node:crypto";
import { mysqlPool } from "../server/mysqlDb.mjs";
import { loadStateFromMysql, saveStateToMysql } from "../server/mysqlStateRepository.mjs";

const testPrefixes = ["cultivator-v2-test-", "metric-history-test-", "persistence-job-test-", "persistence-inactive-", "verify-new-", "refactor-standard-", "migration-smoke-", "task-test-", "user-safety-"];

export async function selectFixtureSource({ sourceSaveId = process.env.TEST_SOURCE_SAVE_ID } = {}) {
  if (sourceSaveId) {
    const [[row]] = await mysqlPool.query("SELECT save_id FROM game_saves WHERE save_id=? LIMIT 1", [sourceSaveId]);
    if (!row) throw new Error(`测试源存档不存在: ${sourceSaveId}`);
    return row.save_id;
  }
  const placeholders = testPrefixes.map(() => "?").join(",");
  const [[row]] = await mysqlPool.query(`SELECT s.save_id FROM game_saves s
    LEFT JOIN auth_users u ON u.id=s.save_id
    WHERE s.save_id NOT IN (${placeholders}) AND ${testPrefixes.map(() => "s.save_id NOT LIKE ?").join(" AND ")}
      AND (u.id IS NULL OR u.role <> 'admin') ORDER BY s.updated_at DESC LIMIT 1`, [...testPrefixes, ...testPrefixes.map((prefix) => `${prefix}%`)]);
  if (!row) throw new Error("没有可用于测试的用户存档");
  return row.save_id;
}

export async function cleanupFixture(saveId) {
  await mysqlPool.query("DELETE FROM background_jobs WHERE save_id=?", [saveId]);
  await mysqlPool.query("DELETE FROM auth_users WHERE id=?", [saveId]);
  await mysqlPool.query("DELETE FROM game_saves WHERE save_id=?", [saveId]);
}

export async function createFixture({ prefix = "fixture-", sourceSaveId, authUser = true, preserveMetricHistory = true, cleanTransientRuns = false } = {}) {
  const source = await selectFixtureSource({ sourceSaveId });
  const saveId = `${prefix}${randomUUID()}`;
  if (authUser) await mysqlPool.query(`INSERT INTO auth_users
    (id,username,username_normalized,password_hash,password_salt,role) VALUES(?,?,?,?,?,'user')`, [saveId, saveId, saveId, "fixture", "fixture"]);
  try {
    const state = await loadStateFromMysql(source);
    if (cleanTransientRuns) {
      state.daoTrial = { ...(state.daoTrial || {}), activeRun: null, tickets: Math.max(1, Number(state.daoTrial?.tickets || 0)) };
      state.encounters = { ...(state.encounters || {}), pending: [] };
    }
    await saveStateToMysql(structuredClone(state), saveId);
    if (preserveMetricHistory) {
      await mysqlPool.query(`INSERT INTO cultivator_rank_snapshots_v2
        (save_id,cultivator_id,day_no,power,power_rank,duel_score,duel_rank,combat_score,combat_rank,snapshot_json,content_hash)
        SELECT ?,cultivator_id,day_no,power,power_rank,duel_score,duel_rank,combat_score,combat_rank,snapshot_json,content_hash
        FROM cultivator_rank_snapshots_v2 WHERE save_id=?
        ON DUPLICATE KEY UPDATE power=VALUES(power),power_rank=VALUES(power_rank),duel_score=VALUES(duel_score),duel_rank=VALUES(duel_rank),combat_score=VALUES(combat_score),combat_rank=VALUES(combat_rank),snapshot_json=VALUES(snapshot_json),content_hash=VALUES(content_hash)`, [saveId, source]);
    }
  } catch (error) {
    await cleanupFixture(saveId);
    throw error;
  }
  return { saveId, sourceSaveId: source };
}

export async function cleanupFixtures() {
  const clauses = testPrefixes.map(() => "save_id LIKE ?").join(" OR ");
  const params = testPrefixes.map((prefix) => `${prefix}%`);
  const [rows] = await mysqlPool.query(`SELECT save_id FROM game_saves WHERE ${clauses}`, params);
  for (const row of rows) await cleanupFixture(row.save_id);
  return rows.length;
}
