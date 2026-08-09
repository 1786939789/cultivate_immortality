import { createHash } from "node:crypto";
import { mysqlPool } from "../server/mysqlDb.mjs";
import { loadStateFromMysql, saveStateToMysql } from "../server/mysqlStateRepository.mjs";
import { cleanupFixture, createFixture } from "./mysql-test-fixture.mjs";

function stateHash(value) {
  const state = structuredClone(value);
  delete state.__stateRevision;
  return createHash("sha256").update(JSON.stringify(state)).digest("hex");
}

const fixture = await createFixture({ prefix: "migration-smoke-" });
const testId = fixture.saveId;

try {
  const restored = await loadStateFromMysql(testId);
  if (!restored) throw new Error("Temporary fixture could not be loaded");
  const stableHash = stateHash(restored);
  const firstRevision = restored.__stateRevision;
  await saveStateToMysql(structuredClone(restored), testId);
  const revised = await loadStateFromMysql(testId);
  if (stateHash(revised) !== stableHash) throw new Error("Temporary save round-trip mismatch");
  if (Number(revised.__stateRevision) !== Number(firstRevision) + 1) throw new Error("State revision did not increment");
  const [counts] = await mysqlPool.query(`
    SELECT
      (SELECT COUNT(*) FROM cultivators WHERE save_id = ?) AS cultivators,
      (SELECT COUNT(*) FROM duel_matches WHERE save_id = ?) AS duel_matches
  `, [testId, testId]);
  console.log(JSON.stringify({
    roundTrip: true,
    revisionIncremented: true,
    cultivators: Number(counts[0].cultivators),
    duelMatches: Number(counts[0].duel_matches)
  }));
} finally {
  await cleanupFixture(testId);
  await mysqlPool.end();
}
