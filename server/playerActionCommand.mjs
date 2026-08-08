import { advanceDaoTrial, attemptBreakthrough, buildCombatRatings, buyItem, changePlayerPortrait, getPublicState, powerOf, resolveEncounter, rest, runDungeon, sectMission, sectWar, sellItem, startDaoTrial, updateEncounterFocus, updatePlayerSectPlan, updatePlayerSectPlanIncremental, upgradePlayerSkill, useItem, abandonDaoTrial } from "./gameLogic.mjs";
import { parseMysqlJson } from "./mysqlDb.mjs";
import { readActionInputs, withActionTransaction, writeActionIncremental } from "./actionIncrementalRepository.mjs";

function n(value, fallback = 0) { const result = Number(value); return Number.isFinite(result) ? result : fallback; }

function minimalState(inputs) {
  const player = { ...(parseMysqlJson(inputs.player.cultivator_json, {}) || {}) };
  const metric = (typed, legacy) => {
    const typedValue = n(typed);
    const legacyValue = n(legacy);
    return typedValue !== 0 || legacyValue === 0 ? typedValue : legacyValue;
  };
  Object.assign(player, {
    id: player.id || "player", realm: n(inputs.player.realm_no, n(player.realm)),
    xp: n(inputs.player.xp, n(player.xp)), spirit: metric(inputs.player.spirit, player.spirit),
    hp: n(inputs.player.hp, n(player.hp)), maxHp: n(inputs.player.max_hp, n(player.maxHp)),
    mana: n(inputs.player.mana, n(player.mana)), maxMana: n(inputs.player.max_mana, n(player.maxMana)),
    sect: inputs.player.sect_name || player.sect || "",
    reputation: metric(inputs.player.reputation, player.reputation), body: metric(inputs.player.body, player.body),
    wisdom: metric(inputs.player.wisdom, player.wisdom), attack: metric(inputs.player.attack, player.attack),
    defense: metric(inputs.player.defense, player.defense), divineSense: metric(inputs.player.divine_sense, player.divineSense),
    chance: metric(inputs.player.chance, player.chance), wealth: metric(inputs.player.wealth, player.wealth),
    heartDemon: metric(inputs.player.heart_demon, player.heartDemon)
  });
  const sections = Object.fromEntries(Object.entries(inputs.sections || {}).map(([key, value]) => [key, structuredClone(value)]));
  const npcs = (inputs.npcs || []).map((npc) => structuredClone(npc));
  const equipment = (inputs.equipment || []).map((item) => structuredClone(item));
  return { ...sections, day: n(inputs.save.day_no, 1), rebirth: n(inputs.save.rebirth_no, 1), calendarStartDate: inputs.save.calendar_start_date, lastSettlementDate: inputs.save.last_settlement_date, player, npcs, equipment, sect: sections.sect || { name: player.sect, reputation: 0, supplies: 0, rivalHeat: 0, warWins: 0, warLosses: 0 }, bag: sections.bag || {}, shop: sections.shop || {}, log: sections.log || [], logDays: sections.logDays || [], taskDefinitions: sections.taskDefinitions || [], taskCompletions: sections.taskCompletions || [], taskProgress: sections.taskProgress || {}, taskMultiplierRecords: sections.taskMultiplierRecords || [], provinces: sections.provinces || [], equipmentTransfers: sections.equipmentTransfers || [], duelDays: sections.duelDays || [], dungeonDays: sections.dungeonDays || [], provinceWars: sections.provinceWars || [], gameSettings: sections.gameSettings || {}, stateRevision: n(inputs.save.state_revision) };
}

