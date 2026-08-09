import { createHash } from "node:crypto";
import { ensureMysqlSchema, mysqlPool, parseMysqlJson, withMysqlTransaction } from "../server/mysqlDb.mjs";

function json(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function hash(value) {
  return createHash("sha256").update(typeof value === "string" ? value : json(value)).digest("hex");
}

function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function completionId(record, index) {
  return String(record?.id || `legacy-task-${record?.day || 0}-${record?.taskId || "task"}-${index}`);
}

await ensureMysqlSchema();
const [saveRows] = await mysqlPool.query("SELECT save_id FROM game_saves ORDER BY save_id");
let migrated = 0;
let taskRows = 0;
let completionRows = 0;
let logRows = 0;

try {
  for (const { save_id: saveId } of saveRows) {
    await withMysqlTransaction(async (connection) => {
      const [playerRows] = await connection.query(`
        SELECT cultivator_json, xp, spirit, current_power, current_combat_rating
        FROM cultivators
        WHERE save_id = ? AND cultivator_id = 'player'
        LIMIT 1
      `, [saveId]);
      const [sectionRows] = await connection.query(`
        SELECT section_key, section_json
        FROM save_sections
        WHERE save_id = ? AND section_key IN ('taskDefinitions', 'taskProgress', 'taskCompletions', 'taskMultiplierRecords')
      `, [saveId]);
      const sections = Object.fromEntries(sectionRows.map((row) => [row.section_key, parseMysqlJson(row.section_json, null)]));
      const player = playerRows[0] ? parseMysqlJson(playerRows[0].cultivator_json, {}) || {} : {};

      for (const definition of Array.isArray(sections.taskDefinitions) ? sections.taskDefinitions : []) {
        const definitionText = json(definition);
        await connection.query(`
          INSERT INTO task_definitions_v2 (save_id, task_id, category, enabled, definition_json, content_hash)
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE category = VALUES(category), enabled = VALUES(enabled), definition_json = VALUES(definition_json), content_hash = VALUES(content_hash)
        `, [saveId, definition.id, definition.category || "", definition.enabled === false ? 0 : 1, definitionText, hash(definitionText)]);
        taskRows += 1;
      }

      for (const snapshot of Array.isArray(sections.taskMultiplierRecords) ? sections.taskMultiplierRecords : []) {
        const snapshotText = json(snapshot);
        await connection.query(`
          INSERT INTO task_multiplier_snapshots_v2 (save_id, day_no, date_key, elixir_multiplier, sect_xp_multiplier, total_multiplier, snapshot_json, content_hash)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE date_key = VALUES(date_key), elixir_multiplier = VALUES(elixir_multiplier), sect_xp_multiplier = VALUES(sect_xp_multiplier), total_multiplier = VALUES(total_multiplier), snapshot_json = VALUES(snapshot_json), content_hash = VALUES(content_hash)
        `, [saveId, asNumber(snapshot.day), snapshot.date || "", asNumber(snapshot.elixirMultiplier, 1), asNumber(snapshot.sectXpMultiplier, 1), asNumber(snapshot.totalMultiplier, 1), snapshotText, hash(snapshotText)]);
      }

      const progress = sections.taskProgress && typeof sections.taskProgress === "object" ? sections.taskProgress : {};
      for (const [dayKey, entries] of Object.entries(progress)) {
        for (const [taskId, entry] of Object.entries(entries || {})) {
          await connection.query(`
            INSERT INTO task_progress_v2 (save_id, day_no, task_id, completed_amount, awarded_multiplier)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE completed_amount = VALUES(completed_amount), awarded_multiplier = VALUES(awarded_multiplier)
          `, [saveId, asNumber(dayKey), taskId, asNumber(entry.amount), asNumber(entry.awardedMultiplier)]);
        }
      }

      for (const [index, completion] of (Array.isArray(sections.taskCompletions) ? sections.taskCompletions : []).entries()) {
        const completionText = json(completion);
        await connection.query(`
          INSERT INTO task_completions_v2
            (save_id, completion_id, day_no, task_id, completed_amount, multiplier, xp, base_xp, spirit, completion_json, content_hash)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE completion_json = VALUES(completion_json), content_hash = VALUES(content_hash)
        `, [saveId, completionId(completion, index), asNumber(completion.day), completion.taskId || "", asNumber(completion.completedAmount), asNumber(completion.multiplier), asNumber(completion.xp), asNumber(completion.baseXp), asNumber(completion.spirit), completionText, hash(completionText)]);
        completionRows += 1;
      }

      const dailyRecords = Array.isArray(player.dailyRecords) ? player.dailyRecords : [];
      for (const record of dailyRecords) {
        const recordText = json(record);
        await connection.query(`
          INSERT INTO task_daily_records_v2 (save_id, cultivator_id, day_no, record_json, content_hash)
          VALUES (?, 'player', ?, ?, ?)
          ON DUPLICATE KEY UPDATE record_json = VALUES(record_json), content_hash = VALUES(content_hash)
        `, [saveId, asNumber(record.day), recordText, hash(recordText)]);
      }

      const [logSection] = await connection.query(`
        SELECT section_json FROM save_sections WHERE save_id = ? AND section_key = 'log'
        LIMIT 1
      `, [saveId]);
      const logs = logSection.length ? parseMysqlJson(logSection[0].section_json, []) : [];
      const logList = Array.isArray(logs) ? logs : [];
      for (const [index, entry] of logList.entries()) {
        const entryText = json(entry);
        const id = String(entry.id || `legacy-log-${entry.day || 0}-${index}-${hash(entryText).slice(0, 12)}`);
        await connection.query(`
          INSERT INTO game_logs_v2 (save_id, log_id, day_no, position_no, log_type, log_text, log_json, content_hash)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE day_no=VALUES(day_no), position_no=VALUES(position_no), log_text = VALUES(log_text), log_json = VALUES(log_json), content_hash = VALUES(content_hash)
        `, [saveId, id, asNumber(entry.day), logList.length - index, entry.type || "", entry.text || "", entryText, hash(entryText)]);
        logRows += 1;
      }
    });
    migrated += 1;
    console.log(`[incremental-migrate] ${saveId}`);
  }
  console.log(JSON.stringify({ migrated, taskRows, completionRows, logRows }));
} finally {
  await mysqlPool.end();
}
