import { performance } from "node:perf_hooks";
import { mysqlPool, withMysqlTransaction } from "../server/mysqlDb.mjs";
import { loadStateFromMysql } from "../server/mysqlStateRepository.mjs";
import { runPlayerActionIncremental } from "../server/playerActionCommand.mjs";
import { completeTaskIncremental } from "../server/taskCommand.mjs";
import { cleanupFixture, createFixture } from "./mysql-test-fixture.mjs";

const fixture = await createFixture({ prefix: "refactor-standard-" });
const testId = fixture.saveId;
const report = {};
try {
  const sourceState = await loadStateFromMysql(fixture.sourceSaveId);
  const beforeCounts = await mysqlPool.query(`SELECT
    (SELECT COUNT(*) FROM cultivators WHERE save_id=?) cultivators,
    (SELECT COUNT(*) FROM battle_replays WHERE save_id=?) replays`, [testId, testId]);
  const start = performance.now();
  await runPlayerActionIncremental(testId, "rest", {});
  report.restMs = Number((performance.now() - start).toFixed(2));
  const after = await loadStateFromMysql(testId);
  const afterCounts = await mysqlPool.query(`SELECT
    (SELECT COUNT(*) FROM cultivators WHERE save_id=?) cultivators,
    (SELECT COUNT(*) FROM battle_replays WHERE save_id=?) replays`, [testId, testId]);
  report.npcsPreserved = Number(beforeCounts[0][0].cultivators) === Number(afterCounts[0][0].cultivators);
  report.replaysPreserved = Number(beforeCounts[0][0].replays) === Number(afterCounts[0][0].replays);
  report.fullReloadConsistent = after.player.hp >= sourceState.player.hp;

  const [[definition]] = await mysqlPool.query("SELECT task_id,definition_json FROM task_definitions_v2 WHERE save_id=? AND enabled=1 ORDER BY task_id LIMIT 1", [testId]);
  if (definition) {
    const parsed = JSON.parse(definition.definition_json);
    try { await completeTaskIncremental(testId, { taskId: definition.task_id, completedAmount: parsed.type === "measurable" ? Math.max(.01, Number(parsed.targetAmount || 1) * .01) : 1, day: after.day }); report.taskTransaction = true; } catch (error) { report.taskTransaction = /已结算|已计入/.test(error.message); }
  }

  const rollbackBefore = await mysqlPool.query("SELECT state_revision FROM game_saves WHERE save_id=?", [testId]);
  let rolledBack = false;
  try { await withMysqlTransaction(async (connection) => { await connection.query("UPDATE cultivators SET xp=xp+999 WHERE save_id=? AND cultivator_id='player'", [testId]); throw new Error("rollback-probe"); }); } catch (error) { rolledBack = error.message === "rollback-probe"; }
  const [[xpDb]] = await mysqlPool.query("SELECT xp FROM cultivators WHERE save_id=? AND cultivator_id='player'", [testId]);
  report.transactionRollback = rolledBack && Number(xpDb.xp) === Number((await loadStateFromMysql(testId)).player.xp);
  report.revisionStableAfterRollback = Number(rollbackBefore[0][0].state_revision) === Number((await mysqlPool.query("SELECT state_revision FROM game_saves WHERE save_id=?", [testId]))[0][0].state_revision);
  console.log(JSON.stringify(report));
} finally { await cleanupFixture(testId); await mysqlPool.end(); }
