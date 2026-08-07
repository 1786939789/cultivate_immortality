import { attemptBreakthrough, buildCombatRatings, buyItem, powerOf, rest, runDungeon, sectMission, sectWar, sellItem, upgradePlayerSkill, useItem } from "./gameLogic.mjs";
import { parseMysqlJson } from "./mysqlDb.mjs";
import { readActionInputs, withActionTransaction, writeActionIncremental } from "./actionIncrementalRepository.mjs";

function n(value, fallback = 0) { const result = Number(value); return Number.isFinite(result) ? result : fallback; }

function minimalState(inputs) {
  const player = { ...(parseMysqlJson(inputs.player.cultivator_json, {}) || {}) };
  Object.assign(player, { id: player.id || "player", realm: n(inputs.player.realm_no, n(player.realm)), xp: n(inputs.player.xp, n(player.xp)), spirit: n(inputs.player.spirit, n(player.spirit)), hp: n(inputs.player.hp, n(player.hp)), maxHp: n(inputs.player.max_hp, n(player.maxHp)), mana: n(inputs.player.mana, n(player.mana)), maxMana: n(inputs.player.max_mana, n(player.maxMana)), sect: inputs.player.sect_name || player.sect || "" });
  return { ...inputs.sections, day: n(inputs.save.day_no, 1), rebirth: n(inputs.save.rebirth_no, 1), calendarStartDate: inputs.save.calendar_start_date, lastSettlementDate: inputs.save.last_settlement_date, player, npcs: [], equipment: inputs.equipment, sect: inputs.sections.sect || { name: player.sect, reputation: 0, supplies: 0, rivalHeat: 0, warWins: 0, warLosses: 0 }, bag: inputs.sections.bag || {}, shop: inputs.sections.shop || {}, log: inputs.sections.log || [], logDays: inputs.sections.logDays || [], taskDefinitions: inputs.sections.taskDefinitions || [], taskCompletions: inputs.sections.taskCompletions || [], taskProgress: inputs.sections.taskProgress || {}, taskMultiplierRecords: inputs.sections.taskMultiplierRecords || [], provinces: inputs.sections.provinces || [], equipmentTransfers: inputs.sections.equipmentTransfers || [], duelDays: inputs.sections.duelDays || [], dungeonDays: inputs.sections.dungeonDays || [], provinceWars: inputs.sections.provinceWars || [], gameSettings: inputs.sections.gameSettings || {}, stateRevision: n(inputs.save.state_revision) };
}

export async function runPlayerActionIncremental(saveId, action, payload = {}) {
  return withActionTransaction(async (connection) => {
    const sectionSets = {
      rest: ["log","logDays"], breakthrough: ["sect","log","logDays"], skill: ["log","logDays"],
      buy: ["bag","shop","log","logDays"], sell: ["bag","shop","log","logDays"], use: ["bag","shop","log","logDays"],
      dungeon: ["log","logDays","dungeonDays","equipmentTransfers","__equipment_inventory"], sectMission: ["sect","log","logDays"], sectWar: ["sect","log","logDays"]
    };
    const inputs = await readActionInputs(saveId, sectionSets[action] || ["log","logDays"], connection);
    if (!inputs) throw new Error("存档不存在");
    const state = minimalState(inputs);
    const handlers = { rest: () => rest(state), breakthrough: () => attemptBreakthrough(state), skill: () => upgradePlayerSkill(state), dungeon: () => runDungeon(state, payload.id), sectMission: () => sectMission(state), sectWar: () => sectWar(state), buy: () => buyItem(state, payload.kind), sell: () => sellItem(state, payload.kind), use: () => useItem(state, payload.kind) };
    if (!handlers[action]) throw new Error(`不支持增量动作: ${action}`);
    const result = handlers[action]();
    const logEntry = state.log?.[0] ? { ...state.log[0], id: `action-${action}-${Date.now().toString(36)}` } : null;
    const sections = { bag: state.bag, shop: state.shop, sect: state.sect, gameSettings: state.gameSettings, equipmentTransfers: state.equipmentTransfers, taskProgress: state.taskProgress, taskCompletions: state.taskCompletions, tasks: state.tasks, log: state.log, logDays: state.logDays, dungeonDays: state.dungeonDays, provinceWars: state.provinceWars, duelDays: state.duelDays, playerSectPlan: state.playerSectPlan };
    const changedSections = {};
    // Never persist a default for a section that was not part of this action's
    // read set. Doing so could erase unrelated state and creates write
    // amplification.
    for (const key of Object.keys(inputs.sections)) {
      if (key in sections && JSON.stringify(sections[key]) !== JSON.stringify(inputs.sections[key])) changedSections[key] = sections[key];
    }
    state.__currentPower = powerOf(state.player, state);
    const rating = buildCombatRatings(state).entries.find((item) => item.id === state.player.id);
    state.__currentCombatRating = Number(rating?.score || inputs.player.current_combat_rating || 500);
    const revision = await writeActionIncremental(connection, { saveId, inputs, state, changedSections, logEntry, expectedRevision: n(inputs.save.state_revision) });
    return { kind: `action.${action}`, stateRevision: revision, result, patch: { player: state.player, bag: state.bag, shop: state.shop, sect: state.sect, log: logEntry ? [logEntry] : [], stateRevision: revision } };
  });
}
