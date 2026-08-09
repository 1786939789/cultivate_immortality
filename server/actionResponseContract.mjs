import { getPublicActionPatch } from "./gameLogic.mjs";

export const ACTION_PATCH_VERSION = 2;

export function actionResponse({ kind, state, stateRevision, result = null, changed = {}, meta = {} }) {
  const revision = Number(stateRevision ?? state?.__stateRevision ?? 0);
  return {
    patchVersion: ACTION_PATCH_VERSION,
    kind,
    stateRevision: revision,
    ...meta,
    result,
    patch: getPublicActionPatch(state, changed)
  };
}

export function stateActionResponse({ kind, publicState, stateRevision, result = null, meta = {}, replace = false }) {
  const revision = Number(stateRevision ?? publicState?.stateRevision ?? 0);
  const { __scope, stateRevision: _stateRevision, player, derived, home, log, ...sections } = publicState || {};
  const allowed = new Set([
    "day", "calendarStartDate", "lastSettlementDate", "sect", "bag", "shop",
    "tasks", "taskDefinitions", "taskCompletions", "taskProgress", "taskMultiplierRecords",
    "encounters", "daoTrial", "logDays", "equipmentTransfers", "playerSectPlan",
    "provinces", "sectFatigue", "sectProfiles", "gameSettings", "spiritPearls"
  ]);
  const compactSections = Object.fromEntries(Object.entries(sections).filter(([key]) => allowed.has(key)));
  const compactDerived = derived ? {
    xpNeed: derived.xpNeed,
    currentRealmInfo: derived.currentRealmInfo,
    playerPower: derived.playerPower,
    playerCombatRating: derived.playerCombatRating,
    combatRatings: derived.combatRatings,
    effectiveStats: derived.effectiveStats,
    nextRealm: derived.nextRealm,
    breakChance: derived.breakChance,
    baseBreakChance: derived.baseBreakChance,
    duelSeason: derived.duelSeason,
    shop: derived.shop,
    todayPlan: derived.todayPlan,
    dailyRootFortune: derived.dailyRootFortune
  } : null;
  return {
    patchVersion: ACTION_PATCH_VERSION,
    kind,
    stateRevision: revision,
    ...meta,
    result,
    patch: {
      ...(replace ? { replace: true } : {}),
      ...compactSections,
      ...(player ? { player } : {}),
      ...(compactDerived ? { derived: compactDerived } : {}),
      ...(home ? { home } : {}),
      ...(log ? { log } : {})
    }
  };
}