export async function runPlayerActionIncremental(saveId, action, payload = {}) {
  return withActionTransaction(async (connection) => {
    const sectionSets = {
      rest: ["log","logDays"], breakthrough: ["sect","log","logDays"], skill: ["log","logDays"],
      buy: ["bag","shop","log","logDays"], sell: ["bag","shop","log","logDays"], use: ["bag","shop","log","logDays"],
      dungeon: ["log","logDays","dungeonDays","equipmentTransfers","__equipment_inventory"], sectMission: ["sect","log","logDays"], sectWar: ["sect","log","logDays"],
      encounterFocus: ["encounters"],
      encounterChoose: ["encounters","relationships","sect","provinces","taskCompletions","dungeonDays","log","logDays"],
      sectPlan: ["sect","provinces","provinceVersion","log","logDays","playerSectPlan","adminProfiles"],
      portrait: ["log","logDays"], daoStart: ["daoTrial","relationships","taskCompletions","dailyRootFortune","log","logDays"], daoAdvance: ["daoTrial","relationships","taskCompletions","dailyRootFortune","log","logDays"], daoAbandon: ["daoTrial","relationships","taskCompletions","dailyRootFortune","log","logDays"]
    };
    let inputs = await readActionInputs(saveId, sectionSets[action] || ["log","logDays"], connection);
    if (["encounterFocus","encounterChoose","daoStart","daoAdvance","daoAbandon","sectPlan"].includes(action)) {
      const encounter = inputs?.sections?.encounters;
      const ids = action === "encounterFocus"
        ? [payload.npcId, ...(encounter?.focusedNpcIds || [])]
        : [encounter?.pending?.find((item) => item.id === payload.eventId)?.actorId, ...(encounter?.focusedNpcIds || [])].filter(Boolean);
      inputs = await readActionInputs(saveId, sectionSets[action], connection, { npcIds: ["daoStart","daoAdvance","daoAbandon"].includes(action) ? [] : ids, allNpcs: ["daoStart","daoAdvance","daoAbandon","sectPlan"].includes(action) });
    }
    if (!inputs) throw new Error("存档不存在");
    const state = minimalState(inputs);
    if (action === "sectPlan" && inputs.sections.adminProfiles?.playerSect) {
      state.sect.name = inputs.sections.adminProfiles.playerSect;
      state.player.sect = state.sect.name;
      state.provinces = (inputs.sections.provinces || []).map((item) => ({ ...item }));
      state.provinceVersion = inputs.sections.provinceVersion || state.provinceVersion;
    }
    // Typed MySQL columns are authoritative for the player's current sect;
    // legacy JSON may contain an older sect name and would otherwise cause
    // ensureStateShape() to normalize provinces against the wrong roster.
    state.player.sect = inputs.player.sect_name || state.player.sect;
    state.sect = inputs.sections.sect || state.sect;
    const handlers = { rest: () => rest(state), breakthrough: () => attemptBreakthrough(state), skill: () => upgradePlayerSkill(state), dungeon: () => runDungeon(state, payload.id), sectMission: () => sectMission(state), sectWar: () => sectWar(state), buy: () => buyItem(state, payload.kind), sell: () => sellItem(state, payload.kind), use: () => useItem(state, payload.kind), encounterFocus: () => updateEncounterFocus(state, payload), encounterChoose: () => resolveEncounter(state, payload), sectPlan: () => updatePlayerSectPlanIncremental(state, payload), portrait: () => changePlayerPortrait(state, payload), daoStart: () => startDaoTrial(state, payload), daoAdvance: () => advanceDaoTrial(state, payload), daoAbandon: () => abandonDaoTrial(state) };
    if (!handlers[action]) throw new Error(`不支持增量动作: ${action}`);
    const result = handlers[action]();
    const logEntry = state.log?.[0] ? { ...state.log[0], id: `action-${action}-${Date.now().toString(36)}` } : null;
    const sections = { bag: state.bag, shop: state.shop, sect: state.sect, gameSettings: state.gameSettings, equipmentTransfers: state.equipmentTransfers, taskProgress: state.taskProgress, taskCompletions: state.taskCompletions, tasks: state.tasks, log: state.log, logDays: state.logDays, dungeonDays: state.dungeonDays, provinceWars: state.provinceWars, duelDays: state.duelDays, playerSectPlan: state.playerSectPlan, encounters: state.encounters, relationships: state.relationships, provinces: state.provinces, provinceVersion: state.provinceVersion, daoTrial: state.daoTrial, adminProfiles: state.adminProfiles };
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
    const publicDaoTrial = action.startsWith("dao") ? getPublicState(state, { scope: "dao-trial" }).daoTrial : state.daoTrial;
    return { kind: `action.${action}`, stateRevision: revision, result, patch: { player: state.player, bag: state.bag, shop: state.shop, sect: state.sect, playerSectPlan: state.playerSectPlan, encounters: state.encounters, relationships: state.relationships, provinces: state.provinces, daoTrial: publicDaoTrial, log: logEntry ? [logEntry] : [], stateRevision: revision } };
  });
}
