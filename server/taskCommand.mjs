import { addTask, deleteTaskCompletion } from "./gameLogic.mjs";
import { parseMysqlJson } from "./mysqlDb.mjs";
import { readTaskInputs, withTaskIncrementalTransaction, writeTaskDeleteIncremental, writeTaskIncremental } from "./taskIncrementalRepository.mjs";
import { actionResponse } from "./actionResponseContract.mjs";

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function hydrateRowPlayer(row) {
  const player = parseMysqlJson(row.cultivator_json, {}) || {};
  for (const [field, column] of Object.entries({
    xp: "xp", spirit: "spirit", reputation: "reputation", body: "body", wisdom: "wisdom",
    attack: "attack", defense: "defense", divineSense: "divine_sense", chance: "chance",
    wealth: "wealth", heartDemon: "heart_demon"
  })) {
    const typed = number(row[column]);
    const legacy = number(player[field]);
    player[field] = typed !== 0 || legacy === 0 ? typed : legacy;
  }
  player.realm = number(row.realm_no, number(player.realm));
  player.hp = number(row.hp, number(player.hp));
  player.maxHp = number(row.max_hp, number(player.maxHp));
  player.mana = number(row.mana, number(player.mana));
  player.maxMana = number(row.max_mana, number(player.maxMana));
  return player;
}

function makeMicroState(inputs, dayNo) {
  const playerJson = hydrateRowPlayer(inputs.player);
  const player = {
    ...playerJson,
    id: playerJson.id || "player",
    realm: number(playerJson.realm, number(inputs.player.realm_no)),
    xp: number(inputs.player.xp, number(playerJson.xp)),
    spirit: number(inputs.player.spirit, number(playerJson.spirit)),
    sect: playerJson.sect || inputs.player.sect_name || "",
    dailyRecords: Object.values(inputs.dailyRecords || {}).filter(Boolean)
  };
  const progress = inputs.progress || { completed_amount: 0, awarded_multiplier: 0 };
  const snapshot = inputs.multiplier || {
    day: dayNo,
    date: "",
    elixirMultiplier: 1,
    sectXpMultiplier: 1,
    totalMultiplier: 1
  };
  const medianRealm = number(inputs.catchup?.medianRealm, player.realm);
  const realmGap = Math.max(0, medianRealm - player.realm);
  const activeDays = number(inputs.catchup?.recentActiveDays, 0);
  return {
    day: number(inputs.save.day_no, dayNo),
    calendarStartDate: inputs.save.calendar_start_date || inputs.save.last_settlement_date || "",
    lastSettlementDate: inputs.save.last_settlement_date || "",
    player,
    npcs: [],
    sect: { name: player.sect },
    equipment: [],
    taskDefinitions: inputs.definition ? [inputs.definition] : [],
    taskCompletions: inputs.recentCompletions || [],
    tasks: inputs.recentCompletions || [],
    taskProgress: { [dayNo]: { [inputs.definition?.id || ""]: {
      amount: number(progress.completed_amount),
      awardedMultiplier: number(progress.awarded_multiplier)
    } } },
    taskMultiplierRecords: [snapshot],
    gameSettings: inputs.settings || {},
    log: [],
    logDays: [],
    provinces: [],
    spiritPearls: player.spiritPearls,
    __incrementalTaskMultiplier: snapshot,
    __incrementalCatchupProfile: { medianRealm, realmGap, activeDays, multiplier: activeDays > 0 && realmGap > 0
      ? 1 + Math.min(0.2, realmGap * 0.04 + Math.max(0, 3 - activeDays) * 0.015) : 1 },
    __currentPower: number(inputs.player.current_power),
    __currentCombatRating: number(inputs.player.current_combat_rating, 500),
    __incrementalBreakthroughParts: {
      realmBase: 0.05, rootMultiplier: 1, talentMultiplier: 1, sectMultiplier: 1,
      base: 0.05, bonus: 0, potionBonus: 0, championBonus: 0, spiritPearlBonus: 0,
      dailyRootFortuneBonus: 0, total: 0.05
    }
  };
}

function taskPatch(state, completion, dailyRecord, priorBaseXp = 0) {
  const progress = state.taskProgress?.[completion.day]?.[completion.taskId] || { amount: 0, awardedMultiplier: 0 };
  const log = state.log?.[0] || null;
  return {
    player: state.player,
    completion,
    taskProgress: {
      day: completion.day,
      entries: state.taskProgress?.[completion.day] || {},
      baseXp: priorBaseXp + number(completion.baseXp),
      fullXpBudget: number(state.gameSettings?.taskDailyFullXpBudget, 500),
      reducedMultiplier: 0.4
    },
    dailyRecord,
    log: log ? [log] : [],
  };
}

