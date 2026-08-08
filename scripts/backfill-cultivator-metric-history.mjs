import { mysqlPool } from "../server/mysqlDb.mjs";
import { loadStateFromMysql, saveStateToMysql } from "../server/mysqlStateRepository.mjs";

const requestedSaveId = String(process.argv[2] || "").trim();
const [rows] = requestedSaveId
  ? await mysqlPool.query("SELECT save_id FROM game_saves WHERE save_id=?", [requestedSaveId])
  : await mysqlPool.query("SELECT save_id FROM game_saves ORDER BY save_id");

try {
  for (const { save_id: saveId } of rows) {
    const state = await loadStateFromMysql(saveId);
    if (!state) continue;
    await saveStateToMysql(state, saveId, {
      domains: ["cultivators"],
      expectedRevision: state.__stateRevision,
      skipReplayExtraction: true,
      backfillMetricHistory: true
    });
    const [[coverage]] = await mysqlPool.query(`SELECT COUNT(DISTINCT day_no) days, COUNT(*) snapshots
      FROM cultivator_rank_snapshots_v2 WHERE save_id=?`, [saveId]);
    console.log(JSON.stringify({ saveId, days: Number(coverage.days), snapshots: Number(coverage.snapshots) }));
  }
} finally {
  await mysqlPool.end();
}
