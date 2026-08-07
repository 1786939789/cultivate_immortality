import { createHash } from "node:crypto";
import { mysqlPool, parseMysqlJson, withMysqlTransaction } from "./mysqlDb.mjs";

function json(value) {
  return JSON.stringify(value === undefined ? null : value);
}

function hash(value) {
  return createHash("sha256").update(typeof value === "string" ? value : json(value)).digest("hex");
}

function safeId(value, fallback = "") {
  return String(value || fallback).trim();
}

function mysqlNumber(value) {
  return Number(value || 0);
}

export async function ensureTaskIncrementalSchema() {
  // mysqlDb.ensureMysqlSchema creates these tables during normal bootstrap.
  // This function is intentionally read-only and useful for smoke tests.
  const [rows] = await mysqlPool.query(`
    SELECT TABLE_NAME
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('task_definitions_v2', 'task_progress_v2', 'task_completions_v2', 'task_multiplier_snapshots_v2', 'task_daily_records_v2', 'game_logs_v2')
  `);
  return new Set(rows.map((row) => row.TABLE_NAME));
}

export async function readTaskInputs(saveId, taskId, dayNo, db = mysqlPool) {
  const [saveRows] = await db.query(`
    SELECT day_no, calendar_start_date, last_settlement_date, state_revision
    FROM game_saves
    WHERE save_id = ?
    LIMIT 1
  `, [saveId]);
  if (!saveRows.length) return null;

  const [playerRows] = await db.query(`
    SELECT *
    FROM cultivators
    WHERE save_id = ? AND cultivator_id = 'player'
    LIMIT 1
  `, [saveId]);
  if (!playerRows.length) return null;
  const [npcRows] = await db.query(`
    SELECT realm_no FROM cultivators
    WHERE save_id = ? AND cultivator_kind = 'npc'
    ORDER BY realm_no
  `, [saveId]);

  const [definitionRows] = await db.query(`
    SELECT definition_json
    FROM task_definitions_v2
    WHERE save_id = ? AND task_id = ? AND enabled = 1
    LIMIT 1
  `, [saveId, taskId]);
  const [progressRows] = await db.query(`
    SELECT completed_amount, awarded_multiplier
    FROM task_progress_v2
    WHERE save_id = ? AND day_no = ? AND task_id = ?
    LIMIT 1
  `, [saveId, dayNo, taskId]);
  const [multiplierRows] = await db.query(`
    SELECT snapshot_json
    FROM task_multiplier_snapshots_v2
    WHERE save_id = ? AND day_no = ?
    LIMIT 1
  `, [saveId, dayNo]);
  const [completionRows] = await db.query(`SELECT completion_json, base_xp
    FROM task_completions_v2
    WHERE save_id = ? AND day_no = ?
    ORDER BY created_at, completion_id
  `, [saveId, dayNo]);
  const [recentRows] = await db.query(`
    SELECT completion_json FROM task_completions_v2
    WHERE save_id = ? ORDER BY created_at DESC, completion_id DESC LIMIT 16
  `, [saveId]);

  const [sectionRows] = await db.query(`
    SELECT section_key, section_json FROM save_sections
    WHERE save_id = ? AND section_key IN ('gameSettings', 'taskDefinitions', 'taskProgress')
  `, [saveId]);
  const settings = Object.fromEntries(sectionRows.map((row) => [row.section_key, parseMysqlJson(row.section_json, {})]));
  const legacyDefinition = definitionRows.length ? null : (Array.isArray(settings.taskDefinitions)
    ? settings.taskDefinitions.find((item) => String(item?.id) === String(taskId) && item.enabled !== false)
    : null);
  const legacyProgress = progressRows.length ? progressRows[0] : (settings.taskProgress?.[dayNo]?.[taskId]
    ? {
      completed_amount: settings.taskProgress[dayNo][taskId].amount || 0,
      awarded_multiplier: settings.taskProgress[dayNo][taskId].awardedMultiplier || 0
    }
    : null);
  const [dailyRows] = await db.query(`
    SELECT day_no, record_json FROM task_daily_records_v2
    WHERE save_id = ? AND cultivator_id = 'player' AND day_no BETWEEN ? AND ?
    ORDER BY day_no DESC
  `, [saveId, Math.max(1, Number(dayNo) - 14), dayNo]);
  const dailyRecords = Object.fromEntries(dailyRows.map((row) => [Number(row.day_no), parseMysqlJson(row.record_json, null)]));
  return {
    save: saveRows[0],
    player: playerRows[0],
    definition: definitionRows.length ? parseMysqlJson(definitionRows[0].definition_json, null) : legacyDefinition,
    progress: legacyProgress || { completed_amount: 0, awarded_multiplier: 0 },
    multiplier: multiplierRows.length ? parseMysqlJson(multiplierRows[0].snapshot_json, null) : null,
    priorBaseXp: completionRows.reduce((sum, row) => sum + mysqlNumber(row.base_xp), 0),
    priorCompletions: completionRows.map((row) => parseMysqlJson(row.completion_json, {})),
    recentCompletions: recentRows.map((row) => parseMysqlJson(row.completion_json, {})),
    settings: settings.gameSettings || {},
    dailyRecord: dailyRecords[Number(dayNo)] || null,
    dailyRecords
    , catchup: {
      medianRealm: npcRows.length ? Number(npcRows[Math.floor(npcRows.length / 2)].realm_no || 0) : Number(playerRows[0].realm_no || 0),
      recentActiveDays: new Set(recentRows
        .map((row) => parseMysqlJson(row.completion_json, {}))
        .filter((item) => Number(item?.day) >= Math.max(1, Number(dayNo) - 6))
        .map((item) => Number(item.day))).size
    }
  };
}

