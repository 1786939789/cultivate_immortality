import { createHash, randomUUID } from "node:crypto";
import { compactStateForStorage } from "../server/gameLogic.mjs";
import { mysqlPool } from "../server/mysqlDb.mjs";
import { loadStateFromMysql, saveStateToMysql } from "../server/mysqlStateRepository.mjs";

function stateHash(value) {
  const state = structuredClone(value);
  delete state.__stateRevision;
  return createHash("sha256").update(JSON.stringify(state)).digest("hex");
}

const [[source]] = await mysqlPool.query("SELECT save_id FROM game_saves ORDER BY save_id LIMIT 1");
if (!source) throw new Error("No source save is available for the smoke test");

const original = await loadStateFromMysql(source.save_id);
const expected = structuredClone(original);
compactStateForStorage(expected);
const testId = `migration-smoke-${randomUUID()}`;

try {
  await saveStateToMysql(structuredClone(original), testId);
  const restored = await loadStateFromMysql(testId);
  if (!restored || stateHash(restored) !== stateHash(expected)) throw new Error("Temporary save round-trip mismatch");
  const firstRevision = restored.__stateRevision;
  await saveStateToMysql(structuredClone(restored), testId);
  const revised = await loadStateFromMysql(testId);
  if (Number(revised.__stateRevision) !== Number(firstRevision) + 1) throw new Error("State revision did not increment");
  const [counts] = await mysqlPool.query(`
    SELECT
      (SELECT COUNT(*) FROM cultivators WHERE save_id = ?) AS cultivators,
      (SELECT COUNT(*) FROM duel_matches WHERE save_id = ?) AS duel_matches,
      (SELECT COUNT(*) FROM task_completions WHERE save_id = ?) AS task_completions,
      (SELECT COUNT(*) FROM player_hot_state WHERE save_id = ?) AS player_hot_rows,
      (SELECT COUNT(*) FROM save_sections WHERE save_id = ? AND section_key IN ('tasks', 'taskCompletions', 'taskProgress')) AS legacy_task_sections
  `, [testId, testId, testId, testId, testId]);
  if (Number(counts[0].task_completions) !== expected.taskCompletions.length) throw new Error("Task completion rows mismatch");
  if (Number(counts[0].player_hot_rows) !== 1) throw new Error("Player hot-state row missing");
  if (Number(counts[0].legacy_task_sections) !== 0) throw new Error("Legacy task sections were persisted");
  console.log(JSON.stringify({
    roundTrip: true,
    revisionIncremented: true,
    cultivators: Number(counts[0].cultivators),
    duelMatches: Number(counts[0].duel_matches),
    taskCompletions: Number(counts[0].task_completions),
    playerHotRows: Number(counts[0].player_hot_rows),
    legacyTaskSections: Number(counts[0].legacy_task_sections)
  }));
} finally {
  await mysqlPool.query("DELETE FROM game_saves WHERE save_id = ?", [testId]);
  await mysqlPool.end();
}
