import assert from "node:assert/strict";
import { mysqlPool } from "../server/mysqlDb.mjs";
import { loadStateFromMysql } from "../server/mysqlStateRepository.mjs";
import { buildCombatRatings, powerOf } from "../server/gameLogic.mjs";

const requestedSaveId = String(process.env.SAVE_ID || "").trim();
const [saves] = await mysqlPool.query(`SELECT save_id FROM game_saves ${requestedSaveId ? "WHERE save_id=?" : "ORDER BY save_id"}`, requestedSaveId ? [requestedSaveId] : []);
const report = { saves: 0, rows: 0, missingMetrics: 0, orphanMetrics: 0, compatibilityMismatches: 0, powerMismatches: 0, ratingMismatches: 0, passed: true, examples: [] };
try {
  for (const { save_id: saveId } of saves) {
    report.saves += 1;
    const state = await loadStateFromMysql(saveId);
    const people = [state.player, ...(state.npcs || [])];
    const ratings = new Map(buildCombatRatings(state).entries.map((entry) => [entry.id, Number(entry.score)]));
    const [metricRows] = await mysqlPool.query("SELECT * FROM cultivator_metrics_v2 WHERE save_id=?", [saveId]);
    const metricById = new Map(metricRows.map((row) => [row.cultivator_id, row]));
    const [cultivatorRows] = await mysqlPool.query("SELECT cultivator_id,current_power,current_combat_rating FROM cultivators WHERE save_id=?", [saveId]);
    const cultivatorIds = new Set(cultivatorRows.map((row) => row.cultivator_id));
    report.rows += people.length;
    for (const person of people) {
      const row = cultivatorRows.find((item) => item.cultivator_id === person.id);
      const metric = metricById.get(person.id);
      if (!metric) { report.missingMetrics += 1; report.passed = false; continue; }
      if (!row || !cultivatorIds.has(person.id)) { report.orphanMetrics += 1; report.passed = false; continue; }
      const expectedPower = powerOf(person, state);
      const expectedRating = ratings.get(person.id);
      const mismatches = [];
      if (Number(row.current_power) !== Number(metric.current_power) || Number(row.current_combat_rating) !== Number(metric.current_combat_rating)) {
        report.compatibilityMismatches += 1; mismatches.push("compatibility");
      }
      if (Number(metric.current_power) !== Number(expectedPower)) { report.powerMismatches += 1; mismatches.push("power"); }
      if (Number(metric.current_combat_rating) !== Number(expectedRating)) { report.ratingMismatches += 1; mismatches.push("rating"); }
      if (mismatches.length) {
        report.passed = false;
        if (report.examples.length < 20) report.examples.push({ saveId, cultivatorId: person.id, mismatches, stored: { power: Number(metric.current_power), rating: Number(metric.current_combat_rating) }, expected: { power: expectedPower, rating: expectedRating } });
      }
    }
    if (metricRows.some((row) => !cultivatorIds.has(row.cultivator_id))) {
      report.orphanMetrics += metricRows.filter((row) => !cultivatorIds.has(row.cultivator_id)).length;
      report.passed = false;
    }
  }
  assert.equal(report.passed, true, JSON.stringify(report));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await mysqlPool.end();
}