export async function writeTaskIncremental(connection, {
  saveId,
  player,
  dayNo,
  taskId,
  completion,
  progress,
  dailyRecord,
  logEntry,
  currentPower,
  currentCombatRating,
  expectedRevision
}) {
  const revisionResult = await connection.query(`
    UPDATE game_saves
    SET state_revision = state_revision + 1,
        updated_at = CURRENT_TIMESTAMP(3)
    WHERE save_id = ? AND state_revision = ?
  `, [saveId, expectedRevision]);
  if (!revisionResult[0].affectedRows) {
    const error = new Error("存档已被其他操作更新，请刷新后重试");
    error.code = "STATE_REVISION_CONFLICT";
    throw error;
  }

  const playerJson = parseMysqlJson(player.cultivator_json, {}) || {};
  const mergedPlayer = {
    ...playerJson,
    xp: Number(player.xp ?? playerJson.xp ?? 0),
    spirit: Number(player.spirit ?? playerJson.spirit ?? 0),
    currentPower: Number(currentPower || 0),
    currentCombatRating: Number(currentCombatRating || 500)
  };
  const playerText = json(mergedPlayer);
  await connection.query(`
    UPDATE cultivators
    SET xp = ?, spirit = ?, current_power = ?, current_combat_rating = ?,
        cultivator_json = ?, content_hash = ?, metrics_revision = metrics_revision + 1,
        updated_at = CURRENT_TIMESTAMP(3)
    WHERE save_id = ? AND cultivator_id = 'player'
  `, [
    mergedPlayer.xp,
    mergedPlayer.spirit,
    Number(currentPower || 0),
    Number(currentCombatRating || 500),
    playerText,
    hash(playerText),
    saveId
  ]);

  const [historyRows] = await connection.query(`
    SELECT record_key FROM cultivator_history
    WHERE save_id = ? AND cultivator_id = 'player' AND history_type = 'dailyRecords' AND day_no = ?
    ORDER BY position_no LIMIT 1
  `, [saveId, dayNo]);
  const dailyTextForHistory = json(dailyRecord || {});
  if (historyRows.length) {
    await connection.query(`UPDATE cultivator_history
      SET record_json = ?, content_hash = ?
      WHERE save_id = ? AND cultivator_id = 'player' AND history_type = 'dailyRecords' AND record_key = ?`,
    [dailyTextForHistory, hash(dailyTextForHistory), saveId, historyRows[0].record_key]);
  } else {
    const historyKey = `task-day-${dayNo}:${hash(dailyTextForHistory).slice(0, 32)}`;
    await connection.query(`INSERT INTO cultivator_history
      (save_id, cultivator_id, history_type, record_key, day_no, position_no, record_json, content_hash)
      VALUES (?, 'player', 'dailyRecords', ?, ?, 0, ?, ?)`,
    [saveId, historyKey, dayNo, dailyTextForHistory, hash(dailyTextForHistory)]);
  }

  await connection.query(`
    INSERT INTO task_progress_v2 (save_id, day_no, task_id, completed_amount, awarded_multiplier)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE completed_amount = VALUES(completed_amount), awarded_multiplier = VALUES(awarded_multiplier), updated_at = CURRENT_TIMESTAMP(3)
  `, [saveId, dayNo, taskId, progress.completedAmount, progress.awardedMultiplier]);

  const completionText = json(completion);
  await connection.query(`
    INSERT INTO task_completions_v2
      (save_id, completion_id, day_no, task_id, completed_amount, multiplier, xp, base_xp, spirit, completion_json, content_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE completion_json = VALUES(completion_json), content_hash = VALUES(content_hash)
  `, [
    saveId,
    safeId(completion.id),
    dayNo,
    taskId,
    completion.completedAmount || 0,
    completion.multiplier || 0,
    completion.xp || 0,
    completion.baseXp || 0,
    completion.spirit || 0,
    completionText,
    hash(completionText)
  ]);

  const dailyText = json(dailyRecord || {});
  await connection.query(`
    INSERT INTO task_daily_records_v2 (save_id, cultivator_id, day_no, record_json, content_hash)
    VALUES (?, 'player', ?, ?, ?)
    ON DUPLICATE KEY UPDATE record_json = VALUES(record_json), content_hash = VALUES(content_hash), updated_at = CURRENT_TIMESTAMP(3)
  `, [saveId, dayNo, dailyText, hash(dailyText)]);

  const logText = json(logEntry || {});
  await connection.query(`
    INSERT INTO game_logs_v2 (save_id, log_id, day_no, log_type, log_text, log_json, content_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE log_text = VALUES(log_text), log_json = VALUES(log_json), content_hash = VALUES(content_hash)
  `, [saveId, safeId(logEntry?.id), dayNo, logEntry?.type || "", logEntry?.text || "", logText, hash(logText)]);

  const [sectionRows] = await connection.query(`SELECT section_key, section_json FROM save_sections
    WHERE save_id = ? AND section_key IN ('taskProgress', 'taskCompletions', 'tasks', 'log')`, [saveId]);
  const sections = Object.fromEntries(sectionRows.map((row) => [row.section_key, parseMysqlJson(row.section_json, row.section_key === "taskProgress" ? {} : [])]));
  const nextProgress = sections.taskProgress && typeof sections.taskProgress === "object" ? sections.taskProgress : {};
  nextProgress[dayNo] ??= {};
  nextProgress[dayNo][taskId] = { amount: progress.completedAmount, awardedMultiplier: progress.awardedMultiplier };
  const nextCompletions = [completion, ...(Array.isArray(sections.taskCompletions) ? sections.taskCompletions : []).filter((item) => item?.id !== completion.id)].slice(0, 720);
  const nextTasks = [completion, ...(Array.isArray(sections.tasks) ? sections.tasks : []).filter((item) => item?.id !== completion.id)].slice(0, 16);
  const nextLogs = [logEntry, ...(Array.isArray(sections.log) ? sections.log : []).filter((item) => item?.id !== logEntry?.id)].slice(0, 80);
  for (const [key, value] of Object.entries({ taskProgress: nextProgress, taskCompletions: nextCompletions, tasks: nextTasks, log: nextLogs })) {
    const text = json(value);
    await connection.query(`INSERT INTO save_sections (save_id, section_key, section_json, content_hash)
      VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE section_json=VALUES(section_json), content_hash=VALUES(content_hash)`,
    [saveId, key, text, hash(text)]);
  }

  return { revision: Number(expectedRevision || 0) + 1 };
}