export async function completeTaskIncremental(saveId, payload = {}) {
  return withTaskIncrementalTransaction(async (connection) => {
    const taskId = String(payload.taskId || payload.id || "");
    if (!taskId) throw new Error("缺少现实任务 ID");
    const [saveRows] = await connection.query("SELECT day_no FROM game_saves WHERE save_id = ? FOR UPDATE", [saveId]);
    if (!saveRows.length) throw new Error("存档不存在");
    const currentDay = Math.max(1, number(saveRows[0].day_no, 1));
    const targetDay = Math.max(1, number(payload.day ?? payload.targetDay, currentDay));
    const inputs = await readTaskInputs(saveId, taskId, targetDay, connection);
    if (!inputs?.definition) throw new Error("未知现实任务");
    if (targetDay > currentDay || targetDay < Math.max(1, currentDay - 2)) throw new Error("只能补记最近三天的现实任务");
    const state = makeMicroState(inputs, targetDay);
    const result = addTask(state, { ...payload, taskId, day: targetDay });
    const completion = state.taskCompletions[0];
    completion.id = completion.id || `task-done-${Date.now().toString(36)}`;
    const logEntry = state.log[0] ? { ...state.log[0], id: `task-log-${completion.id}` } : {
      id: `task-log-${completion.id}`, day: targetDay, type: "gold", text: `完成「${completion.name}」`
    };
    const dailyRecord = state.player.dailyRecords.find((record) => Number(record.day) === targetDay) || null;
    const revision = await writeTaskIncremental(connection, {
      saveId,
      player: { ...inputs.player, xp: state.player.xp, spirit: state.player.spirit },
      dayNo: targetDay,
      taskId,
      completion,
      progress: {
        completedAmount: state.taskProgress[targetDay][taskId].amount,
        awardedMultiplier: state.taskProgress[targetDay][taskId].awardedMultiplier
      },
      dailyRecord,
      logEntry,
      currentPower: number(inputs.player.current_power),
      currentCombatRating: number(inputs.player.current_combat_rating, 500),
      expectedRevision: number(inputs.save.state_revision)
    });
    return actionResponse({ kind: "task.completed", state, stateRevision: revision.revision, result, changed: taskPatch(state, completion, dailyRecord, inputs.priorBaseXp) });
  });
}

export async function deleteTaskIncremental(saveId, payload = {}) {
  return withTaskIncrementalTransaction(async (connection) => {
    const id = String(payload.id || "");
    if (!id) throw new Error("缺少任务记录 ID");
    const [rows] = await connection.query(`SELECT c.completion_json,s.day_no,s.state_revision,p.*
      FROM task_completions_v2 c JOIN game_saves s ON s.save_id=c.save_id
      JOIN cultivators p ON p.save_id=c.save_id AND p.cultivator_id='player'
      WHERE c.save_id=? AND c.completion_id=? FOR UPDATE`, [saveId, id]);
    if (!rows.length) throw new Error("未找到这条任务记录");
    const row = rows[0];
    const completion = parseMysqlJson(row.completion_json, {}) || {};
    const dayNo = Number(completion.day || row.day_no);
    const inputs = await readTaskInputs(saveId, completion.taskId, dayNo, connection);
    const state = makeMicroState(inputs, dayNo);
    state.taskCompletions = [completion, ...(inputs.recentCompletions || []).filter((item) => item.id !== id)];
    state.tasks = [...state.taskCompletions];
    state.taskProgress = { [dayNo]: { [completion.taskId]: {
      amount: number(inputs.progress.completed_amount), awardedMultiplier: number(inputs.progress.awarded_multiplier)
    } } };
    state.day = Number(row.day_no);
    deleteTaskCompletion(state, { id });
    const dailyRecord = state.player.dailyRecords.find((record) => Number(record.day) === dayNo) || inputs.dailyRecord || {};
    const logEntry = { ...(state.log[0] || {}), id: `task-delete-log-${id}-${Date.now().toString(36)}` };
    const revision = await writeTaskDeleteIncremental(connection, {
      saveId,
      player: { ...row, xp: state.player.xp, spirit: state.player.spirit },
      dayNo,
      taskId: completion.taskId,
      completion,
      dailyRecord,
      logEntry,
      expectedRevision: Number(row.state_revision)
    });
    return actionResponse({ kind: "task.deleted", state, stateRevision: revision.revision, result: { completion }, changed: {
      player: state.player, deletedCompletionId: id, taskProgress: { day: dayNo, entries: {}, baseXp: Math.max(0, inputs.priorBaseXp - number(completion.baseXp)), fullXpBudget: number(state.gameSettings?.taskDailyFullXpBudget, 500), reducedMultiplier: 0.4 },
      dailyRecord, log: [logEntry]
    } });
  });
}
