import { parseMysqlJson } from "./mysqlDb.mjs";
import { contentHash } from "./mysqlStateCodec.mjs";

const taskCompletionLimit = 120;
const taskSectionKeys = ["dailyRootFortune", "gameSettings", "taskDefinitions", "taskMultiplierRecords"];

function currentTaskDate(save) {
  if (save.last_settlement_date) return String(save.last_settlement_date);
  const start = String(save.calendar_start_date || "");
  const parsed = Date.parse(`${start}T00:00:00Z`);
  if (!Number.isFinite(parsed)) return "";
  return new Date(parsed + Math.max(0, Number(save.day_no || 1) - 1) * 86_400_000).toISOString().slice(0, 10);
}

export async function loadTaskStateForUpdate(connection, saveId) {
  const [baseRows] = await connection.query(`
    SELECT s.day_no, s.rebirth_no, s.calendar_start_date, s.last_settlement_date, s.state_revision,
      h.xp AS hot_xp, h.spirit AS hot_spirit, c.cultivator_json
    FROM game_saves s
    JOIN player_hot_state h ON h.save_id = s.save_id
    JOIN cultivators c ON c.save_id = s.save_id AND c.cultivator_kind = 'player'
    WHERE s.save_id = ?
    LIMIT 1
    FOR UPDATE
  `, [saveId]);
  if (!baseRows.length) throw new Error("未找到玩家存档");
  const save = baseRows[0];

  const [sectionRows] = await connection.query(`
    SELECT section_key, section_json
    FROM save_sections
    WHERE save_id = ? AND section_key IN (?, ?, ?, ?)
  `, [saveId, ...taskSectionKeys]);
  const sections = Object.fromEntries(sectionRows.map((row) => [row.section_key, parseMysqlJson(row.section_json, null)]));

  const [completionRows] = await connection.query(`
    SELECT completion_id, position_no, completion_json
    FROM task_completions
    WHERE save_id = ?
    ORDER BY position_no
  `, [saveId]);
  const [npcRows] = await connection.query(`
    SELECT cultivator_id, realm_no
    FROM cultivators
    WHERE save_id = ? AND cultivator_kind = 'npc'
    ORDER BY realm_no
  `, [saveId]);

  const player = parseMysqlJson(save.cultivator_json, {}) || {};
  player.xp = Number(save.hot_xp || 0);
  player.spirit = Number(save.hot_spirit || 0);
  const day = Math.max(1, Number(save.day_no || 1));
  const taskMultiplierRecords = Array.isArray(sections.taskMultiplierRecords) ? sections.taskMultiplierRecords : [];
  if (!taskMultiplierRecords.some((record) => Number(record?.day) === day)) {
    const latest = taskMultiplierRecords[0] || {};
    const elixirMultiplier = Math.max(1, Number(latest.elixirMultiplier) || 1);
    const sectXpMultiplier = Math.max(1, Number(latest.sectXpMultiplier) || 1);
    taskMultiplierRecords.unshift({
      day,
      date: currentTaskDate(save),
      elixirMultiplier,
      sectXpMultiplier,
      totalMultiplier: elixirMultiplier * sectXpMultiplier
    });
  }

  return {
    revision: Number(save.state_revision || 0),
    positions: new Map(completionRows.map((row) => [String(row.completion_id), Number(row.position_no)])),
    state: {
      day,
      rebirth: Number(save.rebirth_no || 1),
      calendarStartDate: String(save.calendar_start_date || ""),
      lastSettlementDate: String(save.last_settlement_date || ""),
      player,
      npcs: npcRows.map((row) => ({ id: String(row.cultivator_id), realm: Number(row.realm_no || 0) })),
      taskDefinitions: Array.isArray(sections.taskDefinitions) ? sections.taskDefinitions : [],
      taskCompletions: completionRows.map((row) => parseMysqlJson(row.completion_json, {})),
      taskMultiplierRecords,
      gameSettings: sections.gameSettings || {},
      dailyRootFortune: sections.dailyRootFortune || null
    }
  };
}

export async function persistTaskAction(connection, saveId, taskState, result, context) {
  const xp = Math.max(0, Number(taskState.player?.xp || 0));
  const spirit = Math.max(0, Number(taskState.player?.spirit || 0));
  const [hotResult] = await connection.query(`
    UPDATE player_hot_state
    SET xp = ?, spirit = ?, updated_at = CURRENT_TIMESTAMP(3)
    WHERE save_id = ?
  `, [xp, spirit, saveId]);
  if (hotResult.affectedRows !== 1) throw new Error("玩家热属性更新失败");

  if (result?.operation === "add" && result.completion?.id) {
    await connection.query("UPDATE task_completions SET position_no = position_no + 1 WHERE save_id = ?", [saveId]);
    const completion = result.completion;
    const completionJson = JSON.stringify(completion);
    await connection.query(`
      INSERT INTO task_completions
        (save_id, completion_id, position_no, task_id, day_no, date_key, xp, spirit, completion_json, content_hash)
      VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, ?)
    `, [saveId, String(completion.id), String(completion.taskId || ""), Math.max(1, Number(completion.day || taskState.day || 1)), String(completion.date || ""), Math.max(0, Number(completion.xp || 0)), Math.max(0, Number(completion.spirit || 0)), completionJson, contentHash(completionJson)]);
    await connection.query("DELETE FROM task_completions WHERE save_id = ? AND position_no >= ?", [saveId, taskCompletionLimit]);
  } else if (result?.operation === "delete" && result.deletedCompletionId) {
    const position = context.positions.get(String(result.deletedCompletionId));
    if (!Number.isFinite(position)) throw new Error("未找到待撤回任务的位置");
    const [deleteResult] = await connection.query("DELETE FROM task_completions WHERE save_id = ? AND completion_id = ?", [saveId, String(result.deletedCompletionId)]);
    if (deleteResult.affectedRows !== 1) throw new Error("任务记录撤回失败");
    await connection.query("UPDATE task_completions SET position_no = position_no - 1 WHERE save_id = ? AND position_no > ?", [saveId, position]);
  } else {
    throw new Error("未知任务操作");
  }

  const [revisionResult] = await connection.query(`
    UPDATE game_saves
    SET state_revision = state_revision + 1, updated_at = CURRENT_TIMESTAMP(3)
    WHERE save_id = ? AND state_revision = ?
  `, [saveId, context.revision]);
  if (revisionResult.affectedRows !== 1) {
    const error = new Error("存档已被其他任务更新，请重试");
    error.code = "STATE_REVISION_CONFLICT";
    throw error;
  }
  return context.revision + 1;
}
