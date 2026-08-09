import { createHash } from "node:crypto";
import { ensureMysqlSchema, mysqlPool, parseMysqlJson } from "../server/mysqlDb.mjs";
import { loadStateFromMysql } from "../server/mysqlStateRepository.mjs";

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
}
const hash = (value) => createHash("sha256").update(JSON.stringify(canonical(value ?? null))).digest("hex");
const sorted = (value, keyFn) => Array.isArray(value) ? [...value].sort((a, b) => String(keyFn(a)).localeCompare(String(keyFn(b)))) : [];
const comparableLog = (item) => {
  if (!item || typeof item !== "object") return item;
  const { id: _id, ...withoutStorageId } = item;
  return withoutStorageId;
};
await ensureMysqlSchema();
const [saves] = await mysqlPool.query("SELECT save_id FROM game_saves ORDER BY save_id");
const report = { saves: saves.length, rows: [], passed: true };
try {
  for (const { save_id: saveId } of saves) {
    const [oldRows] = await mysqlPool.query("SELECT section_key,section_json FROM save_sections WHERE save_id=? AND section_key IN ('taskDefinitions','taskProgress','taskCompletions','taskMultiplierRecords','log')", [saveId]);
    const old = Object.fromEntries(oldRows.map((row) => [row.section_key, parseMysqlJson(row.section_json, null)]));
    const [[counts]] = await mysqlPool.query(`SELECT
      (SELECT COUNT(*) FROM task_definitions_v2 WHERE save_id=?) definitions,
      (SELECT COUNT(*) FROM task_completions_v2 WHERE save_id=?) completions,
      (SELECT COUNT(*) FROM game_logs_v2 WHERE save_id=?) logs,
      (SELECT COUNT(*) FROM cultivators WHERE save_id=?) cultivators,
      (SELECT COUNT(*) FROM cultivator_metrics_v2 WHERE save_id=?) metrics,
      (SELECT COUNT(*) FROM spirit_pearl_assets_v2 WHERE save_id=?) pearl_assets,
      (SELECT COUNT(*) FROM battle_replays WHERE save_id=?) replays`, [saveId,saveId,saveId,saveId,saveId,saveId,saveId]);
    const [v2Definitions] = await mysqlPool.query("SELECT definition_json FROM task_definitions_v2 WHERE save_id=?", [saveId]);
    const [v2Completions] = await mysqlPool.query("SELECT completion_json FROM task_completions_v2 WHERE save_id=?", [saveId]);
    const [v2Logs] = await mysqlPool.query("SELECT log_json FROM game_logs_v2 WHERE save_id=?", [saveId]);
    const oldDefinitions = sorted(old.taskDefinitions, (item) => item?.id);
    const newDefinitions = sorted(v2Definitions.map((item) => parseMysqlJson(item.definition_json, {})), (item) => item?.id);
    const oldCompletions = sorted(old.taskCompletions, (item) => item?.id);
    const newCompletions = sorted(v2Completions.map((item) => parseMysqlJson(item.completion_json, {})), (item) => item?.id);
    const oldLogs = sorted((old.log || []).map(comparableLog), (item) => JSON.stringify(item));
    const newLogs = sorted(v2Logs.map((item) => comparableLog(parseMysqlJson(item.log_json, {}))), (item) => JSON.stringify(item));
    const [progressRows] = await mysqlPool.query("SELECT day_no,task_id,completed_amount,awarded_multiplier FROM task_progress_v2 WHERE save_id=?", [saveId]);
    const [multiplierRows] = await mysqlPool.query("SELECT day_no,snapshot_json FROM task_multiplier_snapshots_v2 WHERE save_id=?", [saveId]);
    const oldProgress = Object.entries(old.taskProgress || {}).flatMap(([day, entries]) => Object.entries(entries || {}).map(([taskId, entry]) => ({ day: Number(day), taskId, amount: Number(entry?.amount || 0), awardedMultiplier: Number(entry?.awardedMultiplier || 0) })));
    const newProgress = progressRows.map((row) => ({ day: Number(row.day_no), taskId: row.task_id, amount: Number(row.completed_amount), awardedMultiplier: Number(row.awarded_multiplier) }));
    const oldMultipliers = (old.taskMultiplierRecords || []).map((item) => ({ ...item, day: Number(item.day) }));
    const newMultipliers = multiplierRows.map((row) => parseMysqlJson(row.snapshot_json, { day: Number(row.day_no) }));
    const [replayRows] = await mysqlPool.query("SELECT replay_id,replay_json,content_hash FROM battle_replays WHERE save_id=? ORDER BY replay_id", [saveId]);
    const row = {
      saveId,
      definitionsEqual: hash(oldDefinitions) === hash(newDefinitions),
      completionsEqual: hash(oldCompletions) === hash(newCompletions),
      logsCountEqual: Array.isArray(old.log) && Number(counts.logs) === old.log.length,
      logsEqual: hash(oldLogs) === hash(newLogs),
      progressEqual: hash(sorted(oldProgress, (item) => `${item.day}:${item.taskId}`)) === hash(sorted(newProgress, (item) => `${item.day}:${item.taskId}`)),
      multipliersEqual: hash(sorted(oldMultipliers, (item) => item.day)) === hash(sorted(newMultipliers, (item) => item.day)),
      cultivatorsEqualMetrics: Number(counts.cultivators) === Number(counts.metrics),
      pearlAssetsEqualCultivators: Number(counts.cultivators) === Number(counts.pearl_assets),
      replayCountEqual: Number(counts.replays) === Number(replayRows.length),
      replays: Number(counts.replays)
    };
    row.passed = Object.entries(row).filter(([key]) => key.endsWith("Equal")).every(([, value]) => value === true);
    report.rows.push(row); report.passed &&= row.passed;
  }
  console.log(JSON.stringify(report));
} finally { await mysqlPool.end(); }
