import { createHash, randomUUID } from "node:crypto";
import { mysqlPool } from "../server/mysqlDb.mjs";
import { loadStateFromMysql, saveStateToMysql } from "../server/mysqlStateRepository.mjs";

function stateHash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

const [[source]] = await mysqlPool.query("SELECT save_id FROM game_saves ORDER BY save_id LIMIT 1");
if (!source) throw new Error("No source save is available for the smoke test");

const original = await loadStateFromMysql(source.save_id);
const testId = `migration-smoke-${randomUUID()}`;

try {
  await saveStateToMysql(structuredClone(original), testId);
  const restored = await loadStateFromMysql(testId);
  if (!restored || stateHash(restored) !== stateHash(original)) throw new Error("Temporary save round-trip mismatch");
  const [counts] = await mysqlPool.query(`
    SELECT
      (SELECT COUNT(*) FROM cultivators WHERE save_id = ?) AS cultivators,
      (SELECT COUNT(*) FROM duel_matches WHERE save_id = ?) AS duel_matches
  `, [testId, testId]);
  console.log(JSON.stringify({
    roundTrip: true,
    cultivators: Number(counts[0].cultivators),
    duelMatches: Number(counts[0].duel_matches)
  }));
} finally {
  await mysqlPool.query("DELETE FROM game_saves WHERE save_id = ?", [testId]);
  await mysqlPool.end();
}