export async function writeTaskDeleteIncremental(connection, {
  saveId, player, dayNo, taskId, completion, dailyRecord, logEntry, expectedRevision
}) {
  const [revisionResult] = await connection.query(`UPDATE game_saves
    SET state_revision=state_revision+1, updated_at=CURRENT_TIMESTAMP(3)
    WHERE save_id=? AND state_revision=?`, [saveId, expectedRevision]);
  if (!revisionResult.affectedRows) {
    const error = new Error("存档已被其他操作更新，请刷新后重试");
    error.code = "STATE_REVISION_CONFLICT";
    throw error;
  }
  const playerJson = parseMysqlJson(player.cultivator_json, {}) || {};
  const merged = { ...playerJson, xp: Number(player.xp ?? playerJson.xp ?? 0), spirit: Number(player.spirit ?? playerJson.spirit ?? 0) };
  const playerText = json(merged);
  await connection.query(`UPDATE cultivators SET xp=?, spirit=?, cultivator_json=?, content_hash=?,
    metrics_revision=metrics_revision+1, updated_at=CURRENT_TIMESTAMP(3)
    WHERE save_id=? AND cultivator_id='player'`, [merged.xp, merged.spirit, playerText, hash(playerText), saveId]);
  await connection.query("DELETE FROM task_completions_v2 WHERE save_id=? AND completion_id=?", [saveId, completion.id]);
  await connection.query("DELETE FROM task_progress_v2 WHERE save_id=? AND day_no=? AND task_id=?", [saveId, dayNo, taskId]);

  const dailyText = json(dailyRecord || {});
  await connection.query(`INSERT INTO task_daily_records_v2 (save_id,cultivator_id,day_no,record_json,content_hash)
    VALUES (?,'player',?,?,?) ON DUPLICATE KEY UPDATE record_json=VALUES(record_json),content_hash=VALUES(content_hash)`,
  [saveId, dayNo, dailyText, hash(dailyText)]);
  const [historyRows] = await connection.query(`SELECT record_key FROM cultivator_history
    WHERE save_id=? AND cultivator_id='player' AND history_type='dailyRecords' AND day_no=? ORDER BY position_no LIMIT 1`, [saveId, dayNo]);
  if (historyRows.length) await connection.query(`UPDATE cultivator_history SET record_json=?,content_hash=?
    WHERE save_id=? AND cultivator_id='player' AND history_type='dailyRecords' AND record_key=?`,
  [dailyText, hash(dailyText), saveId, historyRows[0].record_key]);

  const logText = json(logEntry);
  await connection.query(`INSERT INTO game_logs_v2 (save_id,log_id,day_no,log_type,log_text,log_json,content_hash)
    VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE log_text=VALUES(log_text),log_json=VALUES(log_json),content_hash=VALUES(content_hash)`,
  [saveId, safeId(logEntry.id), dayNo, logEntry.type || "", logEntry.text || "", logText, hash(logText)]);

  const [sectionRows] = await connection.query(`SELECT section_key,section_json FROM save_sections
    WHERE save_id=? AND section_key IN ('taskProgress','taskCompletions','tasks','log')`, [saveId]);
  const sections = Object.fromEntries(sectionRows.map((row) => [row.section_key, parseMysqlJson(row.section_json, row.section_key === "taskProgress" ? {} : [])]));
  const progress = sections.taskProgress && typeof sections.taskProgress === "object" ? sections.taskProgress : {};
  if (progress[dayNo]) {
    delete progress[dayNo][taskId];
    if (!Object.keys(progress[dayNo]).length) delete progress[dayNo];
  }
  const completions = (Array.isArray(sections.taskCompletions) ? sections.taskCompletions : []).filter((item) => item?.id !== completion.id);
  const tasks = (Array.isArray(sections.tasks) ? sections.tasks : []).filter((item) => item?.id !== completion.id);
  const logs = [logEntry, ...(Array.isArray(sections.log) ? sections.log : [])].slice(0, 80);
  for (const [key, value] of Object.entries({ taskProgress: progress, taskCompletions: completions, tasks, log: logs })) {
    const text = json(value);
    await connection.query(`INSERT INTO save_sections (save_id,section_key,section_json,content_hash) VALUES (?,?,?,?)
      ON DUPLICATE KEY UPDATE section_json=VALUES(section_json),content_hash=VALUES(content_hash)`, [saveId, key, text, hash(text)]);
  }
  return { revision: Number(expectedRevision) + 1 };
}

export async function withTaskIncrementalTransaction(callback) {
  return withMysqlTransaction(callback);
}
