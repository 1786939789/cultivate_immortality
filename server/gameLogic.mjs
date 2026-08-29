import { canonicalPotentialRealms, combatSkills, dungeons, duelLadderDays, duelLossScore, duelRankForScore, duelRanks, duelSeasonDay, duelSeasonLength, duelSeasonMaxScore, duelSeasonOfDay, duelTournamentBracketSize, duelTournamentDays, duelWinScore, equipmentCatalog, equipmentSlots, equipmentTiers, itemCatalog, npcGenders, npcNames, provinceVersion, provinces, realms, realmStages, rootCycle, specialRoots, spiritPearls, roots, rosterVersion, sectRoster, sects, taskTemplates } from "./gameData.mjs";
import { encounterCategoryLabels, encounterDefinitionCount, encounterDefinitionMap, encounterDefinitions } from "./encounterData.mjs";
import { daoTrialCycleAffixes, daoTrialCycleLength, daoTrialEventOptions, daoTrialLawMap, daoTrialLawRarities, daoTrialLawRarityRates, daoTrialLaws, daoTrialNodeVariants, daoTrialRouteMap, daoTrialRoutes, daoTrialSealMap, daoTrialSeals, daoTrialSealSchoolResonances, daoTrialSealSynergies } from "./daoTrialData.mjs";
import { resolveLawMechanics } from "./daoTrialLawDesign.mjs";

export function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateText, offset) {
  const [year, month, day] = String(dateText || dateKey()).split("-").map(Number);
  const date = new Date(year || new Date().getFullYear(), (month || 1) - 1, day || 1);
  date.setDate(date.getDate() + offset);
  return dateKey(date);
}

function stateDateForDay(state, day = state.day) {
  return addDays(state.calendarStartDate || state.lastSettlementDate || dateKey(), Math.max(0, Number(day ?? 0)));
}

function timestampKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

const stageXpBudgets = [
  1200,
  3800,
  15000,
  20000,
  32000,
  52000,
  84000,
  136000,
  220000
];
const xpModeVersion = 2;
const realmTerminologyVersion = 1;
const talentVersion = 1;
const defaultPlayerPotentialRealm = 39;
const talentScoreRanges = [
  [18, 32], [30, 44], [43, 58], [56, 70], [67, 80],
  [77, 88], [85, 94], [91, 98], [96, 100]
];
const playerDailyBaseXp = 10;
const taskDefinitionLimit = 80;
const taskCompletionLimit = 120;
const taskMultiplierRecordDays = 3;
const taskProgressRecordDays = 15;
const defaultTaskDailyFullXpBudget = 500;
const maxTaskDailyFullXpBudget = 100000;
const defaultBattleReplaySpeed = 1;
const minBattleReplaySpeed = 0.5;
const maxBattleReplaySpeed = 4;
const defaultDailyTickerSpeed = 1;
const minDailyTickerSpeed = 0.5;
const maxDailyTickerSpeed = 4;
const taskDailyReducedXpMultiplier = 0.4;
const permanentStatSoftCap = 36;
const taskCategories = ["生活", "学习", "工作", "运动"];
const defaultTaskDefinitions = [
  { id: "task-work-hour", name: "加班", detail: "按实际投入时间记录额外工作。", type: "measurable", category: "工作", unitName: "小时", targetAmount: 1, xpReward: 100, spiritReward: 10, maxMultiplier: 4, enabled: true },
  { id: "task-reading-pages", name: "看书", detail: "读完指定页数，沉淀现实里的悟性。", type: "measurable", category: "学习", unitName: "页", targetAmount: 10, xpReward: 50, spiritReward: 5, maxMultiplier: 5, enabled: true },
  { id: "task-fitness", name: "运动一次", detail: "完整完成一次计划内运动。", type: "complete", category: "运动", unitName: "次", targetAmount: 1, xpReward: 80, spiritReward: 6, maxMultiplier: 1, enabled: true },
  { id: "task-writing", name: "写作一段", detail: "完成一段可交付的创作或复盘。", type: "complete", category: "生活", unitName: "次", targetAmount: 1, xpReward: 120, spiritReward: 8, maxMultiplier: 1, enabled: true }
];

function stageXpBudget(stage) {
  const known = stageXpBudgets[stage];
  if (known) return known;
  const last = stageXpBudgets[stageXpBudgets.length - 1];
  return Math.round(last * Math.pow(1.45, stage - stageXpBudgets.length + 1));
}

export function xpNeed(realm) {
  const safeRealm = Math.max(0, Math.floor(Number(realm) || 0));
  return xpRequiredBeforeRealm(safeRealm + 1);
}

function levelXpNeed(realm) {
  const safeRealm = Math.max(0, Math.floor(Number(realm) || 0));
  const stage = Math.floor(safeRealm / 10);
  const level = safeRealm % 10;
  const budget = stageXpBudget(stage);
  const curve = 1.16;
  const before = Math.round(budget * Math.pow(level / 10, curve));
  const after = Math.round(budget * Math.pow((level + 1) / 10, curve));
  return Math.max(1, after - before);
}

function xpRequiredBeforeRealm(realm) {
  const safeRealm = Math.max(0, Math.floor(Number(realm) || 0));
  let total = 0;
  for (let index = 0; index < safeRealm; index += 1) total += levelXpNeed(index);
  return total;
}

function migrateEntityTotalXp(entity) {
  const realm = Math.max(0, Math.floor(Number(entity?.realm) || 0));
  const currentLevelXp = Math.max(0, Math.floor(Number(entity?.xp) || 0));
  entity.xp = xpRequiredBeforeRealm(realm) + currentLevelXp;
}

export const birthStatRanges = {
  maxHp: [96, 118],
  attack: [12, 18],
  defense: [8, 13],
  divineSense: [9, 14],
  maxMana: [56, 76]
};

const manaGrowthMultiplier = 0.72;
const majorManaGrowthMultiplier = 0.7;
const manaBalanceVersion = 1;
const skillManaBaseline = 220;
const skillManaScaleCap = 20;

function rollRange([min, max], random = Math.random) {
  return min + Math.floor(random() * (max - min + 1));
}

function statRangeText(range) {
  return `${range[0]}-${range[1]}`;
}

function growthRangeText(range) {
  return `血${statRangeText(range.maxHp)} 攻${statRangeText(range.attack)} 防${statRangeText(range.defense)} 神${statRangeText(range.divineSense)} 法${statRangeText(range.maxMana)}`;
}

function scaleStatRange([min, max], multiplier) {
  return [Math.round(min * multiplier), Math.round(max * multiplier)];
}

export function breakthroughGrowthRange(fromRealm) {
  const safeRealm = clamp(Math.floor(fromRealm || 0), 0, realms.length - 1);
  const targetRealm = Math.min(safeRealm + 1, realms.length - 1);
  const stageIndex = Math.floor(targetRealm / 10);
  const level = (targetRealm % 10) + 1;
  const major = safeRealm % 10 === 9;

  if (major) {
    const defenseMin = 8 + stageIndex * 4;
    const defenseMax = defenseMin + 6 + Math.floor(stageIndex / 2);
    const attackMin = 18 + stageIndex * 6;
    const majorLeapMultiplier = 1.35 + stageIndex * 0.08;
    const baseGrowth = {
      maxHp: [96 + stageIndex * 42, 136 + stageIndex * 52],
      maxMana: scaleStatRange([32 + stageIndex * 13, 48 + stageIndex * 18], majorManaGrowthMultiplier),
      attack: [attackMin, attackMin + 10 + stageIndex],
      defense: [defenseMin, defenseMax],
      divineSense: [9 + stageIndex * 4, 14 + stageIndex * 6]
    };
    return Object.fromEntries(
      Object.entries(baseGrowth).map(([stat, range]) => [stat, scaleStatRange(range, majorLeapMultiplier)])
    );
  }

  const levelBand = Math.floor(level / 3);
  const defenseMin = 2 + stageIndex + Math.floor(level / 5);
  const defenseMax = defenseMin + 2 + Math.floor(stageIndex / 2);
  const attackMin = defenseMax + 4 + stageIndex;
  return {
    maxHp: [26 + stageIndex * 12 + levelBand * 4, 42 + stageIndex * 14 + levelBand * 5],
    maxMana: scaleStatRange([7 + stageIndex * 4 + Math.floor(level / 4), 13 + stageIndex * 5 + Math.floor(level / 3)], manaGrowthMultiplier),
    attack: [attackMin, attackMin + 4 + Math.floor(stageIndex / 2)],
    defense: [defenseMin, defenseMax],
    divineSense: [2 + stageIndex + Math.floor(level / 6), 5 + stageIndex + Math.floor(level / 4)]
  };
}

function rollBreakthroughGrowth(fromRealm, random = Math.random) {
  const range = breakthroughGrowthRange(fromRealm);
  return Object.fromEntries(Object.entries(range).map(([key, value]) => [key, rollRange(value, random)]));
}

function applyBreakthroughGrowth(entity, fromRealm) {
  const growth = rollBreakthroughGrowth(fromRealm);
  entity.maxHp += growth.maxHp;
  entity.maxMana += growth.maxMana;
  entity.attack += growth.attack;
  entity.defense += growth.defense;
  entity.divineSense += growth.divineSense;
  return growth;
}

function rollBirthStats(realm = 0, random = Math.random) {
  const stats = {
    maxHp: rollRange(birthStatRanges.maxHp, random),
    attack: rollRange(birthStatRanges.attack, random),
    defense: rollRange(birthStatRanges.defense, random),
    divineSense: rollRange(birthStatRanges.divineSense, random),
    maxMana: rollRange(birthStatRanges.maxMana, random)
  };
  if (stats.attack <= stats.defense) stats.attack = stats.defense + rollRange([3, 5], random);

  for (let fromRealm = 0; fromRealm < realm; fromRealm += 1) {
    const growth = rollBreakthroughGrowth(fromRealm, random);
    stats.maxHp += growth.maxHp;
    stats.maxMana += growth.maxMana;
    stats.attack += growth.attack;
    stats.defense += growth.defense;
    stats.divineSense += growth.divineSense;
  }

  return stats;
}

export function rootBonus(root, fallback = 0) {
  return typeof root?.bonus === "number" ? root.bonus : fallback;
}

export function normalizeRoot(root) {
  const picked = root?.key ? roots.find((item) => item.key === root.key) || pick(roots) : pick(roots);
  const bonus = Number((picked.min + Math.random() * (picked.max - picked.min)).toFixed(3));
  return { ...picked, bonus: typeof root?.bonus === "number" ? root.bonus : bonus };
}

function rootByKey(key) {
  return roots.find((item) => item.key === key) || roots[0];
}

function normalizeRootSet(entity) {
  const source = Array.isArray(entity?.roots) && entity.roots.length ? entity.roots : [entity?.root].filter(Boolean);
  const seen = new Set();
  const normalized = [];
  for (const entry of source) {
    const root = normalizeRoot(entry);
    if (seen.has(root.key)) continue;
    seen.add(root.key);
    normalized.push(root);
    if (normalized.length >= 5) break;
  }
  if (!normalized.length) normalized.push(normalizeRoot(entity?.root || pick(roots)));
  const primaryKey = normalized.some((root) => root.key === entity?.primaryRootKey)
    ? entity.primaryRootKey
    : normalized[0].key;
  normalized.sort((a, b) => (a.key === primaryKey ? -1 : b.key === primaryKey ? 1 : 0));
  return { roots: normalized, primaryRootKey: primaryKey, primaryRoot: normalized[0] };
}

function applyRootSet(entity) {
  const normalized = normalizeRootSet(entity);
  entity.roots = normalized.roots;
  entity.primaryRootKey = normalized.primaryRootKey;
  entity.root = normalized.primaryRoot;
  return entity;
}

function rootSetFromKeys(keys, fallbackEntity) {
  const source = Array.isArray(keys) ? keys : [keys].filter(Boolean);
  const seen = new Set();
  const picked = [];
  for (const key of source) {
    const base = roots.find((item) => item.key === key);
    if (!base || seen.has(base.key)) continue;
    seen.add(base.key);
    const previous = normalizeRootSet(fallbackEntity || {}).roots.find((root) => root.key === base.key);
    picked.push(normalizeRoot(previous || base));
    if (picked.length >= 5) break;
  }
  if (!picked.length) {
    return normalizeRootSet(fallbackEntity || { root: roots[0] });
  }
  return normalizeRootSet({ roots: picked, primaryRootKey: picked[0].key });
}

export function needsRootMigration(root) {
  const canonical = root?.key ? roots.find((item) => item.key === root.key) : null;
  return !canonical || typeof root?.bonus !== "number" || root.name !== canonical.name || root.effect !== canonical.effect;
}

function rootCount(entity) {
  return normalizeRootSet(entity).roots.length;
}

function rootCultivationMultiplier(entity) {
  return clamp(1 - (rootCount(entity) - 1) * 0.08, 0.6, 1);
}

function rootBreakthroughMultiplier(entity) {
  return clamp(1 - (rootCount(entity) - 1) * 0.06, 0.7, 1);
}

function rootEffectBonus(entity, effect) {
  const set = normalizeRootSet(entity);
  const divisor = set.roots.length;
  return set.roots
    .filter((root) => root.effect === effect)
    .reduce((sum, root) => sum + rootBonus(root) / divisor, 0);
}

const dailyRootFortuneVersion = 1;
const dailyRootFortuneHistoryLimit = 18;
const dailyRootFortuneDefinitions = {
  metal: { stat: "attack", statLabel: "攻击", rate: 0.12, effectText: "攻击提高 12%" },
  wood: { stat: "maxHp", statLabel: "最大血量", rate: 0.15, effectText: "最大血量提高 15%" },
  water: { stat: "xp", statLabel: "修为获取", rate: 0.2, breakthroughBonus: 0.03, effectText: "修为获取提高 20%，突破成功率增加 3 个百分点" },
  fire: { stat: "divineSense", statLabel: "神识", rate: 0.12, effectText: "神识提高 12%" },
  earth: { stat: "defense", statLabel: "防御", rate: 0.12, effectText: "防御提高 12%" },
  heaven: { stat: "maxMana", statLabel: "最大法力", rate: 0.15, effectText: "最大法力提高 15%" }
};

function dailyRootFortuneOrder(state, cycle) {
  const seedBase = state?.calendarStartDate || state?.lastSettlementDate || "fortune";
  const shuffle = (targetCycle) => {
    const order = [...rootCycle];
    const random = seededBattleRandom(`${seedBase}|daily-root-fortune|${targetCycle}`);
    for (let index = order.length - 1; index > 0; index -= 1) {
      const target = Math.floor(random() * (index + 1));
      [order[index], order[target]] = [order[target], order[index]];
    }
    return order;
  };
  const order = shuffle(cycle);
  if (cycle > 1 && order[0] === shuffle(cycle - 1).at(-1)) {
    [order[0], order[1]] = [order[1], order[0]];
  }
  return order;
}

function dailyRootFortuneSnapshot(state, day = state?.day || 0) {
  const normalizedDay = Math.max(0, Math.floor(Number(day) || 0));
  const cycle = Math.floor(normalizedDay / rootCycle.length) + 1;
  const cycleDay = normalizedDay % rootCycle.length;
  const rootKey = dailyRootFortuneOrder(state, cycle)[cycleDay] || rootCycle[0];
  return {
    version: dailyRootFortuneVersion,
    day: normalizedDay,
    date: state ? stateDateForDay(state, normalizedDay) : dateKey(),
    cycle,
    cycleDay: cycleDay + 1,
    rootKey
  };
}

function createDailyRootFortuneState(state, day = state?.day || 0) {
  return { ...dailyRootFortuneSnapshot(state, day), history: [] };
}

function ensureDailyRootFortuneState(state) {
  const expected = dailyRootFortuneSnapshot(state, state.day);
  const previous = state.dailyRootFortune;
  const previousValid = previous?.version === dailyRootFortuneVersion && rootCycle.includes(previous.rootKey) && Number.isFinite(Number(previous.day));
  const changedCurrent = !previousValid || previous.day !== expected.day || previous.rootKey !== expected.rootKey || previous.date !== expected.date;
  let history = Array.isArray(previous?.history) ? previous.history : [];
  if (changedCurrent && previousValid && previous.day !== expected.day) {
    history = [{ day: previous.day, date: previous.date || stateDateForDay(state, previous.day), rootKey: previous.rootKey }, ...history];
  }
  history = history
    .filter((entry) => entry && Number.isFinite(Number(entry.day)) && rootCycle.includes(entry.rootKey) && Number(entry.day) !== expected.day)
    .filter((entry, index, entries) => entries.findIndex((candidate) => Number(candidate.day) === Number(entry.day)) === index)
    .sort((a, b) => Number(b.day) - Number(a.day))
    .slice(0, dailyRootFortuneHistoryLimit)
    .map((entry) => ({ day: Number(entry.day), date: entry.date || stateDateForDay(state, entry.day), rootKey: entry.rootKey }));
  const next = { ...expected, history };
  if (JSON.stringify(previous || null) === JSON.stringify(next)) return false;
  state.dailyRootFortune = next;
  return true;
}

export function advanceDailyRootFortuneDay(state) {
  const previousLimits = new Map(allCultivators(state).map(({ entity }) => [entity.id, {
    maxHp: effectiveMaxHp(entity, state),
    maxMana: effectiveMaxMana(entity, state),
    hp: Number(entity.hp) || 0,
    mana: Number(entity.mana) || 0
  }]));
  state.day += 1;
  ensureDailyRootFortuneState(state);
  for (const { entity } of allCultivators(state)) {
    const previous = previousLimits.get(entity.id);
    if (!previous) continue;
    const nextMaxHp = effectiveMaxHp(entity, state);
    const nextMaxMana = effectiveMaxMana(entity, state);
    entity.hp = clamp(Math.floor((previous.hp / Math.max(1, previous.maxHp)) * nextMaxHp), entity.id === "player" ? 1 : 0, nextMaxHp);
    entity.mana = clamp(Math.floor((previous.mana / Math.max(1, previous.maxMana)) * nextMaxMana), 0, nextMaxMana);
  }
  return state.dailyRootFortune;
}

function dailyRootFortuneMatch(state, entity, day = state?.day || 0) {
  const fortune = dailyRootFortuneSnapshot(state, day);
  const definition = dailyRootFortuneDefinitions[fortune.rootKey];
  const rootsOfEntity = normalizeRootSet(entity).roots;
  const entityId = entity?.id;
  const eligible = Boolean(entityId && (entityId === state?.player?.id || state?.npcs?.some((npc) => npc.id === entityId)));
  const matched = eligible && rootsOfEntity.some((root) => root.key === fortune.rootKey);
  const divisor = Math.max(1, rootsOfEntity.length);
  return {
    ...fortune,
    ...definition,
    eligible,
    matched,
    rootCount: divisor,
    rate: matched ? definition.rate / divisor : 0,
    breakthroughBonus: matched ? Number(definition.breakthroughBonus || 0) / divisor : 0
  };
}

export function getDailyRootFortune(state, entity = state.player, day = state.day) {
  ensureDailyRootFortuneState(state);
  return day === state.day ? publicDailyRootFortune(state, entity) : {
    ...dailyRootFortuneMatch(state, entity, day),
    name: rootByKey(dailyRootFortuneSnapshot(state, day).rootKey).name
  };
}

function dailyRootFortuneStatBonus(state, entity, stat, day = state?.day || 0) {
  if (!state) return 0;
  const match = dailyRootFortuneMatch(state, entity, day);
  return match.stat === stat ? match.rate : 0;
}

function dailyRootFortuneXpMultiplier(state, entity, day = state?.day || 0) {
  if (!state) return 1;
  return 1 + dailyRootFortuneStatBonus(state, entity, "xp", day);
}

function fortuneAdjustedXp(state, entity, amount, day = state?.day || 0) {
  const rawXp = Number(amount) || 0;
  return rawXp > 0 ? Math.round(rawXp * dailyRootFortuneXpMultiplier(state, entity, day)) : rawXp;
}

function dailyRootFortuneBreakthroughBonus(state, entity, day = state?.day || 0) {
  if (!state) return 0;
  return dailyRootFortuneMatch(state, entity, day).breakthroughBonus;
}

function publicDailyRootFortune(state, entity = state.player) {
  const match = dailyRootFortuneMatch(state, entity);
  const root = rootByKey(match.rootKey);
  const adjustedEffectText = match.matched
    ? match.stat === "xp"
      ? `你的修为获取提高 ${formatPercentText(match.rate)}，突破成功率增加 ${Number((match.breakthroughBonus * 100).toFixed(1))} 个百分点`
      : `你的${match.statLabel}提高 ${formatPercentText(match.rate)}`
    : `你未拥有${root.name}，今日不触发属性共鸣`;
  const recent = Array.from({ length: Math.min(6, Math.max(1, Number(state.day) + 1)) }, (_, index) => {
    const day = Math.max(0, Number(state.day) - index);
    const recentMatch = dailyRootFortuneMatch(state, entity, day);
    return {
      ...recentMatch,
      name: rootByKey(recentMatch.rootKey).name,
      playerMatched: recentMatch.matched,
      playerRate: recentMatch.rate,
      playerBreakthroughBonus: recentMatch.breakthroughBonus
    };
  });
  return {
    ...match,
    name: root.name,
    effectText: dailyRootFortuneDefinitions[match.rootKey].effectText,
    playerMatched: match.matched,
    playerRate: match.rate,
    playerBreakthroughBonus: match.breakthroughBonus,
    playerEffectText: adjustedEffectText,
    resonantCount: [state.player, ...(state.npcs || [])].filter((person) => dailyRootFortuneMatch(state, person).matched).length,
    recent
  };
}

function compactDailyRootFortune(state, entity) {
  const match = dailyRootFortuneMatch(state, entity);
  return {
    rootKey: match.rootKey,
    playerMatched: match.matched
  };
}

function activeSpecialRoot(entity) {
  const rootKeys = normalizeRootSet(entity).roots.map((root) => root.key);
  const keys = new Set(rootKeys);
  return specialRoots
    .filter((special) => special.keys.length === rootKeys.length && special.keys.every((key) => keys.has(key)))
    .sort((a, b) => b.keys.length - a.keys.length || a.name.localeCompare(b.name))[0] || null;
}

function battleRootProfile(entity) {
  const special = activeSpecialRoot(entity);
  if (special) {
    return {
      type: "special",
      key: special.id,
      name: special.name,
      childKeys: special.keys,
      special
    };
  }
  const root = primaryRoot(entity);
  return {
    type: "root",
    key: root.key,
    name: root.name,
    childKeys: [root.key],
    root
  };
}

function spiritIncomeMultiplier(entity) {
  return 1;
}

function primaryRoot(entity) {
  return normalizeRootSet(entity).primaryRoot;
}

function rootCounterTarget(rootKey) {
  const index = rootCycle.indexOf(rootKey);
  return index >= 0 ? rootCycle[(index + 1) % rootCycle.length] : "";
}

function rootCounteredBy(rootKey) {
  const index = rootCycle.indexOf(rootKey);
  return index >= 0 ? rootCycle[(index - 1 + rootCycle.length) % rootCycle.length] : "";
}

function rootCounters(attacker, defender) {
  const attackerRoot = battleRootProfile(attacker);
  const defenderRoot = battleRootProfile(defender);
  if (attackerRoot.type === "special") {
    return defenderRoot.type === "root" && attackerRoot.childKeys.includes(defenderRoot.key);
  }
  if (defenderRoot.type === "special") return false;
  return rootCounterTarget(attackerRoot.key) === defenderRoot.key;
}

function rootCounterPenalty(attacker, defender) {
  if (!rootCounters(attacker, defender)) return 0;
  const realmGap = Math.max(0, Math.floor((defender.realm || 0) / 10) - Math.floor((attacker.realm || 0) / 10));
  return Math.max(0.01, 0.1 * Math.pow(0.5, realmGap));
}

function rootProfile(entity) {
  const set = normalizeRootSet(entity);
  const combatRoot = battleRootProfile(entity);
  const combatRestrains = combatRoot.type === "special"
    ? combatRoot.childKeys.map((key) => rootByKey(key))
    : [rootByKey(rootCounterTarget(set.primaryRootKey))];
  return {
    roots: set.roots,
    primaryRootKey: set.primaryRootKey,
    primaryRoot: set.primaryRoot,
    combatRoot,
    count: set.roots.length,
    cultivationMultiplier: rootCultivationMultiplier(entity),
    breakthroughMultiplier: rootBreakthroughMultiplier(entity),
    restrains: combatRestrains[0],
    restrainsList: combatRestrains,
    restrainedBy: combatRoot.type === "special" ? null : rootByKey(rootCounteredBy(set.primaryRootKey)),
    specialRoot: combatRoot.type === "special" ? combatRoot.special : null,
    resonances: []
  };
}

export function effectiveAttack(entity, state) {
  const bonus = rootEffectBonus(entity, "attack") + dailyRootFortuneStatBonus(state, entity, "attack");
  return Math.floor((entity.attack || 0) * (1 + bonus + equipmentBonusFor(state, entity, "attack") + spiritPearlBonusFor(state, entity, "attack")));
}

export function effectiveDefense(entity, state) {
  const bonus = rootEffectBonus(entity, "defense") + dailyRootFortuneStatBonus(state, entity, "defense");
  return Math.floor((entity.defense || 0) * (1 + bonus + equipmentBonusFor(state, entity, "defense") + spiritPearlBonusFor(state, entity, "defense")));
}

export function effectiveMaxHp(entity, state) {
  const bonus = rootEffectBonus(entity, "hp") + dailyRootFortuneStatBonus(state, entity, "maxHp");
  return Math.floor((entity.maxHp || 0) * (1 + bonus + equipmentBonusFor(state, entity, "maxHp") + spiritPearlBonusFor(state, entity, "maxHp")));
}

export function effectiveMaxMana(entity, state) {
  const bonus = rootEffectBonus(entity, "mana") + dailyRootFortuneStatBonus(state, entity, "maxMana");
  return Math.floor((entity.maxMana || 0) * (1 + bonus + equipmentBonusFor(state, entity, "maxMana") + spiritPearlBonusFor(state, entity, "maxMana")));
}

export function effectiveDivineSense(entity, state) {
  const bonus = rootEffectBonus(entity, "divineSense") + dailyRootFortuneStatBonus(state, entity, "divineSense");
  return Math.floor((entity.divineSense || 0) * (1 + bonus + equipmentBonusFor(state, entity, "divineSense") + spiritPearlBonusFor(state, entity, "divineSense")));
}

function effectiveCombatStats(entity, state, options = {}) {
  const equipmentBonuses = { attack: 0, defense: 0, maxHp: 0, divineSense: 0, maxMana: 0 };
  for (const item of equippedItemsFor(state, entity)) {
    const stat = equipmentSlot(item).stat;
    if (stat in equipmentBonuses) equipmentBonuses[stat] += item.bonus || 0;
  }
  const pearlBonuses = state && entity?.id ? spiritPearlBonusesFor(state, entity) : {};
  const fortuneDay = options.day ?? state?.day;
  const fortuneBonus = (stat) => options.includeDailyRootFortune === false ? 0 : dailyRootFortuneStatBonus(state, entity, stat, fortuneDay);
  const effectiveValue = (base, rootStat, stat) => Math.floor(
    (entity?.[base] || 0) * (1 + rootEffectBonus(entity, rootStat) + fortuneBonus(stat) + equipmentBonuses[stat] + (pearlBonuses[stat] || 0))
  );
  const attack = effectiveValue("attack", "attack", "attack");
  const defense = effectiveValue("defense", "defense", "defense");
  const maxHp = effectiveValue("maxHp", "hp", "maxHp");
  const divineSense = effectiveValue("divineSense", "divineSense", "divineSense");
  const maxMana = effectiveValue("maxMana", "mana", "maxMana");
  return { attack, defense, maxHp, divineSense, maxMana };
}

export function effectiveStats(entity, state, options = {}) {
  const { attack, defense, maxHp, divineSense, maxMana } = effectiveCombatStats(entity, state, options);
  return {
    attack, defense, maxHp, divineSense, maxMana,
    xpMultiplier: xpGainMultiplier(entity, state) * talentSnapshot(entity).xpMultiplier,
    bonuses: {
      attack: attack - (entity.attack || 0),
      defense: defense - (entity.defense || 0),
      maxHp: maxHp - (entity.maxHp || 0),
      divineSense: divineSense - (entity.divineSense || 0),
      maxMana: maxMana - (entity.maxMana || 0)
    }
  };
}

export function xpGainMultiplier(entity, state = null) {
  return (1 + rootEffectBonus(entity, "xp") + spiritPearlBonusFor(state, entity, "xp")) * rootCultivationMultiplier(entity) * dailyRootFortuneXpMultiplier(state, entity);
}

function applyDamage(entity, amount, state) {
  const damage = Math.max(1, Math.floor(amount));
  entity.hp = clamp((entity.hp || 0) - damage, 0, effectiveMaxHp(entity, state));
  return damage;
}

function randomSkillId(random = Math.random) {
  return combatSkills[Math.floor(random() * combatSkills.length) % combatSkills.length].id;
}

function findSkill(skillId) {
  return combatSkills.find((skill) => skill.id === skillId) || combatSkills[0];
}

function needsSkillMigration(skillId) {
  return !combatSkills.some((skill) => skill.id === skillId);
}

const maxSkillRank = 10;
const skillUpgradeBaseCosts = [0, 0, 80, 160, 300, 520, 850, 1300, 1900, 2700, 3800];
const skillUpgradeChances = [0, 0, 0.88, 0.82, 0.76, 0.7, 0.64, 0.58, 0.52, 0.46, 0.4];
const skillUpgradeTargets = {
  azure_sword: { power: 1.18 },
  thunder_pearl: { power: 1.58, pierce: 0.72 },
  blood_escape: { duration: 2 },
  poison_flame: { percent: 0.12, duration: 4 },
  magnetic_light: { power: 0.95 },
  golden_body: { reduce: 0.65, duration: 3 },
  soul_hook: { power: 1.2, burn: 50 },
  green_bamboo: { power: 0.8 },
  spirit_armor: { amount: 35, duration: 4 },
  bone_spike: { percent: 0.1, duration: 5 },
  fire_crow: { power: 1.25, percent: 0.08, duration: 4 },
  wood_recovery: { percent: 0.42, cooldown: 4 },
  ghost_step: { chance: 0.62, duration: 3 },
  demon_cut: { power: 1.55, threshold: 0.45, bonus: 0.9 },
  ice_seal: { power: 1.05, amount: 32, duration: 4 },
  starfall: { power: 2.6 },
  blood_drink: { power: 1.52, leech: 0.7 },
  mirror_water: { reflect: 0.62, duration: 3 },
  wind_blade: { power: 1.38, extraDodge: 0.42, duration: 2 },
  five_element: { reduce: 0.42, amount: 28, duration: 4 }
};

function skillRankOf(entity, skillId = entity?.skillId) {
  const rank = Number(entity?.skillRanks?.[skillId] || entity?.skillRank || 1);
  return clamp(Math.floor(rank), 1, maxSkillRank);
}

function skillUpgradeCost(skill, targetRank) {
  const base = skillUpgradeBaseCosts[targetRank] || 0;
  const multiplier = skill.cost >= 30 ? 1.25 : skill.cost >= 24 ? 1.15 : skill.cost <= 16 ? 0.9 : 1;
  return Math.max(1, Math.floor(base * multiplier));
}

function skillUpgradeChance(targetRank) {
  return skillUpgradeChances[targetRank] || 0;
}

function skillUpgradeRealmRequirement(targetRank) {
  if (targetRank <= 1) return 0;
  return clamp((targetRank - 2) * 10, 0, realms.length - 1);
}

function skillManaPoolScale(maxMana) {
  const pool = Number(maxMana) || skillManaBaseline;
  return clamp(pool / skillManaBaseline, 1, skillManaScaleCap);
}

function skillManaCost(skill, rank, maxMana = 0) {
  if (!skill?.cost) return 0;
  const rankMultiplier = 1 + 0.08 * (rank - 1);
  const poolMultiplier = maxMana ? skillManaPoolScale(maxMana) : 1;
  return Math.max(1, Math.ceil(skill.cost * rankMultiplier * poolMultiplier));
}

function roundSkillValue(key, value) {
  if (["amount", "burn", "duration", "cooldown", "hits"].includes(key)) return Math.max(1, Math.round(value));
  if (["power", "pierce", "percent", "reduce", "chance", "threshold", "bonus", "leech", "extraDodge", "reflect"].includes(key)) {
    return Math.round(value * 1000) / 1000;
  }
  return value;
}

function scaleSkillValue(skill, key, target, progress) {
  if (skill[key] === undefined || target === undefined) return skill[key];
  return roundSkillValue(key, skill[key] + (target - skill[key]) * progress);
}

const skillEffectModifierKeys = [
  "power", "percent", "reduce", "pierce", "chance", "bonus", "leech",
  "reflect", "extraDodge", "amount", "burn"
];

function scaleSkillEffectValues(skill, bonus = 0) {
  if (!bonus) return skill;
  const result = { ...skill };
  for (const key of skillEffectModifierKeys) {
    if (typeof result[key] === "number") result[key] = roundSkillValue(key, result[key] * (1 + bonus));
  }
  return result;
}

function scaleSkillDamageValue(skill, bonus = 0) {
  if (!bonus || typeof skill?.power !== "number") return skill;
  return { ...skill, power: roundSkillValue("power", skill.power * (1 + bonus)) };
}

function effectiveSkill(skill, rank = 1, options = {}) {
  const safeRank = clamp(Math.floor(rank || 1), 1, maxSkillRank);
  const target = skillUpgradeTargets[skill.id] || {};
  const progress = (safeRank - 1) / (maxSkillRank - 1);
  const upgraded = {
    ...skill,
    baseCost: skill.cost,
    rank: safeRank,
    cost: skillManaCost(skill, safeRank, options.maxMana)
  };
  for (const key of Object.keys(target)) {
    upgraded[key] = scaleSkillValue(skill, key, target[key], progress);
  }
  upgraded.text = skillEffectText(upgraded);
  return upgraded;
}

function effectiveSkillForEntity(entity) {
  const skill = findSkill(entity?.skillId);
  const skillManaBase = Number(entity?.skillManaBase) || entity?.maxMana;
  const upgraded = effectiveSkill(skill, skillRankOf(entity, skill.id), { maxMana: skillManaBase });
  const buffs = entity?.trialBuffs || {};
  if (!Object.keys(buffs).length) return upgraded;
  let result = { ...upgraded };
  const skillPower = Math.max(-0.5, Number(buffs.skillPower) || 0);
  const statusPower = Math.max(-0.5, Number(buffs.statusPower) || 0);
  const healing = Math.max(-0.5, Number(buffs.healing) || 0);
  const basePercent = result.percent;
  const baseLeech = result.leech;
  result = scaleSkillEffectValues(result, skillPower);
  if (typeof basePercent === "number") {
    // `skillPower` is the generic skill-effect modifier and therefore applies
    // to healing skills as well. Continuous effects additionally receive
    // `statusPower`, while healing receives the dedicated `healing` modifier.
    const specialPower = result.type === "heal" ? healing : statusPower;
    result.percent = roundSkillValue("percent", basePercent * (1 + skillPower + specialPower));
  }
  if (typeof baseLeech === "number") result.leech = roundSkillValue("leech", baseLeech * (1 + skillPower + healing));
  result.cost = Math.max(1, Math.ceil(result.cost * (1 + (Number(buffs.manaCost) || 0))));
  result.cooldown = Math.max(1, Math.round((result.cooldown || 1) + (Number(buffs.cooldown) || 0)));
  result.text = skillEffectText(result);
  return result;
}

function skillEffectText(skill) {
  const percent = (value) => `${Math.round((value || 0) * 100)}%`;
  if (skill.type === "double") return `连续斩出两剑，每剑按 ${percent(skill.power)} 攻击结算。`;
  if (skill.type === "pierce") return `雷光破罡，造成 ${percent(skill.power)} 攻击伤害，并忽略目标 ${percent(skill.pierce)} 防御。`;
  if (skill.type === "dodge") return `化作血影游走，闪避接下来 ${skill.duration} 回合内的首个攻击。`;
  if (skill.type === "dot") return `使目标${skill.status === "bleed" ? "流血" : "中毒"} ${skill.duration} 回合，每回合损失最大血量 ${percent(skill.percent)}。`;
  if (skill.type === "stun") return `神光压制，造成 ${percent(skill.power)} 攻击伤害，并令目标跳过下一次行动。`;
  if (skill.type === "shield") return `护体金光持续 ${skill.duration} 回合，受到伤害降低 ${percent(skill.reduce)}。`;
  if (skill.type === "manaBurn") return `摄魂扰息，造成 ${percent(skill.power)} 攻击伤害，并削去目标 ${skill.burn} 点法力。`;
  if (skill.type === "multi") return `剑影分化${skill.hits}道，每道按 ${percent(skill.power)} 攻击结算。`;
  if (skill.type === "defenseBuff") return `防御提高 ${skill.amount} 点，持续 ${skill.duration} 回合。`;
  if (skill.type === "dotStrike") return `火鸦扑击造成 ${percent(skill.power)} 攻击伤害，并灼烧 ${skill.duration} 回合，每回合损失最大血量 ${percent(skill.percent)}。`;
  if (skill.type === "heal") return `回转生机，恢复自身最大血量 ${percent(skill.percent)}。`;
  if (skill.type === "evasionBuff") return `身法飘忽 ${skill.duration} 回合，额外获得 ${percent(skill.chance)} 闪避机会。`;
  if (skill.type === "execute") return `斩向破绽，基础 ${percent(skill.power)} 攻击；目标血量低于 ${percent(skill.threshold)} 时额外提高 ${percent(skill.bonus)}。`;
  if (skill.type === "weaken") return `寒气封脉，造成 ${percent(skill.power)} 攻击伤害，并使目标攻击降低 ${skill.amount} 点，持续 ${skill.duration} 回合。`;
  if (skill.type === "heavy") return `凝聚星辉重击，造成 ${percent(skill.power)} 攻击伤害。`;
  if (skill.type === "lifesteal") return `造成 ${percent(skill.power)} 攻击伤害，并按伤害量 ${percent(skill.leech)} 恢复自身血量。`;
  if (skill.type === "reflect") return `镜水护身 ${skill.duration} 回合，反弹所受伤害的 ${percent(skill.reflect)}。`;
  if (skill.type === "speedStrike") return `疾速突袭造成 ${percent(skill.power)} 攻击伤害，并在 ${skill.duration} 回合内额外提高 ${percent(skill.extraDodge)} 闪避。`;
  if (skill.type === "field") return `布下五行阵 ${skill.duration} 回合，己方受伤降低 ${percent(skill.reduce)}，目标防御降低 ${skill.amount} 点。`;
  return skill.text || "";
}

function normalizeSkillState(entity) {
  let changed = false;
  if (!entity.skillRanks || typeof entity.skillRanks !== "object" || Array.isArray(entity.skillRanks)) {
    entity.skillRanks = {};
    changed = true;
  }
  for (const skill of combatSkills) {
    if (entity.skillRanks[skill.id] === undefined) continue;
    const rank = clamp(Math.floor(Number(entity.skillRanks[skill.id]) || 1), 1, maxSkillRank);
    if (rank !== entity.skillRanks[skill.id]) changed = true;
    entity.skillRanks[skill.id] = rank;
  }
  if (!entity.skillRanks[entity.skillId]) {
    entity.skillRanks[entity.skillId] = 1;
    changed = true;
  }
  if (entity.lastSkillUpgradeDay === undefined) {
    entity.lastSkillUpgradeDay = 0;
    changed = true;
  }
  return changed;
}

function combatStat(entity, key) {
  const stats = entity?.stats || entity || {};
  if (key === "hp") return Number(entity?.hp ?? stats.hp ?? 0);
  if (key === "maxHp") return Number(entity?.maxHp ?? stats.maxHp ?? 0);
  if (key === "mana") return Number(entity?.mana ?? stats.mana ?? 0);
  if (key === "maxMana") return Number(entity?.maxMana ?? stats.maxMana ?? 0);
  return Number(entity?.[key] ?? stats[key] ?? 0);
}

function hasCombatEffect(effects, type, predicate = () => true) {
  return (effects || []).some((effect) => effect?.type === type && Number(effect.duration || 0) > 0 && predicate(effect));
}

function shouldUseCombatSkill({ skill, actor, target, actorEffects = [], targetEffects = [] } = {}) {
  if (!skill) return false;
  const actorHp = combatStat(actor, "hp");
  const actorMaxHp = Math.max(1, combatStat(actor, "maxHp"));
  const targetHp = combatStat(target, "hp");
  const targetMaxHp = Math.max(1, combatStat(target, "maxHp"));
  const targetMana = combatStat(target, "mana");
  const targetMaxMana = Math.max(1, combatStat(target, "maxMana"));

  if (skill.type === "heal") {
    const healAmount = actorMaxHp * Math.max(0, Number(skill.percent) || 0);
    const missingHp = Math.max(0, actorMaxHp - actorHp);
    return actorHp / actorMaxHp < 0.78 && missingHp >= Math.max(actorMaxHp * 0.05, healAmount * 0.35);
  }
  if (skill.type === "execute") {
    return targetHp / targetMaxHp <= Math.max(0, Number(skill.threshold) || 0);
  }
  if (skill.type === "manaBurn") {
    const burn = Math.max(1, Number(skill.burn) || 0);
    return targetMana > Math.max(1, Math.min(burn, targetMaxMana * 0.2));
  }
  if (skill.type === "dot" || skill.type === "dotStrike") {
    const sameStatus = hasCombatEffect(targetEffects, "dot", (effect) => (
      (effect.name && effect.name === skill.name)
      || (effect.sourceId && actor?.id && effect.sourceId === actor.id)
    ));
    return !sameStatus;
  }
  if (skill.type === "stun") return !hasCombatEffect(targetEffects, "stun");
  if (skill.type === "weaken") return !hasCombatEffect(targetEffects, "attackDown");
  if (skill.type === "shield") return !hasCombatEffect(actorEffects, "shield");
  if (skill.type === "defenseBuff") return !hasCombatEffect(actorEffects, "defenseUp");
  if (skill.type === "reflect") return !hasCombatEffect(actorEffects, "reflect");
  if (skill.type === "evasionBuff") return !hasCombatEffect(actorEffects, "evasion");
  if (skill.type === "dodge") return !hasCombatEffect(actorEffects, "dodgeNext");
  if (skill.type === "field") {
    return !hasCombatEffect(actorEffects, "shield") && !hasCombatEffect(targetEffects, "defenseDown");
  }
  return true;
}

function skillUpgradePreview(entity) {
  const skill = findSkill(entity.skillId);
  const rank = skillRankOf(entity, skill.id);
  const targetRank = Math.min(maxSkillRank, rank + 1);
  const requirement = skillUpgradeRealmRequirement(targetRank);
  const cost = rank >= maxSkillRank ? 0 : skillUpgradeCost(skill, targetRank);
  const chance = rank >= maxSkillRank ? 0 : skillUpgradeChance(targetRank);
  const attemptedToday = Number(entity.lastSkillUpgradeDay || 0) === Number(entity.__stateDay || 0);
  return {
    skillId: skill.id,
    name: skill.name,
    rank,
    maxRank: maxSkillRank,
    current: effectiveSkill(skill, rank, { maxMana: entity.maxMana }),
    next: rank >= maxSkillRank ? null : effectiveSkill(skill, targetRank, { maxMana: entity.maxMana }),
    targetRank,
    requirementRealm: realms[requirement] || realms[0],
    requirementRealmIndex: requirement,
    cost,
    chance,
    attemptedToday,
    canMeetRealm: (entity.realm || 0) >= requirement,
    enoughSpirit: (entity.spirit || 0) >= cost
  };
}

function skillRankPlan(skill, entity = {}) {
  return Array.from({ length: maxSkillRank }, (_, index) => {
    const rank = index + 1;
    const requirement = skillUpgradeRealmRequirement(rank);
    return {
      rank,
      requirementRealm: rank <= 1 ? "初始" : realms[requirement] || realms[0],
      requirementRealmIndex: requirement,
      cost: rank <= 1 ? 0 : skillUpgradeCost(skill, rank),
      chance: rank <= 1 ? 1 : skillUpgradeChance(rank),
      skill: effectiveSkill(skill, rank, { maxMana: entity.maxMana })
    };
  });
}

function previewSkillUpgradeForState(state, entity) {
  const snapshot = { ...entity, __stateDay: state.day };
  return skillUpgradePreview(snapshot);
}

function skillUpgradePlanForState(state, entity) {
  return combatSkills.map((skill) => {
    const snapshot = { ...entity, skillId: skill.id, __stateDay: state.day };
    return {
      ...skillUpgradePreview(snapshot),
      ranks: skillRankPlan(skill, snapshot),
      isCurrent: entity.skillId === skill.id
    };
  });
}

function attemptSkillUpgrade(state, entity, { auto = false } = {}) {
  normalizeSkillState(entity);
  const skill = findSkill(entity.skillId);
  const rank = skillRankOf(entity, skill.id);
  if (rank >= maxSkillRank) {
    if (auto) return null;
    throw new Error("技能已达十阶。");
  }
  if (Number(entity.lastSkillUpgradeDay || 0) === Number(state.day || 1)) {
    if (auto) return null;
    throw new Error("今日已经尝试过技能升级。");
  }
  const targetRank = rank + 1;
  const requirement = skillUpgradeRealmRequirement(targetRank);
  if ((entity.realm || 0) < requirement) {
    if (auto) return null;
    throw new Error(`需要达到${realms[requirement]}才能升至${targetRank}阶。`);
  }
  const cost = skillUpgradeCost(skill, targetRank);
  if ((entity.spirit || 0) < cost) {
    if (auto) return null;
    throw new Error(`灵石不足，需要 ${cost} 灵石。`);
  }
  const chance = skillUpgradeChance(targetRank);
  entity.spirit -= cost;
  entity.lastSkillUpgradeDay = state.day;
  const success = Math.random() < chance;
  if (success) entity.skillRanks[skill.id] = targetRank;
  const result = {
    skillId: skill.id,
    name: skill.name,
    fromRank: rank,
    targetRank,
    rank: success ? targetRank : rank,
    cost,
    chance,
    success
  };
  recordSkillUpgrade(state, entity, result);
  if (!auto) {
    log(state, success
      ? `你耗费 ${cost} 灵石淬炼「${skill.name}」，成功升至 ${targetRank} 阶。`
      : `你耗费 ${cost} 灵石淬炼「${skill.name}」失败，技能仍为 ${rank} 阶。`, success ? "gold" : "bad");
  }
  return result;
}

function recordSkillUpgrade(state, entity, result) {
  entity.skillUpgrades ??= [];
  entity.skillUpgrades.unshift({
    day: state.day,
    date: stateDateForDay(state),
    skillId: result.skillId,
    skillName: result.name,
    fromRank: result.fromRank,
    toRank: result.targetRank,
    rank: result.rank,
    cost: result.cost,
    chance: result.chance,
    success: result.success
  });
  entity.skillUpgrades = trimRecordsByDay(entity.skillUpgrades, state.day, growthRecordDays, growthRecordLimit);
}

function autoUpgradeNpcSkill(state, npc) {
  const result = attemptSkillUpgrade(state, npc, { auto: true });
  if (!result) return null;
  return `${result.name}${result.success ? `升至${result.targetRank}阶` : `升${result.targetRank}阶失败`}`;
}

function combatSnapshot(entity, state) {
  const effective = entity?.trialStatsAreEffective
    ? {
      attack: Math.max(1, Math.floor(Number(entity.attack) || 0)),
      defense: Math.max(0, Math.floor(Number(entity.defense) || 0)),
      maxHp: Math.max(1, Math.floor(Number(entity.maxHp) || 0)),
      divineSense: Math.max(1, Math.floor(Number(entity.divineSense) || 0)),
      maxMana: Math.max(1, Math.floor(Number(entity.maxMana) || 0))
    }
    : {
      attack: effectiveAttack(entity, state),
      defense: effectiveDefense(entity, state),
      maxHp: effectiveMaxHp(entity, state),
      divineSense: effectiveDivineSense(entity, state),
      maxMana: effectiveMaxMana(entity, state)
    };
  const snapshot = {
    ...effective,
    hp: Math.max(0, Math.min(entity.hp ?? effective.maxHp, effective.maxHp)),
    mana: Math.max(0, Math.min(entity.mana ?? effective.maxMana, effective.maxMana))
  };
  const buffs = entity?.trialBuffs || {};
  const isLowHp = snapshot.hp <= snapshot.maxHp * 0.5;
  const lowHpAttack = isLowHp ? Number(buffs.lowHpAttack) || 0 : 0;
  const lowHpSense = isLowHp ? Number(buffs.lowHpSense) || 0 : 0;
  const scale = (key, bonus) => Math.max(key === "defense" ? 0 : 1, Math.floor(snapshot[key] * (1 + bonus)));
  const maxHp = scale("maxHp", Number(buffs.maxHp) || 0);
  const maxMana = scale("maxMana", Number(buffs.maxMana) || 0);
  const scaleResource = (current, baseMax, scaledMax) => current >= baseMax
    ? scaledMax
    : clamp(Math.floor(current * scaledMax / Math.max(1, baseMax)), 0, scaledMax);
  return {
    attack: scale("attack", (Number(buffs.attack) || 0) + lowHpAttack),
    defense: scale("defense", Number(buffs.defense) || 0),
    maxHp,
    hp: scaleResource(snapshot.hp, snapshot.maxHp, maxHp),
    divineSense: scale("divineSense", (Number(buffs.divineSense) || 0) + lowHpSense),
    maxMana,
    mana: scaleResource(snapshot.mana, snapshot.maxMana, maxMana)
  };
}

function seededBattleRandom(seed = "") {
  let value = 2166136261;
  for (const char of String(seed)) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return () => {
    value += 0x6D2B79F5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function applyBattleRootPenalty(snapshot, penalty) {
  if (!penalty) return snapshot;
  return {
    ...snapshot,
    attack: Math.max(1, Math.floor(snapshot.attack * (1 - penalty))),
    defense: Math.max(0, Math.floor(snapshot.defense * (1 - penalty))),
    divineSense: Math.max(0, Math.floor(snapshot.divineSense * (1 - penalty))),
    rootCounterPenalty: penalty
  };
}

export function runTurnBattle(left, right, options = {}) {
  const random = options.random || (options.seed ? seededBattleRandom(options.seed) : Math.random);
  const leftBasePenalty = rootCounterPenalty(right, left);
  const rightBasePenalty = rootCounterPenalty(left, right);
  const leftPenalty = leftBasePenalty * (1 - clamp(Number(left?.trialBuffs?.rootResist) || 0, 0, 1));
  const rightPenalty = rightBasePenalty * (1 - clamp(Number(right?.trialBuffs?.rootResist) || 0, 0, 1));
  const a = applyBattleRootPenalty(combatSnapshot(left, options.state), leftPenalty);
  const b = applyBattleRootPenalty(combatSnapshot(right, options.state), rightPenalty);
  const order = a.divineSense === b.divineSense
    ? (random() < 0.5 ? ["left", "right"] : ["right", "left"])
    : (a.divineSense > b.divineSense ? ["left", "right"] : ["right", "left"]);
  const maxRounds = options.maxRounds || 18;
  let leftHp = a.hp;
  let rightHp = b.hp;
  let leftMana = a.mana;
  let rightMana = b.mana;
  const events = [];
  let currentRound = 0;
  const skills = { left: effectiveSkillForEntity(left), right: effectiveSkillForEntity(right) };
  const cooldowns = { left: 0, right: 0 };
  const effects = { left: [], right: [] };
  const trialBuffs = { left: left?.trialBuffs || {}, right: right?.trialBuffs || {} };
  const lawMechanics = { left: trialBuffs.left.__lawMechanics || [], right: trialBuffs.right.__lawMechanics || [] };
  const lawRuntime = { left: {}, right: {} };
  const actionCounts = { left: { attacks: 0, skills: 0 }, right: { attacks: 0, skills: 0 } };
  const lethalGuardUsed = { left: false, right: false };
  const openingSkillUsed = { left: false, right: false };
  const healStreak = { left: 0, right: 0 };
  const healBoostReady = { left: false, right: false };
  const statusStacks = { left: 0, right: 0 };
  const companionSkillBoost = { left: 0, right: 0 };
  const roundDamageTaken = { left: false, right: false };
  const trialCompanion = options.trialCompanion || null;
  const companionContribution = { damage: 0, healing: 0, shields: 0, control: 0, assists: 0 };

  const pushEvent = (kind, text, detail = {}) => {
    events.push({ round: currentRound, kind, text, ...detail });
  };
  const lawSourceFor = (side, effectKey, fallbackId) => {
    const source = trialBuffs[side]?.__lawSources?.[effectKey];
    const fallback = daoTrialLawMap[fallbackId];
    return source || { id: fallbackId, name: fallback?.name || "问道法则" };
  };
  const mechanicsFor = (side, event, action = "") => lawMechanics[side].filter((entry) => {
    const events = Array.isArray(entry.event) ? entry.event : [entry.event];
    return events.includes(event) && (!action || entry.action === action);
  });
  const runtimeFor = (side, mechanic) => {
    lawRuntime[side][mechanic.type] ??= { count: 0, stacks: 0, stored: 0, lastRound: -1, cooldown: 0, used: false, disabled: false };
    return lawRuntime[side][mechanic.type];
  };
  const pushLawEvent = (side, mechanic, text, detail = {}) => pushEvent("law", `${sideState(side).actorName}引动「${mechanic.lawName}」，${text}`, {
    actorSide: side,
    lawId: mechanic.lawId,
    lawName: mechanic.lawName,
    lawStack: mechanic.stack,
    mechanicType: mechanic.type,
    leftHp,
    rightHp,
    leftMana,
    rightMana,
    ...detail
  });

  if (leftPenalty) pushEvent("root", `${right.name}主灵根克制${left.name}，${left.name}攻击、防御、神识降低 ${Math.round(leftPenalty * 1000) / 10}%`, { side: "left", penalty: leftPenalty });
  if (rightPenalty) pushEvent("root", `${left.name}主灵根克制${right.name}，${right.name}攻击、防御、神识降低 ${Math.round(rightPenalty * 1000) / 10}%`, { side: "right", penalty: rightPenalty });
  const sideState = (side) => side === "left"
    ? { actor: a, target: b, actorName: left.name, targetName: right.name, hp: leftHp, targetHp: rightHp, mana: leftMana, targetMana: rightMana }
    : { actor: b, target: a, actorName: right.name, targetName: left.name, hp: rightHp, targetHp: leftHp, mana: rightMana, targetMana: leftMana };
  const setHp = (side, hp) => {
    const current = side === "left" ? leftHp : rightHp;
    const next = clamp(hp, 0, side === "left" ? a.maxHp : b.maxHp);
    if (next < current) roundDamageTaken[side] = true;
    if (side === "left") leftHp = next;
    else rightHp = next;
  };
  const setMana = (side, mana) => {
    if (side === "left") leftMana = clamp(mana, 0, a.maxMana);
    else rightMana = clamp(mana, 0, b.maxMana);
  };
  const maxHpOf = (side) => side === "left" ? a.maxHp : b.maxHp;
  const opposite = (side) => side === "left" ? "right" : "left";
  const addEffect = (side, effect) => {
    effects[side].push({ ...effect });
  };
  const consumeEffect = (side, type) => {
    const index = effects[side].findIndex((effect) => effect.type === type && effect.duration > 0);
    if (index < 0) return null;
    const [effect] = effects[side].splice(index, 1);
    return effect;
  };
  const effectValue = (side, type, key, fallback = 0) => effects[side]
    .filter((effect) => effect.type === type && effect.duration > 0)
    .reduce((value, effect) => Math.max(value, effect[key] ?? fallback), fallback);
  const effectSum = (side, type, key) => effects[side]
    .filter((effect) => effect.type === type && effect.duration > 0)
    .reduce((value, effect) => value + (effect[key] || 0), 0);
  const divineSenseDodgeChance = (target, actor) => {
    if ((target.divineSense || 0) <= (actor.divineSense || 0)) return 0;
    const ratio = Math.floor((target.divineSense || 0) / Math.max(1, actor.divineSense || 0));
    return clamp(Math.max(1, ratio), 1, 20) / 100;
  };
  const tickEffects = (side) => {
    let target = sideState(side);
    for (const effect of effects[side]) {
      if (effect.duration <= 0) continue;
      if (effect.type === "dot") {
        const damage = Math.max(1, Math.floor(maxHpOf(side) * effect.percent));
        setHp(side, target.hp - damage);
        pushEvent("status", `${target.actorName}受${effect.name}侵蚀，损失 ${damage} 血量`, {
          actorSide: effect.sourceSide || opposite(side),
          targetSide: side,
          damage,
          leftHp,
          rightHp,
          leftMana,
          rightMana
        });
        target = sideState(side);
      }
      // Action-consumed effects must survive until the target actually gets
      // the promised next action/attack, regardless of turn order.
      if (!["dodgeNext", "stun"].includes(effect.type)) effect.duration -= 1;
    }
    effects[side] = effects[side].filter((effect) => effect.duration > 0);
  };
  const applyStrike = (side, multiplier = 1, options = {}) => {
    const targetSide = opposite(side);
    const state = sideState(side);
    if (consumeEffect(targetSide, "dodgeNext")) {
      pushEvent("dodge", `${state.targetName}借身法避开${state.actorName}的攻势`, {
        actorSide: targetSide,
        targetSide: side,
        leftHp,
        rightHp,
        leftMana,
        rightMana
      });
      return 0;
    }

    const baseDodge = divineSenseDodgeChance(state.target, state.actor);
    const extraDodge = effectValue(targetSide, "evasion", "chance");
    if (random() < clamp(baseDodge + extraDodge, 0, 0.62)) {
      pushEvent("dodge", `${state.targetName}凭神识预判避开一击`, {
        actorSide: targetSide,
        targetSide: side,
        dodgeChance: baseDodge,
        leftHp,
        rightHp,
        leftMana,
        rightMana
      });
      return 0;
    }

    const attackPenalty = effectSum(side, "attackDown", "amount");
    const defensePenalty = effectSum(targetSide, "defenseDown", "amount");
    const defenseBonus = effectSum(targetSide, "defenseUp", "amount");
    const attack = Math.max(1, state.actor.attack - attackPenalty);
    const defense = Math.max(0, state.target.defense + defenseBonus - defensePenalty);
    const pierce = options.pierce || 0;
    const wagerPower = lawMechanics[side]
      .filter((entry) => entry.action === "battleWager" && runtimeFor(side, entry).active)
      .reduce((sum, entry) => sum + Math.max(0, Number(entry.params.power) || 0), 0);
    const rootReversalPower = lawMechanics[side]
      .filter((entry) => entry.action === "rootReversal" && runtimeFor(side, entry).active)
      .reduce((sum, entry) => sum + Math.max(0, Number(entry.params.bonus) || 0), 0);
    const rawDamage = attack * multiplier * (1 + wagerPower + rootReversalPower) - defense * (1 - pierce);
    let damage = Math.max(1, Math.floor(rawDamage + random() * 5));
    const reduction = effectValue(targetSide, "shield", "reduce");
    damage = Math.max(1, Math.floor(damage * (1 - reduction)));
    if (state.targetHp - damage <= 0) {
      const mechanicWard = [...mechanicsFor(targetSide, "onLethal", "lethalWard"), ...mechanicsFor(targetSide, "onLethal", "companionLethalWard")]
        .find((entry) => {
          const runtime = runtimeFor(targetSide, entry);
          return !runtime.used && (entry.action !== "companionLethalWard" || trialCompanion && !runtime.disabled);
        });
      if (mechanicWard) {
        const runtime = runtimeFor(targetSide, mechanicWard);
        damage = Math.max(0, state.targetHp - 1);
        runtime.used = true;
        if (mechanicWard.action === "companionLethalWard") runtime.disabled = true;
        const heal = Math.floor(maxHpOf(targetSide) * Math.max(0, Number(mechanicWard.params.heal) || 0));
        const reduction = Math.max(0, Number(mechanicWard.params.reduction ?? mechanicWard.params.shield) || 0);
        if (heal > 0) damage = Math.max(0, damage - heal);
        if (reduction > 0) addEffect(targetSide, { type: "shield", reduce: clamp(reduction, 0, 0.35), duration: Math.max(1, Number(mechanicWard.params.duration) || 2) });
        pushLawEvent(targetSide, mechanicWard, mechanicWard.action === "companionLethalWard" ? "同行替劫，守住最后生机" : "守住最后一线生机", { targetSide: side, healing: heal });
      } else if (trialBuffs[targetSide].lethalGuard && !lethalGuardUsed[targetSide]) {
      damage = Math.max(0, state.targetHp - 1);
      lethalGuardUsed[targetSide] = true;
      const law = lawSourceFor(targetSide, "lethalGuard", "unyielding-law");
      pushEvent("law", `${state.targetName}以「${law.name}」守住最后一线生机`, { actorSide: targetSide, targetSide: side, lawId: law.id, lawName: law.name, leftHp, rightHp, leftMana, rightMana });
      }
    }
    setHp(targetSide, state.targetHp - damage);
    triggerLawMechanics("onDamageTaken", targetSide, { damage, sourceSide: side });
    triggerLawMechanics("afterDamage", side, { damage, targetSide });

    const reflect = effectValue(targetSide, "reflect", "reflect");
    if (reflect > 0) {
      const reflected = Math.max(1, Math.floor(damage * reflect));
      setHp(side, state.hp - reflected);
      pushEvent("status", `${state.targetName}反照 ${reflected} 伤害`, {
        actorSide: targetSide,
        targetSide: side,
        damage: reflected,
        leftHp,
        rightHp,
        leftMana,
        rightMana
      });
    }
    const lawReflect = Math.max(0, Number(trialBuffs[targetSide].reflectCharge) || 0);
    if (lawReflect > 0 && damage > 0) {
      const reflected = Math.max(1, Math.floor(damage * lawReflect));
      setHp(side, sideState(side).hp - reflected);
      const law = lawSourceFor(targetSide, "reflectCharge", "iron-rebound");
      pushEvent("law", `${state.targetName}借「${law.name}」反震 ${reflected} 伤害`, { actorSide: targetSide, targetSide: side, lawId: law.id, lawName: law.name, damage: reflected, leftHp, rightHp, leftMana, rightMana });
    }
    if (options.basic) {
      actionCounts[side].attacks += 1;
      const every = Math.max(0, Math.floor(Number(trialBuffs[side].attackEchoEvery) || 0));
      if (every && actionCounts[side].attacks % every === 0 && sideState(targetSide).hp > 0) {
        const echo = Math.max(1, Math.floor(state.actor.attack * Math.max(0, Number(trialBuffs[side].attackEchoPower) || 0.35)));
        setHp(targetSide, sideState(targetSide).hp - echo);
        const law = lawSourceFor(side, "attackEchoEvery", "triple-edge");
        pushEvent("law", `${state.actorName}引动「${law.name}」余波，追加 ${echo} 伤害`, { actorSide: side, targetSide, lawId: law.id, lawName: law.name, damage: echo, leftHp, rightHp, leftMana, rightMana });
      }
    }
    return damage;
  };
  const boostSkill = (skill, bonus) => {
    return scaleSkillEffectValues(skill, bonus);
  };
  const castSkill = (side, skill) => {
    const targetSide = opposite(side);
    const state = sideState(side);
    const openingBonus = Math.max(0, Number(trialBuffs[side].openingSkillPower) || 0);
    for (const entry of lawMechanics[side]) {
      const runtime = runtimeFor(side, entry);
      if (runtime.nextSkillPower > 0) {
        skill = boostSkill(skill, runtime.nextSkillPower);
        pushLawEvent(side, entry, `令本次术法效果提高 ${Math.round(runtime.nextSkillPower * 100)}%`);
        runtime.nextSkillPower = 0;
      }
    }
    if (!openingSkillUsed[side]) {
      openingSkillUsed[side] = true;
      if (openingBonus && state.targetHp / Math.max(1, state.target.maxHp) > 0.8) {
        skill = scaleSkillDamageValue(skill, openingBonus);
        const law = lawSourceFor(side, "openingSkillPower", "opening-break");
        pushEvent("law", `${state.actorName}趁${state.targetName}气势未稳，以「${law.name}」强化首次术法`, { actorSide: side, targetSide, lawId: law.id, lawName: law.name, leftHp, rightHp, leftMana, rightMana });
      }
    }
    if (companionSkillBoost[side] > 0) {
      skill = boostSkill(skill, companionSkillBoost[side]);
      companionSkillBoost[side] = 0;
      const law = lawSourceFor(side, "companionSkillPower", "twin-array");
      pushEvent("law", `${state.actorName}借「${law.name}」强化本次术法`, { actorSide: side, targetSide, lawId: law.id, lawName: law.name, leftHp, rightHp, leftMana, rightMana });
    }
    if (skill.type !== "heal") {
      healStreak[side] = 0;
      healBoostReady[side] = false;
    }
    const dotStack = Math.max(0, Number(trialBuffs[side].dotStack) || 0);
    if (dotStack && ["dot", "dotStrike"].includes(skill.type) && statusStacks[side] > 0) {
      skill = { ...skill, percent: Number(skill.percent || 0) * (1 + dotStack * statusStacks[side]) };
    }
    actionCounts[side].skills += 1;
    const freeEvery = Math.max(0, Math.floor(Number(trialBuffs[side].freeSkillEvery) || 0));
    const freeMechanic = mechanicsFor(side, "beforeSkill", "freeCast").find((entry) => {
      const every = Math.max(1, Math.floor(Number(entry.params.every) || 99));
      return actionCounts[side].skills % every === 0;
    });
    const bloodMechanic = mechanicsFor(side, "beforeSkill", "bloodCast").find((entry) => state.mana < skill.cost);
    const free = Boolean(freeMechanic || freeEvery && actionCounts[side].skills % freeEvery === 0);
    if (bloodMechanic && !free) {
      const hpCost = Math.min(Math.max(0, state.hp - 1), Math.floor(state.actor.maxHp * Math.max(0, Number(bloodMechanic.params.hpCost) || 0)));
      setHp(side, state.hp - hpCost);
      skill = boostSkill(skill, Math.max(0, Number(bloodMechanic.params.power) || 0));
      pushLawEvent(side, bloodMechanic, `燃烧 ${hpCost} 气血强行施法`, { damage: hpCost });
    }
    setMana(side, state.mana - (free || bloodMechanic ? 0 : skill.cost));
    if (free) {
      if (freeMechanic) pushLawEvent(side, freeMechanic, "本次施法未消耗法力");
      else {
        const law = lawSourceFor(side, "freeSkillEvery", "mana-loop");
        pushEvent("law", `${state.actorName}引动「${law.name}」，本次施法未消耗法力`, { actorSide: side, lawId: law.id, lawName: law.name, leftHp, rightHp, leftMana, rightMana });
      }
    }
    cooldowns[side] = skill.cooldown;
    let total = 0;

    if (skill.type === "double") {
      total += applyStrike(side, skill.power);
      if ((targetSide === "left" ? leftHp : rightHp) > 0) total += applyStrike(side, skill.power);
      pushEvent("skill", `${state.actorName}施展${skill.name}，双击共造成 ${total} 伤害`, { actorSide: side, targetSide, skill: skill.name, damage: total, leftHp, rightHp, leftMana, rightMana });
      return total;
    }
    if (skill.type === "multi") {
      for (let hit = 0; hit < skill.hits && (targetSide === "left" ? leftHp : rightHp) > 0; hit += 1) total += applyStrike(side, skill.power);
      pushEvent("skill", `${state.actorName}催动${skill.name}，连斩共造成 ${total} 伤害`, { actorSide: side, targetSide, skill: skill.name, damage: total, leftHp, rightHp, leftMana, rightMana });
      return total;
    }
    if (["pierce", "heavy", "speedStrike", "manaBurn", "weaken", "execute", "lifesteal", "dotStrike", "stun"].includes(skill.type)) {
      const multiplier = skill.type === "execute" && state.targetHp / state.target.maxHp <= skill.threshold ? skill.power + skill.bonus : skill.power;
      const damage = applyStrike(side, multiplier, { pierce: skill.pierce || 0 });
      total += damage;
      if (skill.type === "manaBurn") setMana(targetSide, state.targetMana - skill.burn);
      if (skill.type === "weaken") addEffect(targetSide, { type: "attackDown", amount: skill.amount, duration: skill.duration });
      if (skill.type === "dotStrike") {
        addEffect(targetSide, { type: "dot", name: skill.name, percent: skill.percent, duration: skill.duration, sourceSide: side });
        if (dotStack) {
          statusStacks[side] += 1;
          const law = lawSourceFor(side, "dotStack", "poison-formation");
          pushEvent("law", `${state.actorName}借「${law.name}」令持续伤势叠至 ${statusStacks[side]} 层`, { actorSide: side, targetSide, lawId: law.id, lawName: law.name, leftHp, rightHp, leftMana, rightMana });
        }
        triggerLawMechanics("afterStatus", side, { targetSide });
      }
      if (skill.type === "stun") addEffect(targetSide, { type: "stun", duration: skill.duration });
      if (skill.type === "speedStrike") addEffect(side, { type: "evasion", chance: skill.extraDodge, duration: skill.duration });
      if (skill.type === "lifesteal" && damage > 0) setHp(side, state.hp + Math.floor(damage * skill.leech));
      pushEvent("skill", `${state.actorName}施展${skill.name}，造成 ${damage} 伤害`, { actorSide: side, targetSide, skill: skill.name, damage, leftHp, rightHp, leftMana, rightMana });
      return total;
    }
    if (skill.type === "dodge") {
      addEffect(side, { type: "dodgeNext", duration: skill.duration });
      pushEvent("skill", `${state.actorName}施展${skill.name}，准备闪避下一击`, { actorSide: side, targetSide, skill: skill.name, leftHp, rightHp, leftMana, rightMana });
      return 0;
    }
    if (skill.type === "dot") {
      addEffect(targetSide, { type: "dot", name: skill.name, percent: skill.percent, duration: skill.duration, sourceSide: side });
      if (dotStack) {
        statusStacks[side] += 1;
        const law = lawSourceFor(side, "dotStack", "poison-formation");
        pushEvent("law", `${state.actorName}借「${law.name}」令持续伤势叠至 ${statusStacks[side]} 层`, { actorSide: side, targetSide, lawId: law.id, lawName: law.name, leftHp, rightHp, leftMana, rightMana });
      }
      triggerLawMechanics("afterStatus", side, { targetSide });
      pushEvent("skill", `${state.actorName}放出${skill.name}，${state.targetName}陷入持续伤害`, { actorSide: side, targetSide, skill: skill.name, leftHp, rightHp, leftMana, rightMana });
      return 0;
    }
    if (skill.type === "shield") {
      addEffect(side, { type: "shield", reduce: skill.reduce, duration: skill.duration });
      pushEvent("skill", `${state.actorName}施展${skill.name}，伤害减免提升`, { actorSide: side, targetSide, skill: skill.name, leftHp, rightHp, leftMana, rightMana });
      return 0;
    }
    if (skill.type === "defenseBuff") {
      addEffect(side, { type: "defenseUp", amount: skill.amount, duration: skill.duration });
      pushEvent("skill", `${state.actorName}施展${skill.name}，防御暂时提高`, { actorSide: side, targetSide, skill: skill.name, leftHp, rightHp, leftMana, rightMana });
      return 0;
    }
    if (skill.type === "heal") {
      let heal = Math.floor(state.actor.maxHp * skill.percent);
      const lowHpHealingPenalty = lawMechanics[side]
        .filter((entry) => entry.action === "lowHpEcho" && state.hp / Math.max(1, state.actor.maxHp) <= Number(entry.params.threshold || 0))
        .reduce((sum, entry) => Math.max(sum, Number(entry.params.healingPenalty) || 0), 0);
      heal = Math.floor(heal * (1 - clamp(lowHpHealingPenalty, 0, 0.8)));
      const healBoost = Math.max(0, Number(trialBuffs[side].healCountBoost) || 0);
      if (healBoostReady[side] && healBoost) {
        heal = Math.floor(heal * (1 + healBoost));
        healBoostReady[side] = false;
        healStreak[side] = 0;
        const law = lawSourceFor(side, "healCountBoost", "endless-life");
        pushEvent("law", `${state.actorName}引动「${law.name}」，本次治疗提高`, { actorSide: side, lawId: law.id, lawName: law.name, leftHp, rightHp, leftMana, rightMana });
      } else {
        healStreak[side] += 1;
        if (healStreak[side] >= 2 && healBoost) healBoostReady[side] = true;
      }
      const overflow = Math.max(0, state.hp + heal - state.actor.maxHp);
      setHp(side, state.hp + heal);
      const actualHealing = Math.max(0, sideState(side).hp - state.hp);
      const overhealShield = Math.max(0, Number(trialBuffs[side].overhealShield) || 0);
      const shields = Math.floor(overflow * overhealShield);
      if (shields > 0) {
        addEffect(side, { type: "shield", reduce: clamp(shields / Math.max(1, state.actor.maxHp), 0.03, 0.25), duration: 2 });
        const law = lawSourceFor(side, "overhealShield", "overheal-shield");
        pushEvent("law", `${state.actorName}借「${law.name}」将溢出治疗化为 ${shields} 点护势`, { actorSide: side, lawId: law.id, lawName: law.name, shields, leftHp, rightHp, leftMana, rightMana });
      }
      pushEvent("skill", `${state.actorName}运转${skill.name}，恢复 ${actualHealing} 血量`, { actorSide: side, targetSide, skill: skill.name, healing: actualHealing, leftHp, rightHp, leftMana, rightMana });
      triggerLawMechanics("afterHeal", side, { healing: actualHealing, targetSide });
      return 0;
    }
    if (skill.type === "evasionBuff") {
      addEffect(side, { type: "evasion", chance: skill.chance, duration: skill.duration });
      pushEvent("skill", `${state.actorName}施展${skill.name}，身法更难捉摸`, { actorSide: side, targetSide, skill: skill.name, leftHp, rightHp, leftMana, rightMana });
      return 0;
    }
    if (skill.type === "reflect") {
      addEffect(side, { type: "reflect", reflect: skill.reflect, duration: skill.duration });
      pushEvent("skill", `${state.actorName}施展${skill.name}，准备反弹伤害`, { actorSide: side, targetSide, skill: skill.name, leftHp, rightHp, leftMana, rightMana });
      return 0;
    }
    if (skill.type === "field") {
      addEffect(side, { type: "shield", reduce: skill.reduce, duration: skill.duration });
      addEffect(targetSide, { type: "defenseDown", amount: skill.amount, duration: skill.duration });
      pushEvent("skill", `${state.actorName}布下${skill.name}，阵势压制对手`, { actorSide: side, targetSide, skill: skill.name, leftHp, rightHp, leftMana, rightMana });
    }
    return 0;
  };

  function triggerLawMechanics(event, side, payload = {}) {
    for (const entry of mechanicsFor(side, event)) {
      const runtime = runtimeFor(side, entry);
      const params = entry.params || {};
      const targetSide = payload.targetSide || opposite(side);
      const actor = sideState(side);
      if (entry.action === "attackEcho" && event === "afterAttack") {
        runtime.count += 1;
        const every = Math.max(1, Math.floor(Number(params.every) || 3));
        if (runtime.count % every === 0 && sideState(targetSide).hp > 0) {
          const damage = applyStrike(side, Math.max(0, Number(params.power) || 0));
          runtime.nextSkillPower = Math.max(runtime.nextSkillPower || 0, Number(params.nextSkillPower) || 0);
          pushLawEvent(side, entry, `剑阵追击造成 ${damage} 伤害`, { targetSide, damage });
        }
      } else if (entry.action === "openingSurge" && event === "afterSkill" && !runtime.used && payload.damage > 0 && actor.targetHp / Math.max(1, actor.target.maxHp) >= Number(params.targetAbove || 0)) {
        runtime.used = true;
        const damage = applyStrike(side, Math.max(0, Number(params.power) || 0), { pierce: 0.5 });
        pushLawEvent(side, entry, `破界追击造成 ${damage} 伤害`, { targetSide, damage });
      } else if (entry.action === "executeStrike" && ["afterAttack", "afterSkill"].includes(event) && sideState(targetSide).hp > 0) {
        if (runtime.lastRound === currentRound && params.oncePerRound) continue;
        if (sideState(targetSide).hp / Math.max(1, sideState(targetSide).actor.maxHp) <= Number(params.threshold || 0)) {
          runtime.lastRound = currentRound;
          const damage = applyStrike(side, Math.max(0, Number(params.power) || 0));
          pushLawEvent(side, entry, `追魂斩造成 ${damage} 伤害`, { targetSide, damage });
        }
      } else if (entry.action === "repeatSkill" && event === "afterSkill" && payload.damage > 0) {
        runtime.count += 1;
        if (runtime.count % Math.max(1, Math.floor(Number(params.every) || 3)) === 0 && sideState(targetSide).hp > 0) {
          const damage = applyStrike(side, Math.max(0, Number(params.power) || 0));
          pushLawEvent(side, entry, `复制术法造成 ${damage} 伤害`, { targetSide, damage });
        }
      } else if (entry.action === "cooldownFlow" && event === "afterAttack") {
        runtime.count += 1;
        if (runtime.count % Math.max(1, Math.floor(Number(params.every) || 2)) === 0) {
          cooldowns[side] = Math.max(0, cooldowns[side] - Math.max(1, Math.floor(Number(params.cooldown) || 1)));
          const mana = Math.floor(actor.actor.maxMana * Math.max(0, Number(params.mana) || 0));
          setMana(side, actor.mana + mana);
          pushLawEvent(side, entry, `推动技能周天并恢复 ${mana} 法力`, { mana });
        }
      } else if (entry.action === "manaTide" && event === "afterSkill" && payload.skill) {
        const mana = Math.floor(actor.actor.maxMana * Math.max(0, Number(params.refund) || 0));
        setMana(side, actor.mana + mana);
        if (payload.damage > 0 && sideState(targetSide).hp > 0) {
          const damage = applyStrike(side, Math.max(0, Number(params.power) || 0));
          pushLawEvent(side, entry, `灵潮冲击造成 ${damage} 伤害并返还 ${mana} 法力`, { targetSide, damage, mana });
        }
      } else if (entry.action === "freeCast" && event === "afterSkill") {
        const echoEvery = Math.floor(Number(params.echoEvery) || 0);
        if (echoEvery > 0 && actionCounts[side].skills % echoEvery === 0 && payload.damage > 0 && sideState(targetSide).hp > 0) {
          const damage = applyStrike(side, Math.max(0, Number(params.echoPower) || 0));
          pushLawEvent(side, entry, `周天余波造成 ${damage} 伤害`, { targetSide, damage });
        }
      } else if (entry.action === "damageStore") {
        if (event === "onDamageTaken" && payload.damage > 0) runtime.stored = Math.min(Math.floor(maxHpOf(side) * Number(params.capHp || 0.2)), runtime.stored + Math.floor(payload.damage * Number(params.ratio || 0)));
        if (event === "afterAttack" && runtime.stored > 0 && sideState(targetSide).hp > 0) {
          const damage = Math.min(sideState(targetSide).hp, runtime.stored);
          setHp(targetSide, sideState(targetSide).hp - damage);
          runtime.stored = 0;
          pushLawEvent(side, entry, `释放储伤造成 ${damage} 伤害`, { targetSide, damage });
        }
      } else if (entry.action === "noHitCounter" && event === "roundStart" && (currentRound === 1 || !payload.wasDamaged)) {
        addEffect(side, { type: "shield", reduce: clamp(Number(params.reduction) || 0, 0, 0.35), duration: 1 });
        runtime.counterReady = Math.max(0, Number(params.counterPower) || 0);
        pushLawEvent(side, entry, "展开无隙玄甲");
      } else if (entry.action === "damageReflect" && event === "onDamageTaken" && payload.damage > 0) {
        const lowHp = sideState(side).hp / Math.max(1, sideState(side).actor.maxHp) <= 0.5;
        const ratio = Number(params.ratio || 0) * (lowHp ? Number(params.lowHpMultiplier || 1) : 1);
        const damage = Math.max(1, Math.floor(payload.damage * ratio));
        setHp(payload.sourceSide, sideState(payload.sourceSide).hp - damage);
        pushLawEvent(side, entry, `反照 ${damage} 伤害`, { targetSide: payload.sourceSide, damage });
      } else if (entry.action === "lifesteal" && event === "afterDamage" && payload.damage > 0) {
        const before = sideState(side).hp;
        const healing = Math.floor(payload.damage * Math.max(0, Number(params.ratio) || 0));
        const overflow = Math.max(0, before + healing - maxHpOf(side));
        setHp(side, before + healing);
        if (overflow > 0 && Number(params.overhealShield) > 0) addEffect(side, { type: "shield", reduce: clamp(overflow * Number(params.overhealShield) / maxHpOf(side), 0.03, 0.25), duration: 2 });
        if (healing > 0) pushLawEvent(side, entry, `汲取 ${Math.min(healing, maxHpOf(side) - before)} 气血`, { healing });
      } else if (entry.action === "roundRegen" && event === "roundStart") {
        const rate = Number(params.heal || 0) * (payload.wasDamaged ? 1 : 1 + Number(params.noHitBonus || 0));
        const healing = Math.floor(maxHpOf(side) * rate);
        const before = sideState(side).hp;
        setHp(side, before + healing);
        if (sideState(side).hp > before) pushLawEvent(side, entry, `恢复 ${sideState(side).hp - before} 气血`, { healing: sideState(side).hp - before });
      } else if (entry.action === "healStrike" && event === "afterHeal" && payload.healing > 0 && sideState(targetSide).hp > 0) {
        const damage = Math.max(1, Math.floor(payload.healing * Number(params.ratio || 0)));
        setHp(targetSide, sideState(targetSide).hp - damage);
        runtime.nextSkillPower = Math.max(runtime.nextSkillPower || 0, Number(params.nextSkillPower) || 0);
        pushLawEvent(side, entry, `逆转治疗造成 ${damage} 伤害`, { targetSide, damage });
      } else if (entry.action === "lowHpEcho" && event === "afterSkill" && payload.damage > 0 && actor.hp / Math.max(1, actor.actor.maxHp) <= Number(params.threshold || 0) && sideState(targetSide).hp > 0) {
        const damage = applyStrike(side, Math.max(0, Number(params.power) || 0));
        pushLawEvent(side, entry, `绝境回响造成 ${damage} 伤害`, { targetSide, damage });
      } else if (entry.action === "adversityGrowth") {
        if (event === "onDamageTaken" && payload.damage > 0) runtime.stacks = Math.min(Math.floor(Number(params.cap) || 5), runtime.stacks + 1);
        if (["afterAttack", "afterSkill"].includes(event) && runtime.stacks > 0 && payload.damage > 0 && sideState(targetSide).hp > 0) {
          const damage = applyStrike(side, Math.max(0, Number(params.gain) || 0) * runtime.stacks);
          pushLawEvent(side, entry, `${runtime.stacks} 层劫意追加 ${damage} 伤害`, { targetSide, damage, mechanicStacks: runtime.stacks });
        }
      } else if (entry.action === "companionSkillEcho" && event === "afterCompanion" && trialCompanion && !runtime.disabled) {
        runtime.count += 1;
        runtime.nextSkillPower = Math.max(runtime.nextSkillPower || 0, Number(params.nextSkillPower) || 0);
        if (runtime.count % Math.max(1, Math.floor(Number(params.every) || 3)) === 0 && sideState("right").hp > 0) {
          const damage = applyStrike(side, Math.max(0, Number(params.power) || 0));
          pushLawEvent(side, entry, `同行共鸣追加 ${damage} 伤害`, { targetSide: "right", damage });
        }
      } else if (entry.action === "companionFollowup" && event === "afterSkill" && trialCompanion && !runtime.disabled && payload.damage > 0) {
        runtime.cooldown = Math.max(0, runtime.cooldown - 1);
        if (runtime.cooldown <= 0 && sideState(targetSide).hp > 0) {
          const damage = applyStrike(side, Math.max(0, Number(params.power) || 0));
          runtime.cooldown = Math.max(1, Math.floor(Number(params.cooldown) || 4));
          pushLawEvent(side, entry, `同行破阵追加 ${damage} 伤害`, { targetSide, damage });
        }
      } else if (entry.action === "soloEcho" && ["afterAttack", "afterSkill"].includes(event) && !trialCompanion && payload.damage > 0) {
        runtime.count += 1;
        if (runtime.count % Math.max(1, Math.floor(Number(params.every) || 4)) === 0 && sideState(targetSide).hp > 0) {
          const damage = applyStrike(side, Math.max(0, Number(params.power) || 0));
          pushLawEvent(side, entry, `独行道影复制行动，造成 ${damage} 伤害`, { targetSide, damage });
        }
      } else if (entry.action === "elementCycle" && event === "roundStart") {
        const phase = (currentRound - 1) % 5;
        if ([0, 3].includes(phase) && sideState(targetSide).hp > 0) {
          const damage = applyStrike(side, Math.max(0, Number(params.power) || 0));
          pushLawEvent(side, entry, `${phase === 0 ? "金行" : "火行"}轮转造成 ${damage} 伤害`, { targetSide, damage });
        } else if (phase === 1) {
          const healing = Math.floor(maxHpOf(side) * Number(params.healing || 0));
          setHp(side, actor.hp + healing);
          pushLawEvent(side, entry, `木行轮转恢复 ${healing} 气血`, { healing });
        } else if (phase === 2) {
          const mana = Math.floor(actor.actor.maxMana * Number(params.healing || 0));
          setMana(side, actor.mana + mana);
          pushLawEvent(side, entry, `水行轮转恢复 ${mana} 法力`, { mana });
        } else addEffect(side, { type: "shield", reduce: clamp(Number(params.power) || 0, 0.05, 0.3), duration: 1 });
      } else if (entry.action === "statusDetonate" && event === "afterStatus") {
        runtime.count += 1;
        if (runtime.count % Math.max(1, Math.floor(Number(params.every) || 3)) === 0 && sideState(targetSide).hp > 0) {
          const damage = applyStrike(side, Math.max(0, Number(params.power) || 0));
          pushLawEvent(side, entry, `熔炼异常造成 ${damage} 伤害`, { targetSide, damage });
        }
      } else if (entry.action === "elementPulse" && event === "roundStart" && currentRound % Math.max(1, Math.floor(Number(params.every) || 3)) === 0 && sideState(targetSide).hp > 0) {
        const damage = applyStrike(side, Math.max(0, Number(params.power) || 0));
        pushLawEvent(side, entry, `降下天劫造成 ${damage} 伤害`, { targetSide, damage });
      }
    }
    if (event === "onDamageTaken" && payload.damage > 0) {
      for (const entry of lawMechanics[side].filter((item) => item.action === "noHitCounter")) {
        const runtime = runtimeFor(side, entry);
        if (runtime.counterReady > 0 && payload.sourceSide) {
          const damage = Math.max(1, Math.floor(sideState(side).actor.attack * runtime.counterReady));
          setHp(payload.sourceSide, sideState(payload.sourceSide).hp - damage);
          runtime.counterReady = 0;
          pushLawEvent(side, entry, `玄甲反击造成 ${damage} 伤害`, { targetSide: payload.sourceSide, damage });
        }
      }
    }
  }

  for (const side of ["left", "right"]) {
    for (const entry of mechanicsFor(side, "battleStart")) {
      const runtime = runtimeFor(side, entry);
      if (entry.action === "battleWager") {
        const hpCost = Math.min(Math.max(0, sideState(side).hp - 1), Math.floor(maxHpOf(side) * Number(entry.params.hpCost || 0)));
        setHp(side, sideState(side).hp - hpCost);
        runtime.active = true;
        pushLawEvent(side, entry, `献祭 ${hpCost} 气血换取威能`, { damage: hpCost });
      } else if (entry.action === "rootReversal" && (side === "left" ? leftBasePenalty : rightBasePenalty) > 0) {
        runtime.active = true;
        pushLawEvent(side, entry, "将灵根克制逆转为自身增益");
      }
    }
  }

  for (let round = 1; round <= maxRounds && leftHp > 0 && rightHp > 0; round += 1) {
    currentRound = round;
    pushEvent("round", `第 ${round} 回合`, { leftHp, rightHp, leftMana, rightMana });
    const previousRoundDamage = { ...roundDamageTaken };
    roundDamageTaken.left = false;
    roundDamageTaken.right = false;
    tickEffects("left");
    tickEffects("right");
    if (leftHp <= 0 || rightHp <= 0) break;
    triggerLawMechanics("roundStart", "left", { wasDamaged: previousRoundDamage.left, targetSide: "right" });
    triggerLawMechanics("roundStart", "right", { wasDamaged: previousRoundDamage.right, targetSide: "left" });
    if (leftHp <= 0 || rightHp <= 0) break;
    for (const side of ["left", "right"]) {
      const guard = Math.max(0, Number(trialBuffs[side].noHitShield) || 0);
      if (guard && (round === 1 || !previousRoundDamage[side])) {
        addEffect(side, { type: "shield", reduce: guard, duration: 1 });
        const state = sideState(side);
        const law = lawSourceFor(side, "noHitShield", "steady-heart");
        pushEvent("law", `${state.actorName}引动「${law.name}」，获得短暂减伤`, { actorSide: side, lawId: law.id, lawName: law.name, leftHp, rightHp, leftMana, rightMana });
      }
    }

    if (trialCompanion && (round === 1 || (round - 1) % Math.max(2, Number(trialCompanion.interval) || 4) === 0)) {
      companionContribution.assists += 1;
      if (trialCompanion.type === "assault") {
        const damage = Math.max(1, Math.min(rightHp, Number(trialCompanion.damage) || 1));
        rightHp = Math.max(0, rightHp - damage);
        companionContribution.damage += damage;
        pushEvent("companion", `${trialCompanion.name}觑得破绽出手，造成 ${damage} 伤害`, { actorSide: "companion", targetSide: "right", damage, leftHp, rightHp, leftMana, rightMana });
      } else {
        const healing = Math.max(0, Math.min(a.maxHp - leftHp, Number(trialCompanion.healing) || 0));
        leftHp = clamp(leftHp + healing, 0, a.maxHp);
        const shields = Math.max(1, Number(trialCompanion.shields) || 1);
        addEffect("left", { type: "shield", reduce: clamp(shields / Math.max(1, a.maxHp), 0.04, 0.16), duration: 2 });
        companionContribution.healing += healing;
        companionContribution.shields += shields;
        companionContribution.control += 1;
        pushEvent("companion", `${trialCompanion.name}护脉同行，恢复 ${healing} 气血并展开护势`, { actorSide: "companion", targetSide: "left", healing, shields, leftHp, rightHp, leftMana, rightMana });
      }
      companionSkillBoost.left = Math.max(companionSkillBoost.left, Math.max(0, Number(trialBuffs.left.companionSkillPower) || 0));
      triggerLawMechanics("afterCompanion", "left", { targetSide: "right" });
      if (leftHp <= 0 || rightHp <= 0) break;
    }

    for (const side of order) {
      const targetSide = opposite(side);
      const state = sideState(side);
      if (state.targetHp <= 0 || state.hp <= 0) break;

      if (consumeEffect(side, "stun")) {
        pushEvent("status", `${state.actorName}被压制，错过一次行动`, { actorSide: side, leftHp, rightHp, leftMana, rightMana });
        continue;
      }

      const skill = skills[side];
      const freeEvery = Math.max(0, Math.floor(Number(trialBuffs[side].freeSkillEvery) || 0));
      const nextSkillFreeByMechanic = mechanicsFor(side, "beforeSkill", "freeCast").some((entry) => (actionCounts[side].skills + 1) % Math.max(1, Math.floor(Number(entry.params.every) || 99)) === 0);
      const canBloodCast = mechanicsFor(side, "beforeSkill", "bloodCast").length > 0 && state.hp > Math.floor(state.actor.maxHp * 0.1);
      const nextSkillFree = Boolean(nextSkillFreeByMechanic || freeEvery && (actionCounts[side].skills + 1) % freeEvery === 0);
      if (skill && (state.mana >= skill.cost || nextSkillFree || canBloodCast) && cooldowns[side] <= 0 && shouldUseCombatSkill({
        skill,
        actor: { ...state.actor, hp: state.hp, mana: state.mana },
        target: { ...state.target, hp: state.targetHp, mana: state.targetMana },
        actorEffects: effects[side],
        targetEffects: effects[targetSide]
      })) {
        const skillDamage = castSkill(side, skill);
        triggerLawMechanics("afterSkill", side, { damage: skillDamage, targetSide, skill });
        const echoChance = clamp(Number(trialBuffs[side].skillEchoChance) || 0, 0, 1);
        if (skillDamage > 0 && sideState(targetSide).hp > 0 && echoChance && random() < echoChance) {
          const echoPower = Math.max(0, Number(trialBuffs[side].skillEchoPower) || 0);
          const echo = applyStrike(side, echoPower);
          const law = lawSourceFor(side, "skillEchoChance", "spell-echo");
          pushEvent("law", `${state.actorName}引动「${law.name}」，追加 ${echo} 伤害`, { actorSide: side, targetSide, lawId: law.id, lawName: law.name, damage: echo, leftHp, rightHp, leftMana, rightMana });
        }
      } else {
        const damage = applyStrike(side, 1, { basic: true });
        pushEvent("attack", `${state.actorName}出手造成 ${damage} 伤害`, { actorSide: side, targetSide, damage, leftHp, rightHp, leftMana, rightMana });
        triggerLawMechanics("afterAttack", side, { damage, targetSide });
      }
      if (leftHp <= 0 || rightHp <= 0) break;
    }
    cooldowns.left = Math.max(0, cooldowns.left - 1);
    cooldowns.right = Math.max(0, cooldowns.right - 1);
  }

  const winner = leftHp >= rightHp ? "left" : "right";
  const loser = winner === "left" ? "right" : "left";
  if (leftHp > 0 && rightHp > 0) {
    setHp(loser, 0);
    pushEvent("finish", `${winner === "left" ? left.name : right.name}战至终局，以残余气血压过${loser === "left" ? left.name : right.name}`, {
      actorSide: winner,
      targetSide: loser,
      leftHp,
      rightHp,
      leftMana,
      rightMana
    });
  }

  return {
    winner,
    leftStart: a,
    rightStart: b,
    leftHp,
    rightHp,
    leftMana,
    rightMana,
    events,
    companionContribution
  };
}

export function realmInfo(realm) {
  const safeRealm = clamp(Math.floor(realm || 0), 0, realms.length - 1);
  return {
    index: safeRealm,
    name: realms[safeRealm],
    stage: realmStages[Math.floor(safeRealm / 10)],
    level: (safeRealm % 10) + 1,
    isMajorBreakthrough: safeRealm % 10 === 9,
    xpNeed: xpNeed(safeRealm),
    baseBreakChance: baseBreakthroughChance(safeRealm)
  };
}

export function baseBreakthroughChance(realm) {
  const lateMajorChance = lateMajorBreakthroughChance(realm);
  if (lateMajorChance !== null) return lateMajorChance;

  const info = {
    stageIndex: Math.floor((realm || 0) / 10),
    level: ((realm || 0) % 10) + 1
  };
  const levelPenalty = (info.level - 1) * 0.028;
  const stagePenalty = info.stageIndex * 0.068;
  const bottleneckPenalty = info.level === 10 ? 0.3 + info.stageIndex * 0.045 : 0;
  if (info.stageIndex === 1 && info.level === 10) return 0.1;
  if (info.stageIndex === 2 && info.level === 10) return 0.06;
  return clamp(0.72 - levelPenalty - stagePenalty - bottleneckPenalty, minimumBreakthroughChance(realm), 0.82);
}

function lateMajorBreakthroughChance(realm) {
  const safeRealm = clamp(Math.floor(realm || 0), 0, realms.length - 1);
  if (safeRealm % 10 !== 9 || safeRealm + 1 >= realms.length) return null;
  const targetStageIndex = Math.floor((safeRealm + 1) / 10);
  if (targetStageIndex < 4) return null;
  return Math.max(0.01, 0.02 / Math.pow(2, targetStageIndex - 4));
}

function minimumBreakthroughChance(realm) {
  if (lateMajorBreakthroughChance(realm) !== null) return 0.01;
  return Math.floor((realm || 0) / 10) >= 8 ? 0.01 : 0.035;
}

function rootBreakthroughChanceMultiplier(entity) {
  const waterBonus = normalizeRootSet(entity).roots
    .filter((root) => root.effect === "xp")
    .reduce((sum, root) => sum + ((root.breakMultiplier || 1.1) - 1) / rootCount(entity), 0);
  return (1 + waterBonus) * rootBreakthroughMultiplier(entity);
}

export function breakthroughChance(entity) {
  const base = baseBreakthroughChance(entity.realm || 0);
  return clamp(
    base * rootBreakthroughChanceMultiplier(entity) * talentSnapshot(entity).breakthroughMultiplier,
    minimumBreakthroughChance(entity.realm || 0),
    0.82
  );
}

export function buildRealmProgression(entity) {
  return realms.map((name, index) => {
    const info = realmInfo(index);
    const growthRange = index < realms.length - 1 ? breakthroughGrowthRange(index) : null;
    return {
      ...info,
      name,
      nextRealm: realms[index + 1] || "已至当前版本尽头",
      growthRange,
      growthText: growthRange ? growthRangeText(growthRange) : "已至当前版本尽头",
      adjustedBreakChance: entity ? breakthroughChance({ ...entity, realm: index }) : info.baseBreakChance
    };
  });
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function potentialRealmFor(entity = {}) {
  const configured = Number(entity.potentialRealm);
  if (Number.isFinite(configured)) return clamp(Math.floor(configured), 0, realms.length - 1);
  if (Number.isFinite(canonicalPotentialRealms[entity.name])) {
    return clamp(canonicalPotentialRealms[entity.name], 0, realms.length - 1);
  }
  if (entity.id === "player") return defaultPlayerPotentialRealm;
  const currentRealm = clamp(Math.floor(Number(entity.realm) || 0), 0, realms.length - 1);
  return clamp(Math.max(9, currentRealm + 12), 0, realms.length - 1);
}

function talentScoreRange(potentialRealm) {
  const stage = clamp(Math.floor(potentialRealm / 10), 0, talentScoreRanges.length - 1);
  return talentScoreRanges[stage];
}

function talentGrade(score) {
  if (score >= 92) return "道种";
  if (score >= 80) return "天灵";
  if (score >= 65) return "天骄";
  if (score >= 45) return "上品";
  if (score >= 25) return "良才";
  return "凡才";
}

function talentXpMultiplier(score) {
  return 0.92 + clamp(Number(score) || 0, 1, 100) * 0.0028;
}

function talentBreakthroughMultiplier(score) {
  return 0.94 + clamp(Number(score) || 0, 1, 100) * 0.0015;
}

function rollTalentScore(entity, rebirth = 1) {
  const potentialRealm = potentialRealmFor(entity);
  const [min, max] = talentScoreRange(potentialRealm);
  const seed = `talent|${entity.id || entity.name || "cultivator"}|${entity.name || ""}|${rebirth}|${potentialRealm}|${talentVersion}`;
  return Math.min(max, min + Math.floor(stableUnit(seed) * (max - min + 1)));
}

function createTalent(entity, { rebirth = 1, score, overridden = false } = {}) {
  const potentialRealm = potentialRealmFor(entity);
  const safeScore = clamp(Math.floor(Number(score) || rollTalentScore({ ...entity, potentialRealm }, rebirth)), 1, 100);
  return {
    version: talentVersion,
    score: safeScore,
    grade: talentGrade(safeScore),
    xpMultiplier: talentXpMultiplier(safeScore),
    breakthroughMultiplier: talentBreakthroughMultiplier(safeScore),
    rebirth: Math.max(1, Math.floor(Number(rebirth) || 1)),
    overridden: Boolean(overridden)
  };
}

function ensureTalent(entity, options = {}) {
  if (!entity) return false;
  let changed = false;
  const expectedRealm = potentialRealmFor(entity);
  if (entity.potentialRealm !== expectedRealm) {
    entity.potentialRealm = expectedRealm;
    changed = true;
  }
  if (!entity.potentialSource) {
    entity.potentialSource = Number.isFinite(canonicalPotentialRealms[entity.name]) ? "lore" : "generated";
    changed = true;
  }
  if (entity.talentOverride !== undefined && entity.talentOverride !== null) {
    const override = clamp(Math.floor(Number(entity.talentOverride) || 1), 1, 100);
    if (entity.talentOverride !== override) {
      entity.talentOverride = override;
      changed = true;
    }
  }
  const existing = entity.talent;
  const shouldReroll = Boolean(options.reroll);
  const hasValidTalent = existing
    && Number.isFinite(Number(existing.score))
    && Number(existing.version) === talentVersion;
  if (shouldReroll || !hasValidTalent) {
    entity.talent = createTalent(entity, {
      rebirth: options.rebirth || existing?.rebirth || 1,
      score: entity.talentOverride,
      overridden: entity.talentOverride !== undefined && entity.talentOverride !== null
    });
    return true;
  }
  const normalized = createTalent(entity, {
    rebirth: existing.rebirth || 1,
    score: entity.talentOverride ?? existing.score,
    overridden: entity.talentOverride !== undefined && entity.talentOverride !== null
  });
  if (JSON.stringify(existing) !== JSON.stringify(normalized)) {
    entity.talent = normalized;
    changed = true;
  }
  return changed;
}

function talentSnapshot(entity) {
  const talent = entity?.talent || createTalent(entity || {});
  return {
    score: talent.score,
    grade: talent.grade,
    xpMultiplier: talent.xpMultiplier,
    breakthroughMultiplier: talent.breakthroughMultiplier,
    rebirth: talent.rebirth,
    overridden: Boolean(talent.overridden),
    potentialRealm: potentialRealmFor(entity || {}),
    potentialRealmName: realms[potentialRealmFor(entity || {})] || realms[0],
    potentialSource: entity?.potentialSource || "generated"
  };
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function ensureField(object, key, value) {
  if (object[key] === undefined || object[key] === null) {
    object[key] = typeof value === "function" ? value() : value;
    return true;
  }
  return false;
}

const equipmentSlotMap = Object.fromEntries(equipmentSlots.map((slot) => [slot.id, slot]));
const equipmentTierMap = Object.fromEntries(equipmentTiers.map((tier) => [tier.id, tier]));
const equipmentCatalogMap = Object.fromEntries(equipmentCatalog.map((item) => [item.id, item]));
const spiritPearlMap = Object.fromEntries(spiritPearls.map((pearl) => [pearl.id, pearl]));
const equipmentVersion = 3;
const dungeonRecordVersion = 4;
const storageCompactionVersion = 1;
const battleArchiveVersion = 1;
const spiritPearlVersion = 3;
const spiritDustExchangeCost = 10;
const starSeaTeamSize = 10;
const starSeaCycleLength = 10;
const starSeaCycleHistoryLimit = 10;
const starSeaMaxRounds = 100;
const replicaDropChanceMultiplier = 1.3;
// Daily auctions stay uncommon so the 10-day finale remains the primary reward.
const starSeaDailyDropChance = 0.03;
const starSeaCycleDropChance = 0.5;
const dungeonTierNames = ["血色外谷", "石殿甬道", "熔岩石窟", "玄冰洞府", "坠魔裂谷", "虚天残境", "乱星海深渊", "昆吾灵山", "真灵天门"];
const monsterNamesByStage = [
  ["赤火蟾", "碧水猿", "金背妖狼", "青木蜈蚣"],
  ["黑煞虎", "铁羽鹰", "紫纹妖蟒", "岩甲犀"],
  ["血玉蜈蚣", "玄冰蝎王", "金瞳妖狐", "青鳞蛟"],
  ["玄阴魔蛛", "银甲夜叉", "天目妖鹏", "尸魈王"],
  ["六翼霜蚣", "裂魂古猿", "青冥蛟王", "噬金虫母"],
  ["虚空魇兽", "玄磁雷鹏", "万毒蜃蛇", "荒火麟兽"],
  ["九首妖蛟", "太阴魔凰", "玄甲巨灵", "血海修罗"],
  ["真灵鲲鹏影", "五色孔雀王", "罗睺古兽", "玄天魔龙"],
  ["域外天魔", "真仙傀儡", "古魔圣祖影", "天罚雷兽"]
];
const monsterNames = monsterNamesByStage.flat();
const monsterArchetypes = [
  { id: "hp", label: "血量高", shortLabel: "血厚", text: "气血厚重，能扛更久。", multipliers: { maxHp: 1.34, attack: 0.92, defense: 1.06, divineSense: 0.92, maxMana: 0.96 }, skillIds: ["wood_recovery", "golden_body", "spirit_armor", "mirror_water"] },
  { id: "sense", label: "神识高", shortLabel: "神识", text: "神识敏锐，更容易预判闪避。", multipliers: { maxHp: 0.96, attack: 0.94, defense: 0.96, divineSense: 1.42, maxMana: 1.16 }, skillIds: ["soul_hook", "ice_seal", "magnetic_light", "ghost_step"] },
  { id: "attack", label: "攻击高", shortLabel: "凶攻", text: "攻伐凶猛，正面伤害更高。", multipliers: { maxHp: 0.98, attack: 1.34, defense: 0.92, divineSense: 0.96, maxMana: 1.02 }, skillIds: ["starfall", "demon_cut", "blood_drink", "thunder_pearl"] },
  { id: "balanced", label: "均衡型", shortLabel: "均衡", text: "五维平衡，没有明显短板。", multipliers: { maxHp: 1.08, attack: 1.08, defense: 1.08, divineSense: 1.08, maxMana: 1.08 }, skillIds: ["five_element", "wind_blade", "azure_sword", "green_bamboo"] }
];
const monsterArchetypeById = Object.fromEntries(monsterArchetypes.map((archetype) => [archetype.id, archetype]));
const monsterArchetypeByName = Object.fromEntries(monsterNamesByStage.flatMap((names) => names.map((name, index) => [name, monsterArchetypes[index % monsterArchetypes.length].id])));
const sharedDungeonItemIds = equipmentCatalog.map((item) => item.id);
const recentRecordDays = 30;
const replayRetentionDays = 10;
const battleRecordDays = 10;
const combatRatingNeutralScore = 50;
const combatRatingMinimumDays = 3;
const combatRatingWeights = { dungeon: 0.4, duel: 0.3, province: 0.3 };
const publicBattleRecordDays = replayRetentionDays;
const publicBattleRecordLimit = replayRetentionDays;
const publicProvinceWarLimit = replayRetentionDays * Math.max(sects.length, 1);
const publicDuelDayLimit = replayRetentionDays;
const publicDungeonRecordDays = replayRetentionDays;
const publicDungeonDayLimit = replayRetentionDays;
const battleArchiveIntervalDays = 10;
const battleArchiveLimit = 36;
const growthRecordDays = 60;
const logRecordDays = 30;
const flatLogLimit = 80;
const logRecordLimitPerDay = 80;
const detailRecordLimit = 600;
const npcDungeonHistoryLimit = battleRecordDays;
const growthRecordLimit = 120;

function minDayForWindow(currentDay, days) {
  return Math.max(1, Number(currentDay || 1) - Number(days || 1) + 1);
}

function isRecordWithinDays(record, currentDay, days) {
  const day = Number(record?.day || 0);
  return !day || day >= minDayForWindow(currentDay, days);
}

function isReplayWithinDays(record, currentDay) {
  const day = Number(record?.day || 0);
  return day > 0 && day >= minDayForWindow(currentDay, replayRetentionDays);
}

export function minReplayDayFor(currentDay) {
  return minDayForWindow(currentDay, replayRetentionDays);
}

function trimRecordsByDay(records, currentDay, days, limit = detailRecordLimit) {
  return [...(records || [])]
    .filter((record) => isRecordWithinDays(record, currentDay, days))
    .sort((a, b) => (Number(b.day || 0) - Number(a.day || 0)))
    .slice(0, limit);
}

function emptyBattleArchiveSummary(startDay) {
  const start = Math.max(1, Math.floor(Number(startDay) || 1));
  return {
    id: `battle-archive-${start}`,
    startDay: start,
    endDay: start + battleArchiveIntervalDays - 1,
    startDate: "",
    endDate: "",
    dungeon: { days: 0, runs: 0, bloodClears: 0, sectClears: 0, starSeaTeams: 0, starSeaKills: 0 },
    duel: { days: 0, matches: 0, battles: 0 },
    province: { days: 0, wars: 0, captures: 0, defended: 0 }
  };
}

function ensureBattleArchiveState(state) {
  let changed = false;
  if (!state.battleArchives || typeof state.battleArchives !== "object") {
    state.battleArchives = { version: battleArchiveVersion, intervalDays: battleArchiveIntervalDays, summaries: [] };
    return true;
  }
  if (Number(state.battleArchives.version) !== battleArchiveVersion) {
    state.battleArchives.version = battleArchiveVersion;
    changed = true;
  }
  if (Number(state.battleArchives.intervalDays) !== battleArchiveIntervalDays) {
    state.battleArchives.intervalDays = battleArchiveIntervalDays;
    changed = true;
  }
  if (!Array.isArray(state.battleArchives.summaries)) {
    state.battleArchives.summaries = [];
    changed = true;
  }
  const before = JSON.stringify(state.battleArchives.summaries);
  state.battleArchives.summaries = state.battleArchives.summaries
    .filter((summary) => summary && Number(summary.startDay) > 0)
    .sort((a, b) => Number(b.startDay || 0) - Number(a.startDay || 0))
    .slice(0, battleArchiveLimit);
  if (before !== JSON.stringify(state.battleArchives.summaries)) changed = true;
  return changed;
}

function battleArchiveSummaryFor(state, day) {
  const numericDay = Math.max(1, Math.floor(Number(day) || 1));
  const startDay = Math.floor((numericDay - 1) / battleArchiveIntervalDays) * battleArchiveIntervalDays + 1;
  let summary = state.battleArchives.summaries.find((item) => Number(item.startDay) === startDay);
  if (!summary) {
    summary = emptyBattleArchiveSummary(startDay);
    state.battleArchives.summaries.push(summary);
  }
  summary.startDate ||= stateDateForDay(state, summary.startDay);
  summary.endDate ||= stateDateForDay(state, summary.endDay);
  return summary;
}

function groupRecordsByDay(records, currentDay, cutoffDay) {
  const grouped = new Map();
  for (const record of records || []) {
    const day = Math.floor(Number(record?.day) || 0);
    if (!day || day >= cutoffDay || day > currentDay) continue;
    const list = grouped.get(day) || [];
    list.push(record);
    grouped.set(day, list);
  }
  return grouped;
}

function archiveExpiredBattleRecords(state) {
  ensureBattleArchiveState(state);
  const currentDay = Math.max(1, Math.floor(Number(state.day) || 1));
  const cutoffDay = currentDay - battleRecordDays + 1;
  if (cutoffDay <= 1) return false;
  let changed = false;

  const dungeonByDay = groupRecordsByDay(state.dungeonDays, currentDay, cutoffDay);
  for (const [day, records] of dungeonByDay) {
    const summary = battleArchiveSummaryFor(state, day);
    const dungeon = summary.dungeon;
    dungeon.days += 1;
    dungeon.runs += records.length;
    for (const record of records) {
      dungeon.bloodClears += (record.bloodTrial?.caves || []).reduce((sum, cave) => sum + Math.max(Number(cave.clearCount || 0), (cave.clears || []).length), 0);
      dungeon.sectClears += (record.sects || []).filter((item) => item.success).length;
      dungeon.starSeaTeams += record.public?.teams?.length || 0;
      dungeon.starSeaKills += Number(record.public?.killed || 0);
    }
    changed = true;
  }
  const duelByDay = groupRecordsByDay(state.duelDays, currentDay, cutoffDay);
  for (const [day, records] of duelByDay) {
    const summary = battleArchiveSummaryFor(state, day);
    const duel = summary.duel;
    duel.days += 1;
    duel.matches += records.reduce((sum, record) => sum + (record.matches || []).length, 0);
    duel.battles += records.reduce((sum, record) => sum + (record.matches || []).filter((match) => match.type === "battle").length, 0);
    changed = true;
  }
  const provinceByDay = groupRecordsByDay(state.provinceWars, currentDay, cutoffDay);
  for (const [day, records] of provinceByDay) {
    const summary = battleArchiveSummaryFor(state, day);
    const province = summary.province;
    province.days += 1;
    province.wars += records.length;
    province.captures += records.filter((record) => record.captured).length;
    province.defended += records.filter((record) => !record.captured).length;
    changed = true;
  }

  if (changed) {
    state.dungeonDays = (state.dungeonDays || []).filter((record) => Number(record?.day || 0) >= cutoffDay || !record?.day);
    state.duelDays = (state.duelDays || []).filter((record) => Number(record?.day || 0) >= cutoffDay || !record?.day);
    state.provinceWars = (state.provinceWars || []).filter((record) => Number(record?.day || 0) >= cutoffDay || !record?.day);
    state.battleArchives.summaries = state.battleArchives.summaries
      .sort((a, b) => Number(b.startDay || 0) - Number(a.startDay || 0))
      .slice(0, battleArchiveLimit);
  }
  return changed;
}

function duelHistoryKey(record) {
  if (record?.replayId) return `replay:${record.replayId}`;
  return [
    "duel",
    record?.day || "",
    record?.foughtAt || "",
    record?.opponentId || record?.opponent || "",
    record?.result || "",
    record?.scoreDelta ?? ""
  ].join(":");
}

function trimDuelHistory(records, currentDay, limit = detailRecordLimit) {
  return trimRecordsByDay(records, currentDay, battleRecordDays, limit);
}

function mergeDuelHistory(records, currentDay, limit = detailRecordLimit) {
  const seen = new Set();
  const merged = [];
  for (const record of records || []) {
    const key = duelHistoryKey(record);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(record);
  }
  return trimDuelHistory(merged, currentDay, limit);
}

const dungeonLootRules = {
  blood_trial: {
    name: "血色禁地",
    contexts: ["血色禁地", "虚天殿", "乱星海猎妖"],
    itemIds: sharedDungeonItemIds,
    spiritRange: ({ cave = 1, stage = 0 } = {}) => ({
      min: Math.floor(22 + stage * 24 + cave * 14),
      max: Math.floor(46 + stage * 32 + cave * 18)
    }),
    bonusRange: ({ cave = 1, stage = 0 } = {}) => ({
      min: Math.floor(8 + stage * 9 + cave * 5),
      max: Math.floor(18 + stage * 12 + cave * 7)
    }),
    sourceText: "全副本共享装备池；每件装备每日固定概率，每关不同"
  },
  void_hall: {
    name: "虚天殿",
    contexts: ["血色禁地", "虚天殿", "乱星海猎妖"],
    itemIds: sharedDungeonItemIds,
    spiritRange: ({ stage = 0 } = {}) => ({
      min: Math.floor(90 + stage * 82),
      max: Math.floor(159 + stage * 82)
    }),
    sourceText: "全副本共享装备池；虚天殿通关后从输出贡献者中归属"
  },
  star_sea: {
    name: "乱星海猎妖",
    contexts: ["血色禁地", "虚天殿", "乱星海猎妖"],
    itemIds: sharedDungeonItemIds,
    spiritRange: ({ stage = 0, killed = 0 } = {}) => ({
      min: Math.floor(240 + stage * 140 + killed * 90),
      max: Math.floor(380 + stage * 180 + killed * 120)
    }),
    sourceText: "全副本共享装备池；乱星海每日有概率竞拍，期末 50% 概率追加 1 件，低品质掉落权重更高"
  }
};

function createEquipmentState() {
  return equipmentCatalog.map((item) => ({
    ...item,
    ownerId: "",
    acquiredDay: 1,
    acquiredDate: dateKey(),
    transferHistory: []
  }));
}

function normalizeEquipmentItem(item, fallback = {}) {
  const catalogItem = equipmentCatalog.find((entry) => entry.id === item?.id) || fallback;
  return {
    ...catalogItem,
    ...item,
    ownerId: item?.ownerId || "",
    acquiredDay: item?.acquiredDay || 1,
    acquiredDate: item?.acquiredDate || dateKey(),
    transferHistory: Array.isArray(item?.transferHistory) ? item.transferHistory.slice(0, 5) : []
  };
}

function equipmentTransferHistoryEntry(transfer, receiver, sourceName = "") {
  if (!transfer?.itemId) return null;
  const kind = transfer.type === "steal" ? "steal" : "dungeon";
  const fromName = kind === "steal" ? transfer.loserName || sourceName || "未知修士" : transfer.context || sourceName || "副本";
  const toName = transfer.winnerName || transfer.receiverName || receiver?.name || "未知修士";
  return {
    type: kind,
    day: transfer.day || 0,
    date: transfer.date || "",
    fromId: kind === "steal" ? transfer.loserId || "" : "",
    fromName,
    toId: transfer.winnerId || transfer.receiverId || receiver?.id || "",
    toName,
    context: transfer.context || "",
    text: kind === "steal" ? `${toName}从${fromName}手中夺得` : `${toName}从${fromName}获得`
  };
}

function appendEquipmentTransferHistory(item, transfer, receiver = null, sourceName = "") {
  const entry = equipmentTransferHistoryEntry(transfer, receiver, sourceName);
  if (!entry) return;
  item.transferHistory = [entry, ...(Array.isArray(item.transferHistory) ? item.transferHistory : [])].slice(0, 5);
}

function backfillEquipmentTransferHistory(state) {
  const equipment = new Map((state.equipment || []).map((item) => [item.id, item]));
  for (const record of [...(state.equipmentTransfers || [])].reverse()) {
    const item = equipment.get(record.itemId);
    if (!item) continue;
    const existing = Array.isArray(item.transferHistory) ? item.transferHistory : [];
    const duplicate = existing.some((entry) => entry.day === record.day && entry.toId === (record.winnerId || record.receiverId || "") && entry.fromId === (record.loserId || "") && entry.context === (record.context || ""));
    if (duplicate) continue;
    appendEquipmentTransferHistory(item, record, null, record.context || record.loserName || "");
  }
}

function ensureEquipmentState(state) {
  let changed = false;
  if (state.equipmentVersion !== equipmentVersion) {
    state.equipment = createEquipmentState();
    state.equipmentVersion = equipmentVersion;
    return true;
  }
  const current = new Map((state.equipment || []).map((item) => [item.id, item]));
  state.equipment = equipmentCatalog.map((catalogItem) => {
    const previous = current.get(catalogItem.id);
    if (!previous) {
      changed = true;
      return normalizeEquipmentItem({ ...catalogItem, ownerId: "", acquiredDay: state.day || 1, acquiredDate: stateDateForDay(state) }, catalogItem);
    }
    const normalized = normalizeEquipmentItem(previous, catalogItem);
    if (JSON.stringify(normalized) !== JSON.stringify(previous)) changed = true;
    return normalized;
  });
  const beforeHistory = JSON.stringify(state.equipment.map((item) => [item.id, item.transferHistory || []]));
  backfillEquipmentTransferHistory(state);
  if (JSON.stringify(state.equipment.map((item) => [item.id, item.transferHistory || []])) !== beforeHistory) changed = true;
  return changed;
}

function equipmentTier(item) {
  return equipmentTierMap[item?.tier] || equipmentTiers[0];
}

function equipmentSlot(item) {
  return equipmentSlotMap[item?.slot] || equipmentSlots[0];
}

function equipmentScore(item) {
  // Genuine equipment tiers already have non-overlapping bonus ranges. Once
  // replicas exist, their half-strength bonuses can overlap lower genuine
  // tiers, so the actual bonus must decide which item is automatically worn.
  return Math.round((item?.bonus || 0) * 100000) + (item?.tier || 0);
}

function equipmentValue(item) {
  const reference = item?.isReplica ? equipmentCatalogMap[item.sourceItemId] || item : item;
  const tier = clamp(Number(reference?.tier || 1), 1, equipmentTiers.length);
  const baseByTier = [220, 320, 500, 800, 1350, 2700];
  const tierData = equipmentTier(reference);
  const minBonus = tierData.min || 0;
  const maxBonus = tierData.max || minBonus + 0.01;
  const bonusRatio = clamp(((reference?.bonus || minBonus) - minBonus) / Math.max(0.01, maxBonus - minBonus), 0, 1);
  const spread = [40, 80, 140, 240, 500, 500][tier - 1] || 80;
  const slotPremium = reference?.slot === "weapon" ? 40 : reference?.slot === "trinket" ? 30 : reference?.slot === "armor" ? 20 : 0;
  const value = Math.max(200, Math.round(baseByTier[tier - 1] + spread * bonusRatio + slotPremium));
  return item?.isReplica ? Math.max(100, Math.round(value * 0.5)) : value;
}

function equipmentSellValue(item) {
  return Math.max(20, Math.floor(equipmentValue(item) * 0.6));
}

function equipmentCompensation(item) {
  const reference = item?.isReplica ? equipmentCatalogMap[item.sourceItemId] || item : item;
  const compensation = Math.max(8, Math.floor(14 + (reference?.tier || 1) * 18 + (reference?.bonus || 0) * 260));
  return item?.isReplica ? Math.max(4, Math.floor(compensation * 0.5)) : compensation;
}

function equipmentForOwner(state, ownerId) {
  return (state.equipment || []).filter((item) => item.ownerId === ownerId);
}

function equippedItemsFor(state, entity) {
  const bestBySlot = new Map();
  for (const item of equipmentForOwner(state, entity?.id)) {
    const current = bestBySlot.get(item.slot);
    if (!current || equipmentScore(item) > equipmentScore(current)) bestBySlot.set(item.slot, item);
  }
  return [...bestBySlot.values()].sort((a, b) => equipmentSlots.findIndex((slot) => slot.id === a.slot) - equipmentSlots.findIndex((slot) => slot.id === b.slot));
}

function equipmentBonusFor(state, entity, stat) {
  if (!state || !entity?.id) return 0;
  return equippedItemsFor(state, entity)
    .filter((item) => equipmentSlot(item).stat === stat)
    .reduce((sum, item) => sum + (item.bonus || 0), 0);
}

function createSpiritPearlState() {
  return {
    version: spiritPearlVersion,
    dust: 0,
    pearls: Object.fromEntries(spiritPearls.map((pearl) => [pearl.id, { id: pearl.id, tier: 0, star: 0, fragments: {} }])),
    history: []
  };
}

function normalizeSpiritPearlEntry(entry, id) {
  const pearl = spiritPearlMap[id];
  return {
    id,
    tier: clamp(Math.floor(Number(entry?.tier) || 0), 0, 9),
    star: clamp(Math.floor(Number(entry?.star) || 0), 0, 5),
    fragments: Object.fromEntries(Array.from({ length: 9 }, (_, index) => {
      const tier = String(index + 1);
      return [tier, Math.max(0, Math.floor(Number(entry?.fragments?.[tier]) || 0))];
    })),
    name: pearl?.name || id
  };
}

function normalizeSpiritPearlState(current, currentDay = 1) {
  let changed = false;
  let asset = current;
  if (!asset || asset.version !== spiritPearlVersion) {
    const previous = asset || {};
    const next = createSpiritPearlState();
    next.dust = Math.max(0, Math.floor(Number(previous.dust) || 0));
    next.history = Array.isArray(previous.history) ? previous.history : [];
    for (const pearl of spiritPearls) {
      next.pearls[pearl.id] = normalizeSpiritPearlEntry(previous.pearls?.[pearl.id], pearl.id);
    }
    asset = next;
    changed = true;
  }
  for (const pearl of spiritPearls) {
    const normalized = normalizeSpiritPearlEntry(asset.pearls?.[pearl.id], pearl.id);
    asset.pearls[pearl.id] = normalized;
  }
  asset.version = spiritPearlVersion;
  asset.dust = Math.max(0, Math.floor(Number(asset.dust) || 0));
  asset.history = trimRecordsByDay(asset.history || [], currentDay, recentRecordDays, detailRecordLimit);
  return { asset, changed };
}

function ensureSpiritPearls(state, entity = state.player) {
  const isPlayer = entity?.id === state.player?.id;
  const previous = entity?.spiritPearls || (isPlayer ? state.spiritPearls : null);
  const normalized = normalizeSpiritPearlState(previous, state.day);
  const asset = normalized.asset;
  let changed = normalized.changed;
  if (entity) entity.spiritPearls = asset;
  if (isPlayer) state.spiritPearls = asset;
  return changed;
}

function exchangeSpiritDust(state, entity, asset) {
  const exchanges = [];
  const count = Math.floor(Math.max(0, Number(asset?.dust) || 0) / spiritDustExchangeCost);
  for (let index = 0; index < count; index += 1) {
    const pearl = pick(spiritPearls);
    const entry = asset.pearls[pearl.id];
    entry.fragments["1"] = Math.max(0, Math.floor(Number(entry.fragments["1"]) || 0)) + 1;
    asset.dust -= spiritDustExchangeCost;
    const record = {
      day: state.day,
      date: stateDateForDay(state),
      type: "dust_exchange",
      pearlId: pearl.id,
      pearlName: pearl.name,
      tier: 1,
      amount: 1,
      dustCost: spiritDustExchangeCost,
      context: "灵尘自动兑换",
      receiverId: entity?.id || "player",
      receiverName: entity?.name || "主角"
    };
    asset.history.unshift(record);
    exchanges.push(record);
  }
  if (exchanges.length) asset.history = trimRecordsByDay(asset.history, state.day, recentRecordDays, detailRecordLimit);
  return exchanges;
}

function settleDailySpiritPearlAssets(state) {
  const playerSummary = { exchanges: [], upgrades: [] };
  for (const { entity } of allCultivators(state)) {
    ensureSpiritPearls(state, entity);
    const asset = entity.spiritPearls;
    const exchanges = exchangeSpiritDust(state, entity, asset);
    const upgrades = spiritPearls.flatMap((pearl) => autoUpgradeSpiritPearl(state, entity, pearl.id, "每日灵珠自动兑换", true));
    if (entity.id === state.player.id) {
      playerSummary.exchanges.push(...exchanges);
      playerSummary.upgrades.push(...upgrades);
    }
  }
  if (playerSummary.exchanges.length || playerSummary.upgrades.length) {
    const parts = [];
    if (playerSummary.exchanges.length) parts.push(`灵尘兑换 ${playerSummary.exchanges.length} 枚碎片`);
    if (playerSummary.upgrades.length) parts.push(`灵珠凝练 ${playerSummary.upgrades.length} 次`);
    log(state, `每日灵珠自动结算：${parts.join("；")}。`, "gold");
  }
}

function spiritPearlForgeCost(tier = 1) {
  return tier <= 1 ? 20 : Math.round(20 + tier * 10 + Math.pow(tier, 1.45) * 8);
}

function spiritPearlStarCost(tier = 1, nextStar = 1) {
  return Math.round(6 + tier * 5 + nextStar * (4 + tier * 2));
}

function spiritPearlValue(tier = 0, star = 0) {
  if (tier <= 0) return 0;
  const base = 0.006 + Math.pow(tier, 1.18) * 0.008;
  return Number((base * (1 + clamp(star, 0, 5) * 0.16)).toFixed(4));
}

function entitySpiritPearlMatchMultiplier(entity, pearl) {
  const profile = rootProfile(entity);
  if (profile.specialRoot?.id === pearl.rootKey) return 2;
  const keys = new Set(profile.roots.map((root) => root.key));
  if (keys.has(pearl.rootKey)) return 2;
  if (profile.specialRoot?.id === "thunder" && ["metal", "wood", "earth"].includes(pearl.rootKey)) return 1.25;
  if (profile.specialRoot?.id === "wind" && ["water", "fire", "heaven"].includes(pearl.rootKey)) return 1.25;
  if (profile.specialRoot?.id === "hidden" && ["metal", "wood", "water", "fire", "earth"].includes(pearl.rootKey)) return 1.15;
  return 1;
}

function spiritPearlBonusesFor(state, entity) {
  ensureSpiritPearls(state, entity);
  const asset = entity?.spiritPearls || state.spiritPearls;
  const totals = { attack: 0, defense: 0, maxHp: 0, divineSense: 0, maxMana: 0, xp: 0, breakthrough: 0 };
  for (const config of spiritPearls) {
    const entry = asset.pearls?.[config.id];
    if (!entry?.tier) continue;
    const value = spiritPearlValue(entry.tier, entry.star);
    const match = entitySpiritPearlMatchMultiplier(entity, config);
    for (const effect of config.effects || []) {
      totals[effect.stat] = (totals[effect.stat] || 0) + value * (effect.weight || 1) * match;
    }
  }
  return Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, Number(value.toFixed(4))]));
}

function spiritPearlBonusFor(state, entity, stat) {
  if (!state || !entity?.id) return 0;
  return spiritPearlBonusesFor(state, entity)[stat] || 0;
}

function publicSpiritPearls(state, entity = state.player, options = {}) {
  ensureSpiritPearls(state, entity);
  const asset = entity?.spiritPearls || state.spiritPearls;
  const bonuses = spiritPearlBonusesFor(state, entity);
  const result = {
    dust: asset.dust || 0,
    bonuses,
    pearls: spiritPearls.map((config) => {
      const entry = asset.pearls[config.id];
      const nextTier = entry.tier <= 0 ? 1 : Math.min(9, entry.tier + (entry.star >= 5 ? 1 : 0));
      const nextStar = entry.tier <= 0 ? 0 : Math.min(5, entry.star + 1);
      const requiredTier = entry.tier <= 0 ? 1 : entry.star >= 5 ? Math.min(9, entry.tier + 1) : entry.tier;
      const cost = entry.tier <= 0 || entry.star >= 5 ? spiritPearlForgeCost(requiredTier) : spiritPearlStarCost(entry.tier, nextStar);
      return {
        ...entry,
        config,
        value: spiritPearlValue(entry.tier, entry.star),
        matchMultiplier: entitySpiritPearlMatchMultiplier(entity, config),
        next: { tier: nextTier, star: nextStar, fragmentTier: requiredTier, cost },
        canUpgrade: (entry.fragments?.[String(requiredTier)] || 0) >= cost && (entry.tier < 9 || entry.star < 5)
      };
    })
  };
  if (options.includeHistory !== false) result.history = asset.history || [];
  return result;
}

function addSpiritPearlReward(state, pearlId, tier, amount, context, receiver = state.player) {
  ensureSpiritPearls(state, receiver);
  const asset = receiver.spiritPearls;
  const id = spiritPearlMap[pearlId] ? pearlId : pick(spiritPearls).id;
  const safeTier = clamp(Math.floor(Number(tier) || 1), 1, 9);
  const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
  if (!safeAmount) return null;
  const entry = asset.pearls[id];
  const key = String(safeTier);
  entry.fragments[key] = Math.max(0, Math.floor(Number(entry.fragments[key]) || 0)) + safeAmount;
  const record = {
    day: state.day,
    date: stateDateForDay(state),
    type: "fragment",
    pearlId: id,
    pearlName: spiritPearlMap[id].name,
    tier: safeTier,
    amount: safeAmount,
    context,
    receiverId: receiver?.id || "player",
    receiverName: receiver?.name || "主角"
  };
  asset.history.unshift(record);
  asset.history = trimRecordsByDay(asset.history, state.day, recentRecordDays, detailRecordLimit);
  return record;
}

function addSpiritDust(state, amount, context, receiver = state.player) {
  ensureSpiritPearls(state, receiver);
  const asset = receiver.spiritPearls;
  const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
  if (!safeAmount) return;
  asset.dust += safeAmount;
  asset.history.unshift({ day: state.day, date: stateDateForDay(state), type: "dust", amount: safeAmount, context, receiverId: receiver.id, receiverName: receiver.name });
  asset.history = trimRecordsByDay(asset.history, state.day, recentRecordDays, detailRecordLimit);
}

function spiritPearlTierForDungeon(dungeonId, stage = 0, success = true) {
  const base = dungeonId === "blood_trial" ? 1 : dungeonId === "void_hall" ? 2 : 3;
  const bonus = Math.floor(Math.max(0, Number(stage) || 0) / 2);
  const lucky = success && Math.random() < 0.08 + Math.max(0, Number(stage) || 0) * 0.015 ? 1 : 0;
  return clamp(base + bonus + lucky, 1, 9);
}

function rollSpiritPearlFragmentReward(state, dungeonId, options = {}) {
  const success = options.success !== false;
  const stage = Math.max(0, Math.floor(Number(options.stage) || 0));
  const depth = Math.max(1, Math.floor(Number(options.depth || options.cave || stage + 1) || 1));
  const baseChance = dungeonId === "blood_trial" ? 0.18 : dungeonId === "void_hall" ? 0.55 : 0.42;
  const chance = clamp(baseChance + depth * 0.025 + stage * 0.025 + (success ? 0.12 : -0.14), 0.08, 0.88);
  if (Math.random() > chance) {
    addSpiritDust(state, success ? 2 + Math.floor(depth / 2) : 1, options.context || "副本历练", options.receiver || state.player);
    return null;
  }
  const tier = spiritPearlTierForDungeon(dungeonId, stage, success);
  const amountBase = dungeonId === "blood_trial" ? 1 : dungeonId === "void_hall" ? 2 : 2;
  const amount = amountBase + Math.floor(Math.random() * (success ? 3 : 2)) + Math.floor(depth / 4);
  const pearlId = options.pearlId || pick(spiritPearls).id;
  return addSpiritPearlReward(state, pearlId, tier, amount, options.context || "副本历练", options.receiver || state.player);
}

function autoUpgradeSpiritPearl(state, entity, pearlId, context = "", skipEnsure = false) {
  if (!skipEnsure) ensureSpiritPearls(state, entity);
  const asset = entity.spiritPearls;
  const entry = asset.pearls[pearlId];
  const config = spiritPearlMap[pearlId];
  if (!entry || !config) return [];
  const upgrades = [];
  let guard = 0;
  while (guard < 20) {
    guard += 1;
    if (entry.tier >= 9 && entry.star >= 5) break;
    const fragmentTier = entry.tier <= 0 ? 1 : entry.star >= 5 ? Math.min(9, entry.tier + 1) : entry.tier;
    const cost = entry.tier <= 0 || entry.star >= 5 ? spiritPearlForgeCost(fragmentTier) : spiritPearlStarCost(entry.tier, entry.star + 1);
    const key = String(fragmentTier);
    if ((entry.fragments[key] || 0) < cost) break;
    entry.fragments[key] -= cost;
    if (entry.tier <= 0) {
      entry.tier = 1;
      entry.star = 0;
    } else if (entry.star >= 5) {
      entry.tier = Math.min(9, entry.tier + 1);
      entry.star = 0;
    } else {
      entry.star += 1;
    }
    const record = {
      day: state.day,
      date: stateDateForDay(state),
      type: "upgrade",
      pearlId,
      pearlName: config.name,
      tier: entry.tier,
      star: entry.star,
      cost,
      fragmentTier,
      context
    };
    upgrades.push(record);
    asset.history.unshift(record);
    if (entity.id === state.player.id && (pearlId === primaryRoot(entity).key || pearlId === activeSpecialRoot(entity)?.id)) {
      log(state, `${config.name}凝练至 ${entry.tier}阶${entry.star}星。`, "gold");
    }
  }
  asset.history = trimRecordsByDay(asset.history, state.day, recentRecordDays, detailRecordLimit);
  return upgrades;
}

function bestEquippedInSlot(state, entity, slot) {
  return equippedItemsFor(state, entity).find((item) => item.slot === slot) || null;
}

function availableEquipmentPool(state, maxTier = 1) {
  return (state.equipment || [])
    .filter((item) => !item.ownerId && (item.tier || 1) <= maxTier)
    .sort((a, b) => equipmentScore(b) - equipmentScore(a));
}

function stableHash(text) {
  let hash = 2166136261;
  for (const char of String(text)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function stableUnit(seed) {
  return stableHash(seed) / 0xffffffff;
}

function monsterNameForStage(stage, seed = "") {
  const safeStage = clamp(Math.floor(Number(stage) || 0), 0, monsterNamesByStage.length - 1);
  const names = monsterNamesByStage[safeStage] || monsterNamesByStage[0] || monsterNames;
  if (!names.length) return pick(monsterNames);
  const index = stableHash(`${safeStage}|${seed}`) % names.length;
  return names[index];
}

function dungeonLootBaseChance(item, depth = 1) {
  const tier = clamp(Number(item?.tier || 1), 1, equipmentTiers.length);
  const safeDepth = clamp(Number(depth || 1), 1, 9);
  const depthRatio = (safeDepth - 1) / 8;
  const tierPressure = Math.max(0, (tier - safeDepth) / 5);
  const tierEase = Math.max(0, (safeDepth - tier + 1) / 8);
  const floor = 0.000001 * Math.pow(0.42, tier - 1);
  const base = 0.0028 / Math.pow(tier, 2.35);
  const depthBoost = 0.0012 * Math.pow(depthRatio, 1.45) / Math.pow(tier, 1.2);
  const easeBoost = 0.0065 * Math.pow(tierEase, 1.75) / Math.pow(tier, 1.7);
  const earlyPenalty = Math.pow(0.22, tierPressure);
  return clamp((base + depthBoost + easeBoost) * earlyPenalty, floor, 0.01);
}

function dungeonLootChanceForItem(state, item, dungeonId, options = {}) {
  const depth = options.cave || options.depth || options.stage + 1 || 1;
  const day = options.day || state?.day || 1;
  const sourceItemId = item?.sourceItemId || item?.id;
  const seed = `${state?.calendarStartDate || ""}|${day}|${dungeonId}|${depth}|${sourceItemId}`;
  const dailyMultiplier = 0.72 + stableUnit(seed) * 0.56;
  const replicaMultiplier = item?.isReplica ? replicaDropChanceMultiplier : 1;
  return clamp(dungeonLootBaseChance(item, depth) * dailyMultiplier * replicaMultiplier, 0.000001, 0.01);
}

function availableDungeonEquipmentPool(state, dungeonId, maxTier = equipmentTiers.length) {
  const rule = dungeonLootRules[dungeonId];
  const allowed = new Set(rule?.itemIds || equipmentCatalog.map((item) => item.id));
  return availableEquipmentPool(state, maxTier)
    .filter((item) => allowed.has(item.id))
    .sort((a, b) => equipmentScore(b) - equipmentScore(a));
}

function rollEquipmentDrop(state, maxTier, dungeonId = "", options = {}) {
  const rule = dungeonLootRules[dungeonId];
  const pool = dungeonId ? availableDungeonEquipmentPool(state, dungeonId, maxTier) : availableEquipmentPool(state, maxTier);
  if (!pool.length) return null;
  const candidates = pool
    .map((item) => ({ item, chance: dungeonLootChanceForItem(state, item, dungeonId, options) }))
    .filter((entry) => Math.random() < entry.chance)
    .sort((a, b) => b.item.tier - a.item.tier || b.chance - a.chance || equipmentScore(b.item) - equipmentScore(a.item));
  if (candidates.length) return candidates[0].item;

  const totalChance = pool.reduce((sum, item) => sum + dungeonLootChanceForItem(state, item, dungeonId, options), 0);
  if (Math.random() > Math.min(0.018, totalChance * 0.38)) return null;
  const weighted = pool.map((item) => ({ item, weight: dungeonLootChanceForItem(state, item, dungeonId, options) }));
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) return entry.item;
  }
  return weighted[weighted.length - 1]?.item || null;
}

function awardEquipment(state, receiver, item, context, options = {}) {
  if (!receiver?.id || !item) return null;
  const current = bestEquippedInSlot(state, receiver, item.slot);
  const compensationOnly = current && equipmentScore(current) >= equipmentScore(item);
  const compensation = compensationOnly ? Math.max(6, Math.floor(equipmentCompensation(item) * 0.45)) : (current ? equipmentCompensation(current) : 0);

  if (compensationOnly) {
    receiver.spirit += compensation;
    item.ownerId = receiver.id;
    item.acquiredDay = state.day;
    item.acquiredDate = stateDateForDay(state);
    const transfer = {
      type: "spirit",
      receiverId: receiver.id,
      receiverName: receiver.name,
      itemId: item.id,
      itemName: item.name,
      tierName: equipmentTier(item).name,
      slotName: equipmentSlot(item).name,
      statName: equipmentSlot(item).statName,
      bonus: item.bonus || 0,
      compensation,
      context
    };
    appendEquipmentTransferHistory(item, transfer, receiver, context);
    return transfer;
  }

  if (current) receiver.spirit += compensation;

  item.ownerId = receiver.id;
  item.acquiredDay = state.day;
  item.acquiredDate = stateDateForDay(state);

  const transfer = {
    type: "dungeon",
    itemId: item.id,
    itemName: item.name,
    tierName: equipmentTier(item).name,
    slotName: equipmentSlot(item).name,
    statName: equipmentSlot(item).statName,
    bonus: item.bonus || 0,
    winnerId: receiver.id,
    winnerName: receiver.name,
    loserId: "",
    loserName: context,
    chance: options.chance || 0,
    day: state.day,
    date: stateDateForDay(state),
    time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
    context,
    replacedItemName: current?.name || "",
    compensation
  };
  appendEquipmentTransferHistory(item, transfer, receiver, context);
  state.equipmentTransfers ??= [];
  state.equipmentTransfers.unshift(transfer);
  state.equipmentTransfers = state.equipmentTransfers.slice(0, recentRecordDays);
  if (item.tier >= 4 || receiver.id === "player") {
    const replaceText = current ? `，旧装备「${current.name}」留存备用并补偿 ${compensation} 灵石` : "";
    log(state, `${receiver.name}在${context}获得${equipmentTier(item).name}「${item.name}」${replaceText}。`, item.tier >= 4 ? "gold" : "");
  }
  return transfer;
}

function publicEquipment(item, state) {
  const owner = item.ownerId ? cultivatorMap(state).get(item.ownerId) : null;
  return {
    ...item,
    isReplica: Boolean(item.isReplica),
    sourceItemId: item.sourceItemId || item.id,
    slotName: equipmentSlot(item).name,
    stat: equipmentSlot(item).stat,
    statName: equipmentSlot(item).statName,
    tierName: equipmentTier(item).name,
    value: equipmentValue(item),
    stealChance: equipmentTier(item).stealChance,
    ownerName: owner?.name || "",
    ownerSect: owner?.id === "player" ? state.sect.name : owner?.sect || "",
    equipped: Boolean(owner && equippedItemsFor(state, owner).some((equipped) => equipped.id === item.id)),
    transferHistory: Array.isArray(item.transferHistory) ? item.transferHistory.slice(0, 5) : []
  };
}

function publicDungeonLootPools(state) {
  return Object.fromEntries(Object.entries(dungeonLootRules).map(([id, rule]) => {
    const items = rule.itemIds
      .map((itemId) => (state.equipment || []).find((item) => item.id === itemId) || equipmentCatalog.find((item) => item.id === itemId))
      .filter(Boolean)
      .map((item) => ({
        ...publicEquipment(item, state),
        chanceByCave: Array.from({ length: realmStages.length }, (_, index) => ({
          cave: index + 1,
          chance: dungeonLootChanceForItem(state, item, id, { cave: index + 1 })
        }))
      }));
    const chances = items.flatMap((item) => item.chanceByCave.map((entry) => entry.chance));
    return [id, {
      id,
      name: rule.name,
      sourceText: rule.sourceText,
      contexts: rule.contexts,
      dropChance: {
        min: chances.length ? Math.min(...chances) : 0,
        max: chances.length ? Math.max(...chances) : 0
      },
      items,
      acquiredCount: items.filter((item) => item.ownerId).length,
      remainingCount: items.filter((item) => !item.ownerId).length
    }];
  }));
}

function tryTransferEquipment(state, winner, loser, context = "") {
  if (!winner?.id || !loser?.id || winner.id === loser.id) return null;
  const candidates = equippedItemsFor(state, loser).filter((item) => (state.day || 1) > (item.acquiredDay || 1));
  if (!candidates.length) return null;
  const item = pick(candidates);
  const chance = equipmentTier(item).stealChance;
  if (Math.random() >= chance) return null;
  item.ownerId = winner.id;
  item.acquiredDay = state.day;
  item.acquiredDate = stateDateForDay(state);
  const transfer = {
    type: "steal",
    itemId: item.id,
    itemName: item.name,
    tierName: equipmentTier(item).name,
    slotName: equipmentSlot(item).name,
    statName: equipmentSlot(item).statName,
    bonus: item.bonus || 0,
    winnerId: winner.id,
    winnerName: winner.name,
    loserId: loser.id,
    loserName: loser.name,
    chance,
    day: state.day,
    date: stateDateForDay(state),
    time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
    context
  };
  appendEquipmentTransferHistory(item, transfer, winner, loser.name);
  state.equipmentTransfers ??= [];
  state.equipmentTransfers.unshift(transfer);
  state.equipmentTransfers = state.equipmentTransfers.slice(0, recentRecordDays);
  log(state, `${winner.name}在${context || "战斗"}中夺得${loser.name}的「${item.name}」。`, "gold");
  return transfer;
}

function makeSectStatus(name, index) {
  return {
    name,
    reputation: 14 + index * 5 + Math.floor(Math.random() * 18),
    supplies: 48 + index * 16 + Math.floor(Math.random() * 50),
    rivalHeat: 22 + index * 8 + Math.floor(Math.random() * 32),
    warWins: Math.floor(Math.random() * 5),
    warLosses: Math.floor(Math.random() * 4)
  };
}

function currentSectName(state, name) {
  return state?.sectNameMap?.[name] || name;
}

function activeSectNames(state) {
  const names = new Set(sects.map((name) => currentSectName(state, name)));
  if (state?.sect?.name) names.add(state.sect.name);
  for (const name of Object.keys(state?.sectRivals || {})) names.add(name);
  for (const npc of state?.npcs || []) if (npc.sect) names.add(npc.sect);
  return [...names].filter(Boolean);
}

function provinceTier(province) {
  const rank = clamp(Number(province?.rank) || provinces.length, 1, provinces.length);
  const ratio = (provinces.length - rank) / Math.max(1, provinces.length - 1);
  return Number((0.38 + 0.62 * ratio).toFixed(4));
}

function provinceSpiritBaseValue(province) {
  return Math.round(8 + 16 * provinceTier(province));
}

function provinceDustBaseValue(province) {
  return Math.max(1, Math.floor(Number(province?.dustYield) || (1 + 3 * provinceTier(province))));
}

function provinceXpBaseValue(province) {
  return Number((0.36 + 0.28 * provinceTier(province)).toFixed(3));
}

function provinceBreakthroughBaseValue(province) {
  return Number((0.02 + 0.045 * provinceTier(province)).toFixed(4));
}

function provinceEffect(province) {
  const tier = provinceTier(province);
  const effect = {
    type: province.type,
    tier,
    label: "",
    value: 0,
    text: ""
  };
  if (province.type === "spirit") {
    effect.label = "灵石";
    effect.value = provinceSpiritBaseValue(province);
    effect.text = `宗门灵石包基准 +${effect.value}/人`;
  } else if (province.type === "dust") {
    effect.label = "灵尘";
    effect.value = provinceDustBaseValue(province);
    effect.text = `宗门灵尘包基准 +${effect.value}/人`;
  } else if (province.type === "xp") {
    effect.label = "经验";
    effect.value = provinceXpBaseValue(province);
    effect.text = `宗门经验包基准 +${Math.round(effect.value * 100)}%/人`;
  } else if (province.type === "breakthrough") {
    effect.label = "突破";
    effect.value = provinceBreakthroughBaseValue(province);
    effect.text = `宗门突破包基准 +${Math.round(effect.value * 100)}%/人`;
  } else {
    effect.type = "spirit";
    effect.label = "灵石";
    effect.value = provinceSpiritBaseValue(province);
    effect.text = `宗门灵石包基准 +${effect.value}/人`;
  }
  return effect;
}

function createProvinceState(state = null) {
  return provinces.map((province, index) => ({
    id: province.id,
    owner: index < sects.length * 2 ? currentSectName(state, sects[index % sects.length]) : null,
    defenders: []
  }));
}

function createNeutralProvinceState() {
  return provinces.map((province) => ({
    id: province.id,
    owner: null,
    defenders: []
  }));
}

function provinceById(id) {
  return provinces.find((province) => province.id === id);
}

function provinceStateById(state, id) {
  return (state.provinces || []).find((province) => province.id === id);
}

function allCultivators(state) {
  return [
    { entity: state.player, kind: "player" },
    ...state.npcs.map((npc) => ({ entity: npc, kind: "npc" }))
  ];
}

function cultivatorById(state, id) {
  return allCultivators(state).find((item) => item.entity.id === id)?.entity || null;
}

export function getCombatSnapshot(entity, state) {
  return combatSnapshot(entity, state);
}

export function getEffectiveSkillSnapshot(entity) {
  return effectiveSkillForEntity(entity);
}

function combatAverage(values) {
  const numbers = (values || []).map(Number).filter(Number.isFinite);
  return numbers.length ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length : 0;
}

function pushCombatDailyScore(store, id, day, score) {
  if (!id || !day || !Number.isFinite(Number(score))) return;
  if (!store.has(id)) store.set(id, new Map());
  const daily = store.get(id);
  if (!daily.has(day)) daily.set(day, []);
  daily.get(day).push(clamp(Number(score), 0, 100));
}

function combatDayMapScore(dayMap, day) {
  return combatAverage(dayMap?.get(day) || []);
}

function combatComponentSummary(dayMap, currentDay) {
  const entries = [...(dayMap || new Map()).entries()]
    .filter(([day]) => isRecordWithinDays({ day }, currentDay, battleRecordDays))
    .sort(([left], [right]) => right - left);
  if (!entries.length) return { score: combatRatingNeutralScore, activeDays: 0, days: [] };
  let weightedTotal = 0;
  let totalWeight = 0;
  const days = entries.map(([day, values]) => {
    const age = Math.max(0, currentDay - day);
    const weight = Math.max(0.7, 1 - age * (0.3 / Math.max(1, battleRecordDays - 1)));
    const score = clamp(combatAverage(values), 0, 100);
    weightedTotal += score * weight;
    totalWeight += weight;
    return { day, score: Math.round(score * 10) / 10, weight: Math.round(weight * 100) / 100 };
  });
  const activeDays = entries.length;
  const average = totalWeight ? weightedTotal / totalWeight : combatRatingNeutralScore;
  const sampleWeight = Math.min(1, activeDays / combatRatingMinimumDays);
  const score = average * sampleWeight + combatRatingNeutralScore * (1 - sampleWeight);
  return { score: Math.round(score * 10) / 10, activeDays, days };
}

function combatDungeonDailyScores(state, contextIds, outputIds = contextIds) {
  const systems = { blood: new Map(), void: new Map(), sea: new Map() };
  for (const dayRecord of state.dungeonDays || []) {
    const day = Number(dayRecord?.day || 0);
    if (!day || !isRecordWithinDays(dayRecord, state.day, battleRecordDays)) continue;

    const caves = dayRecord.bloodTrial?.caves || [];
    if (caves.length) {
      const maxCave = Math.max(1, ...caves
        .filter((cave) => (cave.challengers || []).length || (cave.clears || []).length)
        .map((cave) => Number(cave.cave || 0)));
      const maxOutputByCave = new Map(caves.map((cave) => [
        Number(cave.cave || 0),
        Math.max(1, ...(cave.challengers?.length ? cave.challengers : cave.clears || []).map((entry) => Number(entry.output || 0)))
      ]));
      const bloodByPerson = new Map();
      for (const cave of caves) {
        const caveIndex = Number(cave.cave || 0);
        const clearedIds = new Set((cave.clears || []).map((entry) => entry.id));
        const challengers = cave.challengers?.length ? cave.challengers : cave.clears || [];
        for (const entry of challengers) {
          if (!contextIds.has(entry?.id)) continue;
          const current = bloodByPerson.get(entry.id) || { attempted: 0, clears: 0, final: null, finalCave: 0 };
          const success = typeof entry.success === "boolean" ? entry.success : clearedIds.has(entry.id);
          current.attempted = Math.max(current.attempted, caveIndex);
          if (success) current.clears = Math.max(current.clears, caveIndex);
          if (caveIndex >= current.finalCave) {
            current.finalCave = caveIndex;
            current.final = { ...entry, success, monsterMaxHp: cave.monster?.maxHp || 0 };
          }
          bloodByPerson.set(entry.id, current);
        }
      }
      for (const [id, result] of bloodByPerson) {
        if (!outputIds.has(id)) continue;
        const final = result.final || {};
        const fallbackOutput = maxOutputByCave.get(result.finalCave) || 1;
        const damageRate = final.success
          ? 1
          : clamp(Number(final.output || 0) / Math.max(1, Number(final.monsterMaxHp || fallbackOutput)), 0, 1);
        const progress = clamp((Math.max(0, result.attempted - 1) + damageRate) / maxCave, 0, 1);
        const survival = final.success && Number(final.startHp || 0) > 0
          ? clamp(Number(final.endHp || 0) / Number(final.startHp), 0, 1)
          : 0;
        const maxRounds = Math.max(2, 13 + result.finalCave);
        const efficiency = final.success
          ? clamp(1 - (Math.max(1, Number(final.rounds || maxRounds)) - 1) / (maxRounds - 1), 0, 1)
          : 0;
        pushCombatDailyScore(systems.blood, id, day, 20 + progress * 55 + survival * 15 + efficiency * 10);
      }
    } else if (dayRecord.solo?.length) {
      const maxClears = Math.max(1, ...dayRecord.solo.map((entry) => Number(entry.clears || 0)));
      const maxDamage = Math.max(1, ...dayRecord.solo.map((entry) => Number(entry.damage || 0)));
      for (const entry of dayRecord.solo) {
        if (!contextIds.has(entry?.id) || !outputIds.has(entry.id)) continue;
        const depth = clamp(Number(entry.clears || 0) / maxClears, 0, 1);
        const output = clamp(Number(entry.damage || 0) / maxDamage, 0, 1);
        pushCombatDailyScore(systems.blood, entry.id, day, 20 + depth * 60 + output * 20);
      }
    }

    for (const record of dayRecord.sects || []) {
      const contributions = (record.battles || [])
        .map((battle) => ({ id: battle.challenger?.id, damage: Number(battle.damage || 0) }))
        .filter((entry) => contextIds.has(entry.id));
      if (!contributions.length) continue;
      const totalDamage = Math.max(0, Number(record.totalDamage || contributions.reduce((sum, entry) => sum + entry.damage, 0)));
      const averageDamage = totalDamage / contributions.length;
      const progress = clamp(totalDamage / Math.max(1, Number(record.requiredDamage || record.monsterStats?.maxHp || totalDamage)), 0, 1);
      for (const entry of contributions) {
        if (!outputIds.has(entry.id)) continue;
        const relativeContribution = averageDamage > 0 ? entry.damage / averageDamage : 0;
        const score = (record.success ? 55 : 25) + clamp(relativeContribution / 2, 0, 1) * 30 + progress * 15;
        pushCombatDailyScore(systems.void, entry.id, day, score);
      }
    }

    const teams = dayRecord.public?.teams || [];
    const maxSpeedBonus = Math.max(1, ...teams.map((team) => Number(team.speedBonus || 0)));
    for (const team of teams) {
      const members = (team.members || []).filter((member) => contextIds.has(member?.id));
      if (!members.length) continue;
      const averageDamage = Number(team.damage || members.reduce((sum, member) => sum + Number(member.damage || 0), 0)) / members.length;
      const rankBonus = teams.length > 1
        ? clamp((teams.length - Number(team.rank || teams.length)) / (teams.length - 1), 0, 1) * 20
        : 20;
      const speedScore = team.success ? clamp(Number(team.speedBonus || 0) / maxSpeedBonus, 0, 1) * 5 : 0;
      for (const member of members) {
        if (!outputIds.has(member.id)) continue;
        const relativeContribution = averageDamage > 0 ? Number(member.damage || 0) / averageDamage : 0;
        const score = (team.success ? 50 : 25) + rankBonus + clamp(relativeContribution / 2, 0, 1) * 25 + speedScore;
        pushCombatDailyScore(systems.sea, member.id, day, score);
      }
    }
  }

  const combined = new Map();
  for (const id of outputIds) {
    const days = new Set();
    for (const store of Object.values(systems)) {
      for (const day of store.get(id)?.keys() || []) days.add(day);
    }
    for (const day of days) {
      const parts = [
        { score: combatDayMapScore(systems.blood.get(id), day), weight: 0.4, present: systems.blood.get(id)?.has(day) },
        { score: combatDayMapScore(systems.void.get(id), day), weight: 0.3, present: systems.void.get(id)?.has(day) },
        { score: combatDayMapScore(systems.sea.get(id), day), weight: 0.3, present: systems.sea.get(id)?.has(day) }
      ].filter((part) => part.present);
      const totalWeight = parts.reduce((sum, part) => sum + part.weight, 0);
      if (totalWeight) pushCombatDailyScore(combined, id, day, parts.reduce((sum, part) => sum + part.score * part.weight, 0) / totalWeight);
    }
  }
  return combined;
}

function combatRankIndex(ref) {
  const rankId = ref?.rankId || ref?.duelSeason?.rankId;
  const explicitIndex = duelRanks.findIndex((rank) => rank.id === rankId);
  if (explicitIndex >= 0) return explicitIndex;
  const score = Number(ref?.duelSeason?.score);
  const derivedRank = Number.isFinite(score) ? duelRankForScore(score) : null;
  return Math.max(0, duelRanks.findIndex((rank) => rank.id === derivedRank?.id));
}

function combatDuelDailyScores(state, rosterIds) {
  const daily = new Map();
  const recordsByDay = new Map();
  for (const record of state.duelDays || []) recordsByDay.set(Number(record.day || 0), record);
  for (const tournament of [state.duelTournament, ...(state.duelTournamentHistory || [])]) {
    for (const round of tournament?.rounds || []) recordsByDay.set(Number(round.day || 0), { ...round, tournament: true });
  }
  for (const [day, record] of recordsByDay) {
    if (!day || !isRecordWithinDays({ day }, state.day, battleRecordDays)) continue;
    const tournamentBonus = record.tournament ? Math.min(10, Math.max(0, Number(record.round || 1)) * 2.5) : 0;
    for (const match of record.matches || []) {
      if (match.type !== "battle") continue;
      const winner = match.winner;
      const loser = match.loser;
      if (rosterIds.has(winner?.id)) {
        const rankAdjustment = clamp((combatRankIndex(loser) - combatRankIndex(winner)) * 7.5, -15, 15);
        pushCombatDailyScore(daily, winner.id, day, 70 + rankAdjustment + tournamentBonus);
      }
      if (rosterIds.has(loser?.id)) {
        const rankAdjustment = clamp((combatRankIndex(winner) - combatRankIndex(loser)) * 7.5, -15, 15);
        pushCombatDailyScore(daily, loser.id, day, 30 + rankAdjustment + tournamentBonus);
      }
    }
  }
  return daily;
}

function combatProvinceDailyScores(state, contextIds, outputIds = contextIds) {
  const daily = new Map();
  for (const war of state.provinceWars || []) {
    const day = Number(war?.day || 0);
    if (!day || !isRecordWithinDays(war, state.day, battleRecordDays)) continue;
    const warScores = new Map();
    for (const battle of war.battles || []) {
      for (const side of ["attacker", "defender"]) {
        const person = battle?.[side];
        if (!contextIds.has(person?.id)) continue;
        const opponent = battle?.[side === "attacker" ? "defender" : "attacker"];
        const won = battle.winnerSide === side;
        const realmAdjustment = clamp((Number(opponent?.realm || 0) - Number(person.realm || 0)) * 3, -15, 15);
        const current = warScores.get(person.id) || { side, scores: [], wins: 0 };
        current.scores.push((won ? 70 : 30) + realmAdjustment);
        if (won) current.wins += 1;
        warScores.set(person.id, current);
      }
    }
    const winningSide = war.kind === "monster" ? (!war.captured ? "defender" : "attacker") : (war.captured ? "attacker" : "defender");
    for (const [id, result] of warScores) {
      if (!outputIds.has(id)) continue;
      const streakBonus = Math.min(15, Math.max(0, result.wins - 1) * 5);
      const objectiveBonus = result.side === winningSide ? 10 : 0;
      pushCombatDailyScore(daily, id, day, combatAverage(result.scores) + streakBonus + objectiveBonus);
    }
  }
  return daily;
}

function buildCombatRatingEntry(entity, currentDay, dungeonDaily, duelDaily, provinceDaily) {
  const dungeon = combatComponentSummary(dungeonDaily.get(entity.id), currentDay);
  const duel = combatComponentSummary(duelDaily.get(entity.id), currentDay);
  const province = combatComponentSummary(provinceDaily.get(entity.id), currentDay);
  const activeDaySet = new Set([...dungeon.days, ...duel.days, ...province.days].map((entry) => entry.day));
  const daily = [...activeDaySet]
    .sort((left, right) => right - left)
    .map((day) => {
      const available = [
        { key: "dungeon", score: dungeon.days.find((entry) => entry.day === day)?.score, weight: combatRatingWeights.dungeon },
        { key: "duel", score: duel.days.find((entry) => entry.day === day)?.score, weight: combatRatingWeights.duel },
        { key: "province", score: province.days.find((entry) => entry.day === day)?.score, weight: combatRatingWeights.province }
      ].filter((part) => Number.isFinite(part.score));
      const totalWeight = available.reduce((sum, part) => sum + part.weight, 0);
      return {
        day,
        score: totalWeight ? Math.round(available.reduce((sum, part) => sum + part.score * part.weight, 0) / totalWeight * 10) / 10 : combatRatingNeutralScore,
        dungeonScore: available.find((part) => part.key === "dungeon")?.score ?? null,
        duelScore: available.find((part) => part.key === "duel")?.score ?? null,
        provinceScore: available.find((part) => part.key === "province")?.score ?? null
      };
    });
  const score = Math.round((
    dungeon.score * combatRatingWeights.dungeon
    + duel.score * combatRatingWeights.duel
    + province.score * combatRatingWeights.province
  ) * 10);
  return {
    id: entity.id,
    score,
    dungeonScore: dungeon.score,
    duelScore: duel.score,
    provinceScore: province.score,
    activeDays: activeDaySet.size,
    dungeonDays: dungeon.activeDays,
    duelDays: duel.activeDays,
    provinceDays: province.activeDays,
    sampleEnough: activeDaySet.size >= combatRatingMinimumDays,
    daily
  };
}

function buildCombatRatingFor(state, id) {
  const entity = allCultivators(state).find((item) => item.entity.id === id)?.entity;
  if (!entity) return null;
  const currentDay = Math.max(1, Number(state.day || 1));
  const contextIds = new Set(allCultivators(state).map((item) => item.entity.id));
  const outputIds = new Set([id]);
  const dungeonDaily = combatDungeonDailyScores(state, contextIds, outputIds);
  const duelDaily = combatDuelDailyScores(state, outputIds);
  const provinceDaily = combatProvinceDailyScores(state, contextIds, outputIds);
  return buildCombatRatingEntry(entity, currentDay, dungeonDaily, duelDaily, provinceDaily);
}

export function buildCombatRatings(state) {
  const currentDay = Math.max(1, Number(state.day || 1));
  const roster = allCultivators(state);
  const rosterIds = new Set(roster.map(({ entity }) => entity.id));
  const dungeonDaily = combatDungeonDailyScores(state, rosterIds);
  const duelDaily = combatDuelDailyScores(state, rosterIds);
  const provinceDaily = combatProvinceDailyScores(state, rosterIds);
  const entries = roster.map(({ entity }) => buildCombatRatingEntry(entity, currentDay, dungeonDaily, duelDaily, provinceDaily));
  const rankingsByDay = new Map();
  for (const entry of entries) {
    for (const daily of entry.daily) {
      if (!rankingsByDay.has(daily.day)) rankingsByDay.set(daily.day, []);
      rankingsByDay.get(daily.day).push({ id: entry.id, daily });
    }
  }
  for (const participants of rankingsByDay.values()) {
    participants.sort((left, right) => right.daily.score - left.daily.score || left.id.localeCompare(right.id));
    const participantCount = participants.length;
    participants.forEach(({ daily }, index) => {
      daily.rank = index + 1;
      daily.participantCount = participantCount;
      daily.rankPoints = participantCount === 1
        ? 200
        : Math.round(200 - index * 199 / (participantCount - 1));
    });
  }
  entries.sort((left, right) => Number(right.sampleEnough) - Number(left.sampleEnough) || right.score - left.score || right.activeDays - left.activeDays);
  return {
    windowDays: battleRecordDays,
    windowStartDay: minDayForWindow(currentDay, battleRecordDays),
    windowEndDay: currentDay,
    minimumActiveDays: combatRatingMinimumDays,
    weights: { ...combatRatingWeights },
    entries
  };
}

function dailyRankingRankPoints(rank, participantCount) {
  if (participantCount <= 1) return 200;
  return Math.round(200 - (rank - 1) * 199 / (participantCount - 1));
}

function personRecordForDay(entity, day) {
  return (entity.dailyRecords || []).find((record) => Number(record.day) === Number(day));
}

function estimatedPowerForDay(entity, day, state) {
  if (Number(day) === Number(state.day)) return powerOf(entity, state);
  const savedPower = Number(personRecordForDay(entity, day)?.power);
  if (Number.isFinite(savedPower) && savedPower > 0) return savedPower;

  const historical = { ...entity };
  for (const record of entity.breakthroughs || []) {
    if (!record.success || Number(record.day || 0) <= day) continue;
    const growth = record.growth || {};
    historical.maxHp = Math.max(1, Number(historical.maxHp || 0) - Number(growth.maxHp || 0));
    historical.attack = Math.max(1, Number(historical.attack || 0) - Number(growth.attack || 0));
    historical.defense = Math.max(0, Number(historical.defense || 0) - Number(growth.defense || 0));
    historical.divineSense = Math.max(0, Number(historical.divineSense || 0) - Number(growth.divineSense || 0));
    historical.maxMana = Math.max(1, Number(historical.maxMana || 0) - Number(growth.maxMana || 0));
  }
  historical.hp = historical.maxHp;
  historical.mana = historical.maxMana;
  return powerOf(historical, state, { day });
}

function duelScoreForDay(entity, day) {
  const savedScore = Number(personRecordForDay(entity, day)?.duelScore);
  if (Number.isFinite(savedScore) && savedScore >= 0) return savedScore;

  const season = duelSeasonOfDay(day);
  const currentSeason = Number(entity.duelSeason?.season) || duelSeasonOfDay(day);
  const completedSeason = (entity.duelSeasonHistory || []).find((record) => Number(record.season) === season);
  let score = season === currentSeason
    ? Number(entity.duelSeason?.score || 0)
    : Number(completedSeason?.score || 0);
  for (const record of entity.duelHistory || []) {
    if (Number(record.season || duelSeasonOfDay(record.day)) !== season) continue;
    if (Number(record.day || 0) > day) score -= Number(record.scoreDelta || 0);
  }
  return clamp(Math.round(score), 0, duelSeasonMaxScore);
}

function buildDailyRankingTrends(state, id) {
  const currentDay = Math.max(1, Number(state.day || 1));
  const startDay = Math.max(1, currentDay - battleRecordDays + 1);
  const roster = allCultivators(state).map(({ entity }) => entity);
  const trends = { power: [], duel: [] };

  for (let day = startDay; day <= currentDay; day += 1) {
    const powerRows = roster
      .map((entity) => ({ entity, value: estimatedPowerForDay(entity, day, state) }))
      .sort((left, right) => right.value - left.value || left.entity.id.localeCompare(right.entity.id));
    const duelRows = roster
      .map((entity) => ({ entity, value: duelScoreForDay(entity, day) }))
      .sort((left, right) => right.value - left.value
        || estimatedPowerForDay(right.entity, day, state) - estimatedPowerForDay(left.entity, day, state)
        || left.entity.id.localeCompare(right.entity.id));
    const participantCount = roster.length;
    const powerIndex = powerRows.findIndex((row) => row.entity.id === id);
    const duelIndex = duelRows.findIndex((row) => row.entity.id === id);
    if (powerIndex >= 0) {
      const rank = powerIndex + 1;
      trends.power.push({
        day,
        rank,
        participantCount,
        rankPoints: dailyRankingRankPoints(rank, participantCount),
        value: powerRows[powerIndex].value
      });
    }
    if (duelIndex >= 0) {
      const rank = duelIndex + 1;
      const score = duelRows[duelIndex].value;
      trends.duel.push({
        day,
        rank,
        participantCount,
        rankPoints: dailyRankingRankPoints(rank, participantCount),
        value: score,
        rankName: duelRankForScore(score).name
      });
    }
  }
  return trends;
}

function captureDailyRankSnapshots(state) {
  const roster = allCultivators(state).map(({ entity }) => entity);
  const powerRows = roster
    .map((entity) => ({ entity, value: powerOf(entity, state) }))
    .sort((left, right) => right.value - left.value || left.entity.id.localeCompare(right.entity.id));
  const duelRows = roster
    .map((entity) => ({ entity, value: Number(entity.duelSeason?.score || 0) }))
    .sort((left, right) => right.value - left.value
      || powerOf(right.entity, state) - powerOf(left.entity, state)
      || left.entity.id.localeCompare(right.entity.id));
  const powerRanks = new Map(powerRows.map((row, index) => [row.entity.id, { rank: index + 1, value: row.value }]));
  const duelRanksById = new Map(duelRows.map((row, index) => [row.entity.id, { rank: index + 1, value: row.value }]));

  for (const entity of roster) {
    const record = personRecordForDay(entity, state.day);
    if (!record) continue;
    const power = powerRanks.get(entity.id);
    const duel = duelRanksById.get(entity.id);
    record.power = power?.value || powerOf(entity, state);
    record.powerRank = power?.rank || 0;
    record.duelScore = duel?.value || 0;
    record.duelRank = duel?.rank || 0;
    record.duelRankName = duelRankForScore(record.duelScore).name;
  }
}

function membersForSect(state, sectName) {
  return allCultivators(state)
    .filter((item) => (item.entity.id === "player" ? state.sect.name : item.entity.sect) === sectName)
    .sort((a, b) => powerOf(b.entity, state) - powerOf(a.entity, state));
}

function membersForSectAscending(state, sectName) {
  return [...membersForSect(state, sectName)].sort((a, b) => powerOf(a.entity, state) - powerOf(b.entity, state));
}

function stageIndexOfRealm(realm) {
  return clamp(Math.floor((realm || 0) / 10), 0, realmStages.length - 1);
}

function monsterSkillRankForRealm(realm) {
  return clamp(stageIndexOfRealm(realm) + 1, 1, maxSkillRank);
}

function capRealm(realm) {
  return clamp(Math.floor(realm || 0), 0, realms.length - 1);
}

function topRealmOfStage(stageIndex) {
  return capRealm(stageIndex * 10 + 9);
}

function voidHallMonsterRealmForHighestRealm(highestRealm) {
  const safeRealm = capRealm(highestRealm);
  const stage = stageIndexOfRealm(safeRealm);
  const level = safeRealm % 10;
  if (level <= 4) return capRealm(stage * 10 + 9);
  if (stage >= realmStages.length - 1) return capRealm(stage * 10 + 9);
  return capRealm((stage + 1) * 10);
}

function equipmentTierForRealm(realm) {
  return clamp(1 + Math.floor(stageIndexOfRealm(realm) * 0.72), 1, equipmentTiers.length);
}

function baseMonsterName(name = "") {
  const text = String(name || "");
  return monsterNames.find((monsterName) => text.includes(monsterName)) || text.replace(/^.*?·/, "").replace(/王$/, "");
}

function monsterArchetypeForName(name = "") {
  return monsterArchetypeById[monsterArchetypeByName[baseMonsterName(name)]] || monsterArchetypes[3];
}

function monsterSkillForArchetype(name, archetype) {
  const ids = (archetype?.skillIds || []).filter((id) => combatSkills.some((skill) => skill.id === id));
  if (!ids.length) return randomSkillId();
  return ids[stableHash(name) % ids.length];
}

function applyMonsterArchetypeStats(stats, archetype) {
  const multipliers = archetype?.multipliers || {};
  return {
    maxHp: Math.max(1, Math.floor(stats.maxHp * (multipliers.maxHp || 1))),
    maxMana: Math.max(1, Math.floor(stats.maxMana * (multipliers.maxMana || 1))),
    attack: Math.max(1, Math.floor(stats.attack * (multipliers.attack || 1))),
    defense: Math.max(0, Math.floor(stats.defense * (multipliers.defense || 1))),
    divineSense: Math.max(1, Math.floor(stats.divineSense * (multipliers.divineSense || 1)))
  };
}

function makeMonster(name, realm, rootKey, intensity = 1, archetypeId = "", random = Math.random, options = {}) {
  const stats = rollBirthStats(capRealm(realm), random);
  const monsterRootKey = rootKey || pick(roots).key;
  const monsterRoot = roots.find((root) => root.key === monsterRootKey) || roots[0];
  const monsterRootBonus = monsterRootKey === "heaven"
    ? 0
    : Math.round((monsterRoot.min + random() * (monsterRoot.max - monsterRoot.min)) * 1000) / 1000;
  const archetype = monsterArchetypeById[archetypeId] || monsterArchetypeForName(name);
  const baseStats = {
    attack: Math.max(stats.attack + 2, Math.floor(stats.attack * (1.16 + intensity * 0.1))),
    defense: Math.max(stats.defense + 1, Math.floor(stats.defense * (1.14 + intensity * 0.08))),
    maxHp: Math.floor(stats.maxHp * (1.34 + intensity * 0.24)),
    maxMana: Math.floor(stats.maxMana * (1.08 + intensity * 0.1)),
    divineSense: Math.floor(stats.divineSense * (1.12 + intensity * 0.08))
  };
  const archetypeStats = applyMonsterArchetypeStats(baseStats, archetype);
  const monster = {
    id: `monster-${stateSafeId(name)}-${realm}-${Math.floor(random() * 100000)}`,
    name,
    realm: capRealm(realm),
    root: normalizeRoot({ key: monsterRootKey, bonus: monsterRootBonus }),
    roots: [],
    primaryRootKey: monsterRootKey,
    attack: archetypeStats.attack,
    defense: archetypeStats.defense,
    maxHp: archetypeStats.maxHp,
    hp: 1,
    maxMana: archetypeStats.maxMana,
    mana: 1,
    divineSense: archetypeStats.divineSense,
    archetype: archetype.id,
    archetypeLabel: archetype.label,
    archetypeText: archetype.text,
    skillId: options.unrestrictedSkills ? randomSkillId(random) : monsterSkillForArchetype(name, archetype)
  };
  monster.skillRanks = { [monster.skillId]: clamp(Math.floor(Number(options.skillRank) || monsterSkillRankForRealm(realm)), 1, maxSkillRank) };
  applyRootSet(monster);
  if (monster.primaryRootKey === "heaven") monster.root.bonus = 0;
  monster.roots = [{ ...monster.root }];
  monster.hp = monster.maxHp;
  monster.mana = monster.maxMana;
  return monster;
}

function stateSafeId(text) {
  return String(text || "monster").replace(/[^\w-]+/g, "-").slice(0, 30);
}

function replayIdPart(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "x";
}

function makeReplayId(...parts) {
  return parts.map(replayIdPart).join("-");
}

function fightMonster(state, entity, monster, maxRounds = 18, start = {}) {
  const maxHp = effectiveMaxHp(entity, state);
  const maxMana = effectiveMaxMana(entity, state);
  const left = {
    ...entity,
    hp: clamp(start.hp ?? maxHp, 1, maxHp),
    mana: clamp(start.mana ?? maxMana, 0, maxMana)
  };
  const right = {
    ...monster,
    hp: clamp(start.monsterHp ?? monster.hp ?? monster.maxHp, 0, monster.maxHp),
    mana: clamp(start.monsterMana ?? monster.mana ?? monster.maxMana, 0, monster.maxMana)
  };
  return runTurnBattle(left, right, { maxRounds, state, seed: start.seed, trialCompanion: start.trialCompanion });
}

function ensureDungeonState(state) {
  const previousDungeonRecordVersion = Number(state.dungeonRecordVersion || 1);
  state.dungeonDays ??= [];
  state.dungeonDays = trimRecordsByDay(state.dungeonDays, state.day, battleRecordDays, battleRecordDays);
  for (const record of state.dungeonDays) {
    record.voidHallSpiritPools ??= buildVoidHallSpiritPools(state, record.day || state.day);
  }
  for (const { entity } of allCultivators(state)) {
    entity.dungeonHistory ??= [];
    entity.dungeonHistory = trimRecordsByDay(entity.dungeonHistory, state.day, battleRecordDays, detailRecordLimit);
  }
  if (previousDungeonRecordVersion < dungeonRecordVersion) {
    migrateStarSeaSpiritRewards(state);
    if (previousDungeonRecordVersion < 4) {
      state.dungeonDays = [];
      state.starSeaCycle = null;
      for (const { entity } of allCultivators(state)) {
        entity.dungeonHistory = [];
        entity.dungeonClears = 0;
        entity.bestDungeonPower = 0;
        entity.bestDungeonName = "未入秘境";
      }
    }
    state.dungeonRecordVersion = dungeonRecordVersion;
  }
}

function pushDungeonHistory(entity, entry) {
  entity.dungeonHistory ??= [];
  entity.dungeonHistory.unshift(entry);
  entity.dungeonHistory = trimRecordsByDay(entity.dungeonHistory, entry.day, battleRecordDays, detailRecordLimit);
}

function updateDungeonBest(entity, name, score, clears = 1) {
  entity.dungeonClears = (entity.dungeonClears || 0) + clears;
  if (score > (entity.bestDungeonPower || 0)) {
    entity.bestDungeonPower = score;
    entity.bestDungeonName = name;
  }
}

function publicMonster(monster) {
  return {
    id: monster.id,
    name: monster.name,
    realm: realms[monster.realm],
    realmIndex: monster.realm,
    root: monster.root,
    roots: (monster.roots || []).map((root) => ({ ...root })),
    primaryRootKey: monster.primaryRootKey,
    rootName: primaryRoot(monster).name,
    skillId: monster.skillId,
    skillRank: skillRankOf(monster, monster.skillId),
    effectiveSkill: effectiveSkillForEntity(monster),
    skill: findSkill(monster.skillId)?.name || "妖兽本能",
    lawId: monster.lawId || "",
    lawStack: Number(monster.lawStack) || 0,
    law: monster.lawId ? publicTrialLaw(daoTrialLawMap[monster.lawId], Number(monster.lawStack) || 1) : null,
    archetype: monster.archetype || monsterArchetypeForName(monster.name).id,
    archetypeLabel: monster.archetypeLabel || monsterArchetypeForName(monster.name).label,
    archetypeText: monster.archetypeText || monsterArchetypeForName(monster.name).text,
    maxHp: monster.maxHp,
    attack: monster.attack,
    defense: monster.defense,
    divineSense: monster.divineSense,
    maxMana: monster.maxMana
  };
}

function publicGroupDungeonReplay(name, monster, contributions, success, totalDamage, requiredDamage, state, focusId = "") {
  const shown = contributions.slice(0, 8);
  const monsterPower = powerOf(monster, state);
  const startHp = Math.max(1, Math.floor(requiredDamage || monsterPower));
  const focus = shown.find((entry) => entry.entity.id === focusId)?.entity || shown[0]?.entity || { id: "", name: name, realm: 0, sect: "" };
  const teamStartHp = Math.max(effectiveMaxHp(focus, state), Math.floor(startHp * 0.42));
  const teamStartMana = Math.max(effectiveMaxMana(focus, state), 1);
  let remaining = startHp;
  let teamHp = teamStartHp;
  let teamMana = teamStartMana;
  const events = [{ round: 1, kind: "round", text: `${name}讨伐开始，众修士结阵迎敌。`, leftHp: teamHp, rightHp: remaining, leftMana: teamMana, rightMana: monster.maxMana }];
  shown.forEach(({ entity, damage }, index) => {
    const dealt = Math.max(1, Math.floor(damage || 0));
    remaining = Math.max(0, remaining - dealt);
    teamHp = Math.max(success ? 1 : 0, teamHp - Math.max(1, Math.floor(monster.attack * (0.18 + index * 0.01))));
    teamMana = Math.max(0, teamMana - Math.max(1, Math.floor(effectiveMaxMana(entity, state) * 0.04)));
    events.push({
      round: index + 1,
      kind: "attack",
      actor: entity.name,
      text: `${entity.name}催动法术，击中${monster.name}，造成 ${dealt} 点伤害。`,
      leftHp: teamHp,
      rightHp: remaining,
      leftMana: teamMana,
      rightMana: Math.max(0, monster.maxMana - (index + 1) * 6)
    });
  });
  events.push({
    round: shown.length + 1,
    kind: "finish",
    text: success ? `${monster.name}妖气溃散，${name}讨伐成功，总输出 ${totalDamage}。` : `${monster.name}仍守住阵眼，${name}未能攻破，总输出 ${totalDamage} / ${requiredDamage}。`,
    leftHp: success ? Math.max(1, teamHp) : 0,
    rightHp: success ? 0 : remaining,
    leftMana: teamMana,
    rightMana: 0
  });
  return {
    kind: "dungeon",
    result: success ? "胜" : "负",
    winner: success ? "left" : "right",
    foughtAt: timestampKey(),
    left: {
      ...entityRef(focus, focus.id === "player" ? "player" : "npc"),
      power: Math.round(totalDamage),
      stats: { hp: teamStartHp, mana: teamStartMana, attack: Math.round(totalDamage / Math.max(1, shown.length)), defense: effectiveDefense(focus, state), divineSense: effectiveDivineSense(focus, state) },
      baseStats: effectiveStats(focus, state),
      rootCounterPenalty: 0,
      startHp: teamStartHp,
      startMana: teamStartMana,
      endHp: success ? Math.max(1, teamHp) : 0,
      endMana: teamMana
    },
    right: {
      ...entityRef(monster, "monster"),
      power: monsterPower,
      stats: effectiveStats(monster, state),
      baseStats: effectiveStats(monster, state),
      rootCounterPenalty: 0,
      startHp,
      startMana: monster.maxMana,
      endHp: success ? 0 : remaining,
      endMana: 0
    },
    events
  };
}

function publicStarSeaReplay(monsters, contributions, killed, state) {
  const target = monsters[Math.min(monsters.length - 1, Math.max(0, killed - 1))] || monsters[0];
  const requiredDamage = monsters.reduce((sum, monster) => sum + Math.floor(powerOf(monster, state) * 0.55), 0);
  const totalDamage = contributions.reduce((sum, entry) => sum + entry.damage, 0);
  const replay = publicGroupDungeonReplay("乱星海猎妖", target, contributions.slice(0, 10), killed > 0, totalDamage, requiredDamage, state);
  replay.replayId = makeReplayId("star-sea", state.day, target.id || target.name, "overview");
  return replay;
}

function publicStarSeaTeamReplay(teamRecord, monster, state) {
  return {
    kind: "starSeaTeam",
    replayId: makeReplayId("star-sea", state.day, teamRecord.id || teamRecord.name, teamRecord.rank || "team"),
    result: teamRecord.success ? "胜" : "负",
    winner: teamRecord.success ? "team" : "monster",
    foughtAt: timestampKey(),
    team: {
      id: teamRecord.id,
      name: teamRecord.name,
      rank: teamRecord.rank,
      score: teamRecord.score,
      spirit: teamRecord.spirit,
      success: teamRecord.success,
      rounds: teamRecord.rounds,
      damage: teamRecord.damage,
      speedBonus: teamRecord.speedBonus,
      members: teamRecord.members
    },
    monster: {
      ...publicMonster(monster),
      maxHp: teamRecord.monsterMaxHp || monster.maxHp,
      maxMana: teamRecord.monsterMaxMana || monster.maxMana,
      startHp: teamRecord.monsterMaxHp || monster.maxHp,
      endHp: teamRecord.monsterRemainingHp,
      startMana: teamRecord.monsterMaxMana || monster.maxMana,
      endMana: teamRecord.monsterEndMana ?? 0,
      rootCounterPenalty: teamRecord.monsterCounterPenalty || 0,
      power: powerOf(monster, state)
    },
    events: teamRecord.events || []
  };
}

function createBloodTrialCave(caveIndex) {
  const stage = clamp(caveIndex, 0, realmStages.length - 1);
  const realm = topRealmOfStage(stage);
  const stageMonsterNames = monsterNamesByStage[stage] || monsterNames;
  const monsterName = pick(stageMonsterNames);
  const archetype = monsterArchetypeForName(monsterName);
  return {
    cave: caveIndex + 1,
    name: dungeonTierNames[stage],
    monster: makeMonster(`${dungeonTierNames[stage]}·${monsterName}`, realm, pick(roots).key, 0.8 + caveIndex * 0.18, archetype.id),
    clears: [],
    challengers: []
  };
}

function ensureBloodTrialCave(caves, caveIndex) {
  if (caveIndex < 0 || caveIndex >= realmStages.length) return null;
  if (!caves[caveIndex]) caves[caveIndex] = createBloodTrialCave(caveIndex);
  return caves[caveIndex];
}

function createBloodTrialCaves() {
  return [createBloodTrialCave(0)];
}

function rollSpiritFromRange(range) {
  return Math.floor((range?.min || 0) + Math.random() * Math.max(1, (range?.max || 0) - (range?.min || 0) + 1));
}

function bloodClearHpLossRate(entry) {
  const startHp = Number(entry?.startHp || 0);
  if (!Number.isFinite(startHp) || startHp <= 0) return 1;
  const endHp = clamp(Number(entry?.endHp ?? startHp), 0, startHp);
  return Math.max(0, Math.min(1, (startHp - endHp) / startHp));
}

function bloodClearManaRemainRate(entry) {
  const startMana = Number(entry?.startMana || 0);
  if (!Number.isFinite(startMana) || startMana <= 0) return 0;
  const endMana = clamp(Number(entry?.endMana ?? startMana), 0, startMana);
  return Math.max(0, Math.min(1, endMana / startMana));
}

function bloodClearScoreValue(entry) {
  const explicit = Number(entry?.score);
  if (Number.isFinite(explicit) && explicit > 0) return Math.floor(explicit);
  const output = Math.max(0, Number(entry?.output) || 0);
  if (!output) return 0;
  const rounds = Math.max(1, Number(entry?.rounds) || 999);
  const hpRemainRate = 1 - bloodClearHpLossRate(entry);
  const manaRemainRate = bloodClearManaRemainRate(entry);
  const survivalScore = Math.round(output * 0.38 * hpRemainRate);
  const manaScore = Math.round(output * 0.12 * manaRemainRate);
  const speedScore = Math.round(output * 0.18 / Math.sqrt(rounds));
  return Math.max(1, output + survivalScore + manaScore + speedScore);
}

function compareBloodClearScore(a, b) {
  return bloodClearScoreValue(b) - bloodClearScoreValue(a)
    || (a.rounds || 999) - (b.rounds || 999)
    || bloodClearHpLossRate(a) - bloodClearHpLossRate(b)
    || (b.output || 0) - (a.output || 0);
}

function compareBloodEntry(a, b) {
  const successDelta = Number(Boolean(b.success)) - Number(Boolean(a.success));
  if (successDelta) return successDelta;
  if (a.success && b.success) return compareBloodClearScore(a, b);
  return (b.output || 0) - (a.output || 0) || (a.rounds || 999) - (b.rounds || 999);
}

function distributeBasePool(total, entries) {
  if (!entries.length || total <= 0) return;
  const base = Math.max(1, Math.floor(total / entries.length));
  for (const entry of entries) entry.spirit = (entry.spirit || 0) + base;
  let remainder = Math.max(0, total - base * entries.length);
  const priority = [...entries].sort(compareBloodClearScore);
  for (let index = 0; remainder > 0; index = (index + 1) % priority.length) {
    priority[index].spirit += 1;
    remainder -= 1;
  }
}

function distributeBonusPool(total, entries) {
  const winners = [...entries]
    .sort(compareBloodClearScore)
    .slice(0, 3);
  if (!winners.length || total <= 0) return;
  const weights = [5, 3, 2].slice(0, winners.length);
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  let assigned = 0;
  winners.forEach((entry, index) => {
    const share = index === winners.length - 1 ? total - assigned : Math.floor(total * weights[index] / weightTotal);
    entry.spirit = (entry.spirit || 0) + Math.max(0, share);
    entry.bonusSpirit = (entry.bonusSpirit || 0) + Math.max(0, share);
    assigned += Math.max(0, share);
  });
}

function settleBloodTrialRewards(state, caves) {
  for (const cave of caves) {
    const stage = stageIndexOfRealm(cave.monster?.realm || 0);
    const poolRange = dungeonLootRules.blood_trial.spiritRange({ cave: cave.cave, stage });
    const bonusRange = dungeonLootRules.blood_trial.bonusRange({ cave: cave.cave, stage });
    const clears = cave.clears || [];
    const basePool = Math.max(clears.length, rollSpiritFromRange(poolRange));
    const bonusPool = rollSpiritFromRange(bonusRange);
    cave.spiritPool = {
      base: basePool,
      bonus: bonusPool,
      total: basePool + bonusPool,
      baseRange: poolRange,
      bonusRange
    };
    distributeBasePool(basePool, clears);
    distributeBonusPool(bonusPool, clears);
    for (const clear of clears) {
      const person = allCultivators(state).find(({ entity }) => entity.id === clear.id)?.entity;
      if (person) person.spirit += clear.spirit || 0;
      if (person) {
        const reward = rollSpiritPearlFragmentReward(state, "blood_trial", {
          success: true,
          stage,
          cave: cave.cave,
          context: `${cave.name}通关`,
          receiver: person,
          pearlId: primaryRoot(person).key
        });
        if (reward) clear.spiritPearl = reward;
      }
      const challenger = (cave.challengers || []).find((entry) => entry.id === clear.id);
      if (challenger) {
        challenger.spirit = clear.spirit || 0;
        challenger.bonusSpirit = clear.bonusSpirit || 0;
        if (clear.spiritPearl) challenger.spiritPearl = clear.spiritPearl;
      }
    }
  }
}

function runSoloDungeonFor(state, entity, date, caves, foughtAt = timestampKey()) {
  let clears = 0;
  let spirit = 0;
  let finalMonster = "";
  let finalRealm = entity.realm;
  let finalOutput = 0;
  let finalRounds = 0;
  let finalReplay = null;
  let drop = null;
  const maxHp = effectiveMaxHp(entity, state);
  const maxMana = effectiveMaxMana(entity, state);
  let runHp = maxHp;
  let runMana = maxMana;

  for (let caveIndex = 0; caveIndex < realmStages.length; caveIndex += 1) {
    const cave = ensureBloodTrialCave(caves, caveIndex);
    if (!cave) break;
    const monster = cave.monster;
    const startHp = runHp;
    const startMana = runMana;
    const battle = fightMonster(state, entity, monster, 13 + cave.cave, { hp: startHp, mana: startMana });
    const replay = buildReplay({ ...entity, hp: startHp, mana: startMana }, { ...monster }, battle, battle.winner === "left" ? "胜" : "负", foughtAt, state);
    replay.replayId = makeReplayId("blood-trial", state.day, cave.cave, entity.id);
    finalMonster = monster.name;
    finalRealm = monster.realm;
    finalReplay = publicReplay(replay);
    const output = Math.max(1, Math.floor(monster.maxHp - battle.rightHp));
    const rounds = Math.max(1, Math.max(...battle.events.map((event) => event.round || 1)));
    const challengeEntry = {
      id: entity.id,
      name: entity.name,
      sect: entity.id === "player" ? state.sect.name : entity.sect,
      realm: entity.realm,
      gender: entity.gender,
      root: entity.root,
      roots: entity.roots,
      primaryRootKey: entity.primaryRootKey,
      skillId: entity.skillId,
      output,
      rounds,
      success: battle.winner === "left",
      startHp,
      startMana,
      endHp: battle.leftHp,
      endMana: battle.leftMana,
      spirit: 0,
      item: "",
      tierName: "",
      replay: finalReplay
    };
    challengeEntry.score = battle.winner === "left" ? bloodClearScoreValue(challengeEntry) : output;
    cave.challengers.push(challengeEntry);
    if (battle.winner !== "left") break;
    runHp = clamp(battle.leftHp + Math.floor(maxHp * 0.5), 1, maxHp);
    runMana = clamp(battle.leftMana + Math.floor(maxMana * 0.5), 0, maxMana);

    clears += 1;
    const tierCap = equipmentTierForRealm(monster.realm);
    const candidate = rollEquipmentDrop(state, tierCap, "blood_trial", { cave: cave.cave });
    const transfer = candidate ? awardEquipment(state, entity, candidate, `${cave.name}通关`) : null;
    if (transfer) drop = transfer;
    finalOutput = output;
    finalRounds = rounds;
    const challenger = cave.challengers.find((item) => item.id === entity.id);
    if (challenger) challenger.spirit = spirit;
    const clearEntry = {
      id: entity.id,
      name: entity.name,
      sect: entity.id === "player" ? state.sect.name : entity.sect,
      realm: entity.realm,
      gender: entity.gender,
      root: entity.root,
      roots: entity.roots,
      primaryRootKey: entity.primaryRootKey,
      skillId: entity.skillId,
      output,
      rounds: finalRounds,
      startHp,
      startMana,
      endHp: battle.leftHp,
      endMana: battle.leftMana,
      spirit,
      item: transfer?.itemName || "",
      tierName: transfer?.tierName || "",
      replay: finalReplay
    };
    clearEntry.score = bloodClearScoreValue(clearEntry);
    cave.clears.push(clearEntry);
  }

  const score = clears ? finalRealm + clears * 8 : stageIndexOfRealm(entity.realm) * 10;
  if (clears) updateDungeonBest(entity, "血色禁地", score, clears);
  if (!clears) addSpiritDust(state, 1, "血色禁地败退", entity);
  const entry = {
    type: "solo",
    name: "血色禁地",
    day: state.day,
    date,
    foughtAt,
    clears,
    spirit,
    monster: finalMonster,
    monsterRealm: realms[finalRealm],
    damage: finalOutput,
    rounds: finalRounds,
    replay: finalReplay,
    item: drop?.itemName || "",
    tierName: drop?.tierName || "",
    compensation: drop?.compensation || 0,
    result: clears ? `连破 ${clears} 洞` : "外谷败退"
  };
  if (finalReplay) queueBattleReplay(state, finalReplay, `blood-trial-${entity.id}-final`);
  for (const cave of caves.slice(0, clears)) {
    const clear = cave.clears.find((item) => item.id === entity.id);
    if (!clear?.item) continue;
    const challenger = cave.challengers.find((item) => item.id === entity.id);
    if (challenger) {
      challenger.item = clear.item;
      challenger.tierName = clear.tierName;
    }
  }
  pushDungeonHistory(entity, entry);
  return entry;
}

function createVoidHallMonster(state, monsterRealm) {
  const targetStage = stageIndexOfRealm(monsterRealm);
  const seed = `void_hall|${state.calendarStartDate || ""}|${state.day || 1}|${monsterRealm}`;
  const monsterName = monsterNameForStage(targetStage, seed);
  const rootKey = roots[stableHash(`${seed}|root`) % roots.length]?.key;
  return makeMonster(`虚天殿·${monsterName}王`, monsterRealm, rootKey, 1.2 + targetStage * 0.14);
}

function runSectDungeon(state, sectName, members, date, foughtAt = timestampKey(), sharedMonster = null) {
  if (!members.length) return null;
  const highestRealm = Math.max(...members.map(({ entity }) => entity.realm || 0));
  const monsterRealm = voidHallMonsterRealmForHighestRealm(highestRealm);
  const targetStage = stageIndexOfRealm(monsterRealm);
  const monster = sharedMonster?.realm === monsterRealm ? sharedMonster : createVoidHallMonster(state, monsterRealm);
  const monsterPower = powerOf(monster, state);
  const contributions = [];
  const battles = [];
  let monsterHp = monster.maxHp;
  let monsterMana = monster.maxMana;
  const orderedMembers = [...members].sort((a, b) => (
    powerOf(a.entity, state) - powerOf(b.entity, state) || String(a.entity.id).localeCompare(String(b.entity.id))
  ));
  for (const { entity } of orderedMembers) {
    if (monsterHp <= 0) break;
    const beforeMonsterHp = monsterHp;
    const beforeMonsterMana = monsterMana;
    const battle = fightMonster(state, entity, monster, 16, { monsterHp, monsterMana });
    const damage = Math.max(0, beforeMonsterHp - battle.rightHp);
    monsterHp = battle.rightHp;
    monsterMana = battle.rightMana;
    const replay = buildReplay({ ...entity }, { ...monster, hp: beforeMonsterHp, mana: beforeMonsterMana }, battle, battle.winner === "left" ? "胜" : "负", foughtAt, state);
    const order = battles.length + 1;
    replay.replayId = makeReplayId("void-hall", state.day, sectName, order, entity.id);
    queueBattleReplay(state, replay, `void-hall-${sectName}-${order}`);
    contributions.push({ entity, damage });
    battles.push({
      order,
      challenger: entityRef(entity, entity.id === "player" ? "player" : "npc"),
      damage,
      monsterStartHp: beforeMonsterHp,
      monsterStartMana: beforeMonsterMana,
      monsterEndHp: monsterHp,
      monsterEndMana: monsterMana,
      monsterMaxHp: monster.maxHp,
      monsterMaxMana: monster.maxMana,
      winnerName: battle.winner === "left" ? entity.name : monster.name,
      replay: publicReplay(replay)
    });
  }
  contributions.sort((a, b) => b.damage - a.damage);
  const totalDamage = contributions.reduce((sum, item) => sum + item.damage, 0);
  const requiredDamage = monster.maxHp;
  const success = monsterHp <= 0;
  const spiritRange = dungeonLootRules.void_hall.spiritRange({ stage: targetStage });
  const recordReplay = publicGroupDungeonReplay("虚天殿", monster, contributions, success, totalDamage, monster.maxHp, state);
  recordReplay.replayId = makeReplayId("void-hall", state.day, sectName, "overview");
  queueBattleReplay(state, recordReplay, `void-hall-${sectName}-overview`);

  const record = {
    type: "sect",
    name: "虚天殿",
    sect: sectName,
    day: state.day,
    date,
    foughtAt,
    success,
    stage: targetStage,
    highestRealm,
    highestRealmName: realms[highestRealm],
    monster: monster.name,
    monsterRealm: realms[monsterRealm],
    monsterStats: publicMonster(monster),
    monsterPower,
    totalDamage,
    monsterRemainingHp: monsterHp,
    requiredDamage,
    spiritPoolRange: spiritRange,
    spiritPool: 0,
    sectSpirit: 0,
    replay: recordReplay,
    battles,
    spiritShare: 0,
    top: contributions.slice(0, 5).map(({ entity, damage }) => ({ id: entity.id, name: entity.name, damage })),
    rewardCandidates: success ? contributions.map(({ entity, damage }) => ({ id: entity.id, damage })) : [],
    item: "",
    itemOwner: "",
    tierName: ""
  };
  for (const { entity, damage } of contributions) {
    const historyReplay = publicGroupDungeonReplay("虚天殿", monster, contributions.slice(0, 8), success, totalDamage, monster.maxHp, state, entity.id);
    historyReplay.foughtAt = foughtAt;
    historyReplay.replayId = makeReplayId("void-hall", state.day, sectName, "history", entity.id);
    queueBattleReplay(state, historyReplay, `void-hall-${sectName}-history-${entity.id}`);
    pushDungeonHistory(entity, {
      type: "sect",
      name: "虚天殿",
      day: state.day,
      date,
      foughtAt,
      result: success ? "宗门通关" : "未破殿门",
      spirit: 0,
      damage,
      monster: monster.name,
      monsterRealm: realms[monsterRealm],
      replay: historyReplay,
      item: "",
      tierName: ""
    });
    if (success) updateDungeonBest(entity, "虚天殿", monsterRealm + Math.floor(damage / 100), 1);
  }
  return record;
}

function rollVoidHallSpiritPool(state, stage, day = state.day) {
  const range = dungeonLootRules.void_hall.spiritRange({ stage });
  const seed = `${state.calendarStartDate || ""}|${day || 1}|void_hall|spirit|${stage}`;
  return range.min + Math.floor(stableUnit(seed) * (range.max - range.min + 1));
}

function buildVoidHallSpiritPools(state, day = state.day) {
  return Array.from({ length: Math.max(0, realmStages.length - 1) }, (_, index) => {
    const stage = index + 1;
    return {
      stage,
      label: realmStages[stage] || `第${stage + 1}阶`,
      spirit: rollVoidHallSpiritPool(state, stage, day)
    };
  });
}

function settleVoidHallRewards(state, sectRecords) {
  const successfulByStage = new Map();
  for (const record of sectRecords) {
    if (!record?.success) continue;
    const stage = Number.isFinite(record.stage) ? record.stage : stageIndexOfRealm(record.monsterStats?.realmIndex || 0);
    if (!successfulByStage.has(stage)) successfulByStage.set(stage, []);
    successfulByStage.get(stage).push(record);
  }

  for (const [stage, records] of successfulByStage.entries()) {
    const poolSpirit = rollVoidHallSpiritPool(state, stage);
    const sortedRecords = [...records].sort((a, b) => (b.totalDamage || 0) - (a.totalDamage || 0));
    const baseSectShare = Math.floor(poolSpirit / sortedRecords.length);
    let remainder = poolSpirit - baseSectShare * sortedRecords.length;
    for (const record of sortedRecords) {
      const members = membersForSect(state, record.sect);
      const sectSpirit = baseSectShare + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
      const memberBaseShare = members.length ? Math.max(1, Math.floor(sectSpirit / members.length)) : 0;
      let memberRemainder = members.length ? Math.max(0, sectSpirit - memberBaseShare * members.length) : 0;
      const memberBonusIds = new Set((record.top || []).slice(0, memberRemainder).map((entry) => entry.id));
      record.spiritPool = poolSpirit;
      record.sectSpirit = sectSpirit;
      record.spiritShare = memberBaseShare;
      record.spiritRemainder = memberRemainder;
      for (const { entity } of members) {
        const memberSpirit = memberBaseShare + (memberBonusIds.has(entity.id) ? 1 : 0);
        entity.spirit += memberSpirit;
        const history = entity.dungeonHistory?.find((entry) => entry.day === state.day && entry.type === "sect" && entry.name === "虚天殿" && entry.monster === record.monster);
        if (history) history.spirit = memberSpirit;
        const reward = rollSpiritPearlFragmentReward(state, "void_hall", {
          success: true,
          stage,
          context: "虚天殿宗门通关",
          receiver: entity,
          pearlId: activeSpecialRoot(entity)?.id || primaryRoot(entity).key
        });
        if (reward) {
          if (entity.id === "player") record.spiritPearl = reward;
          if (history) history.spiritPearl = reward;
        }
      }
    }

    for (const record of records) {
      const maxMonsterRealm = record.monsterStats?.realmIndex || stage * 10;
      const item = rollEquipmentDrop(state, equipmentTierForRealm(maxMonsterRealm), "void_hall", { cave: stage + 1, stage });
      if (!item) continue;
      const candidates = (record.rewardCandidates || [])
        .map((candidate) => ({ ...candidate, record }))
        .sort((a, b) => (b.damage || 0) - (a.damage || 0));
      let transfer = null;
      let winnerRecord = null;
      let winnerEntity = null;
      for (const candidate of candidates) {
        const entity = cultivatorById(state, candidate.id);
        if (!entity) continue;
        const current = bestEquippedInSlot(state, entity, item.slot);
        if (!current || equipmentScore(item) > equipmentScore(current)) {
          transfer = awardEquipment(state, entity, item, "虚天殿");
          winnerRecord = candidate.record;
          winnerEntity = entity;
          break;
        }
      }
      if (!transfer && candidates.length) {
        const entity = cultivatorById(state, candidates[0].id);
        if (entity) {
          transfer = awardEquipment(state, entity, item, "虚天殿");
          winnerRecord = candidates[0].record;
          winnerEntity = entity;
        }
      }
      if (transfer && winnerRecord && winnerEntity) {
        const itemName = transfer.itemName || item.name;
        const tierName = transfer.tierName || equipmentTier(item).name;
        const winnerName = transfer.winnerName || transfer.receiverName || winnerEntity.name;
        winnerRecord.item = itemName;
        winnerRecord.itemOwner = winnerName;
        winnerRecord.tierName = tierName;
        const history = winnerEntity.dungeonHistory?.find((entry) => entry.day === state.day && entry.type === "sect" && entry.name === "虚天殿" && entry.monster === winnerRecord.monster);
        if (history) {
          history.item = itemName;
          history.tierName = tierName;
        }
        log(state, `${winnerRecord.sect}攻破虚天殿，${winnerName}凭宗门最高贡献得「${itemName}」。`, "gold");
      }
    }

    for (const record of records) delete record.rewardCandidates;
  }
}

function starSeaMonsterRealmForHighestRealm(highestRealm) {
  const stage = stageIndexOfRealm(highestRealm);
  return topRealmOfStage(Math.min(stage + 1, realmStages.length - 1));
}

function makeStarSeaMonster(state, highestRealm) {
  const realm = starSeaMonsterRealmForHighestRealm(highestRealm);
  const stage = stageIndexOfRealm(realm);
  const monsterName = monsterNameForStage(stage, `star_sea|${state.day || 1}|${realm}`);
  const monster = makeMonster(`乱星海·${monsterName}`, realm, pick(roots).key, 1.15 + stage * 0.1);
  monster.defense = Math.max(1, Math.floor(monster.defense * 0.52));
  monster.attack = Math.max(1, Math.floor(monster.attack * 0.82));
  monster.maxHp = Math.max(monster.maxHp * 4, Math.floor(allCultivators(state).reduce((sum, { entity }) => sum + powerOf(entity, state, { includeDailyRootFortune: false }), 0) * 0.34));
  monster.maxHp = Math.floor(monster.maxHp);
  monster.hp = monster.maxHp;
  return monster;
}

function createStarSeaTeams(state, roster, cycle) {
  const teamCount = Math.max(1, Math.ceil(roster.length / starSeaTeamSize));
  const sorted = [...roster].sort((a, b) => powerOf(b.entity, state) - powerOf(a.entity, state));
  const buckets = Array.from({ length: teamCount }, () => []);
  sorted.forEach((entry, index) => {
    const round = Math.floor(index / teamCount);
    const offset = index % teamCount;
    const bucketIndex = round % 2 === 0 ? offset : teamCount - 1 - offset;
    buckets[bucketIndex].push(entry);
  });
  return shuffle(buckets).map((members, index) => {
    const shuffledMembers = shuffle(members).slice(0, starSeaTeamSize);
    const leader = [...shuffledMembers].sort((a, b) => powerOf(b.entity, state) - powerOf(a.entity, state))[0]?.entity;
    return {
      id: `star-sea-cycle-${cycle}-${index + 1}`,
      name: `${leader?.name || `第${index + 1}队`}之队`,
      leaderId: leader?.id || "",
      leaderName: leader?.name || "",
      members: shuffledMembers
    };
  });
}

function starSeaCycleInfo(day = 1) {
  const cycle = Math.floor((Math.max(1, day) - 1) / starSeaCycleLength) + 1;
  const cycleStartDay = (cycle - 1) * starSeaCycleLength + 1;
  return { cycle, cycleStartDay, cycleEndDay: cycleStartDay + starSeaCycleLength - 1 };
}

function starSeaCycleElapsedDays(cycleInfo, currentDay = 1) {
  const start = Number(cycleInfo?.cycleStartDay || 0);
  const end = Number(cycleInfo?.cycleEndDay || 0);
  const day = Math.floor(Number(currentDay || 1));
  if (!start || !end || day < start) return 0;
  return clamp(day - start + 1, 0, starSeaCycleLength);
}

function starSeaTeamsForCycle(state, roster, cycleInfo) {
  const current = state.starSeaCycle;
  const rosterIds = new Set(roster.map(({ entity }) => entity.id));
  const currentValid = current?.cycle === cycleInfo.cycle
    && Array.isArray(current.teams)
    && current.teams.length
    && current.teams.every((team) => (team.memberIds || []).every((id) => rosterIds.has(id)));
  if (!currentValid) {
    const generated = createStarSeaTeams(state, roster, cycleInfo.cycle);
    state.starSeaCycle = {
      ...cycleInfo,
      teamSize: starSeaTeamSize,
      teams: generated.map((team) => ({
        id: team.id,
        name: team.name,
        leaderId: team.leaderId,
        leaderName: team.leaderName,
        memberIds: team.members.map(({ entity }) => entity.id)
      }))
    };
    return generated;
  }

  return current.teams.map((team) => {
    const members = (team.memberIds || [])
      .map((id) => roster.find(({ entity }) => entity.id === id))
      .filter(Boolean);
    const leader = cultivatorById(state, team.leaderId) || [...members].sort((a, b) => powerOf(b.entity, state) - powerOf(a.entity, state))[0]?.entity;
    return {
      id: team.id,
      name: team.name || `${leader?.name || "猎妖"}之队`,
      leaderId: leader?.id || team.leaderId || "",
      leaderName: leader?.name || team.leaderName || "",
      members
    };
  });
}

function runStarSeaTeamBattle(state, team, monster) {
  const starSeaDotAttackFactor = 8;
  const starSeaDotMaxHpCap = 0.012;
  const monsterCounterPenalty = Math.max(0, ...team.members.map(({ entity }) => rootCounterPenalty(entity, monster)));
  const monsterBaseStats = applyBattleRootPenalty(combatSnapshot(monster, state), monsterCounterPenalty);
  const monsterSkill = effectiveSkillForEntity(monster);
  const fighters = team.members.map(({ entity }) => ({
    entity,
    realm: entity.realm,
    sect: entity.id === "player" ? state.sect.name : entity.sect,
    stats: applyBattleRootPenalty(combatSnapshot(entity, state), rootCounterPenalty(monster, entity)),
    skill: effectiveSkillForEntity(entity),
    cooldown: 0,
    effects: [],
    damage: 0,
    taken: 0,
    survivedRounds: 0
  }));
  for (const fighter of fighters) {
    fighter.maxHp = fighter.stats.maxHp;
    fighter.maxMana = fighter.stats.maxMana;
    fighter.hp = fighter.stats.maxHp;
    fighter.mana = fighter.stats.maxMana;
  }
  const monsterState = {
    stats: monsterBaseStats,
    hp: monsterBaseStats.maxHp,
    mana: monsterBaseStats.maxMana,
    cooldown: 0,
    effects: []
  };
  let rounds = 0;
  const events = [{
    round: 0,
    kind: "start",
    text: `${team.name}十人入海，围住${monster.name}。${monsterCounterPenalty ? `队伍灵根压制妖物，妖物攻防神识降低 ${Math.round(monsterCounterPenalty * 1000) / 10}%。` : ""}`,
    monsterHp: monsterState.hp,
    monsterMana: monsterState.mana,
    aliveCount: fighters.length,
    members: fighters.map((fighter) => ({ id: fighter.entity.id, hp: fighter.hp, mana: fighter.mana, damage: 0, rootCounterPenalty: fighter.stats.rootCounterPenalty || 0 }))
  }];

  const addEffect = (target, effect) => {
    if (effect.type === "dot" && effect.sourceId && effect.name) {
      const current = target.effects.find((item) => item.type === "dot" && item.sourceId === effect.sourceId && item.name === effect.name && item.duration > 0);
      if (current) {
        current.duration = Math.max(current.duration, effect.duration);
        current.percent = effect.percent;
        current.sourceAttack = effect.sourceAttack;
        current.sourceName = effect.sourceName;
        return;
      }
    }
    target.effects.push({ ...effect });
  };
  const consumeEffect = (target, type) => {
    const index = target.effects.findIndex((effect) => effect.type === type && effect.duration > 0);
    if (index < 0) return null;
    const [effect] = target.effects.splice(index, 1);
    return effect;
  };
  const effectValue = (target, type, key, fallback = 0) => target.effects
    .filter((effect) => effect.type === type && effect.duration > 0)
    .reduce((value, effect) => Math.max(value, effect[key] ?? fallback), fallback);
  const effectSum = (target, type, key) => target.effects
    .filter((effect) => effect.type === type && effect.duration > 0)
    .reduce((value, effect) => value + (effect[key] || 0), 0);
  const tickEffects = (target, maxHp) => {
    const dots = [];
    for (const effect of target.effects) {
      if (effect.duration <= 0) continue;
      if (effect.type === "dot") {
        const attackBased = Math.floor(Math.max(1, effect.sourceAttack || 0) * starSeaDotAttackFactor * (effect.percent || 0));
        const maxHpCap = Math.max(1, Math.floor(maxHp * starSeaDotMaxHpCap));
        const rawDamage = effect.sourceAttack ? Math.min(attackBased, maxHpCap) : Math.floor(maxHp * (effect.percent || 0));
        const damage = Math.max(1, rawDamage);
        const actualDamage = Math.min(target.hp, damage);
        if (actualDamage > 0) {
          target.hp = Math.max(0, target.hp - actualDamage);
          dots.push({
            damage: actualDamage,
            name: effect.name,
            sourceId: effect.sourceId || "",
            sourceName: effect.sourceName || ""
          });
        }
      }
      effect.duration -= 1;
    }
    target.effects = target.effects.filter((effect) => effect.duration > 0);
    const damage = dots.reduce((sum, dot) => sum + dot.damage, 0);
    return { damage, dots, names: dots.map((dot) => dot.name) };
  };
  const dodgeChance = (targetStats, actorStats, extra = 0) => {
    if ((targetStats.divineSense || 0) <= (actorStats.divineSense || 0)) return clamp(extra, 0, 0.62);
    const ratio = Math.floor((targetStats.divineSense || 0) / Math.max(1, actorStats.divineSense || 0));
    return clamp(clamp(Math.max(1, ratio), 1, 20) / 100 + extra, 0, 0.62);
  };
  const strikeDamage = (actor, target, multiplier = 1, options = {}) => {
    if (consumeEffect(target, "dodgeNext")) {
      return { damage: 0, dodged: true, dodgeText: "身法闪避" };
    }
    const chance = dodgeChance(target.stats, actor.stats, effectValue(target, "evasion", "chance"));
    if (Math.random() < chance) return { damage: 0, dodged: true, dodgeText: "神识预判" };
    const attack = Math.max(1, actor.stats.attack - effectSum(actor, "attackDown", "amount"));
    const defense = Math.max(0, target.stats.defense + effectSum(target, "defenseUp", "amount") - effectSum(target, "defenseDown", "amount"));
    let damage = Math.max(1, Math.floor(attack * multiplier - defense * (1 - (options.pierce || 0)) + Math.random() * 6));
    damage = Math.max(1, Math.floor(damage * (1 - effectValue(target, "shield", "reduce"))));
    target.hp = Math.max(0, target.hp - damage);
    const reflect = effectValue(target, "reflect", "reflect");
    let reflected = 0;
    if (reflect > 0) {
      reflected = Math.max(1, Math.floor(damage * reflect));
      actor.hp = Math.max(0, actor.hp - reflected);
    }
    return { damage, dodged: false, reflected };
  };
  const castTeamSkill = (actor, target, skill) => {
    actor.mana = Math.max(0, actor.mana - skill.cost);
    actor.cooldown = skill.cooldown;
    let total = 0;
    const notes = [];
    const hit = (multiplier = 1, options = {}) => {
      if (target.hp <= 0 || actor.hp <= 0) return;
      const result = strikeDamage(actor, target, multiplier, options);
      if (result.dodged) {
        notes.push(`${target.name || monster.name}${result.dodgeText}避开`);
        return;
      }
      total += result.damage;
      if (result.reflected) notes.push(`反震 ${result.reflected}`);
    };

    if (skill.type === "double") {
      hit(skill.power);
      hit(skill.power);
    } else if (skill.type === "multi") {
      for (let index = 0; index < skill.hits; index += 1) hit(skill.power);
    } else if (["pierce", "heavy", "speedStrike", "manaBurn", "weaken", "execute", "lifesteal", "dotStrike", "stun"].includes(skill.type)) {
      const multiplier = skill.type === "execute" && target.hp / target.stats.maxHp <= skill.threshold ? skill.power + skill.bonus : skill.power;
      hit(multiplier, { pierce: skill.pierce || 0 });
      if (skill.type === "manaBurn") target.mana = Math.max(0, target.mana - skill.burn);
      if (skill.type === "weaken") addEffect(target, { type: "attackDown", amount: skill.amount, duration: skill.duration });
      if (skill.type === "dotStrike") addEffect(target, { type: "dot", name: skill.name, percent: skill.percent, duration: skill.duration, sourceId: actor.id || "", sourceName: actor.name || "", sourceAttack: actor.stats.attack || 1 });
      if (skill.type === "stun") addEffect(target, { type: "stun", duration: skill.duration });
      if (skill.type === "speedStrike") addEffect(actor, { type: "evasion", chance: skill.extraDodge, duration: skill.duration });
      if (skill.type === "lifesteal" && total > 0) actor.hp = Math.min(actor.stats.maxHp, actor.hp + Math.floor(total * skill.leech));
    } else if (skill.type === "dodge") {
      addEffect(actor, { type: "dodgeNext", duration: skill.duration });
      notes.push("准备闪避");
    } else if (skill.type === "dot") {
      addEffect(target, { type: "dot", name: skill.name, percent: skill.percent, duration: skill.duration, sourceId: actor.id || "", sourceName: actor.name || "", sourceAttack: actor.stats.attack || 1 });
      notes.push("附加持续伤害");
    } else if (skill.type === "shield") {
      addEffect(actor, { type: "shield", reduce: skill.reduce, duration: skill.duration });
      notes.push("护体减伤");
    } else if (skill.type === "defenseBuff") {
      addEffect(actor, { type: "defenseUp", amount: skill.amount, duration: skill.duration });
      notes.push("防御提升");
    } else if (skill.type === "heal") {
      const heal = Math.floor(actor.stats.maxHp * skill.percent);
      actor.hp = Math.min(actor.stats.maxHp, actor.hp + heal);
      notes.push(`恢复 ${heal}`);
    } else if (skill.type === "evasionBuff") {
      addEffect(actor, { type: "evasion", chance: skill.chance, duration: skill.duration });
      notes.push("身法提升");
    } else if (skill.type === "reflect") {
      addEffect(actor, { type: "reflect", reflect: skill.reflect, duration: skill.duration });
      notes.push("反弹护身");
    } else if (skill.type === "field") {
      addEffect(actor, { type: "shield", reduce: skill.reduce, duration: skill.duration });
      addEffect(target, { type: "defenseDown", amount: skill.amount, duration: skill.duration });
      notes.push("阵势压制");
    } else {
      hit(1);
    }
    return { damage: total, notes };
  };

  for (; rounds < starSeaMaxRounds && monsterState.hp > 0 && fighters.some((fighter) => fighter.hp > 0); rounds += 1) {
    const round = rounds + 1;
    const statusTexts = [];
    const monsterDot = tickEffects(monsterState, monsterState.stats.maxHp);
    if (monsterDot.damage) {
      for (const dot of monsterDot.dots || []) {
        const source = fighters.find((fighter) => fighter.entity.id === dot.sourceId);
        if (source) source.damage += dot.damage;
      }
      const dotTexts = (monsterDot.dots || []).map((dot) => dot.sourceName ? `${dot.sourceName}${dot.name} ${dot.damage}` : `${dot.name} ${dot.damage}`);
      statusTexts.push(`${monster.name}受${dotTexts.join("、")}侵蚀，共 ${monsterDot.damage}`);
    }
    for (const fighter of fighters.filter((item) => item.hp > 0)) {
      const dot = tickEffects(fighter, fighter.stats.maxHp);
      if (dot.damage) {
        fighter.taken += dot.damage;
        statusTexts.push(`${fighter.entity.name}受${dot.names.join("、")}侵蚀 ${dot.damage}`);
      }
    }
    if (monsterState.hp <= 0 || !fighters.some((fighter) => fighter.hp > 0)) break;

    const alive = fighters.filter((fighter) => fighter.hp > 0);
    const attacks = [];
    let monsterText = "";
    const monsterStunned = consumeEffect(monsterState, "stun");
    if (monsterStunned) {
      monsterText = `${monster.name}被压制，错过一次行动`;
    } else {
      const target = pick(alive);
      const monsterActor = { id: monster.id, name: monster.name, stats: monsterState.stats, hp: monsterState.hp, mana: monsterState.mana, effects: monsterState.effects };
      const targetWrapper = { id: target.entity.id, name: target.entity.name, stats: target.stats, hp: target.hp, mana: target.mana, effects: target.effects };
      const useSkill = monsterSkill
        && monsterState.mana >= monsterSkill.cost
        && monsterState.cooldown <= 0
        && shouldUseCombatSkill({
          skill: monsterSkill,
          actor: monsterActor,
          target: targetWrapper,
          actorEffects: monsterState.effects,
          targetEffects: target.effects
        })
        && Math.random() < 0.45;
      let result;
      if (useSkill) {
        result = castTeamSkill(monsterActor, targetWrapper, monsterSkill);
        monsterText = `${monster.name}施展${monsterSkill.name}攻向${target.entity.name}`;
      } else {
        result = strikeDamage(monsterActor, targetWrapper, 0.9 + Math.random() * 0.2);
        monsterText = `${monster.name}挥爪攻向${target.entity.name}`;
      }
      monsterState.hp = monsterActor.hp;
      monsterState.mana = monsterActor.mana;
      monsterState.effects = monsterActor.effects;
      target.hp = targetWrapper.hp;
      target.mana = targetWrapper.mana;
      target.effects = targetWrapper.effects;
      if (useSkill) monsterState.cooldown = monsterActor.cooldown || monsterSkill.cooldown;
      const damageTaken = result.damage || 0;
      if (damageTaken > 0) {
        target.taken += damageTaken;
        monsterText += `，造成 ${damageTaken} 伤害`;
      } else {
        monsterText += `，${target.entity.name}${result.dodged ? result.dodgeText : "化解攻势"}`;
      }
      if (result.notes?.length) monsterText += `（${result.notes.join("，")}）`;
    }

    const actionOrder = [...fighters.filter((fighter) => fighter.hp > 0)]
      .sort((a, b) => b.stats.divineSense - a.stats.divineSense);
    for (const fighter of actionOrder) {
      if (fighter.hp <= 0 || monsterState.hp <= 0) continue;
      fighter.survivedRounds += 1;
      if (consumeEffect(fighter, "stun")) {
        attacks.push({ id: fighter.entity.id, name: fighter.entity.name, skill: "", damage: 0, hp: fighter.hp, mana: fighter.mana, note: "被压制" });
        continue;
      }
      const actor = { id: fighter.entity.id, name: fighter.entity.name, stats: fighter.stats, hp: fighter.hp, mana: fighter.mana, effects: fighter.effects, cooldown: fighter.cooldown };
      const target = { id: monster.id, name: monster.name, stats: monsterState.stats, hp: monsterState.hp, mana: monsterState.mana, effects: monsterState.effects };
      const canSkill = fighter.skill
        && fighter.mana >= fighter.skill.cost
        && fighter.cooldown <= 0
        && shouldUseCombatSkill({
          skill: fighter.skill,
          actor,
          target,
          actorEffects: fighter.effects,
          targetEffects: monsterState.effects
        })
        && Math.random() < 0.46;
      const result = canSkill
        ? castTeamSkill(actor, target, fighter.skill)
        : strikeDamage(actor, target, 0.82 + Math.random() * 0.28);
      fighter.hp = actor.hp;
      fighter.mana = actor.mana;
      fighter.effects = actor.effects;
      if (canSkill) fighter.cooldown = actor.cooldown || fighter.skill.cooldown;
      monsterState.hp = target.hp;
      monsterState.mana = target.mana;
      monsterState.effects = target.effects;
      const damage = result.damage || 0;
      fighter.damage += damage;
      attacks.push({
        id: fighter.entity.id,
        name: fighter.entity.name,
        skill: canSkill ? fighter.skill.name : "",
        damage,
        hp: fighter.hp,
        mana: fighter.mana,
        note: result.dodged ? result.dodgeText : result.notes?.join("，") || ""
      });
    }

    const roundDamage = attacks.reduce((sum, attack) => sum + attack.damage, 0);
    const aliveAfter = fighters.filter((fighter) => fighter.hp > 0).length;
    const skillTexts = attacks.filter((attack) => attack.skill).map((attack) => `${attack.name}施展${attack.skill}`);
    const dodgeTexts = attacks.filter((attack) => attack.note && !attack.skill).map((attack) => `${attack.name}${attack.note}`);
    events.push({
      round,
      kind: "starSeaRound",
      text: `${statusTexts.length ? `${statusTexts.join("；")}。` : ""}${monsterText}；${actionOrder.length} 名队员合击造成 ${roundDamage} 伤害。${skillTexts.length ? ` ${skillTexts.slice(0, 4).join("、")}。` : ""}${dodgeTexts.length ? ` ${dodgeTexts.slice(0, 3).join("、")}。` : ""}`,
      monsterAction: { text: monsterText },
      attacks: attacks.slice(0, 10),
      roundDamage,
      monsterHp: monsterState.hp,
      monsterMana: monsterState.mana,
      aliveCount: aliveAfter,
      members: fighters.map((fighter) => ({
        id: fighter.entity.id,
        hp: fighter.hp,
        mana: fighter.mana,
        damage: fighter.damage,
        taken: fighter.taken
      }))
    });
    monsterState.cooldown = Math.max(0, monsterState.cooldown - 1);
    for (const fighter of fighters) fighter.cooldown = Math.max(0, fighter.cooldown - 1);
  }

  const damage = monsterState.stats.maxHp - monsterState.hp;
  const success = monsterState.hp <= 0;
  const speedBonus = success ? Math.floor(monsterState.stats.maxHp * Math.max(0.05, ((starSeaMaxRounds - rounds) / starSeaMaxRounds) * 0.25)) : 0;
  events.push({
    round: Math.max(1, rounds),
    kind: "finish",
    text: success ? `${team.name}用 ${Math.max(1, rounds)} 回合斩杀${monster.name}，速度奖励 ${speedBonus}。` : `${team.name}全员力竭，最终打掉 ${damage} / ${monsterState.stats.maxHp} 血量。`,
    monsterHp: monsterState.hp,
    monsterMana: monsterState.mana,
    aliveCount: fighters.filter((fighter) => fighter.hp > 0).length,
    members: fighters.map((fighter) => ({ id: fighter.entity.id, hp: fighter.hp, mana: fighter.mana, damage: fighter.damage, taken: fighter.taken }))
  });
  return {
    success,
    rounds: Math.max(1, rounds),
    damage,
    monsterRemainingHp: monsterState.hp,
    monsterEndMana: monsterState.mana,
    monsterMaxHp: monsterState.stats.maxHp,
    monsterMaxMana: monsterState.stats.maxMana,
    monsterCounterPenalty,
    score: success ? monsterState.stats.maxHp + speedBonus : damage,
    speedBonus,
    events,
    members: fighters
  };
}

function distributeStarSeaTeamSpirit(teamRecord, teamSpirit, options = {}) {
  const members = teamRecord.members || [];
  const minimumMemberShare = Math.max(0, Math.floor(Number(options.minimumMemberShare) || 0));
  for (const member of members) member.spirit = minimumMemberShare;
  if (!members.length || teamSpirit <= 0) return;
  const guaranteedPool = Math.min(teamSpirit, members.length * minimumMemberShare);
  const distributablePool = Math.max(0, teamSpirit - guaranteedPool);
  const basePool = Math.floor(distributablePool * 0.2);
  const outputPool = distributablePool - basePool;
  const baseShare = Math.floor(basePool / members.length);
  let remainder = distributablePool - baseShare * members.length;
  const totalDamage = Math.max(1, members.reduce((sum, member) => sum + (member.damage || 0), 0));
  const ranked = [...members].sort((a, b) => (b.damage || 0) - (a.damage || 0));
  for (const member of ranked) {
    const outputShare = Math.floor(outputPool * (member.damage || 0) / totalDamage);
    member.spirit += baseShare + outputShare;
    remainder -= outputShare;
  }
  for (let index = 0; remainder > 0 && ranked.length; index = (index + 1) % ranked.length) {
    ranked[index].spirit += 1;
    remainder -= 1;
  }
}

function assignStarSeaSpiritShares(teamRecords, pool, options = {}) {
  if (!teamRecords.length) return;
  const minimumMemberShare = Math.max(0, Math.floor(Number(options.minimumMemberShare) || 0));
  const minimumTeamShare = minimumMemberShare > 0 ? 0 : 6;
  const guaranteedShares = teamRecords.map((record) => (
    minimumMemberShare > 0
      ? (record.members || []).length * minimumMemberShare
      : minimumTeamShare
  ));
  const guaranteedPool = Math.min(pool, guaranteedShares.reduce((sum, share) => sum + share, 0));
  let guaranteedAssigned = 0;
  teamRecords.forEach((record, index) => {
    const share = index === teamRecords.length - 1
      ? guaranteedPool - guaranteedAssigned
      : Math.min(guaranteedShares[index], guaranteedPool - guaranteedAssigned);
    record.spirit = Math.max(0, share);
    guaranteedAssigned += record.spirit;
  });
  let remainder = pool - guaranteedAssigned;

  const podium = teamRecords.slice(0, 3);
  const podiumWeights = [9, 5, 3].slice(0, podium.length);
  const podiumWeightTotal = podiumWeights.reduce((sum, weight) => sum + weight, 0);
  const podiumPool = Math.floor(remainder * 0.58);
  let podiumAssigned = 0;
  podium.forEach((record, index) => {
    const share = index === podium.length - 1 ? podiumPool - podiumAssigned : Math.floor(podiumPool * podiumWeights[index] / podiumWeightTotal);
    record.spirit += Math.max(0, share);
    podiumAssigned += Math.max(0, share);
  });
  remainder -= podiumAssigned;

  const rankWeights = teamRecords.map((_, index) => Math.pow(teamRecords.length - index, 1.15));
  const rankWeightTotal = rankWeights.reduce((sum, weight) => sum + weight, 0);
  let rankAssigned = 0;
  teamRecords.forEach((record, index) => {
    const share = index === teamRecords.length - 1 ? remainder - rankAssigned : Math.floor(remainder * rankWeights[index] / rankWeightTotal);
    record.spirit += Math.max(0, share);
    rankAssigned += Math.max(0, share);
  });

  for (const record of teamRecords) distributeStarSeaTeamSpirit(record, record.spirit, { minimumMemberShare });
}

function starSeaSpiritRangeForRecord(publicRecord) {
  const monsters = publicRecord?.monsters?.length ? publicRecord.monsters : [publicRecord?.monster].filter(Boolean);
  const stage = monsters.length ? Math.max(...monsters.map((monster) => stageIndexOfRealm(monster.realmIndex || 0))) : 0;
  return dungeonLootRules.star_sea.spiritRange({ stage, killed: publicRecord?.killed || 0 });
}

function migrateStarSeaSpiritPool(publicRecord) {
  const newRange = starSeaSpiritRangeForRecord(publicRecord);
  const oldRange = publicRecord.spiritPoolRange;
  const oldPool = Number(publicRecord.spiritPool || 0);
  const oldSpread = Math.max(1, Number(oldRange?.max || 0) - Number(oldRange?.min || 0));
  const ratio = oldRange ? clamp((oldPool - Number(oldRange.min || 0)) / oldSpread, 0, 1) : 0.5;
  const newPool = Math.round(newRange.min + (newRange.max - newRange.min) * ratio);
  publicRecord.spiritPoolRange = newRange;
  publicRecord.spiritPool = Math.max((publicRecord.teams || []).length * 6, newPool);
}

function migrateStarSeaSpiritRewards(state) {
  for (const dayRecord of state.dungeonDays || []) {
    const publicRecord = dayRecord.public;
    if (!publicRecord?.teams?.length) continue;

    migrateStarSeaSpiritPool(publicRecord);
    const previousMemberSpirit = new Map();
    for (const team of publicRecord.teams) {
      for (const member of team.members || []) previousMemberSpirit.set(member.id, Number(member.spirit || 0));
    }

    assignStarSeaSpiritShares(publicRecord.teams, Number(publicRecord.spiritPool || 0));
    publicRecord.top = publicRecord.teams
      .flatMap((record) => (record.members || []).map((member) => ({ ...member, teamName: record.name, teamRank: record.rank })))
      .sort((a, b) => b.damage - a.damage);

    for (const team of publicRecord.teams) {
      for (const member of team.members || []) {
        const previous = previousMemberSpirit.get(member.id) || 0;
        const current = Number(member.spirit || 0);
        const delta = current - previous;
        const entity = cultivatorById(state, member.id);
        if (!entity) continue;
        entity.spirit = Math.max(0, Math.floor(Number(entity.spirit) || 0) + delta);
        const history = (entity.dungeonHistory || []).find((record) => record.type === "public" && record.day === dayRecord.day && record.teamName === team.name);
        if (history) history.spirit = current;
      }
    }
  }
}

function settleStarSeaSpirit(state, teamRecords, pool) {
  assignStarSeaSpiritShares(teamRecords, pool, { minimumMemberShare: 1 });

  for (const record of teamRecords) {
    for (const member of record.members || []) {
      const entity = cultivatorById(state, member.id);
      if (entity) entity.spirit += member.spirit || 0;
    }
  }
}

function pickWeightedStarSeaEquipment(items) {
  if (!items.length) return null;
  const weighted = items.map((item) => ({
    item,
    weight: (item.isReplica ? replicaDropChanceMultiplier : 1) / Math.pow(Math.max(1, item.tier || 1), 2.8)
  }));
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) return entry.item;
  }
  return weighted[weighted.length - 1]?.item || null;
}

function rollStarSeaEquipmentDrop(state, monster) {
  const pool = availableDungeonEquipmentPool(state, "star_sea", equipmentTierForRealm(monster.realm));
  return pickWeightedStarSeaEquipment(pool);
}

function starSeaFallbackRewardItem(monster) {
  const maxTier = equipmentTierForRealm(monster.realm);
  const allowed = new Set(dungeonLootRules.star_sea.itemIds);
  return pickWeightedStarSeaEquipment(equipmentCatalog.filter((item) => allowed.has(item.id) && (item.tier || 1) <= maxTier))
    || equipmentCatalog.find((item) => allowed.has(item.id))
    || equipmentCatalog[0];
}

function distributeSpiritEvenly(people, amount) {
  const participants = people.filter(Boolean);
  if (!participants.length || amount <= 0) return { share: 0, remainder: 0, total: 0 };
  const share = Math.floor(amount / participants.length);
  let remainder = amount - share * participants.length;
  for (const person of participants) person.spirit += share;
  for (const person of participants.slice(0, remainder)) person.spirit += 1;
  return { share, remainder, total: amount };
}

function buildStarSeaCycleSummary(state, publicRecord, previousReward = null) {
  const cycleInfo = starSeaCycleInfo(publicRecord?.day || state.day || 1);
  const byDay = new Map();
  for (const dayRecord of state.dungeonDays || []) {
    const record = dayRecord.public;
    if (!record || record.cycle !== cycleInfo.cycle) continue;
    byDay.set(record.day || dayRecord.day, record);
  }
  if (publicRecord) byDay.set(publicRecord.day || state.day, publicRecord);

  const teamMap = new Map();
  const ensureTeam = (team) => {
    const key = team.id || team.name;
    if (!teamMap.has(key)) {
      teamMap.set(key, {
        id: team.id || key,
        name: team.name || "猎妖小队",
        leaderId: team.leaderId || "",
        leaderName: team.leaderName || "",
        totalScore: 0,
        totalDamage: 0,
        totalSpirit: 0,
        successes: 0,
        battles: 0,
        days: [],
        members: new Map()
      });
    }
    return teamMap.get(key);
  };

  for (const record of [...byDay.values()].sort((a, b) => (a.day || 0) - (b.day || 0))) {
    for (const team of record.teams || []) {
      const summary = ensureTeam(team);
      summary.totalScore += Math.max(0, Math.floor(Number(team.score) || 0));
      summary.totalDamage += Math.max(0, Math.floor(Number(team.damage) || 0));
      summary.totalSpirit += Math.max(0, Math.floor(Number(team.spirit) || 0));
      summary.successes += team.success ? 1 : 0;
      summary.battles += 1;
      if (record.day && !summary.days.includes(record.day)) summary.days.push(record.day);

      for (const member of team.members || []) {
        const memberKey = member.id || member.name;
        const current = summary.members.get(memberKey) || {
          id: member.id || memberKey,
          name: member.name || "无名修士",
          sect: member.sect || "",
          realm: member.realm,
          damage: 0,
          spirit: 0,
          appearances: 0,
          item: "",
          tierName: ""
        };
        current.damage += Math.max(0, Math.floor(Number(member.damage) || 0));
        current.spirit += Math.max(0, Math.floor(Number(member.spirit) || 0));
        current.appearances += 1;
        summary.members.set(memberKey, current);
      }
    }
  }

  const teams = [...teamMap.values()]
    .map((team) => ({
      ...team,
      members: [...team.members.values()].sort((a, b) => b.damage - a.damage || b.spirit - a.spirit),
      days: [...team.days].sort((a, b) => a - b)
    }))
    .sort((a, b) => b.totalScore - a.totalScore || b.totalDamage - a.totalDamage || b.successes - a.successes)
    .map((team, index) => ({ ...team, rank: index + 1 }));

  const topMembers = teams
    .flatMap((team) => team.members.map((member) => ({ ...member, teamName: team.name, teamRank: team.rank })))
    .sort((a, b) => b.damage - a.damage || b.spirit - a.spirit);

  const reward = previousReward?.settled ? previousReward : null;
  return {
    cycle: cycleInfo.cycle,
    cycleStartDay: cycleInfo.cycleStartDay,
    cycleEndDay: cycleInfo.cycleEndDay,
    teamSize: publicRecord?.teamSize || starSeaTeamSize,
    dayCount: Math.max(byDay.size, starSeaCycleElapsedDays(cycleInfo, state.day || publicRecord?.day || 1)),
    totalScore: teams.reduce((sum, team) => sum + team.totalScore, 0),
    totalDamage: teams.reduce((sum, team) => sum + team.totalDamage, 0),
    teams,
    topTeams: teams,
    topMembers,
    settled: Boolean(reward),
    reward,
    updatedDay: state.day || publicRecord?.day || 1,
    updatedDate: stateDateForDay(state)
  };
}

function settleStarSeaAuctionReward(state, summary, monster, options = {}) {
  if (!summary || summary.reward?.settled) return summary?.reward || null;
  const label = options.label || `乱星海第 ${summary.cycle} 期期末`;
  const participantIds = [...new Set((summary.teams || []).flatMap((team) => (team.members || []).map((member) => member.id)).filter(Boolean))];
  const participants = participantIds.map((id) => cultivatorById(state, id)).filter(Boolean);
  const item = rollStarSeaEquipmentDrop(state, monster);
  const fallback = item || starSeaFallbackRewardItem(monster);
  const value = equipmentValue(fallback);

  if (!item) {
    const distribution = distributeSpiritEvenly(participants, value);
    const reward = {
      settled: true,
      type: "spirit",
      reason: "equipment_exhausted",
      itemId: fallback?.id || "",
      itemName: fallback?.name || "装备折价",
      tierName: equipmentTier(fallback).name,
      itemValue: value,
      share: distribution.share,
      remainder: distribution.remainder,
      participantCount: participants.length,
      day: state.day,
      date: stateDateForDay(state),
      text: `装备池已空，按${equipmentTier(fallback).name}「${fallback.name}」价值 ${value} 灵石平分`
    };
    log(state, `${label}：装备池已空，众修士平分 ${value} 灵石，每人 ${distribution.share}。`, "gold");
    return reward;
  }

  for (const team of summary.teams || []) {
    const candidates = [...(team.members || [])].sort((a, b) => (b.damage || 0) - (a.damage || 0));
    for (const candidate of candidates) {
      const entity = cultivatorById(state, candidate.id);
      if (!entity) continue;
      const current = bestEquippedInSlot(state, entity, item.slot);
      if (current && equipmentScore(current) >= equipmentScore(item)) continue;
      const value = equipmentValue(item);
      if ((entity.spirit || 0) < value) continue;
      entity.spirit -= value;
      const soldItem = current || null;
      const soldValue = soldItem ? equipmentSellValue(soldItem) : 0;
      if (soldItem) {
        soldItem.ownerId = "";
        soldItem.acquiredDay = 0;
        soldItem.acquiredDate = "";
        entity.spirit += soldValue;
      }
      item.ownerId = entity.id;
      item.acquiredDay = state.day;
      item.acquiredDate = stateDateForDay(state);

      const dividendReceivers = participants.filter((person) => person.id !== entity.id);
      const distribution = distributeSpiritEvenly(dividendReceivers, value);

      const transfer = {
        type: "auction",
        itemId: item.id,
        itemName: item.name,
        tierName: equipmentTier(item).name,
        slotName: equipmentSlot(item).name,
        statName: equipmentSlot(item).statName,
        bonus: item.bonus || 0,
        value,
        dividend: distribution.share,
        dividendRemainder: distribution.remainder,
        winnerId: entity.id,
        winnerName: entity.name,
        loserId: "",
        loserName: `乱星海第${summary.cycle}期竞拍`,
        replacedItemId: soldItem?.id || "",
        replacedItemName: soldItem?.name || "",
        soldValue,
        chance: options.chance || 1,
        day: state.day,
        date: stateDateForDay(state),
        time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
        context: `${label}竞拍`
      };
      appendEquipmentTransferHistory(item, transfer, entity, transfer.context);
      state.equipmentTransfers ??= [];
      state.equipmentTransfers.unshift(transfer);
      state.equipmentTransfers = state.equipmentTransfers.slice(0, recentRecordDays);
      team.item = item.name;
      team.itemId = item.id;
      team.itemSlot = item.slot;
      team.itemTier = item.tier;
      team.itemOwner = entity.name;
      team.itemValue = value;
      team.auctionDividend = distribution.share;
      candidate.item = item.name;
      candidate.tierName = equipmentTier(item).name;
      const soldText = soldItem ? `，并卖出旧装备「${soldItem.name}」得 ${soldValue} 灵石` : "";
      log(state, `${label}：${entity.name}以 ${value} 灵石竞得${equipmentTier(item).name}「${item.name}」${soldText}，其余参与者各分润 ${distribution.share} 灵石。`, item.tier >= 4 ? "gold" : "");
      return {
        settled: true,
        type: "auction",
        itemId: item.id,
        itemName: item.name,
        itemSlot: item.slot,
        itemTier: item.tier,
        tierName: equipmentTier(item).name,
        itemValue: value,
        winnerId: entity.id,
        winnerName: entity.name,
        teamId: team.id,
        teamName: team.name,
        teamRank: team.rank,
        dividend: distribution.share,
        dividendRemainder: distribution.remainder,
        participantCount: participants.length,
        replacedItemId: soldItem?.id || "",
        replacedItemName: soldItem?.name || "",
        soldValue,
        day: state.day,
        date: stateDateForDay(state),
        text: `${entity.name}以 ${value} 灵石竞得${equipmentTier(item).name}「${item.name}」，其余人分红 ${distribution.share}/人`
      };
    }
  }

  const distribution = distributeSpiritEvenly(participants, value);
  const reward = {
    settled: true,
    type: "spirit",
    reason: "auction_unsold",
    itemId: item.id,
    itemName: item.name,
    itemSlot: item.slot,
    itemTier: item.tier,
    tierName: equipmentTier(item).name,
    itemValue: value,
    share: distribution.share,
    remainder: distribution.remainder,
    participantCount: participants.length,
    day: state.day,
    date: stateDateForDay(state),
    text: `${equipmentTier(item).name}「${item.name}」无人竞拍，折算 ${value} 灵石平分`
  };
  log(state, `${label}：${equipmentTier(item).name}「${item.name}」无人竞拍，折算 ${value} 灵石平分。`, "gold");
  return reward;
}

function settleStarSeaDailyAuction(state, publicRecord, monster) {
  if (Math.random() >= starSeaDailyDropChance) {
    return { settled: false, type: "none", chance: starSeaDailyDropChance, reason: "daily_no_drop" };
  }
  const label = `乱星海第${publicRecord.cycle}期第${publicRecord.day - publicRecord.cycleStartDay + 1}日竞拍`;
  const reward = settleStarSeaAuctionReward(state, {
    cycle: publicRecord.cycle,
    teams: publicRecord.teams
  }, monster, { label, chance: starSeaDailyDropChance });
  return { ...reward, chance: starSeaDailyDropChance };
}

function starSeaBackfilledCycleReward(state, summary, publicRecord) {
  if (!summary || summary.reward?.settled) return summary?.reward || null;
  const monster = publicRecord?.monster || publicRecord?.monsters?.[0] || {};
  const maxTier = equipmentTierForRealm(monster.realm || 0);
  const item = rollStarSeaEquipmentDrop(state, { realm: monster.realm || 0 }) || starSeaFallbackRewardItem({ realm: monster.realm || 0 });
  const value = equipmentValue(item);
  const participantCount = new Set((summary.teams || [])
    .flatMap((team) => (team.members || []).map((member) => member.id || member.name))
    .filter(Boolean)).size;
  const share = participantCount ? Math.floor(value / participantCount) : 0;
  return {
    settled: true,
    type: "spirit",
    reason: "history_backfill",
    itemId: item?.id || "",
    itemName: item?.name || "装备折价",
    itemSlot: item?.slot || "",
    itemTier: item?.tier || maxTier,
    tierName: equipmentTier(item).name,
    itemValue: value,
    share,
    remainder: participantCount ? value - share * participantCount : 0,
    participantCount,
    day: summary.cycleEndDay || state.day,
    date: stateDateForDay(state, summary.cycleEndDay || state.day),
    text: `历史补录：第 ${summary.cycle} 期掉落${equipmentTier(item).name}「${item?.name || "装备"}」，原竞拍明细缺失，按装备价值 ${value} 灵石展示`
  };
}

function upsertStarSeaCycleHistory(state, publicRecord, monster) {
  state.starSeaCycleHistory ??= [];
  const previous = state.starSeaCycleHistory.find((record) => record.cycle === publicRecord.cycle);
  const summary = buildStarSeaCycleSummary(state, publicRecord, previous?.reward);
  if ((state.day || publicRecord.day || 1) >= summary.cycleEndDay && !summary.reward?.settled) {
    summary.reward = Math.random() < starSeaCycleDropChance
      ? settleStarSeaAuctionReward(state, summary, monster, {
        label: `乱星海第 ${summary.cycle} 期期末竞拍`,
        chance: starSeaCycleDropChance
      })
      : {
        settled: true,
        type: "none",
        reason: "cycle_no_drop",
        chance: starSeaCycleDropChance,
        day: state.day,
        date: stateDateForDay(state),
        text: `乱星海第 ${summary.cycle} 期未发现可竞拍装备`
      };
    summary.settled = Boolean(summary.reward?.settled);
  }
  state.starSeaCycleHistory = [
    summary,
    ...state.starSeaCycleHistory.filter((record) => record.cycle !== summary.cycle)
  ]
    .sort((a, b) => b.cycle - a.cycle)
    .slice(0, starSeaCycleHistoryLimit);
  return summary;
}

function refreshStarSeaCycleHistoryFromDungeonDays(state) {
  const recordsByCycle = new Map();
  for (const dayRecord of state.dungeonDays || []) {
    const record = dayRecord.public;
    if (!record?.cycle) continue;
    const current = recordsByCycle.get(record.cycle);
    if (!current || (record.day || dayRecord.day || 0) > (current.day || 0)) {
      recordsByCycle.set(record.cycle, { ...record, day: record.day || dayRecord.day });
    }
  }
  if (!recordsByCycle.size) return false;

  const previousByCycle = new Map((state.starSeaCycleHistory || []).map((record) => [record.cycle, record]));
  const rebuilt = [...recordsByCycle.values()]
    .sort((a, b) => (b.cycle || 0) - (a.cycle || 0))
    .slice(0, starSeaCycleHistoryLimit)
    .map((record) => {
      const previous = previousByCycle.get(record.cycle);
      const summary = buildStarSeaCycleSummary(state, record, previous?.reward);
      if ((state.day || record.day || 1) >= summary.cycleEndDay && !summary.reward?.settled) {
        summary.reward = starSeaBackfilledCycleReward(state, summary, record);
        summary.settled = Boolean(summary.reward?.settled);
      }
      return summary;
    });

  const merged = [
    ...rebuilt,
    ...(state.starSeaCycleHistory || []).filter((record) => !recordsByCycle.has(record.cycle))
  ]
    .sort((a, b) => (b.cycle || 0) - (a.cycle || 0))
    .slice(0, starSeaCycleHistoryLimit);
  const before = JSON.stringify(state.starSeaCycleHistory || []);
  state.starSeaCycleHistory = merged;
  return JSON.stringify(state.starSeaCycleHistory) !== before;
}

function runStarSeaDungeon(state, roster, date, foughtAt = timestampKey()) {
  const maxRealm = Math.max(...roster.map(({ entity }) => entity.realm || 0));
  const monster = makeStarSeaMonster(state, maxRealm);
  const monsterStage = stageIndexOfRealm(monster.realm);
  const cycleInfo = starSeaCycleInfo(state.day || 1);
  const teams = starSeaTeamsForCycle(state, roster, cycleInfo);
  const teamRecords = teams.map((team) => {
    const battle = runStarSeaTeamBattle(state, team, monster);
    const members = battle.members
      .map((fighter) => ({
        id: fighter.entity.id,
        name: fighter.entity.name,
        sect: fighter.entity.id === "player" ? state.sect.name : fighter.entity.sect,
        realm: fighter.entity.realm,
        root: fighter.entity.root,
        roots: fighter.entity.roots,
        primaryRootKey: fighter.entity.primaryRootKey,
        skillId: fighter.entity.skillId,
        maxHp: fighter.maxHp,
        maxMana: fighter.maxMana,
        endHp: fighter.hp,
        endMana: fighter.mana,
        damage: fighter.damage,
        taken: fighter.taken,
        survivedRounds: fighter.survivedRounds,
        spirit: 0,
        item: "",
        tierName: ""
      }))
      .sort((a, b) => b.damage - a.damage);
    return {
      id: team.id,
      name: team.name,
      leaderId: team.leaderId,
      leaderName: team.leaderName,
      success: battle.success,
      rounds: battle.rounds,
      damage: battle.damage,
      score: battle.score,
      speedBonus: battle.speedBonus,
      monsterRemainingHp: battle.monsterRemainingHp,
      monsterEndMana: battle.monsterEndMana,
      monsterMaxHp: battle.monsterMaxHp,
      monsterMaxMana: battle.monsterMaxMana,
      monsterCounterPenalty: battle.monsterCounterPenalty,
      spirit: 0,
      members,
      top: members.slice(0, 5),
      events: battle.events,
      item: "",
      itemOwner: "",
      itemValue: 0,
      auctionDividend: 0
    };
  }).sort((a, b) => b.score - a.score || (a.success ? a.rounds : 999) - (b.success ? b.rounds : 999) || b.damage - a.damage);

  teamRecords.forEach((record, index) => { record.rank = index + 1; });
  const killed = teamRecords.filter((record) => record.success).length;
  const spiritRange = dungeonLootRules.star_sea.spiritRange({ stage: monsterStage, killed });
  const participantCount = teamRecords.reduce((sum, record) => sum + (record.members || []).length, 0);
  const spiritPool = Math.max(participantCount, rollSpiritFromRange(spiritRange));
  settleStarSeaSpirit(state, teamRecords, spiritPool);
  for (const record of teamRecords) {
    for (const member of record.members || []) {
      const entity = cultivatorById(state, member.id);
      if (!entity) continue;
      const reward = rollSpiritPearlFragmentReward(state, "star_sea", {
        success: record.success,
        stage: monsterStage,
        context: `乱星海猎妖第${record.rank}队`,
        receiver: entity,
        pearlId: activeSpecialRoot(entity)?.id || primaryRoot(entity).key
      });
      if (reward) {
        member.spiritPearl = reward;
        if (entity.id === "player") record.spiritPearl = reward;
      }
    }
  }

  const publicRecord = {
    type: "public",
    name: "乱星海猎妖",
    day: state.day,
    date,
    cycle: cycleInfo.cycle,
    cycleStartDay: cycleInfo.cycleStartDay,
    cycleEndDay: cycleInfo.cycleEndDay,
    teamSize: starSeaTeamSize,
    killed,
    monsterCount: 1,
    monster: publicMonster(monster),
    monsters: [publicMonster(monster)],
    totalDamage: teamRecords.reduce((sum, record) => sum + (record.damage || 0), 0),
    spiritPoolRange: spiritRange,
    spiritPool,
    dropChance: { daily: starSeaDailyDropChance, cycle: starSeaCycleDropChance },
    replay: publicStarSeaTeamReplay(teamRecords[0], monster, state),
    teams: teamRecords,
    top: teamRecords.flatMap((record) => record.members.map((member) => ({ ...member, teamName: record.name, teamRank: record.rank })))
      .sort((a, b) => b.damage - a.damage),
    item: "",
    itemOwner: "",
    tierName: "",
    itemValue: 0,
    auctionDividend: 0,
    dailyAuction: null,
    cycleSummary: null
  };
  queueBattleReplay(state, publicRecord.replay, `star-sea-${state.day}-overview`);
  const dailyAuction = settleStarSeaDailyAuction(state, publicRecord, monster);
  publicRecord.dailyAuction = dailyAuction;
  if (dailyAuction?.settled && dailyAuction.type === "auction") {
    publicRecord.item = dailyAuction.itemName || "";
    publicRecord.itemId = dailyAuction.itemId || "";
    publicRecord.itemSlot = dailyAuction.itemSlot || "";
    publicRecord.itemTier = dailyAuction.itemTier || 0;
    publicRecord.itemOwner = dailyAuction.winnerName || "";
    publicRecord.tierName = dailyAuction.tierName || "";
    publicRecord.itemValue = dailyAuction.itemValue || 0;
    publicRecord.auctionDividend = dailyAuction.dividend || 0;
  }
  const cycleSummary = upsertStarSeaCycleHistory(state, publicRecord, monster);
  const cycleReward = cycleSummary.reward || null;
  if (cycleReward?.settled) {
    publicRecord.item = cycleReward.itemName || "";
    publicRecord.itemId = cycleReward.itemId || "";
    publicRecord.itemSlot = cycleReward.itemSlot || "";
    publicRecord.itemTier = cycleReward.itemTier || 0;
    publicRecord.itemOwner = cycleReward.winnerName || "";
    publicRecord.tierName = cycleReward.tierName || "";
    publicRecord.itemValue = cycleReward.itemValue || 0;
    publicRecord.auctionDividend = cycleReward.dividend || cycleReward.share || 0;
    for (const record of teamRecords) {
      if (record.id === cycleReward.teamId) {
        record.item = cycleReward.itemName || "";
        record.itemId = cycleReward.itemId || "";
        record.itemSlot = cycleReward.itemSlot || "";
        record.itemTier = cycleReward.itemTier || 0;
        record.itemOwner = cycleReward.winnerName || "";
        record.itemValue = cycleReward.itemValue || 0;
        record.auctionDividend = cycleReward.dividend || cycleReward.share || 0;
      }
      for (const member of record.members || []) {
        if (member.id === cycleReward.winnerId) {
          member.item = cycleReward.itemName || "";
          member.tierName = cycleReward.tierName || "";
        }
      }
    }
  }
  publicRecord.cycleSummary = cycleSummary;

  for (const record of teamRecords) {
    const replay = publicStarSeaTeamReplay(record, monster, state);
    replay.foughtAt = foughtAt;
    queueBattleReplay(state, replay, `star-sea-${record.id || record.rank}`);
    record.replay = replay;
    for (const member of record.members) {
      const entity = cultivatorById(state, member.id);
      if (!entity) continue;
      pushDungeonHistory(entity, {
        type: "public",
        name: "乱星海猎妖",
        day: state.day,
        date,
        foughtAt,
        result: `${record.name} 第 ${record.rank} 名${record.success ? ` · ${record.rounds} 回合斩妖` : ""}`,
        spirit: member.spirit || 0,
        damage: member.damage || 0,
        teamName: record.name,
        teamRank: record.rank,
        teamScore: record.score,
        rounds: record.rounds,
        monster: monster.name,
        monsterRealm: realms[monster.realm],
        replay,
        item: member.item || "",
        tierName: member.tierName || "",
        spiritPearl: member.spiritPearl || null
      });
      updateDungeonBest(entity, "乱星海猎妖", monsterStage * 10 + Math.floor((record.score || 0) / 220), record.success ? 1 : 0);
    }
  }

  publicRecord.teams = teamRecords;
  publicRecord.top = teamRecords.flatMap((record) => record.members.map((member) => ({ ...member, teamName: record.name, teamRank: record.rank })))
    .sort((a, b) => b.damage - a.damage);
  publicRecord.cycleSummary = state.starSeaCycleHistory.find((record) => record.cycle === cycleInfo.cycle) || cycleSummary;
  return publicRecord;
}

export function runDailyDungeons(state, date, foughtAt = timestampKey()) {
  ensureDungeonState(state);
  if (state.dungeonDays.some((record) => record.day === state.day)) return state.dungeonDays.find((record) => record.day === state.day);
  const roster = allCultivators(state);
  const bloodCaves = createBloodTrialCaves();
  const solo = roster.map(({ entity }) => ({ id: entity.id, personName: entity.name, sect: entity.id === "player" ? state.sect.name : entity.sect, ...runSoloDungeonFor(state, entity, date, bloodCaves, foughtAt) }));
  settleBloodTrialRewards(state, bloodCaves);
  for (const entry of solo) {
    const clearRewards = bloodCaves.flatMap((cave) => cave.clears || []).filter((clear) => clear.id === entry.id);
    const reward = clearRewards.reduce((sum, clear) => sum + (clear.spirit || 0), 0);
    entry.spirit = reward;
    const person = allCultivators(state).find(({ entity }) => entity.id === entry.id)?.entity;
    const history = person?.dungeonHistory?.find((record) => record.day === state.day && record.type === "solo");
    if (history) history.spirit = reward;
  }
  const bloodTrial = {
    name: "血色禁地",
    caves: bloodCaves.map((cave) => ({
      cave: cave.cave,
      name: cave.name,
      monster: publicMonster(cave.monster),
      spiritPool: cave.spiritPool,
      clearCount: cave.clears.length,
      challengerCount: cave.challengers.length,
      clears: cave.clears
        .sort(compareBloodClearScore)
        .slice(0, 12),
      challengers: cave.challengers
        .sort(compareBloodEntry)
        .slice(0, 12)
    }))
  };
  for (const cave of bloodTrial.caves) {
    for (const entry of [...(cave.clears || []), ...(cave.challengers || [])]) {
      if (entry.replay) queueBattleReplay(state, entry.replay, `blood-trial-${cave.cave}-${entry.id}`);
    }
  }
  const sectChallenges = activeSectNames(state)
    .map((sectName) => {
      const members = membersForSect(state, sectName);
      if (!members.length) return null;
      const highestRealm = Math.max(...members.map(({ entity }) => entity.realm || 0));
      return { sectName, members, monsterRealm: voidHallMonsterRealmForHighestRealm(highestRealm) };
    })
    .filter(Boolean);
  const monstersByRealm = new Map(
    [...new Set(sectChallenges.map((challenge) => challenge.monsterRealm))]
      .map((monsterRealm) => [monsterRealm, createVoidHallMonster(state, monsterRealm)])
  );
  const sectRecords = sectChallenges
    .map(({ sectName, members, monsterRealm }) => (
      runSectDungeon(state, sectName, members, date, foughtAt, monstersByRealm.get(monsterRealm))
    ))
    .filter(Boolean);
  settleVoidHallRewards(state, sectRecords);
  const voidHallSpiritPools = buildVoidHallSpiritPools(state);
  const publicRecord = runStarSeaDungeon(state, roster, date, foughtAt);
  const record = {
    day: state.day,
    date,
    foughtAt,
    bloodTrial,
    solo: solo.slice(0, 20),
    sects: sectRecords,
    voidHallSpiritPools,
    public: publicRecord
  };
  state.dungeonDays.unshift(record);
  state.dungeonDays = trimRecordsByDay(state.dungeonDays, state.day, battleRecordDays, battleRecordDays);
  const playerSolo = solo.find((entry) => entry.id === "player");
  log(state, `今日副本结算：你在血色禁地${playerSolo?.result || "外谷败退"}，获得 ${playerSolo?.spirit || 0} 灵石；乱星海 ${publicRecord.teams?.length || 0} 队围猎${publicRecord.monster?.name || "妖物"}，${publicRecord.killed || 0} 队完成击杀。`, "gold");
  return record;
}

function provinceIdsForSect(state, sectName) {
  return (state.provinces || []).filter((item) => item.owner === sectName).map((item) => item.id);
}

function provinceEffectsForSect(state, sectName) {
  return provinceIdsForSect(state, sectName)
    .map((id) => provinceById(id))
    .filter(Boolean)
    .map(provinceEffect);
}

function provinceFlatValueForSect(state, sectName, type) {
  return provinceEffectsForSect(state, sectName)
    .filter((effect) => effect.type === type)
    .reduce((sum, effect) => sum + effect.value, 0);
}

function successfulDefenseMemberIds(state, sectName) {
  const ids = new Set();
  for (const war of state.provinceWars || []) {
    if (war.day !== state.day || war.defender !== sectName || war.captured) continue;
    for (const member of war.defenderLineup || []) {
      if (member?.id) ids.add(member.id);
    }
  }
  return ids;
}

function sectResourceEntries(state, sectName) {
  const members = membersForSect(state, sectName);
  const memberIds = new Set(members.map((member) => member.entity.id));
  const profile = state.sectProfiles?.[sectName] || {};
  const leaderId = memberIds.has(profile.leaderId) ? profile.leaderId : members[0]?.entity.id || "";
  const elderIds = new Set((Array.isArray(profile.elderIds) ? profile.elderIds : [])
    .filter((id) => id && id !== leaderId && memberIds.has(id)));
  const defenderIds = successfulDefenseMemberIds(state, sectName);
  return members.map((member) => {
    const id = member.entity.id;
    const role = id === leaderId
      ? "leader"
      : elderIds.has(id) ? "elder" : defenderIds.has(id) ? "defender" : "member";
    const weight = role === "leader" ? 6 : role === "elder" ? 3 : role === "defender" ? 2 : 1;
    return { ...member, id, role, weight };
  });
}

function canAttemptBreakthrough(entity) {
  return Boolean(entity)
    && entity.realm < realms.length - 1
    && (Number(entity.xp) || 0) >= xpNeed(entity.realm);
}

function sectResourceEntriesForType(state, sectName, type) {
  const entries = sectResourceEntries(state, sectName);
  if (type !== "breakthrough") return { entries, priorityCandidates: [] };

  const priorityCandidates = entries.filter((entry) => canAttemptBreakthrough(entry.entity));
  if (!priorityCandidates.length) return { entries, priorityCandidates };

  const candidateIds = new Set(priorityCandidates.map((entry) => entry.id));
  return {
    entries: entries.map((entry) => ({
      ...entry,
      baseWeight: entry.weight,
      breakthroughReady: candidateIds.has(entry.id),
      weight: candidateIds.has(entry.id) ? entry.weight + 8 : entry.weight
    })),
    priorityCandidates
  };
}

function distributeWeightedPool(entries, total, flatValue, { integer = false } = {}) {
  const safeTotal = Math.max(0, Number(total) || 0);
  if (!entries.length || safeTotal <= 0) return new Map();

  const useCaps = entries.length >= 5;
  const allocations = new Map();
  const meta = entries.map((entry) => ({
    ...entry,
    min: entry.role === "member" ? flatValue * 0.45 : 0,
    max: entry.breakthroughReady
      ? safeTotal * 0.55
      : useCaps && entry.role === "leader" ? safeTotal * 0.22 : useCaps && entry.role === "elder" ? safeTotal * 0.12 : Infinity,
    allocated: entry.role === "member" ? flatValue * 0.45 : 0
  }));

  const minTotal = meta.reduce((sum, entry) => sum + entry.allocated, 0);
  if (minTotal > safeTotal) {
    const ratio = safeTotal / Math.max(1, minTotal);
    for (const entry of meta) entry.allocated *= ratio;
  }

  let remaining = Math.max(0, safeTotal - meta.reduce((sum, entry) => sum + entry.allocated, 0));
  let active = meta.filter((entry) => entry.allocated < entry.max);
  while (remaining > 0.000001 && active.length) {
    const weightTotal = active.reduce((sum, entry) => sum + entry.weight, 0);
    let capped = false;
    for (const entry of active) {
      const add = remaining * (entry.weight / Math.max(1, weightTotal));
      if (entry.allocated + add > entry.max) {
        remaining -= Math.max(0, entry.max - entry.allocated);
        entry.allocated = entry.max;
        capped = true;
      }
    }
    if (!capped) {
      for (const entry of active) {
        entry.allocated += remaining * (entry.weight / Math.max(1, weightTotal));
      }
      remaining = 0;
    }
    active = meta.filter((entry) => entry.allocated < entry.max - 0.000001);
  }

  if (integer) {
    const rounded = meta.map((entry) => ({ ...entry, rounded: Math.floor(entry.allocated), fraction: entry.allocated - Math.floor(entry.allocated) }));
    let remainder = Math.round(safeTotal) - rounded.reduce((sum, entry) => sum + entry.rounded, 0);
    const candidates = [...rounded].sort((a, b) => b.fraction - a.fraction || b.weight - a.weight);
    let cursor = 0;
    while (remainder > 0 && candidates.length) {
      candidates[cursor % candidates.length].rounded += 1;
      remainder -= 1;
      cursor += 1;
    }
    for (const entry of rounded) allocations.set(entry.id, entry.rounded);
    return allocations;
  }

  for (const entry of meta) allocations.set(entry.id, Number(entry.allocated.toFixed(4)));
  return allocations;
}

function provinceResourceSharesForSect(state, sectName, type, options = {}) {
  const { entries } = sectResourceEntriesForType(state, sectName, type);
  const flatValue = provinceFlatValueForSect(state, sectName, type);
  const total = flatValue * entries.length;
  return distributeWeightedPool(entries, total, flatValue, options);
}

function provinceResourceShareFor(state, sectName, entity, type, options = {}) {
  if (!entity?.id) return provinceFlatValueForSect(state, sectName, type);
  return provinceResourceSharesForSect(state, sectName, type, options).get(entity.id) || 0;
}

function sectXpBonus(state, sectName, entity = null) {
  if (!entity) return provinceFlatValueForSect(state, sectName, "xp");
  return provinceResourceShareFor(state, sectName, entity, "xp");
}

function sectSpiritIncome(state, sectName, entity = null) {
  return provinceResourceShareFor(state, sectName, entity, "spirit", { integer: true });
}

function sectBreakthroughBonus(state, sectName, entity = null) {
  const bonus = entity
    ? provinceResourceShareFor(state, sectName, entity, "breakthrough")
    : provinceFlatValueForSect(state, sectName, "breakthrough");
  return Math.min(0.12, bonus);
}

function provinceResourceSummary(state, sectName, type) {
  const { entries, priorityCandidates } = sectResourceEntriesForType(state, sectName, type);
  const flatValue = provinceFlatValueForSect(state, sectName, type);
  const total = flatValue * entries.length;
  const shares = provinceResourceSharesForSect(state, sectName, type, { integer: type === "spirit" || type === "dust" });
  const leader = entries.find((entry) => entry.role === "leader");
  const elders = entries.filter((entry) => entry.role === "elder");
  const defenders = entries.filter((entry) => entry.role === "defender");
  return {
    type,
    priorityMode: type === "breakthrough" && priorityCandidates.length ? "breakthrough-ready" : "role",
    priorityCandidates,
    flatValue,
    total: Number(total.toFixed(type === "spirit" || type === "dust" ? 0 : 4)),
    entries,
    shares,
    leader,
    elders,
    defenders,
    top: [...entries]
      .map((entry) => ({ ...entry, share: shares.get(entry.id) || 0 }))
      .sort((a, b) => b.share - a.share || b.weight - a.weight)
      .slice(0, 3)
  };
}

function publicProvinceResourceSummary(state, sectName, type) {
  const summary = provinceResourceSummary(state, sectName, type);
  return {
    type,
    priorityMode: summary.priorityMode,
    priorityCandidates: summary.priorityCandidates.map((entry) => ({ id: entry.id, name: entry.entity.name, role: entry.role })),
    flatValue: summary.flatValue,
    total: summary.total,
    leader: summary.leader ? { id: summary.leader.id, name: summary.leader.entity.name, share: summary.shares.get(summary.leader.id) || 0 } : null,
    elders: summary.elders.map((entry) => ({ id: entry.id, name: entry.entity.name, share: summary.shares.get(entry.id) || 0 })),
    defenders: summary.defenders.map((entry) => ({ id: entry.id, name: entry.entity.name, share: summary.shares.get(entry.id) || 0 })),
    top: summary.top.map((entry) => ({
      id: entry.id,
      name: entry.entity.name,
      role: entry.role,
      weight: entry.weight,
      baseWeight: entry.baseWeight ?? entry.weight,
      breakthroughReady: Boolean(entry.breakthroughReady),
      share: entry.share
    }))
  };
}

function provinceRankOf(territory) {
  return provinceById(territory.id)?.rank || 99;
}

const provinceAdjacency = {
  xinjiang: ["tibet", "qinghai", "gansu"],
  tibet: ["xinjiang", "qinghai", "sichuan", "yunnan"],
  qinghai: ["xinjiang", "tibet", "gansu", "sichuan"],
  gansu: ["xinjiang", "qinghai", "ningxia", "inner_mongolia", "shaanxi", "sichuan"],
  ningxia: ["gansu", "inner_mongolia", "shaanxi"],
  inner_mongolia: ["gansu", "ningxia", "shaanxi", "shanxi", "hebei", "liaoning", "jilin", "heilongjiang"],
  heilongjiang: ["inner_mongolia", "jilin"],
  jilin: ["heilongjiang", "inner_mongolia", "liaoning"],
  liaoning: ["jilin", "inner_mongolia", "hebei"],
  beijing: ["hebei", "tianjin"],
  tianjin: ["beijing", "hebei"],
  hebei: ["beijing", "tianjin", "liaoning", "inner_mongolia", "shanxi", "henan", "shandong"],
  shanxi: ["inner_mongolia", "hebei", "henan", "shaanxi"],
  shaanxi: ["gansu", "ningxia", "inner_mongolia", "shanxi", "henan", "hubei", "chongqing", "sichuan"],
  henan: ["hebei", "shanxi", "shaanxi", "hubei", "anhui", "shandong"],
  shandong: ["hebei", "henan", "anhui", "jiangsu"],
  jiangsu: ["shandong", "anhui", "zhejiang", "shanghai"],
  shanghai: ["jiangsu", "zhejiang"],
  anhui: ["shandong", "henan", "hubei", "jiangxi", "zhejiang", "jiangsu"],
  hubei: ["shaanxi", "henan", "anhui", "jiangxi", "hunan", "chongqing"],
  chongqing: ["sichuan", "shaanxi", "hubei", "hunan", "guizhou"],
  sichuan: ["tibet", "qinghai", "gansu", "shaanxi", "chongqing", "guizhou", "yunnan"],
  guizhou: ["sichuan", "chongqing", "hunan", "guangxi", "yunnan"],
  yunnan: ["tibet", "sichuan", "guizhou", "guangxi"],
  hunan: ["hubei", "jiangxi", "guangdong", "guangxi", "guizhou", "chongqing"],
  jiangxi: ["hubei", "anhui", "zhejiang", "fujian", "guangdong", "hunan"],
  zhejiang: ["jiangsu", "shanghai", "anhui", "jiangxi", "fujian"],
  fujian: ["zhejiang", "jiangxi", "guangdong", "taiwan"],
  taiwan: ["fujian"],
  guangxi: ["yunnan", "guizhou", "hunan", "guangdong"],
  guangdong: ["guangxi", "hunan", "jiangxi", "fujian", "hongkong", "macau", "hainan"],
  hongkong: ["guangdong"],
  macau: ["guangdong"],
  hainan: ["guangdong"]
};

const maxSiegeTeamSize = 5;
const zeroTerritorySiegeTeamSize = 6;
const sectFatigueMax = 20;
const sectFatiguePenaltyPerPoint = 0.025;
const sectFatigueRecoveryPerRestDay = 1;
const sectFatigueRecoveryPerGarrisonDay = 1;
const sectDefenseFatigueGain = 2;
const sectFatigueAutoRestThreshold = 16;
const sectFatigueHeavyRestThreshold = 10;
const sectFatigueHeavyRestRecovery = 2;
const sectFatigueCriticalRestRecovery = 3;

function defaultPlayerSectPlan(targetDay = 1) {
  return {
    targetDay,
    mode: "balanced",
    attack: { targetProvinceId: "", memberIds: [], autoFill: true, onConflict: "retarget" },
    defense: { provinceIdToMemberIds: {}, autoFill: true }
  };
}

function playerSectPlanIsManual(plan) {
  if (!plan) return false;
  if (plan.mode && plan.mode !== "balanced") return true;
  if (plan.attack?.targetProvinceId || (plan.attack?.memberIds || []).length) return true;
  return Object.values(plan.defense?.provinceIdToMemberIds || {}).some((ids) => Array.isArray(ids) && ids.length);
}

function provinceDistance(fromIds, targetId) {
  const starts = Array.isArray(fromIds) ? fromIds.filter(Boolean) : [fromIds].filter(Boolean);
  if (!starts.length || !targetId) return 2;
  if (starts.includes(targetId)) return 0;
  const visited = new Set(starts);
  const queue = starts.map((id) => ({ id, distance: 0 }));
  while (queue.length) {
    const current = queue.shift();
    for (const next of provinceAdjacency[current.id] || []) {
      if (visited.has(next)) continue;
      if (next === targetId) return current.distance + 1;
      visited.add(next);
      queue.push({ id: next, distance: current.distance + 1 });
    }
  }
  return 5;
}

function provinceResourceValue(province, state, sectName = "") {
  if (!province) return 0;
  const effect = provinceEffect(province);
  const tier = provinceTier(province);
  const owned = provinceEffectsForSect(state, sectName);
  const typeCount = owned.filter((item) => item.type === effect.type).length;
  const shortage = typeCount <= 0 ? 1.35 : typeCount === 1 ? 1.12 : 1;
  const typeValue = effect.type === "spirit"
    ? effect.value * 1.15
    : effect.type === "dust"
      ? effect.value * 14
      : effect.type === "xp"
        ? effect.value * 92
        : effect.value * 150;
  return Math.round((18 + typeValue) * (0.8 + tier * 0.65) * shortage);
}

function sectFatigueOf(state, entityId) {
  return clamp(Math.floor(Number(state.sectFatigue?.[entityId]) || 0), 0, sectFatigueMax);
}

function effectiveSiegePower(state, entity, distance = 1) {
  const fatiguePenalty = sectFatigueOf(state, entity.id) * sectFatiguePenaltyPerPoint;
  const distancePenalty = Math.min(0.25, Math.max(0, (distance || 1) - 1) * 0.06);
  return Math.round(powerOf(entity, state) * Math.max(0.45, 1 - fatiguePenalty - distancePenalty));
}

function attackTeamLimitForSect(state, sectName) {
  return provinceIdsForSect(state, sectName).length ? maxSiegeTeamSize : zeroTerritorySiegeTeamSize;
}

function normalizePlayerSectPlan(plan, targetDay, attackLimit = maxSiegeTeamSize) {
  const mode = ["conservative", "balanced", "aggressive"].includes(plan?.mode) ? plan.mode : "balanced";
  const cleanIds = (ids, limit) => [...new Set((Array.isArray(ids) ? ids : []).map((id) => String(id || "").trim()).filter(Boolean))]
    .slice(0, limit);
  const defenseSource = plan?.defense?.provinceIdToMemberIds || {};
  const defense = {};
  for (const [provinceId, ids] of Object.entries(defenseSource)) {
    if (provinceById(provinceId)) defense[provinceId] = cleanIds(ids, maxSiegeTeamSize);
  }
  return {
    targetDay,
    mode,
    attack: {
      targetProvinceId: provinceById(plan?.attack?.targetProvinceId) ? plan.attack.targetProvinceId : "",
      memberIds: cleanIds(plan?.attack?.memberIds, attackLimit),
      autoFill: plan?.attack?.autoFill !== false,
      onConflict: plan?.attack?.onConflict === "cancel" ? "cancel" : "retarget"
    },
    defense: {
      provinceIdToMemberIds: defense,
      autoFill: plan?.defense?.autoFill !== false
    }
  };
}

function enforceProvinceOccupationLimits(state) {
  state.provinces ??= createProvinceState(state);
  let changed = false;
  for (const sectName of activeSectNames(state)) {
    const limit = membersForSect(state, sectName).length;
    const owned = state.provinces
      .filter((item) => item.owner === sectName)
      .sort((a, b) => provinceRankOf(a) - provinceRankOf(b));
    if (owned.length <= limit) continue;
    for (const territory of owned.slice(limit)) {
      territory.owner = null;
      territory.defenders = [];
      changed = true;
    }
  }
  return changed;
}

function assignProvinceDefenders(state) {
  state.provinces ??= createProvinceState(state);
  let changed = false;
  const setDefenders = (territory, defenders) => {
    const previous = territory.defenders || [];
    if (previous.length !== defenders.length || previous.some((id, index) => id !== defenders[index])) {
      territory.defenders = defenders;
      changed = true;
    }
  };
  for (const territory of state.provinces) setDefenders(territory, []);
  for (const sectName of activeSectNames(state)) {
    const owned = state.provinces
      .filter((item) => item.owner === sectName)
      .sort((a, b) => provinceRankOf(a) - provinceRankOf(b));
    const members = membersForSectAscending(state, sectName);
    if (!owned.length || !members.length) continue;
    const baseCount = Math.floor(members.length / owned.length);
    const remainder = members.length % owned.length;
    let cursor = 0;
    owned.forEach((territory, index) => {
      const province = provinceById(territory.id);
      const count = Math.min(baseCount + (index < remainder ? 1 : 0), province ? defenderLimitForProvince(province) : maxSiegeTeamSize);
      const defenders = members.slice(cursor, cursor + count).map((member) => member.entity.id);
      cursor += count;
      setDefenders(territory, defenders);
    });
  }
  return changed;
}

function defenderLimitForProvince(province) {
  return province ? maxSiegeTeamSize : 0;
}

function attackerLimitForProvince(province, attackLimit = maxSiegeTeamSize) {
  return province ? Math.max(1, Math.floor(Number(attackLimit) || maxSiegeTeamSize)) : 0;
}

function defenseValueForProvince(state, territory, sectName) {
  const province = provinceById(territory.id);
  if (!province) return 0;
  const resourceValue = provinceResourceValue(province, state, sectName);
  const heldDays = Math.max(0, Math.floor(Number(territory.heldDays) || 0));
  const rank = clamp(Number(province.rank) || provinces.length, 1, provinces.length);
  // GDP rank is the strategic anchor: resource type can refine, but not overturn a core city.
  const gdpValue = 48 + (provinces.length - rank + 1) * 12;
  const monsterRisk = resourceValue * 0.1 + heldDays * 2 + provinceTier(province) * 8;
  return Math.round(gdpValue + resourceValue * 0.55 + monsterRisk);
}

function defenseBaselineForProvince(province) {
  const rank = clamp(Number(province?.rank) || provinces.length, 1, provinces.length);
  if (rank <= 3) return 4;
  if (rank <= 8) return 2;
  return 1;
}

function provinceBorderExposure(state, territory, sectName) {
  return (provinceAdjacency[territory?.id] || [])
    .map((id) => provinceStateById(state, id)?.owner || "")
    .filter((owner) => owner && owner !== sectName).length;
}

function recentProvinceWarPressure(state, provinceId, lookbackDays = 4) {
  const cutoff = Math.max(1, Math.floor(Number(state.day) || 1) - lookbackDays);
  return (state.provinceWars || []).filter((war) => war.provinceId === provinceId && Number(war.day || 0) >= cutoff).length;
}

function sectPublicPower(state, sectName) {
  const powers = membersForSect(state, sectName)
    .map(({ entity }) => powerOf(entity, state))
    .sort((a, b) => b - a)
    .slice(0, maxSiegeTeamSize);
  return powers.reduce((sum, power) => sum + power, 0);
}

function expectedDefenseProfile(state, territory, attackerSect) {
  if (!territory?.owner) {
    return { pressure: 1, level: "vacant", label: "无主", confidence: "confirmed", estimatedCount: 0 };
  }
  const province = provinceById(territory.id);
  const defenderSect = territory.owner;
  const memberCount = membersForSect(state, defenderSect).length;
  const ownedCount = Math.max(1, provinceIdsForSect(state, defenderSect).length);
  const borderExposure = provinceBorderExposure(state, territory, defenderSect);
  const recentPressure = recentProvinceWarPressure(state, territory.id);
  const baseCount = Math.max(1, Math.round(memberCount / ownedCount));
  const valueBias = defenseBaselineForProvince(province) >= 2 ? 1 : 0;
  const riskBias = borderExposure >= 2 || recentPressure >= 2 ? 1 : 0;
  const estimatedCount = clamp(baseCount + valueBias + riskBias, 1, maxSiegeTeamSize);
  const averagePower = sectPublicPower(state, defenderSect) / Math.max(1, Math.min(memberCount, maxSiegeTeamSize));
  const uncertainty = 0.86 + deterministicUnit(`siege-intel|${state.rebirth || 1}|${state.day}|${attackerSect}|${territory.id}`) * 0.28;
  const pressure = Math.max(1, Math.round(averagePower * estimatedCount * uncertainty + defenseValueForProvince(state, territory, defenderSect) * 2));
  const level = estimatedCount <= 1 ? "thin" : estimatedCount <= 3 ? "normal" : "strong";
  const label = level === "thin" ? "守备迹象薄弱" : level === "strong" ? "守备迹象森严" : "守备迹象寻常";
  const confidence = recentPressure ? "informed" : "uncertain";
  return { pressure, level, label, confidence, estimatedCount, borderExposure, recentPressure };
}

function publicProvinceIntel(state, territory, viewerSect = state.sect.name) {
  if (!territory?.owner) return { level: "vacant", label: "无主", confidence: "confirmed" };
  if (territory.owner === viewerSect) {
    const count = (territory.defenders || []).length;
    return { level: "own", label: `己方驻军 ${count} 人`, confidence: "confirmed", count };
  }
  const profile = expectedDefenseProfile(state, territory, viewerSect);
  return { level: profile.level, label: profile.label, confidence: profile.confidence };
}

function siegeRestReserve(memberCount, mode, ownedCount) {
  if (memberCount < 4) return 0;
  const desired = memberCount <= 5
    ? 1
    : memberCount <= 8
      ? (mode === "conservative" ? 3 : mode === "aggressive" ? 1 : 2)
      : Math.min(
        mode === "conservative" ? 5 : mode === "aggressive" ? 3 : 4,
        Math.ceil(memberCount * (mode === "conservative" ? 0.3 : mode === "aggressive" ? 0.15 : 0.25))
      );
  const defenseFloor = minimumSiegeDefenders(memberCount, ownedCount);
  const attackFloor = minimumAutomaticAttackers(memberCount, ownedCount, mode);
  return Math.min(desired, Math.max(0, memberCount - defenseFloor - attackFloor));
}

function minimumSiegeDefenders(memberCount, ownedCount) {
  if (!ownedCount || !memberCount) return 0;
  return Math.min(memberCount, ownedCount);
}

function minimumAutomaticAttackers(memberCount, ownedCount, mode = "balanced") {
  if (!memberCount) return 0;
  const defenseFloor = minimumSiegeDefenders(memberCount, ownedCount);
  const available = Math.max(0, memberCount - defenseFloor);
  const restFloor = memberCount >= 4 && available >= 2 ? 1 : 0;
  const deployable = Math.max(0, available - restFloor);
  const target = mode === "conservative"
    ? 1
    : memberCount >= 6
      ? (mode === "aggressive" ? 4 : 3)
      : memberCount >= 4
        ? 2
        : 1;
  const territoryAdjustedTarget = ownedCount >= Math.max(1, memberCount - 3)
    ? 1
    : ownedCount >= Math.ceil(memberCount / 2)
      ? Math.min(2, target)
      : target;
  return Math.min(territoryAdjustedTarget, deployable);
}

function desiredSiegeDefenders(memberCount, ownedCount, mode = "balanced", reservedCount = 0, protectedRestCount = 0) {
  if (!memberCount || !ownedCount) return 0;
  const ratio = mode === "conservative" ? 0.5 : mode === "aggressive" ? 0.25 : 0.3;
  const coverage = Math.min(memberCount, ownedCount);
  const strategicTarget = Math.max(coverage, Math.ceil(memberCount * ratio));
  const available = Math.max(0, memberCount - reservedCount - protectedRestCount);
  return Math.min(memberCount, maxSiegeTeamSize * ownedCount, available, strategicTarget);
}

function sectSiegeDutyRecord(state, entityId) {
  const record = state.sectSiegeDuty?.[entityId] || {};
  const activeYesterday = Number(record.lastDay || 0) === Number(state.day || 0) - 1;
  return {
    burden: Math.max(0, Number(record.burden) || 0),
    consecutiveDuty: activeYesterday ? Math.max(0, Number(record.consecutiveDuty) || 0) : 0,
    consecutiveRest: activeYesterday ? Math.max(0, Number(record.consecutiveRest) || 0) : 0,
    consecutiveRole: activeYesterday ? Math.max(0, Number(record.consecutiveRole) || 0) : 0,
    lastRole: activeYesterday ? String(record.lastRole || "") : ""
  };
}

function fatigueDutyBand(fatigue) {
  if (fatigue >= sectFatigueMax) return 4;
  if (fatigue >= 19) return 3;
  if (fatigue >= sectFatigueAutoRestThreshold) return 2;
  if (fatigue >= sectFatigueHeavyRestThreshold) return 1;
  return 0;
}

function siegeDutyScore(state, member, role, distance = 1) {
  const fatigue = sectFatigueOf(state, member.entity.id);
  const duty = sectSiegeDutyRecord(state, member.entity.id);
  const sameRole = duty.lastRole === role || (role === "defense" && duty.lastRole === "garrison");
  const rotationPenalty = duty.consecutiveDuty >= 2 ? 12000 : duty.consecutiveDuty * 700;
  const rolePenalty = sameRole ? duty.consecutiveRole * 180 : 0;
  const longRangeStats = role === "attack" && distance >= 3 ? effectiveStats(member.entity, state) : null;
  const longRangeValue = longRangeStats ? longRangeStats.divineSense * 1.5 + longRangeStats.maxMana * 0.4 : 0;
  const powerValue = effectiveSiegePower(state, member.entity, distance) + longRangeValue;
  const rotationTieBreak = deterministicUnit(`siege-duty|${state.rebirth || 1}|${state.day}|${role}|${member.entity.id}`) * 25;
  return fatigueDutyBand(fatigue) * 5000
    + fatigue * 260
    + duty.burden * 190
    + rotationPenalty
    + rolePenalty
    - powerValue * 0.28
    + rotationTieBreak;
}

function siegeRestPriority(state, member) {
  const fatigue = sectFatigueOf(state, member.entity.id);
  const duty = sectSiegeDutyRecord(state, member.entity.id);
  return duty.consecutiveDuty * 100000
    + fatigueDutyBand(fatigue) * 3000
    + fatigue * 220
    + duty.burden * 160
    + deterministicUnit(`siege-rest|${state.rebirth || 1}|${state.day}|${member.entity.id}`) * 20;
}

function defenseRiskScore(state, territory, sectName) {
  return defenseValueForProvince(state, territory, sectName)
    + provinceBorderExposure(state, territory, sectName) * 80
    + recentProvinceWarPressure(state, territory.id) * 55;
}

function expectedSiegeThreatPower(state, sectName) {
  let threat = 1;
  for (const rivalSect of activeSectNames(state)) {
    if (rivalSect === sectName) continue;
    const lineupPower = membersForSect(state, rivalSect)
      .slice(0, attackTeamLimitForSect(state, rivalSect))
      .reduce((sum, member) => sum + effectiveSiegePower(state, member.entity), 0);
    threat = Math.max(threat, lineupPower);
  }
  return threat;
}

function defenseLineupUtility(state, territory, sectName, ids, threat = expectedSiegeThreatPower(state, sectName)) {
  const value = defenseValueForProvince(state, territory, sectName);
  const lineup = [...new Set(ids || [])].slice(0, maxSiegeTeamSize);
  if (!value || !lineup.length) return 0;
  const power = estimateLineupPower(state, lineup, 1);
  const powerCoverage = 1 - Math.exp(-power / Math.max(1, threat * 0.72));
  const formationDepth = 1 - Math.exp(-lineup.length / 2.2);
  return value * (powerCoverage * 0.78 + formationDepth * 0.22);
}

function defensePlanUtility(state, sectName, assignments) {
  let total = 0;
  const threat = expectedSiegeThreatPower(state, sectName);
  for (const [provinceId, ids] of assignments || []) {
    const territory = provinceStateById(state, provinceId);
    if (territory?.owner === sectName) total += defenseLineupUtility(state, territory, sectName, ids, threat);
  }
  return total;
}

function buildDefenseAssignments(state, sectName, reservedIds = new Set(), manualDefense = null, mode = "balanced", fillAvailable = true, protectedRestIds = new Set()) {
  const assignments = new Map();
  const used = new Set([...reservedIds, ...protectedRestIds]);
  const owned = (state.provinces || [])
    .filter((item) => item.owner === sectName)
    .sort((a, b) => defenseRiskScore(state, b, sectName) - defenseRiskScore(state, a, sectName));
  const members = membersForSect(state, sectName).map(({ entity, kind }) => ({ entity, kind }));
  const threat = expectedSiegeThreatPower(state, sectName);
  const manualIds = new Set(Object.values(manualDefense?.provinceIdToMemberIds || {}).flat());
  const reserveTarget = siegeRestReserve(members.length, mode, owned.length);
  const minimumDefenders = Math.min(
    Math.max(0, members.length - reservedIds.size - protectedRestIds.size),
    minimumSiegeDefenders(members.length, owned.length)
  );
  const autoDeployLimit = Math.max(
    minimumDefenders,
    desiredSiegeDefenders(
      members.length,
      owned.length,
      mode,
      reservedIds.size,
      Math.max(reserveTarget, protectedRestIds.size)
    )
  );

  const assign = (territory, entity) => {
    if (!territory || !entity || used.has(entity.id)) return false;
    const province = provinceById(territory.id);
    const limit = province ? defenderLimitForProvince(province) : 3;
    const current = assignments.get(territory.id) || [];
    if (current.length >= limit) return false;
    current.push(entity.id);
    assignments.set(territory.id, current);
    used.add(entity.id);
    return true;
  };

  if (manualDefense) {
    for (const [provinceId, ids] of Object.entries(manualDefense.provinceIdToMemberIds || {})) {
      const territory = owned.find((item) => item.id === provinceId);
      if (!territory) continue;
      for (const id of ids || []) {
        const member = members.find((item) => item.entity.id === id);
        if (member) assign(territory, member.entity);
      }
    }
  }

  if (!fillAvailable) {
    return { assignments, used, manualMemberIds: [...manualIds], autoFill: manualDefense?.autoFill !== false };
  }
  const fillBeyondCoverage = manualDefense?.autoFill !== false;

  const canAutoAssign = (entity) => {
    if (!entity || used.has(entity.id)) return false;
    if (manualIds.has(entity.id)) return true;
    if (used.size - reservedIds.size - protectedRestIds.size >= autoDeployLimit) return false;
    return true;
  };

  const pickCandidate = () => members
    .filter((item) => canAutoAssign(item.entity))
    .sort((a, b) => siegeDutyScore(state, a, "defense") - siegeDutyScore(state, b, "defense"))[0];

  // Coverage is non-negotiable: spread one defender to every owned city before
  // reinforcing valuable or exposed positions.
  for (const territory of owned) {
    if ((assignments.get(territory.id) || []).length) continue;
    const candidate = pickCandidate();
    if (!candidate || !assign(territory, candidate.entity)) break;
  }

  if (!fillBeyondCoverage) return { assignments, used, manualMemberIds: [...manualIds], autoFill: false };

  // After full coverage, reinforce high-value cities up to their baseline.
  for (const territory of owned) {
    const province = provinceById(territory.id);
    const minimum = Math.min(defenseBaselineForProvince(province), defenderLimitForProvince(province));
    while ((assignments.get(territory.id) || []).length < minimum) {
      const candidate = pickCandidate();
      if (!candidate || !assign(territory, candidate.entity)) break;
    }
  }

  while (used.size - reservedIds.size - protectedRestIds.size < minimumDefenders) {
    const candidate = pickCandidate();
    if (!candidate) break;
    const territory = owned
      .filter((item) => (assignments.get(item.id) || []).length < defenderLimitForProvince(provinceById(item.id)))
      .sort((a, b) => defenseRiskScore(state, b, sectName) - defenseRiskScore(state, a, sectName))[0];
    if (!territory || !assign(territory, candidate.entity)) break;
  }

  while (true) {
    const candidate = pickCandidate();
    if (!candidate) break;

    let bestTerritory = null;
    let bestGain = -Infinity;
    for (const territory of owned) {
      const province = provinceById(territory.id);
      const current = assignments.get(territory.id) || [];
      if (current.length >= (province ? defenderLimitForProvince(province) : maxSiegeTeamSize)) continue;
      const before = defenseLineupUtility(state, territory, sectName, current, threat);
      const after = defenseLineupUtility(state, territory, sectName, [...current, candidate.entity.id], threat);
      const modeBias = mode === "conservative" ? 1.08 : mode === "aggressive" ? 0.96 : 1;
      const gain = (after - before) * modeBias;
      if (gain > bestGain) {
        bestGain = gain;
        bestTerritory = territory;
      }
    }
    if (!bestTerritory || !assign(bestTerritory, candidate.entity)) break;
  }
  return { assignments, used, manualMemberIds: [...manualIds], autoFill: true };
}

function estimateLineupPower(state, ids, distance = 1) {
  return ids
    .map((id) => cultivatorById(state, id))
    .filter(Boolean)
    .reduce((sum, entity) => sum + effectiveSiegePower(state, entity, distance), 0);
}

function estimateDefenderPower(state, territory) {
  return estimateLineupPower(state, territory?.defenders || [], 1);
}

function pickAttackTarget(state, sectName, availableMembers, mode = "balanced", manualTargetId = "", targeted = new Set(), requestedCount = maxSiegeTeamSize, attackTeamLimit = maxSiegeTeamSize, forceAttack = false) {
  const ownedIds = provinceIdsForSect(state, sectName);
  const ownedValues = ownedIds.map((id) => provinceResourceValue(provinceById(id), state, sectName));
  const worstOwned = ownedValues.length ? Math.min(...ownedValues) : 0;
  const expansionNeed = Math.max(0, Math.ceil(membersForSect(state, sectName).length / 3) - ownedIds.length);
  const manualTarget = manualTargetId ? provinceStateById(state, manualTargetId) : null;
  const candidates = (state.provinces || [])
    .filter((territory) => territory.owner !== sectName)
    .filter((territory) => manualTarget || !targeted.has(territory.id))
    .filter((territory) => !manualTarget || territory.id === manualTarget.id);
  let best = null;
  for (const territory of candidates) {
    const province = provinceById(territory.id);
    if (!province) continue;
    const distance = ownedIds.length ? provinceDistance(ownedIds, territory.id) : 2;
    const value = provinceResourceValue(province, state, sectName);
    const distanceCost = Math.max(0, distance - 1) * 18;
    const adjacencyBonus = distance === 1 ? 25 : 0;
    const lowValuePenalty = ownedIds.length <= 1 ? Math.max(0, worstOwned * 0.8 - value) * 0.25 : Math.max(0, worstOwned * 0.8 - value) * 0.6;
    const attackLimit = attackerLimitForProvince(province, attackTeamLimit);
    const attackers = [...availableMembers]
      .sort((a, b) => siegeDutyScore(state, a, "attack", distance) - siegeDutyScore(state, b, "attack", distance))
      .slice(0, Math.min(attackLimit, Math.max(1, requestedCount)));
    const attackerPower = attackers.reduce((sum, item) => sum + effectiveSiegePower(state, item.entity, distance), 0);
    const intel = expectedDefenseProfile(state, territory, sectName);
    const defenderPressure = territory.owner ? intel.pressure : 1;
    const winRate = territory.owner ? estimatedWinChance(attackerPower, defenderPressure) : 0.96;
    const aggression = mode === "conservative" ? -20 : mode === "aggressive" ? 18 : 0;
    const score = value * 1.4 + expansionNeed * 28 + adjacencyBonus + winRate * 80 + aggression - distanceCost - lowValuePenalty - defenderPressure * 0.012;
    if (!attackers.length) continue;
    if (!manualTarget && !forceAttack && winRate < (mode === "aggressive" ? 0.28 : mode === "conservative" ? 0.48 : 0.36)) continue;
    if (!best || score > best.score) {
      best = { territory, province, distance, attackers, score, winRate, value, intel, wasOccupied: Boolean(territory.owner) };
    }
  }
  return best;
}

function attackPlanUtility(state, sectName, attack, mode = "balanced") {
  if (!attack?.attackers?.length) return 0;
  const ownedCount = provinceIdsForSect(state, sectName).length;
  const memberCount = membersForSect(state, sectName).length;
  const expansionNeed = Math.max(0, Math.ceil(memberCount / 3) - ownedCount);
  const winRate = attack.territory.owner ? attack.winRate : 0.96;
  const modeWeight = mode === "aggressive" ? 1.2 : mode === "conservative" ? 0.78 : 1;
  const adjacencyBonus = attack.distance === 1 ? 22 : 0;
  const distanceCost = Math.max(0, attack.distance - 1) * 16;
  const deploymentCost = attack.attackers.length * 3;
  return (attack.value * winRate * 1.35 + expansionNeed * 26 + adjacencyBonus - distanceCost - deploymentCost) * modeWeight;
}

function strategyModeLabel(mode) {
  if (mode === "aggressive") return "急攻";
  if (mode === "conservative") return "稳守";
  return "均衡";
}

function provinceResourceLabel(province) {
  const effect = provinceEffect(province);
  if (effect.type === "xp") return `经验城，${effect.text}`;
  if (effect.type === "breakthrough") return `破境城，${effect.text}`;
  return `灵石城，${effect.text}`;
}

function lineupStrategySummary(state, members, distance = 1) {
  const ranked = (members || [])
    .map((member) => member?.entity || member)
    .filter(Boolean)
    .map((entity) => ({
      id: entity.id,
      name: entity.name,
      power: effectiveSiegePower(state, entity, distance),
      fatigue: sectFatigueOf(state, entity.id)
    }))
    .sort((a, b) => b.power - a.power);
  return {
    count: ranked.length,
    totalPower: ranked.reduce((sum, item) => sum + item.power, 0),
    topNames: ranked.slice(0, 3).map((item) => item.name),
    tiredNames: ranked.filter((item) => item.fatigue >= 8).slice(0, 2).map((item) => item.name)
  };
}

function siegeStrategyRoster(state, sectName, selectedIds, { role, targetProvinceId, distance = 1, manualMemberIds = [] } = {}) {
  const selected = new Set(selectedIds || []);
  const manual = new Set(manualMemberIds || []);
  const assignments = new Map();
  for (const territory of state.provinces || []) {
    if (territory.owner !== sectName) continue;
    for (const id of territory.defenders || []) assignments.set(id, territory.id);
  }
  const targetName = provinceById(targetProvinceId)?.name || "此城";
  const roster = membersForSect(state, sectName)
    .map(({ entity, kind }) => ({
      entity,
      kind,
      power: effectiveSiegePower(state, entity, distance),
      fatigue: sectFatigueOf(state, entity.id),
      duty: sectSiegeDutyRecord(state, entity.id)
    }))
    .sort((a, b) => b.power - a.power || a.entity.name.localeCompare(b.entity.name, "zh-Hans-CN"));
  const selectedNames = roster.filter((entry) => selected.has(entry.entity.id)).map((entry) => entry.entity.name);
  const rotationRanks = new Map([...roster]
    .sort((a, b) => siegeDutyScore(state, a, role, distance) - siegeDutyScore(state, b, role, distance))
    .map((entry, index) => [entry.entity.id, index + 1]));
  const selectedOrder = new Map((selectedIds || []).map((id, index) => [id, index]));

  const rotationSnapshot = (entry) => {
    if (entry.duty.consecutiveRest > 0) return `已轮休 ${entry.duty.consecutiveRest} 日`;
    if (entry.duty.consecutiveDuty > 0) return `已连续执勤 ${entry.duty.consecutiveDuty} 日`;
    return "昨日无连续执勤";
  };

  return roster.map((entry, index) => {
    const selectedHere = selected.has(entry.entity.id);
    const assignedProvinceId = assignments.get(entry.entity.id);
    const assignedName = provinceById(assignedProvinceId)?.name || "其他城池";
    const rotationRank = rotationRanks.get(entry.entity.id) || roster.length;
    let reason;
    if (selectedHere && role === "attack") {
      reason = manual.has(entry.entity.id)
        ? "按手动军令指定，列入本次攻城队。"
        : `并非单按战力选将：综合疲劳、连续出勤、历史负担和远征战力后，攻城轮换顺位第 ${rotationRank}；${rotationSnapshot(entry)}，因此进入本次 ${selected.size} 人攻城队。`;
    } else if (selectedHere) {
      const coverageReason = (selectedOrder.get(entry.entity.id) || 0) === 0
        ? `${targetName}必须先落实至少 1 名守军，`
        : `${targetName}完成保底布防后仍获得增援名额，`;
      reason = manual.has(entry.entity.id)
        ? `按手动布防军令，负责驻守${targetName}。`
        : `${coverageReason}系统再按疲劳、连续出勤、历史负担和守备战力轮换；${entry.entity.name}虽守备战力排第 ${index + 1}，但综合轮换顺位第 ${rotationRank}，${rotationSnapshot(entry)}，因此入选。`;
    } else if (assignedProvinceId && assignedProvinceId !== targetProvinceId) {
      reason = `已编入${assignedName}守城队，不能同日调往${targetName}。`;
    } else if (role === "attack") {
      reason = `攻城轮换顺位第 ${rotationRank}；先保留各城守军与休整位后，本次 ${selected.size} 个名额已由${selectedNames.join("、") || "其他成员"}占用。`;
    } else {
      reason = `守城轮换顺位第 ${rotationRank}；${targetName}完成保底与增援分配后，本次 ${selected.size} 个名额已确定。`;
    }
    return {
      id: entry.entity.id,
      name: entry.entity.name,
      power: entry.power,
      fatigue: entry.fatigue,
      selected: selectedHere,
      reason
    };
  });
}

function provinceWarStrategyForPlan(state, plan, target, province, defenderSect, defenderPlan = null) {
  const attackerSect = plan.sectName;
  const ownedIds = provinceIdsForSect(state, attackerSect);
  const members = membersForSect(state, attackerSect);
  const distance = plan.attack?.distance || (ownedIds.length ? provinceDistance(ownedIds, target.id) : 2);
  const value = plan.attack?.value || provinceResourceValue(province, state, attackerSect);
  const attackers = lineupStrategySummary(state, plan.attack?.attackers || [], distance);
  const defenderIds = target.defenders || [];
  const defenders = lineupStrategySummary(state, defenderIds.map((id) => cultivatorById(state, id)).filter(Boolean), 1);
  const attackerRoster = siegeStrategyRoster(state, attackerSect, (plan.attack?.attackers || []).map((member) => member.entity.id), {
    role: "attack",
    targetProvinceId: target.id,
    distance,
    manualMemberIds: plan.attack?.manualMemberIds || []
  });
  const defenderRoster = defenderSect
    ? siegeStrategyRoster(state, defenderSect, defenderIds, {
      role: "defense",
      targetProvinceId: target.id,
      manualMemberIds: defenderPlan?.defense?.manualMemberIds || []
    })
    : [];
  const intel = plan.attack?.intel || expectedDefenseProfile(state, target, attackerSect);
  const outlook = !defenderSect ? "优势" : plan.attack?.winRate >= 0.62 ? "优势" : plan.attack?.winRate >= 0.4 ? "均势" : "劣势";
  const modeLabel = strategyModeLabel(plan.mode);
  const attackIntent = plan.attack?.playerDirected
    ? "按你保存的明日军令出兵；所有宗门同时提交计划，目标冲突仍需统一裁决。"
    : ownedIds.length
      ? `${modeLabel}策略下，优先挑选距离 ${distance} 步、资源评分 ${value} 的可攻省份。`
      : `${modeLabel}策略下，本宗尚无据点，先取资源评分 ${value} 的立足之城。`;
  const terrainPoint = distance <= 1
    ? "目标贴近己方疆域，调兵成本低，后续也便于连成防线。"
    : `目标距离己方据点 ${distance} 步，远征会削弱攻城战力，但资源收益足以覆盖成本。`;
  const reinforcementPoint = plan.attack?.reassignedToDefense
    ? ` 来敌后回调 ${plan.attack.reassignedToDefense} 名非手动指定成员增援受袭城市。`
    : "";
  const attackerPoint = (plan.attack?.playerDirected
    ? `攻城队以指定人选为先，在不挤占每城保底守军的前提下，再按轮换负担与远征战力补齐至 ${attackers.count} 人。`
    : `先锁定每城保底守军与休整位，再从剩余成员里综合疲劳、连续出勤、历史负担与远征战力，轮换 ${attackers.count} 人出阵。`) + reinforcementPoint;
  const defenderPoint = defenderSect
    ? `战前只能观察到“${intel.label}”，无法获知今日守军人数、名单与疲劳。`
    : "此地暂为无主之地，无守军，只需派人立旗接管。";

  return {
    summary: `${modeLabel}研判：${province.name}是${provinceResourceLabel(province)}，战前态势判断为${outlook}。`,
    preBattle: {
      title: "战前研判",
      points: [attackIntent, terrainPoint, defenderPoint],
      metrics: [
        { label: "资源评分", value },
        { label: "距离", value: `${distance} 步` },
        { label: "守备情报", value: defenderSect ? intel.label.replace("守备迹象", "") : "无主" },
        { label: "态势", value: outlook }
      ]
    },
    postBattle: {
      title: "战后查明",
      points: defenderSect
        ? [
            `实际遭遇守军 ${defenders.count} 人，总守备战力 ${defenders.totalPower}。`,
            defenders.topNames.length ? `守城核心为 ${defenders.topNames.join("、")}。` : "该城实际没有有效守军。",
            defenders.tiredNames.length ? `${defenders.tiredNames.join("、")}带有较高疲劳参战。` : "守军整体疲劳处于可控范围。"
          ]
        : ["实际没有遭遇守军，攻方完成接管。"],
      metrics: [
        { label: "攻方人数", value: attackers.count },
        { label: "守方人数", value: defenders.count },
        { label: "攻方战力", value: attackers.totalPower },
        { label: "守方战力", value: defenders.totalPower }
      ]
    },
    attack: {
      title: plan.attack?.playerDirected ? "执行手动战略" : "择城研判",
      points: [
        attackIntent,
        terrainPoint,
        defenderPoint
      ],
      metrics: [
        { label: "资源评分", value },
        { label: "距离", value: `${distance} 步` },
        { label: "态势", value: outlook }
      ]
    },
    attackers: {
      title: "选将逻辑",
      points: [
        attackerPoint,
        attackers.topNames.length ? `主力为 ${attackers.topNames.join("、")}，当前队伍总攻城战力 ${attackers.totalPower}。` : "没有可用攻城成员。",
        attackers.tiredNames.length ? `${attackers.tiredNames.join("、")}疲劳偏高，需警惕连续出阵导致的战力衰减。` : "本次出阵成员疲劳可控。"
      ],
      roster: attackerRoster
    },
    defenders: {
      title: defenderSect ? "战后守军" : "守方情报",
      points: [
        defenderSect ? `实际守城队 ${defenders.count} 人，总守备 ${defenders.totalPower}。` : defenderPoint,
        defenderSect && defenders.topNames.length ? `守城核心为 ${defenders.topNames.join("、")}，依托城防获得阵地加成。` : "没有守城队列。",
        defenderSect ? "该阵容在结算揭晓前不向攻方公开。" : "攻下后明日会按新归属重新安排防守。"
      ],
      roster: defenderRoster
    }
  };
}

function monsterWarStrategyForProvince(state, target, province, defenderSect, defenderPlan = null) {
  const value = provinceResourceValue(province, state, defenderSect);
  const held = Math.max(0, Number(target.heldDays) || 0);
  const ownerCount = (state.provinces || []).filter((item) => item.owner === defenderSect).length;
  const defenders = lineupStrategySummary(state, (target.defenders || []).map((id) => cultivatorById(state, id)).filter(Boolean), 1);
  const defenderRoster = defenderSect
    ? siegeStrategyRoster(state, defenderSect, target.defenders || [], {
        role: "defense",
        targetProvinceId: target.id,
        manualMemberIds: defenderPlan?.defense?.manualMemberIds || []
      })
    : [];
  const grade = provinceGrade(province);
  const monsterCount = provinceMonsterSiegeCount(state, province);
  return {
    summary: `妖潮择城：${province.name}为 ${grade} 档城市，资源评分 ${value}，本次共有 ${monsterCount} 只妖物冲阵。`,
    attack: {
      title: "妖潮择城",
      points: [
        "妖潮优先冲击资源价值高、持有时间较久、宗门领地较多的城市；长期未易主会提高被选中的权重。",
        `守方当前拥有 ${ownerCount} 城，${province.name}的资源评分为 ${value}。`,
        "每次仍会按权重随机抽取，长期持有并不等于必定受袭；近期刚遭妖潮的城市会被降低权重。"
      ],
      metrics: [
        { label: "资源评分", value },
        { label: "城市档位", value: grade },
        { label: "妖潮", value: `${monsterCount} 只` },
        { label: "持有", value: `${held} 日` },
        { label: "守军", value: `${defenders.count} 人` }
      ]
    },
    attackers: {
      title: "妖物阵容",
      points: [
        `本次妖潮规模为 ${monsterCount} 只，城市档位越高，妖物数量越多。`,
        "妖物境界通常低于守方最高境界一层，并依次加入车轮战。"
      ]
    },
    defenders: {
      title: "守城布防",
      points: [
        defenders.count ? `守军 ${defenders.count} 人，总守备 ${defenders.totalPower}，核心为 ${defenders.topNames.join("、")}。` : "此城没有有效守军，妖潮极易破城。",
        "守城成员依托城防获得阵地加成，疲劳会削弱实战表现。"
      ],
      roster: defenderRoster
    }
  };
}

function buildSectSiegePlan(state, sectName, targeted, options = {}) {
  const members = membersForSect(state, sectName).map(({ entity, kind }) => ({ entity, kind }));
  if (!members.length) return null;
  const mode = options.mode || "balanced";
  const owned = (state.provinces || []).filter((item) => item.owner === sectName);
  const manualAttack = options.attack || null;
  const manualAttackTargetId = manualAttack?.targetProvinceId || "";
  const coverageSafeAttackLimit = Math.max(0, members.length - minimumSiegeDefenders(members.length, owned.length));
  const manualAttackMembers = new Set((manualAttack?.memberIds || [])
    .filter((id) => members.some((member) => member.entity.id === id))
    .slice(0, coverageSafeAttackLimit));
  const manualDefense = options.defense || null;
  const manualDefenseIds = new Set(Object.values(manualDefense?.provinceIdToMemberIds || {}).flat());
  const desiredRestCount = siegeRestReserve(members.length, mode, owned.length);
  const protectedRestCount = Math.min(
    desiredRestCount,
    Math.max(0, members.length - minimumSiegeDefenders(members.length, owned.length) - manualAttackMembers.size)
  );
  const protectedRestIds = new Set([...members]
    .filter((member) => !manualAttackMembers.has(member.entity.id) && !manualDefenseIds.has(member.entity.id))
    .sort((a, b) => siegeRestPriority(state, b) - siegeRestPriority(state, a))
    .slice(0, protectedRestCount)
    .map((member) => member.entity.id));
  const attackTeamLimit = Math.max(1, Math.floor(Number(options.attackTeamLimit) || maxSiegeTeamSize));
  const explicitDefense = owned.length
    ? buildDefenseAssignments(state, sectName, manualAttackMembers, manualDefense, mode, false, protectedRestIds)
    : { assignments: new Map(), used: new Set([...manualAttackMembers, ...protectedRestIds]) };
  const manualAttackTarget = manualAttackTargetId ? provinceStateById(state, manualAttackTargetId) : null;
  const availableAttackMembers = members.filter((member) => !explicitDefense.used.has(member.entity.id));
  const automaticAttackPool = [...availableAttackMembers]
    .sort((a, b) => siegeDutyScore(state, a, "attack") - siegeDutyScore(state, b, "attack"));

  if (manualAttackTarget && manualAttackTarget.owner !== sectName) {
    const province = provinceById(manualAttackTarget.id);
    const distance = owned.length ? provinceDistance(owned.map((item) => item.id), manualAttackTarget.id) : 2;
    const manualMembers = [...manualAttackMembers]
      .map((id) => members.find((member) => member.entity.id === id))
      .filter(Boolean);
    const fillPool = automaticAttackPool.filter((member) => !manualAttackMembers.has(member.entity.id));
    const limit = Math.min(
      province ? attackerLimitForProvince(province, attackTeamLimit) : attackTeamLimit,
      coverageSafeAttackLimit
    );
    const attackers = [
      ...manualMembers,
      ...(manualAttack?.autoFill !== false ? fillPool.sort((a, b) => effectiveSiegePower(state, b.entity, distance) - effectiveSiegePower(state, a.entity, distance)).slice(0, Math.max(0, limit - manualMembers.length)) : [])
    ].slice(0, limit);
    if (attackers.length && !targeted.has(manualAttackTarget.id)) {
      const intel = expectedDefenseProfile(state, manualAttackTarget, sectName);
      const attackerPower = attackers.reduce((sum, member) => sum + effectiveSiegePower(state, member.entity, distance), 0);
      const defense = owned.length
        ? buildDefenseAssignments(state, sectName, new Set(attackers.map((member) => member.entity.id)), manualDefense, mode, true, protectedRestIds)
        : { assignments: new Map(), used: new Set(attackers.map((member) => member.entity.id)) };
      targeted.add(manualAttackTarget.id);
      return {
        sectName,
        mode,
        defense,
        attack: {
          territory: manualAttackTarget,
          province,
          distance,
          attackers,
          attackTeamLimit,
          playerDirected: true,
          manualMemberIds: [...manualAttackMembers],
          value: provinceResourceValue(province, state, sectName),
          intel,
          winRate: manualAttackTarget.owner ? estimatedWinChance(attackerPower, intel.pressure) : 0.96,
          wasOccupied: Boolean(manualAttackTarget.owner),
          onConflict: manualAttack?.onConflict === "cancel" ? "cancel" : "retarget"
        }
      };
    }
  }

  const noAttackDefense = owned.length
    ? buildDefenseAssignments(state, sectName, new Set(), manualDefense, mode, true, protectedRestIds)
    : { assignments: new Map(), used: new Set() };
  let bestPlan = {
    defense: noAttackDefense,
    attack: null,
    utility: defensePlanUtility(state, sectName, noAttackDefense.assignments)
  };

  if (manualAttack?.autoFill !== false) {
    const restFloor = siegeRestReserve(members.length, mode, owned.length);
    const defenseFloor = minimumSiegeDefenders(members.length, owned.length);
    const maxAttackers = Math.min(
      attackTeamLimit,
      automaticAttackPool.length,
      Math.max(0, members.length - restFloor - defenseFloor)
    );
    const minimumAttackers = Math.min(maxAttackers, minimumAutomaticAttackers(members.length, owned.length, mode));
    if (minimumAttackers > 0) {
      for (let attackerCount = minimumAttackers; attackerCount <= maxAttackers; attackerCount += 1) {
        const attack = pickAttackTarget(state, sectName, automaticAttackPool, mode, "", targeted, attackerCount, attackTeamLimit);
        if (!attack) continue;
        const reserved = new Set(attack.attackers.map((member) => member.entity.id));
        const defense = owned.length
          ? buildDefenseAssignments(state, sectName, reserved, manualDefense, mode, true, protectedRestIds)
          : { assignments: new Map(), used: new Set(reserved) };
        const utility = defensePlanUtility(state, sectName, defense.assignments) + attackPlanUtility(state, sectName, attack, mode);
        if (utility > bestPlan.utility) bestPlan = { defense, attack: { ...attack, attackTeamLimit }, utility };
      }
    }

    if (!bestPlan.attack && minimumAttackers > 0) {
      const attack = pickAttackTarget(state, sectName, automaticAttackPool, "aggressive", "", targeted, minimumAttackers, attackTeamLimit, true);
      if (attack) {
        const reserved = new Set(attack.attackers.map((member) => member.entity.id));
        const defense = owned.length
          ? buildDefenseAssignments(state, sectName, reserved, manualDefense, mode, true, protectedRestIds)
          : { assignments: new Map(), used: new Set(reserved) };
        bestPlan = { defense, attack: { ...attack, attackTeamLimit }, utility: 0 };
      }
    }
  }

  if (bestPlan.attack) targeted.add(bestPlan.attack.territory.id);
  return { sectName, mode, defense: bestPlan.defense, attack: bestPlan.attack };
}

function retargetSiegePlan(state, plan, blockedTargets = new Set()) {
  if (!plan?.attack?.attackers?.length) return null;
  const sectName = plan.sectName;
  const ownedIds = provinceIdsForSect(state, sectName);
  const attackers = plan.attack.attackers;
  let best = null;
  for (const territory of state.provinces || []) {
    if (territory.owner === sectName || blockedTargets.has(territory.id)) continue;
    const province = provinceById(territory.id);
    if (!province) continue;
    const distance = ownedIds.length ? provinceDistance(ownedIds, territory.id) : 2;
    const value = provinceResourceValue(province, state, sectName);
    const intel = expectedDefenseProfile(state, territory, sectName);
    const attackerPower = attackers.reduce((sum, member) => sum + effectiveSiegePower(state, member.entity, distance), 0);
    const winRate = estimatedWinChance(attackerPower, intel.pressure);
    const score = value * 1.4 + winRate * 80 + (distance === 1 ? 25 : 0) - Math.max(0, distance - 1) * 18;
    if (!best || score > best.score) best = { territory, province, distance, value, intel, winRate, score };
  }
  return best ? { ...plan.attack, ...best, wasOccupied: Boolean(best.territory.owner) } : null;
}

function siegeConflictPriority(state, plan) {
  const attack = plan?.attack;
  if (!attack) return -Infinity;
  const power = (attack.attackers || []).reduce((sum, member) => sum + effectiveSiegePower(state, member.entity, attack.distance || 1), 0);
  const variance = deterministicUnit(`siege-conflict|${state.rebirth || 1}|${state.day}|${plan.sectName}|${attack.territory?.id}`) * 120;
  return power - Math.max(0, (attack.distance || 1) - 1) * 45 + variance;
}

function resolveSimultaneousSiegeTargets(state, plans, blockedTargets = new Set()) {
  const claims = new Map();
  const displaced = [];
  for (const plan of plans) {
    const targetId = plan?.attack?.territory?.id;
    if (!targetId) continue;
    if (blockedTargets.has(targetId)) {
      displaced.push(plan);
      continue;
    }
    const list = claims.get(targetId) || [];
    list.push(plan);
    claims.set(targetId, list);
  }
  const accepted = new Set(blockedTargets);
  for (const [targetId, contenders] of claims) {
    contenders.sort((a, b) => siegeConflictPriority(state, b) - siegeConflictPriority(state, a));
    accepted.add(targetId);
    displaced.push(...contenders.slice(1));
  }
  displaced.sort((a, b) => siegeConflictPriority(state, b) - siegeConflictPriority(state, a));
  for (const plan of displaced) {
    const previousAttack = plan.attack;
    const fallback = previousAttack.onConflict === "cancel" ? null : retargetSiegePlan(state, plan, accepted);
    if (fallback) {
      plan.attack = fallback;
      accepted.add(fallback.territory.id);
      plan.attack.retargetedFrom = previousAttack.territory.id;
    } else {
      plan.attack = null;
      plan.abortedAttackers = (previousAttack.attackers || []).map((member) => member.entity.id);
      plan.abortedTargetId = previousAttack.territory.id;
    }
  }
  return plans;
}

function ensureProvinceState(state) {
  let changed = false;
  if (state.provinceVersion !== provinceVersion || !Array.isArray(state.provinces)) {
    const previous = new Map((state.provinces || []).map((item) => [item.id, item]));
    state.provinces = createProvinceState(state).map((item) => ({
      ...item,
      owner: previous.get(item.id)?.owner ?? item.owner,
      defenders: Array.isArray(previous.get(item.id)?.defenders) ? previous.get(item.id).defenders : item.defenders
    }));
    state.provinceVersion = provinceVersion;
    changed = true;
  }
  state.provinceWars ??= [];
  const known = new Set(provinces.map((province) => province.id));
  state.provinces = state.provinces.filter((item) => known.has(item.id));
  for (const province of provinces) {
    if (!state.provinces.some((item) => item.id === province.id)) {
      state.provinces.push({ id: province.id, owner: null, defenders: [] });
      changed = true;
    }
  }
  changed = enforceProvinceOccupationLimits(state) || changed;
  changed = assignProvinceDefenders(state) || changed;
  return changed;
}

function breakthroughChanceFor(state, entity) {
  const sectName = entity.id === "player" ? state.sect.name : entity.sect;
  const potionBonus = entity.id === "player" ? activeBreakthroughBonus(state) : 0;
  const pearlBonus = spiritPearlBonusFor(state, entity, "breakthrough");
  const fortuneBonus = dailyRootFortuneBreakthroughBonus(state, entity);
  const beforePotion = breakthroughChance(entity) * (1 + sectBreakthroughBonus(state, sectName, entity)) + pearlBonus;
  const championBonus = entity.championDaoRhyme?.active && entity.championDaoRhyme.realm === entity.realm
    ? Number(entity.championDaoRhyme.bonus || 0)
    : 0;
  return clamp(
    beforePotion + potionBonus + championBonus + fortuneBonus,
    minimumBreakthroughChance(entity.realm || 0),
    entity.id === "player" ? 0.95 : 0.82
  );
}

function breakthroughChanceParts(state, entity) {
  const realmBase = baseBreakthroughChance(entity.realm || 0);
  const rootMultiplier = rootBreakthroughChanceMultiplier(entity);
  const talentMultiplier = talentSnapshot(entity).breakthroughMultiplier;
  const base = clamp(
    realmBase * rootMultiplier * talentMultiplier,
    minimumBreakthroughChance(entity.realm || 0),
    0.82
  );
  const sectName = entity.id === "player" ? state.sect.name : entity.sect;
  const bonus = sectBreakthroughBonus(state, sectName, entity);
  const sectMultiplier = 1 + bonus;
  const potionBonus = entity.id === "player" ? activeBreakthroughBonus(state) : 0;
  const pearlBonus = spiritPearlBonusFor(state, entity, "breakthrough");
  const fortuneBonus = dailyRootFortuneBreakthroughBonus(state, entity);
  const championBonus = entity.championDaoRhyme?.active && entity.championDaoRhyme.realm === entity.realm
    ? Number(entity.championDaoRhyme.bonus || 0)
    : 0;
  const beforePotion = base * sectMultiplier + pearlBonus;
  return {
    realmBase,
    rootMultiplier,
    talentMultiplier,
    sectMultiplier,
    base,
    bonus,
    potionBonus,
    championBonus,
    spiritPearlBonus: pearlBonus,
    dailyRootFortuneBonus: fortuneBonus,
    total: clamp(beforePotion + potionBonus + championBonus + fortuneBonus, minimumBreakthroughChance(entity.realm || 0), entity.id === "player" ? 0.95 : 0.82)
  };
}

function xpPreviewParts(state, entity, baseXp = entity.id === "player" ? playerDailyBaseXp : 100) {
  const sectName = entity.id === "player" ? state.sect.name : entity.sect;
  const rootMultiplier = entity.id === "player" ? 1 : xpGainMultiplier(entity, state);
  const talentMultiplier = talentSnapshot(entity).xpMultiplier;
  const sectMultiplier = 1 + sectXpBonus(state, sectName, entity);
  const rootTotal = Math.floor(baseXp * rootMultiplier);
  const talentTotal = Math.floor(rootTotal * talentMultiplier);
  const total = Math.floor(talentTotal * sectMultiplier);
  return {
    baseXp,
    rootMultiplier,
    talentMultiplier,
    sectMultiplier,
    total,
    rootDelta: rootTotal - baseXp,
    talentDelta: talentTotal - rootTotal,
    sectDelta: total - talentTotal
  };
}

function personInsight(state, entity) {
  return {
    rootProfile: rootProfile(entity),
    dailyRootFortune: publicDailyRootFortune(state, entity),
    effectiveStats: effectiveStats(entity, state),
    talent: talentSnapshot(entity),
    power: powerOf(entity, state),
    tomorrowXp: xpPreviewParts(state, entity),
    breakthrough: breakthroughChanceParts(state, entity)
  };
}

function rootRulesCatalog() {
  return {
    cycle: rootCycle.map((key) => {
      const root = rootByKey(key);
      const target = rootByKey(rootCounterTarget(key));
      return {
        key,
        name: root.name,
        targetKey: target.key,
        targetName: target.name,
        text: `${root.name}克${target.name}`
      };
    }),
    specialRoots: specialRoots.map((special) => ({
      ...special,
      childNames: special.keys.map((key) => rootByKey(key).name),
      counterText: `${special.name}克${special.keys.map((key) => rootByKey(key).name).join("、")}，不受其他灵根相克。`
    }))
  };
}

let cachedStaticCatalog = null;

function staticCatalog() {
  if (cachedStaticCatalog) return cachedStaticCatalog;
  cachedStaticCatalog = {
    realms,
    realmStages,
    roots,
    rootRules: rootRulesCatalog(),
    dailyRootFortunes: dailyRootFortuneDefinitions,
    dungeons,
    taskTemplates,
    itemCatalog,
    sects,
    combatSkills,
    provinces,
    provinceAdjacency,
    spiritPearls,
    equipmentSlots,
    equipmentTiers,
    equipmentCatalog,
    duelRanks,
  };
  return cachedStaticCatalog;
}

const baseBreakthroughAttempts = 1;
const maxBreakthroughAttemptsPerDay = 4;
const maxBreakthroughBonusStacks = 4;

function itemEntries() {
  return Object.entries(itemCatalog);
}

function emptyBag() {
  return Object.fromEntries(itemEntries().map(([id]) => [id, 0]));
}

function shopSeed(id, day) {
  let hash = Math.max(1, Number(day) || 1) * 131;
  for (const char of String(id)) hash = (hash * 31 + char.charCodeAt(0)) % 1000003;
  return hash;
}

function shopPriceFactor(id, day) {
  const normalized = (shopSeed(id, day) % 401) / 1000;
  return Number((0.8 + normalized).toFixed(3));
}

function shopPriceFor(state, id) {
  const item = itemCatalog[id];
  if (!item) return 0;
  const permanentBought = Number(state.shop?.permanentPurchases?.[id] || 0);
  const base = Number(item.basePrice || item.price || 0) + permanentBought * Number(item.priceStep || 0);
  return Math.max(1, Math.round(base * shopPriceFactor(id, state.day)));
}

function shopSellPriceFor(state, id) {
  const item = itemCatalog[id];
  if (!item) return 0;
  if (item.limit?.type !== "permanent") {
    return Math.max(1, Math.floor(shopPriceFor(state, id) * 0.9));
  }
  const permanentBought = Math.max(0, Math.floor(Number(state.shop?.permanentPurchases?.[id]) || 0));
  const soldUnitIndex = Math.max(0, permanentBought - 1);
  const base = Number(item.basePrice || item.price || 0) + soldUnitIndex * Number(item.priceStep || 0);
  return Math.max(1, Math.floor(Math.round(base * shopPriceFactor(id, state.day)) * 0.9));
}

function limitKeyFor(state, id, limit = itemCatalog[id]?.limit) {
  if (!limit) return "none";
  if (limit.type === "daily") return `day:${state.day}`;
  if (limit.type === "cycle") {
    const days = Math.max(1, Math.floor(Number(limit.days) || 1));
    return `cycle:${days}:${Math.floor((Math.max(1, state.day) - 1) / days)}`;
  }
  if (limit.type === "realm") return `realm:${state.player?.realm || 0}`;
  if (limit.type === "permanent") return "permanent";
  return "none";
}

function limitResetDay(state, limit = {}) {
  if (limit.type === "daily") return state.day + 1;
  if (limit.type === "cycle") {
    const days = Math.max(1, Math.floor(Number(limit.days) || 1));
    const cycleStart = Math.floor((Math.max(1, state.day) - 1) / days) * days + 1;
    return cycleStart + days;
  }
  return null;
}

function limitWindowText(limit = {}) {
  if (limit.type === "daily") return "每日";
  if (limit.type === "cycle") return `每 ${Math.max(1, Number(limit.days) || 1)} 天`;
  if (limit.type === "realm") return "每境界";
  if (limit.type === "permanent") return "永久药性";
  return "不限";
}

function shopPurchaseRecord(state, id) {
  state.shop ??= {};
  state.shop.purchases ??= {};
  const item = itemCatalog[id];
  const key = limitKeyFor(state, id, item?.limit);
  const record = state.shop.purchases[id];
  if (!record || record.key !== key) {
    state.shop.purchases[id] = { key, count: 0 };
  }
  return state.shop.purchases[id];
}

function shopItemState(state, id) {
  const item = itemCatalog[id];
  if (!item) return null;
  const limit = item.limit || {};
  const permanentBought = Number(state.shop?.permanentPurchases?.[id] || 0);
  const permanentUsed = Number(state.shop?.permanentUses?.[id] || 0);
  const record = shopPurchaseRecord(state, id);
  const max = Math.max(0, Math.floor(Number(limit.max) || 0));
  const used = limit.type === "permanent" ? permanentBought : Math.max(0, Math.floor(Number(record.count) || 0));
  const remaining = max ? Math.max(0, max - used) : Infinity;
  const resetDay = limitResetDay(state, limit);
  const countdownDays = resetDay ? Math.max(0, resetDay - state.day) : null;
  const price = shopPriceFor(state, id);
  let canBuy = remaining > 0 && (limit.type !== "permanent" || permanentUsed < max);
  let reason = "";
  if (!canBuy) reason = limit.type === "permanent" && permanentUsed >= max ? "药性已满" : "限购已满";
  else if (state.player.spirit < price) {
    canBuy = false;
    reason = "灵石不足";
  }
  return {
    id,
    price,
    sellPrice: shopSellPriceFor(state, id),
    basePrice: item.basePrice || item.price || 0,
    priceFactor: shopPriceFactor(id, state.day),
    limitType: limit.type || "none",
    limitText: `${limitWindowText(limit)}限购 ${max || "不限"} 枚`,
    limitMax: max,
    purchasedInWindow: Number.isFinite(used) ? used : 0,
    remaining: Number.isFinite(remaining) ? remaining : null,
    resetDay,
    countdownDays,
    countdownText: resetDay ? `${countdownDays} 天后重置` : (limit.type === "realm" ? "突破后进入新境界重置" : "不重置"),
    canBuy,
    reason
  };
}

function publicShop(state) {
  return {
    day: state.day,
    items: itemEntries().map(([id, item]) => ({
      id,
      ...item,
      ...shopItemState(state, id)
    })),
    activeEffects: publicElixirEffects(state),
    breakthroughAttempts: breakthroughAttemptInfo(state)
  };
}

function publicSectStrategy(state) {
  const playerSect = state.sect.name;
  const owned = (state.provinces || []).filter((territory) => territory.owner === playerSect);
  const attackTeamLimit = attackTeamLimitForSect(state, playerSect);
  const plan = normalizePlayerSectPlan(state.playerSectPlan, state.playerSectPlan?.targetDay || state.day + 1, attackTeamLimit);
  const fatiguePrevious = state.sectFatiguePrevious || {};
  const ownedIds = owned.map((territory) => territory.id);
  const defaultAttackers = membersForSect(state, playerSect)
    .sort((a, b) => powerOf(b.entity, state) - powerOf(a.entity, state))
    .slice(0, attackTeamLimit)
    .map(({ entity }) => entity.id);
  const attackerIds = plan.attack.memberIds.length ? plan.attack.memberIds : defaultAttackers;
  const forecastByProvince = Object.fromEntries((state.provinces || [])
    .filter((territory) => territory.owner && territory.owner !== playerSect)
    .map((territory) => {
      const distance = ownedIds.length ? provinceDistance(ownedIds, territory.id) : 2;
      const attackerPower = attackerIds
        .map((id) => cultivatorById(state, id))
        .filter(Boolean)
        .reduce((sum, entity) => sum + effectiveSiegePower(state, entity, distance), 0);
      const intel = expectedDefenseProfile(state, territory, playerSect);
      const winChance = estimatedWinChance(attackerPower, intel.pressure);
      return [territory.id, {
        attackerPower,
        distance,
        outlook: winChance >= 0.62 ? "优势" : winChance >= 0.4 ? "均势" : "劣势",
        risk: intel.label,
        intelLevel: intel.level,
        confidence: intel.confidence
      }];
    }));
  return {
    plan: { ...plan, isManual: playerSectPlanIsManual(plan) },
    attackTeamLimit,
    fatigue: Object.fromEntries(membersForSect(state, playerSect).map(({ entity }) => [entity.id, sectFatigueOf(state, entity.id)])),
    fatiguePrevious: Object.fromEntries(membersForSect(state, playerSect)
      .filter(({ entity }) => Object.hasOwn(fatiguePrevious, entity.id))
      .map(({ entity }) => [entity.id, clamp(Math.floor(Number(fatiguePrevious[entity.id]) || 0), 0, sectFatigueMax)])),
    ownedProvinceIds: ownedIds,
    distances: Object.fromEntries((state.provinces || []).map((territory) => [territory.id, owned.length ? provinceDistance(owned.map((item) => item.id), territory.id) : 2])),
    values: Object.fromEntries((state.provinces || []).map((territory) => {
      const province = provinceById(territory.id);
      return [territory.id, {
        resourceValue: provinceResourceValue(province, state, playerSect),
        defenseValue: territory.owner === playerSect ? defenseValueForProvince(state, territory, playerSect) : 0,
        defenderLimit: province ? defenderLimitForProvince(province) : 0,
        attackerLimit: province ? attackerLimitForProvince(province, attackTeamLimit) : 0
      }];
    })),
    forecasts: forecastByProvince
  };
}

function publicProvinceState(state, viewerSect = state.sect.name) {
  return (state.provinces || []).map((territory) => ({
    ...territory,
    defenders: territory.owner === viewerSect ? [...(territory.defenders || [])] : [],
    defenseIntel: publicProvinceIntel(state, territory, viewerSect)
  }));
}

function publicSectFatigue(state, viewerSect = state.sect.name) {
  return Object.fromEntries(membersForSect(state, viewerSect).map(({ entity }) => [entity.id, sectFatigueOf(state, entity.id)]));
}

function defaultElixirEffects() {
  return {
    cultivationMultiplier: 1,
    cultivationMultiplierUntilDay: 0,
    nextBreakthroughBonus: 0,
    nextBreakthroughBonusStacks: [],
    extraBreakthroughAttemptsToday: 0,
    breakthroughAttemptEffectDay: 0
  };
}

function normalizeElixirEffects(state) {
  state.player.elixirEffects = {
    ...defaultElixirEffects(),
    ...(state.player.elixirEffects || {})
  };
  const effects = state.player.elixirEffects;
  const rawStacks = Array.isArray(effects.nextBreakthroughBonusStacks) ? effects.nextBreakthroughBonusStacks : [];
  let stacks = rawStacks
    .map((stack) => ({
      itemId: typeof stack?.itemId === "string" ? stack.itemId : "",
      name: typeof stack?.name === "string" ? stack.name : "破境丹",
      bonus: Math.max(0, Number(stack?.bonus) || 0)
    }))
    .filter((stack) => stack.bonus > 0)
    .slice(0, maxBreakthroughBonusStacks);
  const legacyBonus = Math.max(0, Number(effects.nextBreakthroughBonus) || 0);
  if (!stacks.length && legacyBonus > 0) {
    stacks = [{ itemId: "", name: effects.nextBreakthroughBonusItem || "破境丹", bonus: legacyBonus }];
  }
  effects.nextBreakthroughBonusStacks = stacks;
  effects.nextBreakthroughBonus = stacks.reduce((sum, stack) => sum + stack.bonus, 0);
  effects.nextBreakthroughBonusItem = stacks.map((stack) => stack.name).filter(Boolean).join("、");
  if (Number(effects.cultivationMultiplierUntilDay || 0) < state.day) {
    effects.cultivationMultiplier = 1;
    effects.cultivationMultiplierUntilDay = 0;
  }
  if (Number(effects.breakthroughAttemptEffectDay || 0) !== Number(state.day || 0)) {
    effects.extraBreakthroughAttemptsToday = 0;
    effects.breakthroughAttemptEffectDay = 0;
  }
}

function publicElixirEffects(state) {
  normalizeElixirEffects(state);
  const effects = state.player.elixirEffects;
  return {
    cultivationMultiplier: Math.max(1, Number(effects.cultivationMultiplier) || 1),
    cultivationMultiplierUntilDay: Number(effects.cultivationMultiplierUntilDay) || 0,
    cultivationMultiplierDaysLeft: Math.max(0, Number(effects.cultivationMultiplierUntilDay || 0) - state.day + 1),
    nextBreakthroughBonus: Math.max(0, Number(effects.nextBreakthroughBonus) || 0),
    nextBreakthroughBonusStacks: (effects.nextBreakthroughBonusStacks || []).map((stack) => ({ ...stack })),
    nextBreakthroughBonusCount: (effects.nextBreakthroughBonusStacks || []).length,
    nextBreakthroughBonusMax: maxBreakthroughBonusStacks,
    extraBreakthroughAttemptsToday: Math.max(0, Math.floor(Number(effects.extraBreakthroughAttemptsToday) || 0))
  };
}

function activeCultivationMultiplier(state) {
  return publicElixirEffects(state).cultivationMultiplier;
}

function normalizeTaskMultiplierRecords(state) {
  state.taskMultiplierRecords = Array.isArray(state.taskMultiplierRecords) ? state.taskMultiplierRecords : [];
  const seen = new Set();
  state.taskMultiplierRecords = state.taskMultiplierRecords
    .map((record) => {
      const day = Math.max(1, Math.floor(Number(record?.day) || 0));
      if (!day) return null;
      const elixirMultiplier = Math.max(1, Number(record?.elixirMultiplier ?? record?.cultivationMultiplier) || 1);
      const sectXpMultiplier = Math.max(1, Number(record?.sectXpMultiplier) || 1);
      return {
        day,
        date: record?.date || stateDateForDay(state, day),
        elixirMultiplier,
        sectXpMultiplier,
        totalMultiplier: elixirMultiplier * sectXpMultiplier
      };
    })
    .filter(Boolean)
    .filter((record) => {
      if (seen.has(record.day)) return false;
      seen.add(record.day);
      return isRecordWithinDays(record, state.day || 1, taskMultiplierRecordDays);
    })
    .sort((a, b) => b.day - a.day)
    .slice(0, taskMultiplierRecordDays);
}

function taskMultiplierSnapshot(state, day = state.day) {
  const targetDay = Math.max(1, Math.floor(Number(day) || state.day || 1));
  normalizeElixirEffects(state);
  const elixirMultiplier = activeCultivationMultiplier(state);
  const sectXpMultiplier = 1 + sectXpBonus(state, state.sect?.name || state.player?.sect, state.player);
  return {
    day: targetDay,
    date: stateDateForDay(state, targetDay),
    elixirMultiplier,
    sectXpMultiplier,
    totalMultiplier: elixirMultiplier * sectXpMultiplier
  };
}

function rememberTaskMultiplierForDay(state, day = state.day) {
  normalizeTaskMultiplierRecords(state);
  const snapshot = taskMultiplierSnapshot(state, day);
  state.taskMultiplierRecords = [
    snapshot,
    ...state.taskMultiplierRecords.filter((record) => record.day !== snapshot.day)
  ]
    .filter((record) => isRecordWithinDays(record, state.day || snapshot.day, taskMultiplierRecordDays))
    .sort((a, b) => b.day - a.day)
    .slice(0, taskMultiplierRecordDays);
  return snapshot;
}

function taskMultiplierForDay(state, day = state.day) {
  const targetDay = Math.max(1, Math.floor(Number(day) || state.day || 1));
  normalizeTaskMultiplierRecords(state);
  const found = state.taskMultiplierRecords.find((record) => record.day === targetDay);
  if (found) return found;
  if (targetDay === Number(state.day || 1)) return rememberTaskMultiplierForDay(state, targetDay);
  return {
    day: targetDay,
    date: stateDateForDay(state, targetDay),
    elixirMultiplier: 1,
    sectXpMultiplier: 1,
    totalMultiplier: 1
  };
}

function activeBreakthroughBonus(state) {
  return publicElixirEffects(state).nextBreakthroughBonus;
}

function activeBreakthroughMultiplier(state) {
  return 1 + activeBreakthroughBonus(state);
}

function clearBreakthroughBonusEffects(state) {
  normalizeElixirEffects(state);
  state.player.elixirEffects.nextBreakthroughBonus = 0;
  state.player.elixirEffects.nextBreakthroughBonusStacks = [];
  state.player.elixirEffects.nextBreakthroughBonusItem = "";
}

function breakthroughAttemptInfo(state) {
  normalizeElixirEffects(state);
  const used = Math.max(0, Math.floor(Number(state.player.breakthroughAttemptsToday) || 0));
  const extra = Math.max(0, Math.floor(Number(state.player.elixirEffects.extraBreakthroughAttemptsToday) || 0));
  const total = Math.min(maxBreakthroughAttemptsPerDay, baseBreakthroughAttempts + extra);
  return {
    base: baseBreakthroughAttempts,
    extra,
    total,
    used,
    remaining: Math.max(0, total - used),
    max: maxBreakthroughAttemptsPerDay
  };
}

function addProvinceIncome(state, settlementDate) {
  const incomes = [];
  for (const sectName of activeSectNames(state)) {
    for (const type of ["spirit", "dust"]) {
      const summary = provinceResourceSummary(state, sectName, type);
      if (summary.total <= 0 || !summary.entries.length) continue;
      for (const entry of summary.entries) {
        const share = summary.shares.get(entry.id) || 0;
        if (type === "spirit") entry.entity.spirit += share;
        else addSpiritDust(state, share, "宗门城市灵尘包", entry.entity);
      }
      const topText = summary.top
        .map((entry) => `${entry.entity.name}+${entry.share}`)
        .join("、");
      const defenseText = summary.defenders.length ? `，守城功臣 ${summary.defenders.length} 人加权` : "";
      const label = type === "spirit" ? "灵石" : "灵尘";
      incomes.push(`${sectName}${label}包 ${Math.round(summary.total)}，掌门/长老倾斜分配：${topText}${defenseText}`);
    }
  }
  if (incomes.length) {
    state.provinceIncomeLog ??= [];
    state.provinceIncomeLog.unshift({ day: state.day, date: settlementDate, items: incomes.slice(0, 8) });
    state.provinceIncomeLog = state.provinceIncomeLog.slice(0, recentRecordDays);
  }
}

function siegeEntityRef(item) {
  return entityRef(item.entity, item.kind);
}

function withSiegeActionModifiers(state, entity, { defender = false, distance = 1 } = {}) {
  const fatiguePenalty = sectFatigueOf(state, entity.id) * sectFatiguePenaltyPerPoint;
  const distancePenalty = defender ? 0 : Math.min(0.25, Math.max(0, (distance || 1) - 1) * 0.06);
  const defenseBonus = defender ? 0.1 : 0;
  const multiplier = Math.max(0.45, 1 + defenseBonus - fatiguePenalty - distancePenalty);
  return {
    ...entity,
    attack: Math.floor((entity.attack || 0) * multiplier),
    defense: Math.floor((entity.defense || 0) * multiplier),
    maxHp: Math.floor((entity.maxHp || 0) * multiplier),
    hp: Math.floor((entity.hp ?? entity.maxHp ?? 0) * multiplier),
    divineSense: Math.floor((entity.divineSense || 0) * multiplier),
    maxMana: Math.floor((entity.maxMana || 0) * multiplier),
    mana: Math.floor((entity.mana ?? entity.maxMana ?? 0) * multiplier),
    siegeModifier: { defender, distance, fatigue: sectFatigueOf(state, entity.id), multiplier }
  };
}

function siegeModifierEvent(entity, modifier, side) {
  const lines = [];
  const fatiguePercent = Math.round((modifier?.fatigue || 0) * sectFatiguePenaltyPerPoint * 100);
  const distancePercent = Math.round(Math.min(0.25, Math.max(0, (modifier?.distance || 1) - 1) * 0.06) * 100);
  if (fatiguePercent) lines.push(`疲劳 ${modifier.fatigue}，五维降低 ${fatiguePercent}%`);
  if (!modifier?.defender && distancePercent) lines.push(`远征 ${modifier.distance} 格，五维降低 ${distancePercent}%`);
  if (modifier?.defender) lines.push("守城阵法加成，五维提高 10%");
  if (!lines.length) return null;
  return { round: 0, kind: "siege", side, text: `${entity.name}${lines.join("；")}。`, modifier };
}

function runWheelBattle(state, province, attackerSect, defenderSect, options = {}) {
  const map = cultivatorMap(state);
  const attackerIds = [...new Set(options.attackerIds || membersForSectAscending(state, attackerSect).map((member) => member.entity.id))]
    .slice(0, attackerLimitForProvince(province, options.attackerLimit));
  const attackers = attackerIds
    .map((id) => map.get(id))
    .filter(Boolean)
    .map((entity) => ({ entity, kind: entity.id === "player" ? "player" : "npc" }))
    .sort((a, b) => effectiveSiegePower(state, a.entity, options.distance || 1) - effectiveSiegePower(state, b.entity, options.distance || 1));
  const defenderIds = [...new Set(options.defenderIds || provinceStateById(state, province.id)?.defenders || [])]
    .slice(0, defenderLimitForProvince(province));
  const defenders = defenderIds
    .map((id) => map.get(id))
    .filter(Boolean)
    .map((entity) => ({ entity, kind: entity.id === "player" ? "player" : "npc" }))
    .sort((a, b) => powerOf(a.entity, state) - powerOf(b.entity, state));

  let attackerIndex = 0;
  let defenderIndex = 0;
  let carry = { attackerHp: null, attackerMana: null, defenderHp: null, defenderMana: null };
  const battles = [];

  while (attackers[attackerIndex] && defenders[defenderIndex] && battles.length < 80) {
    const attacker = attackers[attackerIndex];
    const defender = defenders[defenderIndex];
    const attackerWithPenalty = withSiegeActionModifiers(state, attacker.entity, { distance: options.distance || 1 });
    const left = {
      ...attackerWithPenalty,
      hp: carry.attackerHp ?? effectiveMaxHp(attackerWithPenalty, state),
      mana: carry.attackerMana ?? effectiveMaxMana(attackerWithPenalty, state)
    };
    const defenderWithBuff = withSiegeActionModifiers(state, defender.entity, { defender: true });
    const right = {
      ...defenderWithBuff,
      hp: carry.defenderHp ?? effectiveMaxHp(defenderWithBuff, state),
      mana: carry.defenderMana ?? effectiveMaxMana(defenderWithBuff, state)
    };
    const battle = runTurnBattle(left, right, { maxRounds: 16, state });
    const modifierEvents = [
      siegeModifierEvent(attacker.entity, attackerWithPenalty.siegeModifier, "left"),
      siegeModifierEvent(defender.entity, defenderWithBuff.siegeModifier, "right")
    ].filter(Boolean);
    const rootEventCount = battle.events.filter((event) => event.kind === "root").length;
    battle.events.splice(rootEventCount, 0, ...modifierEvents);
    const attackerWon = battle.winner === "left";
    const replay = buildReplay(left, right, battle, attackerWon ? "胜" : "负", timestampKey(), state);
    replay.kind = "province-war";
    replay.replayId = makeReplayId("battle", state.day, province.id, attacker.entity.id, defender.entity.id, battles.length + 1);
    queueBattleReplay(state, replay, `province-${province.id}-${battles.length + 1}`);
    battles.push({
      order: battles.length + 1,
      attacker: siegeEntityRef(attacker),
      defender: siegeEntityRef(defender),
      winnerSide: attackerWon ? "attacker" : "defender",
      winnerName: attackerWon ? attacker.entity.name : defender.entity.name,
      summary: `${attacker.entity.name} ${attackerWon ? "击败" : "败于"} ${defender.entity.name}`,
      replayId: replay.replayId,
      replay
    });
    tryTransferEquipment(state, attackerWon ? attacker.entity : defender.entity, attackerWon ? defender.entity : attacker.entity, `${province.name}攻守战`);
    if (attackerWon) {
      defenderIndex += 1;
      carry.attackerHp = Math.max(1, battle.leftHp);
      carry.attackerMana = battle.leftMana;
      carry.defenderHp = null;
      carry.defenderMana = null;
    } else {
      attackerIndex += 1;
      carry.defenderHp = Math.max(1, battle.rightHp);
      carry.defenderMana = battle.rightMana;
      carry.attackerHp = null;
      carry.attackerMana = null;
    }
  }

  return {
    captured: Boolean(attackers[attackerIndex] && !defenders[defenderIndex]),
    battles,
    attackerLineup: attackers.map((attacker) => siegeEntityRef(attacker)),
    defenderLineup: defenders.map((defender) => siegeEntityRef(defender)),
    attackerSurvivor: attackers[attackerIndex]?.entity.name || "",
    defenderSurvivor: defenders[defenderIndex]?.entity.name || ""
  };
}

function applyPlannedDefenders(state, plans) {
  for (const territory of state.provinces || []) territory.defenders = [];
  for (const plan of plans || []) {
    for (const [provinceId, ids] of plan.defense?.assignments || []) {
      const territory = provinceStateById(state, provinceId);
      const province = provinceById(provinceId);
      if (territory?.owner === plan.sectName) {
        territory.defenders = [...new Set(ids)].slice(0, province ? defenderLimitForProvince(province) : maxSiegeTeamSize);
      }
    }
  }
}

function threatenedProvinceDefenseTarget(state, territory) {
  const province = provinceById(territory?.id);
  if (!province) return 0;
  const baseline = defenseBaselineForProvince(province);
  const extraPressure = provinceBorderExposure(state, territory, territory.owner) >= 2
    || recentProvinceWarPressure(state, territory.id) >= 2;
  const target = (baseline >= 4 ? 3 : 2) + (extraPressure ? 1 : 0);
  return Math.min(defenderLimitForProvince(province), target);
}

function reinforceThreatenedProvinces(state, plans, threatenedTerritories) {
  const planBySect = new Map((plans || []).map((plan) => [plan.sectName, plan]));
  const threatened = [...new Map((threatenedTerritories || [])
    .filter((territory) => territory?.owner)
    .map((territory) => [territory.id, territory])).values()];
  const threatenedIds = new Set(threatened.map((territory) => territory.id));

  const sortedThreatened = threatened
    .sort((a, b) => defenseRiskScore(state, b, b.owner) - defenseRiskScore(state, a, a.owner));
  // Establish two-person fronts first, then spend remaining capacity on the
  // highest-risk cities so one stronghold cannot consume every reinforcement.
  for (const passLimit of [2, maxSiegeTeamSize]) {
    for (const territory of sortedThreatened) {
      const plan = planBySect.get(territory.owner);
      if (!plan?.defense?.assignments || plan.defense.autoFill === false) continue;
      const assignments = plan.defense.assignments;
      const manualIds = new Set(plan.defense.manualMemberIds || []);
      const attackIds = new Set((plan.attack?.attackers || []).map((member) => member.entity.id));
      const sectMembers = membersForSect(state, territory.owner);
      const ownedCount = provinceIdsForSect(state, territory.owner).length;
      const minimumEmergencyRest = sectMembers.length >= 4
        ? Math.max(1, siegeRestReserve(sectMembers.length, plan.mode, ownedCount) - 1)
        : 0;
      const assignedProvinceById = new Map();
      for (const [provinceId, ids] of assignments) {
        for (const id of ids || []) assignedProvinceById.set(id, provinceId);
      }

      const targetIds = [...new Set(assignments.get(territory.id) || territory.defenders || [])];
      const desired = Math.min(passLimit, threatenedProvinceDefenseTarget(state, territory));
      while (targetIds.length < desired) {
        const availableMembers = sectMembers
          .filter((member) => !attackIds.has(member.entity.id) && !assignedProvinceById.has(member.entity.id))
          .sort((a, b) => siegeRestPriority(state, a) - siegeRestPriority(state, b)
            || siegeDutyScore(state, a, "defense") - siegeDutyScore(state, b, "defense"));
        const available = availableMembers.length > minimumEmergencyRest ? availableMembers[0] : null;
        if (available) {
          targetIds.push(available.entity.id);
          assignedProvinceById.set(available.entity.id, territory.id);
          continue;
        }

        const donor = [...assignments]
          .filter(([provinceId, ids]) => provinceId !== territory.id && !threatenedIds.has(provinceId) && (ids || []).length > 1)
          .flatMap(([provinceId, ids]) => (ids || [])
            .filter((id) => !manualIds.has(id))
            .map((id) => ({ provinceId, id, member: sectMembers.find((item) => item.entity.id === id) })))
          .filter((item) => item.member)
          .sort((a, b) => siegeDutyScore(state, a.member, "defense") - siegeDutyScore(state, b.member, "defense"))[0];
        if (donor) {
          const sourceIds = (assignments.get(donor.provinceId) || []).filter((id) => id !== donor.id);
          assignments.set(donor.provinceId, sourceIds);
          const source = provinceStateById(state, donor.provinceId);
          if (source?.owner === territory.owner) source.defenders = [...sourceIds];
          targetIds.push(donor.id);
          assignedProvinceById.set(donor.id, territory.id);
          continue;
        }

        const manualAttackIds = new Set(plan.attack?.manualMemberIds || []);
        const movableAttacker = (plan.attack?.attackers || [])
          .filter((member) => !manualAttackIds.has(member.entity.id))
          .sort((a, b) => siegeRestPriority(state, a) - siegeRestPriority(state, b))[0];
        if (!movableAttacker || (plan.attack?.attackers || []).length <= 1) break;
        plan.attack.attackers = plan.attack.attackers.filter((member) => member.entity.id !== movableAttacker.entity.id);
        plan.attack.reassignedToDefense = Math.max(0, Number(plan.attack.reassignedToDefense) || 0) + 1;
        attackIds.delete(movableAttacker.entity.id);
        targetIds.push(movableAttacker.entity.id);
        assignedProvinceById.set(movableAttacker.entity.id, territory.id);
      }

      assignments.set(territory.id, targetIds);
      territory.defenders = [...targetIds];
      plan.defense.used = new Set([
        ...attackIds,
        ...[...assignments.values()].flat()
      ]);
    }
  }
}

function refreshResolvedSiegeForecasts(state, plans) {
  for (const plan of plans || []) {
    const target = plan.attack?.territory;
    if (!target) continue;
    const attackerPower = (plan.attack.attackers || [])
      .reduce((sum, member) => sum + effectiveSiegePower(state, member.entity, plan.attack.distance || 1), 0);
    plan.attack.winRate = target.owner
      ? estimatedWinChance(attackerPower, plan.attack.intel?.pressure || expectedDefenseProfile(state, target, plan.sectName).pressure)
      : 0.96;
  }
}

function updateSectFatigue(state, plans, wars = []) {
  state.sectFatigue ??= {};
  state.sectFatiguePrevious = { ...state.sectFatigue };
  state.sectSiegeDuty ??= {};
  const attackedProvinceIds = new Set((wars || []).filter((war) => war.ownerBefore).map((war) => war.provinceId));
  const attackGain = new Map();
  const garrisonIds = new Set();
  const battleDefenderIds = new Set();
  for (const plan of plans || []) {
    for (const [provinceId, ids] of plan.defense?.assignments || []) {
      for (const id of ids) {
        garrisonIds.add(id);
        if (attackedProvinceIds.has(provinceId)) battleDefenderIds.add(id);
      }
    }
    for (const member of plan.attack?.attackers || []) {
      const distance = Math.max(1, plan.attack.distance || 1);
      const fatigueGain = plan.attack.wasOccupied ? 3 + Math.max(0, distance - 1) : 2;
      attackGain.set(member.entity.id, Math.max(attackGain.get(member.entity.id) || 0, fatigueGain));
    }
  }
  for (const { entity } of allCultivators(state)) {
    const previous = sectFatigueOf(state, entity.id);
    let role = "rest";
    if (attackGain.has(entity.id)) {
      state.sectFatigue[entity.id] = clamp(previous + attackGain.get(entity.id), 0, sectFatigueMax);
      role = "attack";
    } else if (battleDefenderIds.has(entity.id)) {
      state.sectFatigue[entity.id] = clamp(previous + sectDefenseFatigueGain, 0, sectFatigueMax);
      role = "defense";
    } else if (garrisonIds.has(entity.id)) {
      state.sectFatigue[entity.id] = Math.max(0, previous - sectFatigueRecoveryPerGarrisonDay);
      role = "garrison";
    } else {
      const recovery = previous >= sectFatigueAutoRestThreshold
        ? sectFatigueCriticalRestRecovery
        : previous >= sectFatigueHeavyRestThreshold
          ? sectFatigueHeavyRestRecovery
          : sectFatigueRecoveryPerRestDay;
      state.sectFatigue[entity.id] = Math.max(0, previous - recovery);
    }

    const duty = sectSiegeDutyRecord(state, entity.id);
    const burdenDelta = role === "attack" ? 3 : role === "defense" ? 2 : role === "garrison" ? 0.5 : -2;
    const activeDuty = role !== "rest";
    const sameRole = duty.lastRole === role || (role === "garrison" && duty.lastRole === "defense") || (role === "defense" && duty.lastRole === "garrison");
    state.sectSiegeDuty[entity.id] = {
      burden: clamp(Number((duty.burden + burdenDelta).toFixed(1)), 0, 20),
      consecutiveDuty: activeDuty ? duty.consecutiveDuty + 1 : 0,
      consecutiveRest: activeDuty ? 0 : duty.consecutiveRest + 1,
      consecutiveRole: activeDuty && sameRole ? duty.consecutiveRole + 1 : activeDuty ? 1 : 0,
      lastRole: role,
      lastDay: state.day
    };
  }
}

function monsterSiegeCount(day) {
  return clamp(1 + Math.floor(Math.max(1, day || 1) / 50), 1, 4);
}

function provinceGrade(province) {
  const rank = Number(province?.rank) || 99;
  if (rank <= 3) return "S";
  if (rank <= 8) return "A";
  if (rank <= 14) return "B";
  if (rank <= 21) return "C";
  if (rank <= 28) return "D";
  return "E";
}

function provinceMonsterSiegeCount(state, province) {
  const grade = provinceGrade(province);
  // High-value cities remain pressure points, but a full five-person garrison must have
  // a reasonable chance to hold rather than facing more monsters than it can cycle through.
  const rangeByGrade = {
    S: [3, 4],
    A: [3, 3],
    B: [2, 3],
    C: [2, 2],
    D: [1, 2],
    E: [1, 1]
  };
  const [min, max] = rangeByGrade[grade] || rangeByGrade.E;
  return min + (max > min && stableUnit(`province-monster-count|${state.day}|${province?.id}`) >= 0.5 ? 1 : 0);
}

function makeSiegeMonsterForProvince(state, province, defenderSect, index = 0) {
  const defenders = membersForSect(state, defenderSect);
  const highestRealm = defenders.length ? Math.max(...defenders.map(({ entity }) => entity.realm || 0)) : state.player.realm;
  const stage = stageIndexOfRealm(highestRealm);
  const tier = provinceTier(province);
  // A city siege should pressure a garrison without routinely exceeding its strongest defender.
  const realm = capRealm(highestRealm - 1);
  const monsterName = monsterNameForStage(stage, `province-monster|${state.day}|${province.id}|${index}`);
  return makeMonster(`妖潮·${province.name}${monsterName}`, realm, pick(roots).key, 0.62 + tier * 0.1 + Math.min(0.14, (state.day || 1) / 1000));
}

function monsterEntityRef(monster) {
  return entityRef(monster, "monster");
}

function runMonsterSiegeBattle(state, territory, province, defenderSect) {
  const defenderIds = territory.defenders || [];
  const map = cultivatorMap(state);
  const defenders = defenderIds
    .map((id) => map.get(id))
    .filter(Boolean)
    .map((entity) => ({ entity, kind: entity.id === "player" ? "player" : "npc" }))
    .sort((a, b) => powerOf(a.entity, state) - powerOf(b.entity, state));
  const monsterCount = provinceMonsterSiegeCount(state, province);
  const monsters = Array.from({ length: monsterCount }, (_, index) => makeSiegeMonsterForProvince(state, province, defenderSect || "", index))
    .map((monster, index) => ({ ...monster, name: monsterCount > 1 ? `${monster.name}${index + 1}` : monster.name }));
  let monsterIndex = 0;
  let defenderIndex = 0;
  let carry = { monsterHp: null, monsterMana: null, defenderHp: null, defenderMana: null };
  const battles = [];
  while (monsters[monsterIndex] && defenders[defenderIndex] && battles.length < 60) {
    const monster = monsters[monsterIndex];
    const defender = defenders[defenderIndex];
    const left = {
      ...monster,
      hp: carry.monsterHp ?? effectiveMaxHp(monster, state),
      mana: carry.monsterMana ?? effectiveMaxMana(monster, state)
    };
    const defenderWithBuff = withSiegeActionModifiers(state, defender.entity, { defender: true });
    const right = {
      ...defenderWithBuff,
      hp: carry.defenderHp ?? effectiveMaxHp(defenderWithBuff, state),
      mana: carry.defenderMana ?? effectiveMaxMana(defenderWithBuff, state)
    };
    const battle = runTurnBattle(left, right, { maxRounds: 16, state });
    const monsterWon = battle.winner === "left";
    const replay = buildReplay(left, right, battle, monsterWon ? "胜" : "负", timestampKey(), state);
    replay.kind = "province-monster";
    replay.replayId = makeReplayId("battle", state.day, province.id, monster.id, defender.entity.id, battles.length + 1);
    queueBattleReplay(state, replay, `province-monster-${province.id}-${battles.length + 1}`);
    battles.push({
      order: battles.length + 1,
      attacker: monsterEntityRef(monster),
      defender: siegeEntityRef(defender),
      winnerSide: monsterWon ? "monster" : "defender",
      winnerName: monsterWon ? monster.name : defender.entity.name,
      summary: `${monster.name} ${monsterWon ? "击溃" : "败于"} ${defender.entity.name}`,
      replayId: replay.replayId,
      replay
    });
    if (monsterWon) {
      defenderIndex += 1;
      carry.monsterHp = Math.max(1, battle.leftHp);
      carry.monsterMana = battle.leftMana;
      carry.defenderHp = null;
      carry.defenderMana = null;
    } else {
      monsterIndex += 1;
      // Clearing one wave gives the surviving defender a short chance to regroup.
      // This offsets the unavoidable attrition of a multi-monster wheel battle.
      const recoveryHp = Math.floor(effectiveMaxHp(defenderWithBuff, state) * 0.22);
      const recoveryMana = Math.floor(effectiveMaxMana(defenderWithBuff, state) * 0.26);
      carry.defenderHp = Math.min(
        effectiveMaxHp(defenderWithBuff, state),
        Math.max(1, battle.rightHp) + recoveryHp
      );
      carry.defenderMana = Math.min(
        effectiveMaxMana(defenderWithBuff, state),
        Math.max(0, battle.rightMana) + recoveryMana
      );
      carry.monsterHp = null;
      carry.monsterMana = null;
    }
  }
  return {
    captured: Boolean(monsters[monsterIndex] && !defenders[defenderIndex]) || !defenders.length,
    battles,
    attackerLineup: monsters.map(monsterEntityRef),
    defenderLineup: defenders.map((defender) => siegeEntityRef(defender)),
    defenderSurvivor: defenders[defenderIndex]?.entity.name || ""
  };
}

function pickMonsterSiegeTargets(state, targeted = new Set()) {
  const occupied = (state.provinces || []).filter((territory) => territory.owner && !targeted.has(territory.id));
  const picks = [];
  for (let count = monsterSiegeCount(state.day); count > 0 && occupied.length; count -= 1) {
    const weighted = occupied
      .filter((territory) => !picks.some((pick) => pick.id === territory.id))
      .map((territory) => {
        const province = provinceById(territory.id);
        const ownerCount = (state.provinces || []).filter((item) => item.owner === territory.owner).length;
        const value = provinceResourceValue(province, state, territory.owner);
        const held = Math.max(0, Number(territory.heldDays) || 0);
        const protection = Math.max(0, 3 - (state.day - Number(territory.lastMonsterSiegeDay || 0))) * 40;
        const longHeldBias = Math.min(220, Math.max(0, held - 2) * 12);
        return { territory, weight: Math.max(1, 42 + value * 1.1 + ownerCount * 4 + longHeldBias - protection) };
      });
    const total = weighted.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;
    for (const item of weighted) {
      roll -= item.weight;
      if (roll <= 0) {
        picks.push(item.territory);
        targeted.add(item.territory.id);
        break;
      }
    }
  }
  return picks;
}

export function runProvinceSieges(state, settlementDate, settlementTime = timestampKey()) {
  state.provinceWars ??= [];
  const targeted = new Set();
  const wars = [];
  const sectNames = activeSectNames(state);
  const attackTeamLimits = new Map(sectNames.map((sectName) => [sectName, attackTeamLimitForSect(state, sectName)]));
  const playerPlan = normalizePlayerSectPlan(
    state.playerSectPlan,
    state.day,
    attackTeamLimits.get(state.sect.name) || maxSiegeTeamSize
  );
  const monsterTargets = pickMonsterSiegeTargets(state, targeted);
  const plans = [];

  // Every sect plans from the same frozen pre-deployment state. Target conflicts
  // are resolved only after all intents exist, so no planner can inspect another's plan.
  for (const sectName of sectNames) {
    const isPlayerSect = sectName === state.sect.name;
    const planOptions = {
      ...(isPlayerSect && playerPlan.targetDay === state.day ? playerPlan : {}),
      attackTeamLimit: attackTeamLimits.get(sectName) || maxSiegeTeamSize
    };
    plans.push(buildSectSiegePlan(state, sectName, new Set(), planOptions));
  }
  const resolvedPlans = resolveSimultaneousSiegeTargets(state, plans.filter(Boolean), targeted);
  applyPlannedDefenders(state, resolvedPlans);
  reinforceThreatenedProvinces(state, resolvedPlans, [
    ...monsterTargets,
    ...resolvedPlans.map((plan) => plan.attack?.territory).filter((territory) => territory?.owner)
  ]);
  refreshResolvedSiegeForecasts(state, resolvedPlans);

  for (const target of monsterTargets) {
    const province = provinceById(target.id);
    if (!province || !target.owner) continue;
    const defenderSect = target.owner;
    const defenderPlan = resolvedPlans.find((plan) => plan.sectName === defenderSect) || null;
    const result = runMonsterSiegeBattle(state, target, province, defenderSect);
    const record = {
      id: `${settlementDate}-monster-${target.id}`,
      kind: "monster",
      day: state.day,
      date: settlementDate,
      time: settlementTime,
      provinceId: target.id,
      provinceName: province.name,
      attacker: "妖物",
      defender: defenderSect,
      defenderTerritoryCount: provinceIdsForSect(state, defenderSect).length,
      ownerBefore: defenderSect,
      ownerAfter: result.captured ? null : defenderSect,
      captured: result.captured,
      result: result.captured
        ? `妖潮攻破${defenderSect}防线，${province.name}沦为无主之地`
        : `${defenderSect}守住${province.name}，${result.defenderSurvivor || "守城修士"}斩退妖潮`,
      strategy: monsterWarStrategyForProvince(state, target, province, defenderSect, defenderPlan),
      attackerLineup: result.attackerLineup,
      defenderLineup: result.defenderLineup,
      battles: result.battles
    };
    target.lastMonsterSiegeDay = state.day;
    if (result.captured) {
      target.owner = null;
      target.defenders = [];
      target.miasmaUntilDay = state.day + 1;
    } else {
      for (const ref of result.defenderLineup || []) {
        const entity = cultivatorById(state, ref.id);
        if (entity) {
          rollSpiritPearlFragmentReward(state, "blood_trial", {
            success: true,
            stage: stageIndexOfRealm(entity.realm || 0),
            context: `${province.name}守妖`,
            receiver: entity,
            pearlId: activeSpecialRoot(entity)?.id || primaryRoot(entity).key
          });
        }
      }
    }
    wars.push(record);
  }

  for (const plan of resolvedPlans) {
    const target = plan.attack?.territory;
    const attackerSect = plan.sectName;
    if (!target) continue;
    const province = provinceById(target.id);
    if (!province) continue;
    const defenderSect = target.owner;
    const defenderPlan = resolvedPlans.find((candidate) => candidate.sectName === defenderSect) || null;
    const record = {
      id: `${settlementDate}-${attackerSect}-${target.id}`,
      day: state.day,
      date: settlementDate,
      time: settlementTime,
      provinceId: target.id,
      provinceName: province.name,
      attacker: attackerSect,
      defender: defenderSect || "无主之地",
      defenderTerritoryCount: defenderSect ? provinceIdsForSect(state, defenderSect).length : 0,
      ownerBefore: defenderSect || null,
      ownerAfter: null,
      captured: false,
      result: "",
      attackerLineup: (plan.attack.attackers || []).map((member) => siegeEntityRef(member)),
      defenderLineup: (target.defenders || [])
        .map((id) => cultivatorById(state, id))
        .filter(Boolean)
        .map((entity) => siegeEntityRef({ entity, kind: entity.id === "player" ? "player" : "npc" })),
      battles: [],
      strategy: provinceWarStrategyForPlan(state, plan, target, province, defenderSect, defenderPlan)
    };
    if (!defenderSect) {
      target.owner = attackerSect;
      target.heldDays = 0;
      enforceProvinceOccupationLimits(state);
      record.captured = true;
      record.result = `${attackerSect}兵不血刃占下${province.name}`;
    } else {
      const result = runWheelBattle(state, province, attackerSect, defenderSect, {
        attackerIds: (plan.attack.attackers || []).map((member) => member.entity.id),
        defenderIds: target.defenders || [],
        distance: plan.attack.distance || 1,
        attackerLimit: plan.attack.attackTeamLimit || maxSiegeTeamSize
      });
      record.battles = result.battles;
      record.attackerLineup = result.attackerLineup;
      record.defenderLineup = result.defenderLineup;
      record.distance = plan.attack.distance || 1;
      record.playerDirected = Boolean(plan.attack.playerDirected);
      record.captured = result.captured;
      record.result = result.captured
        ? `${attackerSect}攻破${defenderSect}防线，占下${province.name}`
        : `${defenderSect}守住${province.name}，${result.defenderSurvivor || "守城修士"}仍立城头`;
      if (result.captured) {
        target.owner = attackerSect;
        target.heldDays = 0;
        enforceProvinceOccupationLimits(state);
      }
      const attackerStatus = attackerSect === state.sect.name ? state.sect : state.sectRivals?.[attackerSect];
      const defenderStatus = defenderSect === state.sect.name ? state.sect : state.sectRivals?.[defenderSect];
      if (attackerStatus && defenderStatus) {
        if (result.captured) {
          attackerStatus.warWins = (attackerStatus.warWins || 0) + 1;
          defenderStatus.warLosses = (defenderStatus.warLosses || 0) + 1;
        } else {
          defenderStatus.warWins = (defenderStatus.warWins || 0) + 1;
          attackerStatus.warLosses = (attackerStatus.warLosses || 0) + 1;
        }
      }
    }
    // Store the ownership immediately after this battle. The map always represents
    // the latest day, so historical reports need their own stable ownership result.
    record.ownerAfter = target.owner || null;
    wars.push(record);
  }
  updateSectFatigue(state, resolvedPlans, wars);
  for (const territory of state.provinces || []) {
    territory.heldDays = territory.owner ? Math.max(0, Math.floor(Number(territory.heldDays) || 0)) + 1 : 0;
    if (territory.miasmaUntilDay && territory.miasmaUntilDay < state.day) territory.miasmaUntilDay = 0;
  }
  state.playerSectPlan = defaultPlayerSectPlan(state.day + 1);
  if (wars.length) {
    state.provinceWars.unshift(...wars);
    state.provinceWars = trimRecordsByDay(state.provinceWars, state.day, battleRecordDays);
    enforceProvinceOccupationLimits(state);
    applyPlannedDefenders(state, resolvedPlans);
    log(state, `${settlementDate} 九州攻守结算完成，共 ${wars.length} 处省份被挑战。`, "gold");
  }
}

function sectForNpcIndex(index) {
  let cursor = 0;
  for (const sect of sectRoster) {
    if (index < cursor + sect.members.length) return sect.name;
    cursor += sect.members.length;
  }
  return currentSectName(null, sects[index % sects.length]);
}

function shuffle(list) {
  const result = [...list];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function duelPhaseForDay(day) {
  return duelSeasonDay(day) <= duelLadderDays ? "ladder" : "tournament";
}

function tournamentRoundName(entrantCount) {
  return ({ 256: "首轮", 128: "百二十八强", 64: "六十四强", 32: "三十二强", 16: "十六强", 8: "八强赛", 4: "半决赛", 2: "总决赛" })[entrantCount] || `第 ${entrantCount} 轮`;
}

function tournamentEntrants(state) {
  return allCultivators(state)
    .map(({ entity, kind }) => ({ entity, kind, score: Number(entity.duelSeason?.score || 0), wins: Number(entity.duelSeason?.wins || 0), power: powerOf(entity, state) }))
    .sort((left, right) => right.score - left.score || right.wins - left.wins || right.power - left.power || left.entity.id.localeCompare(right.entity.id));
}

function tournamentSeedRef(tournament, id) {
  const entry = tournamentEntryRef(tournament, id);
  if (!entry) return null;
  const rank = duelRankForScore(entry.score || 0);
  return {
    id: entry.id,
    kind: entry.kind,
    name: entry.name,
    sect: entry.sect,
    realm: entry.realm,
    seed: entry.seed,
    rankId: rank.id,
    rankName: rank.name,
    rankColor: rank.color
  };
}

function buildTournamentBracket(state, tournament) {
  const bracketSize = Math.max(2, Number(tournament.bracketSize) || duelTournamentBracketSize);
  const roundCount = Math.max(1, Math.ceil(Math.log2(bracketSize)));
  const entrants = [...(tournament.entrants || [])].sort((left, right) => left.seed - right.seed);
  const firstRoundMatchCount = bracketSize / 2;
  const byeCount = Math.max(0, bracketSize - entrants.length);
  const contenders = entrants.slice(byeCount);
  const contenderPairings = [];
  for (let index = 0; index < contenders.length / 2; index += 1) {
    contenderPairings.push([contenders[index]?.id || null, contenders[contenders.length - 1 - index]?.id || null]);
  }
  const firstPairings = [];
  let contenderIndex = 0;
  for (let groupIndex = 0; groupIndex < firstRoundMatchCount / 2; groupIndex += 1) {
    if (groupIndex < byeCount) firstPairings.push([entrants[groupIndex]?.id || null, null]);
    if (contenderPairings[contenderIndex]) firstPairings.push(contenderPairings[contenderIndex++]);
    else firstPairings.push([null, null]);
  }
  while (contenderIndex < contenderPairings.length && firstPairings.length < firstRoundMatchCount) {
    firstPairings.push(contenderPairings[contenderIndex++]);
  }
  while (firstPairings.length < firstRoundMatchCount) firstPairings.push([null, null]);

  const rounds = [];
  for (let roundIndex = 0; roundIndex < roundCount; roundIndex += 1) {
    const round = roundIndex + 1;
    const matchCount = bracketSize / (2 ** round);
    rounds.push({
      round,
      name: tournamentRoundName(bracketSize / (2 ** roundIndex)),
      day: tournament.seededAtDay + roundIndex,
      date: stateDateForDay(tournament.seededAtDay + roundIndex),
      matches: Array.from({ length: matchCount }, (_, index) => {
        const [leftId, rightId] = round === 1 ? firstPairings[index] : [null, null];
        return {
          id: `tournament-${tournament.season}-r${round}-m${index + 1}`,
          order: index + 1,
          type: round === 1 && leftId && !rightId ? "bye" : "battle",
          left: leftId ? tournamentSeedRef(tournament, leftId) : null,
          right: rightId ? tournamentSeedRef(tournament, rightId) : null,
          leftFrom: round > 1 ? { round: round - 1, match: index * 2 + 1 } : null,
          rightFrom: round > 1 ? { round: round - 1, match: index * 2 + 2 } : null
        };
      })
    });
  }
  return { version: 2, bracketSize, roundCount, rounds };
}

function ensureTournamentBracket(state, tournament) {
  if (!tournament?.bracket?.rounds?.length || tournament.bracket.version !== 2) tournament.bracket = buildTournamentBracket(state, tournament);
  for (const playedRound of tournament.rounds || []) {
    const plannedRound = tournament.bracket.rounds.find((round) => Number(round.round) === Number(playedRound.round));
    if (!plannedRound) continue;
    for (const [index, match] of (playedRound.matches || []).entries()) {
      if (!match.planId && plannedRound.matches[index]) match.planId = plannedRound.matches[index].id;
    }
  }
  return tournament.bracket;
}

function tournamentPlanParticipant(tournament, planMatch, side) {
  const direct = planMatch?.[side];
  if (direct?.id) return direct.id;
  const source = planMatch?.[`${side}From`];
  if (!source) return "";
  const priorRound = (tournament.rounds || []).find((round) => Number(round.round) === Number(source.round));
  const priorMatch = priorRound?.matches?.find((match) => match.planId === `tournament-${tournament.season}-r${source.round}-m${source.match}`);
  return priorMatch?.winner?.id || "";
}

function seedTournament(state) {
  const season = duelSeasonOfDay(state.day);
  if (state.duelTournament?.season === season) return state.duelTournament;
  if (state.duelTournament?.season) {
    state.duelTournamentHistory ??= [];
    state.duelTournamentHistory.unshift(state.duelTournament);
    state.duelTournamentHistory = state.duelTournamentHistory.slice(0, 4);
  }
  const entrants = tournamentEntrants(state).map((entry, index) => ({
    id: entry.entity.id, kind: entry.kind, seed: index + 1, name: entry.entity.name, sect: entry.entity.sect,
    realm: entry.entity.realm, score: entry.score, wins: entry.wins, power: entry.power
  }));
  for (const { entity } of allCultivators(state)) {
    const record = duelSeasonRecordFrom(entity, entity.duelSeason);
    if (entity.duelSeasonHistory?.some((item) => item.season === season)) continue;
    entity.spirit = Math.max(0, Number(entity.spirit) || 0) + record.spiritReward;
    record.rewardGranted = true;
    record.rewardDate = stateDateForDay(state);
    entity.duelSeasonHistory ??= [];
    entity.duelSeasonHistory.unshift(record);
  }
  state.duelTournament = {
    season, status: "active", bracketSize: duelTournamentBracketSize, seededAtDay: state.day, seededAt: timestampKey(),
    entrants, rounds: [], championId: "", runnerUpId: "", semifinalistIds: [], rewards: []
  };
  ensureTournamentBracket(state, state.duelTournament);
  log(state, `第 ${season} 届天骄淘汰赛签表已定：前 ${Math.max(0, duelTournamentBracketSize - entrants.length)} 名种子首轮轮空。`, "gold");
  return state.duelTournament;
}

function tournamentEntryRef(tournament, id) {
  return tournament.entrants.find((entry) => entry.id === id) || null;
}

function grantTournamentRewards(state, tournament, finalRound) {
  const championId = finalRound.matches[0]?.winner?.id;
  const runnerUpId = finalRound.matches[0]?.loser?.id;
  if (!championId || !runnerUpId || tournament.rewards?.length) return;
  const semifinalRound = tournament.rounds[tournament.rounds.length - 2];
  const semifinalistIds = (semifinalRound?.matches || []).map((match) => match.loser?.id).filter(Boolean);
  const rewardMeta = { rewardGranted: true, rewardedAtDay: state.day, rewardedAt: timestampKey() };
  const rewards = [
    { id: championId, place: "冠军", spirit: 350, ...rewardMeta },
    { id: runnerUpId, place: "亚军", spirit: 220, ...rewardMeta },
    ...semifinalistIds.map((id) => ({ id, place: "四强", spirit: 100, ...rewardMeta }))
  ];
  for (const reward of rewards) {
    const entity = cultivatorById(state, reward.id);
    if (entity) entity.spirit = Math.max(0, Number(entity.spirit) || 0) + reward.spirit;
  }
  const champion = cultivatorById(state, championId);
  if (champion && champion.realm < realms.length - 1) {
    champion.xp = Math.max(Number(champion.xp) || 0, xpNeed(champion.realm));
    champion.championDaoRhyme = { season: tournament.season, realm: champion.realm, bonus: 0.1, grantedAtDay: state.day, active: true };
    rewards[0].xpGranted = true;
    rewards[0].daoRhyme = true;
  }
  tournament.status = "completed";
  tournament.completedAtDay = state.day;
  tournament.completedAt = timestampKey();
  tournament.championId = championId;
  tournament.runnerUpId = runnerUpId;
  tournament.semifinalistIds = semifinalistIds;
  tournament.rewards = rewards;
  log(state, `${tournamentEntryRef(tournament, championId)?.name || "冠军"}夺得第 ${tournament.season} 届斗法魁首，冠军、亚军与四强奖励已发放。`, "gold");
}

function ensureTournamentRewardState(state) {
  let changed = false;
  const tournaments = [state.duelTournament, ...(state.duelTournamentHistory || [])]
    .filter((tournament) => tournament?.status === "completed");
  for (const tournament of tournaments) {
    const finalRound = tournament.rounds?.at(-1);
    const completedAtDay = Number(tournament.completedAtDay || finalRound?.day || 0);
    const completedAt = tournament.completedAt || finalRound?.createdAt || "";
    if (!tournament.completedAtDay && completedAtDay) {
      tournament.completedAtDay = completedAtDay;
      changed = true;
    }
    if (!tournament.completedAt && completedAt) {
      tournament.completedAt = completedAt;
      changed = true;
    }
    for (const reward of tournament.rewards || []) {
      if (reward.rewardGranted !== true) {
        reward.rewardGranted = true;
        changed = true;
      }
      if (!reward.rewardedAtDay && completedAtDay) {
        reward.rewardedAtDay = completedAtDay;
        changed = true;
      }
      if (!reward.rewardedAt && completedAt) {
        reward.rewardedAt = completedAt;
        changed = true;
      }
    }
    const championReward = (tournament.rewards || []).find((reward) => reward?.place === "冠军");
    if (!championReward?.id) continue;
    const champion = cultivatorById(state, championReward.id);
    if (!champion) continue;
    if (championReward.xpGranted !== true) {
      if (champion.realm < realms.length - 1) champion.xp = Math.max(Number(champion.xp) || 0, xpNeed(champion.realm));
      championReward.xpGranted = true;
      changed = true;
    }
    if (champion.championDaoRhyme?.season === tournament.season && !champion.championDaoRhyme.grantedAtDay && completedAtDay) {
      champion.championDaoRhyme.grantedAtDay = completedAtDay;
      changed = true;
    }
    if (championReward.daoRhyme !== true && champion.realm < realms.length - 1) {
      if (!champion.championDaoRhyme || champion.championDaoRhyme.season !== tournament.season) {
        champion.championDaoRhyme = {
          season: tournament.season,
          realm: champion.realm,
          bonus: 0.1,
          grantedAtDay: completedAtDay,
          active: true
        };
      }
      championReward.daoRhyme = true;
      changed = true;
    }
  }
  return changed;
}

function runDailyTournament(state, foughtAt = timestampKey()) {
  const tournament = seedTournament(state);
  const existing = tournament.rounds.find((round) => round.day === state.day);
  if (existing) return existing;
  const bracket = ensureTournamentBracket(state, tournament);
  const planRound = bracket.rounds.find((round) => Number(round.round) === tournament.rounds.length + 1);
  if (!planRound) return null;
  const round = {
    round: planRound.round,
    name: planRound.name,
    day: planRound.day,
    date: planRound.date,
    createdAt: foughtAt,
    matches: []
  };
  for (const planMatch of planRound.matches) {
    const leftId = tournamentPlanParticipant(tournament, planMatch, "left");
    const rightId = tournamentPlanParticipant(tournament, planMatch, "right");
    const left = cultivatorById(state, leftId);
    const right = rightId ? cultivatorById(state, rightId) : null;
    const leftEntry = tournamentEntryRef(tournament, leftId);
    const rightEntry = rightId ? tournamentEntryRef(tournament, rightId) : null;
    if (!left) continue;
    if (!right) {
      const leftRef = { ...entityRef(left, left.id === "player" ? "player" : "npc"), seed: leftEntry?.seed || 0 };
      round.matches.push({ id: planMatch.id, planId: planMatch.id, type: "bye", left: leftRef, right: null, winner: leftRef, summary: `${left.name}以 ${leftEntry?.seed || "-"} 号种子身份轮空晋级。` });
      continue;
    }
    const matchId = planMatch.id;
    const result = runDuelMatch(state, left, right, { matchId, scored: false, foughtAt, tournament: { round: round.round, name: round.name } });
    const leftRef = { ...result.replay.left, seed: leftEntry?.seed || 0 };
    const rightRef = { ...result.replay.right, seed: rightEntry?.seed || 0 };
    const winnerRef = result.replay.winner === "left" ? leftRef : rightRef;
    const loserRef = result.replay.winner === "left" ? rightRef : leftRef;
    round.matches.push({ id: matchId, planId: planMatch.id, type: "battle", left: leftRef, right: rightRef, winner: winnerRef, loser: loserRef, replayId: result.replay.replayId, summary: `${result.winner.name}晋级${tournamentRoundName(Math.max(2, bracket.bracketSize / (2 ** round.round)))}。` });
  }
  tournament.rounds.push(round);
  if (round.round === bracket.roundCount) grantTournamentRewards(state, tournament, round);
  log(state, `${round.date} 天骄淘汰赛 ${round.name} 完成。`, "gold");
  return round;
}

function defaultDuelSeason(day = 1) {
  return {
    season: duelSeasonOfDay(day),
    seasonDay: duelSeasonDay(day),
    score: 0,
    wins: 0,
    losses: 0
  };
}

function duelSeasonStartDay(season) {
  return (Math.max(1, Number(season) || 1) - 1) * duelSeasonLength + 1;
}

function duelSeasonEndDay(season) {
  return duelSeasonStartDay(season) + duelSeasonLength - 1;
}

function duelSeasonRecordFrom(person, seasonState) {
  const season = Number(seasonState?.season) || 1;
  const score = Math.max(0, Math.min(duelSeasonMaxScore, Math.floor(Number(seasonState?.score) || 0)));
  const rank = duelRankForScore(score);
  const reward = Math.max(0, Math.floor(Number(rank.spiritReward) || 0));
  return {
    season,
    seasonStartDay: duelSeasonStartDay(season),
    seasonEndDay: duelSeasonEndDay(season),
    score,
    wins: Math.max(0, Math.floor(Number(seasonState?.wins) || 0)),
    losses: Math.max(0, Math.floor(Number(seasonState?.losses) || 0)),
    rankId: rank.id,
    rankName: rank.name,
    rankColor: rank.color,
    spiritReward: reward,
    recordedAt: timestampKey()
  };
}

function normalizeDuelSeason(person, day = 1, options = {}) {
  person.duelSeasonHistory ??= [];
  const season = duelSeasonOfDay(day);
  if (!person.duelSeason || person.duelSeason.season !== season) {
    if (person.duelSeason?.season) {
      const previous = duelSeasonRecordFrom(person, person.duelSeason);
      if (!person.duelSeasonHistory.some((record) => record.season === previous.season)) {
        if (options.grantReward && previous.spiritReward > 0) {
          person.spirit = Math.max(0, Math.floor(Number(person.spirit) || 0)) + previous.spiritReward;
          previous.rewardGranted = true;
          previous.rewardDate = stateDateForDay(options.state || { day });
        }
        person.duelSeasonHistory.unshift(previous);
      }
    }
    person.duelSeason = defaultDuelSeason(day);
    return true;
  }
  person.duelSeason.score = Math.max(0, Math.min(duelSeasonMaxScore, Math.floor(Number(person.duelSeason.score) || 0)));
  person.duelSeason.wins = Math.max(0, Math.floor(Number(person.duelSeason.wins) || 0));
  person.duelSeason.losses = Math.max(0, Math.floor(Number(person.duelSeason.losses) || 0));
  person.duelSeason.seasonDay = duelSeasonDay(day);
  return false;
}

function duelRankSnapshot(person) {
  const score = person.duelSeason?.score || 0;
  const rank = duelRankForScore(score);
  return {
    ...person.duelSeason,
    score,
    rankId: rank.id,
    rankName: rank.name,
    rankColor: rank.color
  };
}

function duelRankIndex(person) {
  const rankId = duelRankSnapshot(person).rankId;
  const index = duelRanks.findIndex((rank) => rank.id === rankId);
  return Math.max(0, index);
}

function duelRankGap(left, right) {
  return Math.abs(duelRankIndex(left) - duelRankIndex(right));
}

function canDuelMatch(left, right) {
  if (!left || !right) return false;
  if (left.id === right.id) return false;
  if ((left.sect || "") && left.sect === right.sect) return false;
  return duelRankGap(left, right) <= 2;
}

function duelScoreDelta(person, opponent, won) {
  if (!won) return duelLossScore;
  const gap = duelRankIndex(opponent) - duelRankIndex(person);
  if (gap >= 2) return 4;
  if (gap === 1) return 3;
  return duelWinScore;
}

function applyDuelScore(person, won, day, opponent = null) {
  normalizeDuelSeason(person, day);
  const delta = duelScoreDelta(person, opponent || person, won);
  person.duelSeason.score = Math.max(0, Math.min(duelSeasonMaxScore, person.duelSeason.score + delta));
  if (won) person.duelSeason.wins += 1;
  else person.duelSeason.losses += 1;
  return delta;
}

function duelSeasonStatsFromRecords(state) {
  const currentSeason = duelSeasonOfDay(state.day);
  const stats = new Map(allCultivators(state).map(({ entity }) => [entity.id, { score: 0, wins: 0, losses: 0 }]));
  const people = cultivatorMap(state);
  const records = [...(state.duelDays || [])]
    .filter((record) => duelSeasonOfDay(record.day || state.day) === currentSeason)
    .sort((a, b) => (a.day || 0) - (b.day || 0));
  for (const record of records) {
    for (const match of record.matches || []) {
      if (match.type === "bye") continue;
      const winnerId = match.winner?.id;
      const loserId = match.loser?.id;
      const winnerEntity = people.get(winnerId);
      const loserEntity = people.get(loserId);
      const winner = stats.get(winnerId);
      if (winner) {
        const delta = typeof match.winnerScoreDelta === "number"
          ? match.winnerScoreDelta
          : duelScoreDelta(winnerEntity || match.winner, loserEntity || match.loser, true);
        winner.score = Math.min(duelSeasonMaxScore, winner.score + delta);
        winner.wins += 1;
      }
      const loser = stats.get(loserId);
      if (loser) {
        const delta = typeof match.loserScoreDelta === "number" ? match.loserScoreDelta : duelLossScore;
        loser.score = Math.max(0, loser.score + delta);
        loser.losses += 1;
      }
    }
  }
  return stats;
}

function repairDuelSeasonFromRecords(state) {
  const stats = duelSeasonStatsFromRecords(state);
  let changed = false;
  for (const { entity } of allCultivators(state)) {
    normalizeDuelSeason(entity, state.day);
    const recordStats = stats.get(entity.id);
    if (!recordStats) continue;
    const currentMatches = (entity.duelSeason?.wins || 0) + (entity.duelSeason?.losses || 0);
    const recordMatches = recordStats.wins + recordStats.losses;
    if ((entity.duelSeason?.score || 0) < recordStats.score || currentMatches < recordMatches) {
      entity.duelSeason.score = recordStats.score;
      entity.duelSeason.wins = recordStats.wins;
      entity.duelSeason.losses = recordStats.losses;
      changed = true;
    }
    if ((entity.duelWins || 0) < recordStats.wins) {
      entity.duelWins = recordStats.wins;
      changed = true;
    }
    if ((entity.duelLosses || 0) < recordStats.losses) {
      entity.duelLosses = recordStats.losses;
      changed = true;
    }
  }
  return changed;
}

function trimDuelDays(records, currentDay) {
  const minDayToKeep = Math.max(1, Number(currentDay || 1) - publicDuelDayLimit + 1);
  return [...(records || [])]
    .filter((record) => (record.day || currentDay) >= minDayToKeep)
    .sort((a, b) => b.day - a.day)
    .slice(0, publicDuelDayLimit);
}

function randomRootSet() {
  const roll = Math.random();
  const count = roll < 0.62 ? 1 : roll < 0.84 ? 2 : roll < 0.95 ? 3 : roll < 0.99 ? 4 : 5;
  const picked = shuffle(roots).slice(0, count).map((root) => normalizeRoot(root));
  return normalizeRootSet({ roots: picked, primaryRootKey: picked[0]?.key });
}

function rollInnateStats() {
  return {
    body: 7 + Math.floor(Math.random() * 7),
    wisdom: 7 + Math.floor(Math.random() * 8),
    chance: 4 + Math.floor(Math.random() * 8),
    heartDemon: Math.floor(Math.random() * 8)
  };
}

function rootSetNameLine(rootSet) {
  return rootSet.roots.map((root) => root.key === rootSet.primaryRootKey ? `${root.name}（主）` : root.name).join("、");
}

function makeNpc(name, index) {
  const rootSet = randomRootSet();
  const root = rootSet.primaryRoot;
  const realm = 0;
  const stats = rollBirthStats(realm);
  const innate = rollInnateStats();
  const skillId = randomSkillId();

  const npc = {
    id: `npc-${index}`,
    name,
    gender: npcGenders[name] || "male",
    sect: sectForNpcIndex(index),
    root,
    roots: rootSet.roots,
    primaryRootKey: rootSet.primaryRootKey,
    realm,
    xp: 0,
    hp: effectiveMaxHp({ root, maxHp: stats.maxHp }),
    maxHp: stats.maxHp,
    mana: effectiveMaxMana({ root, maxMana: stats.maxMana }),
    maxMana: stats.maxMana,
    skillId,
    skillRanks: { [skillId]: 1 },
    lastSkillUpgradeDay: 0,
    spiritPearls: createSpiritPearlState(),
    spirit: 0,
    reputation: 0,
    body: innate.body,
    wisdom: innate.wisdom,
    attack: stats.attack,
    defense: stats.defense,
    divineSense: stats.divineSense,
    chance: innate.chance,
    wealth: 0,
    heartDemon: innate.heartDemon,
    mood: pick(["谨慎", "好斗", "闭关", "游历"]),
    duelWins: 0,
    duelLosses: 0,
    duelSeason: defaultDuelSeason(),
    duelSeasonHistory: [],
    dungeonClears: 0,
    bestDungeonPower: 0,
    bestDungeonName: "未入秘境",
    daoTrialDefenses: 0,
    daoTrialWins: 0,
    daoTrialRewards: { xp: 0, spirit: 0, dust: 0 },
    portraitVariant: 0,
    dungeonHistory: [],
    dailyRecords: [],
    breakthroughs: [],
    skillUpgrades: [],
    duelHistory: []
  };
  npc.potentialRealm = potentialRealmFor(npc);
  npc.potentialSource = Number.isFinite(canonicalPotentialRealms[name]) ? "lore" : "generated";
  npc.talent = createTalent(npc);
  return npc;
}

function log(state, text, type = "") {
  const entry = normalizeLogEntry(state, {
    text,
    type,
    day: state.day,
    date: stateDateForDay(state),
    time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
  });
  state.log ??= [];
  state.log.unshift(entry);
  state.log = state.log.slice(0, flatLogLimit);
  addLogDayEntry(state, entry);
  return entry;
}

function normalizeLogEntry(state, entry = {}) {
  const day = Math.max(1, Math.floor(Number(entry.day || state.day || 1) || 1));
  return {
    text: String(entry.text || ""),
    type: entry.type || "",
    day,
    date: entry.date || stateDateForDay(state, day),
    time: entry.time || ""
  };
}

function buildLogDaysFromFlatLog(state, logs = state.log) {
  const grouped = new Map();
  for (const rawEntry of logs || []) {
    const entry = normalizeLogEntry(state, rawEntry);
    if (!grouped.has(entry.day)) {
      grouped.set(entry.day, {
        day: entry.day,
        date: entry.date || stateDateForDay(state, entry.day),
        logs: []
      });
    }
    grouped.get(entry.day).logs.push(entry);
  }
  return trimLogDays([...grouped.values()], state);
}

function trimLogDays(logDays = [], stateOrDay = 1) {
  const state = typeof stateOrDay === "object" && stateOrDay ? stateOrDay : { day: stateOrDay };
  const currentDay = state.day || 1;
  const minDayToKeep = minDayForWindow(currentDay, logRecordDays);
  return [...(logDays || [])]
    .map((dayRecord) => {
      const day = Math.max(1, Math.floor(Number(dayRecord?.day || currentDay || 1) || 1));
      return {
        day,
        date: dayRecord?.date || stateDateForDay(state, day),
        logs: (dayRecord?.logs || [])
          .map((entry) => normalizeLogEntry(state, { ...entry, day: entry?.day || day, date: entry?.date || dayRecord?.date }))
          .slice(0, logRecordLimitPerDay)
      };
    })
    .filter((dayRecord) => dayRecord.day >= minDayToKeep)
    .sort((a, b) => b.day - a.day)
    .slice(0, logRecordDays);
}

function addLogDayEntry(state, entry) {
  state.logDays = trimLogDays(state.logDays || [], state);
  let dayRecord = state.logDays.find((record) => record.day === entry.day);
  if (!dayRecord) {
    dayRecord = {
      day: entry.day,
      date: entry.date || stateDateForDay(state, entry.day),
      logs: []
    };
    state.logDays.unshift(dayRecord);
  }
  dayRecord.logs.unshift(entry);
  dayRecord.logs = dayRecord.logs.slice(0, logRecordLimitPerDay);
  state.logDays = trimLogDays(state.logDays, state);
}

function publicLogDays(state) {
  return trimLogDays(state.logDays?.length ? state.logDays : buildLogDaysFromFlatLog(state), state)
    .map((dayRecord) => ({
      day: dayRecord.day,
      date: dayRecord.date,
      logs: (dayRecord.logs || []).slice(0, logRecordLimitPerDay)
    }));
}

function makeId(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeTaskCategory(value) {
  const text = String(value || "").trim();
  if (taskCategories.includes(text)) return text;
  if (["学习", "读书", "看书", "阅读", "study"].includes(text)) return "学习";
  if (["工作", "加班", "职业"].includes(text)) return "工作";
  if (["运动", "锻炼", "健身", "修行", "body"].includes(text)) return "运动";
  return "生活";
}

function migrateDefaultTaskCategory(definition) {
  if (definition?.id === "task-reading-pages") return { ...definition, category: "学习" };
  return definition;
}

function normalizeTaskDefinition(definition = {}, fallback = {}) {
  const type = definition.type === "measurable" ? "measurable" : "complete";
  const targetAmount = type === "measurable"
    ? Math.max(0.01, Number(definition.targetAmount ?? fallback.targetAmount ?? 1) || 1)
    : 1;
  const maxMultiplier = type === "measurable"
    ? Math.max(0.01, Number(definition.maxMultiplier ?? fallback.maxMultiplier ?? 4) || 4)
    : 1;
  return {
    id: String(definition.id || fallback.id || makeId("task")).slice(0, 48),
    name: String(definition.name || fallback.name || "未命名任务").trim().slice(0, 40) || "未命名任务",
    detail: String(definition.detail ?? fallback.detail ?? "").trim().slice(0, 180),
    type,
    category: normalizeTaskCategory(definition.category || fallback.category),
    unitName: String(definition.unitName || fallback.unitName || (type === "measurable" ? "单位" : "次")).trim().slice(0, 10) || "次",
    targetAmount,
    xpReward: Math.max(0, Math.floor(Number(definition.xpReward ?? fallback.xpReward ?? 0) || 0)),
    spiritReward: Math.max(0, Math.floor(Number(definition.spiritReward ?? fallback.spiritReward ?? 0) || 0)),
    maxMultiplier,
    enabled: definition.enabled ?? fallback.enabled ?? true
  };
}

function normalizeTaskProgress(state) {
  const hadStoredProgress = Object.prototype.hasOwnProperty.call(state, "taskProgress");
  const source = state.taskProgress && typeof state.taskProgress === "object" ? state.taskProgress : {};
  const minDay = Math.max(1, Number(state.day || 1) - taskProgressRecordDays + 1);
  const normalized = {};
  for (const [dayKey, entries] of Object.entries(source)) {
    const day = Math.floor(Number(dayKey) || 0);
    if (day < minDay || day > Number(state.day || day)) continue;
    if (!entries || typeof entries !== "object") continue;
    const dayEntries = {};
    for (const [taskId, entry] of Object.entries(entries)) {
      const amount = Math.max(0, Number(entry?.amount) || 0);
      const awardedMultiplier = Math.max(0, Number(entry?.awardedMultiplier) || 0);
      if (!taskId || (!amount && !awardedMultiplier)) continue;
      dayEntries[taskId] = { amount, awardedMultiplier };
    }
    if (Object.keys(dayEntries).length) normalized[day] = dayEntries;
  }
  for (const record of state.taskCompletions || []) {
    const day = Math.floor(Number(record?.day) || 0);
    const taskId = String(record?.taskId || "");
    if (!day || day < minDay || !taskId) continue;
    normalized[day] ??= {};
    const previous = normalized[day][taskId] || { amount: 0, awardedMultiplier: 0 };
    const target = Math.max(0.01, Number(record.targetAmount) || 1);
    const amount = Number(record.completedAmount) || target * Math.max(0, Number(record.multiplier) || 1);
    normalized[day][taskId] = {
      amount: Math.max(previous.amount, amount),
      awardedMultiplier: Math.max(previous.awardedMultiplier, Number(record.completedMultiplier ?? record.multiplier) || 1)
    };
  }
  const before = JSON.stringify(state.taskProgress || {});
  state.taskProgress = normalized;
  return hadStoredProgress && before !== JSON.stringify(normalized);
}

function taskProgressEntry(state, day, taskId) {
  normalizeTaskProgress(state);
  const safeDay = Math.max(1, Math.floor(Number(day) || state.day || 1));
  state.taskProgress[safeDay] ??= {};
  state.taskProgress[safeDay][taskId] ??= { amount: 0, awardedMultiplier: 0 };
  return state.taskProgress[safeDay][taskId];
}

function taskBaseXpForDay(state, day) {
  return (state.taskCompletions || [])
    .filter((record) => Number(record.day) === Number(day))
    .reduce((sum, record) => sum + Math.max(0, Number(record.baseXp) || 0), 0);
}

function taskDailyFullXpBudget(state) {
  const value = Number(state.gameSettings?.taskDailyFullXpBudget);
  if (!Number.isFinite(value)) return defaultTaskDailyFullXpBudget;
  return clamp(Math.floor(value), 0, maxTaskDailyFullXpBudget);
}

function battleReplaySpeed(state) {
  const value = Number(state.gameSettings?.battleReplaySpeed);
  if (!Number.isFinite(value)) return defaultBattleReplaySpeed;
  return clamp(Math.round(value * 4) / 4, minBattleReplaySpeed, maxBattleReplaySpeed);
}

function dailyTickerSpeed(state) {
  const value = Number(state.gameSettings?.dailyTickerSpeed);
  if (!Number.isFinite(value)) return defaultDailyTickerSpeed;
  return clamp(Math.round(value * 4) / 4, minDailyTickerSpeed, maxDailyTickerSpeed);
}

function formatTaskProgressAmount(amount, definition) {
  const rounded = Math.round((Number(amount) || 0) * 100) / 100;
  return `${rounded}${definition?.unitName ? ` ${definition.unitName}` : ""}`;
}

function taskEfficiencyForDay(state, day, requestedBaseXp) {
  const prior = taskBaseXpForDay(state, day);
  const requested = Math.max(0, Number(requestedBaseXp) || 0);
  const full = Math.max(0, Math.min(requested, taskDailyFullXpBudget(state) - prior));
  const reduced = Math.max(0, requested - full);
  const effectiveBaseXp = Math.round(full + reduced * taskDailyReducedXpMultiplier);
  return {
    priorBaseXp: prior,
    fullBaseXp: full,
    reducedBaseXp: reduced,
    effectiveBaseXp,
    multiplier: requested > 0 ? effectiveBaseXp / requested : 1
  };
}

function playerCatchupProfile(state) {
  const npcRealms = (state.npcs || []).map((npc) => Number(npc.realm) || 0).sort((a, b) => a - b);
  const medianRealm = npcRealms.length ? npcRealms[Math.floor(npcRealms.length / 2)] : state.player.realm || 0;
  const realmGap = Math.max(0, medianRealm - (Number(state.player.realm) || 0));
  const recentMinDay = Math.max(1, Number(state.day || 1) - 6);
  const activeDays = new Set((state.taskCompletions || [])
    .filter((task) => Number(task.day) >= recentMinDay)
    .map((task) => Number(task.day)))
    .size;
  const multiplier = activeDays > 0 && realmGap > 0
    ? 1 + Math.min(0.2, realmGap * 0.04 + Math.max(0, 3 - activeDays) * 0.015)
    : 1;
  return { medianRealm, realmGap, activeDays, multiplier };
}

function publicTaskProgress(state, day = state.day) {
  normalizeTaskProgress(state);
  const safeDay = Math.max(1, Math.floor(Number(day) || state.day || 1));
  return {
    day: safeDay,
    entries: state.taskProgress[safeDay] || {},
    baseXp: taskBaseXpForDay(state, safeDay),
    fullXpBudget: taskDailyFullXpBudget(state),
    reducedMultiplier: taskDailyReducedXpMultiplier
  };
}

function estimatedWinChance(leftPower, rightPower) {
  const left = Math.max(1, Number(leftPower) || 1);
  const right = Math.max(1, Number(rightPower) || 1);
  return clamp(0.5 + (left - right) / Math.max(240, (left + right) * 0.9), 0.08, 0.92);
}

function publicDungeonForecasts(state) {
  const playerPower = powerOf(state.player, state);
  return dungeons.map((dungeon) => {
    const recommendedPower = Math.max(48, Number(dungeon.power) || 48);
    const winChance = estimatedWinChance(playerPower, recommendedPower);
    return {
      id: dungeon.id,
      name: dungeon.name,
      recommendedPower,
      playerPower,
      winChance,
      risk: winChance >= 0.7 ? "稳妥" : winChance >= 0.45 ? "可挑战" : "高风险"
    };
  });
}

function publicTodayPlan(state) {
  return {
    ...publicTaskPlan(state),
    dungeonForecasts: publicDungeonForecasts(state)
  };
}

function publicTaskPlan(state, progress = publicTaskProgress(state)) {
  const catchup = playerCatchupProfile(state);
  const remainingXp = Math.max(0, xpNeed(state.player.realm) - (Number(state.player.xp) || 0));
  const taskDefinitions = (state.taskDefinitions || []).filter((task) => task.enabled !== false);
  const suggestedTask = taskDefinitions
    .filter((task) => !progress.entries[task.id] || Number(progress.entries[task.id].awardedMultiplier) < 1)
    .sort((a, b) => (Number(b.xpReward) || 0) - (Number(a.xpReward) || 0))[0] || null;
  return {
    remainingXp,
    effectiveTaskXp: progress.baseXp,
    fullTaskXpBudget: progress.fullXpBudget,
    catchup,
    suggestedTask: suggestedTask ? { id: suggestedTask.id, name: suggestedTask.name, xpReward: suggestedTask.xpReward } : null
  };
}

function defaultRealityTasks() {
  return defaultTaskDefinitions.map((definition) => normalizeTaskDefinition(definition));
}

function ensureTaskSystem(state) {
  let changed = false;
  if (!Array.isArray(state.taskDefinitions) || !state.taskDefinitions.length) {
    state.taskDefinitions = defaultRealityTasks();
    changed = true;
  } else {
    const before = JSON.stringify(state.taskDefinitions);
    state.taskDefinitions = state.taskDefinitions.map((definition) => normalizeTaskDefinition(migrateDefaultTaskCategory(definition))).slice(0, taskDefinitionLimit);
    changed = changed || before !== JSON.stringify(state.taskDefinitions);
  }
  if (!Array.isArray(state.taskCompletions)) {
    state.taskCompletions = Array.isArray(state.tasks) ? [...state.tasks] : [];
    changed = true;
  }
  if (Object.prototype.hasOwnProperty.call(state, "tasks")) {
    delete state.tasks;
    changed = true;
  }
  changed = normalizeTaskProgress(state) || changed;
  const beforeRecords = JSON.stringify(state.taskMultiplierRecords || []);
  normalizeTaskMultiplierRecords(state);
  if (!state.taskMultiplierRecords.some((record) => record.day === state.day)) {
    rememberTaskMultiplierForDay(state, state.day);
  }
  changed = changed || beforeRecords !== JSON.stringify(state.taskMultiplierRecords || []);
  return changed;
}

const encounterStateVersion = 2;
const encounterPendingLimit = 3;
const encounterHistoryLimit = 720;
const encounterPublicHistoryLimit = 24;
const encounterMinGapDays = 2;
const encounterMaxGapDays = 4;
const encounterActiveChainLimit = 2;
const encounterFamilyCooldownDays = 30;
const daoTrialStateVersion = 7;
const daoTrialHistoryLimit = 104;
const daoTrialDailyTicketGrant = 1;
const daoTrialTicketCap = 2;
const daoTrialNpcProjectionFactor = 1;
const daoTrialNpcPreferredRate = 0.82;
const daoTrialNpcRecentDays = 3;
const daoTrialNpcPoolReturnDays = 3;
const daoTrialNpcApexPoolSize = 12;
const daoTrialBattleRewardCap = { spirit: 36, dust: 6 };
const daoTrialHarmonyMaxPerRoute = 15;
const daoTrialCoreRewardDefinitions = {
  1: { xp: 2, spiritBase: 8, spiritPerStage: 2, dustBase: 0, dustPerTier: 0, label: "入境" },
  5: { xp: 2, spiritBase: 0, spiritPerStage: 0, dustBase: 1, dustPerTier: 1, label: "精英" },
  10: { xp: 3, spiritBase: 18, spiritPerStage: 4, dustBase: 1, dustPerTier: 1, label: "问心" },
  15: { xp: 3, spiritBase: 12, spiritPerStage: 3, dustBase: 2, dustPerTier: 1, label: "归一" }
};
const daoTrialHarmonyMilestoneDefinitions = [
  { id: "harmony-15", target: 15, label: "初窥三脉", reward: { xp: 0, spiritBase: 8, spiritPerStage: 2, dust: 1 } },
  { id: "harmony-30", target: 30, label: "两脉互证", reward: { xp: 2, spiritBase: 12, spiritPerStage: 3, dust: 1 } },
  { id: "harmony-45", target: 45, label: "三脉归一", reward: { xp: 3, spiritBase: 18, spiritPerStage: 4, dust: 2 } }
];
const daoTrialTaskBoonDefinitions = {
  "学习": { id: "study", name: "悟道签", text: "本轮可免费重观一次道印。" },
  "运动": { id: "exercise", name: "护体势", text: "本轮最大血量提高 12%。" },
  "工作": { id: "work", name: "聚财意", text: "本轮带回的灵石提高 15%。" },
  "生活": { id: "life", name: "回春符", text: "本轮可主动恢复一次 20% 最大血量。" }
};

function deterministicUnit(seed) {
  return seededBattleRandom(String(seed || "seed"))();
}

function deterministicPick(list, seed) {
  if (!list?.length) return null;
  return list[Math.floor(deterministicUnit(seed) * list.length) % list.length];
}

function encounterCycleOfDay(day) {
  return Math.floor((Math.max(1, Number(day) || 1) - 1) / 360) + 1;
}

function encounterSeasonOfDay(day) {
  const month = Math.floor((Math.max(1, Number(day) || 1) - 1) % 360 / 30) + 1;
  if (month <= 3) return "spring";
  if (month <= 6) return "summer";
  if (month <= 9) return "autumn";
  return "winter";
}

function ensureEncounterState(state) {
  let changed = false;
  if (!state.encounters || state.encounters.version !== encounterStateVersion) {
    const previous = state.encounters || {};
    state.encounters = {
      version: encounterStateVersion,
      lastGenerationDay: Number(previous.lastGenerationDay || state.day - 1),
      nextGenerationDay: Number(previous.nextGenerationDay || 0),
      emptyDays: Number(previous.emptyDays || 0),
      pending: Array.isArray(previous.pending) ? previous.pending : [],
      history: Array.isArray(previous.history) ? previous.history : [],
      seen: previous.seen && typeof previous.seen === "object" ? previous.seen : {},
      chains: previous.chains && typeof previous.chains === "object" ? previous.chains : {},
      focusedNpcIds: Array.isArray(previous.focusedNpcIds) ? previous.focusedNpcIds : [],
      memories: previous.memories && typeof previous.memories === "object" ? previous.memories : {},
      promises: Array.isArray(previous.promises) ? previous.promises : [],
      statistics: previous.statistics && typeof previous.statistics === "object" ? previous.statistics : {}
    };
    changed = true;
  }
  if (!state.relationships || typeof state.relationships !== "object" || Array.isArray(state.relationships)) {
    state.relationships = {};
    changed = true;
  }
  const encounters = state.encounters;
  encounters.pending = (encounters.pending || []).filter((event) => event?.id && encounterDefinitionMap[event.definitionId]).slice(0, encounterPendingLimit);
  encounters.history = (encounters.history || []).filter(Boolean).slice(0, encounterHistoryLimit);
  encounters.focusedNpcIds = [...new Set((encounters.focusedNpcIds || []).filter((id) => state.npcs?.some((npc) => npc.id === id)))].slice(0, 3);
  encounters.seen ??= {};
  encounters.chains ??= {};
  encounters.memories ??= {};
  encounters.promises = (encounters.promises || []).filter((promise) => promise?.id).slice(0, 120);
  encounters.statistics ??= {};
  encounters.statistics.seenCount = Number(encounters.statistics.seenCount) || 0;
  encounters.statistics.resolvedCount = Number(encounters.statistics.resolvedCount) || 0;
  encounters.statistics.seasonCounts ??= {};
  encounters.emptyDays = Math.max(0, Math.floor(Number(encounters.emptyDays) || 0));
  encounters.lastGenerationDay = Math.min(state.day, Math.floor(Number(encounters.lastGenerationDay) || state.day - 1));
  if (!Number.isFinite(Number(encounters.nextGenerationDay)) || Number(encounters.nextGenerationDay) <= encounters.lastGenerationDay) {
    encounters.nextGenerationDay = Math.max(state.day + encounterMinGapDays, encounters.lastGenerationDay + encounterMinGapDays);
  }
  return changed;
}

function relationshipEntry(state, npcId) {
  if (!npcId || npcId === "player") return null;
  state.relationships ??= {};
  state.relationships[npcId] ??= {
    npcId,
    affinity: 0,
    respect: 0,
    interactions: 0,
    lastDay: 0,
    invitedUntilCycle: 0
  };
  return state.relationships[npcId];
}

function relationshipTitle(relationship = {}) {
  const affinity = Number(relationship.affinity) || 0;
  const respect = Number(relationship.respect) || 0;
  if (affinity >= 70 && respect >= 65) return "知己";
  if (affinity >= 45 && respect >= 45) return "同道";
  if (affinity <= -35 && respect >= 55) return "宿敌";
  if (affinity >= 40) return "故交";
  if (respect >= 55) return "惺惺相惜";
  if (affinity <= -45) return "仇怨";
  if (affinity >= 15 || respect >= 20) return "相识";
  return "陌路";
}

function relationshipStageInfo(relationship = {}) {
  const score = Math.max(0, Number(relationship.affinity) || 0) + Math.max(0, Number(relationship.respect) || 0);
  const stages = [
    { id: "stranger", name: "陌路", threshold: 0 },
    { id: "acquaintance", name: "相识", threshold: 25 },
    { id: "familiar", name: "故交", threshold: 70 },
    { id: "companion", name: "同道", threshold: 105 },
    { id: "confidant", name: "知己", threshold: 145 }
  ];
  const currentIndex = Math.max(0, stages.findLastIndex((stage) => score >= stage.threshold));
  const current = stages[currentIndex];
  const next = stages[currentIndex + 1] || null;
  return {
    id: current.id,
    name: relationshipTitle(relationship) || current.name,
    score,
    nextName: next?.name || "圆满",
    nextThreshold: next?.threshold || score,
    progress: next ? clamp((score - current.threshold) / Math.max(1, next.threshold - current.threshold), 0, 1) : 1
  };
}

function publicRelationship(state, npcId) {
  const npc = state.npcs?.find((item) => item.id === npcId);
  if (!npc) return null;
  const relation = state.relationships?.[npcId] || { npcId, affinity: 0, respect: 0, interactions: 0, lastDay: 0 };
  const stage = relationshipStageInfo(relation);
  return {
    npcId,
    name: npc.name,
    sect: npc.sect,
    affinity: relation.affinity,
    respect: relation.respect,
    interactions: relation.interactions,
    lastDay: relation.lastDay,
    title: relationshipTitle(relation),
    stage,
    focused: state.encounters?.focusedNpcIds?.includes(npcId) || false
  };
}

function encounterActorCandidates(state, rule) {
  const npcs = state.npcs || [];
  const player = state.player;
  if (!npcs.length) return [];
  if (rule === "recentOpponent") {
    const ids = (player.duelHistory || []).slice(0, 12).map((record) => record.opponentId).filter(Boolean);
    const matches = ids.map((id) => npcs.find((npc) => npc.id === id)).filter(Boolean);
    if (matches.length) return matches;
  }
  if (rule === "sectMate") {
    const matches = npcs.filter((npc) => npc.sect === state.sect?.name);
    if (matches.length) return matches;
  }
  if (rule === "rivalSect") {
    const matches = npcs.filter((npc) => npc.sect !== state.sect?.name);
    if (matches.length) return matches;
  }
  if (rule === "sameRoot") {
    const key = primaryRoot(player).key;
    const matches = npcs.filter((npc) => primaryRoot(npc).key === key);
    if (matches.length) return matches;
  }
  if (rule === "sameSkill") {
    const matches = npcs.filter((npc) => npc.skillId === player.skillId);
    if (matches.length) return matches;
  }
  if (rule === "dungeonPeer") {
    const recentIds = new Set((state.dungeonDays?.[0]?.solo || []).map((entry) => entry.id));
    const matches = npcs.filter((npc) => recentIds.has(npc.id));
    if (matches.length) return matches;
  }
  return npcs;
}

function encounterActorFor(state, definition, actorId = "") {
  if (actorId) return state.npcs?.find((npc) => npc.id === actorId) || null;
  const candidates = encounterActorCandidates(state, definition.actorRule);
  const focused = candidates.filter((npc) => state.encounters.focusedNpcIds.includes(npc.id));
  const pool = focused.length && deterministicUnit(`focus|${state.rebirth}|${state.day}|${definition.id}`) < 0.42 ? focused : candidates;
  return deterministicPick(pool, `actor|${state.rebirth}|${state.day}|${definition.id}`);
}

function encounterContext(state, actor) {
  const territory = deterministicPick(
    (state.provinces || []).filter((province) => province.owner === state.sect?.name),
    `province|${state.day}|${actor?.id || "none"}`
  );
  const task = state.taskCompletions?.find((record) => record.day >= state.day - 1);
  const dungeon = state.player?.dungeonHistory?.find((record) => record.day >= state.day - 1);
  return {
    actor: actor?.name || "一名陌生修士",
    player: state.player?.name || "你",
    sect: state.sect?.name || "本宗",
    province: provinceById(territory?.id)?.name || "边城",
    task: task?.name || "尘世事务",
    dungeon: dungeon?.name || "秘境"
  };
}

function fillEncounterText(text, context) {
  return String(text || "").replace(/\{(actor|player|sect|province|task|dungeon)\}/g, (_, key) => context[key] || "");
}

function materializeEncounter(state, definition, actorId = "") {
  const actor = encounterActorFor(state, definition, actorId);
  if (!actor) return null;
  const context = encounterContext(state, actor);
  const instanceId = makeId("encounter");
  return {
    id: instanceId,
    definitionId: definition.id,
    title: definition.title,
    text: fillEncounterText(definition.text, context),
    category: definition.category,
    categoryLabel: definition.categoryLabel || encounterCategoryLabels[definition.category] || "因缘",
    rarity: definition.rarity,
    familyId: definition.familyId || definition.id,
    season: definition.season || "all",
    seasonal: Boolean(definition.seasonal),
    actor: compactCultivatorRef(publicCultivator(actor, state, { kind: "npc", compact: true })),
    actorId: actor.id,
    chainId: definition.chainId || "",
    chainTitle: definition.chainTitle || "",
    chainStep: definition.chainStep || 0,
    chainLength: definition.chainLength || 0,
    createdDay: state.day,
    createdDate: stateDateForDay(state),
    expiresDay: state.day + 3,
    choices: definition.choices.map((choice) => ({
      id: choice.id,
      label: choice.label,
      hint: choice.hint,
      tone: choice.tone,
      memoryTag: choice.memoryTag || "",
      deferred: choice.deferred || null
    }))
  };
}

function activeEncounterChainCount(state) {
  return Object.values(state.encounters.chains || {}).filter((chain) => chain.status === "active").length;
}

function expireEncounters(state) {
  const kept = [];
  for (const event of state.encounters.pending || []) {
    if (Number(event.expiresDay) >= state.day) {
      kept.push(event);
      continue;
    }
    state.encounters.history.unshift({
      ...event,
      resolvedDay: state.day,
      resolvedDate: stateDateForDay(state),
      choiceId: "expired",
      choiceLabel: "未及赴约",
      outcome: "此事随时日淡去，没有造成额外损失。",
      expired: true,
      choices: undefined
    });
    if (event.chainId && state.encounters.chains[event.chainId]?.status === "active") {
      state.encounters.chains[event.chainId].status = "ended";
      state.encounters.chains[event.chainId].endedDay = state.day;
    }
  }
  state.encounters.pending = kept;
  state.encounters.history = state.encounters.history.slice(0, encounterHistoryLimit);
}

function settleEncounterPromises(state) {
  ensureEncounterState(state);
  const kept = [];
  for (const promise of state.encounters.promises || []) {
    if (promise.status === "resolved" || Number(promise.dueDay) > state.day) {
      kept.push(promise);
      continue;
    }
    const relation = relationshipEntry(state, promise.actorId);
    if (relation) {
      relation.respect = clamp(relation.respect + 1, 0, 100);
      relation.lastDay = state.day;
    }
    if (promise.kind === "market" || promise.kind === "dungeon") state.player.spirit += 3;
    if (promise.kind === "cultivation") state.player.xp += fortuneAdjustedXp(state, state.player, 2);
    promise.status = "resolved";
    promise.resolvedDay = state.day;
    promise.outcome = "旧约如期有了回响，曾经的选择没有被忘记。";
    kept.push(promise);
    log(state, `因缘回响：「${promise.title}」兑现了旧约。`, "gold");
  }
  state.encounters.promises = kept.slice(-120);
}

function dueChainDefinition(state) {
  return Object.values(state.encounters.chains || {})
    .filter((chain) => chain.status === "active" && chain.nextEventId && Number(chain.dueDay) <= state.day)
    .sort((a, b) => a.dueDay - b.dueDay || a.startedDay - b.startedDay)
    .map((chain) => ({ chain, definition: encounterDefinitionMap[chain.nextEventId] }))
    .find((entry) => entry.definition) || null;
}

function encounterCandidates(state) {
  const season = encounterSeasonOfDay(state.day);
  const cycle = encounterCycleOfDay(state.day);
  const recentCategories = [...state.encounters.pending, ...state.encounters.history].slice(0, 2).map((event) => event.category);
  const recentFamilies = [...state.encounters.pending, ...state.encounters.history]
    .filter((event) => event.familyId && Number(event.resolvedDay || event.createdDay || 0) >= state.day - encounterFamilyCooldownDays)
    .map((event) => event.familyId);
  return encounterDefinitions.filter((definition) => {
    if (definition.chainId && !definition.eligibleAsStart) return false;
    if (!definition.weight) return false;
    const seen = state.encounters.seen[definition.id];
    if (definition.oncePerSave && seen?.count) return false;
    if (definition.oncePerCycle && seen?.lastCycle === cycle) return false;
    if (seen?.lastDay && state.day - seen.lastDay < definition.cooldownDays) return false;
    if (definition.season && definition.season !== "all" && definition.season !== season) return false;
    if (definition.familyId && recentFamilies.includes(definition.familyId)) return false;
    if (definition.chainId && activeEncounterChainCount(state) >= encounterActiveChainLimit) return false;
    if (definition.chainId && state.encounters.chains[definition.chainId]) return false;
    if (recentCategories.length >= 2 && recentCategories.every((category) => category === definition.category)) return false;
    return encounterActorCandidates(state, definition.actorRule).length > 0;
  });
}

function chooseEncounterDefinition(state) {
  const candidates = encounterCandidates(state);
  if (!candidates.length) return null;
  const weighted = candidates.map((definition) => {
    const seenCount = Number(state.encounters.seen[definition.id]?.count || 0);
    const categoryNovelty = [...state.encounters.pending, ...state.encounters.history].slice(0, 6)
      .filter((event) => event.category === definition.category).length;
    const weight = Math.max(0.05, Number(definition.weight || 1) / (1 + seenCount * 1.8) / (1 + categoryNovelty * 0.35));
    return { definition, weight };
  });
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let roll = deterministicUnit(`encounter-choice|${state.rebirth}|${state.day}|${state.encounters.history.length}`) * total;
  for (const item of weighted) {
    roll -= item.weight;
    if (roll <= 0) return item.definition;
  }
  return weighted.at(-1)?.definition || null;
}

function recordEncounterSeen(state, definition) {
  const seen = state.encounters.seen[definition.id] || { count: 0, lastDay: 0 };
  seen.count += 1;
  seen.lastDay = state.day;
  seen.lastCycle = encounterCycleOfDay(state.day);
  state.encounters.seen[definition.id] = seen;
  state.encounters.statistics.seenCount += 1;
  state.encounters.statistics.seasonCounts[encounterSeasonOfDay(state.day)] = (state.encounters.statistics.seasonCounts[encounterSeasonOfDay(state.day)] || 0) + 1;
}

function scheduleNextEncounter(state) {
  const span = encounterMaxGapDays - encounterMinGapDays + 1;
  const gap = encounterMinGapDays + Math.floor(deterministicUnit(`encounter-gap|${state.rebirth}|${state.day}|${state.encounters.statistics.seenCount}`) * span);
  state.encounters.nextGenerationDay = state.day + clamp(gap, encounterMinGapDays, encounterMaxGapDays);
  state.encounters.emptyDays = 0;
}

export function generateDailyEncounter(state) {
  ensureEncounterState(state);
  settleEncounterPromises(state);
  if (state.encounters.lastGenerationDay >= state.day) return null;
  if (state.day < state.encounters.nextGenerationDay) return null;
  expireEncounters(state);
  state.encounters.lastGenerationDay = state.day;
  if (state.encounters.pending.length >= encounterPendingLimit) return null;

  const due = dueChainDefinition(state);
  if (due) {
    const event = materializeEncounter(state, due.definition, due.chain.actorId);
    if (!event) return null;
    state.encounters.pending.push(event);
    due.chain.nextEventId = "";
    recordEncounterSeen(state, due.definition);
    scheduleNextEncounter(state);
    log(state, `因缘再续：「${event.title}」已有新的进展。`, "gold");
    return event;
  }
  const definition = chooseEncounterDefinition(state);
  if (!definition) {
    state.encounters.emptyDays += 1;
    scheduleNextEncounter(state);
    return null;
  }
  const event = materializeEncounter(state, definition);
  if (!event) return null;
  state.encounters.pending.push(event);
  recordEncounterSeen(state, definition);
  scheduleNextEncounter(state);
  log(state, `因缘奇遇：「${event.title}」等待你的抉择。`, definition.rarity === "fated" ? "gold" : "");
  return event;
}

function signedEncounterValue(value) {
  const amount = Number(value) || 0;
  return amount > 0 ? `+${amount}` : `${amount}`;
}

function encounterChoiceImpact(choice = {}, state = null) {
  const effects = choice.effects || {};
  const parts = [];
  const labels = [
    ["xp", "修为"],
    ["spirit", "灵石"],
    ["dust", "灵尘"],
    ["hp", "气血"],
    ["mana", "灵力"],
    ["reputation", "声望"],
    ["sectSupplies", "宗门物资"],
    ["rivalHeat", "宗门敌意"],
    ["heartDemon", "心魔"]
  ];
  for (const [key, label] of labels) {
    const value = key === "xp" && state ? fortuneAdjustedXp(state, state.player, effects[key]) : effects[key];
    if (Number(value) !== 0) parts.push(`${label} ${signedEncounterValue(value)}`);
  }
  if (Number(effects.affinity) !== 0) parts.push(`亲和 ${signedEncounterValue(effects.affinity)}`);
  if (Number(effects.respect) !== 0) parts.push(`尊重 ${signedEncounterValue(effects.respect)}`);
  if (effects.battle) parts.push("触发切磋");
  if (effects.invite) parts.push("获得试炼邀约");
  if (effects.nextEventId) parts.push("留下后续线索");
  if (effects.endChain) parts.push("结束事件链");
  if (effects.completeChain) parts.push("完成事件链");
  if (choice.deferred?.days) parts.push(`${choice.deferred.days}日后回响`);
  return parts.join(" · ");
}

function encounterChoiceAvailability(state, choice) {
  const spiritCost = Math.max(0, -(Number(choice.effects?.spirit) || 0));
  if (spiritCost > state.player.spirit) return { canChoose: false, reason: `需要 ${spiritCost} 灵石` };
  return { canChoose: true, reason: "" };
}

function publicEncounterEvent(state, event) {
  const definition = encounterDefinitionMap[event.definitionId];
  return {
    ...event,
    choices: (definition?.choices || []).map((choice) => ({
      id: choice.id,
      label: choice.label,
      hint: choice.hint,
      tone: choice.tone,
      memoryTag: choice.memoryTag || "",
      deferred: choice.deferred || null,
      impact: encounterChoiceImpact(choice, state),
      ...encounterChoiceAvailability(state, choice)
    }))
  };
}

function publicEncounters(state) {
  ensureEncounterState(state);
  const relations = Object.keys(state.relationships || {})
    .map((npcId) => publicRelationship(state, npcId))
    .filter(Boolean)
    .sort((a, b) => (b.affinity + b.respect) - (a.affinity + a.respect));
  const discoveredDefinitions = Object.entries(state.encounters.seen || {})
    .filter(([, record]) => Number(record?.count) > 0)
    .map(([id]) => encounterDefinitionMap[id])
    .filter(Boolean);
  const discoveredByCategory = Object.fromEntries(Object.keys(encounterCategoryLabels).map((category) => [
    category,
    discoveredDefinitions.filter((definition) => definition.category === category).length
  ]));
  const totalByCategory = Object.fromEntries(Object.keys(encounterCategoryLabels).map((category) => [
    category,
    encounterDefinitions.filter((definition) => definition.category === category).length
  ]));
  return {
    definitionCount: encounterDefinitionCount,
    minGapDays: encounterMinGapDays,
    maxGapDays: encounterMaxGapDays,
    nextGenerationDay: state.encounters.nextGenerationDay,
    daysUntilNext: Math.max(0, state.encounters.nextGenerationDay - state.day),
    emptyDays: state.encounters.emptyDays,
    season: encounterSeasonOfDay(state.day),
    cycle: encounterCycleOfDay(state.day),
    archiveCount: state.encounters.history.length,
    statistics: state.encounters.statistics,
    promises: state.encounters.promises.filter((promise) => promise.status !== "resolved").slice(-12),
    memoryCount: Object.keys(state.encounters.memories || {}).length,
    collection: {
      discovered: discoveredDefinitions.length,
      total: encounterDefinitionCount,
      discoveredByCategory,
      totalByCategory,
      completedChains: Object.values(state.encounters.chains || {}).filter((chain) => chain.status === "completed").length,
      endedChains: Object.values(state.encounters.chains || {}).filter((chain) => chain.status === "ended").length
    },
    pending: state.encounters.pending.map((event) => publicEncounterEvent(state, event)),
    history: state.encounters.history.slice(0, encounterPublicHistoryLimit),
    relationships: relations.slice(0, 20),
    focusedNpcIds: state.encounters.focusedNpcIds,
    activeChains: Object.values(state.encounters.chains || {}).filter((chain) => chain.status === "active").map((chain) => ({
      id: chain.id,
      title: chain.title,
      actorId: chain.actorId,
      step: chain.step,
      length: chain.length,
      dueDay: chain.dueDay
    }))
  };
}

export function updateEncounterFocus(state, payload = {}) {
  ensureEncounterState(state);
  const npcId = String(payload.npcId || "");
  if (!state.npcs.some((npc) => npc.id === npcId)) throw new Error("未找到该修士");
  const focused = new Set(state.encounters.focusedNpcIds);
  if (payload.focused === false || focused.has(npcId)) focused.delete(npcId);
  else {
    if (focused.size >= 3) throw new Error("最多关注三名修士");
    focused.add(npcId);
  }
  state.encounters.focusedNpcIds = [...focused];
  return { npcId, focused: focused.has(npcId) };
}

export function resolveEncounter(state, payload = {}) {
  ensureEncounterState(state);
  const event = state.encounters.pending.find((item) => item.id === payload.eventId);
  if (!event) throw new Error("该因缘事件已经结束");
  const definition = encounterDefinitionMap[event.definitionId];
  const choice = definition?.choices.find((item) => item.id === payload.choiceId);
  if (!choice) throw new Error("未知的因缘选择");
  const availability = encounterChoiceAvailability(state, choice);
  if (!availability.canChoose) throw new Error(availability.reason);
  const actor = state.npcs.find((npc) => npc.id === event.actorId);
  const relation = relationshipEntry(state, event.actorId);
  const effects = choice.effects || {};
  const encounterXp = fortuneAdjustedXp(state, state.player, effects.xp);
  const impact = encounterChoiceImpact(choice, state);
  relation.affinity = clamp(relation.affinity + (Number(effects.affinity) || 0), -100, 100);
  relation.respect = clamp(relation.respect + (Number(effects.respect) || 0), 0, 100);
  relation.interactions += 1;
  relation.lastDay = state.day;
  state.player.xp = Math.max(0, state.player.xp + encounterXp);
  state.player.spirit = Math.max(0, state.player.spirit + (Number(effects.spirit) || 0));
  state.player.hp = clamp(state.player.hp + (Number(effects.hp) || 0), 1, effectiveMaxHp(state.player, state));
  state.player.mana = clamp(state.player.mana + (Number(effects.mana) || 0), 0, effectiveMaxMana(state.player, state));
  state.player.reputation = Math.max(0, state.player.reputation + (Number(effects.reputation) || 0));
  state.player.heartDemon = clamp(state.player.heartDemon + (Number(effects.heartDemon) || 0), 0, 100);
  state.sect.supplies = clamp(state.sect.supplies + (Number(effects.sectSupplies) || 0), 0, 160);
  state.sect.rivalHeat = clamp(state.sect.rivalHeat + (Number(effects.rivalHeat) || 0), 0, 100);
  if (effects.dust > 0) addSpiritDust(state, effects.dust, `因缘事件「${event.title}」`, state.player);
  if (effects.invite) relation.invitedUntilCycle = daoTrialCycleOfDay(state.day) + 1;

  const memoryKey = `${event.familyId || definition.familyId || definition.id}:${choice.memoryTag || choice.id}`;
  const memory = state.encounters.memories[memoryKey] || {
    key: memoryKey,
    familyId: event.familyId || definition.familyId || definition.id,
    tag: choice.memoryTag || choice.id,
    count: 0,
    firstDay: state.day
  };
  memory.count += 1;
  memory.lastDay = state.day;
  memory.lastChoiceId = choice.id;
  memory.actorId = event.actorId;
  state.encounters.memories[memoryKey] = memory;
  if (choice.deferred?.days) {
    state.encounters.promises.push({
      id: makeId("encounter-promise"),
      title: event.title,
      actorId: event.actorId,
      familyId: event.familyId || definition.familyId || definition.id,
      kind: choice.deferred.kind || definition.category,
      dueDay: state.day + Math.max(1, Number(choice.deferred.days) || 1),
      createdDay: state.day,
      status: "pending",
      memoryKey
    });
    state.encounters.promises = state.encounters.promises.slice(-120);
  }

  let replay = null;
  let battleResult = "";
  if (effects.battle && actor) {
    const seed = `encounter-battle|${state.rebirth}|${state.day}|${event.definitionId}|${actor.id}`;
    const battle = runTurnBattle({ ...state.player }, { ...actor }, { state, seed, maxRounds: 18 });
    const won = battle.winner === "left";
    battleResult = won ? "切磋得胜" : "切磋落败";
    relation.respect = clamp(relation.respect + (won ? 3 : 2), 0, 100);
    replay = buildReplay({ ...state.player }, { ...actor }, battle, won ? "胜" : "负", timestampKey(), state);
    replay.kind = "encounter";
    replay.day = state.day;
    replay.replayId = makeReplayId("encounter", state.day, event.id, actor.id);
    queueBattleReplay(state, replay, event.id);
  }

  if (definition.chainId) {
    const chain = state.encounters.chains[definition.chainId] || {
      id: definition.chainId,
      title: definition.chainTitle,
      actorId: event.actorId,
      startedDay: state.day,
      step: definition.chainStep,
      length: definition.chainLength,
      status: "active"
    };
    chain.step = definition.chainStep;
    chain.lastChoiceId = choice.id;
    if (effects.endChain) {
      chain.status = "ended";
      chain.endedDay = state.day;
    } else if (effects.completeChain || !effects.nextEventId) {
      chain.status = "completed";
      chain.endedDay = state.day;
    } else {
      chain.status = "active";
      chain.nextEventId = effects.nextEventId;
      chain.dueDay = state.day + Math.max(1, Number(effects.nextDelay) || 1);
      chain.step = definition.chainStep;
    }
    state.encounters.chains[definition.chainId] = chain;
  }

  const history = {
    ...event,
    resolvedDay: state.day,
    resolvedDate: stateDateForDay(state),
    choiceId: choice.id,
    choiceLabel: choice.label,
    outcome: `${choice.outcome}${impact ? `（${impact}）` : ""}${battleResult ? ` ${battleResult}。` : ""}`,
    impact,
    relationTitle: relationshipTitle(relation),
    affinity: relation.affinity,
    respect: relation.respect,
    memoryKey,
    deferred: choice.deferred || null,
    replayId: replay?.replayId || "",
    choices: undefined
  };
  state.encounters.pending = state.encounters.pending.filter((item) => item.id !== event.id);
  state.encounters.history.unshift(history);
  state.encounters.history = state.encounters.history.slice(0, encounterHistoryLimit);
  state.encounters.statistics.resolvedCount += 1;
  log(state, `因缘抉择：${event.title} · ${choice.label}。`, effects.endChain ? "bad" : "gold");
  return { history, replay: replay ? publicReplay(replay) : null };
}

function daoTrialCycleOfDay(day) {
  return Math.floor((Math.max(1, Number(day) || 1) - 1) / daoTrialCycleLength) + 1;
}

function daoTrialAffixForCycle(cycle) {
  return daoTrialCycleAffixes[(Math.max(1, Number(cycle) || 1) - 1) % daoTrialCycleAffixes.length] || daoTrialCycleAffixes[0];
}

const daoTrialCoreFloorCount = 15;

const daoTrialCoreNodePattern = [
  "battle", "event", "battle", "rest", "elite",
  "battle", "event", "battle", "rest", "boss",
  "battle", "event", "elite", "rest", "boss"
];
const daoTrialEndlessNodePattern = ["battle", "event", "battle", "rest", "boss"];
const daoTrialCheckpointRecovery = { hp: 0.25, mana: 0.35 };

function daoTrialNodeRole(floor) {
  if (floor <= daoTrialCoreFloorCount) return daoTrialCoreNodePattern[floor - 1];
  return daoTrialEndlessNodePattern[(floor - daoTrialCoreFloorCount - 1) % daoTrialEndlessNodePattern.length];
}

function daoTrialNodePool(route, variants, role) {
  const templates = [...route.nodes, ...variants];
  if (role === "boss") return templates.filter((node) => node.type === "battle" && node.boss);
  if (role === "elite") return templates.filter((node) => node.type === "battle" && node.elite && !node.boss);
  if (role === "battle") return templates.filter((node) => node.type === "battle" && !node.elite && !node.boss);
  return templates.filter((node) => node.type === role && !node.elite && !node.boss);
}

function daoTrialNodesForCycle(routeId, cycle, count = daoTrialCoreFloorCount) {
  const route = daoTrialRouteMap[routeId];
  if (!route) return [];
  const variants = daoTrialNodeVariants[routeId] || [];
  return Array.from({ length: Math.max(1, Math.floor(Number(count) || daoTrialCoreFloorCount)) }, (_, index) => {
    const floor = index + 1;
    const role = daoTrialNodeRole(floor);
    const pool = daoTrialNodePool(route, variants, role);
    const fallback = route.nodes.find((node) => node.type === "battle") || route.nodes[0];
    const selected = pool[stableHash(`dao-floor-template|${cycle}|${routeId}|${floor}|${role}`) % Math.max(1, pool.length)] || fallback;
    const checkpoint = floor % 5 === 0;
    const phase = Math.ceil(floor / 5);
    const suffix = role === "boss"
      ? floor === daoTrialCoreFloorCount ? "最终问心" : `第${phase}问心`
      : `第${floor}层`;
    return {
      ...selected,
      id: `${selected.id}-floor-${floor}`,
      name: `${selected.name}·${suffix}`,
      floor,
      slot: index,
      elite: role === "elite",
      boss: role === "boss",
      checkpoint,
      rounds: Number(selected.rounds || 18) + Math.max(0, phase - 1)
    };
  });
}

function createDaoTrialState(day = 1) {
  const cycle = daoTrialCycleOfDay(day);
  const year = Math.floor((cycle - 1) / 52) + 1;
  return {
    version: daoTrialStateVersion,
    cycle,
    cycleStartDay: (cycle - 1) * daoTrialCycleLength + 1,
    cycleEndDay: cycle * daoTrialCycleLength,
    attemptsUsed: 0,
    tickets: 1,
    lastTicketDay: Math.max(0, Number(day) || 0),
    lastBoonDay: 0,
    claimedMilestones: [],
    claimedHarmonyMilestones: [],
    bestScore: 0,
    bestFloor: 0,
    bestQualityScore: 0,
    bestResult: null,
    recentLawOfferIds: [],
    recentSealOfferIds: [],
    discoveredLawIds: [],
    discoveredSealIds: [],
    lawPity: { withoutGold: 0, withoutDiamond: 0 },
    npcTrialUsage: {},
    activeRun: null,
    history: [],
    yearHistory: [],
    routeMastery: Object.fromEntries(daoTrialRoutes.map((route) => [route.id, { runs: 0, clears: 0, eliteClears: 0, bossClears: 0, bestFloor: 0, bestScore: 0 }])),
    yearGoals: { year, completedCycles: 0, cyclesPlayed: [], routeClears: 0, perfectRuns: 0, deepestFloor: 0, lawsSeen: [], companionIds: [], affixesSeen: [], claimed: [] }
  };
}

function ensureDaoTrialState(state) {
  let changed = false;
  if (!state.daoTrial || state.daoTrial.version !== daoTrialStateVersion) {
    const previous = state.daoTrial || {};
    const previousHistory = Array.isArray(previous.history) ? previous.history : [];
    const migratedLawIds = [
      ...(previous.discoveredLawIds || []),
      ...(previous.yearGoals?.lawsSeen || []),
      ...(previous.activeRun?.lawIds || []),
      ...(previous.activeRun?.lawOffer || []),
      ...previousHistory.flatMap((record) => record.lawIds || [])
    ];
    const migratedSealIds = [
      ...(previous.discoveredSealIds || []),
      ...(previous.activeRun?.sealIds || []),
      ...(previous.activeRun?.pendingSealIds || []),
      ...previousHistory.flatMap((record) => record.sealIds || [])
    ];
    state.daoTrial = {
      ...createDaoTrialState(state.day),
      history: previousHistory,
      tickets: clamp(Math.floor(Number(previous.tickets) || 1), 0, daoTrialTicketCap),
      lastTicketDay: Math.min(state.day, Math.max(0, Math.floor(Number(previous.lastTicketDay) || state.day))),
      lastBoonDay: Math.max(0, Math.floor(Number(previous.lastBoonDay) || 0)),
      attemptsUsed: Math.max(0, Math.floor(Number(previous.attemptsUsed) || 0)),
      claimedMilestones: [...new Set(previous.claimedMilestones || [])],
      claimedHarmonyMilestones: [...new Set(previous.claimedHarmonyMilestones || [])],
      bestScore: Math.max(0, Math.floor(Number(previous.bestScore) || 0)),
      bestFloor: Math.max(0, Math.floor(Number(previous.bestFloor) || 0)),
      bestQualityScore: Math.max(0, Math.floor(Number(previous.bestQualityScore) || 0)),
      bestResult: previous.bestResult || null,
      recentLawOfferIds: previous.recentLawOfferIds,
      recentSealOfferIds: previous.recentSealOfferIds,
      discoveredLawIds: migratedLawIds,
      discoveredSealIds: migratedSealIds,
      lawPity: previous.lawPity,
      npcTrialUsage: previous.npcTrialUsage,
      activeRun: previous.activeRun || null,
      routeMastery: previous.routeMastery,
      yearGoals: previous.yearGoals,
      yearHistory: previous.yearHistory
    };
    changed = true;
  }
  state.daoTrial.tickets = clamp(Math.floor(Number(state.daoTrial.tickets) || 0), 0, daoTrialTicketCap);
  state.daoTrial.lastTicketDay = Math.min(state.day, Math.max(0, Math.floor(Number(state.daoTrial.lastTicketDay) || 0)));
  if (state.daoTrial.lastTicketDay < state.day) {
    const elapsedDays = state.day - state.daoTrial.lastTicketDay;
    state.daoTrial.tickets = Math.min(daoTrialTicketCap, state.daoTrial.tickets + elapsedDays * daoTrialDailyTicketGrant);
    state.daoTrial.lastTicketDay = state.day;
    changed = true;
  }
  state.daoTrial.lastBoonDay = Math.max(0, Math.floor(Number(state.daoTrial.lastBoonDay) || 0));
  state.daoTrial.recentLawOfferIds = (state.daoTrial.recentLawOfferIds || []).filter((id) => daoTrialLawMap[id]).slice(-18);
  state.daoTrial.recentSealOfferIds = (state.daoTrial.recentSealOfferIds || []).filter((id) => daoTrialSealMap[id]).slice(-36);
  state.daoTrial.discoveredLawIds = [...new Set((state.daoTrial.discoveredLawIds || []).filter((id) => daoTrialLawMap[id]))];
  state.daoTrial.discoveredSealIds = [...new Set((state.daoTrial.discoveredSealIds || []).filter((id) => daoTrialSealMap[id]))];
  state.daoTrial.lawPity ??= { withoutGold: 0, withoutDiamond: 0 };
  state.daoTrial.lawPity.withoutGold = Math.max(0, Math.floor(Number(state.daoTrial.lawPity.withoutGold) || 0));
  state.daoTrial.lawPity.withoutDiamond = Math.max(0, Math.floor(Number(state.daoTrial.lawPity.withoutDiamond) || 0));
  state.daoTrial.npcTrialUsage = state.daoTrial.npcTrialUsage && typeof state.daoTrial.npcTrialUsage === "object"
    ? Object.fromEntries(Object.entries(state.daoTrial.npcTrialUsage).filter(([id, record]) => (
      state.npcs.some((npc) => npc.id === id) && record && typeof record === "object"
    )).map(([id, record]) => [id, {
      lastDay: Math.max(0, Math.floor(Number(record.lastDay) || 0)),
      recentDays: [...new Set((record.recentDays || []).map((day) => Math.floor(Number(day) || 0)).filter((day) => day > 0))].slice(-8),
      count: Math.max(0, Math.floor(Number(record.count) || 0)),
      lastDayCount: Math.max(0, Math.floor(Number(record.lastDayCount) || 0)),
      tier: ["preferred", "secondary", "fallback"].includes(record.tier) ? record.tier : "preferred"
    }]))
    : {};
  state.daoTrial.routeMastery ??= createDaoTrialState(state.day).routeMastery;
  state.daoTrial.yearGoals ??= createDaoTrialState(state.day).yearGoals;
  state.daoTrial.yearHistory ??= [];
  const expectedCycle = daoTrialCycleOfDay(state.day);
  if (state.daoTrial.cycle !== expectedCycle) {
    if (state.daoTrial.activeRun) {
      // A cycle rollover is an automatic failure, but it still needs the same
      // reward, relationship, mastery, and annual-goal settlement as any exit.
      finishDaoTrialRun(state, state.daoTrial.activeRun, false, "周期结束");
    }
    const history = state.daoTrial.history.slice(0, daoTrialHistoryLimit);
    const routeMastery = state.daoTrial.routeMastery;
    const tickets = state.daoTrial.tickets;
    const lastTicketDay = state.daoTrial.lastTicketDay;
    const lastBoonDay = state.daoTrial.lastBoonDay;
    const recentLawOfferIds = state.daoTrial.recentLawOfferIds;
    const recentSealOfferIds = state.daoTrial.recentSealOfferIds;
    const discoveredLawIds = state.daoTrial.discoveredLawIds;
    const discoveredSealIds = state.daoTrial.discoveredSealIds;
    const lawPity = state.daoTrial.lawPity;
    const npcTrialUsage = state.daoTrial.npcTrialUsage;
    let yearGoals = state.daoTrial.yearGoals;
    const yearHistory = state.daoTrial.yearHistory || [];
    const expectedYear = Math.floor((expectedCycle - 1) / 52) + 1;
    if (yearGoals && Number(yearGoals.year || 1) !== expectedYear) {
      yearHistory.unshift({ ...yearGoals, endedCycle: expectedCycle - 1 });
      yearGoals = { ...createDaoTrialState(state.day).yearGoals, year: expectedYear };
    }
    state.daoTrial = { ...createDaoTrialState(state.day), history, routeMastery, yearGoals, yearHistory: yearHistory.slice(0, 8), tickets, lastTicketDay, lastBoonDay, recentLawOfferIds, recentSealOfferIds, discoveredLawIds, discoveredSealIds, lawPity, npcTrialUsage };
    changed = true;
  }
  state.daoTrial.claimedMilestones = [...new Set(state.daoTrial.claimedMilestones || [])];
  if (!Array.isArray(state.daoTrial.claimedHarmonyMilestones)) {
    state.daoTrial.claimedHarmonyMilestones = [];
    changed = true;
  } else {
    state.daoTrial.claimedHarmonyMilestones = [...new Set(state.daoTrial.claimedHarmonyMilestones.filter((id) => daoTrialHarmonyMilestoneDefinitions.some((milestone) => milestone.id === id)))];
  }
  state.daoTrial.history = (state.daoTrial.history || []).slice(0, daoTrialHistoryLimit);
  for (const record of state.daoTrial.history) {
    record.floor = Math.max(0, Math.floor(Number(record.floor) || (record.success ? 7 : Number(record.nodesCleared) || 0)));
    record.scoreBreakdown ??= { progress: 0, quality: 0, risk: 0, build: 0, total: Number(record.score) || 0 };
    const scoredComponents = ["progress", "quality", "risk", "build"]
      .reduce((sum, key) => sum + Math.max(0, Number(record.scoreBreakdown[key]) || 0), 0);
    const legacyBreakdown = Boolean(record.scoreBreakdown.legacy || (Number(record.score) > 0 && scoredComponents === 0));
    if (record.scoreBreakdown.legacy !== legacyBreakdown) changed = true;
    record.scoreBreakdown.legacy = legacyBreakdown;
    record.combatStats ??= { battles: 0, rounds: 0, damageDealt: 0, damageTaken: 0, healing: 0, shields: 0, skillCasts: 0, manaSpent: 0, lawTriggers: 0 };
    record.companionContribution ??= { damage: 0, healing: 0, shields: 0, control: 0, assists: 0 };
  }
  state.daoTrial.bestFloor = Math.max(0, Math.floor(Number(state.daoTrial.bestFloor) || 0));
  state.daoTrial.bestScore = Math.max(0, Math.floor(Number(state.daoTrial.bestScore) || 0));
  state.daoTrial.bestQualityScore = Math.max(0, Math.floor(Number(state.daoTrial.bestQualityScore) || 0));
  if (!state.daoTrial.bestFloor && state.daoTrial.history.length) {
    const legacyBest = [...state.daoTrial.history].sort((a, b) => b.floor - a.floor || Number(b.score || 0) - Number(a.score || 0))[0];
    state.daoTrial.bestFloor = legacyBest.floor;
    state.daoTrial.bestScore = Math.max(0, Number(legacyBest.score) || 0);
    if (!state.daoTrial.bestResult) state.daoTrial.bestResult = legacyBest;
    changed = true;
  }
  // Older records sometimes carried route mastery and a best floor but left
  // the global best score at zero.  Rehydrate the header metric from history
  // so the entry page and route cards cannot disagree.
  if (state.daoTrial.history.length && state.daoTrial.bestScore <= 0) {
    const scoredBest = [...state.daoTrial.history].sort((a, b) => (
      Number(b.floor || 0) - Number(a.floor || 0)
      || Number(b.score || 0) - Number(a.score || 0)
    ))[0];
    if (scoredBest && Number(scoredBest.score || 0) > 0) {
      state.daoTrial.bestScore = Math.floor(Number(scoredBest.score) || 0);
      if (!state.daoTrial.bestResult) state.daoTrial.bestResult = scoredBest;
      changed = true;
    }
  }
  if (state.daoTrial.activeRun) {
    state.daoTrial.activeRun.rewards ??= { xp: 0, spirit: 0, dust: 0, milestones: [] };
    state.daoTrial.activeRun.rewards.xp = Number(state.daoTrial.activeRun.rewards.xp) || 0;
    state.daoTrial.activeRun.rewards.spirit = Number(state.daoTrial.activeRun.rewards.spirit) || 0;
    state.daoTrial.activeRun.rewards.dust = Number(state.daoTrial.activeRun.rewards.dust) || 0;
    state.daoTrial.activeRun.rewards.milestones = [...new Set(state.daoTrial.activeRun.rewards.milestones || [])];
  }
  state.daoTrial.yearHistory = (state.daoTrial.yearHistory || []).slice(0, 8);
  state.daoTrial.yearGoals.year = Number(state.daoTrial.yearGoals.year) || Math.floor((state.daoTrial.cycle - 1) / 52) + 1;
  for (const route of daoTrialRoutes) {
    state.daoTrial.routeMastery[route.id] ??= { runs: 0, clears: 0, eliteClears: 0, bossClears: 0, bestFloor: 0, bestScore: 0 };
    const mastery = state.daoTrial.routeMastery[route.id];
    mastery.runs = Number(mastery.runs) || 0;
    mastery.clears = Number(mastery.clears) || 0;
    mastery.eliteClears = Number(mastery.eliteClears) || 0;
    mastery.bossClears = Number(mastery.bossClears) || 0;
    mastery.bestFloor = Number(mastery.bestFloor) || 0;
    mastery.bestScore = Number(mastery.bestScore) || 0;
    if (!mastery.bestFloor) {
      const legacyBest = state.daoTrial.history.filter((record) => record.routeId === route.id && !record.practice).sort((a, b) => b.floor - a.floor || Number(b.score || 0) - Number(a.score || 0))[0];
      if (legacyBest) {
        mastery.bestFloor = legacyBest.floor;
        mastery.bestScore = Math.max(mastery.bestScore, Number(legacyBest.score) || 0);
        changed = true;
      }
    }
  }
  const legacyCompletedCycles = Math.max(0, Math.floor(Number(state.daoTrial.yearGoals.completedCycles) || 0));
  state.daoTrial.yearGoals.cyclesPlayed = [...new Set((state.daoTrial.yearGoals.cyclesPlayed || []).map(Number).filter((cycle) => Number.isInteger(cycle) && cycle > 0))].slice(-52);
  if (!state.daoTrial.yearGoals.cyclesPlayed.length && legacyCompletedCycles) {
    state.daoTrial.yearGoals.cyclesPlayed = Array.from({ length: Math.min(52, legacyCompletedCycles) }, (_, index) => index + 1);
  }
  state.daoTrial.yearGoals.completedCycles = state.daoTrial.yearGoals.cyclesPlayed.length;
  state.daoTrial.yearGoals.routeClears = Number(state.daoTrial.yearGoals.routeClears) || 0;
  state.daoTrial.yearGoals.perfectRuns = Number(state.daoTrial.yearGoals.perfectRuns) || 0;
  state.daoTrial.yearGoals.deepestFloor = Number(state.daoTrial.yearGoals.deepestFloor) || 0;
  state.daoTrial.yearGoals.lawsSeen = [...new Set((state.daoTrial.yearGoals.lawsSeen || []).filter((id) => daoTrialLawMap[id]))];
  state.daoTrial.yearGoals.companionIds = [...new Set((state.daoTrial.yearGoals.companionIds || []).filter(Boolean))];
  state.daoTrial.yearGoals.affixesSeen ??= [];
  state.daoTrial.yearGoals.claimed ??= [];
  const activeRun = state.daoTrial.activeRun;
  if (activeRun) {
    const route = daoTrialRouteMap[activeRun.routeId];
    if (!route) {
      state.daoTrial.activeRun = null;
      changed = true;
    } else {
      if (!Array.isArray(activeRun.nodes) || activeRun.nodes.length < daoTrialCoreFloorCount) {
        const generated = daoTrialNodesForCycle(route.id, activeRun.cycle || state.daoTrial.cycle, daoTrialCoreFloorCount);
        activeRun.nodes = generated.map((node, index) => activeRun.nodes?.[index] ? { ...node, ...activeRun.nodes[index], floor: index + 1 } : node);
        changed = true;
      }
      activeRun.affixId ||= daoTrialAffixForCycle(activeRun.cycle || state.daoTrial.cycle).id;
      activeRun.sealIds = [...new Set(activeRun.sealIds || [])].filter((id) => daoTrialSealMap[id]);
      activeRun.pendingSealIds = [...new Set(activeRun.pendingSealIds || [])].filter((id) => daoTrialSealMap[id]);
      activeRun.sealStacks = Object.fromEntries(Object.entries(activeRun.sealStacks || Object.fromEntries(activeRun.sealIds.map((id) => [id, 1])))
        .filter(([id]) => daoTrialSealMap[id])
        .map(([id, count]) => [id, clamp(Math.floor(Number(count) || 1), 1, 5)]));
      activeRun.nodeIndex = clamp(Math.floor(Number(activeRun.nodeIndex) || 0), 0, activeRun.nodes.length - 1);
      activeRun.nodesCleared = clamp(Math.floor(Number(activeRun.nodesCleared) || 0), 0, activeRun.nodes.length);
      activeRun.floor = Math.max(1, Math.floor(Number(activeRun.floor) || activeRun.nodeIndex + 1));
      activeRun.maxFloor = Math.max(activeRun.floor - 1, Math.floor(Number(activeRun.maxFloor) || activeRun.nodesCleared));
      activeRun.checkpointFloor = Math.max(0, Math.floor(Number(activeRun.checkpointFloor) || 0));
      activeRun.scoreBreakdown ??= { progress: 0, quality: 0, risk: 0, build: 0, total: 0 };
      for (const key of ["progress", "quality", "risk", "build", "total"]) activeRun.scoreBreakdown[key] = Math.max(0, Math.floor(Number(activeRun.scoreBreakdown[key]) || 0));
      activeRun.combatStats ??= { battles: 0, rounds: 0, damageDealt: 0, damageTaken: 0, healing: 0, shields: 0, skillCasts: 0, manaSpent: 0, lawTriggers: 0 };
      for (const key of ["battles", "rounds", "damageDealt", "damageTaken", "healing", "shields", "skillCasts", "manaSpent", "lawTriggers"]) activeRun.combatStats[key] = Math.max(0, Number(activeRun.combatStats[key]) || 0);
      activeRun.lawIds = [...new Set((activeRun.lawIds || []).filter((id) => daoTrialLawMap[id]))];
      activeRun.lawOffer = [...new Set((activeRun.lawOffer || []).filter((id) => daoTrialLawMap[id]))];
      activeRun.lawStacks = Object.fromEntries(Object.entries(activeRun.lawStacks || Object.fromEntries(activeRun.lawIds.map((id) => [id, 1])))
        .filter(([id]) => daoTrialLawMap[id])
        .map(([id, count]) => [id, clamp(Math.floor(Number(count) || 1), 1, 5)]));
      activeRun.offeredLawIds = [...new Set((activeRun.offeredLawIds || []).filter((id) => daoTrialLawMap[id]))];
      activeRun.offeredSealIds = [...new Set((activeRun.offeredSealIds || []).filter((id) => daoTrialSealMap[id]))];
      activeRun.lawNonce = Math.max(0, Math.floor(Number(activeRun.lawNonce) || 0));
      if (activeRun.masteryLawOptions === undefined) {
        activeRun.masteryLawOptions = Number(activeRun.masteryLevel) >= 6 ? 1 : 0;
        changed = true;
      } else activeRun.masteryLawOptions = clamp(Math.floor(Number(activeRun.masteryLawOptions) || 0), 0, 1);
      activeRun.checkpointPending = Boolean(activeRun.checkpointPending);
      activeRun.companionContribution ??= { damage: 0, healing: 0, shields: 0, control: 0, assists: 0 };
      activeRun.insight = Math.max(0, Math.floor(Number(activeRun.insight) || 0));
      activeRun.taskBoons = (activeRun.taskBoons || []).filter((boon) => boon?.id && Object.values(daoTrialTaskBoonDefinitions).some((definition) => definition.id === boon.id));
      if (!activeRun.baseCombatStats || typeof activeRun.baseCombatStats !== "object") {
        activeRun.baseCombatStats = trialBaseCombatStats(activeRun.combatant);
        if (activeRun.taskBoons.some((boon) => boon.id === "exercise")) {
          activeRun.baseCombatStats.maxHp = Math.max(1, Math.ceil(activeRun.baseCombatStats.maxHp / 1.12));
        }
        changed = true;
      } else {
        activeRun.baseCombatStats = trialBaseCombatStats(activeRun.baseCombatStats);
      }
      activeRun.freeRerolls = Math.max(0, Math.floor(Number(activeRun.freeRerolls) || 0));
      activeRun.lifeHealAvailable = Boolean(activeRun.lifeHealAvailable);
      activeRun.dailyRootFortuneXpMultiplier = Math.max(1, Number(activeRun.dailyRootFortuneXpMultiplier) || dailyRootFortuneXpMultiplier(state, state.player, activeRun.startedDay || state.day));
      if (activeRun.combatant && !Number(activeRun.combatant.skillManaBase)) {
        activeRun.combatant.skillManaBase = effectiveStats(state.player, state, { includeDailyRootFortune: false }).maxMana;
      }
      activeRun.worldSnapshot ??= {
        realm: state.player.realm,
        baselinePower: trialWorldBaselinePower(state),
        playerPower: powerOf(state.player, state, { includeDailyRootFortune: false })
      };
      activeRun.opponentIds = [...new Set((activeRun.opponentIds || []).filter((id) => (
        state.npcs.some((npc) => npc.id === id) || Object.values(activeRun.opponentSnapshots || {}).some((snapshot) => snapshot?.id === id)
      )))];
      activeRun.opponentSnapshots = activeRun.opponentSnapshots && typeof activeRun.opponentSnapshots === "object"
        ? Object.fromEntries(Object.entries(activeRun.opponentSnapshots).filter(([, snapshot]) => (
          snapshot?.kind === "monster" || state.npcs.some((npc) => npc.id === snapshot?.npcId)
        )))
        : {};
      activeRun.opponentResults = Array.isArray(activeRun.opponentResults) ? activeRun.opponentResults.slice(0, 80) : [];
      if (!activeRun.battleRewardTotals || typeof activeRun.battleRewardTotals !== "object") {
        activeRun.battleRewardTotals = (activeRun.nodes || [])
          .filter((node) => node.type === "battle" && Number(node.floor) <= Number(activeRun.maxFloor || activeRun.nodesCleared || 0))
          .reduce((totals, node) => {
            const reward = trialBattleRewardForNode(node, node.floor);
            totals.spirit = Math.min(daoTrialBattleRewardCap.spirit, totals.spirit + reward.spirit);
            totals.dust = Math.min(daoTrialBattleRewardCap.dust, totals.dust + reward.dust);
            return totals;
          }, { spirit: 0, dust: 0 });
      }
      activeRun.battleRewardTotals.spirit = clamp(Math.floor(Number(activeRun.battleRewardTotals.spirit) || 0), 0, daoTrialBattleRewardCap.spirit);
      activeRun.battleRewardTotals.dust = clamp(Math.floor(Number(activeRun.battleRewardTotals.dust) || 0), 0, daoTrialBattleRewardCap.dust);
      activeRun.defeatedByOpponentId = state.npcs.some((npc) => npc.id === activeRun.defeatedByOpponentId) ? activeRun.defeatedByOpponentId : "";
      if (activeRun.companion) activeRun.companion.supportUsed = Boolean(activeRun.companion.supportUsed);
      ensureTrialOpponents(state, activeRun);
    }
  }
  state.daoTrial.version = daoTrialStateVersion;
  return changed;
}

function trialCompanionSupport(state, npc, relationship = null) {
  const relation = relationship || relationshipEntry(state, npc.id);
  const score = Math.max(0, relation.affinity) + Math.max(0, relation.respect);
  const playerPower = Math.max(1, powerOf(state.player, state, { includeDailyRootFortune: false }));
  const npcPower = Math.max(1, powerOf(npc, state, { includeDailyRootFortune: false }));
  const powerFactor = clamp(Math.sqrt(npcPower / playerPower), 0.75, 1.35);
  const relationFactor = clamp(0.85 + score / 800, 0.7, 1.15);
  const potency = clamp(0.034 * powerFactor * relationFactor, 0.02, 0.1);
  const supportType = relation.respect > Math.max(20, relation.affinity) ? "assault" : "sustain";
  const skillVariant = stableHash(`companion-skill|${npc.id}`) % 3;
  const skills = supportType === "assault"
    ? [
      { id: "break-array", name: "破阵一击", text: "本轮后续战斗攻击、神识临时提高。" },
      { id: "read-opening", name: "窥隙指点", text: "获得 2 点悟机，并让下一战神识提高。" },
      { id: "shared-strike", name: "同道合击", text: "恢复少量法力，并提高后续攻击。" }
    ]
    : [
      { id: "restore-veins", name: "回元护脉", text: "立即恢复血量与法力。" },
      { id: "guard-heart", name: "守心同行", text: "立即恢复血量，并提高后续防御。" },
      { id: "quiet-counsel", name: "静言点拨", text: "获得悟机并恢复较多法力。" }
    ];
  const active = skills[skillVariant];
  return {
    type: supportType,
    potency,
    power: npcPower,
    powerFactor,
    relationFactor,
    text: supportType === "assault"
      ? `战力 ${npcPower} · 攻击、神识提高 ${Math.round(potency * 100)}%`
      : `战力 ${npcPower} · 血量、防御提高 ${Math.round(potency * 100)}%`,
    active
  };
}

function availableDaoTrialCompanions(state) {
  const toPublicEntry = ({ npc, relation, neutral = false }) => ({
    person: compactCultivatorRef(publicCultivator(npc, state, { kind: "npc", compact: true })),
    relationship: relationshipTitle(relation),
    affinity: relation.affinity,
    respect: relation.respect,
    neutral: Boolean(neutral),
    support: trialCompanionSupport(state, npc, relation)
  });
  const bySupportPotency = (a, b) => b.support.potency - a.support.potency
    || b.support.power - a.support.power
    || (b.affinity + b.respect) - (a.affinity + a.respect)
    || a.person.name.localeCompare(b.person.name, "zh-Hans-CN");
  const related = Object.keys(state.relationships || {})
    .map((npcId) => ({ npc: state.npcs.find((item) => item.id === npcId), relation: state.relationships[npcId] }))
    .filter((item) => item.npc && (item.relation.interactions > 0 || item.relation.invitedUntilCycle >= state.daoTrial.cycle))
    .sort((a, b) => (b.relation.affinity + b.relation.respect) - (a.relation.affinity + a.relation.respect))
    .slice(0, 6)
    .map(toPublicEntry)
    .sort(bySupportPotency);
  const selectedIds = new Set(related.map((item) => item.person.id));
  const neutral = [...(state.npcs || [])]
    .filter((npc) => !selectedIds.has(npc.id))
    .sort((a, b) => Math.abs(a.realm - state.player.realm) - Math.abs(b.realm - state.player.realm) || a.name.localeCompare(b.name, "zh-Hans-CN"))
    .slice(0, 3)
    .map((npc) => toPublicEntry({ npc, relation: state.relationships?.[npc.id] || { npcId: npc.id, affinity: 0, respect: 0, interactions: 0, lastDay: 0 }, neutral: true }))
    .sort(bySupportPotency);
  return [...related, ...neutral].sort(bySupportPotency);
}

function createTrialCombatant(state) {
  const stats = effectiveStats(state.player, state);
  const skillManaBase = effectiveStats(state.player, state, { includeDailyRootFortune: false }).maxMana;
  const rootsSnapshot = normalizeRootSet(state.player);
  const rootsWithoutBonuses = rootsSnapshot.roots.map((root) => ({ ...root, bonus: 0 }));
  return {
    id: `trial-${state.player.id}`,
    name: state.player.name,
    gender: state.player.gender,
    realm: state.player.realm,
    root: { ...rootsWithoutBonuses[0] },
    roots: rootsWithoutBonuses,
    primaryRootKey: rootsSnapshot.primaryRootKey,
    maxHp: stats.maxHp,
    hp: stats.maxHp,
    attack: stats.attack,
    defense: stats.defense,
    divineSense: stats.divineSense,
    maxMana: stats.maxMana,
    mana: stats.maxMana,
    skillManaBase,
    skillId: state.player.skillId,
    skillRanks: { ...(state.player.skillRanks || {}) },
    trialBuffs: {}
  };
}

function trialBaseCombatStats(combatant = {}) {
  return {
    maxHp: Math.max(1, Math.floor(Number(combatant.maxHp) || 1)),
    maxMana: Math.max(1, Math.floor(Number(combatant.maxMana) || 1)),
    attack: Math.max(1, Math.floor(Number(combatant.attack) || 1)),
    defense: Math.max(0, Math.floor(Number(combatant.defense) || 0)),
    divineSense: Math.max(1, Math.floor(Number(combatant.divineSense) || 1))
  };
}

function trialSkillEffectComparisons(baseSkill = {}, currentSkill = {}) {
  const percentEffects = [
    { key: "power", label: "伤害倍率" },
    { key: "percent", label: baseSkill.type === "heal" ? "治疗比例" : "持续效果" },
    { key: "reduce", label: "减伤比例" },
    { key: "pierce", label: "破防比例" },
    { key: "chance", label: "触发概率" },
    { key: "threshold", label: "触发阈值" },
    { key: "bonus", label: "额外增幅" },
    { key: "leech", label: "吸血比例" },
    { key: "reflect", label: "反伤比例" },
    { key: "extraDodge", label: "额外闪避" }
  ];
  const numericEffects = [
    { key: "amount", label: baseSkill.type === "defenseBuff" ? "防御增量" : baseSkill.type === "weaken" ? "攻击削弱" : baseSkill.type === "field" ? "破防数值" : "效果数值" },
    { key: "burn", label: "法力削减" }
  ];
  const effects = [
    ...percentEffects.map((entry) => ({ ...entry, display: "percent" })),
    ...numericEffects.map((entry) => ({ ...entry, display: "number" }))
  ];
  return effects
    .filter(({ key }) => Number.isFinite(Number(baseSkill[key])) || Number.isFinite(Number(currentSkill[key])))
    .map(({ key, label, display }) => ({
      key,
      label,
      base: Number(baseSkill[key]) || 0,
      current: Number(currentSkill[key]) || 0,
      display
    }));
}

function rememberDaoTrialOffer(state, run, ids, kind) {
  const recentKey = kind === "law" ? "recentLawOfferIds" : "recentSealOfferIds";
  const discoveredKey = kind === "law" ? "discoveredLawIds" : "discoveredSealIds";
  const runKey = kind === "law" ? "offeredLawIds" : "offeredSealIds";
  const limit = kind === "law" ? 18 : 36;
  state.daoTrial[recentKey] = [...(state.daoTrial[recentKey] || []), ...ids].slice(-limit);
  state.daoTrial[discoveredKey] = [...new Set([...(state.daoTrial[discoveredKey] || []), ...ids])];
  run[runKey] = [...new Set([...(run[runKey] || []), ...ids])];
}

export function sampleDaoTrialEqualOffer(kind, seedPrefix, count = 3) {
  const items = kind === "law" ? daoTrialLaws : kind === "seal" ? daoTrialSeals : [];
  if (!items.length) throw new Error("未知的问道候选类型");
  const pool = [...items].sort((a, b) => a.id.localeCompare(b.id));
  const random = seededBattleRandom(`dao-trial-offer|${kind}|${seedPrefix}`);
  const size = Math.min(pool.length, Math.max(1, Math.floor(Number(count) || 3)));
  for (let slot = 0; slot < size; slot += 1) {
    const pickedIndex = slot + Math.floor(random() * (pool.length - slot));
    [pool[slot], pool[pickedIndex]] = [pool[pickedIndex], pool[slot]];
  }
  return pool.slice(0, size).map((item) => item.id);
}

function sealOfferForRun(state, run, route, nonce = 0) {
  const offer = sampleDaoTrialEqualOffer("seal", `${run.seed}|seal|${run.nodeIndex}|${nonce}`);
  rememberDaoTrialOffer(state, run, offer, "seal");
  return offer;
}

function lawRarityRatesForFloor(floor) {
  // Every concrete law has weight 1. Aggregate rarity odds therefore follow
  // the actual 160/64/32 pool instead of assigning equal odds to rarity labels.
  const counts = Object.groupBy(daoTrialLaws, (law) => law.rarity);
  const total = Math.max(1, daoTrialLaws.length);
  return {
    silver: Math.round((counts.silver?.length || 0) / total * 10_000) / 100,
    gold: Math.round((counts.gold?.length || 0) / total * 10_000) / 100,
    diamond: Math.round((counts.diamond?.length || 0) / total * 10_000) / 100
  };
}

function rolledLawRarity(run, nonce, slot, rates, diamondSelected) {
  const roll = stableHash(`${run.seed}|law-rarity|${run.floor}|${nonce}|${slot}`) % 10_000 / 100;
  if (!diamondSelected && roll < rates.diamond) return "diamond";
  if (roll < rates.diamond + rates.gold) return "gold";
  return "silver";
}

function lawOfferForRun(state, run, route, nonce = 0) {
  const rates = lawRarityRatesForFloor(Math.max(1, Number(run.floor) || 1));
  const bonusOptions = runLawMechanics(run, "freeReroll").reduce((max, entry) => Math.max(max, Math.floor(Number(entry.params.bonusOptions) || 0)), 0);
  const masteryOptions = Number(run.floor) === 1 ? Math.max(0, Math.floor(Number(run.masteryLawOptions) || 0)) : 0;
  const offer = sampleDaoTrialEqualOffer("law", `${run.seed}|law|${run.floor}|${nonce}`, 3 + bonusOptions + masteryOptions);
  run.lastLawRarityRates = { silver: rates.silver, gold: rates.gold, diamond: rates.diamond };
  rememberDaoTrialOffer(state, run, offer, "law");
  return offer;
}

function trialStackMultiplier(level) {
  const extras = [0, 0.6, 0.4, 0.25, 0.15];
  const count = Math.max(1, Math.min(5, Math.floor(Number(level) || 1)));
  return 1 + extras.slice(1, count).reduce((sum, value) => sum + value, 0);
}

export function combinedTrialBuffs(run) {
  const buffs = {};
  const lawSources = {};
  const lawMechanics = [];
  const sealStacks = { ...Object.fromEntries((run.sealIds || []).map((id) => [id, 1])), ...(run.sealStacks || {}) };
  for (const sealId of Object.keys(sealStacks)) {
    const effects = daoTrialSealMap[sealId]?.effects || {};
    const multiplier = trialStackMultiplier(sealStacks[sealId]);
    for (const [key, value] of Object.entries(effects)) buffs[key] = (buffs[key] || 0) + Number(value || 0) * multiplier;
  }
  for (const synergy of activeTrialSynergies(run)) {
    for (const [key, value] of Object.entries(synergy.effects || {})) buffs[key] = (buffs[key] || 0) + Number(value || 0);
  }
  const affixEffects = daoTrialCycleAffixes.find((item) => item.id === run.affixId)?.effects || {};
  for (const key of ["attack", "defense", "maxHp", "maxMana", "divineSense", "manaCost", "healing"]) {
    if (Number(affixEffects[key])) buffs[key] = (buffs[key] || 0) + Number(affixEffects[key]);
  }
  const support = run.companion?.support;
  const companionMultiplier = Math.max(0.5, 1 + (Number(buffs.companion) || 0) - Number(affixEffects.companionPenalty || 0));
  if (support?.type === "assault") {
    buffs.attack = (buffs.attack || 0) + support.potency * companionMultiplier;
    buffs.divineSense = (buffs.divineSense || 0) + support.potency * companionMultiplier;
  } else if (support?.type === "sustain") {
    buffs.maxHp = (buffs.maxHp || 0) + support.potency * companionMultiplier;
    buffs.defense = (buffs.defense || 0) + support.potency * companionMultiplier;
  } else if (!run.companion) {
    buffs.maxHp = (buffs.maxHp || 0) + (Number(buffs.maxHpWithoutCompanion) || 0);
    buffs.maxHp = (buffs.maxHp || 0) + Number(affixEffects.soloHp || 0);
  }
  if (run.companion) buffs.maxMana = (buffs.maxMana || 0) + (Number(buffs.companionMana) || 0);
  buffs.divineSense = (buffs.divineSense || 0) + (Number(run.tempSense) || 0);
  buffs.attack = (buffs.attack || 0) + (Number(run.tempAttack) || 0);
  buffs.defense = (buffs.defense || 0) + (Number(run.tempDefense) || 0);
  const lawStacks = { ...Object.fromEntries((run.lawIds || []).map((id) => [id, 1])), ...(run.lawStacks || {}) };
  for (const lawId of Object.keys(lawStacks)) {
    const law = daoTrialLawMap[lawId];
    const effects = law?.effects || {};
    const stack = Math.max(1, Math.min(5, Math.floor(Number(lawStacks[lawId]) || 1)));
    for (const [key, value] of Object.entries(effects)) {
      if (!lawSources[key] || Math.abs(Number(value) || 0) > Math.abs(Number(lawSources[key].value) || 0)) {
        lawSources[key] = { id: lawId, name: law?.name || lawId, value };
      }
      const multiplier = trialStackMultiplier(stack);
      if (typeof value === "boolean") {
        if (value) buffs[key] = true;
      } else if (["freeSkillEvery", "attackEchoEvery"].includes(key) && Number(value) > 0) {
        const interval = Math.max(2, Math.floor(Number(value)) - Math.floor((stack - 1) / 2));
        buffs[key] = Math.min(Number(buffs[key]) || Number.POSITIVE_INFINITY, interval);
      } else if (key === "cooldown" && Number(value) < 0) {
        const reduction = Math.max(-2, Math.floor(Number(value)) - Math.floor((stack - 1) / 2));
        buffs[key] = Math.min(Number(buffs[key]) || 0, reduction);
      } else {
        buffs[key] = (buffs[key] || 0) + Number(value || 0) * multiplier;
      }
    }
    for (const mechanic of resolveLawMechanics(law, stack)) {
      const source = { id: lawId, name: law?.name || lawId, value: 0 };
      lawMechanics.push({ ...mechanic, lawId, lawName: source.name, rarity: law?.rarity, branch: law?.branch });
      for (const [key, value] of Object.entries(mechanic.buffs || {})) {
        if (typeof value === "boolean") {
          if (value) buffs[key] = true;
        } else {
          buffs[key] = (Number(buffs[key]) || 0) + Number(value || 0);
        }
        if (!lawSources[key] || Math.abs(Number(value) || 0) > Math.abs(Number(lawSources[key].value) || 0)) lawSources[key] = { ...source, value };
      }
      if (mechanic.action === "fortune" && Number(run.fortune) > 0) {
        const fortuneBonus = Math.min(Number(mechanic.params.cap) || 0, Number(run.fortune) || 0) * Math.max(0, Number(mechanic.params.powerPerStack) || 0);
        buffs.attack = (Number(buffs.attack) || 0) + fortuneBonus;
        buffs.defense = (Number(buffs.defense) || 0) + fortuneBonus;
      }
    }
  }
  if (Object.keys(lawSources).length) buffs.__lawSources = lawSources;
  if (lawMechanics.length) buffs.__lawMechanics = lawMechanics;
  const manaRate = run.combatant?.maxMana ? run.combatant.mana / run.combatant.maxMana : 1;
  if (manaRate >= 0.7) buffs.divineSense = (buffs.divineSense || 0) + (Number(buffs.highManaSense) || 0);
  if (manaRate <= 0.3) buffs.manaCost = (buffs.manaCost || 0) + (Number(buffs.lowManaCost) || 0);
  return buffs;
}

function runLawMechanics(run, action = "") {
  const stacks = { ...Object.fromEntries((run?.lawIds || []).map((id) => [id, 1])), ...(run?.lawStacks || {}) };
  return Object.entries(stacks).flatMap(([lawId, stack]) => {
    const law = daoTrialLawMap[lawId];
    return resolveLawMechanics(law, stack).map((entry) => ({ ...entry, lawId, lawName: law?.name || lawId, rarity: law?.rarity, branch: law?.branch }));
  }).filter((entry) => !action || entry.action === action);
}

function activeTrialSynergies(run) {
  const exact = daoTrialSealSynergies.filter((synergy) => synergy.seals.every((id) => run?.sealIds?.includes(id)));
  const stackMap = { ...Object.fromEntries((run?.sealIds || []).map((id) => [id, 1])), ...(run?.sealStacks || {}) };
  const counts = (run?.sealIds || []).reduce((result, id) => {
    const school = daoTrialSealMap[id]?.school;
    if (school) result[school] = (result[school] || 0) + Math.max(1, Math.min(5, Math.floor(Number(stackMap[id]) || 1)));
    return result;
  }, {});
  const school = daoTrialSealSchoolResonances.filter((resonance) => (counts[resonance.school] || 0) >= resonance.threshold);
  return [...exact, ...school];
}

function trialSealResonanceProgress(run) {
  const schools = [...new Set(daoTrialSeals.map((seal) => seal.school))];
  const stackMap = { ...Object.fromEntries((run?.sealIds || []).map((id) => [id, 1])), ...(run?.sealStacks || {}) };
  return schools.map((school) => {
    const count = (run?.sealIds || []).filter((id) => daoTrialSealMap[id]?.school === school)
      .reduce((sum, id) => sum + Math.max(1, Math.min(5, Math.floor(Number(stackMap[id]) || 1))), 0);
    const activeThreshold = [2, 4, 6].filter((threshold) => count >= threshold).at(-1) || 0;
    const nextThreshold = [2, 4, 6].find((threshold) => count < threshold) || 6;
    return { school, count, activeThreshold, nextThreshold, complete: count >= 6 };
  }).filter((entry) => entry.count > 0);
}

function publicTrialLaw(law, stack = 1) {
  const rarity = daoTrialLawRarities[law?.rarity] || daoTrialLawRarities.silver;
  if (!law) return null;
  const safeStack = Math.max(1, Math.min(5, Math.floor(Number(stack) || 1)));
  const stackPlan = Array.isArray(law.stackPlan) ? law.stackPlan.map((entry) => ({ ...entry })) : [];
  return {
    ...law,
    mechanics: (law.mechanics || []).map((entry) => ({ type: entry.type, action: entry.action, event: entry.event, summary: entry.summary })),
    stackPlan,
    stack: safeStack,
    currentStackText: stackPlan.find((entry) => entry.stack === safeStack)?.text || "",
    nextStack: stackPlan.find((entry) => entry.stack === safeStack + 1) || null,
    rarityLabel: rarity.label,
    rarityColor: rarity.color
  };
}

function trialWorldBaselinePower(state) {
  const nearby = (state.npcs || [])
    .filter((npc) => Math.abs((npc.realm || 0) - state.player.realm) <= 1)
    .map((npc) => powerOf(npc, state, { includeDailyRootFortune: false }))
    .sort((a, b) => a - b);
  return nearby.length ? nearby[Math.floor(nearby.length / 2)] : powerOf(state.player, state, { includeDailyRootFortune: false });
}

function trialEnemyPowerFactor(node, floor, seed = "") {
  const safeFloor = Math.max(1, Math.floor(Number(floor) || 1));
  const base = safeFloor <= 2
    ? 0.5
    : safeFloor <= 5
      ? 0.65
      : safeFloor <= 8
        ? 0.8
        : safeFloor <= 12
          ? 0.98
          : safeFloor <= 15
            ? 1.15
            : 1.3 + Math.min(0.2, (safeFloor - 16) * 0.025);
  const jitter = (stableUnit(`${seed}|floor-target`) - 0.5) * (safeFloor <= 5 ? 0.06 : 0.08);
  const nodeMultiplier = node?.boss
    ? safeFloor <= 5 ? 1.25 : safeFloor <= 10 ? 1.3 : 1.35
    : node?.elite
      ? safeFloor <= 5 ? 1.12 : safeFloor <= 10 ? 1.15 : 1.18
      : 1;
  return Math.max(0.48, (base + jitter) * nodeMultiplier);
}

function trialEncounterKindProbabilities(node, floor, apex = false) {
  const safeFloor = Math.max(1, Math.floor(Number(floor) || 1));
  let npc = safeFloor <= 2 ? 0.18 : safeFloor <= 5 ? 0.3 : safeFloor <= 10 ? 0.55 : safeFloor <= 15 ? 0.65 : 0.6;
  if (node?.boss) npc = 0.75;
  else if (node?.elite) npc = 0.65;
  if (apex) npc = Math.min(0.7, npc + 0.1);
  return { npc, monster: 1 - npc };
}

function trialNpcUsageTier(state, npcId) {
  const record = state.daoTrial?.npcTrialUsage?.[npcId];
  if (!record?.lastDay) return "preferred";
  const age = Math.max(0, Number(state.day) - Number(record.lastDay));
  const recentDays = (record.recentDays || []).filter((day) => day >= state.day - daoTrialNpcRecentDays + 1);
  if (recentDays.length >= 2 || (age === 0 && Number(record.lastDayCount) >= 2)) return "fallback";
  if (age < daoTrialNpcPoolReturnDays * 2 || recentDays.length) return "secondary";
  return "preferred";
}

function trialOpponentSnapshot(state, npc) {
  const stats = effectiveCombatStats(npc, state, { includeDailyRootFortune: false });
  const rootSet = normalizeRootSet(npc);
  return {
    npcId: npc.id,
    name: npc.name,
    gender: npc.gender,
    sect: npc.sect,
    realm: npc.realm,
    portraitUrl: compactPortraitUrl(npc.portraitUrl, npc.id, npc.portraitVariant),
    root: { ...rootSet.primaryRoot },
    roots: rootSet.roots.map((root) => ({ ...root })),
    primaryRootKey: rootSet.primaryRootKey,
    skillId: npc.skillId,
    skillRanks: { ...(npc.skillRanks || {}) },
    stats: { ...stats },
    basePower: powerOfStats(stats),
    kind: "npc"
  };
}

function trialOpponentSelectionScore(state, run, node, npc) {
  const floor = Math.max(1, Number(node.floor) || run.nodeIndex + 1);
  const playerRealm = Number(run.worldSnapshot?.realm) || Number(state.player.realm) || 0;
  const playerPower = Math.max(1, Number(run.worldSnapshot?.playerPower) || powerOf(state.player, state, { includeDailyRootFortune: false }));
  const npcPower = Math.max(1, powerOf(npc, state, { includeDailyRootFortune: false }));
  const realmSpan = floor <= 5 ? 12 : floor <= 10 ? 22 : 40;
  const powerSpan = Math.log(floor <= 5 ? 2 : floor <= 10 ? 3 : 5);
  const realmCloseness = 1 - clamp(Math.abs((Number(npc.realm) || 0) - playerRealm) / realmSpan, 0, 1);
  const desiredRatio = (run.isApex ?? trialPlayerIsApex(state, run))
    ? (floor <= 5 ? 1.05 : floor <= 10 ? 1.15 : 1.3)
    : (floor <= 5 ? 0.64 : floor <= 10 ? 0.88 : floor <= 15 ? 1.04 : 1.18);
  const powerCloseness = 1 - clamp(Math.abs(Math.log(npcPower / (playerPower * desiredRatio))) / powerSpan, 0, 1);
  const closeness = (realmCloseness + powerCloseness) / 2;
  const closenessWeight = floor <= 5 ? 0.35 : floor <= 10 ? 0.3 : 0.2;
  const randomWeight = 1 - closenessWeight;
  const random = stableUnit(`${run.seed}|opponent|${floor}|${node.id}|${npc.id}`);
  return random * randomWeight + closeness * closenessWeight;
}

function trialPlayerIsApex(state, run) {
  const playerPower = Math.max(1, Number(run.worldSnapshot?.playerPower) || powerOf(state.player, state, { includeDailyRootFortune: false }));
  const strongestNpc = Math.max(0, ...(state.npcs || []).map((npc) => powerOf(npc, state, { includeDailyRootFortune: false })));
  return playerPower >= strongestNpc;
}

function selectTrialOpponent(state, run, node, usedIds) {
  const companionId = run.companion?.person?.id || "";
  const candidates = [...(state.npcs || [])]
    .filter((npc) => npc?.id && npc.id !== companionId && !usedIds.has(npc.id))
    .map((npc) => ({ npc, tier: trialNpcUsageTier(state, npc.id) }));
  if (!candidates.length) return null;
  const apex = run.isApex ?? trialPlayerIsApex(state, run);
  const preferred = apex
    ? candidates.filter((entry) => entry.tier === "preferred").sort((a, b) => powerOf(b.npc, state) - powerOf(a.npc, state) || a.npc.id.localeCompare(b.npc.id)).slice(0, daoTrialNpcApexPoolSize)
    : candidates.filter((entry) => entry.tier === "preferred");
  const secondary = candidates.filter((entry) => entry.tier === "secondary");
  const fallback = candidates.filter((entry) => entry.tier === "fallback");
  const roll = stableUnit(`${run.seed}|npc-pool|${node.floor}|${node.id}`);
  let pool = preferred.length && (roll < daoTrialNpcPreferredRate || !secondary.length) ? preferred : secondary;
  if (!pool.length) pool = preferred.length ? preferred : fallback;
  if (!pool.length) pool = candidates;
  return pool
    .sort((a, b) => trialOpponentSelectionScore(state, run, node, b.npc) - trialOpponentSelectionScore(state, run, node, a.npc)
      || a.npc.id.localeCompare(b.npc.id))[0]?.npc || null;
}

function trialMonsterRootOrder(seed) {
  const order = roots.map((root) => root.key);
  const random = seededBattleRandom(`${seed}|monster-root-order`);
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
  }
  return order;
}

function trialMonsterRootKey(run, monsterOrdinal) {
  const order = trialMonsterRootOrder(run.seed);
  return order[(Math.max(1, Math.floor(Number(monsterOrdinal) || 1)) - 1) % order.length] || roots[0].key;
}

const trialOpponentBattleEvents = new Set([
  "battleStart", "roundStart", "onDamageTaken", "afterDamage", "beforeSkill", "afterSkill",
  "afterAttack", "afterStatus", "onLethal", "afterHeal", "afterCompanion"
]);
const trialOpponentBattleEffects = new Set([
  "attack", "defense", "maxHp", "maxMana", "divineSense", "skillPower", "statusPower", "healing",
  "manaCost", "cooldown", "rootResist", "lethalGuard", "reflectCharge", "attackEchoEvery", "attackEchoPower",
  "openingSkillPower", "dotStack", "freeSkillEvery", "healCountBoost", "overhealShield", "noHitShield",
  "skillEchoChance", "skillEchoPower", "nextBattleAttack", "lowHpAttack", "lowHpSense", "highManaSense",
  "lowManaCost", "maxHpWithoutCompanion"
]);

function trialOpponentBattleLawPool() {
  return daoTrialLaws
    .filter((law) => Object.keys(law.effects || {}).some((key) => trialOpponentBattleEffects.has(key))
      || (law.mechanics || []).some((mechanic) => {
        const events = Array.isArray(mechanic.event) ? mechanic.event : [mechanic.event];
        return events.some((event) => trialOpponentBattleEvents.has(event));
      }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function trialOpponentLawSnapshot(run, node, kind, identity) {
  const random = seededBattleRandom(`${run.seed}|opponent-law|${node?.floor || 1}|${node?.id || "node"}|${kind}|${identity || "opponent"}`);
  const pool = trialOpponentBattleLawPool();
  const law = pool[Math.floor(random() * pool.length) % pool.length] || pool[0] || daoTrialLaws[0];
  return { lawId: law.id, lawStack: 1 };
}

function ensureTrialMonsterSnapshotFields(snapshot, run, floor) {
  if (!snapshot || snapshot.kind !== "monster") return snapshot;
  const rank = monsterSkillRankForRealm(snapshot.realm);
  if (!snapshot.skillId || !combatSkills.some((skill) => skill.id === snapshot.skillId)) {
    const random = seededBattleRandom(`${run.seed}|monster|${floor}|legacy-skill`);
    snapshot.skillId = randomSkillId(random);
  }
  snapshot.skillRanks = snapshot.skillRanks && typeof snapshot.skillRanks === "object" && !Array.isArray(snapshot.skillRanks)
    ? snapshot.skillRanks
    : {};
  if (!Number.isFinite(Number(snapshot.skillRanks[snapshot.skillId]))) snapshot.skillRanks[snapshot.skillId] = rank;
  return snapshot;
}

function ensureTrialOpponentLawFields(snapshot, run, node, floor) {
  if (!snapshot || !["monster", "npc"].includes(snapshot.kind)) return snapshot;
  if (!daoTrialLawMap[snapshot.lawId]) {
    const law = trialOpponentLawSnapshot(run, node, snapshot.kind, snapshot.id || snapshot.npcId || floor);
    snapshot.lawId = law.lawId;
    snapshot.lawStack = law.lawStack;
  }
  snapshot.lawStack = Math.max(1, Math.min(5, Math.floor(Number(snapshot.lawStack) || 1)));
  return snapshot;
}

function trialOpponentLawBuffs(snapshot, entity) {
  const law = daoTrialLawMap[snapshot?.lawId];
  if (!law) return {};
  return combinedTrialBuffs({
    lawIds: [law.id],
    lawStacks: { [law.id]: Math.max(1, Math.min(5, Math.floor(Number(snapshot.lawStack) || 1))) },
    sealIds: [],
    combatant: entity,
    affixId: ""
  });
}

function ensureTrialOpponents(state, run) {
  if (!run) return run;
  run.opponentSnapshots = run.opponentSnapshots && typeof run.opponentSnapshots === "object" ? run.opponentSnapshots : {};
  const companionId = run.companion?.person?.id || "";
  const usedIds = new Set();
  const priorKinds = [];
  for (const node of (run.nodes || []).filter((entry) => entry.type === "battle").sort((a, b) => Number(a.floor) - Number(b.floor))) {
    const floor = Math.max(1, Math.floor(Number(node.floor) || 1));
    const key = String(floor);
    let snapshot = run.opponentSnapshots[key];
    if (snapshot?.kind === "npc" && (!snapshot.npcId || snapshot.npcId === companionId || usedIds.has(snapshot.npcId) || !state.npcs.some((npc) => npc.id === snapshot.npcId))) snapshot = null;
    if (snapshot?.kind === "monster" && !snapshot.id) snapshot = null;
    snapshot = ensureTrialMonsterSnapshotFields(snapshot, run, floor);
    snapshot = ensureTrialOpponentLawFields(snapshot, run, node, floor);
    const recentKinds = priorKinds.slice(-2);
    const mustUseNpc = floor % 5 === 0 && !priorKinds.slice(-2).includes("npc");
    const forcedKind = recentKinds.length === 2 && recentKinds[0] === recentKinds[1] ? (recentKinds[0] === "npc" ? "monster" : "npc") : null;
    if (!snapshot) {
      const probabilities = trialEncounterKindProbabilities(node, floor, run.isApex ?? trialPlayerIsApex(state, run));
      const roll = stableUnit(`${run.seed}|encounter-kind|${floor}|${node.id}`);
      const kind = mustUseNpc || forcedKind === "npc"
        ? "npc"
        : forcedKind === "monster"
          ? "monster"
          : roll < probabilities.npc ? "npc" : "monster";
      const npc = kind === "npc" ? selectTrialOpponent(state, run, node, usedIds) : null;
      if (npc) {
        snapshot = trialOpponentSnapshot(state, npc);
        Object.assign(snapshot, trialOpponentLawSnapshot(run, node, "npc", npc.id));
        if (!run.practice) {
          const usage = state.daoTrial.npcTrialUsage ??= {};
          const record = usage[npc.id] || { lastDay: 0, recentDays: [], count: 0, lastDayCount: 0, tier: "preferred" };
          record.lastDayCount = record.lastDay === state.day ? Number(record.lastDayCount || 0) + 1 : 1;
          record.lastDay = state.day;
          record.recentDays = [...new Set([...(record.recentDays || []), state.day])].slice(-8);
          record.count = Number(record.count || 0) + 1;
          record.tier = record.lastDayCount >= 2 ? "fallback" : "secondary";
          usage[npc.id] = record;
        }
      }
      else {
        const monsterSeed = `${run.seed}|monster|${floor}|${node.id}`;
        const route = daoTrialRouteMap[run.routeId];
        const random = seededBattleRandom(monsterSeed);
        const intensity = 0.82 + Math.min(0.75, floor * 0.045) + (node.elite ? 0.12 : 0) + (node.boss ? 0.2 : 0);
        const monsterOrdinal = priorKinds.filter((kind) => kind === "monster").length + 1;
        const monster = makeMonster(
          `${route?.name || "秘境"}·${node.monster || node.name}`,
          state.player.realm,
          trialMonsterRootKey(run, monsterOrdinal),
          intensity,
          "",
          random,
          { unrestrictedSkills: true, skillRank: monsterSkillRankForRealm(state.player.realm) }
        );
        const rolledStats = effectiveCombatStats(monster, state, { includeDailyRootFortune: false });
        const playerPower = Math.max(1, Number(run.worldSnapshot?.playerPower) || powerOf(state.player, state, { includeDailyRootFortune: false }));
        const monsterTarget = playerPower * trialEnemyPowerFactor(node, floor, run.seed) * clamp(Number(route?.opponentScale) || 1, 0.95, 1.05);
        const monsterRatio = clamp(monsterTarget / Math.max(1, powerOfStats(rolledStats)), 0.62, 1.18);
        const stats = Object.fromEntries(["attack", "defense", "maxHp", "maxMana", "divineSense"].map((key) => [
          key,
          Math.max(key === "defense" ? 0 : 1, Math.floor((Number(rolledStats[key]) || 0) * monsterRatio))
        ]));
        snapshot = {
          kind: "monster",
          id: monster.id,
          name: monster.name,
          realm: monster.realm,
          root: { ...monster.root },
          roots: (monster.roots || []).map((root) => ({ ...root })),
          primaryRootKey: monster.primaryRootKey,
          skillId: monster.skillId,
          skillRanks: { ...(monster.skillRanks || {}) },
          ...trialOpponentLawSnapshot(run, node, "monster", monster.id),
          archetype: monster.archetype,
          archetypeLabel: monster.archetypeLabel,
          archetypeText: monster.archetypeText,
          stats: { ...stats },
          basePower: powerOfStats(stats)
        };
      }
      run.opponentSnapshots[key] = snapshot;
    }
    if (snapshot.kind === "npc") usedIds.add(snapshot.npcId);
    priorKinds.push(snapshot.kind);
  }
  run.opponentIds = Object.values(run.opponentSnapshots).map((snapshot) => snapshot.kind === "npc" ? snapshot.npcId : snapshot.id).filter(Boolean);
  run.opponentPoolExhaustedAt = 0;
  return run;
}

function trialOpponentFor(state, run, node) {
  ensureTrialOpponents(state, run);
  const floor = Math.max(1, Number(node.floor) || run.nodeIndex + 1);
  const snapshot = run.opponentSnapshots?.[String(floor)];
  if (!snapshot) return null;
  const baseStats = snapshot.stats || {};
  const basePower = Math.max(1, Number(snapshot.basePower) || powerOfStats(baseStats));
  const playerPower = Math.max(1, Number(run.worldSnapshot?.playerPower) || powerOf(state.player, state, { includeDailyRootFortune: false }));
  const affix = daoTrialCycleAffixes.find((item) => item.id === run.affixId);
  const firstEase = run.nodeIndex === 0 ? Number(affix?.effects?.firstBattleEase || 0) : 0;
  const scaling = Math.max(0, Number(affix?.effects?.scalingEnemy || 0)) * Math.max(0, Math.ceil(floor / 5) - 1);
  const enemyPower = Number(affix?.effects?.enemyPower || 0);
  const routeScale = clamp(Number(daoTrialRouteMap[run.routeId]?.opponentScale) || 1, 0.8, 1.2);
  const targetPower = Math.max(48, playerPower * trialEnemyPowerFactor(node, floor, run.seed) * routeScale * (1 + enemyPower + scaling) * (1 - firstEase));
  // 秘境只允许在原始实力之上强化对手，不再对妖物或 NPC 做负向缩放。
  const projectedPower = Math.max(basePower, targetPower);
  const ratio = clamp(projectedPower / basePower, 1, 20);
  const projectedStats = Object.fromEntries(["attack", "defense", "maxHp", "maxMana", "divineSense"].map((key) => [
    key,
    Math.max(key === "defense" ? 0 : 1, Math.floor((Number(baseStats[key]) || 0) * ratio))
  ]));
  const opponent = {
    kind: snapshot.kind || "npc",
    id: snapshot.kind === "monster" ? snapshot.id : snapshot.npcId,
    name: snapshot.name,
    gender: snapshot.gender,
    sect: snapshot.sect,
    realm: snapshot.realm,
    portraitUrl: snapshot.portraitUrl,
    root: { ...snapshot.root },
    roots: (snapshot.roots || []).map((root) => ({ ...root })),
    primaryRootKey: snapshot.primaryRootKey,
    skillId: snapshot.skillId,
    skillRanks: { ...(snapshot.skillRanks || {}) },
    lawId: snapshot.lawId || "",
    lawStack: Number(snapshot.lawStack) || 0,
    archetype: snapshot.archetype,
    archetypeLabel: snapshot.archetypeLabel,
    archetypeText: snapshot.archetypeText,
    trialStatsAreEffective: true,
    ...projectedStats,
    hp: projectedStats.maxHp,
    mana: projectedStats.maxMana,
    skillManaBase: projectedStats.maxMana,
    basePower,
    projectionRatio: ratio,
    targetPower: Math.round(projectedPower),
    enhancePercent: Math.max(0, Math.round((ratio - 1) * 100)),
    trialFloor: floor
  };
  opponent.trialBuffs = trialOpponentLawBuffs(snapshot, opponent);
  return opponent;
}

function trialNpcFor(state, run, node) {
  return trialOpponentFor(state, run, node);
}

function trialBattleRewardForNode(node, floor) {
  const safeFloor = Math.max(1, Math.floor(Number(floor) || 1));
  const phase = safeFloor <= 5 ? 1 : safeFloor <= 10 ? 2 : safeFloor <= 15 ? 3 : 4;
  const multiplier = node?.boss ? 1.7 : node?.elite ? 1.35 : 1;
  if (safeFloor > daoTrialCoreFloorCount) return { xp: 0, spirit: 0, dust: 0, multiplier, phase };
  const base = { xp: 0, spirit: 2 + Math.min(2, Math.floor((safeFloor - 1) / 5)), dust: safeFloor >= 4 ? 1 : 0 };
  return {
    xp: Math.min(1, Math.floor(base.xp * multiplier)),
    spirit: Math.max(0, Math.round(base.spirit * multiplier)),
    dust: Math.max(0, Math.round(base.dust * multiplier)),
    multiplier,
    phase
  };
}

function addTrialBattleReward(run, node) {
  if (run.practice) return null;
  const reward = trialBattleRewardForNode(node, node?.floor);
  run.rewards ??= { xp: 0, spirit: 0, dust: 0, milestones: [] };
  run.battleRewardTotals ??= { spirit: 0, dust: 0 };
  const granted = {
    ...reward,
    spirit: Math.min(reward.spirit, Math.max(0, daoTrialBattleRewardCap.spirit - run.battleRewardTotals.spirit)),
    dust: Math.min(reward.dust, Math.max(0, daoTrialBattleRewardCap.dust - run.battleRewardTotals.dust))
  };
  run.rewards.xp += granted.xp;
  run.rewards.spirit += granted.spirit;
  run.rewards.dust += granted.dust;
  run.battleRewardTotals.spirit += granted.spirit;
  run.battleRewardTotals.dust += granted.dust;
  return granted;
}

function trialMilestoneReward(state, run, node) {
  if (run.practice) return null;
  const floor = Math.max(1, Math.floor(Number(node?.floor) || run.nodeIndex + 1));
  const definition = daoTrialCoreRewardDefinitions[floor];
  if (!definition) return null;
  const stage = Math.max(0, Math.floor((Number(state.player?.realm) || 0) / 10));
  const dustTier = clamp(Math.floor(stage / 3), 0, 2);
  const reward = {
    xp: definition.xp,
    spirit: definition.spiritBase + stage * definition.spiritPerStage,
    dust: definition.dustBase + dustTier * definition.dustPerTier,
    label: definition.label
  };
  run.rewards ??= { xp: 0, spirit: 0, dust: 0, milestones: [] };
  run.rewards.xp += reward.xp;
  run.rewards.spirit += reward.spirit;
  run.rewards.dust += reward.dust;
  if (!run.rewards.milestones.includes(reward.label)) run.rewards.milestones.push(reward.label);
  return reward;
}

function trialBattleMetrics(battle, beforeStats, maxRounds = 18) {
  const events = battle?.events || [];
  const ownDamage = events
    .filter((event) => event.actorSide === "left" && event.targetSide === "right")
    .reduce((sum, event) => sum + Math.max(0, Number(event.damage) || 0), 0);
  const takenDamage = events
    .filter((event) => event.actorSide === "right" && event.targetSide === "left")
    .reduce((sum, event) => sum + Math.max(0, Number(event.damage) || 0), 0);
  const healing = events
    .filter((event) => event.actorSide === "left")
    .reduce((sum, event) => sum + Math.max(0, Number(event.healing) || 0), 0);
  const shields = events
    .filter((event) => event.actorSide === "left" || event.actorSide === "companion")
    .reduce((sum, event) => sum + Math.max(0, Number(event.shields) || 0), 0);
  const skillCasts = events.filter((event) => event.kind === "skill" && event.actorSide === "left").length;
  const rounds = Math.max(1, ...events.filter((event) => event.kind === "round").map((event) => Number(event.round) || 0));
  const maxMana = Math.max(1, Number(beforeStats?.maxMana) || 1);
  const manaSpent = Math.max(0, Math.min(maxMana * 2, (Number(beforeStats?.mana) || 0) - (Number(battle?.leftMana) || 0)));
  const survival = clamp((Number(battle?.leftHp) || 0) / Math.max(1, Number(beforeStats?.maxHp) || 1), 0, 1);
  const speed = clamp(1 - (rounds - 1) / Math.max(1, maxRounds), 0, 1);
  const resource = clamp(skillCasts / Math.max(1, maxRounds * 0.35) + manaSpent / maxMana * 0.25, 0, 1);
  return { rounds, damageDealt: ownDamage, damageTaken: takenDamage, healing, shields, skillCasts, manaSpent, survival, speed, resource };
}

function recordTrialNodeScore(run, node, metrics = {}) {
  run.scoreBreakdown ??= { progress: 0, quality: 0, risk: 0, build: 0, total: 0 };
  const floor = Math.max(1, Number(node?.floor) || run.nodeIndex + 1);
  const base = 100 + 20 * (floor - 1);
  run.scoreBreakdown.progress += base;
  if (metrics.battle) {
    const scores = [Number(metrics.survival) || 0, Number(metrics.speed) || 0, Number(metrics.resource) || 0].sort((a, b) => b - a);
    const tactical = clamp(Number(metrics.tactical) || 0, 0, 1);
    run.scoreBreakdown.quality += Math.round(base * (scores[0] + scores[1]) * 0.11 + base * tactical * 0.08);
  }
  const affixEffects = daoTrialCycleAffixes.find((item) => item.id === run.affixId)?.effects || {};
  const riskMultiplier = (Number(metrics.riskMultiplier) || 0) + Math.max(0, Number(combinedTrialBuffs(run).scoreRisk) || 0);
  run.scoreBreakdown.risk += Math.max(0, Math.round(base * riskMultiplier));
  run.scoreBreakdown.risk += node?.elite ? Math.round(base * 0.1) : 0;
  run.scoreBreakdown.risk += node?.boss ? Math.round(base * 0.15 * (1 + Number(affixEffects.bossScore || 0))) : 0;
  run.scoreBreakdown.build += Math.max(0, (run.sealIds?.length || 0) * 2 + (run.lawIds?.length || 0) * 5 + activeTrialSynergies(run).length * 6);
  run.scoreBreakdown.total = run.scoreBreakdown.progress + run.scoreBreakdown.quality + run.scoreBreakdown.risk + run.scoreBreakdown.build + Math.max(0, Math.round(Number(run.bonusScore) || 0));
  return run.scoreBreakdown.total;
}

function daoTrialTaskBoonsForDay(state, day = state.day) {
  const categories = new Set((state.taskCompletions || [])
    .filter((record) => Number(record.day) === Number(day))
    .map((record) => normalizeTaskCategory(record.category)));
  return Object.entries(daoTrialTaskBoonDefinitions)
    .filter(([category]) => categories.has(category))
    .map(([category, boon]) => ({ ...boon, category }));
}

function settleDaoTrialBag(state, run, success, result) {
  const raw = run.rewards || { xp: 0, spirit: 0, dust: 0, milestones: [] };
  const defeatedByMonster = !success && run.lastBattle?.opponent?.kind === "monster";
  const retention = success ? 1.2 : result === "主动离境" ? 0.8 : defeatedByMonster ? 0 : 0.4;
  const workMultiplier = run.taskBoons?.some((boon) => boon.id === "work") ? 1.15 : 1;
  const fortuneXpMultiplier = Math.max(1, Number(run.dailyRootFortuneXpMultiplier) || dailyRootFortuneXpMultiplier(state, state.player, run.startedDay || state.day));
  const settled = {
    xp: Math.max(0, Math.floor((Number(raw.xp) || 0) * retention * fortuneXpMultiplier)),
    spirit: Math.max(0, Math.floor((Number(raw.spirit) || 0) * retention * workMultiplier)),
    dust: Math.max(0, Math.floor((Number(raw.dust) || 0) * retention)),
    milestones: [...new Set(raw.milestones || [])],
    retention,
    workMultiplier,
    dailyRootFortuneXpMultiplier: fortuneXpMultiplier
  };
  if (!run.practice) {
    state.player.xp += settled.xp;
    state.player.spirit += settled.spirit;
    if (settled.dust) addSpiritDust(state, settled.dust, `每日问道·${result}`, state.player);
  }
  const opponentReward = settleDaoTrialOpponentReward(state, run, success, raw, retention);
  if (opponentReward) settled.opponentReward = opponentReward;
  return settled;
}

function recordDaoTrialNpcBattle(state, run, node, opponent, playerWon, replayId) {
  if (run.practice) return;
  const npc = state.npcs.find((entry) => entry.id === opponent.id);
  if (!npc) return;
  npc.daoTrialDefenses = Math.max(0, Math.floor(Number(npc.daoTrialDefenses) || 0)) + 1;
  if (!playerWon) npc.daoTrialWins = Math.max(0, Math.floor(Number(npc.daoTrialWins) || 0)) + 1;
  pushDungeonHistory(npc, {
    day: state.day,
    date: stateDateForDay(state),
    foughtAt: timestampKey(),
    type: "dao-trial-defense",
    name: `问道秘境·${daoTrialRouteMap[run.routeId]?.name || run.routeId}`,
    routeId: run.routeId,
    routeName: daoTrialRouteMap[run.routeId]?.name || run.routeId,
    cycle: run.cycle,
    floor: Math.max(1, Math.floor(Number(node.floor) || run.nodeIndex + 1)),
    opponentId: state.player.id,
    opponentName: state.player.name,
    result: playerWon ? "守关失利" : "守关得胜",
    success: !playerWon,
    xp: 0,
    spirit: 0,
    dust: 0,
    replayId
  });
}

function recordDaoTrialMonsterBattle(state, run, node, opponent, playerWon, replayId) {
  if (run.practice) return;
  run.monsterResults ??= [];
  run.monsterResults.unshift({
    id: opponent.id,
    name: opponent.name,
    floor: Math.max(1, Math.floor(Number(node.floor) || run.nodeIndex + 1)),
    playerWon,
    replayId
  });
  run.monsterResults = run.monsterResults.slice(0, 80);
}

function settleDaoTrialOpponentReward(state, run, success, raw, retention) {
  if (run.practice || success || retention !== 0.4 || !run.defeatedByOpponentId) return null;
  const npc = state.npcs.find((entry) => entry.id === run.defeatedByOpponentId);
  if (!npc) return null;
  const playerBaseShare = {
    xp: Math.max(0, Math.floor((Number(raw.xp) || 0) * retention)),
    spirit: Math.max(0, Math.floor((Number(raw.spirit) || 0) * retention)),
    dust: Math.max(0, Math.floor((Number(raw.dust) || 0) * retention))
  };
  const reward = {
    xp: Math.max(0, Math.floor(Number(raw.xp) || 0) - playerBaseShare.xp),
    spirit: Math.max(0, Math.floor(Number(raw.spirit) || 0) - playerBaseShare.spirit),
    dust: Math.max(0, Math.floor(Number(raw.dust) || 0) - playerBaseShare.dust)
  };
  npc.xp += reward.xp;
  npc.spirit += reward.spirit;
  if (reward.dust) addSpiritDust(state, reward.dust, `问道守关·击败${state.player.name}`, npc);
  npc.daoTrialRewards ??= { xp: 0, spirit: 0, dust: 0 };
  for (const key of ["xp", "spirit", "dust"]) npc.daoTrialRewards[key] = Math.max(0, Math.floor(Number(npc.daoTrialRewards[key]) || 0)) + reward[key];
  const history = (npc.dungeonHistory || []).find((record) => record.type === "dao-trial-defense" && record.replayId === run.lastReplayId);
  if (history) {
    history.xp = reward.xp;
    history.spirit = reward.spirit;
    history.dust = reward.dust;
  }
  return {
    ...reward,
    opponent: compactCultivatorRef(publicCultivator(npc, state, { kind: "npc", compact: true }))
  };
}

function daoTrialHarmonyRewardForState(state, milestone) {
  const stage = Math.max(0, Math.floor((Number(state.player?.realm) || 0) / 10));
  return {
    xp: Math.max(0, Math.floor(Number(milestone.reward?.xp) || 0)),
    spirit: Math.max(0, Math.floor((Number(milestone.reward?.spiritBase) || 0) + stage * (Number(milestone.reward?.spiritPerStage) || 0))),
    dust: Math.max(0, Math.floor(Number(milestone.reward?.dust) || 0))
  };
}

function daoTrialCurrentCycleRouteProgress(state) {
  return Object.fromEntries(daoTrialRoutes.map((route) => {
    const records = (state.daoTrial.history || [])
      .filter((record) => !record.practice && Number(record.cycle) === Number(state.daoTrial.cycle) && record.routeId === route.id)
      .sort(compareDaoTrialRecords);
    const best = records[0] || null;
    const bestFloor = Math.max(0, Math.floor(Number(best?.floor || best?.nodesCleared) || 0));
    return [route.id, {
      routeId: route.id,
      routeName: route.name,
      attempts: records.length,
      bestFloor,
      bestScore: Math.max(0, Math.floor(Number(best?.score) || 0)),
      contribution: Math.min(daoTrialHarmonyMaxPerRoute, bestFloor),
      best
    }];
  }));
}

function daoTrialFirstExploreView(state, routeId, routeProgress = null) {
  const progress = routeProgress || daoTrialCurrentCycleRouteProgress(state);
  const routeEntry = progress[routeId] || { attempts: 0 };
  const masteryLevels = daoTrialRoutes.map((route) => daoTrialMasteryView(state.daoTrial.routeMastery?.[route.id] || {}).level);
  const highestMasteryLevel = Math.max(0, ...masteryLevels);
  const masteryLevel = daoTrialMasteryView(state.daoTrial.routeMastery?.[routeId] || {}).level;
  const masteryGap = Math.max(0, highestMasteryLevel - masteryLevel);
  const available = Number(routeEntry.attempts) === 0;
  return {
    available,
    insight: available ? 1 : 0,
    freeRerolls: available && masteryGap >= 2 ? 1 : 0,
    masteryGap
  };
}

function daoTrialHarmonyView(state) {
  const routes = daoTrialCurrentCycleRouteProgress(state);
  const progress = Object.values(routes).reduce((total, route) => total + route.contribution, 0);
  const claimed = new Set(state.daoTrial.claimedHarmonyMilestones || []);
  const milestones = daoTrialHarmonyMilestoneDefinitions.map((milestone) => ({
    id: milestone.id,
    target: milestone.target,
    label: milestone.label,
    reward: daoTrialHarmonyRewardForState(state, milestone),
    reached: progress >= milestone.target,
    claimed: claimed.has(milestone.id)
  }));
  return {
    progress,
    maxProgress: daoTrialRoutes.length * daoTrialHarmonyMaxPerRoute,
    perRouteCap: daoTrialHarmonyMaxPerRoute,
    routes,
    milestones,
    nextMilestone: milestones.find((milestone) => !milestone.claimed) || null
  };
}

function claimDaoTrialHarmonyMilestones(state) {
  const harmony = daoTrialHarmonyView(state);
  const newlyReached = harmony.milestones.filter((milestone) => milestone.reached && !milestone.claimed);
  if (!newlyReached.length) return null;
  const reward = newlyReached.reduce((total, milestone) => ({
    xp: total.xp + milestone.reward.xp,
    spirit: total.spirit + milestone.reward.spirit,
    dust: total.dust + milestone.reward.dust
  }), { xp: 0, spirit: 0, dust: 0 });
  state.daoTrial.claimedHarmonyMilestones.push(...newlyReached.map((milestone) => milestone.id));
  state.daoTrial.claimedHarmonyMilestones = [...new Set(state.daoTrial.claimedHarmonyMilestones)];
  state.player.xp += reward.xp;
  state.player.spirit += reward.spirit;
  if (reward.dust) addSpiritDust(state, reward.dust, `问道合参·${newlyReached.at(-1).label}`, state.player);
  const rewardText = [
    reward.xp > 0 ? `修为 +${reward.xp}` : "",
    reward.spirit > 0 ? `灵石 +${reward.spirit}` : "",
    reward.dust > 0 ? `灵尘 +${reward.dust}` : ""
  ].filter(Boolean).join("，");
  log(state, `三脉合参达到 ${harmony.progress}/${harmony.maxProgress}，领取${newlyReached.map((milestone) => `「${milestone.label}」`).join("、")}奖励：${rewardText}。`, "gold");
  return {
    ...reward,
    milestones: newlyReached.map((milestone) => ({ id: milestone.id, target: milestone.target, label: milestone.label }))
  };
}

function trialRunScore(state, run, success = undefined) {
  const breakdown = run.scoreBreakdown || { progress: 0, quality: 0, risk: 0, build: 0, total: 0 };
  let score = Math.max(0, Number(breakdown.total) || Number(breakdown.progress || 0) + Number(breakdown.quality || 0) + Number(breakdown.risk || 0) + Number(breakdown.build || 0));
  const affixEffects = daoTrialCycleAffixes.find((item) => item.id === run.affixId)?.effects || {};
  score *= Math.max(0, Number(affixEffects.scoreMultiplier) || 1);
  const isFailure = success === false || (success === undefined && run.success === false);
  if (isFailure) score *= 1 + Math.max(0, Number(affixEffects.failScore) || 0) + Math.max(0, Number(combinedTrialBuffs(run).failScore) || 0);
  return Math.max(0, Math.round(score));
}

function trialRunScoreBreakdown(state, run, success = undefined) {
  const breakdown = run.scoreBreakdown || { progress: 0, quality: 0, risk: 0, build: 0, total: 0 };
  const rawTotal = Math.max(0, Math.round(Number(breakdown.total) || Number(breakdown.progress || 0) + Number(breakdown.quality || 0) + Number(breakdown.risk || 0) + Number(breakdown.build || 0)));
  const total = trialRunScore(state, run, success);
  return { ...breakdown, modifier: total - rawTotal, total };
}

function trialRunSummary(state, run) {
  const route = daoTrialRouteMap[run.routeId];
  const remainingHpRate = Math.round(clamp(
    (Number(run.combatant?.hp) || 0) / Math.max(1, Number(run.combatant?.maxHp) || 1),
    0,
    1
  ) * 100);
  return {
    id: run.id,
    cycle: run.cycle,
    attempt: run.attempt,
    practice: run.practice,
    routeId: run.routeId,
    routeName: route?.name || run.routeId,
    affixId: run.affixId || "",
    affixName: daoTrialCycleAffixes.find((item) => item.id === run.affixId)?.name || "",
    companion: run.companion?.person || null,
    nodesCleared: run.nodesCleared,
    floor: Math.max(0, Number(run.maxFloor) || run.nodesCleared),
    sealIds: [...(run.sealIds || [])],
    sealStacks: { ...(run.sealStacks || {}) },
    lawIds: [...(run.lawIds || [])],
    lawStacks: { ...(run.lawStacks || {}) },
    synergyIds: activeTrialSynergies(run).map((synergy) => synergy.id),
    lastReplayId: run.lastReplayId || "",
    score: trialRunScore(state, run, run.success),
    scoreBreakdown: trialRunScoreBreakdown(state, run, run.success),
    combatStats: { ...(run.combatStats || {}) },
    companionContribution: { ...(run.companionContribution || {}) },
    remainingHpRate,
    startedDay: run.startedDay,
    startedDate: stateDateForDay(state, run.startedDay),
    endedDay: run.endedDay || state.day,
    date: stateDateForDay(state, run.endedDay || state.day),
    bag: run.rewards ? {
      xp: Number(run.rewards.xp) || 0,
      spirit: Number(run.rewards.spirit) || 0,
      dust: Number(run.rewards.dust) || 0,
      milestones: [...new Set(run.rewards.milestones || [])]
    } : null,
    rewards: run.settledRewards || null,
    taskBoons: run.taskBoons || [],
    opponents: (run.opponentResults || []).map((entry) => ({ ...entry })),
    monsters: (run.monsterResults || []).map((entry) => ({ ...entry })),
    defeatedBy: run.defeatedByOpponentId
      ? (() => {
        const snapshot = Object.values(run.opponentSnapshots || {}).find((entry) => entry?.npcId === run.defeatedByOpponentId);
        return snapshot ? { id: snapshot.npcId, name: snapshot.name, gender: snapshot.gender, sect: snapshot.sect, realm: snapshot.realm, portraitUrl: snapshot.portraitUrl } : null;
      })()
      : null
  };
}

function finishDaoTrialRun(state, run, success, result) {
  run.success = success;
  run.result = result;
  run.endedDay = state.day;
  run.settledRewards = settleDaoTrialBag(state, run, success, result);
  if (!run.practice && run.companion?.person?.id) {
    const relation = relationshipEntry(state, run.companion.person.id);
    relation.affinity = clamp(relation.affinity + (success ? 2 : 1), -100, 100);
    relation.respect = clamp(relation.respect + (success ? 2 : 1), -100, 100);
    relation.interactions += 1;
    relation.lastDay = state.day;
  }
  const summary = { ...trialRunSummary(state, run), success, result };
  state.daoTrial.history.unshift(summary);
  state.daoTrial.history = state.daoTrial.history.slice(0, daoTrialHistoryLimit);
  if (!run.practice) {
    summary.harmonyRewards = claimDaoTrialHarmonyMilestones(state);
    summary.harmonyProgress = daoTrialHarmonyView(state).progress;
  }
  const qualityScore = Number(summary.scoreBreakdown?.quality) || 0;
  const isNewBest = summary.floor > state.daoTrial.bestFloor
    || (summary.floor === state.daoTrial.bestFloor && summary.score > state.daoTrial.bestScore)
    || (summary.floor === state.daoTrial.bestFloor && summary.score === state.daoTrial.bestScore && qualityScore > state.daoTrial.bestQualityScore);
  if (!run.practice && isNewBest) {
    state.daoTrial.bestFloor = summary.floor;
    state.daoTrial.bestScore = summary.score;
    state.daoTrial.bestQualityScore = qualityScore;
    state.daoTrial.bestResult = summary;
  }
  if (!run.practice) {
    const mastery = state.daoTrial.routeMastery[run.routeId] || { runs: 0, clears: 0, eliteClears: 0, bossClears: 0, bestFloor: 0, bestScore: 0 };
    mastery.runs += 1;
    if (summary.floor >= daoTrialCoreFloorCount) mastery.clears += 1;
    if (run.eliteCleared) mastery.eliteClears += 1;
    if (run.bossCleared) mastery.bossClears += 1;
    if (summary.floor > Number(mastery.bestFloor || 0) || (summary.floor === Number(mastery.bestFloor || 0) && summary.score > Number(mastery.bestScore || 0))) {
      mastery.bestFloor = summary.floor;
      mastery.bestScore = summary.score;
    }
    state.daoTrial.routeMastery[run.routeId] = mastery;
    const relativeCycle = ((state.daoTrial.cycle - 1) % 52) + 1;
    if (!state.daoTrial.yearGoals.cyclesPlayed.includes(relativeCycle)) state.daoTrial.yearGoals.cyclesPlayed.push(relativeCycle);
    state.daoTrial.yearGoals.completedCycles = state.daoTrial.yearGoals.cyclesPlayed.length;
    if (summary.floor >= daoTrialCoreFloorCount) state.daoTrial.yearGoals.routeClears += 1;
    if (success && run.combatant.hp / Math.max(1, run.combatant.maxHp) >= 0.8) state.daoTrial.yearGoals.perfectRuns += 1;
    state.daoTrial.yearGoals.deepestFloor = Math.max(Number(state.daoTrial.yearGoals.deepestFloor) || 0, summary.floor);
    for (const lawId of run.lawIds || []) if (!state.daoTrial.yearGoals.lawsSeen.includes(lawId)) state.daoTrial.yearGoals.lawsSeen.push(lawId);
    if (run.companion?.person?.id && !state.daoTrial.yearGoals.companionIds.includes(run.companion.person.id)) state.daoTrial.yearGoals.companionIds.push(run.companion.person.id);
    if (run.affixId && !state.daoTrial.yearGoals.affixesSeen.includes(run.affixId)) state.daoTrial.yearGoals.affixesSeen.push(run.affixId);
  }
  state.daoTrial.activeRun = null;
  log(state, `问道秘境：${summary.routeName}${success ? "问心成功" : result}，本次得分 ${summary.score}。`, success ? "gold" : "bad");
  return summary;
}

function publicTrialRun(state, run) {
  if (!run) return null;
  const route = daoTrialRouteMap[run.routeId];
  const nodes = run.nodes?.length ? run.nodes : (route?.nodes || []);
  const node = nodes[run.nodeIndex] || null;
  const trialBuffs = combinedTrialBuffs(run);
  const fighter = { ...run.combatant, trialBuffs };
  const stats = combatSnapshot(fighter, state);
  const baseSkill = effectiveSkillForEntity({ ...run.combatant, trialBuffs: {} });
  const effectiveSkill = effectiveSkillForEntity(fighter);
  const baseCombatStats = trialBaseCombatStats(run.baseCombatStats || run.combatant);
  const lowHpState = Number(run.combatant?.hp) <= Number(run.combatant?.maxHp || 1) * 0.5;
  const appliedStatBonuses = {
    maxHp: Number(trialBuffs.maxHp) || 0,
    maxMana: Number(trialBuffs.maxMana) || 0,
    attack: (Number(trialBuffs.attack) || 0) + (lowHpState ? Number(trialBuffs.lowHpAttack) || 0 : 0),
    defense: Number(trialBuffs.defense) || 0,
    divineSense: (Number(trialBuffs.divineSense) || 0) + (lowHpState ? Number(trialBuffs.lowHpSense) || 0 : 0)
  };
  const statComparisons = [
    { key: "maxHp", label: "血量" },
    { key: "maxMana", label: "法力" },
    { key: "attack", label: "攻击" },
    { key: "defense", label: "防御" },
    { key: "divineSense", label: "神识" }
  ].map((entry) => {
    const base = Math.max(entry.key === "defense" ? 0 : 1, Number(baseCombatStats[entry.key]) || 0);
    const current = Math.max(entry.key === "defense" ? 0 : 1, Number(stats[entry.key]) || 0);
    return {
      ...entry,
      base,
      current,
      delta: current - base,
      percent: appliedStatBonuses[entry.key] || 0
    };
  });
  const combatModifiers = {
    attack: Number(trialBuffs.attack) || 0,
    defense: Number(trialBuffs.defense) || 0,
    maxHp: Number(trialBuffs.maxHp) || 0,
    maxMana: Number(trialBuffs.maxMana) || 0,
    divineSense: Number(trialBuffs.divineSense) || 0,
    skillPower: Number(trialBuffs.skillPower) || 0,
    statusPower: Number(trialBuffs.statusPower) || 0,
    healing: Number(trialBuffs.healing) || 0,
    manaCost: Number(trialBuffs.manaCost) || 0,
    cooldown: Number(trialBuffs.cooldown) || 0,
    rootResist: Number(trialBuffs.rootResist) || 0,
    postBattleHeal: Number(trialBuffs.postBattleHeal) || 0,
    postBattleMana: Number(trialBuffs.postBattleMana) || 0,
    skill: {
      id: effectiveSkill.id,
      name: effectiveSkill.name,
      type: effectiveSkill.type,
      baseCost: baseSkill.cost,
      cost: effectiveSkill.cost,
      baseCooldown: baseSkill.cooldown,
      cooldown: effectiveSkill.cooldown,
      effectComparisons: trialSkillEffectComparisons(baseSkill, effectiveSkill)
    }
  };
  let opponentPreview = null;
  if (node?.type === "battle" && route) {
    const opponent = trialOpponentFor(state, run, node);
    if (opponent) {
      const playerPenalty = rootCounterPenalty(opponent, fighter) * (1 - clamp(Number(fighter?.trialBuffs?.rootResist) || 0, 0, 1));
      const opponentPenalty = rootCounterPenalty(fighter, opponent);
      const playerBattleStats = applyBattleRootPenalty(stats, playerPenalty);
      const opponentBattleStats = applyBattleRootPenalty(combatSnapshot(opponent, state), opponentPenalty);
      const opponentPower = powerOfStats(opponentBattleStats);
      const playerMaxPower = powerOfStats(playerBattleStats);
      const playerPower = powerOfStats({
        ...playerBattleStats,
        maxHp: playerBattleStats.hp,
        maxMana: playerBattleStats.mana
      });
      const powerRatio = opponentPower / Math.max(1, playerPower);
      const threat = powerRatio <= 0.85
        ? { key: "favorable", label: "占据上风" }
        : powerRatio <= 1.05
          ? { key: "even", label: "势均力敌" }
          : powerRatio <= 1.25
            ? { key: "danger", label: "颇为凶险" }
            : { key: "deadly", label: "九死一生" };
      opponentPreview = {
        ...publicMonster(opponent),
        person: {
          id: opponent.id,
          name: opponent.name,
          gender: opponent.gender || "",
          sect: opponent.sect || (opponent.kind === "monster" ? "秘境妖域" : ""),
          realm: opponent.realm,
          portraitUrl: opponent.portraitUrl,
          power: opponent.basePower
        },
        sect: opponent.sect || (opponent.kind === "monster" ? "秘境妖域" : ""),
        portraitUrl: opponent.portraitUrl,
        attack: opponentBattleStats.attack,
        defense: opponentBattleStats.defense,
        maxHp: opponentBattleStats.maxHp,
        divineSense: opponentBattleStats.divineSense,
        maxMana: opponentBattleStats.maxMana,
        rootCounterPenalty: opponentBattleStats.rootCounterPenalty || 0,
        basePower: opponent.basePower,
        kindKey: opponent.kind || "npc",
        encounterKind: opponent.kind || "npc",
        archetype: opponent.archetype,
        archetypeLabel: opponent.archetypeLabel,
        archetypeText: opponent.archetypeText,
        enhancePercent: Number(opponent.enhancePercent) || 0,
        rewardPreview: trialBattleRewardForNode(node, node.floor),
        projectionPercent: Math.round((opponent.projectionRatio - 1) * 100),
        projectionLabel: opponent.projectionRatio > 1 ? "秘境战意" : "秘境原势",
        power: opponentPower,
        playerPower,
        playerMaxPower,
        powerRatio: Math.round(powerRatio * 100),
        threat,
        kind: opponent.kind === "monster"
          ? (node.boss ? "妖物首领" : node.elite ? "精英妖物" : "秘境妖物")
          : (node.boss ? "问心守关者" : node.elite ? "精英守关者" : "守关修士")
      };
    }
  }
  return {
    id: run.id,
    cycle: run.cycle,
    attempt: run.attempt,
    practice: run.practice,
    affix: daoTrialCycleAffixes.find((item) => item.id === run.affixId) || null,
    route: route ? { id: route.id, name: route.name, subtitle: route.subtitle, accent: route.accent, rootKey: route.rootKey } : null,
    nodes: nodes.map((item, index) => ({ id: item.id, name: item.name, type: item.type, floor: index + 1, elite: Boolean(item.elite), boss: Boolean(item.boss), checkpoint: Boolean(item.checkpoint), index, state: index < run.nodeIndex ? "cleared" : index === run.nodeIndex ? "current" : "locked" })),
    nodeIndex: run.nodeIndex,
    floor: Math.max(1, run.nodeIndex + 1),
    maxFloor: Math.max(0, Number(run.maxFloor) || run.nodesCleared),
    checkpointFloor: Number(run.checkpointFloor) || 0,
    checkpointPending: Boolean(run.checkpointPending),
    checkpointRecovery: run.checkpointPending ? {
      hpPercent: Math.round(daoTrialCheckpointRecovery.hp * 100),
      manaPercent: Math.round(daoTrialCheckpointRecovery.mana * 100)
    } : null,
    endless: run.nodeIndex + 1 > daoTrialCoreFloorCount,
    currentNode: node ? { id: node.id, name: node.name, type: node.type, floor: Number(node.floor) || run.nodeIndex + 1, elite: Boolean(node.elite), boss: Boolean(node.boss), checkpoint: Boolean(node.checkpoint) } : null,
    opponentPreview,
    enemyPreview: opponentPreview,
    combat: { hp: stats.hp, maxHp: stats.maxHp, mana: stats.mana, maxMana: stats.maxMana },
    statComparisons,
    combatModifiers,
    companion: run.companion,
    seals: run.sealIds.map((id) => ({ ...daoTrialSealMap[id], stack: Number(run.sealStacks?.[id]) || 1 })).filter(Boolean),
    laws: (run.lawIds || []).map((id) => publicTrialLaw(daoTrialLawMap[id], Number(run.lawStacks?.[id]) || 1)).filter(Boolean),
    lawOffer: (run.lawOffer || []).map((id) => publicTrialLaw(daoTrialLawMap[id], Math.min(5, (Number(run.lawStacks?.[id]) || 0) + 1))).filter(Boolean),
    lawRarityRates: run.lastLawRarityRates || lawRarityRatesForFloor(Math.max(1, Number(run.floor) || 1)),
    lastLawEvent: run.lastLawEvent ? { ...run.lastLawEvent } : null,
    synergies: activeTrialSynergies(run),
    resonanceProgress: trialSealResonanceProgress(run),
    sealOffer: (run.pendingSealIds || []).map((id) => ({ ...daoTrialSealMap[id], stack: Math.min(5, (Number(run.sealStacks?.[id]) || 0) + 1) })).filter(Boolean),
    insight: run.insight,
    canReroll: Boolean((run.pendingSealIds?.length || run.lawOffer?.length) && (
      run.insight > 0
      || run.freeRerolls > 0
      || run.lawOffer?.length && runLawMechanics(run, "freeReroll").length && run.fateRerollUsedOfferKey !== `${run.floor}`
    )),
    eventOptions: node && ["event", "rest"].includes(node.type) ? (daoTrialEventOptions[node.event] || []) : [],
    nodesCleared: run.nodesCleared,
    score: trialRunScore(state, run),
    scoreBreakdown: trialRunScoreBreakdown(state, run),
    combatStats: { ...(run.combatStats || {}) },
    companionContribution: { ...(run.companionContribution || {}) },
    bag: {
      xp: Number(run.rewards?.xp) || 0,
      spirit: Number(run.rewards?.spirit) || 0,
      dust: Number(run.rewards?.dust) || 0,
      milestones: [...new Set(run.rewards?.milestones || [])]
    },
    taskBoons: run.taskBoons || [],
    firstExploreSupport: run.firstExploreSupport ? { ...run.firstExploreSupport } : null,
    freeRerolls: run.freeRerolls || 0,
    canUseLifeHeal: Boolean(run.lifeHealAvailable && stats.hp < stats.maxHp),
    canWithdraw: Boolean(run.nodesCleared >= 5 && !run.checkpointPending && !run.pendingSealIds?.length && !run.lawOffer?.length),
    canCheckpointExit: Boolean(run.checkpointPending && !run.lawOffer?.length),
    canContinue: Boolean(run.checkpointPending && !run.lawOffer?.length),
    withdrawRetention: 0.8,
    failureRetention: 0.4,
    successMultiplier: 1.2
  };
}

function daoTrialMasteryView(record = {}) {
  const progressScore = (Number(record.clears) || 0) * 3 + (Number(record.eliteClears) || 0) + Math.floor((Number(record.runs) || 0) / 3);
  const level = clamp(Math.floor(progressScore / 3), 0, 10);
  const unlocks = [];
  if (level >= 2) unlocks.push({ id: "insight", name: "初悟", text: "入境时额外获得 1 点悟机。" });
  if (level >= 4) unlocks.push({ id: "reroll", name: "重观", text: "每轮额外获得 1 次免费重观。" });
  if (level >= 6) unlocks.push({ id: "affinity", name: "路线共鸣", text: "首轮法则候选增加 1 项，所有具体法则仍保持等权。" });
  return { ...record, level, nextLevelAt: Math.min(30, (clamp(level, 0, 9) + 1) * 3), progressScore, unlocks };
}

function compareDaoTrialRecords(a, b) {
  return Number(b?.floor || 0) - Number(a?.floor || 0)
    || Number(b?.score || 0) - Number(a?.score || 0)
    || Number(b?.scoreBreakdown?.quality || 0) - Number(a?.scoreBreakdown?.quality || 0);
}

function daoTrialRankings(state) {
  const official = (state.daoTrial.history || [])
    .filter((record) => !record.practice && Number(record.cycle) === Number(state.daoTrial.cycle))
    .sort(compareDaoTrialRecords);
  const best = (records) => records[0] || null;
  return {
    overall: best(official),
    solo: best(official.filter((record) => !record.companion)),
    companion: best(official.filter((record) => record.companion)),
    routes: Object.fromEntries(daoTrialRoutes.map((route) => [route.id, best(official.filter((record) => record.routeId === route.id))]))
  };
}

function publicDaoTrial(state) {
  ensureDaoTrialState(state);
  const harmony = daoTrialHarmonyView(state);
  const mastery = Object.fromEntries(daoTrialRoutes.map((route) => {
    const record = state.daoTrial.routeMastery[route.id] || {};
    return [route.id, daoTrialMasteryView(record)];
  }));
  const goalState = state.daoTrial.yearGoals;
  const annualGoals = [
    { id: "cycles-12", label: "十二期问道", current: goalState.completedCycles, target: 12 },
    { id: "cycles-36", label: "三十六期问道", current: goalState.completedCycles, target: 36 },
    { id: "cycles-52", label: "一岁不辍", current: goalState.completedCycles, target: 52 },
    { id: "clears-12", label: "十二次问心", current: goalState.routeClears, target: 12 },
    { id: "perfect-6", label: "六次从容问心", current: goalState.perfectRuns, target: 6 },
    { id: "deepest-20", label: "问天二十层", current: goalState.deepestFloor, target: 20 },
    { id: "laws-256", label: "参悟二百五十六法则", current: goalState.lawsSeen.length, target: daoTrialLaws.length },
    { id: "companions-6", label: "六友同行", current: goalState.companionIds.length, target: 6 },
    { id: "affixes-16", label: "遍历十六异象", current: goalState.affixesSeen.length, target: daoTrialCycleAffixes.length }
  ].map((goal) => ({ ...goal, completed: goal.current >= goal.target }));
  return {
    cycle: state.daoTrial.cycle,
    cycleStartDay: state.daoTrial.cycleStartDay,
    cycleEndDay: state.daoTrial.cycleEndDay,
    attemptsUsed: state.daoTrial.attemptsUsed,
    officialAttempts: daoTrialTicketCap,
    attemptsRemaining: state.daoTrial.tickets,
    tickets: state.daoTrial.tickets,
    ticketCap: daoTrialTicketCap,
    dailyTicketGrant: daoTrialDailyTicketGrant,
    taskBoons: daoTrialTaskBoonsForDay(state),
    boonsAvailable: state.daoTrial.lastBoonDay !== state.day,
    claimedMilestones: [...state.daoTrial.claimedMilestones],
    harmony: {
      progress: harmony.progress,
      maxProgress: harmony.maxProgress,
      perRouteCap: harmony.perRouteCap,
      milestones: harmony.milestones,
      routes: Object.fromEntries(Object.entries(harmony.routes).map(([routeId, route]) => [routeId, {
        routeId: route.routeId,
        routeName: route.routeName,
        attempts: route.attempts,
        bestFloor: route.bestFloor,
        bestScore: route.bestScore,
        contribution: route.contribution
      }]))
    },
    bestFloor: state.daoTrial.bestFloor,
    bestScore: state.daoTrial.bestScore,
    bestQualityScore: state.daoTrial.bestQualityScore,
    bestResult: state.daoTrial.bestResult,
    affix: daoTrialAffixForCycle(state.daoTrial.cycle),
    cycleAffixes: daoTrialCycleAffixes,
    routeMastery: mastery,
    yearGoals: { ...state.daoTrial.yearGoals, goals: annualGoals },
    yearHistory: state.daoTrial.yearHistory,
    rankings: daoTrialRankings(state),
    activeRun: publicTrialRun(state, state.daoTrial.activeRun),
    history: state.daoTrial.history.slice(0, 12),
    routes: daoTrialRoutes.map((route) => {
      const cycleProgress = harmony.routes[route.id];
      const firstExplore = daoTrialFirstExploreView(state, route.id, harmony.routes);
      return {
        id: route.id,
        name: route.name,
        subtitle: route.subtitle,
        rootKey: route.rootKey,
        accent: route.accent,
        nodeCount: daoTrialCoreFloorCount,
        nodePoolCount: route.nodes.length + (daoTrialNodeVariants[route.id] || []).length,
        nodes: daoTrialNodesForCycle(route.id, state.daoTrial.cycle).map((node) => ({ name: node.name, type: node.type, elite: Boolean(node.elite), boss: Boolean(node.boss) })),
        cycleProgress: {
          attempts: cycleProgress.attempts,
          bestFloor: cycleProgress.bestFloor,
          bestScore: cycleProgress.bestScore,
          contribution: cycleProgress.contribution
        },
        firstExplore: { ...firstExplore, rewardEligible: state.daoTrial.tickets > 0 }
      };
    }),
    companions: availableDaoTrialCompanions(state),
    sealCatalog: daoTrialSeals.map((seal) => ({ ...seal, discovered: state.daoTrial.discoveredSealIds.includes(seal.id) })),
    lawCatalog: daoTrialLaws.map((law) => ({ ...publicTrialLaw(law), discovered: state.daoTrial.discoveredLawIds.includes(law.id) })),
    lawRarities: Object.values(daoTrialLawRarities),
    lawRarityRates: [{ ...lawRarityRatesForFloor(1), maxFloor: null }],
    lawPity: { ...state.daoTrial.lawPity, disabled: true },
    collection: {
      discoveredLawCount: state.daoTrial.discoveredLawIds.length,
      discoveredSealCount: state.daoTrial.discoveredSealIds.length,
      totalLawCount: daoTrialLaws.length,
      totalSealCount: daoTrialSeals.length
    },
    coreFloorCount: daoTrialCoreFloorCount
  };
}

export function getDaoTrialHistoryPage(state, options = {}) {
  ensureDaoTrialState(state);
  const offset = Math.max(0, Math.floor(Number(options.offset) || 0));
  const limit = clamp(Math.floor(Number(options.limit) || 24), 1, 60);
  const routeId = String(options.routeId || "");
  const cycle = Math.max(0, Math.floor(Number(options.cycle) || 0));
  const items = state.daoTrial.history.filter((record) => {
    if (routeId && record.routeId !== routeId) return false;
    if (cycle && Number(record.cycle) !== cycle) return false;
    return true;
  });
  return { offset, limit, total: items.length, hasMore: offset + limit < items.length, items: items.slice(offset, offset + limit) };
}

function daoTrialAnalyticsBestView(record) {
  if (!record) return null;
  const scoreBreakdown = record.scoreBreakdown || {};
  const combatStats = record.combatStats || {};
  const companionContribution = record.companionContribution || {};
  const rewards = record.rewards || record.bag || {};
  return {
    id: record.id,
    cycle: Number(record.cycle) || 0,
    attempt: Number(record.attempt) || 0,
    routeId: record.routeId || "",
    routeName: record.routeName || daoTrialRouteMap[record.routeId]?.name || record.routeId || "未知路线",
    affixName: record.affixName || "",
    result: record.result || "游历结束",
    success: Boolean(record.success),
    floor: Math.max(0, Number(record.floor || record.nodesCleared) || 0),
    score: Math.max(0, Number(record.score) || 0),
    remainingHpRate: Number.isFinite(Number(record.remainingHpRate)) ? clamp(Math.round(Number(record.remainingHpRate)), 0, 100) : null,
    companion: record.companion ? { id: record.companion.id || "", name: record.companion.name || "同行修士" } : null,
    lastReplayId: record.lastReplayId || "",
    sealCount: Array.isArray(record.sealIds) ? record.sealIds.length : 0,
    lawCount: Array.isArray(record.lawIds) ? record.lawIds.length : 0,
    synergyCount: Array.isArray(record.synergyIds) ? record.synergyIds.length : 0,
    taskBoons: (record.taskBoons || []).map((boon) => ({ id: boon.id || "", name: boon.name || boon.category || "助力" })),
    scoreBreakdown: {
      legacy: Boolean(scoreBreakdown.legacy),
      progress: Math.max(0, Number(scoreBreakdown.progress) || 0),
      quality: Math.max(0, Number(scoreBreakdown.quality) || 0),
      risk: Math.max(0, Number(scoreBreakdown.risk) || 0),
      build: Math.max(0, Number(scoreBreakdown.build) || 0),
      modifier: Number(scoreBreakdown.modifier) || 0,
      total: Math.max(0, Number(scoreBreakdown.total) || Number(record.score) || 0)
    },
    combatStats: Object.fromEntries([
      "battles", "rounds", "damageDealt", "damageTaken", "healing", "shields", "skillCasts", "manaSpent", "lawTriggers"
    ].map((key) => [key, Math.max(0, Number(combatStats[key]) || 0)])),
    companionContribution: Object.fromEntries([
      "damage", "healing", "shields", "assists"
    ].map((key) => [key, Math.max(0, Number(companionContribution[key]) || 0)])),
    rewards: {
      xp: Math.max(0, Number(rewards.xp) || 0),
      spirit: Math.max(0, Number(rewards.spirit) || 0),
      dust: Math.max(0, Number(rewards.dust) || 0)
    }
  };
}

export function getDaoTrialAnalytics(state, options = {}) {
  ensureDaoTrialState(state);
  const range = clamp(Math.floor(Number(options.range) || 14), 7, 400);
  const routeId = String(options.routeId || "");
  const endDay = Math.max(1, Number(state.day) || 1);
  const startDay = Math.max(1, endDay - range + 1);
  const officialInRange = (state.daoTrial.history || []).filter((record) => (
    !record.practice
    && Number(record.endedDay || record.startedDay) >= startDay
    && Number(record.endedDay || record.startedDay) <= endDay
  ));
  const filtered = officialInRange.filter((record) => !routeId || record.routeId === routeId);
  const recordsByDay = new Map();
  for (const record of filtered) {
    const day = Number(record.endedDay || record.startedDay) || 0;
    if (!recordsByDay.has(day)) recordsByDay.set(day, []);
    recordsByDay.get(day).push(record);
  }
  const days = [];
  for (let day = startDay; day <= endDay; day += 1) {
    const records = recordsByDay.get(day) || [];
    const bestRecord = [...records].sort(compareDaoTrialRecords)[0] || null;
    const rewards = records.reduce((total, record) => {
      const reward = record.rewards || record.bag || {};
      total.xp += Math.max(0, Number(reward.xp) || 0);
      total.spirit += Math.max(0, Number(reward.spirit) || 0);
      total.dust += Math.max(0, Number(reward.dust) || 0);
      return total;
    }, { xp: 0, spirit: 0, dust: 0 });
    days.push({
      day,
      date: stateDateForDay(state, day),
      attempts: records.length,
      clears: records.filter((record) => Number(record.floor || record.nodesCleared) >= daoTrialCoreFloorCount).length,
      rewards,
      best: daoTrialAnalyticsBestView(bestRecord)
    });
  }
  const playedDays = days.filter((entry) => entry.best);
  let improvedDays = 0;
  for (let index = 1; index < playedDays.length; index += 1) {
    const previous = playedDays[index - 1].best;
    const current = playedDays[index].best;
    if (current.floor > previous.floor || current.score > previous.score) improvedDays += 1;
  }
  const comparableDays = Math.max(0, playedDays.length - 1);
  const latest = playedDays.at(-1) || null;
  const previous = playedDays.at(-2) || null;
  const routeStats = daoTrialRoutes.map((route) => {
    const records = officialInRange.filter((record) => record.routeId === route.id);
    const scores = records.map((record) => Math.max(0, Number(record.score) || 0));
    const floors = records.map((record) => Math.max(0, Number(record.floor || record.nodesCleared) || 0));
    const clears = floors.filter((floor) => floor >= daoTrialCoreFloorCount).length;
    return {
      routeId: route.id,
      routeName: route.name,
      accent: route.accent,
      attempts: records.length,
      averageScore: records.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / records.length) : 0,
      averageFloor: records.length ? Number((floors.reduce((sum, value) => sum + value, 0) / records.length).toFixed(1)) : 0,
      bestFloor: records.length ? Math.max(...floors) : 0,
      bestScore: records.length ? Math.max(...scores) : 0,
      clearRate: records.length ? Math.round(clears / records.length * 100) : 0
    };
  });
  return {
    range,
    routeId,
    startDay,
    endDay,
    coreFloorCount: daoTrialCoreFloorCount,
    summary: {
      attempts: filtered.length,
      playedDays: playedDays.length,
      improvedDays,
      comparableDays,
      improvementRate: comparableDays ? Math.round(improvedDays / comparableDays * 100) : null,
      latestDay: latest?.day || null,
      latest: latest?.best || null,
      previousDay: previous?.day || null,
      previous: previous?.best || null
    },
    days,
    routeStats
  };
}

export function startDaoTrial(state, payload = {}) {
  ensureDaoTrialState(state);
  if (state.daoTrial.activeRun) throw new Error("已有一轮问道正在进行");
  const route = daoTrialRouteMap[payload.routeId];
  if (!route) throw new Error("未知的问道路线");
  const companions = availableDaoTrialCompanions(state);
  const companion = payload.companionId ? companions.find((entry) => entry.person.id === payload.companionId) : null;
  if (payload.companionId && !companion) throw new Error("该修士当前无法同行");
  const practice = state.daoTrial.tickets <= 0;
  if (!practice) {
    state.daoTrial.tickets -= 1;
    state.daoTrial.attemptsUsed += 1;
  }
  const attempt = practice ? state.daoTrial.attemptsUsed + state.daoTrial.history.filter((entry) => entry.cycle === state.daoTrial.cycle && entry.practice).length + 1 : state.daoTrial.attemptsUsed;
  const combatant = createTrialCombatant(state);
  const baseCombatStats = trialBaseCombatStats(combatant);
  const mastery = daoTrialMasteryView(state.daoTrial.routeMastery[route.id] || {});
  const firstExplore = daoTrialFirstExploreView(state, route.id);
  const firstExploreApplied = !practice && firstExplore.available;
  const companionEntity = companion ? state.npcs.find((npc) => npc.id === companion.person.id) : null;
  const companionStats = companionEntity ? effectiveStats(companionEntity, state, { includeDailyRootFortune: false }) : null;
  const worldSnapshot = {
    realm: state.player.realm,
    baselinePower: trialWorldBaselinePower(state),
    playerPower: powerOf(state.player, state, { includeDailyRootFortune: false })
  };
  const affix = daoTrialAffixForCycle(state.daoTrial.cycle);
  const taskBoons = !practice && state.daoTrial.lastBoonDay !== state.day ? daoTrialTaskBoonsForDay(state) : [];
  if (!practice) state.daoTrial.lastBoonDay = state.day;
  if (taskBoons.some((boon) => boon.id === "exercise")) {
    combatant.maxHp = Math.max(1, Math.floor(combatant.maxHp * 1.12));
    combatant.hp = combatant.maxHp;
  }
  const run = {
    id: makeId("dao-trial"),
    cycle: state.daoTrial.cycle,
    attempt,
    practice,
    routeId: route.id,
    affixId: affix.id,
    nodes: daoTrialNodesForCycle(route.id, state.daoTrial.cycle),
    seed: `dao-trial|${state.rebirth}|${state.daoTrial.cycle}|${attempt}|${route.id}`,
    startedDay: state.day,
    worldSnapshot,
    baseCombatStats,
    isApex: worldSnapshot.playerPower >= Math.max(0, ...(state.npcs || []).map((npc) => powerOf(npc, state, { includeDailyRootFortune: false }))),
    nodeIndex: 0,
    floor: 1,
    maxFloor: 0,
    checkpointFloor: 0,
    checkpointPending: false,
    nodesCleared: 0,
    sealIds: [],
    sealStacks: {},
    pendingSealIds: [],
    sealNonce: 0,
    masteryLevel: mastery.level,
    masteryLawOptions: mastery.level >= 6 ? 1 : 0,
    insight: 1 + Math.max(0, Math.floor(Number(affix.effects?.initialInsight) || 0)) + (mastery.level >= 2 ? 1 : 0) + (firstExploreApplied ? firstExplore.insight : 0),
    lawIds: [],
    lawStacks: {},
    lawOffer: [],
    lawNonce: 0,
    offeredLawIds: [],
    offeredSealIds: [],
    taskBoons,
    dailyRootFortuneXpMultiplier: dailyRootFortuneXpMultiplier(state, state.player),
    freeRerolls: (taskBoons.some((boon) => boon.id === "study") ? 1 : 0) + (mastery.level >= 4 ? 1 : 0) + (firstExploreApplied ? firstExplore.freeRerolls : 0),
    lifeHealAvailable: taskBoons.some((boon) => boon.id === "life"),
    eliteCleared: false,
    bossCleared: false,
    tempSense: 0,
    companion: companion ? { ...companion, supportUsed: false } : null,
    companionSnapshot: companionEntity ? {
      person: companion.person,
      power: Number(companion.support?.power) || powerOf(companionEntity, state, { includeDailyRootFortune: false }),
      attack: companionStats.attack,
      defense: companionStats.defense,
      divineSense: companionStats.divineSense,
      maxHp: companionStats.maxHp,
      maxMana: companionStats.maxMana,
      skillId: companionEntity.skillId,
      type: companion.support?.type || "sustain",
      powerFactor: Number(companion.support?.powerFactor) || 1,
      relationFactor: Number(companion.support?.relationFactor) || 1
    } : null,
    companionContribution: { damage: 0, healing: 0, shields: 0, control: 0, assists: 0 },
    opponentIds: [],
    opponentSnapshots: {},
    opponentResults: [],
    monsterResults: [],
    defeatedByOpponentId: "",
    combatStats: { battles: 0, rounds: 0, damageDealt: 0, damageTaken: 0, healing: 0, shields: 0, skillCasts: 0, manaSpent: 0, lawTriggers: 0 },
    scoreBreakdown: { progress: 0, quality: 0, risk: 0, build: 0, total: 0 },
    rewards: { xp: 0, spirit: 0, dust: 0, milestones: [] },
    battleRewardTotals: { spirit: 0, dust: 0 },
    firstExploreSupport: {
      applied: firstExploreApplied,
      insight: firstExploreApplied ? firstExplore.insight : 0,
      freeRerolls: firstExploreApplied ? firstExplore.freeRerolls : 0,
      masteryGap: firstExplore.masteryGap
    },
    combatant
  };
  run.lawOffer = lawOfferForRun(state, run, route, run.lawNonce);
  ensureTrialOpponents(state, run);
  state.daoTrial.activeRun = run;
  log(state, `踏入问道秘境「${route.name}」，${practice ? "本次为无奖励演练" : `消耗 1 枚问道签，余 ${state.daoTrial.tickets} 枚`}。`, "gold");
  return { run: publicTrialRun(state, run), practice };
}

function applyTrialEventEffects(state, run, node, effects = {}) {
  const baseHp = run.combatant.maxHp;
  const baseMana = run.combatant.maxMana;
  const affix = daoTrialCycleAffixes.find((item) => item.id === run.affixId);
  const buffs = combinedTrialBuffs(run);
  const companionBonus = effects.companionBoost && run.companion ? 1.5 : 1;
  const hpEffect = Number(effects.hp) || 0;
  const manaEffect = Number(effects.mana) || 0;
  const eventLoss = hpEffect < 0 || manaEffect < 0
    ? Math.max(0.25, 1 + Number(affix?.effects?.eventLoss || 0) - Number(buffs.eventLossResist || 0))
    : 1;
  const isRest = node?.type === "rest";
  const recovery = hpEffect > 0
    ? 1 + (isRest ? Number(affix?.effects?.restBonus || 0) + Number(buffs.restHp || 0) : 0) + Number(affix?.effects?.healing || 0)
    : 1;
  run.combatant.hp = clamp(run.combatant.hp + Math.floor(baseHp * hpEffect * recovery * companionBonus), 1, baseHp);
  const manaRecovery = manaEffect > 0
    ? 1 + (isRest ? Number(affix?.effects?.restMana || 0) : 0) + Number(affix?.effects?.healing || 0) + Number(buffs.eventMana || 0)
    : eventLoss;
  run.combatant.mana = clamp(run.combatant.mana + Math.floor(baseMana * manaEffect * manaRecovery * companionBonus), 0, baseMana);
  run.insight = Math.max(0, run.insight + Math.floor(Number(effects.insight) || 0) + Math.floor(Number(affix?.effects?.insight) || 0) + (!run.companion ? Math.floor(Number(buffs.insightSolo) || 0) : 0));
  if (node?.type === "event") run.bonusScore = (Number(run.bonusScore) || 0) + Number(affix?.effects?.eventScore || 0);
  run.tempSense = Math.max(0, (Number(run.tempSense) || 0) + (Number(effects.tempSense) || 0));
  if (effects.grantSeal) {
    run.pendingSealIds = sealOfferForRun(state, run, daoTrialRouteMap[run.routeId], run.sealNonce);
    run.advanceAfterSeal = true;
  }
  if (hpEffect < 0 || manaEffect < 0) {
    for (const mechanic of runLawMechanics(run, "eventCompensation")) {
      const insight = Math.max(0, Math.floor(Number(mechanic.params.insight) || 0));
      const defense = Math.max(0, Number(mechanic.params.defense) || 0);
      run.insight += insight;
      run.tempDefense = (Number(run.tempDefense) || 0) + defense;
      run.lastLawEvent = { lawId: mechanic.lawId, lawName: mechanic.lawName, text: `福祸转化：悟机 +${insight}，临时防御 +${Math.round(defense * 100)}%` };
    }
  }
}

function chooseTrialSeal(state, run, sealId) {
  if (!run.pendingSealIds.includes(sealId)) throw new Error("该道印不在本次选择中");
  run.sealStacks ??= Object.fromEntries((run.sealIds || []).map((id) => [id, 1]));
  run.sealStacks[sealId] = Math.min(5, (Number(run.sealStacks[sealId]) || 0) + 1);
  if (!run.sealIds.includes(sealId)) run.sealIds.push(sealId);
  run.pendingSealIds = [];
  if (run.advanceAfterSeal) {
    run.advanceAfterSeal = false;
    run.nodeIndex += 1;
    run.floor = run.nodeIndex + 1;
  }
  return { seal: daoTrialSealMap[sealId] };
}

function chooseTrialLaw(run, lawId) {
  if (!run.lawOffer?.includes(lawId)) throw new Error("该问道法则不在本次选择中");
  const unchosenLawIds = run.lawOffer.filter((id) => id !== lawId);
  run.lawStacks ??= Object.fromEntries((run.lawIds || []).map((id) => [id, 1]));
  run.lawStacks[lawId] = Math.min(5, (Number(run.lawStacks[lawId]) || 0) + 1);
  if (!run.lawIds.includes(lawId)) run.lawIds.push(lawId);
  for (const mechanic of runLawMechanics(run, "residualChoice")) {
    const gain = Math.max(0, Number(mechanic.params.gain) || 0) * Math.max(1, unchosenLawIds.length);
    run.tempAttack = (Number(run.tempAttack) || 0) + gain;
    run.tempDefense = (Number(run.tempDefense) || 0) + gain;
    run.tempSense = (Number(run.tempSense) || 0) + gain;
    run.lastLawEvent = { lawId: mechanic.lawId, lawName: mechanic.lawName, text: `吸收 ${unchosenLawIds.length} 份残悟，攻防神识各提高 ${Math.round(gain * 1000) / 10}%` };
  }
  run.lawOffer = [];
  return { law: daoTrialLawMap[lawId], run };
}

function rerollTrialLaws(state, run) {
  if (!run.lawOffer?.length) throw new Error("当前没有可重观的问道法则");
  const fateReroll = runLawMechanics(run, "freeReroll")[0];
  const offerKey = `${run.floor}`;
  const fateFree = Boolean(fateReroll && run.fateRerollUsedOfferKey !== offerKey);
  if (fateFree) {
    run.fateRerollUsedOfferKey = offerKey;
    run.insight += Math.max(0, Math.floor(Number(fateReroll.params.insight) || 0));
    run.lastLawEvent = { lawId: fateReroll.lawId, lawName: fateReroll.lawName, text: "本次法则重观不消耗悟机" };
  } else if (run.freeRerolls > 0) run.freeRerolls -= 1;
  else {
    if (run.insight <= 0) throw new Error("悟机不足");
    run.insight -= 1;
  }
  run.lawNonce += 1;
  run.lawOffer = lawOfferForRun(state, run, daoTrialRouteMap[run.routeId], run.lawNonce);
  return { lawOffer: run.lawOffer.map((id) => daoTrialLawMap[id]) };
}

function continueTrialCheckpoint(state, run) {
  if (!run.checkpointPending) throw new Error("当前不在阶段检查点");
  const hpBefore = run.combatant.hp;
  const manaBefore = run.combatant.mana;
  run.combatant.hp = clamp(
    run.combatant.hp + Math.floor(run.combatant.maxHp * daoTrialCheckpointRecovery.hp),
    1,
    run.combatant.maxHp
  );
  run.combatant.mana = clamp(
    run.combatant.mana + Math.floor(run.combatant.maxMana * daoTrialCheckpointRecovery.mana),
    0,
    run.combatant.maxMana
  );
  run.lastCheckpointRecovery = {
    floor: run.checkpointFloor,
    hp: run.combatant.hp - hpBefore,
    mana: run.combatant.mana - manaBefore
  };
  run.checkpointPending = false;
  run.checkpointFloor = 0;
  run.nodeIndex += 1;
  run.floor = run.nodeIndex + 1;
  if (run.nodeIndex >= run.nodes.length) {
    run.nodes = daoTrialNodesForCycle(run.routeId, run.cycle, run.nodes.length + 5);
    ensureTrialOpponents(state, run);
  }
  return run;
}

function rerollTrialSeals(state, run) {
  if (!run.pendingSealIds.length) throw new Error("当前没有可重观的道印");
  if (run.freeRerolls > 0) run.freeRerolls -= 1;
  else {
    if (run.insight <= 0) throw new Error("悟机不足");
    run.insight -= 1;
  }
  run.sealNonce += 1;
  run.pendingSealIds = sealOfferForRun(state, run, daoTrialRouteMap[run.routeId], run.sealNonce);
  return { sealOffer: run.pendingSealIds.map((id) => daoTrialSealMap[id]) };
}

function useTrialLifeHeal(run) {
  if (!run.lifeHealAvailable) throw new Error("本轮没有可用的回春符");
  const buffs = combinedTrialBuffs(run);
  const hpMultiplier = Math.max(0.01, 1 + Number(buffs.maxHp || 0));
  const maxHp = Math.max(1, Math.floor(run.combatant.maxHp * hpMultiplier));
  const currentHp = Math.floor(run.combatant.hp * hpMultiplier);
  if (currentHp >= maxHp) throw new Error("当前血量充盈，无需使用回春符");
  const healedHp = Math.min(maxHp, currentHp + Math.floor(maxHp * 0.2));
  run.combatant.hp = clamp(Math.floor(healedHp / hpMultiplier), 1, run.combatant.maxHp);
  run.lifeHealAvailable = false;
  return { healed: healedHp - currentHp, run };
}

function useTrialCompanionSupport(run) {
  if (!run.companion) throw new Error("本轮没有同行者");
  if (run.companion.supportUsed) throw new Error("本轮同行支援已经使用");
  const active = run.companion.support?.active;
  const companionBuff = Number(combinedTrialBuffs(run).companion) || 0;
  const affixPenalty = Number(daoTrialCycleAffixes.find((item) => item.id === run.affixId)?.effects?.companionPenalty || 0);
  const potency = (Number(run.companion.support?.potency) || 0.03) * Math.max(0.5, 1 + companionBuff - affixPenalty);
  const baseHp = run.combatant.maxHp;
  const baseMana = run.combatant.maxMana;
  if (active?.id === "break-array") {
    run.tempAttack = (Number(run.tempAttack) || 0) + potency * 1.5;
    run.tempSense = (Number(run.tempSense) || 0) + potency;
  } else if (active?.id === "read-opening") {
    run.insight += 2;
    run.tempSense = (Number(run.tempSense) || 0) + potency * 1.5;
  } else if (active?.id === "shared-strike") {
    run.combatant.mana = clamp(run.combatant.mana + Math.floor(baseMana * 0.12), 0, baseMana);
    run.tempAttack = (Number(run.tempAttack) || 0) + potency;
  } else if (active?.id === "guard-heart") {
    run.combatant.hp = clamp(run.combatant.hp + Math.floor(baseHp * 0.14), 1, baseHp);
    run.tempDefense = (Number(run.tempDefense) || 0) + potency;
  } else if (active?.id === "quiet-counsel") {
    run.insight += 1;
    run.combatant.mana = clamp(run.combatant.mana + Math.floor(baseMana * 0.18), 0, baseMana);
  } else {
    run.combatant.hp = clamp(run.combatant.hp + Math.floor(baseHp * 0.14), 1, baseHp);
    run.combatant.mana = clamp(run.combatant.mana + Math.floor(baseMana * 0.1), 0, baseMana);
  }
  run.companion.supportUsed = true;
  return { support: active || { name: "同行支援" }, run };
}

function trialCompanionBattlePlan(run, monster) {
  const snapshot = run.companionSnapshot;
  if (!snapshot || !run.companion) return null;
  const buffs = combinedTrialBuffs(run);
  const copiedBuff = Math.max(0, Number(buffs.companionCopy) || 0)
    * Math.max(0, Number(buffs.attack || 0) + Number(buffs.defense || 0) + Number(buffs.skillPower || 0));
  const powerBonus = 1 + Math.max(0, Number(buffs.companionPower) || 0) + copiedBuff;
  const interval = clamp(4 + Math.floor(Number(buffs.companionFrequency) || 0), 2, 4);
  if (snapshot.type === "assault") {
    const raw = (Number(snapshot.attack) * 0.42 + Number(snapshot.divineSense) * 0.24) * Number(snapshot.powerFactor || 1) * powerBonus;
    return { name: snapshot.person.name, type: "assault", interval, damage: Math.max(1, Math.min(Math.floor(monster.maxHp * 0.08), Math.floor(raw))) };
  }
  const healing = Math.max(1, Math.floor((Number(snapshot.defense) * 0.22 + Number(snapshot.divineSense) * 0.13) * powerBonus));
  const shields = Math.max(1, Math.floor(Number(snapshot.defense) * 0.3 * powerBonus));
  return { name: snapshot.person.name, type: "sustain", interval, healing, shields };
}

function resolveTrialBattle(state, run, node) {
  const route = daoTrialRouteMap[run.routeId];
  const opponent = trialOpponentFor(state, run, node);
  if (!opponent) return { completed: true, summary: finishDaoTrialRun(state, run, true, "群修尽出") };
  const trialCompanion = trialCompanionBattlePlan(run, opponent);
  const trialBuffs = combinedTrialBuffs(run);
  trialBuffs.attack = (trialBuffs.attack || 0) + Math.max(0, Number(run.nextBattleAttack) || 0);
  const fighter = { ...run.combatant, trialBuffs };
  run.nextBattleAttack = 0;
  const beforeStats = combatSnapshot(fighter, state);
  const seed = `${run.seed}|node|${run.nodeIndex}|${run.sealIds.join(",")}`;
  // `run.combatant` stores the persistent base-space hp/mana ratio. Passing the
  // already-buffed snapshot here would make combatSnapshot apply maxHp/maxMana
  // modifiers a second time whenever the fighter is not at full resources.
  const battle = fightMonster(state, fighter, opponent, node.rounds, {
    hp: run.combatant.hp,
    mana: run.combatant.mana,
    seed,
    trialCompanion
  });
  const won = battle.winner === "left";
  const replay = buildReplay({ ...fighter, hp: beforeStats.hp, mana: beforeStats.mana }, opponent, battle, won ? "胜" : "负", timestampKey(), state);
  replay.kind = "dao-trial";
  replay.day = state.day;
  replay.replayId = makeReplayId("dao-trial", run.cycle, run.attempt, route.id, node.id);
  queueBattleReplay(state, replay, run.id);
  const baseHp = run.combatant.maxHp;
  const baseMana = run.combatant.maxMana;
  // Store the nearest base-space resource value. Flooring here introduces a
  // systematic one-point loss whenever a buffed battle snapshot is converted
  // back after combat, which compounds over a long trial run.
  run.combatant.hp = clamp(Math.round(battle.leftHp / Math.max(1, beforeStats.maxHp) * baseHp), 1, baseHp);
  run.combatant.mana = clamp(Math.round(battle.leftMana / Math.max(1, beforeStats.maxMana) * baseMana), 0, baseMana);
  run.lastReplayId = replay.replayId;
  const metrics = trialBattleMetrics(battle, beforeStats, node.rounds);
  run.combatStats.battles += 1;
  for (const key of ["rounds", "damageDealt", "damageTaken", "healing", "shields", "skillCasts", "manaSpent"]) run.combatStats[key] += Number(metrics[key]) || 0;
  run.combatStats.lawTriggers += battle.events.filter((event) => event.kind === "law").length;
  for (const key of ["damage", "healing", "shields", "control", "assists"]) run.companionContribution[key] += Number(battle.companionContribution?.[key]) || 0;
  const opponentResult = {
    kind: opponent.kind || "npc",
    npcId: opponent.kind === "monster" ? "" : opponent.id,
    name: opponent.name,
    sect: opponent.sect,
    realm: opponent.realm,
    floor: Number(node.floor) || run.nodeIndex + 1,
    playerWon: won,
    replayId: replay.replayId
  };
  run.opponentResults.unshift(opponentResult);
  run.opponentResults = run.opponentResults.slice(0, 80);
  run.lastBattle = { nodeId: node.id, won, replayId: replay.replayId, opponent: opponentResult, metrics };
  if (opponent.kind === "monster") recordDaoTrialMonsterBattle(state, run, node, opponent, won, replay.replayId);
  else recordDaoTrialNpcBattle(state, run, node, opponent, won, replay.replayId);
  if (!won) {
    if (opponent.kind !== "monster") run.defeatedByOpponentId = opponent.id;
    const failureSpirit = Number(daoTrialCycleAffixes.find((item) => item.id === run.affixId)?.effects?.failureSpirit || 0);
    if (failureSpirit) state.player.spirit = Math.max(0, state.player.spirit - failureSpirit);
    const summary = finishDaoTrialRun(state, run, false, `止步${node.name}`);
    return { replay: publicReplay(replay), completed: true, summary };
  }
  run.nodesCleared += 1;
  run.maxFloor = Math.max(Number(run.maxFloor) || 0, Number(node.floor) || run.nodeIndex + 1);
  if (node.elite) run.eliteCleared = true;
  if (node.boss) run.bossCleared = true;
  recordTrialNodeScore(run, node, {
    ...metrics,
    battle: true,
    tactical: clamp(((run.lawIds?.length || 0) + activeTrialSynergies(run).length + (run.companion ? 1 : 0)) / 5, 0, 1),
    riskMultiplier: (Number(node.floor) || 0) > daoTrialCoreFloorCount ? 0.05 + Math.floor(((Number(node.floor) || 16) - 16) / 5) * 0.01 : 0
  });
  const battleReward = addTrialBattleReward(run, node);
  const reward = trialMilestoneReward(state, run, node);
  if (node.elite) {
    const eliteScore = Number(daoTrialCycleAffixes.find((item) => item.id === run.affixId)?.effects?.eliteScore || 0);
    run.bonusScore = (Number(run.bonusScore) || 0) + Math.round(100 * eliteScore);
  }
  for (const mechanic of runLawMechanics(run)) {
    if (mechanic.action === "battleMomentum") {
      const cap = Math.max(0, Number(mechanic.params.cap) || 0);
      run.tempAttack = Math.min(cap, (Number(run.tempAttack) || 0) + Math.max(0, Number(mechanic.params.gain) || 0));
      run.lastLawEvent = { lawId: mechanic.lawId, lawName: mechanic.lawName, text: `胜利积累战意，整轮攻击提高至 ${Math.round(run.tempAttack * 1000) / 10}%` };
    } else if (mechanic.action === "fortune") {
      run.fortune = Math.min(Math.max(0, Math.floor(Number(mechanic.params.cap) || 0)), (Number(run.fortune) || 0) + Math.max(1, Math.floor(Number(mechanic.params.gain) || 1)));
      run.bonusScore = (Number(run.bonusScore) || 0) + Math.max(1, Math.floor(Number(mechanic.params.gain) || 1)) * 5;
      run.lastLawEvent = { lawId: mechanic.lawId, lawName: mechanic.lawName, text: `胜利积累命数至 ${run.fortune} 层` };
    }
  }
  const buffs = combinedTrialBuffs(run);
  run.combatant.hp = clamp(run.combatant.hp + Math.floor(baseHp * (Number(buffs.postBattleHeal) || 0)), 1, baseHp);
  run.combatant.mana = clamp(run.combatant.mana + Math.floor(baseMana * (Number(buffs.postBattleMana) || 0)), 0, baseMana);
  const missingHp = Math.max(0, baseHp - run.combatant.hp);
  if (missingHp && Number(buffs.missingHpHeal)) {
    run.combatant.hp = clamp(run.combatant.hp + Math.floor(missingHp * Number(buffs.missingHpHeal)), 1, baseHp);
    run.combatStats.lawTriggers += 1;
  }
  const nextBattleAttack = Math.max(0, Number(combinedTrialBuffs(run).nextBattleAttack) || 0);
  if (nextBattleAttack) run.nextBattleAttack = Math.max(Number(run.nextBattleAttack) || 0, nextBattleAttack);
  run.tempSense = 0;
  if (node.checkpoint || node.boss) {
    run.checkpointPending = true;
    run.checkpointFloor = Number(node.floor) || run.nodeIndex + 1;
    run.lawOffer = lawOfferForRun(state, run, route, ++run.lawNonce);
    return { replay: publicReplay(replay), completed: false, checkpoint: true, reward, battleReward, run: publicTrialRun(state, run) };
  }
  run.pendingSealIds = sealOfferForRun(state, run, route, run.sealNonce);
  run.advanceAfterSeal = true;
  return { replay: publicReplay(replay), completed: false, reward, battleReward };
}

export function advanceDaoTrial(state, payload = {}) {
  ensureDaoTrialState(state);
  const run = state.daoTrial.activeRun;
  if (!run) throw new Error("当前没有进行中的问道秘境");
  if (run.lawOffer?.length) {
    if (payload.action === "reroll-law") return rerollTrialLaws(state, run);
    if (payload.action !== "law") throw new Error("请先选择一项问道法则");
    return chooseTrialLaw(run, payload.lawId);
  }
  if (run.checkpointPending) {
    if (payload.action === "checkpoint-exit") {
      return { completed: true, summary: finishDaoTrialRun(state, run, true, `第${run.checkpointFloor}层收功`) };
    }
    if (payload.action === "continue") return { completed: false, run: publicTrialRun(state, continueTrialCheckpoint(state, run)) };
    throw new Error("请选择继续问道或在阶段检查点收功");
  }
  if (payload.action === "abandon") {
    if (run.nodesCleared < 5 || run.pendingSealIds.length) throw new Error("至少完成前五层并处理当前道印后，方可收功离境");
    return { completed: true, summary: finishDaoTrialRun(state, run, false, "主动离境") };
  }
  if (payload.action === "reroll") return rerollTrialSeals(state, run);
  if (payload.action === "companion") return useTrialCompanionSupport(run);
  if (payload.action === "life-heal") return useTrialLifeHeal(run);
  if (run.pendingSealIds.length) {
    if (payload.action !== "seal") throw new Error("请先选择一道道印");
    return chooseTrialSeal(state, run, payload.sealId);
  }
  const route = daoTrialRouteMap[run.routeId];
  const node = (run.nodes?.length ? run.nodes : route?.nodes)?.[run.nodeIndex];
  if (!node) throw new Error("问道路线状态异常");
  if (node.type === "battle") return resolveTrialBattle(state, run, node);
  const option = (daoTrialEventOptions[node.event] || []).find((item) => item.id === payload.optionId);
  if (!option) throw new Error("未知的问道选择");
  applyTrialEventEffects(state, run, node, option.effects);
  run.nodesCleared += 1;
  run.maxFloor = Math.max(Number(run.maxFloor) || 0, Number(node.floor) || run.nodeIndex + 1);
  recordTrialNodeScore(run, node, {
    riskMultiplier: (Number(option.effects?.hp) || 0) < 0 ? Math.min(0.18, Math.abs(Number(option.effects.hp))) : 0
  });
  if (!run.pendingSealIds.length) run.nodeIndex += 1;
  run.floor = run.nodeIndex + 1;
  return { option, run: publicTrialRun(state, run) };
}

export function abandonDaoTrial(state) {
  return advanceDaoTrial(state, { action: "abandon" });
}

export function createDefaultState() {
  const rootSet = randomRootSet();
  const root = rootSet.primaryRoot;
  const stats = rollBirthStats();
  const innate = rollInnateStats();
  const skillId = randomSkillId();
  const openingLog = rootSet.roots.length > 1
    ? `你在山脚租下一间小屋，翻开第一卷长生札记。本世灵根为${rootSetNameLine(rootSet)}。`
    : `你在山脚租下一间小屋，翻开第一卷长生札记。本世灵根为${root.name}。`;
  const openingDate = dateKey();
  const openingEntry = { text: openingLog, type: "", day: 0, date: openingDate, time: "初入" };

  return {
    day: 0,
    rebirth: 1,
    manaBalanceVersion,
    xpModeVersion,
    player: {
      id: "player",
      name: "李昕纾",
      gender: "female",
      potentialRealm: defaultPlayerPotentialRealm,
      potentialSource: "generated",
      talent: createTalent({ id: "player", name: "李昕纾", potentialRealm: defaultPlayerPotentialRealm }),
      root,
      roots: rootSet.roots,
      primaryRootKey: rootSet.primaryRootKey,
      realm: 0,
      xp: 0,
      hp: effectiveMaxHp({ root, maxHp: stats.maxHp }),
      maxHp: stats.maxHp,
      mana: effectiveMaxMana({ root, maxMana: stats.maxMana }),
      maxMana: stats.maxMana,
      skillId,
      skillRanks: { [skillId]: 1 },
      lastSkillUpgradeDay: 0,
      spiritPearls: createSpiritPearlState(),
      breakthroughAttemptsToday: 0,
      elixirEffects: defaultElixirEffects(),
      spirit: 80,
      reputation: 0,
      body: innate.body,
      wisdom: innate.wisdom,
      attack: stats.attack,
      defense: stats.defense,
      divineSense: stats.divineSense,
      chance: innate.chance,
      wealth: 0,
      heartDemon: innate.heartDemon,
      duelWins: 0,
      duelLosses: 0,
      duelSeason: defaultDuelSeason(),
      duelSeasonHistory: [],
      championDaoRhyme: null,
      dungeonClears: 0,
      bestDungeonPower: 0,
      bestDungeonName: "未入秘境",
      dungeonHistory: [],
      dailyRecords: [],
      breakthroughs: [],
      skillUpgrades: [],
      duelHistory: []
    },
    bag: emptyBag(),
    shop: { purchases: {}, permanentPurchases: {}, permanentUses: {} },
    spiritPearls: null,
    equipment: createEquipmentState(),
    equipmentVersion,
    equipmentTransfers: [],
    dungeonRecordVersion,
    storageCompactionVersion,
    battleArchives: { version: battleArchiveVersion, intervalDays: battleArchiveIntervalDays, summaries: [] },
    dungeonDays: [],
    starSeaCycle: null,
    starSeaCycleHistory: [],
    rosterVersion,
    taskDefinitions: defaultRealityTasks(),
    taskCompletions: [],
    taskProgress: {},
    gameSettings: {
      taskDailyFullXpBudget: defaultTaskDailyFullXpBudget,
      battleReplaySpeed: defaultBattleReplaySpeed,
      dailyTickerSpeed: defaultDailyTickerSpeed
    },
    taskMultiplierRecords: [{ day: 0, date: openingDate, elixirMultiplier: 1, sectXpMultiplier: 1, totalMultiplier: 1 }],
    encounters: {
      version: encounterStateVersion,
      lastGenerationDay: 0,
      nextGenerationDay: encounterMinGapDays + 1,
      emptyDays: 0,
      pending: [],
      history: [],
      seen: {},
      chains: {},
      focusedNpcIds: []
    },
    relationships: {},
    daoTrial: createDaoTrialState(1),
    dailyRootFortune: createDailyRootFortuneState({ calendarStartDate: openingDate, lastSettlementDate: openingDate, day: 0 }, 0),
    npcs: npcNames.map((name, index) => makeNpc(name, index)),
    sectNameMap: {},
    sect: {
      name: "落云宗",
      reputation: 20,
      supplies: 80,
      rivalHeat: 18,
      warWins: 0,
      warLosses: 0
    },
    sectRivals: Object.fromEntries(sects.map((name, index) => [name, makeSectStatus(name, index)])),
    sectProfiles: Object.fromEntries(sects.map((name) => [name, { name, portraitUrl: "", leaderId: "", elderIds: [] }])),
    playerSectPlan: defaultPlayerSectPlan(2),
    sectFatigue: {},
    sectFatiguePrevious: {},
    sectSiegeDuty: {},
    provinceVersion,
    provinces: createNeutralProvinceState(),
    provinceWars: [],
    provinceIncomeLog: [],
    duelDays: [],
    duelTournament: null,
    duelTournamentHistory: [],
    calendarStartDate: openingDate,
    lastSettlementDate: openingDate,
    log: [openingEntry],
    logDays: [{ day: 0, date: openingDate, logs: [openingEntry] }]
  };
}

export function clearProgressHistory(state) {
  const resetPerson = (person) => {
    person.duelWins = 0;
    person.duelLosses = 0;
    person.duelSeason = defaultDuelSeason(state.day);
    person.duelSeasonHistory = [];
    person.championDaoRhyme = null;
    person.duelHistory = [];
    person.dungeonClears = 0;
    person.bestDungeonPower = 0;
    person.bestDungeonName = "未入秘境";
    person.dungeonHistory = [];
    person.dailyRecords = [];
    person.breakthroughs = [];
    person.skillUpgrades = [];
    person.spiritPearls = createSpiritPearlState();
  };

  resetPerson(state.player);
  state.spiritPearls = state.player.spiritPearls;
  for (const npc of state.npcs || []) resetPerson(npc);
  state.duelDays = [];
  state.duelTournament = null;
  state.duelTournamentHistory = [];
  state.provinces = createNeutralProvinceState();
  state.provinceVersion = provinceVersion;
  state.provinceWars = [];
  state.provinceIncomeLog = [];
  state.equipment = createEquipmentState();
  state.equipmentVersion = equipmentVersion;
  state.equipmentTransfers = [];
  state.dungeonRecordVersion = dungeonRecordVersion;
  state.battleArchives = { version: battleArchiveVersion, intervalDays: battleArchiveIntervalDays, summaries: [] };
  state.dungeonDays = [];
  state.starSeaCycle = null;
  state.starSeaCycleHistory = [];
  state.taskDefinitions = defaultRealityTasks();
  state.taskCompletions = [];
  state.taskMultiplierRecords = [taskMultiplierSnapshot(state, state.day)];
  state.encounters = {
    version: encounterStateVersion,
    lastGenerationDay: state.day - 1,
    emptyDays: 0,
    pending: [],
    history: [],
    seen: {},
    chains: {},
    focusedNpcIds: []
  };
  state.relationships = {};
  state.daoTrial = createDaoTrialState(state.day);
  state.dailyRootFortune = createDailyRootFortuneState(state, state.day);
  state.player.sect = state.sect?.name || "落云宗";
  state.sect.warWins = 0;
  state.sect.warLosses = 0;
  return state;
}

function copyCultivatorProfile(target, source) {
  if (!target || !source) return;
  if (source.name) target.name = source.name;
  if (source.gender) target.gender = source.gender;
  if (source.sect) target.sect = source.sect;
  if (source.portraitUrl !== undefined) target.portraitUrl = source.portraitUrl;
  if (source.portraitVariant !== undefined) target.portraitVariant = source.portraitVariant;
  if (source.potentialRealm !== undefined && source.potentialRealm !== null && Number.isFinite(Number(source.potentialRealm))) {
    target.potentialRealm = source.potentialRealm;
  }
  if (source.potentialSource) target.potentialSource = source.potentialSource;
  if (source.talentOverride !== undefined) target.talentOverride = source.talentOverride;
  if (Array.isArray(source.roots) && source.roots.length) {
    target.roots = source.roots.map((root) => ({ ...root }));
    target.primaryRootKey = source.primaryRootKey || target.roots[0]?.key;
    target.root = { ...(target.roots.find((root) => root.key === target.primaryRootKey) || target.roots[0]) };
    applyRootSet(target);
  } else if (source.root?.key) {
    target.root = { ...source.root };
    target.roots = [{ ...source.root }];
    target.primaryRootKey = source.primaryRootKey || source.root.key;
    applyRootSet(target);
  }
}

function hasPersistedPotentialRealm(profile) {
  return profile?.potentialRealm !== undefined
    && profile?.potentialRealm !== null
    && Number.isFinite(Number(profile.potentialRealm));
}

function resetCultivatorProfile(adminProfile, entityProfile) {
  if (!adminProfile) return entityProfile;
  if (!entityProfile) return adminProfile;
  const hasAdminPotential = hasPersistedPotentialRealm(adminProfile);
  return {
    ...entityProfile,
    ...adminProfile,
    potentialRealm: hasAdminPotential ? adminProfile.potentialRealm : entityProfile.potentialRealm,
    potentialSource: hasAdminPotential
      ? (adminProfile.potentialSource || entityProfile.potentialSource)
      : entityProfile.potentialSource,
    talentOverride: Object.prototype.hasOwnProperty.call(adminProfile, "talentOverride")
      ? adminProfile.talentOverride
      : entityProfile.talentOverride
  };
}

function ensureAdminProfiles(state) {
  state.adminProfiles ??= {};
  state.adminProfiles.cultivators ??= {};
  state.adminProfiles.sects ??= {};
  state.adminProfiles.sectNameMap ??= {};
  return state.adminProfiles;
}

function cultivatorProfileSnapshot(entity) {
  if (!entity) return null;
  return {
    id: entity.id,
    name: entity.name,
    gender: entity.gender,
    sect: entity.sect,
    portraitUrl: entity.portraitUrl || "",
    portraitVariant: entity.portraitVariant || 0,
    root: entity.root ? { ...entity.root } : null,
    roots: (entity.roots || []).map((root) => ({ ...root })),
    primaryRootKey: entity.primaryRootKey || entity.root?.key || "",
    potentialRealm: potentialRealmFor(entity),
    potentialSource: entity.potentialSource || "generated",
    talentOverride: entity.talentOverride ?? null
  };
}

function rememberCultivatorProfile(state, entity) {
  const snapshot = cultivatorProfileSnapshot(entity);
  if (!snapshot?.id) return;
  ensureAdminProfiles(state).cultivators[snapshot.id] = snapshot;
}

function rememberSectProfiles(state) {
  const profiles = ensureAdminProfiles(state);
  profiles.sectNameMap = { ...(state.sectNameMap || {}) };
  profiles.playerSect = state.sect?.name || profiles.playerSect || "";
  for (const [name, profile] of Object.entries(state.sectProfiles || {})) {
    profiles.sects[name] = {
      name,
      portraitUrl: profile?.portraitUrl || "",
      leaderId: profile?.leaderId || "",
      elderIds: Array.isArray(profile?.elderIds) ? [...new Set(profile.elderIds.filter(Boolean))] : []
    };
  }
}

function resetOpeningLogForProfile(state) {
  const roots = normalizeRootSet(state.player);
  const rootText = roots.roots.length > 1 ? rootSetNameLine(roots) : roots.primaryRoot?.name || state.player.root?.name || "未知灵根";
  const openingEntry = {
    text: `你在山脚租下一间小屋，翻开第一卷长生札记。本世灵根为${rootText}。`,
    type: "",
    day: 0,
    date: dateKey(),
    time: "初入"
  };
  state.log = [openingEntry];
  state.logDays = [{ day: 0, date: openingEntry.date, logs: [openingEntry] }];
}

function rebuildSectProfilesForReset(state, previousState) {
  const adminProfiles = previousState?.adminProfiles || {};
  state.sectNameMap = { ...(previousState?.sectNameMap || {}), ...(adminProfiles.sectNameMap || {}) };
  state.sectProfiles = {};
  const previousProfiles = { ...(previousState?.sectProfiles || {}), ...(adminProfiles.sects || {}) };

  for (const [index, baseName] of sects.entries()) {
    const currentName = currentSectName(state, baseName);
    if (baseName !== currentName && state.sectRivals[baseName]) {
      state.sectRivals[currentName] = { ...state.sectRivals[baseName], name: currentName };
      delete state.sectRivals[baseName];
    }
    if (!state.sectRivals[currentName] && currentName !== state.sect.name) {
      state.sectRivals[currentName] = makeSectStatus(currentName, index);
    }
    state.sectProfiles[currentName] = {
      name: currentName,
      portraitUrl: previousProfiles[currentName]?.portraitUrl || previousProfiles[baseName]?.portraitUrl || "",
      leaderId: previousProfiles[currentName]?.leaderId || previousProfiles[baseName]?.leaderId || "",
      elderIds: Array.isArray(previousProfiles[currentName]?.elderIds)
        ? previousProfiles[currentName].elderIds
        : Array.isArray(previousProfiles[baseName]?.elderIds) ? previousProfiles[baseName].elderIds : []
    };
  }

  for (const [name, profile] of Object.entries(previousProfiles)) {
    if (!name) continue;
    state.sectProfiles[name] = {
      name,
      portraitUrl: profile?.portraitUrl || "",
      leaderId: profile?.leaderId || "",
      elderIds: Array.isArray(profile?.elderIds) ? [...new Set(profile.elderIds.filter(Boolean))] : []
    };
  }
}

export function preserveProfilesForReset(state, previousState) {
  if (!previousState) return state;

  state.rebirth = Math.max(1, Math.floor(Number(previousState.rebirth) || 1) + 1);

  const previousAdminProfiles = previousState.adminProfiles || {};
  rebuildSectProfilesForReset(state, previousState);

  state.sect = {
    ...state.sect,
    name: previousAdminProfiles.playerSect || previousState.sect?.name || state.sect.name,
    warWins: 0,
    warLosses: 0
  };
  state.sectProfiles[state.sect.name] = {
    name: state.sect.name,
    portraitUrl: previousState.sectProfiles?.[state.sect.name]?.portraitUrl || state.sectProfiles[state.sect.name]?.portraitUrl || "",
    leaderId: previousState.sectProfiles?.[state.sect.name]?.leaderId || state.sectProfiles[state.sect.name]?.leaderId || "",
    elderIds: Array.isArray(previousState.sectProfiles?.[state.sect.name]?.elderIds)
      ? previousState.sectProfiles[state.sect.name].elderIds
      : state.sectProfiles[state.sect.name]?.elderIds || []
  };

  copyCultivatorProfile(
    state.player,
    resetCultivatorProfile(previousAdminProfiles.cultivators?.player, previousState.player)
  );
  state.player.sect = state.sect.name;
  ensureTalent(state.player, { rebirth: state.rebirth, reroll: true });
  rememberCultivatorProfile(state, state.player);

  const previousNpcMap = new Map((previousState.npcs || []).map((npc) => [npc.id, npc]));
  for (const npc of state.npcs || []) {
    const previousNpc = resetCultivatorProfile(
      previousAdminProfiles.cultivators?.[npc.id],
      previousNpcMap.get(npc.id)
    );
    copyCultivatorProfile(npc, previousNpc);
    ensureTalent(npc, { rebirth: state.rebirth, reroll: true });
    rememberCultivatorProfile(state, npc);
    if (npc.sect && !state.sectProfiles[npc.sect]) {
      state.sectProfiles[npc.sect] = {
        name: npc.sect,
        portraitUrl: previousState.sectProfiles?.[npc.sect]?.portraitUrl || "",
        leaderId: previousState.sectProfiles?.[npc.sect]?.leaderId || "",
        elderIds: Array.isArray(previousState.sectProfiles?.[npc.sect]?.elderIds) ? previousState.sectProfiles[npc.sect].elderIds : []
      };
    }
  }

  rememberSectProfiles(state);
  resetOpeningLogForProfile(state);
  return state;
}

function migrateRoster(state) {
  state.rosterVersion = rosterVersion;
  state.sect = {
    name: "落云宗",
    reputation: state.sect?.reputation ?? 20,
    supplies: state.sect?.supplies ?? 80,
    rivalHeat: state.sect?.rivalHeat ?? 18,
    warWins: 0,
    warLosses: 0
  };
  state.player.sect = state.sect.name;
  state.player.name = "李昕纾";
  state.player.gender = "female";
  state.npcs = npcNames.map((name, index) => makeNpc(name, index));
  state.sectRivals = Object.fromEntries(sects.map((name, index) => [name, makeSectStatus(name, index)]));
  state.sectNameMap ??= {};
  state.sectProfiles = Object.fromEntries(sects.map((name) => [name, {
    name,
    portraitUrl: state.sectProfiles?.[name]?.portraitUrl || "",
    leaderId: state.sectProfiles?.[name]?.leaderId || "",
    elderIds: Array.isArray(state.sectProfiles?.[name]?.elderIds) ? state.sectProfiles[name].elderIds : []
  }]));
  clearProgressHistory(state);
}

function migrateManaBalance(state) {
  if (Number(state.manaBalanceVersion) >= manaBalanceVersion) return false;
  for (const entity of [state.player, ...(state.npcs || [])]) {
    if (!entity) continue;
    const oldMaxMana = Number(entity.maxMana);
    if (!Number.isFinite(oldMaxMana) || oldMaxMana <= 0) continue;
    const oldMana = Number.isFinite(Number(entity.mana)) ? Number(entity.mana) : oldMaxMana;
    entity.maxMana = Math.max(1, Math.round(oldMaxMana * manaGrowthMultiplier));
    entity.mana = clamp(Math.round(oldMana * manaGrowthMultiplier), 0, entity.maxMana);
  }
  state.manaBalanceVersion = manaBalanceVersion;
  return true;
}

export function ensureStateShape(state) {
  let changed = false;
  if (state.realmTerminologyVersion !== realmTerminologyVersion) {
    const replaceLegacyRealmTerm = (value) => {
      if (typeof value === "string") return value.replaceAll("炼气", "练气");
      if (Array.isArray(value)) return value.map(replaceLegacyRealmTerm);
      if (value && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, replaceLegacyRealmTerm(entry)]));
      }
      return value;
    };
    const migratedState = replaceLegacyRealmTerm(state);
    Object.assign(state, migratedState);
    state.realmTerminologyVersion = realmTerminologyVersion;
    changed = true;
  }
  if (state.rosterVersion !== rosterVersion) {
    migrateRoster(state);
    changed = true;
  }
  if (!Number.isFinite(Number(state.rebirth)) || Number(state.rebirth) < 1) {
    state.rebirth = 1;
    changed = true;
  } else {
    state.rebirth = Math.floor(Number(state.rebirth));
  }
  if (!state.calendarStartDate) {
    state.calendarStartDate = addDays(state.lastSettlementDate || dateKey(), -Math.max(0, Number(state.day || 0)));
    changed = true;
  }
  const ensureDatedRecord = (record) => {
    if (record && !record.date) {
      record.date = stateDateForDay(state, record.day || state.day);
      return true;
    }
    return false;
  };
  const logBefore = JSON.stringify(state.log || []);
  state.log = (Array.isArray(state.log) ? state.log : [])
    .map((entry) => normalizeLogEntry(state, entry))
    .slice(0, flatLogLimit);
  if (JSON.stringify(state.log) !== logBefore) changed = true;
  if (!Array.isArray(state.logDays)) {
    state.logDays = buildLogDaysFromFlatLog(state);
    changed = true;
  } else {
    const logDaysBefore = JSON.stringify(state.logDays);
    state.logDays = trimLogDays(state.logDays, state);
    if (JSON.stringify(state.logDays) !== logDaysBefore) changed = true;
  }
  changed = ensureBattleArchiveState(state) || changed;
  changed = archiveExpiredBattleRecords(state) || changed;
  changed = ensureTaskSystem(state) || changed;
  const gameSettingsBefore = JSON.stringify(state.gameSettings || {});
  state.gameSettings = {
    taskDailyFullXpBudget: taskDailyFullXpBudget(state),
    battleReplaySpeed: battleReplaySpeed(state),
    dailyTickerSpeed: dailyTickerSpeed(state)
  };
  changed = changed || gameSettingsBefore !== JSON.stringify(state.gameSettings);
  if (Array.isArray(state.taskCompletions)) {
    for (const task of state.taskCompletions) changed = ensureDatedRecord(task) || changed;
  }
  if (Array.isArray(state.duelDays)) {
    for (const record of state.duelDays) changed = ensureDatedRecord(record) || changed;
  }
  if (Array.isArray(state.provinceWars)) {
    for (const record of state.provinceWars) changed = ensureDatedRecord(record) || changed;
  }
  if (needsRootMigration(state.player.root)) {
    state.player.root = normalizeRoot(state.player.root);
    changed = true;
  }
  const playerRootShape = JSON.stringify({ roots: state.player.roots, primaryRootKey: state.player.primaryRootKey, root: state.player.root });
  applyRootSet(state.player);
  if (JSON.stringify({ roots: state.player.roots, primaryRootKey: state.player.primaryRootKey, root: state.player.root }) !== playerRootShape) changed = true;
  state.player.id ??= "player";
  changed = ensureField(state.player, "name", "李昕纾") || changed;
  changed = ensureField(state.player, "gender", "female") || changed;
  changed = ensureTalent(state.player, { rebirth: state.rebirth }) || changed;
  state.sect ??= {
    name: state.player.sect || "落云宗",
    reputation: 20,
    supplies: 80,
    rivalHeat: 18,
    warWins: 0,
    warLosses: 0
  };
  state.player.sect = state.sect.name || state.player.sect || "落云宗";
  state.player.duelWins ??= 0;
  state.player.duelLosses ??= 0;
  state.player.lastBreakthroughDay ??= 0;
  changed = ensureField(state.player, "breakthroughAttemptsToday", 0) || changed;
  if (state.player.lastBreakthroughDay === state.day && state.player.breakthroughAttemptsToday <= 0) {
    state.player.breakthroughAttemptsToday = 1;
    changed = true;
  }
  if (state.player.lastBreakthroughDay !== state.day && state.player.breakthroughAttemptsToday !== 0) {
    state.player.breakthroughAttemptsToday = 0;
    changed = true;
  }
  if (!state.player.elixirEffects) {
    state.player.elixirEffects = defaultElixirEffects();
    changed = true;
  }
  normalizeElixirEffects(state);
  state.player.portraitVariant ??= 0;
  state.player.duelSeasonHistory ??= [];
  changed = normalizeDuelSeason(state.player, state.day) || changed;
  state.player.dungeonClears ??= 0;
  state.player.bestDungeonPower ??= 0;
  state.player.bestDungeonName ??= "未入秘境";
  state.player.dungeonHistory ??= [];
  state.player.dailyRecords ??= [];
  state.player.breakthroughs ??= [];
  state.player.skillUpgrades ??= [];
  state.player.duelHistory ??= [];
  for (const record of state.player.dailyRecords) changed = ensureDatedRecord(record) || changed;
  for (const record of state.player.breakthroughs) changed = ensureDatedRecord(record) || changed;
  for (const record of state.player.skillUpgrades) changed = ensureDatedRecord(record) || changed;
  if (needsSkillMigration(state.player.skillId)) {
    state.player.skillId = randomSkillId();
    changed = true;
  }
  changed = normalizeSkillState(state.player) || changed;
  let playerBirthStats;
  const playerBaseStats = () => {
    playerBirthStats ??= rollBirthStats(state.player.realm || 0);
    return playerBirthStats;
  };
  changed = ensureField(state.player, "divineSense", () => playerBaseStats().divineSense) || changed;
  changed = ensureField(state.player, "maxMana", () => playerBaseStats().maxMana) || changed;
  changed = ensureField(state.player, "attack", () => playerBaseStats().attack) || changed;
  changed = ensureField(state.player, "defense", () => playerBaseStats().defense) || changed;
  changed = ensureField(state.player, "maxHp", () => playerBaseStats().maxHp) || changed;
  if (state.player.attack <= state.player.defense) {
    state.player.attack = state.player.defense + rollRange([3, 5]);
    changed = true;
  }
  state.equipmentTransfers ??= [];
  changed = ensureEquipmentState(state) || changed;
  changed = ensureSpiritPearls(state) || changed;
  ensureDungeonState(state);
  if (state.starSeaCycle === undefined) {
    state.starSeaCycle = null;
    changed = true;
  }
  if (!Array.isArray(state.starSeaCycleHistory)) {
    state.starSeaCycleHistory = [];
    changed = true;
  } else if (state.starSeaCycleHistory.length > starSeaCycleHistoryLimit) {
    state.starSeaCycleHistory = state.starSeaCycleHistory
      .sort((a, b) => (b.cycle || 0) - (a.cycle || 0))
      .slice(0, starSeaCycleHistoryLimit);
    changed = true;
  }
  changed = refreshStarSeaCycleHistoryFromDungeonDays(state) || changed;
  changed = ensureField(state.player, "mana", () => effectiveMaxMana(state.player)) || changed;
  changed = ensureField(state.player, "hp", () => effectiveMaxHp(state.player)) || changed;
  state.player.hp = Math.min(state.player.hp, effectiveMaxHp(state.player, state));
  state.player.mana = Math.min(state.player.mana, effectiveMaxMana(state.player, state));
  state.sect.warWins ??= 0;
  state.sect.warLosses ??= 0;
  state.playerSectPlan = normalizePlayerSectPlan(
    state.playerSectPlan,
    state.playerSectPlan?.targetDay || (state.day + 1),
    attackTeamLimitForSect(state, state.sect.name)
  );
  const plannedTarget = state.playerSectPlan.attack.targetProvinceId
    ? provinceStateById(state, state.playerSectPlan.attack.targetProvinceId)
    : null;
  if (plannedTarget && (!plannedTarget.owner || plannedTarget.owner === state.sect.name)) {
    state.playerSectPlan.attack.targetProvinceId = "";
    state.playerSectPlan.attack.memberIds = [];
    changed = true;
  }
  state.sectFatigue ??= {};
  state.sectFatiguePrevious ??= {};
  state.sectSiegeDuty ??= {};
  state.shop ??= {};
  state.shop.purchases ??= {};
  state.shop.permanentPurchases ??= {};
  state.shop.permanentUses ??= {};
  const normalizedBag = emptyBag();
  const currentBag = state.bag || {};
  for (const id of Object.keys(normalizedBag)) normalizedBag[id] = Math.max(0, Math.floor(Number(currentBag[id]) || 0));
  if (JSON.stringify(state.bag || {}) !== JSON.stringify(normalizedBag)) {
    state.bag = normalizedBag;
    changed = true;
  }
  state.duelDays ??= [];
  state.duelDays = trimDuelDays(state.duelDays, state.day);
  if (!state.duelTournament || typeof state.duelTournament !== "object") {
    state.duelTournament = null;
    changed = true;
  }
  if (!Array.isArray(state.duelTournamentHistory)) {
    state.duelTournamentHistory = [];
    changed = true;
  }
  changed = ensureTournamentRewardState(state) || changed;
  if (!state.player.championDaoRhyme || state.player.championDaoRhyme.realm !== state.player.realm) {
    if (state.player.championDaoRhyme) changed = true;
    state.player.championDaoRhyme = null;
  }
  state.sectNameMap ??= {};
  state.sectRivals ??= {};
  for (const [index, name] of sects.entries()) {
    const currentName = currentSectName(state, name);
    if (!state.sectRivals[currentName] && currentName !== state.sect.name) {
      state.sectRivals[currentName] = makeSectStatus(currentName, index);
      changed = true;
    }
  }
  state.sectProfiles ??= {};
  for (const name of new Set([...sects.map((item) => currentSectName(state, item)), state.sect.name, ...Object.keys(state.sectRivals)])) {
    if (!name) continue;
    if (!state.sectProfiles[name]) {
      state.sectProfiles[name] = { name, portraitUrl: "", leaderId: "", elderIds: [] };
      changed = true;
    } else {
      state.sectProfiles[name].name = name;
      state.sectProfiles[name].portraitUrl ??= "";
      state.sectProfiles[name].leaderId ??= "";
      if (!Array.isArray(state.sectProfiles[name].elderIds)) state.sectProfiles[name].elderIds = [];
    }
  }
  if (!Array.isArray(state.npcs)) {
    state.npcs = [];
    changed = true;
  }
  if (state.npcs.length < npcNames.length) {
    const restoredNpcs = [...state.npcs];
    for (let index = 0; index < npcNames.length; index += 1) {
      if (!restoredNpcs[index]) {
        restoredNpcs[index] = makeNpc(npcNames[index], index);
        changed = true;
      }
    }
    state.npcs = restoredNpcs;
  }
  state.npcs = state.npcs.map((npc, index) => {
    const full = { ...npc };
    full.id ??= `npc-${index}`;
    if (needsRootMigration(full.root)) {
      full.root = normalizeRoot(full.root);
      changed = true;
    }
    const npcRootShape = JSON.stringify({ roots: full.roots, primaryRootKey: full.primaryRootKey, root: full.root });
    applyRootSet(full);
    if (JSON.stringify({ roots: full.roots, primaryRootKey: full.primaryRootKey, root: full.root }) !== npcRootShape) changed = true;
    changed = ensureField(full, "name", npcNames[index] || `散修${index + 1}`) || changed;
    changed = ensureField(full, "gender", () => npcGenders[full.name] || "male") || changed;
    changed = ensureField(full, "sect", sectForNpcIndex(index)) || changed;
    changed = ensureField(full, "root", () => normalizeRoot(pick(roots))) || changed;
    changed = ensureField(full, "realm", () => Math.floor(Math.random() * 4)) || changed;
    changed = ensureTalent(full, { rebirth: state.rebirth }) || changed;
    changed = ensureField(full, "xp", () => Math.floor(Math.random() * 90)) || changed;
    let npcBirthStats;
    const npcBaseStats = () => {
      npcBirthStats ??= rollBirthStats(full.realm || 0);
      return npcBirthStats;
    };
    changed = ensureField(full, "maxHp", () => npcBaseStats().maxHp) || changed;
    changed = ensureField(full, "hp", () => effectiveMaxHp(full)) || changed;
    changed = ensureField(full, "maxMana", () => npcBaseStats().maxMana) || changed;
    changed = ensureField(full, "mana", () => effectiveMaxMana(full)) || changed;
    if (needsSkillMigration(full.skillId)) {
      full.skillId = randomSkillId();
      changed = true;
    }
    changed = normalizeSkillState(full) || changed;
    changed = ensureField(full, "spirit", () => 30 + Math.floor(Math.random() * 90)) || changed;
    changed = ensureField(full, "reputation", () => Math.floor(Math.random() * 28)) || changed;
    changed = ensureField(full, "body", () => 7 + Math.floor(Math.random() * 7)) || changed;
    changed = ensureField(full, "wisdom", () => 7 + Math.floor(Math.random() * 8)) || changed;
    changed = ensureField(full, "attack", () => npcBaseStats().attack) || changed;
    changed = ensureField(full, "defense", () => npcBaseStats().defense) || changed;
    changed = ensureField(full, "divineSense", () => npcBaseStats().divineSense) || changed;
    if (full.attack <= full.defense) {
      full.attack = full.defense + rollRange([3, 5]);
      changed = true;
    }
    changed = ensureField(full, "chance", () => 4 + Math.floor(Math.random() * 8)) || changed;
    changed = ensureField(full, "wealth", 0) || changed;
    changed = ensureField(full, "heartDemon", () => Math.floor(Math.random() * 8)) || changed;
    changed = ensureField(full, "mood", () => pick(["谨慎", "好斗", "闭关", "游历"])) || changed;
    changed = ensureField(full, "dailyRecords", []) || changed;
    changed = ensureField(full, "breakthroughs", []) || changed;
    changed = ensureField(full, "skillUpgrades", []) || changed;
    changed = ensureField(full, "duelHistory", []) || changed;
    for (const record of full.dailyRecords) changed = ensureDatedRecord(record) || changed;
    for (const record of full.breakthroughs) changed = ensureDatedRecord(record) || changed;
    for (const record of full.skillUpgrades) changed = ensureDatedRecord(record) || changed;
    changed = ensureField(full, "duelWins", () => Math.floor(Math.random() * 6)) || changed;
    changed = ensureField(full, "duelLosses", () => Math.floor(Math.random() * 4)) || changed;
    changed = ensureField(full, "lastBreakthroughDay", 0) || changed;
    changed = ensureField(full, "duelSeasonHistory", []) || changed;
    changed = normalizeDuelSeason(full, state.day) || changed;
    changed = ensureField(full, "dungeonClears", () => Math.floor(Math.random() * 5)) || changed;
    changed = ensureField(full, "bestDungeonPower", () => Math.floor(Math.random() * 90)) || changed;
    changed = ensureField(full, "bestDungeonName", () => full.bestDungeonPower > 65 ? "虚天殿" : full.bestDungeonPower > 0 ? "血色禁地" : "未入秘境") || changed;
    changed = ensureField(full, "daoTrialDefenses", 0) || changed;
    changed = ensureField(full, "daoTrialWins", 0) || changed;
    changed = ensureField(full, "daoTrialRewards", () => ({ xp: 0, spirit: 0, dust: 0 })) || changed;
    full.daoTrialDefenses = Math.max(0, Math.floor(Number(full.daoTrialDefenses) || 0));
    full.daoTrialWins = Math.max(0, Math.floor(Number(full.daoTrialWins) || 0));
    full.daoTrialRewards = {
      xp: Math.max(0, Math.floor(Number(full.daoTrialRewards?.xp) || 0)),
      spirit: Math.max(0, Math.floor(Number(full.daoTrialRewards?.spirit) || 0)),
      dust: Math.max(0, Math.floor(Number(full.daoTrialRewards?.dust) || 0))
    };
    changed = ensureField(full, "dungeonHistory", []) || changed;
    changed = ensureSpiritPearls(state, full) || changed;
    full.hp = Math.min(full.hp, effectiveMaxHp(full, state));
    full.mana = Math.min(full.mana, effectiveMaxMana(full, state));
    return full;
  });
  changed = migrateManaBalance(state) || changed;
  const adminProfiles = ensureAdminProfiles(state);
  adminProfiles.playerSect ||= state.sect.name;
  const playerProfile = adminProfiles.cultivators.player;
  if (!playerProfile
    || !hasPersistedPotentialRealm(playerProfile)
    || Number(playerProfile.potentialRealm) !== potentialRealmFor(state.player)
    || playerProfile.talentOverride !== (state.player.talentOverride ?? null)) {
    rememberCultivatorProfile(state, state.player);
    changed = true;
  }
  for (const npc of state.npcs || []) {
    const profile = adminProfiles.cultivators[npc.id];
    if (!profile
      || !hasPersistedPotentialRealm(profile)
      || Number(profile.potentialRealm) !== potentialRealmFor(npc)
      || profile.talentOverride !== (npc.talentOverride ?? null)) {
      rememberCultivatorProfile(state, npc);
      changed = true;
    }
  }
  if (!Object.keys(adminProfiles.sects).length) {
    rememberSectProfiles(state);
    changed = true;
  }
  changed = repairDuelSeasonFromRecords(state) || changed;
  if (state.duelDays.length) {
    syncDuelDayRecords(state);
    changed = true;
  }
  if (state.xpModeVersion !== xpModeVersion) {
    migrateEntityTotalXp(state.player);
    for (const npc of state.npcs || []) migrateEntityTotalXp(npc);
    state.xpModeVersion = xpModeVersion;
    changed = true;
  }
  changed = ensureProvinceState(state) || changed;
  changed = ensureEncounterState(state) || changed;
  changed = ensureDaoTrialState(state) || changed;
  changed = ensureDailyRootFortuneState(state) || changed;
  return changed;
}

function powerOfStats(stats = {}) {
  return Math.floor(
    (Number(stats.attack) || 0) * 2.8 +
    (Number(stats.defense) || 0) * 2 +
    (Number(stats.maxHp) || 0) * 0.42 +
    (Number(stats.divineSense) || 0) * 1.35 +
    (Number(stats.maxMana) || 0) * 0.55
  );
}

export function powerOf(entity, state, options = {}) {
  return powerOfStats(effectiveCombatStats(entity, state, options));
}

export function compactStateForStorage(state, options = {}) {
  if (!options.skipBattleReplayCompaction) {
    if (!options.skipReplayCompaction) compactReplayFields(state);
    compactNonPlayerReplays(state);
    archiveExpiredBattleRecords(state);
  }
  for (const { entity, kind } of allCultivators(state)) {
    entity.dailyRecords = trimRecordsByDay(entity.dailyRecords || [], state.day, growthRecordDays, growthRecordLimit);
    entity.breakthroughs = trimRecordsByDay(entity.breakthroughs || [], state.day, growthRecordDays, growthRecordLimit);
    entity.skillUpgrades = trimRecordsByDay(entity.skillUpgrades || [], state.day, growthRecordDays, growthRecordLimit);
    entity.duelHistory = mergeDuelHistory(entity.duelHistory || [], state.day, detailRecordLimit);
    entity.dungeonHistory = trimRecordsByDay(
      entity.dungeonHistory || [],
      state.day,
      battleRecordDays,
      kind === "player" ? detailRecordLimit : npcDungeonHistoryLimit
    ).map(compactDungeonHistoryRecord);
  }
  state.duelDays = trimDuelDays(state.duelDays || [], state.day || 1);
  state.provinceWars = trimRecordsByDay(
    state.provinceWars || [],
    state.day || 1,
    publicBattleRecordDays,
    publicProvinceWarLimit
  ).map(compactProvinceWarRecord);
  state.dungeonDays = trimRecordsByDay(
    state.dungeonDays || [],
    state.day || 1,
    publicDungeonRecordDays,
    publicDungeonDayLimit
  ).map(compactDungeonDayRecord);
  state.starSeaCycleHistory = (state.starSeaCycleHistory || [])
    .sort((a, b) => (b.cycle || 0) - (a.cycle || 0))
    .slice(0, starSeaCycleHistoryLimit);
  state.equipmentTransfers = trimRecordsByDay(state.equipmentTransfers || [], state.day || 1, recentRecordDays);
  state.log = (state.log || []).map((entry) => normalizeLogEntry(state, entry)).slice(0, flatLogLimit);
  state.logDays = trimLogDays(state.logDays?.length ? state.logDays : buildLogDaysFromFlatLog(state), state);
  delete state.tasks;
  state.taskCompletions = (state.taskCompletions || []).slice(0, taskCompletionLimit);
  state.taskDefinitions = (state.taskDefinitions || []).slice(0, taskDefinitionLimit);
  if (state.encounters) {
    state.encounters.pending = (state.encounters.pending || []).slice(0, encounterPendingLimit);
    state.encounters.history = (state.encounters.history || []).slice(0, encounterHistoryLimit);
  }
  if (state.daoTrial) state.daoTrial.history = (state.daoTrial.history || []).slice(0, daoTrialHistoryLimit);
  state.storageCompactionVersion = storageCompactionVersion;
  normalizeTaskMultiplierRecords(state);
  return state;
}

function compactStoredEntityRef(ref) {
  if (!ref || typeof ref !== "object") return ref;
  return {
    kind: ref.kind,
    id: ref.id,
    name: ref.name,
    realm: ref.realm,
    sect: ref.sect,
    portraitUrl: compactPortraitUrl(ref.portraitUrl, ref.id),
    rankId: ref.rankId || ref.duelSeason?.rankId || "",
    rankName: ref.rankName || ref.duelSeason?.rankName || "",
    rankColor: ref.rankColor || ref.duelSeason?.rankColor || "",
    duelSeason: ref.duelSeason ? {
      season: ref.duelSeason.season,
      score: ref.duelSeason.score || 0,
      wins: ref.duelSeason.wins || 0,
      losses: ref.duelSeason.losses || 0,
      rankId: ref.duelSeason.rankId || "",
      rankName: ref.duelSeason.rankName || "",
      rankColor: ref.duelSeason.rankColor || ""
    } : null,
    skillId: ref.skillId,
    skillRank: ref.skillRank || 0
  };
}

function compactStoredDuelMatch(match) {
  if (!match || typeof match !== "object") return match;
  return {
    id: match.id,
    type: match.type,
    order: match.order,
    left: compactStoredEntityRef(match.left),
    right: compactStoredEntityRef(match.right),
    winner: compactStoredEntityRef(match.winner),
    loser: compactStoredEntityRef(match.loser),
    winnerScoreDelta: match.winnerScoreDelta,
    loserScoreDelta: match.loserScoreDelta,
    replayId: match.replayId || match.replay?.replayId || "",
    summary: match.summary || ""
  };
}

function compactDuelDayRecord(record) {
  if (!record || typeof record !== "object") return record;
  return {
    day: record.day,
    date: record.date,
    createdAt: record.createdAt,
    matches: (record.matches || []).map(compactStoredDuelMatch)
  };
}

function compactBloodEntry(entry) {
  if (!entry || typeof entry !== "object") return entry;
  return {
    id: entry.id,
    name: entry.name,
    sect: entry.sect,
    realm: entry.realm,
    gender: entry.gender,
    portraitUrl: compactPortraitUrl(entry.portraitUrl, entry.id),
    primaryRootKey: entry.primaryRootKey,
    skillId: entry.skillId,
    output: entry.output || 0,
    rounds: entry.rounds || 0,
    score: bloodClearScoreValue(entry),
    success: Boolean(entry.success),
    startHp: entry.startHp || 0,
    startMana: entry.startMana || 0,
    endHp: entry.endHp || 0,
    endMana: entry.endMana || 0,
    spirit: entry.spirit || 0,
    bonusSpirit: entry.bonusSpirit || 0,
    item: entry.item || "",
    tierName: entry.tierName || "",
    replayId: entry.replayId || entry.replay?.replayId || ""
  };
}

function compactBloodCaveRecord(cave) {
  if (!cave || typeof cave !== "object") return cave;
  return {
    cave: cave.cave,
    name: cave.name,
    monster: cave.monster,
    spiritPool: cave.spiritPool,
    clearCount: Math.max(Number(cave.clearCount || 0), (cave.clears || []).length),
    challengerCount: Math.max(Number(cave.challengerCount || 0), (cave.challengers || []).length),
    clears: (cave.clears || []).map(compactBloodEntry),
    challengers: (cave.challengers || []).map(compactBloodEntry)
  };
}

function compactSectDungeonRecord(record) {
  if (!record || typeof record !== "object") return record;
  return {
    type: record.type,
    name: record.name,
    sect: record.sect,
    day: record.day,
    date: record.date,
    success: Boolean(record.success),
    stage: record.stage,
    highestRealm: record.highestRealm,
    highestRealmName: record.highestRealmName,
    monster: record.monster,
    monsterRealm: record.monsterRealm,
    monsterStats: record.monsterStats,
    monsterPower: record.monsterPower,
    totalDamage: record.totalDamage,
    monsterRemainingHp: record.monsterRemainingHp,
    requiredDamage: record.requiredDamage,
    spiritPoolRange: record.spiritPoolRange,
    spiritPool: record.spiritPool || 0,
    sectSpirit: record.sectSpirit || 0,
    spiritShare: record.spiritShare || 0,
    spiritRemainder: record.spiritRemainder || 0,
    top: (record.top || []).map((entry) => ({ id: entry.id, name: entry.name, damage: entry.damage || 0 })),
    battles: (record.battles || []).map((battle) => ({
      order: battle.order,
      challenger: compactStoredEntityRef(battle.challenger),
      damage: battle.damage || 0,
      monsterStartHp: battle.monsterStartHp,
      monsterStartMana: battle.monsterStartMana,
      monsterEndHp: battle.monsterEndHp,
      monsterEndMana: battle.monsterEndMana,
      monsterMaxHp: battle.monsterMaxHp,
      monsterMaxMana: battle.monsterMaxMana,
      winnerName: battle.winnerName || "",
      replayId: battle.replayId || battle.replay?.replayId || ""
    })),
    item: record.item || "",
    itemId: record.itemId || "",
    itemSlot: record.itemSlot || "",
    itemTier: record.itemTier || 0,
    itemOwner: record.itemOwner || "",
    tierName: record.tierName || "",
    replayId: record.replayId || record.replay?.replayId || ""
  };
}

function compactStarSeaMember(member) {
  if (!member || typeof member !== "object") return member;
  return {
    id: member.id,
    name: member.name,
    sect: member.sect,
    realm: member.realm,
    gender: member.gender,
    portraitUrl: compactPortraitUrl(member.portraitUrl, member.id),
    teamName: member.teamName,
    teamRank: member.teamRank,
    damage: member.damage || 0,
    spirit: member.spirit || 0,
    item: member.item || "",
    tierName: member.tierName || ""
  };
}

function compactStarSeaTeam(record) {
  if (!record || typeof record !== "object") return record;
  return {
    id: record.id,
    name: record.name,
    rank: record.rank,
    leaderId: record.leaderId,
    leaderName: record.leaderName,
    success: Boolean(record.success),
    rounds: record.rounds || 0,
    damage: record.damage || 0,
    score: record.score || 0,
    speedBonus: record.speedBonus || 0,
    monsterRemainingHp: record.monsterRemainingHp,
    monsterEndMana: record.monsterEndMana,
    monsterMaxHp: record.monsterMaxHp,
    monsterMaxMana: record.monsterMaxMana,
    monsterCounterPenalty: record.monsterCounterPenalty || 0,
    spirit: record.spirit || 0,
    members: (record.members || []).map(compactStarSeaMember),
    top: (record.top || []).map(compactStarSeaMember),
    item: record.item || "",
    itemId: record.itemId || "",
    itemSlot: record.itemSlot || "",
    itemTier: record.itemTier || 0,
    itemOwner: record.itemOwner || "",
    itemValue: record.itemValue || 0,
    auctionDividend: record.auctionDividend || 0,
    replayId: record.replayId || record.replay?.replayId || ""
  };
}

function compactStarSeaRecord(record) {
  if (!record || typeof record !== "object") return record;
  return {
    type: record.type,
    name: record.name,
    day: record.day,
    date: record.date,
    cycle: record.cycle,
    cycleStartDay: record.cycleStartDay,
    cycleEndDay: record.cycleEndDay,
    teamSize: record.teamSize,
    killed: record.killed,
    monsterCount: record.monsterCount,
    monster: record.monster,
    monsters: record.monsters,
    totalDamage: record.totalDamage,
    spiritPoolRange: record.spiritPoolRange,
    spiritPool: record.spiritPool,
    dropChance: record.dropChance,
    teams: (record.teams || []).map(compactStarSeaTeam),
    top: (record.top || []).map(compactStarSeaMember),
    item: record.item || "",
    itemId: record.itemId || "",
    itemSlot: record.itemSlot || "",
    itemTier: record.itemTier || 0,
    itemOwner: record.itemOwner || "",
    tierName: record.tierName || "",
    itemValue: record.itemValue || 0,
    auctionDividend: record.auctionDividend || 0,
    dailyAuction: record.dailyAuction || null,
    cycleSummary: record.cycleSummary || null,
    replayId: record.replayId || record.replay?.replayId || ""
  };
}

function compactDungeonDayRecord(record) {
  if (!record || typeof record !== "object") return record;
  return {
    day: record.day,
    date: record.date,
    bloodTrial: record.bloodTrial ? {
      name: record.bloodTrial.name,
      caves: (record.bloodTrial.caves || []).map(compactBloodCaveRecord)
    } : null,
    solo: (record.solo || []).slice(0, 20).map(compactSoloDungeonEntry),
    sects: (record.sects || []).map(compactSectDungeonRecord),
    voidHallSpiritPools: record.voidHallSpiritPools || [],
    public: record.public ? compactStarSeaRecord(record.public) : null
  };
}

function compactSoloDungeonEntry(record) {
  return {
    id: record?.id,
    personName: record?.personName || record?.name || "",
    sect: record?.sect || "",
    ...compactDungeonHistoryRecord(record)
  };
}

function compactDungeonHistoryRecord(record) {
  if (!record || typeof record !== "object") return record;
  return {
    type: record.type || "",
    name: record.name || "",
    day: record.day,
    date: record.date,
    result: record.result || "",
    success: typeof record.success === "boolean" ? record.success : undefined,
    clears: clearDepthFromDungeonHistory(record),
    floor: record.floor || 0,
    cycle: record.cycle || 0,
    routeId: record.routeId || "",
    routeName: record.routeName || "",
    opponentId: record.opponentId || "",
    opponentName: record.opponentName || "",
    xp: record.xp || 0,
    spirit: record.spirit || 0,
    dust: record.dust || 0,
    damage: record.damage || 0,
    teamName: record.teamName || "",
    teamRank: record.teamRank || 0,
    teamScore: record.teamScore || 0,
    rounds: record.rounds || 0,
    monster: record.monster || "",
    monsterRealm: record.monsterRealm || "",
    item: record.item || "",
    tierName: record.tierName || "",
    foughtAt: record.foughtAt || "",
    replayId: record.replayId || record.replay?.replayId || "",
    replay: null
  };
}

function compactProvinceWarRecord(record) {
  if (!record || typeof record !== "object") return record;
  return {
    ...record,
    attackerLineup: (record.attackerLineup || []).map(publicEntityRef),
    defenderLineup: (record.defenderLineup || []).map(publicEntityRef),
    battles: (record.battles || []).map((battle) => ({
      order: battle.order,
      attacker: publicEntityRef(battle.attacker),
      defender: publicEntityRef(battle.defender),
      winner: publicEntityRef(battle.winner),
      loser: publicEntityRef(battle.loser),
      winnerSide: battle.winnerSide || "",
      winnerName: battle.winnerName || battle.winner?.name || "",
      summary: battle.summary || "",
      result: battle.result || "",
      foughtAt: battle.foughtAt || "",
      replayId: battle.replayId || "",
      replay: null
    }))
  };
}

function compactNonPlayerReplays(state) {
  for (const npc of state.npcs || []) {
    for (const record of npc.duelHistory || []) record.replay = null;
    for (const record of npc.dungeonHistory || []) record.replay = null;
  }

  for (const day of state.dungeonDays || []) {
    for (const entry of day.solo || []) {
      if (entry.id !== "player") entry.replay = null;
    }
    for (const record of day.sects || []) {
      for (const battle of record.battles || []) {
        if (battle.challenger?.id !== "player") battle.replay = null;
      }
    }
  }
}

function compactReplayFields(value) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) compactReplayFields(item);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === "replay" && child && typeof child === "object") {
      value[key] = publicReplay(child);
      continue;
    }
    compactReplayFields(child);
  }
}

export function getPublicState(state, options = {}) {
  if (!options.skipEnsureStateShape) ensureStateShape(state);
  if (options.scope === "home") return getHomeState(state);
  if (options.scope === "dao-trial") return getDaoTrialActionState(state);
  if (options.scope === "task") return getTaskActionState(state, options);
  const nextRealm = realms[Math.min(state.player.realm + 1, realms.length - 1)];
  const currentRealmInfo = realmInfo(state.player.realm);
  const breakChance = breakthroughChanceFor(state, state.player);
  const includeHeavyDerived = options.scope !== "lite";
  const sectSummaries = buildSectSummaries(state);
  const derivedBase = {
    xpNeed: xpNeed(state.player.realm),
    currentRealmInfo,
    realmProgression: buildRealmProgression(state.player),
    playerPower: powerOf(state.player, state),
    effectiveStats: effectiveStats(state.player, state),
    duelSeason: {
      season: duelSeasonOfDay(state.day),
      seasonDay: duelSeasonDay(state.day),
      length: duelSeasonLength,
      ladderDays: duelLadderDays,
      tournamentDays: duelTournamentDays,
      phase: duelPhaseForDay(state.day),
      maxScore: duelSeasonMaxScore,
      winScore: duelWinScore,
      lossScore: duelLossScore
    },
    duelTournamentChampion: publicCompletedDuelTournament(state),
    nextRealm,
    breakChance,
    baseBreakChance: currentRealmInfo.baseBreakChance,
    skillUpgrade: previewSkillUpgradeForState(state, state.player),
    shop: publicShop(state),
    todayPlan: publicTodayPlan(state),
    dailyRootFortune: publicDailyRootFortune(state),
    spiritPearls: publicSpiritPearls(state, state.player),
    sectStrategy: publicSectStrategy(state),
    sects: options.scope === "lite" ? sectSummaries.map(compactSectSummary) : sectSummaries,
    ...(includeHeavyDerived ? {
      dungeonLootPools: publicDungeonLootPools(state),
      skillUpgradePlan: skillUpgradePlanForState(state, state.player)
    } : {})
  };

  if (options.scope === "lite") {
    return {
      __scope: "lite",
      day: state.day,
      calendarStartDate: state.calendarStartDate,
      lastSettlementDate: state.lastSettlementDate,
      player: publicCultivator(state.player, state, { includeRecentReplays: true, kind: "player" }),
      sect: state.sect,
      taskDefinitions: state.taskDefinitions,
      taskCompletions: state.taskCompletions,
      taskProgress: publicTaskProgress(state),
      gameSettings: state.gameSettings,
      taskMultiplierRecords: state.taskMultiplierRecords,
      encounters: publicEncounters(state),
      daoTrial: publicDaoTrial(state),
      log: state.log,
      logDays: publicLogDays(state),
      battleArchives: state.battleArchives,
      bag: state.bag,
      spiritPearls: publicSpiritPearls(state, state.player),
      playerSectPlan: state.playerSectPlan,
      sectFatigue: publicSectFatigue(state),
      equipmentTransfers: state.equipmentTransfers,
      // Lite actions update the home dashboard without requiring a follow-up request.
      home: buildHomeSummary(state),
      provinces: publicProvinceState(state),
      sectProfiles: publicSectProfiles(state),
      catalog: staticCatalog(),
      derived: derivedBase
    };
  }

  const combatRatings = buildCombatRatings(state);
  const { adminProfiles, encounters: _encounterState, relationships: _relationshipState, daoTrial: _daoTrialState, provinces: _provinceState, sectFatigue: _sectFatigue, sectFatiguePrevious: _sectFatiguePrevious, sectSiegeDuty: _sectSiegeDuty, ...publicState } = state;
  return {
    ...publicState,
    provinces: publicProvinceState(state),
    sectFatigue: publicSectFatigue(state),
    taskProgress: publicTaskProgress(state),
    encounters: publicEncounters(state),
    daoTrial: publicDaoTrial(state),
    player: publicCultivator(state.player, state, { includeRecentReplays: true, kind: "player" }),
    npcs: state.npcs.map((npc) => publicCultivator(npc, state, { kind: "npc", compact: true })),
    equipment: state.equipment.map((item) => publicEquipment(item, state)),
    spiritPearls: publicSpiritPearls(state, state.player),
    duelDays: publicDuelDays(state.duelDays || [], state.day, publicCultivatorRefMap(state)),
    duelTournament: publicDuelTournament(state),
    provinceWars: publicProvinceWars(state.provinceWars || [], state.day, publicCultivatorRefMap(state)),
    dungeonDays: publicDungeonDays(state.dungeonDays || [], state.day, publicCultivatorRefMap(state)),
    starSeaCycleHistory: publicStarSeaCycleHistory(state.starSeaCycleHistory || [], publicCultivatorRefMap(state)),
    sectProfiles: publicSectProfiles(state),
    home: buildHomeSummary(state),
    catalog: staticCatalog(),
    derived: {
      ...derivedBase,
      personInsights: { [state.player.id]: personInsight(state, state.player) },
      equippedItems: { [state.player.id]: equippedItemsFor(state, state.player).map((item) => publicEquipment(item, state)) },
      duelRanks: Object.fromEntries(allCultivators(state).map(({ entity }) => [entity.id, duelRankSnapshot(entity)])),
      duelTournament: publicDuelTournament(state),
      npcPowers: Object.fromEntries(state.npcs.map((npc) => [npc.id, powerOf(npc, state)])),
      combatRatings,
    }
  };
}

function getTaskActionState(state, options = {}) {
  const taskDay = Math.max(1, Math.floor(Number(options.taskDay) || state.day || 1));
  const taskProgress = publicTaskProgress(state, taskDay);
  const todayProgress = taskDay === Number(state.day) ? taskProgress : publicTaskProgress(state);
  return {
    __scope: "task",
    day: state.day,
    player: {
      xp: state.player.xp,
      spirit: state.player.spirit
    },
    taskDelta: options.actionResult || null,
    taskProgress,
    derived: {
      xpNeed: xpNeed(state.player.realm),
      todayPlan: publicTaskPlan(state, todayProgress)
    }
  };
}

function publicCultivatorDetailSummary(state, match) {
  const person = publicCultivator(match.entity, state, {
    kind: match.kind,
    compact: true
  });
  const currentCombatRating = buildCombatRatingFor(state, match.entity.id);
  const combatRating = currentCombatRating ? { ...currentCombatRating, daily: [] } : null;
  return {
    __scope: "summary",
    person: {
      ...person,
      sect: match.kind === "player" ? state.sect?.name || "" : person.sect,
      effectiveSkill: effectiveSkillForEntity(match.entity)
    },
    insight: personInsight(state, match.entity),
    equippedItems: equippedItemsFor(state, match.entity).map((item) => publicEquipment(item, state)),
    spiritPearls: publicSpiritPearls(state, match.entity, { includeHistory: false }),
    duelRank: duelRankSnapshot(match.entity),
    power: powerOf(match.entity, state),
    combatRating,
    combatRatingMeta: {
      windowDays: battleRecordDays,
      windowStartDay: minDayForWindow(state.day || 1, battleRecordDays),
      windowEndDay: state.day || 1,
      minimumActiveDays: combatRatingMinimumDays,
      weights: { ...combatRatingWeights }
    }
  };
}

function publicCultivatorDetailHistory(state, match) {
  const currentDay = state.day || 1;
  const entity = match.entity;
  const combatRatings = buildCombatRatings(state);
  ensureSpiritPearls(state, entity);
  const pearlAsset = entity?.spiritPearls || state.spiritPearls;
  return {
    __scope: "history",
    person: {
      id: entity.id,
      dailyRecords: trimRecordsByDay(entity.dailyRecords || [], currentDay, growthRecordDays, growthRecordLimit),
      breakthroughs: trimRecordsByDay(entity.breakthroughs || [], currentDay, growthRecordDays, growthRecordLimit),
      skillUpgrades: trimRecordsByDay(entity.skillUpgrades || [], currentDay, growthRecordDays, growthRecordLimit),
      duelSeasonHistory: entity.duelSeasonHistory || [],
      duelTournamentAwards: publicDuelTournamentAwards(state, entity.id),
      duelHistory: publicDuelHistory(entity.duelHistory || [], {
        currentDay,
        includeRecentReplays: true,
        limit: detailRecordLimit
      }),
      dungeonHistory: publicDungeonHistory(entity.dungeonHistory || [], {
        currentDay,
        limit: match.kind === "player" ? detailRecordLimit : npcDungeonHistoryLimit
      })
    },
    spiritPearls: { history: pearlAsset.history || [] },
    combatRating: combatRatings.entries.find((entry) => entry.id === entity.id) || null,
    rankingTrends: buildDailyRankingTrends(state, entity.id),
    combatRatingMeta: {
      windowDays: combatRatings.windowDays,
      windowStartDay: combatRatings.windowStartDay,
      windowEndDay: combatRatings.windowEndDay,
      minimumActiveDays: combatRatings.minimumActiveDays,
      weights: combatRatings.weights
    },
    relationship: match.kind === "npc" ? publicRelationship(state, entity.id) : null,
    encounterHistory: match.kind === "npc"
      ? state.encounters.history.filter((event) => event.actorId === entity.id).slice(0, 30)
      : state.encounters.history.slice(0, 30)
  };
}

export function getPublicCultivatorDetail(state, id, options = {}) {
  ensureStateShape(state);
  const match = allCultivators(state).find((item) => item.entity.id === id);
  if (!match) throw new Error("未找到该人物");
  if (options.scope === "summary") return publicCultivatorDetailSummary(state, match);
  if (options.scope === "history") return publicCultivatorDetailHistory(state, match);
  const combatRatings = buildCombatRatings(state);
  const person = publicCultivator(match.entity, state, {
    includeRecentReplays: true,
    kind: match.kind
  });
  return {
    person,
    insight: personInsight(state, match.entity),
    equippedItems: equippedItemsFor(state, match.entity).map((item) => publicEquipment(item, state)),
    spiritPearls: publicSpiritPearls(state, match.entity),
    duelRank: duelRankSnapshot(match.entity),
    combatRating: combatRatings.entries.find((entry) => entry.id === id) || null,
    rankingTrends: buildDailyRankingTrends(state, id),
    combatRatingMeta: {
      windowDays: combatRatings.windowDays,
      windowStartDay: combatRatings.windowStartDay,
      windowEndDay: combatRatings.windowEndDay,
      minimumActiveDays: combatRatings.minimumActiveDays,
      weights: combatRatings.weights
    },
    power: powerOf(match.entity, state),
    relationship: match.kind === "npc" ? publicRelationship(state, match.entity.id) : null,
    encounterHistory: match.kind === "npc"
      ? state.encounters.history.filter((event) => event.actorId === match.entity.id).slice(0, 30)
      : state.encounters.history.slice(0, 30)
  };
}

function getHomeState(state) {
  const nextRealm = realms[Math.min(state.player.realm + 1, realms.length - 1)];
  const currentRealmInfo = realmInfo(state.player.realm);
  const people = publicCultivatorRefMap(state);
  const currentCombatRating = buildCombatRatingFor(state, state.player.id);
  const playerCombatRating = currentCombatRating ? { ...currentCombatRating, daily: [] } : null;
  return {
    __scope: "home",
    day: state.day,
    calendarStartDate: state.calendarStartDate,
    lastSettlementDate: state.lastSettlementDate,
    player: publicCultivator(state.player, state, { kind: "player", dungeonHistoryLimit: 6, duelHistoryLimit: 12 }),
    sect: state.sect,
    taskDefinitions: state.taskDefinitions,
    taskCompletions: state.taskCompletions,
    taskProgress: publicTaskProgress(state),
    gameSettings: state.gameSettings,
    taskMultiplierRecords: state.taskMultiplierRecords,
    encounters: publicEncounters(state),
    daoTrial: publicDaoTrial(state),
    log: state.log,
    logDays: publicLogDays(state),
    battleArchives: state.battleArchives,
    duelDays: publicDuelDays(state.duelDays || [], state.day, people),
    provinceWars: publicProvinceWars(state.provinceWars || [], state.day, people),
    bag: state.bag,
    equipmentTransfers: state.equipmentTransfers,
    home: buildHomeSummary(state),
    catalog: staticCatalog(),
    derived: {
      xpNeed: xpNeed(state.player.realm),
      currentRealmInfo,
      playerPower: powerOf(state.player, state),
      effectiveStats: effectiveStats(state.player, state),
      duelSeason: {
        season: duelSeasonOfDay(state.day),
        seasonDay: duelSeasonDay(state.day),
        length: duelSeasonLength,
        ladderDays: duelLadderDays,
        tournamentDays: duelTournamentDays,
        phase: duelPhaseForDay(state.day),
        maxScore: duelSeasonMaxScore,
        winScore: duelWinScore,
        lossScore: duelLossScore
      },
      nextRealm,
      breakChance: breakthroughChanceFor(state, state.player),
      baseBreakChance: currentRealmInfo.baseBreakChance,
      skillUpgrade: previewSkillUpgradeForState(state, state.player),
      shop: publicShop(state),
      todayPlan: publicTodayPlan(state),
      dailyRootFortune: publicDailyRootFortune(state),
      combatRatings: {
        windowDays: battleRecordDays,
        windowStartDay: minDayForWindow(state.day || 1, battleRecordDays),
        windowEndDay: state.day || 1,
        minimumActiveDays: combatRatingMinimumDays,
        weights: { ...combatRatingWeights },
        entries: playerCombatRating ? [playerCombatRating] : []
      }
    }
  };
}

function buildHomeSummary(state) {
  const playerPower = powerOf(state.player, state);
  const logDays = publicLogDays(state);
  const ranking = [
    { entity: state.player, isPlayer: true, power: playerPower },
    ...(state.npcs || []).map((npc) => ({ entity: npc, isPlayer: false, power: powerOf(npc, state) }))
  ]
    .sort((a, b) => b.power - a.power)
    .map((item, index) => ({
      id: item.entity.id,
      name: item.entity.name,
      sect: item.isPlayer ? state.sect.name : item.entity.sect,
      realm: item.entity.realm,
      gender: item.entity.gender,
      portraitUrl: compactPortraitUrl(item.entity.portraitUrl, item.entity.id),
      value: item.power,
      rank: index + 1,
      dailyRootFortune: compactDailyRootFortune(state, item.entity),
      isPlayer: item.isPlayer
    }));
  const playerRank = ranking.find((item) => item.id === state.player.id)?.rank || "-";
  const duelRanking = allCultivators(state)
    .map(({ entity, kind }) => {
      const season = duelRankSnapshot(entity);
      return {
        id: entity.id,
        name: entity.name,
        kind,
        score: season.score || 0,
        rankName: season.rankName || "黑铁",
        rankId: season.rankId || "bronze",
        wins: season.wins || 0,
        losses: season.losses || 0
      };
    })
    .sort((a, b) => b.score - a.score);
  const playerDuelRank = duelRanking.find((item) => item.id === state.player.id);
  const playerDuelRankPosition = playerDuelRank ? duelRanking.indexOf(playerDuelRank) + 1 : 0;
  const todayDuel = (state.duelDays || []).find((record) => record.day === state.day);
  const playerId = state.player.id || "player";
  const todayDuelCount = (todayDuel?.matches || []).filter((match) => {
    const ids = [match.left?.id, match.right?.id, match.winner?.id, match.loser?.id].filter(Boolean);
    return ids.includes(playerId);
  }).length;
  return {
    ranking: ranking.slice(0, 5),
    playerRank,
    playerDuelRank,
    playerDuelRankPosition,
    playerDuelRankText: playerDuelRank ? `${playerDuelRank.rankName} ${playerDuelRank.score}分` : "",
    todayDuelCount,
    sectTerritorySummary: homeSectTerritorySummaryForState(state),
    dungeonSummary: homeDungeonSummaryForState(state),
    equipment: homeEquipmentForState(state),
    ticker: homeTickerForState(state),
    logDays,
    logs: (logDays[0]?.logs || state.log || []).slice(0, 30)
  };
}

function homeTickerForState(state) {
  const today = state.day || 1;
  const fortune = publicDailyRootFortune(state);
  const items = [{
    key: `daily-root-fortune-${today}`,
    label: "天运",
    name: fortune.name,
    text: `${fortune.effectText} · ${fortune.playerMatched ? fortune.playerEffectText : `你今日未共鸣，共 ${fortune.resonantCount} 名修士受益`}`
  }];
  const drops = (state.equipmentTransfers || [])
    .filter((drop) => drop.day === today && drop.itemName)
    .slice(0, 12);

  if (drops.length) {
    items.push(...drops.slice(0, 6).map((drop) => ({
      key: `equipment-${drop.winnerId || drop.winnerName}-${drop.itemId || drop.itemName}-${equipmentTransferKind(drop)}`,
      label: "装备",
      name: drop.winnerName || drop.receiverName || "未知修士",
      text: `在 ${equipmentTransferSource(drop)} 获得${drop.tierName || "法器"}「${drop.itemName}」 · ${drop.slotName || "未知部位"} · ${drop.statName || "属性"} +${formatPercentText(drop.bonus || 0)}${equipmentTransferKind(drop) === "steal" && drop.loserName ? ` · 来自 ${drop.loserName}` : ""}`
    })));
    if (drops.length > 6) {
      items.push({
        key: "equipment-more",
        label: "装备",
        name: "今日掉落",
        text: `共 ${drops.length} 件法宝流转，更多可在装备记录查看`
      });
    }
  }

  const people = allCultivators(state).map(({ entity }, index) => ({ entity, index }));
  const breakthroughs = people.flatMap(({ entity, index }) => (entity.breakthroughs || [])
    .map((record, recordIndex) => ({ entity, record, index, recordIndex, targetRealm: realms.indexOf(record.to) }))
    .filter((item) => item.record.day === today && item.record.success));
  const breakthrough = breakthroughs
    .sort((a, b) => b.targetRealm - a.targetRealm || a.index - b.index || a.recordIndex - b.recordIndex)[0];
  if (breakthrough) {
    items.push({
      key: "breakthrough",
      label: "突破",
      name: breakthrough.entity.name,
      text: `突破至 ${breakthrough.record.to}，今日共 ${breakthroughs.length} 人突破成功`
    });
  }

  const skillUpgrades = people.flatMap(({ entity, index }) => (entity.skillUpgrades || [])
    .map((record, recordIndex) => ({ entity, record, index, recordIndex }))
    .filter((item) => item.record.day === today));
  const skillUpgrade = skillUpgrades
    .sort((a, b) => (b.record.toRank || 0) - (a.record.toRank || 0) || a.index - b.index || a.recordIndex - b.recordIndex)[0];
  if (skillUpgrade) {
    const { entity, record } = skillUpgrade;
    const skillName = record.skillName || findSkill(record.skillId).name;
    const targetRank = skillRankText(record.toRank);
    items.push({
      key: "skill-upgrade",
      label: "技能",
      name: entity.name,
      text: record.success === false
        ? `尝试将「${skillName}」升至 ${targetRank}失败，今日共 ${skillUpgrades.length} 次技能尝试`
        : `将「${skillName}」升至 ${targetRank}，今日共 ${skillUpgrades.length} 次技能尝试`
    });
  }

  const spirit = people
    .map(({ entity, index }) => ({
      entity,
      index,
      spirit: Number((entity.dailyRecords || []).find((record) => record.day === today)?.spirit || 0)
    }))
    .filter((item) => item.spirit > 0)
    .sort((a, b) => b.spirit - a.spirit || a.index - b.index)[0];
  if (spirit) {
    items.push({
      key: "spirit",
      label: "灵石",
      name: spirit.entity.name,
      text: `今日获取最多，入账 ${spirit.spirit} 灵石`
    });
  }

  return items;
}

function equipmentTransferKind(drop) {
  if (drop?.type) return drop.type;
  return drop?.loserId ? "steal" : "dungeon";
}

function equipmentTransferSource(drop) {
  const kind = equipmentTransferKind(drop);
  if (kind === "steal") return drop?.context ? `抢夺 · ${drop.context}` : "抢夺";
  if (drop?.context) return `副本 · ${drop.context}`;
  return "副本掉落";
}

function formatPercentText(value) {
  if (typeof value !== "number") return "未记录";
  const percent = value * 100;
  return `${Number.isInteger(percent) ? percent : Number(percent.toFixed(1))}%`;
}

function getDaoTrialActionState(state) {
  const spiritPearls = publicSpiritPearls(state, state.player);
  return {
    __scope: "dao-trial",
    day: state.day,
    player: {
      xp: state.player.xp,
      spirit: state.player.spirit
    },
    spiritPearls,
    daoTrial: publicDaoTrial(state),
    log: state.log,
    logDays: publicLogDays(state),
    derived: {
      spiritPearls
    }
  };
}

function skillRankText(rank) {
  return `${Math.max(1, Number(rank) || 1)}阶`;
}

function homeSectTerritorySummaryForState(state) {
  const sectName = state.player.sect || state.sect?.name || "";
  const owned = (state.provinces || [])
    .filter((province) => province.owner === sectName)
    .map((territory) => provinceById(territory.id))
    .filter(Boolean)
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name, "zh-Hans-CN"));
  if (!owned.length) return "当前暂无占领城市";
  const names = owned.slice(0, 3).map((province) => province.name.replace(/省|市|自治区|特别行政区/g, ""));
  const rest = owned.length - names.length;
  return `占领 ${names.join("、")}${rest > 0 ? ` 等 ${owned.length} 城` : ""}`;
}

function homeDungeonSummaryForState(state) {
  const day = (state.dungeonDays || []).find((record) => record.day === state.day) || null;
  if (!day) return {
    title: "幽冥地宫 · 三层",
    summary: [{ key: "none", icon: "今", text: "今日副本尚未结算" }]
  };
  const playerId = state.player.id;
  const bloodCaves = day.bloodTrial?.caves || [];
  const playerSolo = (day.solo || []).find((entry) => entry.id === playerId);
  const playerClearedCaves = bloodCaves.filter((cave) => (cave.clears || []).some((entry) => entry.id === playerId));
  const bloodTotal = bloodCaves.length;
  const bloodCleared = Math.max(playerClearedCaves.length, clearDepthFromDungeonHistory(playerSolo));
  const bloodTitle = bloodCaves[Math.max(0, bloodCleared - 1)]?.name || playerClearedCaves.at(-1)?.name || day.bloodTrial?.name || "血色禁地";
  const bloodText = playerSolo
    ? (bloodTotal && bloodCleared >= bloodTotal
      ? `血色通关 ${bloodCleared}/${bloodTotal}`
      : `血色${playerSolo.result || "未通关"} ${bloodCleared}/${bloodTotal || "?"} 关`)
    : "血色未入场";
  const playerSectRecord = (day.sects || []).find((record) => record.sect === state.sect.name);
  const publicRecord = day.public || null;
  const playerTeam = publicRecord?.teams?.find((team) => (team.members || []).some((member) => member.id === playerId));
  const playerTeamRank = playerTeam?.rank || publicRecord?.playerTeamRank || publicRecord?.rank;
  const playerPersonalRank = (publicRecord?.top || []).findIndex((entry) => entry.id === playerId) + 1;
  const starSeaText = publicRecord
    ? `乱星海队伍第${playerTeamRank || "-"}${playerPersonalRank ? ` · 个人第${playerPersonalRank}` : ""}`
    : "乱星海未结算";
  return {
    title: bloodTitle,
    summary: [
      { key: "blood", icon: "血", text: bloodText },
      { key: "void", icon: "殿", text: playerSectRecord ? `虚天殿${playerSectRecord.success ? "通关" : "未通关"}` : "虚天殿未结算" },
      { key: "sea", icon: "海", text: starSeaText }
    ]
  };
}

function homeEquipmentForState(state) {
  return [...(state.equipment || [])]
    .sort(compareEquipmentBestFirst)
    .slice(0, 10)
    .map((item) => publicEquipment(item, state));
}

function compareEquipmentBestFirst(a, b) {
  return (b.tier || 0) - (a.tier || 0)
    || equipmentValue(b) - equipmentValue(a)
    || equipmentSlots.findIndex((slot) => slot.id === equipmentSlot(a).id) - equipmentSlots.findIndex((slot) => slot.id === equipmentSlot(b).id)
    || (b.bonus || 0) - (a.bonus || 0)
    || String(a.name || "").localeCompare(String(b.name || ""), "zh-Hans-CN");
}

function compactSectSummary(sect) {
  const members = compactSectMembers(sect);
  return {
    name: sect.name,
    portraitUrl: sect.portraitUrl || "",
    reputation: sect.reputation || 0,
    supplies: sect.supplies || 0,
    rivalHeat: sect.rivalHeat || 0,
    warWins: sect.warWins || 0,
    warLosses: sect.warLosses || 0,
    leaderId: sect.leaderId || "",
    leaderName: sect.leaderName || sect.leader || "无",
    leader: sect.leader || sect.leaderName || "无",
    elderIds: sect.elderIds || [],
    elderNames: sect.elderNames || [],
    memberCount: sect.members?.length || sect.memberCount || 0,
    members,
    provinces: (sect.provinces || []).map((province) => ({
      id: province.id,
      name: province.name,
      owner: province.owner,
      defenders: province.defenders || []
    })),
    effects: [],
    resourcePlan: compactResourcePlan(sect.resourcePlan),
    totalPower: sect.totalPower || 0
  };
}

function compactResourcePlan(resourcePlan = {}) {
  return {
    spirit: compactResourceSummary(resourcePlan.spirit),
    xp: compactResourceSummary(resourcePlan.xp),
    breakthrough: compactResourceSummary(resourcePlan.breakthrough)
  };
}

function compactResourceSummary(summary = {}) {
  return {
    total: summary.total || 0,
    base: summary.base || 0,
    defenderBonus: summary.defenderBonus || 0,
    leaderShare: summary.leaderShare || 0,
    elderShare: summary.elderShare || 0,
    memberShare: summary.memberShare || 0
  };
}

function compactSectMembers(sect) {
  const members = [...(sect.members || [])].sort((a, b) => (b.power || 0) - (a.power || 0));
  const keepIds = new Set([sect.leaderId, ...(sect.elderIds || [])].filter(Boolean));
  for (const member of members.slice(0, 5)) keepIds.add(member.id);
  return members
    .filter((member) => keepIds.has(member.id) || member.isPlayer)
    .slice(0, 10)
    .map(compactCultivatorRef);
}

function compactCultivatorRef(member = {}) {
  return {
    id: member.id,
    name: member.name,
    gender: member.gender,
    sect: member.sect,
    realm: member.realm,
    portraitUrl: compactPortraitUrl(member.portraitUrl, member.id),
    power: member.power || 0,
    dailyRootFortune: member.dailyRootFortune || null,
    isPlayer: Boolean(member.isPlayer)
  };
}

function compactPortraitUrl(url = "", id = "", variant = 0) {
  const text = String(url || "");
  if (!text) return "";
  if (!text.startsWith("data:")) return text;
  if (!id) return "";
  return `/api/cultivators/portrait?id=${encodeURIComponent(id)}&v=${Math.max(0, Number(variant) || 0)}`;
}

export function getCultivatorPortrait(state, id) {
  ensureStateShape(state);
  const match = allCultivators(state).find((item) => item.entity.id === id);
  if (!match?.entity?.portraitUrl) return null;
  const text = String(match.entity.portraitUrl || "");
  const dataMatch = text.match(/^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=]+)$/i);
  if (!dataMatch) return { url: text };
  return {
    contentType: dataMatch[1].toLowerCase(),
    buffer: Buffer.from(dataMatch[2], "base64")
  };
}

function publicCultivator(entity, state, options = {}) {
  const currentDay = state.day || 1;
  const compact = Boolean(options.compact);
  const dungeonHistoryLimit = options.dungeonHistoryLimit || (options.kind === "player" ? detailRecordLimit : npcDungeonHistoryLimit);
  if (compact) {
    return {
      id: entity.id,
      name: entity.name,
      gender: entity.gender,
      sect: entity.sect,
      realm: entity.realm,
      layer: entity.layer,
      xp: entity.xp,
      hp: entity.hp,
      maxHp: entity.maxHp,
      mana: entity.mana,
      maxMana: entity.maxMana,
      spirit: entity.spirit,
      reputation: entity.reputation,
      body: entity.body,
      wisdom: entity.wisdom,
      attack: entity.attack,
      defense: entity.defense,
      divineSense: entity.divineSense,
      chance: entity.chance,
      wealth: entity.wealth,
      heartDemon: entity.heartDemon,
      mood: entity.mood,
      potentialRealm: potentialRealmFor(entity),
      potentialSource: entity.potentialSource || "generated",
      talent: talentSnapshot(entity),
      root: entity.root,
      roots: entity.roots,
      primaryRootKey: entity.primaryRootKey,
      skillId: entity.skillId,
      skillRanks: entity.skillRanks || {},
      skillRank: skillRankOf(entity, entity.skillId),
      portraitUrl: compactPortraitUrl(entity.portraitUrl, entity.id, entity.portraitVariant),
      duelWins: entity.duelWins || 0,
      duelLosses: entity.duelLosses || 0,
      duelSeason: entity.duelSeason || null,
      duelSeasonHistory: entity.duelSeasonHistory || [],
      duelTournamentAwards: publicDuelTournamentAwards(state, entity.id),
      championDaoRhyme: entity.id === "player" ? entity.championDaoRhyme || null : null,
      dungeonClears: entity.dungeonClears || 0,
      bestDungeonPower: entity.bestDungeonPower || 0,
      bestDungeonName: entity.bestDungeonName || "",
      daoTrialDefenses: entity.daoTrialDefenses || 0,
      daoTrialWins: entity.daoTrialWins || 0,
      daoTrialRewards: { ...(entity.daoTrialRewards || { xp: 0, spirit: 0, dust: 0 }) },
      equipmentCount: equipmentForOwner(state, entity.id).length,
      formedPearlCount: formedSpiritPearlCount(state, entity),
      dailyRootFortune: compactDailyRootFortune(state, entity),
      power: powerOf(entity, state)
    };
  }
  const { spiritPearls: _spiritPearls, portraitUrl: _portraitUrl, ...publicEntity } = entity;
  return {
    ...publicEntity,
    equipmentCount: equipmentForOwner(state, entity.id).length,
    formedPearlCount: formedSpiritPearlCount(state, entity),
    portraitUrl: compactPortraitUrl(entity.portraitUrl, entity.id, entity.portraitVariant),
    dailyRecords: trimRecordsByDay(entity.dailyRecords || [], currentDay, growthRecordDays, growthRecordLimit),
    breakthroughs: trimRecordsByDay(entity.breakthroughs || [], currentDay, growthRecordDays, growthRecordLimit),
    skillUpgrades: trimRecordsByDay(entity.skillUpgrades || [], currentDay, growthRecordDays, growthRecordLimit),
    skillRank: skillRankOf(entity, entity.skillId),
    effectiveSkill: effectiveSkillForEntity(entity),
    duelTournamentAwards: publicDuelTournamentAwards(state, entity.id),
    duelHistory: publicDuelHistory(entity.duelHistory || [], { ...options, currentDay, limit: options.duelHistoryLimit }),
    dungeonHistory: publicDungeonHistory(entity.dungeonHistory || [], { currentDay, limit: dungeonHistoryLimit }),
    dailyRootFortune: compactDailyRootFortune(state, entity),
    power: powerOf(entity, state)
  };
}

function formedSpiritPearlCount(state, entity) {
  ensureSpiritPearls(state, entity);
  const asset = entity?.spiritPearls || state.spiritPearls;
  return Object.values(asset?.pearls || {}).filter((pearl) => Number(pearl?.tier || 0) > 0).length;
}

function publicDungeonHistory(records, options = {}) {
  const currentDay = options.currentDay || 1;
  return trimRecordsByDay(records, currentDay, battleRecordDays, options.limit || detailRecordLimit).map((record) => ({
    ...record,
    replayId: record.replayId || "",
    hasReplay: Boolean(record.replay || record.replayId) && isReplayWithinDays(record, currentDay),
    replay: null
  }));
}

function publicDuelHistory(records, options = {}) {
  const replayLimit = options.includeRecentReplays ? replayRetentionDays : 0;
  const currentDay = options.currentDay || 1;
  const people = options.people || null;
  return trimDuelHistory(records, currentDay, options.limit || detailRecordLimit).map((record, index) => ({
    ...record,
    replayId: record.replayId || "",
    hasReplay: Boolean(record.replay || record.replayId) && isReplayWithinDays(record, currentDay),
    replay: index < replayLimit && isReplayWithinDays(record, currentDay) ? publicReplay(record.replay, people) : null
  }));
}

function publicCultivatorRefMap(state) {
  return new Map(allCultivators(state).map(({ entity }) => [entity.id, entity]));
}

function publicDuelDays(records, currentDay = 1) {
  return trimRecordsByDay(records, currentDay, publicBattleRecordDays, publicDuelDayLimit).map((record) => ({
    day: record.day,
    date: record.date,
    createdAt: record.createdAt,
    matchCount: (record.matches || []).length,
    battleCount: (record.matches || []).filter((match) => match.type === "battle").length
  }));
}

function publicDuelTournament(state) {
  const tournament = state.duelTournament;
  if (!tournament || tournament.season !== duelSeasonOfDay(state.day)) return null;
  const people = publicCultivatorRefMap(state);
  const bracket = ensureTournamentBracket(state, tournament);
  return {
    ...tournament,
    entrants: (tournament.entrants || []).map((entry) => ({ ...entry, person: publicEntityRef(entry, people) })),
    bracket: {
      ...bracket,
      rounds: (bracket.rounds || []).map((round) => ({
        ...round,
        matches: (round.matches || []).map((match) => ({
          ...match,
          left: publicEntityRef(match.left, people),
          right: publicEntityRef(match.right, people)
        }))
      }))
    },
    rounds: (tournament.rounds || []).map((round) => ({
      ...round,
      matches: (round.matches || []).map((match) => publicDuelMatch(match, 0, round, state.day, people))
    })),
    champion: publicEntityRef(tournamentEntryRef(tournament, tournament.championId), people),
    runnerUp: publicEntityRef(tournamentEntryRef(tournament, tournament.runnerUpId), people)
  };
}

function completedDuelTournaments(state) {
  const tournaments = [];
  if (state.duelTournament?.status === "completed") tournaments.push(state.duelTournament);
  tournaments.push(...(state.duelTournamentHistory || []).filter((tournament) => tournament?.status === "completed"));
  const seenSeasons = new Set();
  return tournaments
    .sort((left, right) => Number(right.season || 0) - Number(left.season || 0))
    .filter((tournament) => {
      const season = Number(tournament.season) || 0;
      if (seenSeasons.has(season)) return false;
      seenSeasons.add(season);
      return true;
    });
}

function publicDuelTournamentAwards(state, personId) {
  return completedDuelTournaments(state).flatMap((tournament) => (tournament.rewards || [])
    .filter((reward) => reward?.id === personId)
    .map((reward) => ({
      season: tournament.season,
      place: reward.place || "奖励",
      spirit: Math.max(0, Math.floor(Number(reward.spirit) || 0)),
      rewardGranted: reward.rewardGranted !== false,
      rewardedAtDay: reward.rewardedAtDay || tournament.completedAtDay || 0,
      rewardedAt: reward.rewardedAt || tournament.completedAt || ""
    })));
}

function publicCompletedDuelTournament(state) {
  const tournament = completedDuelTournaments(state)[0] || null;
  if (!tournament) return null;
  const people = publicCultivatorRefMap(state);
  const entryRef = (id) => publicEntityRef(tournamentEntryRef(tournament, id), people);
  return {
    season: tournament.season,
    status: tournament.status,
    champion: entryRef(tournament.championId),
    runnerUp: entryRef(tournament.runnerUpId),
    semifinalists: (tournament.semifinalistIds || []).map(entryRef).filter(Boolean),
    rewards: (tournament.rewards || []).map((reward) => ({ ...reward }))
  };
}

function duelMatchSearchText(match) {
  return [
    match?.left?.name,
    match?.left?.sect,
    match?.left?.realm,
    match?.right?.name,
    match?.right?.sect,
    match?.right?.realm,
    match?.winner?.name,
    match?.winner?.sect,
    match?.summary
  ].filter(Boolean).join(" ").toLowerCase();
}

function duelMatchSortSnapshot(match, index) {
  const people = [match?.left, match?.right, match?.winner].filter(Boolean);
  return people.reduce((best, person) => {
    const score = Number(person.duelSeason?.score || 0);
    const rank = duelRankForScore(score);
    return {
      rankMin: Math.max(best.rankMin, Number(rank?.min || 0)),
      score: Math.max(best.score, score),
      power: Math.max(best.power, Number(person.power || 0))
    };
  }, { rankMin: 0, score: 0, power: 0, order: Number(match?.order || index + 1) });
}

function publicDuelMatch(match, index, record, currentDay, people) {
  return {
    ...match,
    order: match.order || index + 1,
    left: publicEntityRef(match.left, people),
    right: publicEntityRef(match.right, people),
    winner: publicEntityRef(match.winner, people),
    loser: publicEntityRef(match.loser, people),
    replayId: match.replayId || "",
    hasReplay: Boolean(match.replay || match.replayId) && isReplayWithinDays(record, currentDay),
    replay: null
  };
}

function tournamentDuelRecordForDay(state, day) {
  const numericDay = Number(day);
  const tournaments = [state.duelTournament, ...(state.duelTournamentHistory || [])].filter(Boolean);
  for (const tournament of tournaments) {
    const round = (tournament.rounds || []).find((item) => Number(item.day) === numericDay);
    if (round) {
      return {
        ...round,
        tournament: true,
        tournamentName: round.name || "天骄淘汰赛"
      };
    }
  }
  return null;
}

function duelRecordForDay(state, day) {
  return tournamentDuelRecordForDay(state, day)
    || (state.duelDays || []).find((item) => Number(item.day) === Number(day))
    || null;
}

export function getDuelDayPage(state, options = {}) {
  ensureStateShape(state);
  const day = Number(options.day || state.day);
  const record = duelRecordForDay(state, day);
  const pageSize = clamp(Math.floor(Number(options.pageSize) || 10), 1, 50);
  const requestedPage = Math.max(1, Math.floor(Number(options.page) || 1));
  const keyword = String(options.search || "").trim().toLowerCase();
  if (!record) {
    return { day, date: stateDateForDay(state), createdAt: "", tournament: false, tournamentName: "", page: 1, pageSize, total: 0, totalPages: 0, matches: [] };
  }
  const sorted = (record.matches || [])
    .map((match, index) => ({ match, index, stats: duelMatchSortSnapshot(match, index) }))
    .filter(({ match }) => !keyword || duelMatchSearchText(match).includes(keyword))
    .sort((left, right) => (
      (left.match.type === "bye") - (right.match.type === "bye")
      || right.stats.rankMin - left.stats.rankMin
      || right.stats.score - left.stats.score
      || right.stats.power - left.stats.power
      || left.stats.order - right.stats.order
    ));
  const total = sorted.length;
  const totalPages = total ? Math.ceil(total / pageSize) : 0;
  const page = totalPages ? Math.min(requestedPage, totalPages) : 1;
  const start = (page - 1) * pageSize;
  const people = mergeRefMaps(publicCultivatorRefMap(state), cultivatorMapFromRefs([record]));
  return {
    day: record.day,
    date: record.date,
    createdAt: record.createdAt,
    tournament: Boolean(record.tournament),
    tournamentName: record.tournamentName || "",
    page,
    pageSize,
    total,
    totalPages,
    matches: sorted.slice(start, start + pageSize).map(({ match, index }) => publicDuelMatch(match, index, record, state.day, people))
  };
}

function publicDungeonDays(records, currentDay = 1, people = null) {
  return trimRecordsByDay(records || [], currentDay, publicDungeonRecordDays, publicDungeonDayLimit).map((record) => ({
    day: record.day,
    date: record.date,
    bloodTrial: record.bloodTrial ? {
      name: record.bloodTrial.name,
      caves: (record.bloodTrial.caves || [])
        .filter((cave) => Number(cave.challengerCount || 0) > 0
          || Number(cave.clearCount || 0) > 0
          || (cave.challengers || []).length > 0
          || (cave.clears || []).length > 0)
        .map((cave) => publicBloodCaveRecord(cave, currentDay, record.day, people))
    } : null,
    solo: (record.solo || []).slice(0, 20).map((entry) => publicDungeonHistoryEntry(entry, currentDay, record.day)),
    sects: (record.sects || []).map((sectRecord) => publicSectDungeonRecord(sectRecord, currentDay, record.day, people)),
    voidHallSpiritPools: record.voidHallSpiritPools || [],
    public: record.public ? publicStarSeaRecord(record.public, currentDay, record.day, people) : null
  }));
}

function publicBloodCaveRecord(cave, currentDay, parentDay, people = null) {
  const clearCount = Math.max(Number(cave.clearCount || 0), bloodCaveClearCountFromHistory(cave, parentDay, people));
  const challengerCount = Math.max(
    Number(cave.challengerCount || 0),
    bloodCaveChallengeCountFromHistory(cave, parentDay, people),
    (cave.challengers || []).length
  );
  const spiritPool = normalizeBloodCaveSpiritPool(cave.spiritPool, clearCount);
  const displayClears = publicBloodClearsForDisplay(cave, spiritPool, clearCount);
  return {
    cave: cave.cave,
    name: cave.name,
    monster: cave.monster,
    spiritPool,
    clearCount,
    challengerCount,
    clears: displayClears.map((entry) => publicBloodEntry(entry, currentDay, parentDay, people)),
    challengers: [...(cave.challengers || [])].sort(compareBloodEntry).map((entry) => publicBloodEntry(entry, currentDay, parentDay, people))
  };
}

function normalizeBloodCaveSpiritPool(pool, clearCount = 0) {
  if (!pool) return pool;
  const minimumBase = Math.max(0, Number(clearCount || 0));
  const base = Math.max(minimumBase, Number(pool.base || 0));
  const bonus = Math.max(0, Number(pool.bonus || 0));
  return {
    ...pool,
    base,
    bonus,
    total: base + bonus
  };
}

function publicBloodClearsForDisplay(cave, spiritPool, clearCount) {
  const clears = [...(cave.clears || [])].map((entry) => ({
    ...entry,
    success: true,
    score: bloodClearScoreValue(entry),
    spirit: 0,
    bonusSpirit: 0
  })).sort(compareBloodClearScore);
  if (!clears.length) return clears;
  const totalClears = Math.max(clearCount || 0, clears.length);
  const basePool = Math.max(totalClears, Number(spiritPool?.base || 0));
  const baseShare = Math.max(1, Math.floor(basePool / Math.max(1, totalClears)));
  for (const entry of clears) entry.spirit = baseShare;
  let baseRemainder = Math.max(0, basePool - baseShare * totalClears);
  for (let index = 0; baseRemainder > 0 && index < clears.length; index += 1) {
    clears[index].spirit += 1;
    baseRemainder -= 1;
  }
  const podium = clears.slice(0, 3);
  const bonusPool = Math.max(0, Number(spiritPool?.bonus || 0));
  if (podium.length && bonusPool > 0) {
    const weights = [5, 3, 2].slice(0, podium.length);
    const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
    let assigned = 0;
    podium.forEach((entry, index) => {
      const share = index === podium.length - 1 ? bonusPool - assigned : Math.floor(bonusPool * weights[index] / weightTotal);
      const safeShare = Math.max(0, share);
      entry.spirit += safeShare;
      entry.bonusSpirit += safeShare;
      assigned += safeShare;
    });
  }
  return clears;
}

function clearDepthFromDungeonHistory(record) {
  const explicit = Number(record?.clears);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const parsed = Number(String(record?.result || "").match(/连破\s*(\d+)\s*洞/)?.[1] || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function bloodCaveClearCountFromHistory(cave, parentDay, people = null) {
  const listedCount = (cave.clears || []).length;
  if (!people?.size) return listedCount;
  const caveIndex = Number(cave.cave || 0);
  if (!caveIndex) return listedCount;
  let count = 0;
  for (const person of people.values()) {
    const record = (person.dungeonHistory || []).find((item) => item.day === parentDay && item.type === "solo" && item.name === "血色禁地");
    if (!record) continue;
    const clears = clearDepthFromDungeonHistory(record);
    if (clears >= caveIndex) count += 1;
  }
  return Math.max(listedCount, count);
}

function bloodCaveChallengeCountFromHistory(cave, parentDay, people = null) {
  const listedCount = (cave.challengers || []).length;
  if (!people?.size) return listedCount;
  const caveIndex = Number(cave.cave || 0);
  if (!caveIndex) return listedCount;
  let count = 0;
  for (const person of people.values()) {
    const record = (person.dungeonHistory || []).find((item) => item.day === parentDay && item.type === "solo" && item.name === "血色禁地");
    if (!record) continue;
    const clears = clearDepthFromDungeonHistory(record);
    if (caveIndex === 1 || clears >= caveIndex - 1) count += 1;
  }
  return Math.max(listedCount, count);
}

function publicBloodEntry(entry, currentDay, parentDay, people = null) {
  const replayRecord = { ...entry, day: entry.day || parentDay };
  const person = people?.get(entry.id);
  return {
    id: entry.id,
    name: entry.name,
    sect: entry.sect,
    realm: entry.realm,
    gender: entry.gender,
    portraitUrl: compactPortraitUrl(entry.portraitUrl || person?.portraitUrl, entry.id),
    primaryRootKey: entry.primaryRootKey,
    skillId: entry.skillId,
    output: entry.output,
    rounds: entry.rounds,
    score: bloodClearScoreValue(entry),
    success: Boolean(entry.success),
    spirit: entry.spirit || 0,
    bonusSpirit: entry.bonusSpirit || 0,
    item: entry.item || "",
    tierName: entry.tierName || "",
    replayId: entry.replayId || "",
    hasReplay: Boolean(entry.replay || entry.replayId) && isReplayWithinDays(replayRecord, currentDay),
    replay: null
  };
}

function publicDungeonHistoryEntry(record, currentDay = 1, parentDay = null) {
  const replayRecord = { ...record, day: record.day || parentDay };
  const { replay, winner, loser, ...summary } = record || {};
  return {
    ...summary,
    replayId: record.replayId || "",
    hasReplay: Boolean(record.replay || record.replayId) && isReplayWithinDays(replayRecord, currentDay),
    replay: null
  };
}

function publicSectDungeonRecord(record, currentDay = 1, parentDay = null, people = null) {
  const replayRecord = { ...record, day: record.day || parentDay };
  return {
    type: record.type,
    name: record.name,
    sect: record.sect,
    day: record.day,
    date: record.date,
    success: Boolean(record.success),
    stage: record.stage,
    highestRealm: record.highestRealm,
    highestRealmName: record.highestRealmName,
    monster: record.monster,
    monsterRealm: record.monsterRealm,
    monsterStats: record.monsterStats,
    monsterPower: record.monsterPower,
    totalDamage: record.totalDamage,
    monsterRemainingHp: record.monsterRemainingHp,
    requiredDamage: record.requiredDamage,
    spiritPoolRange: record.spiritPoolRange,
    spiritPool: record.spiritPool || 0,
    sectSpirit: record.sectSpirit || 0,
    spiritShare: record.spiritShare || 0,
    spiritRemainder: record.spiritRemainder || 0,
    top: (record.top || []).map((entry) => ({ id: entry.id, name: entry.name, damage: entry.damage })),
    battles: (record.battles || []).map((battle) => ({
      order: battle.order,
      challenger: publicEntityRef(battle.challenger, people),
      damage: battle.damage,
      monsterStartHp: battle.monsterStartHp,
      monsterStartMana: battle.monsterStartMana,
      monsterEndHp: battle.monsterEndHp,
      monsterEndMana: battle.monsterEndMana,
      monsterMaxHp: battle.monsterMaxHp,
      monsterMaxMana: battle.monsterMaxMana,
      winnerName: battle.winnerName,
      replayId: battle.replayId || "",
      hasReplay: Boolean(battle.replay || battle.replayId) && isReplayWithinDays({ ...battle, day: battle.day || replayRecord.day }, currentDay),
      replay: null
    })),
    item: record.item || "",
    itemId: record.itemId || "",
    itemSlot: record.itemSlot || "",
    itemTier: record.itemTier || 0,
    itemOwner: record.itemOwner || "",
    tierName: record.tierName || "",
    replayId: record.replayId || "",
    hasReplay: Boolean(record.replay || record.replayId) && isReplayWithinDays(replayRecord, currentDay),
    replay: null
  };
}

function publicStarSeaRecord(record, currentDay = 1, parentDay = null, people = null) {
  const replayRecord = { ...record, day: record.day || parentDay };
  const replayId = record.replayId || record.replay?.replayId || "";
  return {
    type: record.type,
    name: record.name,
    day: record.day,
    date: record.date,
    cycle: record.cycle,
    cycleStartDay: record.cycleStartDay,
    cycleEndDay: record.cycleEndDay,
    teamSize: record.teamSize,
    killed: record.killed,
    monsterCount: record.monsterCount,
    monster: record.monster,
    monsters: record.monsters || (record.monster ? [record.monster] : []),
    totalDamage: record.totalDamage,
    spiritPoolRange: record.spiritPoolRange,
    spiritPool: record.spiritPool,
    dropChance: record.dropChance,
    teams: (record.teams || []).map((team) => publicStarSeaTeam(team, currentDay, replayRecord.day, people)),
    top: (record.top || []).map((member) => publicStarSeaMember(member, people)),
    item: record.item || "",
    itemId: record.itemId || "",
    itemSlot: record.itemSlot || "",
    itemTier: record.itemTier || 0,
    itemOwner: record.itemOwner || "",
    tierName: record.tierName || "",
    itemValue: record.itemValue || 0,
    auctionDividend: record.auctionDividend || 0,
    dailyAuction: record.dailyAuction || null,
    cycleSummary: record.cycleSummary ? publicStarSeaCycleSummary(record.cycleSummary, people) : null,
    replayId,
    hasReplay: Boolean(record.replay || record.replayId) && isReplayWithinDays(replayRecord, currentDay),
    replay: null
  };
}

function publicStarSeaTeam(record, currentDay = 1, parentDay = null, people = null) {
  const replayRecord = { ...record, day: record.day || parentDay };
  const replayId = record.replayId || record.replay?.replayId || "";
  return {
    id: record.id,
    name: record.name,
    rank: record.rank,
    success: Boolean(record.success),
    damage: record.damage || 0,
    rounds: record.rounds || 0,
    score: record.score || 0,
    speedBonus: record.speedBonus || 0,
    monsterRemainingHp: record.monsterRemainingHp,
    monsterMaxHp: record.monsterMaxHp,
    spirit: record.spirit || 0,
    members: (record.members || []).map((member) => publicStarSeaMember(member, people)),
    top: (record.top || []).map((member) => publicStarSeaMember(member, people)),
    item: record.item || "",
    itemId: record.itemId || "",
    itemSlot: record.itemSlot || "",
    itemTier: record.itemTier || 0,
    itemOwner: record.itemOwner || "",
    itemValue: record.itemValue || 0,
    auctionDividend: record.auctionDividend || 0,
    replayId,
    hasReplay: Boolean(record.replay || record.replayId) && isReplayWithinDays(replayRecord, currentDay),
    replay: null
  };
}

function publicStarSeaMember(member, people = null) {
  const person = people?.get(member.id);
  return {
    id: member.id,
    name: member.name,
    sect: member.sect,
    realm: member.realm,
    gender: member.gender,
    portraitUrl: compactPortraitUrl(member.portraitUrl || person?.portraitUrl, member.id),
    teamName: member.teamName,
    teamRank: member.teamRank,
    damage: member.damage || 0,
    spirit: member.spirit || 0,
    item: member.item || "",
    tierName: member.tierName || ""
  };
}

function publicStarSeaCycleHistory(records, people = null) {
  return (records || [])
    .slice(0, starSeaCycleHistoryLimit)
    .map((record) => publicStarSeaCycleSummary(record, people));
}

function publicStarSeaCycleSummary(record, people = null) {
  const reward = record.reward || null;
  return {
    cycle: record.cycle,
    cycleStartDay: record.cycleStartDay,
    cycleEndDay: record.cycleEndDay,
    teamSize: record.teamSize || starSeaTeamSize,
    dayCount: record.dayCount || 0,
    totalScore: record.totalScore || 0,
    totalDamage: record.totalDamage || 0,
    settled: Boolean(record.settled || reward?.settled),
    updatedDay: record.updatedDay || 0,
    updatedDate: record.updatedDate || "",
    reward: reward ? {
      settled: Boolean(reward.settled),
      type: reward.type || "",
      reason: reward.reason || "",
      itemId: reward.itemId || "",
      itemName: reward.itemName || "",
      itemSlot: reward.itemSlot || "",
      itemTier: reward.itemTier || 0,
      tierName: reward.tierName || "",
      itemValue: reward.itemValue || 0,
      winnerId: reward.winnerId || "",
      winnerName: reward.winnerName || "",
      teamId: reward.teamId || "",
      teamName: reward.teamName || "",
      teamRank: reward.teamRank || 0,
      dividend: reward.dividend || 0,
      share: reward.share || 0,
      participantCount: reward.participantCount || 0,
      day: reward.day || 0,
      date: reward.date || "",
      text: reward.text || ""
    } : null,
    topTeams: (record.topTeams || record.teams || []).map((team) => {
      const leader = people?.get(team.leaderId);
      return {
        id: team.id,
        name: team.name,
        rank: team.rank,
        leaderId: leader?.id || team.leaderId || "",
        leaderName: leader?.name || team.leaderName || "",
        leader: compactCultivatorRef(leader || { id: team.leaderId, name: team.leaderName }),
        totalScore: team.totalScore || 0,
        totalDamage: team.totalDamage || 0,
        totalSpirit: team.totalSpirit || 0,
        successes: team.successes || 0,
        battles: team.battles || 0,
        memberCount: (team.members || []).length,
        auctionDividend: team.auctionDividend || 0,
        item: team.item || "",
        itemOwner: team.itemOwner || "",
        itemValue: team.itemValue || 0
      };
    }),
    topMembers: (record.topMembers || []).map((member) => publicStarSeaMember(member, people))
  };
}

export function getDuelReplay(state, day, matchId) {
  ensureStateShape(state);
  const numericDay = Number(day);
  assertReplayDayAllowed(state, numericDay);
  const record = duelRecordForDay(state, numericDay);
  if (!record) throw new Error("未找到该日切磋记录");
  const match = (record.matches || []).find((item) => item.id === matchId);
  if (!match || match.type !== "battle") throw new Error("未找到该场切磋");
  if (!match.replay) throw new Error("该场切磋尚未保存回放");
  return publicReplay(match.replay, publicCultivatorRefMap(state));
}

export function getDuelReplayId(state, day, matchId) {
  ensureStateShape(state);
  const numericDay = Number(day);
  assertReplayDayAllowed(state, numericDay);
  const record = duelRecordForDay(state, numericDay);
  if (!record) throw new Error("未找到该日切磋记录");
  const match = (record.matches || []).find((item) => item.id === matchId);
  if (!match || match.type !== "battle") throw new Error("未找到该场切磋");
  return match.replayId || "";
}

export function assertReplayDayAllowed(state, day) {
  const numericDay = Number(day || 0);
  if (!numericDay || !isReplayWithinDays({ day: numericDay }, state?.day || 1)) {
    throw new Error(`战斗回放只支持最近 ${replayRetentionDays} 天。`);
  }
}

export function replayDayFromId(replayId) {
  const text = String(replayId || "");
  const patterns = [
    /^duel-(\d+)-/,
    /^blood-trial-(\d+)-/,
    /^void-hall-(\d+)-/,
    /^star-sea-(\d+)-/,
    /^battle-(\d+)-/
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return Number(match[1]) || 0;
  }
  return 0;
}

function publicProvinceWars(records, currentDay = 1, people = null) {
  return trimRecordsByDay(records, currentDay, publicBattleRecordDays, publicProvinceWarLimit).map((record, recordIndex) => ({
    ...record,
    attackerLineup: (record.attackerLineup || []).map((ref) => publicEntityRef(ref, people)),
    defenderLineup: (record.defenderLineup || []).map((ref) => publicEntityRef(ref, people)),
    battles: (record.battles || []).map((battle, battleIndex) => ({
      ...battle,
      attacker: publicEntityRef(battle.attacker, people),
      defender: publicEntityRef(battle.defender, people),
      winner: publicEntityRef(battle.winner, people),
      loser: publicEntityRef(battle.loser, people),
      replayId: battle.replayId || "",
      hasReplay: Boolean(battle.replay || battle.replayId) && isReplayWithinDays({ ...battle, day: battle.day || record.day }, currentDay),
      replay: null
    }))
  }));
}

function publicReplay(replay, people = null) {
  if (!replay) return null;
  const refPeople = people && typeof people.get === "function" ? people : null;
  const eventLimit = replay.kind === "dao-trial" ? 160 : replay.kind === "starSeaTeam" ? 80 : 40;
  const result = {
    ...replay,
    replayId: replay.replayId || makeReplayId("battle", timestampKey(), Math.random().toString(36).slice(2, 8)),
    events: (replay.events || []).slice(0, eventLimit)
  };
  for (const key of ["left", "right", "winner", "loser", "attacker", "defender", "challenger"]) {
    if (result[key]) result[key] = publicReplayEntityRef(result[key], refPeople);
  }
  if (result.team) {
    result.team = {
      ...result.team,
      members: (result.team.members || []).map((member) => publicReplayEntityRef(member, refPeople)),
      top: (result.team.top || []).map((member) => publicReplayEntityRef(member, refPeople))
    };
  }
  if (Array.isArray(result.members)) {
    result.members = result.members.map((member) => publicReplayEntityRef(member, refPeople));
  }
  if (Array.isArray(result.top)) {
    result.top = result.top.map((member) => publicReplayEntityRef(member, refPeople));
  }
  return result;
}

function publicReplayEntityRef(ref, people = null) {
  if (!ref || typeof ref !== "object") return ref;
  const replayPower = ref.stats ? powerOfStats(ref.stats) : ref.power;
  if (ref.kind === "monster") return { ...ref, power: replayPower, portraitUrl: compactPortraitUrl(ref.portraitUrl, ref.id) };
  const publicRef = publicEntityRef(ref, people);
  return {
    ...ref,
    ...publicRef,
    power: replayPower,
    portraitUrl: publicRef?.portraitUrl || compactPortraitUrl(ref.portraitUrl, ref.id)
  };
}

export function getPublicReplay(replay, stateOrPeople = null) {
  const people = stateOrPeople?.player || stateOrPeople?.npcs
    ? publicCultivatorRefMap(stateOrPeople)
    : stateOrPeople;
  return publicReplay(replay, people);
}

function cultivatorMapFromRefs(records) {
  const map = new Map();
  for (const record of records || []) {
    for (const match of record.matches || []) {
      for (const ref of [match.left, match.right, match.winner, match.loser, match.attacker, match.defender, match.challenger]) {
        if (ref?.id && ref.portraitUrl) map.set(ref.id, ref);
      }
    }
  }
  return map;
}

function mergeRefMaps(...maps) {
  const merged = new Map();
  for (const map of maps) {
    for (const [key, value] of map || []) {
      if (!merged.has(key) || !merged.get(key)?.portraitUrl) merged.set(key, value);
    }
  }
  return merged;
}

function publicEntityRef(ref, people = null) {
  if (!ref) return ref;
  const fallback = people && typeof people.get === "function" ? people.get(ref.id) : null;
  const portraitSource = ref.portraitUrl || fallback?.portraitUrl || "";
  const rank = ref.duelSeason ? duelRankForScore(ref.duelSeason.score || 0) : null;
  return {
    kind: ref.kind,
    id: ref.id,
    name: ref.name,
    realm: ref.realm,
    sect: ref.sect,
    portraitUrl: compactPortraitUrl(portraitSource, ref.id),
    rankId: ref.rankId || ref.duelSeason?.rankId || rank?.id || "",
    rankName: ref.rankName || ref.duelSeason?.rankName || rank?.name || "",
    rankColor: ref.rankColor || ref.duelSeason?.rankColor || rank?.color || "",
    duelSeason: ref.duelSeason ? {
      season: ref.duelSeason.season,
      score: ref.duelSeason.score || 0,
      wins: ref.duelSeason.wins || 0,
      losses: ref.duelSeason.losses || 0,
      rankId: ref.duelSeason.rankId || rank?.id || "",
      rankName: ref.duelSeason.rankName || rank?.name || "",
      rankColor: ref.duelSeason.rankColor || rank?.color || ""
    } : null,
    skillId: ref.skillId,
    skillRank: skillRankOf(ref, ref.skillId)
  };
}

function publicSectProfiles(state) {
  const profileMap = new Map();
  const add = (name, profile = {}) => {
    if (!name) return;
    const current = profileMap.get(name) || { id: name, name, portraitUrl: "" };
    profileMap.set(name, {
      ...current,
      ...profile,
      id: name,
      name: profile.name || name,
      portraitUrl: profile.portraitUrl || current.portraitUrl || ""
    });
  };
  for (const sectName of sects) {
    const currentName = currentSectName(state, sectName);
    add(currentName, state.sectProfiles?.[currentName] || state.sectProfiles?.[sectName]);
  }
  for (const key of Object.keys(state.sectRivals || {})) add(key, state.sectProfiles?.[key]);
  add(state.sect?.name, state.sectProfiles?.[state.sect?.name]);
  for (const npc of state.npcs || []) add(npc.sect, state.sectProfiles?.[npc.sect]);
  for (const territory of state.provinces || []) add(territory.owner, state.sectProfiles?.[territory.owner]);
  return [...profileMap.values()].sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
}

function buildSectSummaries(state) {
  ensureProvinceState(state);
  const fixedSects = {
    ...state.sectRivals,
    [state.sect.name]: {
      name: state.sect.name,
      reputation: state.sect.reputation,
      supplies: state.sect.supplies,
      rivalHeat: state.sect.rivalHeat,
      warWins: state.sect.warWins,
      warLosses: state.sect.warLosses
    }
  };
  const members = [
    { ...state.player, sect: state.sect.name, mood: "求道", power: powerOf(state.player, state), isPlayer: true },
    ...state.npcs.map((npc) => ({ ...npc, power: powerOf(npc, state), isPlayer: false }))
  ];
  const groups = new Map();

  for (const member of members) {
    const sectStatus = fixedSects[member.sect] || {
      name: member.sect,
      reputation: 0,
      supplies: 0,
      rivalHeat: 0,
      warWins: 0,
      warLosses: 0
    };
    const current = groups.get(member.sect) || {
      name: member.sect,
      portraitUrl: state.sectProfiles?.[member.sect]?.portraitUrl || "",
      reputation: sectStatus.reputation,
      supplies: sectStatus.supplies,
      rivalHeat: sectStatus.rivalHeat,
      warWins: sectStatus.warWins,
      warLosses: sectStatus.warLosses,
      provinces: [],
      effects: [],
      members: [],
      totalPower: 0
    };
    current.members.push({
      id: member.id,
      name: member.name,
      gender: member.gender,
      sect: member.sect,
      realm: member.realm,
      mood: member.mood,
      root: member.root,
      roots: member.roots,
      primaryRootKey: member.primaryRootKey,
      skillId: member.skillId,
      portraitUrl: compactPortraitUrl(member.portraitUrl, member.id),
      power: member.power,
      isPlayer: member.isPlayer
    });
    current.totalPower += member.power;
    groups.set(member.sect, current);
  }

  return [...groups.values()]
    .map((sect) => {
      const profile = state.sectProfiles?.[sect.name] || {};
      const rankedMembers = [...sect.members].sort((a, b) => b.power - a.power);
      const explicitLeader = sect.members.find((member) => member.id === profile.leaderId);
      const leader = explicitLeader || rankedMembers[0] || null;
      const elderIds = new Set((Array.isArray(profile.elderIds) ? profile.elderIds : []).filter((id) => id && id !== leader?.id));
      const elders = sect.members
        .filter((member) => elderIds.has(member.id))
        .sort((a, b) => b.power - a.power || a.name.localeCompare(b.name, "zh-Hans-CN"));
      return {
        ...sect,
        members: sect.members.map(compactCultivatorRef),
        leaderId: leader?.id || "",
        leaderName: leader?.name || "无",
        leader: leader?.name || "无",
        elders: elders.map(compactCultivatorRef),
        elderIds: elders.map((member) => member.id),
        elderNames: elders.map((member) => member.name),
        provinces: (state.provinces || [])
          .filter((territory) => territory.owner === sect.name)
          .map((territory) => {
            const province = provinceById(territory.id);
            return province ? {
              ...province,
              owner: territory.owner,
              defenders: territory.defenders || [],
              effect: provinceEffect(province)
            } : null;
          })
          .filter(Boolean),
        effects: provinceEffectsForSect(state, sect.name),
        resourcePlan: {
          spirit: publicProvinceResourceSummary(state, sect.name, "spirit"),
          dust: publicProvinceResourceSummary(state, sect.name, "dust"),
          xp: publicProvinceResourceSummary(state, sect.name, "xp"),
          breakthrough: publicProvinceResourceSummary(state, sect.name, "breakthrough")
        },
        totalPower: Math.round(sect.totalPower)
      };
    })
    .sort((a, b) => b.totalPower - a.totalPower);
}

export function settleIfNeeded(state, options = {}) {
  const today = dateKey();
  const maxDays = Math.max(1, Number(options.maxDays) || Number.POSITIVE_INFINITY);
  let settledDays = 0;
  if (!state.lastSettlementDate) state.lastSettlementDate = today;
  if (state.lastSettlementDate >= today) return false;

  while (state.lastSettlementDate < today && settledDays < maxDays) {
    const settlementDate = addDays(state.lastSettlementDate, 1);
    dailySettlement(state, { auto: true, settlementDate });
    settledDays += 1;
  }
  return true;
}

export function dailySettlement(state, options = {}) {
  const settlementTime = options.settlementTime || timestampKey();
  rememberTaskMultiplierForDay(state, state.day);
  advanceDailyRootFortuneDay(state);
  archiveExpiredBattleRecords(state);
  state.player.breakthroughAttemptsToday = 0;
  normalizeElixirEffects(state);
  rememberTaskMultiplierForDay(state, state.day);
  const settlementDate = stateDateForDay(state);
  const events = [
    "坊市传来秘境流言，众修士人心浮动。",
    "宗门执事清点物资，贡献高者可先得丹药。",
    "山雨压城，灵气却格外活跃。",
    "有散修在擂台连胜三场，榜单排名变动。"
  ];
  const duelSeasonRewards = new Map();
  for (const { entity } of allCultivators(state)) {
    const beforeSpirit = Math.max(0, Math.floor(Number(entity.spirit) || 0));
    const beforeSeason = entity.duelSeason?.season;
    normalizeDuelSeason(entity, state.day, { grantReward: true, state });
    const reward = Math.max(0, Math.floor(Number(entity.spirit) || 0) - beforeSpirit);
    if (reward > 0 && beforeSeason && beforeSeason !== entity.duelSeason?.season) {
      const history = entity.duelSeasonHistory?.find((record) => record.season === beforeSeason);
      duelSeasonRewards.set(entity.id, { reward, record: history });
    }
  }
  runProvinceSieges(state, settlementDate, settlementTime);
  addProvinceIncome(state, settlementDate);

  for (const npc of state.npcs) {
    const beforeRealm = npc.realm;
    const baseXp = 100;
    const sectXpShare = sectXpBonus(state, npc.sect, npc);
    const xpMultiplier = xpGainMultiplier(npc, state) * (1 + sectXpShare);
    const npcTalentXpMultiplier = talentSnapshot(npc).xpMultiplier;
    const totalXp = Math.floor(baseXp * xpMultiplier * npcTalentXpMultiplier);
    const bonusXp = Math.max(0, totalXp - baseXp);
    npc.xp += totalXp;

    const provinceSpirit = provinceResourceShareFor(state, npc.sect, npc, "spirit", { integer: true });
    const provinceDust = provinceResourceShareFor(state, npc.sect, npc, "dust", { integer: true });
    const spirit = provinceSpirit;

    let boughtXp = 0;
    const needBeforeBreak = xpNeed(npc.realm);
    const missingXp = Math.max(0, needBeforeBreak - npc.xp);
    if (missingXp > 0 && missingXp <= 100 && missingXp <= npc.spirit && npc.realm < realms.length - 1) {
      npc.spirit -= missingXp;
      npc.xp += missingXp;
      boughtXp = missingXp;
    }

    const chanceParts = breakthroughChanceParts(state, npc);
    let breakthroughNote = "日常修炼";
    if (npc.xp >= xpNeed(npc.realm) && npc.realm < realms.length - 1) {
      const fromRealm = npc.realm;
      const targetRealm = npc.realm + 1;
      const success = Math.random() < chanceParts.total;
      let growth = null;
      if (success) {
        npc.realm = targetRealm;
        growth = applyBreakthroughGrowth(npc, fromRealm);
        npc.hp = effectiveMaxHp(npc, state);
        npc.mana = effectiveMaxMana(npc, state);
        npc.reputation += 4 + npc.realm;
        breakthroughNote = `突破至${realms[npc.realm]}`;
      } else {
        npc.hp = clamp(npc.hp - 18, 1, effectiveMaxHp(npc, state));
        npc.mana = clamp((npc.mana || 0) - 12, 0, effectiveMaxMana(npc, state));
        breakthroughNote = `冲击${realms[targetRealm]}失败`;
      }
      npc.breakthroughs.unshift({
        day: state.day,
        date: settlementDate,
        time: settlementTime,
        from: realms[fromRealm],
        to: realms[targetRealm] || "未知境界",
        success,
        chance: chanceParts.total,
        baseChance: chanceParts.base,
        bonusChance: chanceParts.bonus,
        growth
      });
      npc.breakthroughs = trimRecordsByDay(npc.breakthroughs, state.day, growthRecordDays, growthRecordLimit);
    }

    const duelSeasonReward = duelSeasonRewards.get(npc.id)?.reward || 0;
    const skillUpgradeNote = autoUpgradeNpcSkill(state, npc);
    npc.dailyRecords.unshift({
      day: state.day,
      date: settlementDate,
      time: settlementTime,
      xp: totalXp + boughtXp,
      baseXp,
      bonusXp,
      boughtXp,
      spirit: spirit + duelSeasonReward,
      baseSpirit: provinceFlatValueForSect(state, npc.sect, "spirit"),
      provinceSpirit,
      provinceDust,
      duelSeasonReward,
      rootXpMultiplier: xpGainMultiplier(npc, state),
      talentXpMultiplier: npcTalentXpMultiplier,
      sectXpMultiplier: 1 + sectXpShare,
      rootCount: rootCount(npc),
      realm: realms[npc.realm],
      breakChance: chanceParts.total,
      realmBaseBreakChance: chanceParts.realmBase,
      rootBreakMultiplier: chanceParts.rootMultiplier,
      talentBreakMultiplier: chanceParts.talentMultiplier,
      sectBreakMultiplier: chanceParts.sectMultiplier,
      baseBreakChance: chanceParts.base,
      bonusBreakChance: chanceParts.bonus,
      note: `${breakthroughNote || (npc.realm > beforeRealm ? `突破至${realms[npc.realm]}` : "日常修炼")}${provinceDust ? `；宗门灵尘包 +${provinceDust} 灵尘` : ""}${duelSeasonReward ? `；切磋赛季奖励 +${duelSeasonReward} 灵石` : ""}${skillUpgradeNote ? `；技能${skillUpgradeNote}` : ""}`
    });
    npc.dailyRecords = trimRecordsByDay(npc.dailyRecords, state.day, growthRecordDays, growthRecordLimit);
    npc.mood = pick(["谨慎", "好斗", "闭关", "游历"]);
  }

  state.sect.supplies = clamp(state.sect.supplies + Math.floor(Math.random() * 18) - 5, 0, 160);
  state.sect.rivalHeat = clamp(state.sect.rivalHeat + Math.floor(Math.random() * 15) - 4, 0, 100);
  for (const status of Object.values(state.sectRivals || {})) {
    status.supplies = clamp(status.supplies + Math.floor(Math.random() * 14) - 4, 0, 180);
    status.rivalHeat = clamp(status.rivalHeat + Math.floor(Math.random() * 13) - 4, 0, 100);
  }
  const playerSectXpShare = sectXpBonus(state, state.sect.name, state.player);
  const playerFortuneXpMultiplier = dailyRootFortuneXpMultiplier(state, state.player);
  const playerBaseCultivationXp = Math.floor(playerDailyBaseXp * playerFortuneXpMultiplier);
  const playerProvinceXp = Math.floor(playerDailyBaseXp * playerSectXpShare * playerFortuneXpMultiplier);
  const playerTalentXpMultiplier = talentSnapshot(state.player).xpMultiplier;
  const playerCatchup = playerCatchupProfile(state);
  const playerPassiveXp = Math.floor((playerBaseCultivationXp + playerProvinceXp) * playerTalentXpMultiplier * playerCatchup.multiplier);
  state.player.xp += playerPassiveXp;
  runDailyDungeons(state, settlementDate, settlementTime);
  const playerDungeonEntries = (state.player.dungeonHistory || []).filter((record) => record.day === state.day);
  const playerSoloDungeon = playerDungeonEntries.find((record) => record.type === "solo");
  const playerDungeonSpirit = playerDungeonEntries.reduce((sum, record) => sum + (record.spirit || 0), 0);
  const playerDuelSeasonReward = duelSeasonRewards.get(state.player.id)?.reward || 0;
  const playerProvinceSpirit = provinceResourceShareFor(state, state.sect.name, state.player, "spirit", { integer: true });
  const playerProvinceDust = provinceResourceShareFor(state, state.sect.name, state.player, "dust", { integer: true });
  const playerChanceParts = breakthroughChanceParts(state, state.player);
  const playerProgressNote = `经验 +${playerPassiveXp}${playerProvinceXp ? `（宗门资源 +${playerProvinceXp}）` : ""}${playerCatchup.multiplier > 1 ? `（追赶助益 x${playerCatchup.multiplier.toFixed(2)}）` : ""}`;
  state.player.dailyRecords.unshift({
    day: state.day,
    date: settlementDate,
    time: settlementTime,
    xp: playerPassiveXp,
    baseXp: playerDailyBaseXp,
    fortuneBaseXp: playerBaseCultivationXp,
    bonusXp: playerPassiveXp - playerDailyBaseXp,
    passiveXp: playerPassiveXp,
    provinceXp: playerProvinceXp,
    talentXpMultiplier: playerTalentXpMultiplier,
    catchupMultiplier: playerCatchup.multiplier,
    dailyRootFortuneXpMultiplier: playerFortuneXpMultiplier,
    spirit: playerDungeonSpirit + playerDuelSeasonReward + playerProvinceSpirit,
    provinceSpirit: playerProvinceSpirit,
    provinceDust: playerProvinceDust,
    duelSeasonReward: playerDuelSeasonReward,
    realm: realms[state.player.realm],
    breakChance: playerChanceParts.total,
    realmBaseBreakChance: playerChanceParts.realmBase,
    rootBreakMultiplier: playerChanceParts.rootMultiplier,
    talentBreakMultiplier: playerChanceParts.talentMultiplier,
    sectBreakMultiplier: playerChanceParts.sectMultiplier,
    baseBreakChance: playerChanceParts.base,
    bonusBreakChance: playerChanceParts.bonus,
    note: `每日修行：${playerProgressNote}；副本：${playerSoloDungeon?.name || "今日历练"} ${playerSoloDungeon?.result || ""}${playerProvinceSpirit ? `；宗门灵石包 +${playerProvinceSpirit} 灵石` : ""}${playerProvinceDust ? `；宗门灵尘包 +${playerProvinceDust} 灵尘` : ""}${playerDuelSeasonReward ? `；切磋赛季奖励 +${playerDuelSeasonReward} 灵石` : ""}`
  });
  state.player.dailyRecords = trimRecordsByDay(state.player.dailyRecords, state.day, growthRecordDays, growthRecordLimit);
  settleDailySpiritPearlAssets(state);
  runDailyDuels(state, settlementTime);
  captureDailyRankSnapshots(state);
  ensureDaoTrialState(state);
  generateDailyEncounter(state);
  state.lastSettlementDate = options.settlementDate || dateKey();
  rememberTaskMultiplierForDay(state, state.day);

  if (options.auto) log(state, "子时已过，天地灵机一转，今日自动结算完成。", "gold");
  if (options.manual) log(state, "你翻过一页札记，手动推进了一天。", "gold");
  const fortune = publicDailyRootFortune(state);
  log(state, `今日天运落于${fortune.name}，${fortune.effectText}；共有 ${fortune.resonantCount} 名修士与天运共鸣。`, "gold");
  log(state, pick(events), "gold");
}

export function addTask(state, payload) {
  ensureTaskSystem(state);
  const taskId = payload.taskId || payload.id;
  let definition = state.taskDefinitions.find((item) => item.id === taskId);
  if (!definition && payload.name) {
    definition = normalizeTaskDefinition({
      name: payload.name,
      detail: "",
      type: "complete",
      category: payload.type || "生活",
      xpReward: Math.max(0, Math.floor(Number(payload.xpReward ?? 1000 * clamp(Number(payload.diff || 1), 1, 5)) || 0)),
      spiritReward: Math.max(0, Math.floor(Number(payload.spiritReward ?? 0) || 0))
    });
  }
  if (!definition) throw new Error("未知现实任务");
  if (!definition.enabled) throw new Error("该现实任务已停用");

  const p = state.player;
  const currentDay = Math.max(1, Math.floor(Number(state.day) || 1));
  const targetDay = Math.max(1, Math.floor(Number(payload.day ?? payload.targetDay ?? currentDay) || currentDay));
  if (targetDay > currentDay || targetDay < Math.max(1, currentDay - taskMultiplierRecordDays + 1)) {
    throw new Error("只能补记最近三天的现实任务");
  }
  const progress = taskProgressEntry(state, targetDay, definition.id);
  const requestedAmount = definition.type === "measurable"
    ? Math.max(0, Number(payload.completedAmount ?? payload.amount ?? definition.targetAmount) || 0)
    : 1;
  if (requestedAmount <= 0) throw new Error("完成量必须大于 0");
  const maxAmount = definition.type === "measurable"
    ? definition.targetAmount * definition.maxMultiplier
    : 1;
  const completedAmount = definition.type === "measurable"
    ? clamp(requestedAmount, 0, maxAmount)
    : 1;
  if (definition.type === "complete" && progress.awardedMultiplier >= 1) {
    throw new Error(`「${definition.name}」今日已结算，明日再来。`);
  }
  const nextMultiplier = definition.type === "measurable"
    ? clamp(completedAmount / definition.targetAmount, 0, definition.maxMultiplier)
    : 1;
  const deltaMultiplier = Math.max(0, nextMultiplier - progress.awardedMultiplier);
  if (deltaMultiplier <= 0.000001) {
    throw new Error(`「${definition.name}」已计入 ${formatTaskProgressAmount(progress.amount, definition)}，提高完成量后再结算。`);
  }
  const requestedBaseXp = Math.round(definition.xpReward * deltaMultiplier);
  const efficiency = taskEfficiencyForDay(state, targetDay, requestedBaseXp);
  const baseXpGain = efficiency.effectiveBaseXp;
  const spiritGain = Math.round(definition.spiritReward * deltaMultiplier);
  const dayMultiplier = taskMultiplierForDay(state, targetDay);
  const elixirMultiplier = Math.max(1, Number(dayMultiplier.elixirMultiplier) || 1);
  const sectXpMultiplier = Math.max(1, Number(dayMultiplier.sectXpMultiplier) || 1);
  const taskTalentMultiplier = talentSnapshot(p).xpMultiplier;
  const catchup = playerCatchupProfile(state);
  const fortuneXpMultiplier = dailyRootFortuneXpMultiplier(state, p, targetDay);
  const afterElixirXp = Math.round(baseXpGain * elixirMultiplier);
  const beforeTalentXp = Math.round(afterElixirXp * sectXpMultiplier);
  const xpMultiplier = elixirMultiplier * sectXpMultiplier * taskTalentMultiplier * catchup.multiplier * fortuneXpMultiplier;
  const xpGain = Math.round(beforeTalentXp * taskTalentMultiplier * catchup.multiplier * fortuneXpMultiplier);
  p.xp += xpGain;
  p.spirit += spiritGain;
  progress.amount = Math.max(progress.amount, completedAmount);
  progress.awardedMultiplier = nextMultiplier;

  const completion = {
    id: makeId("task-done"),
    taskId: definition.id,
    name: definition.name,
    detail: definition.detail,
    type: definition.type,
    category: definition.category,
    unitName: definition.unitName,
    completedAmount,
    targetAmount: definition.targetAmount,
    multiplier: deltaMultiplier,
    completedMultiplier: nextMultiplier,
    xp: xpGain,
    baseXp: baseXpGain,
    beforeTalentXp,
    requestedBaseXp,
    taskEfficiencyMultiplier: efficiency.multiplier,
    taskBudgetReducedXp: efficiency.reducedBaseXp,
    elixirMultiplier,
    sectXpMultiplier,
    talentMultiplier: taskTalentMultiplier,
    catchupMultiplier: catchup.multiplier,
    dailyRootFortuneXpMultiplier: fortuneXpMultiplier,
    xpMultiplier,
    roundingMode: "round",
    spirit: spiritGain,
    day: targetDay,
    date: dayMultiplier.date || stateDateForDay(state, targetDay)
  };
  state.taskCompletions.unshift(completion);
  state.taskCompletions = state.taskCompletions.slice(0, taskCompletionLimit);
  return {
    operation: "add",
    completion
  };
}

export function deleteTaskCompletion(state, payload = {}) {
  ensureTaskSystem(state);
  const id = String(payload.id || "");
  const index = state.taskCompletions.findIndex((item) => item.id === id);
  if (index < 0) throw new Error("未找到这条任务记录");

  const completion = state.taskCompletions[index];
  if (Number(completion.day) !== Number(state.day)) {
    throw new Error("仅能撤回当日完成的任务");
  }

  const xpGain = Math.max(0, Number(completion.xp) || 0);
  const spiritGain = Math.max(0, Number(completion.spirit) || 0);
  if (state.player.xp < xpGain || state.player.spirit < spiritGain) {
    throw new Error("该任务收益已被消耗，无法安全撤回");
  }

  state.player.xp -= xpGain;
  state.player.spirit -= spiritGain;
  state.taskCompletions.splice(index, 1);
  const day = Math.max(1, Math.floor(Number(completion.day) || state.day || 1));
  if (state.taskProgress?.[day]) {
    delete state.taskProgress[day][completion.taskId];
    if (!Object.keys(state.taskProgress[day]).length) delete state.taskProgress[day];
  }
  normalizeTaskProgress(state);
  return {
    operation: "delete",
    deletedCompletionId: completion.id
  };
}

export function createTaskDefinition(state, payload = {}) {
  ensureTaskSystem(state);
  const definition = normalizeTaskDefinition({ ...payload, id: makeId("task") });
  state.taskDefinitions.unshift(definition);
  state.taskDefinitions = state.taskDefinitions.slice(0, taskDefinitionLimit);
  log(state, `后台新增现实任务「${definition.name}」。`, "gold");
  return definition;
}

export function updateGameSettings(state, payload = {}) {
  ensureStateShape(state);
  const requestedBudget = Number(payload.taskDailyFullXpBudget);
  if (!Number.isFinite(requestedBudget)) throw new Error("有效任务修为额度必须是数字");
  const requestedSpeed = payload.battleReplaySpeed === undefined
    ? state.gameSettings.battleReplaySpeed
    : Number(payload.battleReplaySpeed);
  if (!Number.isFinite(requestedSpeed)) throw new Error("战斗回放速度必须是数字");
  const requestedTickerSpeed = payload.dailyTickerSpeed === undefined
    ? state.gameSettings.dailyTickerSpeed
    : Number(payload.dailyTickerSpeed);
  if (!Number.isFinite(requestedTickerSpeed)) throw new Error("今日播报速度必须是数字");
  state.gameSettings.taskDailyFullXpBudget = clamp(Math.floor(requestedBudget), 0, maxTaskDailyFullXpBudget);
  state.gameSettings.battleReplaySpeed = battleReplaySpeed({ gameSettings: { battleReplaySpeed: requestedSpeed } });
  state.gameSettings.dailyTickerSpeed = dailyTickerSpeed({ gameSettings: { dailyTickerSpeed: requestedTickerSpeed } });
  log(state, `后台将每日有效任务修为额度调整为 ${state.gameSettings.taskDailyFullXpBudget}，战斗回放速度调整为 ${state.gameSettings.battleReplaySpeed}x，今日播报速度调整为 ${state.gameSettings.dailyTickerSpeed}x。`, "gold");
  return { ...state.gameSettings };
}

export function updateTaskDefinition(state, payload = {}) {
  ensureTaskSystem(state);
  const index = state.taskDefinitions.findIndex((definition) => definition.id === payload.id);
  if (index < 0) throw new Error("未知现实任务");
  const next = normalizeTaskDefinition({ ...state.taskDefinitions[index], ...payload }, state.taskDefinitions[index]);
  state.taskDefinitions[index] = next;
  log(state, `后台更新现实任务「${next.name}」。`, "gold");
  return next;
}

export function deleteTaskDefinition(state, payload = {}) {
  ensureTaskSystem(state);
  const index = state.taskDefinitions.findIndex((definition) => definition.id === payload.id);
  if (index < 0) throw new Error("未知现实任务");
  const [removed] = state.taskDefinitions.splice(index, 1);
  log(state, `后台删除现实任务「${removed.name}」。`, "bad");
  return removed;
}

export function toggleTaskDefinition(state, payload = {}) {
  ensureTaskSystem(state);
  const definition = state.taskDefinitions.find((item) => item.id === payload.id);
  if (!definition) throw new Error("未知现实任务");
  definition.enabled = payload.enabled === undefined ? !definition.enabled : Boolean(payload.enabled);
  log(state, `后台${definition.enabled ? "启用" : "停用"}现实任务「${definition.name}」。`, definition.enabled ? "gold" : "bad");
  return definition;
}

export function changePlayerPortrait(state, payload = {}) {
  const variantCount = Math.max(1, Number(payload.count || 1));
  const nextVariant = Number.isFinite(Number(payload.variant))
    ? Number(payload.variant)
    : Number(state.player.portraitVariant || 0) + 1;
  state.player.portraitVariant = ((Math.trunc(nextVariant) % variantCount) + variantCount) % variantCount;
  log(state, "你换上新的画像玉简。", "gold");
}

function normalizeProfileName(value, fallback = "未命名") {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return fallback;
  return text.slice(0, 24);
}

function normalizeGender(value) {
  return ["male", "female", "unknown"].includes(value) ? value : "unknown";
}

function normalizePortraitUrl(value) {
  if (value === null) return "";
  if (value === undefined) return undefined;
  const text = String(value || "").trim();
  if (!text) return "";
  if (!/^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/i.test(text)) {
    throw new Error("头像必须是压缩后的图片数据。");
  }
  if (Buffer.byteLength(text, "utf8") > 900_000) {
    throw new Error("头像数据仍然过大，请裁剪或压缩后再保存。");
  }
  return text;
}

function normalizeAdminInteger(value, fallback, { min = 0, max = 999999999 } = {}) {
  if (value === undefined || value === null || value === "") return fallback;
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return clamp(Math.floor(number), min, max);
}

function applyAdminCultivatorStats(state, entity, payload) {
  entity.skillId = payload.skillId && !needsSkillMigration(String(payload.skillId))
    ? String(payload.skillId)
    : entity.skillId;
  normalizeSkillState(entity);
  entity.xp = normalizeAdminInteger(payload.xp, entity.xp || 0, { min: 0 });
  entity.spirit = normalizeAdminInteger(payload.spirit, entity.spirit || 0, { min: 0 });
  entity.maxHp = normalizeAdminInteger(payload.maxHp, entity.maxHp || 1, { min: 1, max: 999999 });
  entity.attack = normalizeAdminInteger(payload.attack, entity.attack || 1, { min: 1, max: 999999 });
  entity.defense = normalizeAdminInteger(payload.defense, entity.defense || 0, { min: 0, max: 999999 });
  entity.divineSense = normalizeAdminInteger(payload.divineSense, entity.divineSense || 1, { min: 1, max: 999999 });
  entity.maxMana = normalizeAdminInteger(payload.maxMana, entity.maxMana || 1, { min: 1, max: 999999 });
  const maxHp = effectiveMaxHp(entity, state);
  const maxMana = effectiveMaxMana(entity, state);
  entity.hp = clamp(normalizeAdminInteger(entity.hp, maxHp, { min: 1, max: maxHp }), 1, maxHp);
  entity.mana = clamp(normalizeAdminInteger(entity.mana, maxMana, { min: 0, max: maxMana }), 0, maxMana);
}

function normalizeSectOffices(state, sectName, payload = {}) {
  const members = membersForSect(state, sectName).map(({ entity }) => entity);
  const memberIds = new Set(members.map((member) => member.id));
  const leaderId = String(payload.leaderId || "").trim();
  const elderIds = [...new Set((Array.isArray(payload.elderIds) ? payload.elderIds : [])
    .map((id) => String(id || "").trim())
    .filter(Boolean))];
  if (leaderId && !memberIds.has(leaderId)) throw new Error("掌门必须是本宗门成员。");
  const invalidElder = elderIds.find((id) => !memberIds.has(id));
  if (invalidElder) throw new Error("长老必须是本宗门成员。");
  const fallbackLeaderId = [...members].sort((a, b) => powerOf(b, state) - powerOf(a, state))[0]?.id || "";
  const effectiveLeaderId = leaderId || fallbackLeaderId;
  if (effectiveLeaderId && elderIds.includes(effectiveLeaderId)) throw new Error("掌门和长老不能是同一个人。");
  return { leaderId, elderIds };
}

function renameValue(value, oldName, newName) {
  return value === oldName ? newName : value;
}

function renameEntityRef(ref, oldName, newName) {
  if (ref && ref.sect === oldName) ref.sect = newName;
}

function renameReplaySects(replay, oldName, newName) {
  if (!replay) return;
  renameEntityRef(replay.left, oldName, newName);
  renameEntityRef(replay.right, oldName, newName);
}

function renameSectEverywhere(state, oldName, newName) {
  if (!oldName || !newName || oldName === newName) return;
  if (state.sect?.name === oldName) {
    state.sect.name = newName;
    state.player.sect = newName;
  }
  for (const npc of state.npcs || []) npc.sect = renameValue(npc.sect, oldName, newName);
  if (state.sectRivals?.[oldName]) {
    state.sectRivals[newName] = { ...state.sectRivals[oldName], name: newName };
    delete state.sectRivals[oldName];
  }
  if (state.sectProfiles?.[oldName]) {
    state.sectProfiles[newName] = { ...state.sectProfiles[oldName], name: newName };
    delete state.sectProfiles[oldName];
  }
  state.sectNameMap ??= {};
  for (const baseName of sects) {
    if (currentSectName(state, baseName) === oldName || baseName === oldName) state.sectNameMap[baseName] = newName;
  }
  for (const territory of state.provinces || []) territory.owner = renameValue(territory.owner, oldName, newName);
  for (const item of state.equipment || []) item.ownerSect = renameValue(item.ownerSect, oldName, newName);
  for (const record of state.equipmentTransfers || []) {
    record.winnerSect = renameValue(record.winnerSect, oldName, newName);
    record.loserSect = renameValue(record.loserSect, oldName, newName);
  }
  for (const record of state.dungeonDays || []) {
    for (const entry of record.solo || []) entry.sect = renameValue(entry.sect, oldName, newName);
    for (const sectRecord of record.sects || []) {
      sectRecord.sect = renameValue(sectRecord.sect, oldName, newName);
      for (const battle of sectRecord.battles || []) {
        renameEntityRef(battle.challenger, oldName, newName);
        renameReplaySects(battle.replay, oldName, newName);
      }
    }
    for (const cave of record.bloodTrial?.caves || []) {
      for (const entry of [...(cave.clears || []), ...(cave.challengers || [])]) entry.sect = renameValue(entry.sect, oldName, newName);
    }
    if (record.public) {
      for (const entry of record.public.top || []) entry.sect = renameValue(entry.sect, oldName, newName);
      for (const team of record.public.teams || []) {
        for (const member of team.members || []) member.sect = renameValue(member.sect, oldName, newName);
        for (const member of team.top || []) member.sect = renameValue(member.sect, oldName, newName);
        renameReplaySects(team.replay, oldName, newName);
      }
      renameReplaySects(record.public.replay, oldName, newName);
    }
  }
  for (const day of state.duelDays || []) {
    for (const match of day.matches || []) {
      for (const key of ["left", "right", "winner", "loser"]) renameEntityRef(match[key], oldName, newName);
      renameReplaySects(match.replay, oldName, newName);
    }
  }
  for (const war of state.provinceWars || []) {
    war.attacker = renameValue(war.attacker, oldName, newName);
    war.defender = renameValue(war.defender, oldName, newName);
    for (const member of war.attackerLineup || []) renameEntityRef(member, oldName, newName);
    for (const member of war.defenderLineup || []) renameEntityRef(member, oldName, newName);
    for (const battle of war.battles || []) {
      renameEntityRef(battle.attacker, oldName, newName);
      renameEntityRef(battle.defender, oldName, newName);
      renameReplaySects(battle.replay, oldName, newName);
    }
  }
  for (const { entity } of allCultivators(state)) {
    for (const record of entity.duelHistory || []) {
      record.sect = renameValue(record.sect, oldName, newName);
      renameReplaySects(record.replay, oldName, newName);
    }
    for (const record of entity.dungeonHistory || []) {
      record.sect = renameValue(record.sect, oldName, newName);
      renameReplaySects(record.replay, oldName, newName);
    }
  }
  assignProvinceDefenders(state);
}

export function updateCultivatorProfile(state, payload = {}) {
  ensureStateShape(state);
  const id = String(payload.id || "");
  const entity = cultivatorById(state, id);
  if (!entity) throw new Error("未找到该角色。");
  entity.name = normalizeProfileName(payload.name, entity.name || "未命名");
  entity.gender = normalizeGender(payload.gender);
  const rootSet = rootSetFromKeys(payload.rootKeys || payload.roots, entity);
  entity.roots = rootSet.roots;
  entity.primaryRootKey = rootSet.primaryRootKey;
  entity.root = rootSet.primaryRoot;
  applyAdminCultivatorStats(state, entity, payload);
  const previousPotentialRealm = potentialRealmFor(entity);
  if (payload.potentialRealm !== undefined && payload.potentialRealm !== null && payload.potentialRealm !== "") {
    entity.potentialRealm = normalizeAdminInteger(payload.potentialRealm, previousPotentialRealm, { min: 0, max: realms.length - 1 });
    entity.potentialSource = "admin";
  }
  const talentMode = payload.talentMode === "manual" ? "manual" : "auto";
  if (talentMode === "manual") {
    entity.talentOverride = normalizeAdminInteger(payload.talentScore, entity.talent?.score || 50, { min: 1, max: 100 });
  } else {
    entity.talentOverride = null;
  }
  const potentialChanged = potentialRealmFor(entity) !== previousPotentialRealm;
  const talentModeChanged = Boolean(entity.talent?.overridden) !== (talentMode === "manual");
  ensureTalent(entity, {
    rebirth: state.rebirth,
    reroll: potentialChanged || talentModeChanged || Boolean(payload.rerollTalent)
  });
  // Public state exposes stored portraits through this route. Treat that value as unchanged,
  // otherwise a profile edit unrelated to the portrait fails image-data validation.
  const portraitProxy = /^\/api\/cultivators\/portrait\?id=([^&]+)/;
  const portraitMatch = String(payload.portraitUrl || "").match(portraitProxy);
  const portraitUrl = portraitMatch && decodeURIComponent(portraitMatch[1]) === id
    ? undefined
    : normalizePortraitUrl(payload.portraitUrl);
  if (portraitUrl !== undefined) {
    entity.portraitUrl = portraitUrl;
    entity.portraitVariant = Math.max(0, Number(entity.portraitVariant) || 0) + 1;
  }
  if (id === "player") state.player.sect = state.sect.name;
  rememberCultivatorProfile(state, entity);
  rememberSectProfiles(state);
  log(state, `后台已更新${entity.name}的资料与${entity.talent.grade}天赋。`, "gold");
}

export function updateSectProfile(state, payload = {}) {
  ensureStateShape(state);
  const oldName = normalizeProfileName(payload.oldName || payload.id || payload.name, "");
  if (!oldName) throw new Error("缺少宗门名称。");
  const newName = normalizeProfileName(payload.name, oldName);
  const portraitUrl = normalizePortraitUrl(payload.portraitUrl);
  renameSectEverywhere(state, oldName, newName);
  const offices = normalizeSectOffices(state, newName, payload);
  state.sectProfiles ??= {};
  state.sectProfiles[newName] = {
    name: newName,
    portraitUrl: portraitUrl !== undefined ? portraitUrl : state.sectProfiles[newName]?.portraitUrl || "",
    leaderId: offices.leaderId,
    elderIds: offices.elderIds
  };
  rememberSectProfiles(state);
  for (const { entity } of allCultivators(state)) rememberCultivatorProfile(state, entity);
  log(state, `后台已更新宗门「${newName}」。`, "gold");
}

function resolvePlayerBreakthrough(state) {
  const p = state.player;
  const need = xpNeed(p.realm);
  if (p.realm >= realms.length - 1) {
    return false;
  }
  if (p.xp < need) {
    return false;
  }
  const attempts = breakthroughAttemptInfo(state);
  if (attempts.remaining <= 0) {
    return false;
  }

  const chance = breakthroughChanceFor(state, p);
  p.lastBreakthroughDay = state.day;
  p.breakthroughAttemptsToday = attempts.used + 1;
  clearBreakthroughBonusEffects(state);
  if (Math.random() < chance) {
    const fromRealm = p.realm;
    p.realm += 1;
    const growth = applyBreakthroughGrowth(p, fromRealm);
    p.hp = effectiveMaxHp(p, state);
    p.mana = effectiveMaxMana(p, state);
    p.reputation += 6 + p.realm;
    if (p.championDaoRhyme?.active) p.championDaoRhyme = null;
    p.breakthroughs.unshift({ day: state.day, date: stateDateForDay(state), time: timestampKey(), from: realms[p.realm - 1], to: realms[p.realm], success: true, chance, growth });
    p.breakthroughs = trimRecordsByDay(p.breakthroughs, state.day, growthRecordDays, growthRecordLimit);
    log(state, `突破成功，${realms[fromRealm]} → ${realms[p.realm]}。`, "gold");
  } else {
    p.hp = clamp(p.hp - 26, 1, effectiveMaxHp(p, state));
    p.mana = clamp((p.mana || 0) - 18, 0, effectiveMaxMana(p, state));
    p.breakthroughs.unshift({ day: state.day, date: stateDateForDay(state), time: timestampKey(), from: realms[p.realm], to: realms[p.realm + 1] || "未知境界", success: false, chance });
    p.breakthroughs = trimRecordsByDay(p.breakthroughs, state.day, growthRecordDays, growthRecordLimit);
    log(state, "突破失败，灵力逆冲经脉。今日不可再次突破。", "bad");
  }
  return true;
}

export function rest(state) {
  const p = state.player;
  p.hp = clamp(p.hp + 24 + p.body, 0, effectiveMaxHp(p, state));
  p.mana = clamp((p.mana || 0) + 20 + Math.ceil(effectiveDivineSense(p, state) / 4), 0, effectiveMaxMana(p, state));
  log(state, "你闭门调息一夜，血量与法力渐复。");
}

export function upgradePlayerSkill(state) {
  ensureStateShape(state);
  return attemptSkillUpgrade(state, state.player);
}

export function attemptBreakthrough(state) {
  ensureStateShape(state);
  const player = state.player;
  if (player.realm >= realms.length - 1) throw new Error("已至当前境界尽头。 ");
  if (player.xp < xpNeed(player.realm)) throw new Error("修为尚未圆满。 ");
  if (breakthroughAttemptInfo(state).remaining <= 0) throw new Error("今日突破次数已用尽。 ");
  return resolvePlayerBreakthrough(state);
}

export function runDungeon(state, id) {
  const dungeon = dungeons.find((item) => item.id === id);
  if (!dungeon) throw new Error("未知副本");
  const p = state.player;
  if (p.realm < dungeon.min) {
    log(state, `境界不足，至少需要「${realms[dungeon.min]}」才能进入${dungeon.name}。`, "bad");
    return;
  }

  const guardian = {
    id: `dungeon-${dungeon.id}`,
    name: `${dungeon.name}守关者`,
    realm: dungeon.min,
    root: normalizeRoot({ key: "earth" }),
    attack: Math.floor(dungeon.power / 7) + dungeon.min * 2,
    defense: Math.floor(dungeon.power / 10) + dungeon.min,
    hp: dungeon.power + dungeon.min * 10,
    maxHp: dungeon.power + dungeon.min * 10,
    mana: 40 + dungeon.min * 6,
    maxMana: 40 + dungeon.min * 6,
    divineSense: 10 + dungeon.min * 2,
    skillId: randomSkillId()
  };
  applyRootSet(guardian);
  guardian.hp = effectiveMaxHp(guardian);
  guardian.mana = effectiveMaxMana(guardian);

  const beforeHp = p.hp;
  const battle = runTurnBattle(p, guardian, { maxRounds: 14, state });
  p.hp = battle.leftHp;
  p.mana = battle.leftMana;

  if (battle.winner === "left") {
    const spirit = Math.floor(24 + Math.random() * 30);
    p.spirit += spirit;
    p.dungeonClears += 1;
    if (dungeon.power > p.bestDungeonPower) {
      p.bestDungeonPower = dungeon.power;
      p.bestDungeonName = dungeon.name;
    }
    log(state, `你通关${dungeon.name}，回合战损失 ${beforeHp - p.hp} 血量，获得 ${spirit} 灵石。`, "gold");
  } else {
    p.hp = Math.max(1, p.hp);
    log(state, `${dungeon.name}险象环生，你血量见底后撤出。`, "bad");
  }
}

export function sectMission(state) {
  const p = state.player;
  const rep = 5 + Math.floor(Math.random() * 6);
  p.reputation += rep;
  p.spirit += 16;
  state.sect.reputation += rep;
  state.sect.supplies += 10;
  p.hp = clamp(p.hp - 6, 1, effectiveMaxHp(p, state));
  log(state, `完成${state.sect.name}任务，获得 ${rep} 声望与 16 灵石。`, "gold");
}

export function sectWar(state) {
  const enemyName = pick(sects);
  const p = state.player;
  const enemy = {
    id: "sect-war-enemy",
    name: `${enemyName}战修`,
    realm: Math.max(0, p.realm + Math.floor(state.sect.rivalHeat / 35)),
    root: normalizeRoot(pick(roots)),
    attack: 12 + p.realm * 4 + Math.floor(state.sect.rivalHeat / 7),
    defense: 10 + p.realm * 3 + Math.floor(state.sect.rivalHeat / 10),
    hp: 120 + p.realm * 18 + state.sect.rivalHeat,
    maxHp: 120 + p.realm * 18 + state.sect.rivalHeat,
    mana: 60 + p.realm * 8,
    maxMana: 60 + p.realm * 8,
    divineSense: 10 + p.realm * 2,
    skillId: randomSkillId()
  };
  applyRootSet(enemy);
  enemy.hp = effectiveMaxHp(enemy);
  enemy.mana = effectiveMaxMana(enemy);
  const battle = runTurnBattle(p, enemy, { maxRounds: 16, state });
  p.hp = battle.leftHp;
  p.mana = battle.leftMana;

  if (battle.winner === "left") {
    state.player.reputation += 14;
    state.player.spirit += 45;
    state.sect.reputation += 18;
    state.sect.warWins += 1;
    state.sect.rivalHeat = Math.max(0, state.sect.rivalHeat - 20);
    log(state, `${state.sect.name}击退${enemyName}挑衅，你在回合战中取胜，获得 45 灵石。`, "gold");
  } else {
    state.player.hp = Math.max(1, state.player.hp);
    state.sect.supplies = Math.max(0, state.sect.supplies - 28);
    state.sect.warLosses += 1;
    log(state, `${enemyName}攻势凌厉，你血量见底后退回山门。`, "bad");
  }
}

function entityRef(entity, kind) {
  const profile = rootProfile(entity);
  return {
    kind,
    id: entity.id,
    name: entity.name,
    realm: entity.realm,
    sect: kind === "player" ? entity.sect || "黄枫谷" : entity.sect,
    portraitUrl: compactPortraitUrl(entity.portraitUrl, entity.id),
    root: entity.root,
    roots: profile.roots,
    primaryRootKey: profile.primaryRootKey,
    rootProfile: profile,
    skillId: entity.skillId,
    skillRank: skillRankOf(entity, entity.skillId),
    effectiveSkill: effectiveSkillForEntity(entity),
    duelSeason: duelRankSnapshot(entity)
  };
}

function replayEntityKind(entity) {
  if (entity?.kind) return entity.kind;
  if (String(entity?.id || "").startsWith("monster-")) return "monster";
  return entity?.id === "player" ? "player" : "npc";
}

function buildReplay(left, right, battle, result, foughtAt, state) {
  const leftBefore = { ...left };
  const rightBefore = { ...right };

  return {
    kind: "duel",
    day: state.day,
    result,
    winner: battle.winner,
    foughtAt,
    left: {
      ...entityRef(leftBefore, replayEntityKind(leftBefore)),
      power: powerOfStats(battle.leftStart),
      stats: battle.leftStart,
      baseStats: effectiveStats(leftBefore, state),
      rootCounterPenalty: battle.leftStart.rootCounterPenalty || 0,
      startHp: battle.leftStart.hp,
      startMana: battle.leftStart.mana,
      endHp: battle.leftHp,
      endMana: battle.leftMana
    },
    right: {
      ...entityRef(rightBefore, replayEntityKind(rightBefore)),
      power: powerOfStats(battle.rightStart),
      stats: battle.rightStart,
      baseStats: effectiveStats(rightBefore, state),
      rootCounterPenalty: battle.rightStart.rootCounterPenalty || 0,
      startHp: battle.rightStart.hp,
      startMana: battle.rightStart.mana,
      endHp: battle.rightHp,
      endMana: battle.rightMana
    },
    events: battle.events
  };
}

function queueBattleReplay(state, replay, matchId = "") {
  if (!state || !replay?.replayId) return;
  state.__pendingBattleReplays ??= [];
  state.__pendingBattleReplays.push({
    id: replay.replayId,
    kind: replay.kind || "battle",
    day: replay.day || state.day,
    matchId,
    replay
  });
}

function runDuelMatch(state, left, right, options = {}) {
  const foughtAt = options.foughtAt || timestampKey();
  const battleSeed = `duel|${state.day}|${options.matchId || "free"}|${left.id}|${right.id}|${foughtAt}`;
  const leftBefore = { ...left, duelSeason: { ...(left.duelSeason || {}) } };
  const rightBefore = { ...right, duelSeason: { ...(right.duelSeason || {}) } };
  const duelLeft = { ...left, hp: effectiveMaxHp(left, state), mana: effectiveMaxMana(left, state) };
  const duelRight = { ...right, hp: effectiveMaxHp(right, state), mana: effectiveMaxMana(right, state) };
  const battle = runTurnBattle(duelLeft, duelRight, { state, seed: battleSeed });
  const leftWon = battle.winner === "left";
  const winner = leftWon ? left : right;
  const loser = leftWon ? right : left;
  const result = leftWon ? "胜" : "负";
  const leftResult = leftWon ? "胜" : "负";
  const rightResult = leftWon ? "负" : "胜";
  if (options.logPlayer && left.id === "player") {
    log(state, leftWon ? `你在回合切磋中胜过${right.name}。` : `${right.name}招式老辣，你血量见底败下阵来。`, leftWon ? "gold" : "bad");
  }

  winner.duelWins += 1;
  loser.duelLosses += 1;
  const scored = options.scored !== false;
  const winnerScoreBefore = winner.duelSeason?.score || 0;
  const loserScoreBefore = loser.duelSeason?.score || 0;
  const winnerScoreDelta = scored ? applyDuelScore(winner, true, state.day, loser) : 0;
  const loserScoreDelta = scored ? applyDuelScore(loser, false, state.day, winner) : 0;
  const winnerScoreAfter = winner.duelSeason?.score || 0;
  const loserScoreAfter = loser.duelSeason?.score || 0;
  const leftScoreDelta = leftWon ? winnerScoreDelta : loserScoreDelta;
  const rightScoreDelta = leftWon ? loserScoreDelta : winnerScoreDelta;
  left.hp = effectiveMaxHp(left, state);
  left.mana = effectiveMaxMana(left, state);
  right.hp = effectiveMaxHp(right, state);
  right.mana = effectiveMaxMana(right, state);

  const replay = buildReplay(leftBefore, rightBefore, battle, result, foughtAt, state);
  replay.kind = options.tournament ? "duel-tournament" : "duel";
  replay.tournament = options.tournament || null;
  replay.seed = battleSeed;
  const replayId = `duel-${state.day}-${left.id}-${right.id}-${foughtAt}`;
  replay.replayId = replayId;
  queueBattleReplay(state, replay, options.matchId || "");

  left.duelHistory.unshift({
    day: state.day,
    season: duelSeasonOfDay(state.day),
    foughtAt,
    opponent: right.name,
    opponentId: right.id,
    opponentSect: right.sect,
    opponentRankName: duelRankSnapshot(rightBefore).rankName,
    result: leftResult,
    scoreDelta: leftScoreDelta,
    scoreBefore: leftWon ? winnerScoreBefore : loserScoreBefore,
    scoreAfter: left.duelSeason?.score || 0,
    tournamentRound: options.tournament?.name || "",
    replayId
  });
  right.duelHistory.unshift({
    day: state.day,
    season: duelSeasonOfDay(state.day),
    foughtAt,
    opponent: left.name,
    opponentId: left.id,
    opponentSect: left.sect,
    opponentRankName: duelRankSnapshot(leftBefore).rankName,
    result: rightResult,
    scoreDelta: rightScoreDelta,
    scoreBefore: leftWon ? loserScoreBefore : winnerScoreBefore,
    scoreAfter: right.duelSeason?.score || 0,
    tournamentRound: options.tournament?.name || "",
    replayId
  });
  left.duelHistory = mergeDuelHistory(left.duelHistory, state.day, detailRecordLimit);
  right.duelHistory = mergeDuelHistory(right.duelHistory, state.day, detailRecordLimit);

  return { replay, winner, loser, result: leftResult, winnerScoreDelta, loserScoreDelta };
}

function cultivatorMap(state) {
  return new Map([
    [state.player.id, state.player],
    ...state.npcs.map((npc) => [npc.id, npc])
  ]);
}

function replayResultFor(replay, entityId) {
  if (!replay) return "";
  if (replay.left?.id === entityId) return replay.winner === "left" ? "胜" : "负";
  if (replay.right?.id === entityId) return replay.winner === "right" ? "胜" : "负";
  return "";
}

function syncDuelDayRecords(state) {
  const map = cultivatorMap(state);
  const records = [...(state.duelDays || [])].sort((a, b) => a.day - b.day);
  const scoreTrack = new Map();
  const scoreStateFor = (entity, day) => {
    const season = duelSeasonOfDay(day || state.day);
    const existing = scoreTrack.get(entity.id);
    if (existing?.season === season) return existing;
    const next = { season, score: 0 };
    scoreTrack.set(entity.id, next);
    return next;
  };
  const applyTrackedScore = (entity, day, delta) => {
    const scoreState = scoreStateFor(entity, day);
    const before = scoreState.score;
    scoreState.score = Math.max(0, Math.min(duelSeasonMaxScore, before + (Number(delta) || 0)));
    return { before, after: scoreState.score };
  };
  const previousHistory = new Map(
    [...map.values()].map((entity) => [
      entity.id,
      (entity.duelHistory || []).filter((record) => !record.matchId && !record.duelDayMatchId)
    ])
  );
  for (const entity of map.values()) {
    entity.duelHistory = [];
    normalizeDuelSeason(entity, state.day);
  }

  for (const record of records) {
    const recordSeason = duelSeasonOfDay(record.day || state.day);
    for (const match of record.matches || []) {
      if (match.type === "bye") continue;
      const leftRef = match.left || match.replay?.left;
      const rightRef = match.right || match.replay?.right;
      const left = map.get(leftRef?.id);
      const right = map.get(rightRef?.id);
      if (!left || !right) continue;
      const foughtAt = match.replay?.foughtAt || record.createdAt;
      const leftWon = match.winner?.id === left.id || (match.replay && replayResultFor(match.replay, left.id) === "胜");
      const replayInfo = {
        replay: match.replay || null,
        replayId: match.replayId || "",
        hasReplay: Boolean(match.replay || match.replayId)
      };
      const leftScoreDelta = leftWon ? match.winnerScoreDelta : match.loserScoreDelta;
      const rightScoreDelta = leftWon ? match.loserScoreDelta : match.winnerScoreDelta;
      const normalizedLeftScoreDelta = typeof leftScoreDelta === "number" ? leftScoreDelta : (leftWon ? duelScoreDelta(left, right, true) : duelLossScore);
      const normalizedRightScoreDelta = typeof rightScoreDelta === "number" ? rightScoreDelta : (leftWon ? duelLossScore : duelScoreDelta(right, left, true));
      const leftScore = applyTrackedScore(left, record.day, normalizedLeftScoreDelta);
      const rightScore = applyTrackedScore(right, record.day, normalizedRightScoreDelta);

      left.duelHistory.unshift({
        day: record.day,
        season: recordSeason,
        duelDayMatchId: match.id || "",
        foughtAt,
        opponent: right.name,
        opponentId: right.id,
        opponentSect: right.sect,
        opponentRankName: rightRef?.duelSeason?.rankName || duelRankSnapshot(right).rankName,
        result: leftWon ? "胜" : "负",
        scoreDelta: normalizedLeftScoreDelta,
        scoreBefore: leftScore.before,
        scoreAfter: leftScore.after,
        ...replayInfo
      });
      right.duelHistory.unshift({
        day: record.day,
        season: recordSeason,
        duelDayMatchId: match.id || "",
        foughtAt,
        opponent: left.name,
        opponentId: left.id,
        opponentSect: left.sect,
        opponentRankName: leftRef?.duelSeason?.rankName || duelRankSnapshot(left).rankName,
        result: leftWon ? "负" : "胜",
        scoreDelta: normalizedRightScoreDelta,
        scoreBefore: rightScore.before,
        scoreAfter: rightScore.after,
        ...replayInfo
      });
    }
  }

  for (const entity of map.values()) {
    normalizeDuelSeason(entity, state.day);
    entity.duelHistory = mergeDuelHistory(
      [...entity.duelHistory, ...(previousHistory.get(entity.id) || [])],
      state.day,
      detailRecordLimit
    );
  }
}

function duelMatchGroupKey(entry) {
  const sect = String(entry?.entity?.sect || "").trim();
  return sect || `unaffiliated:${entry?.entity?.id || "unknown"}`;
}

function duelOpponentWeight(state, current, candidate) {
  const currentPower = powerOf(current.entity, state);
  const recentOpponentIds = new Set(
    (current.entity.duelHistory || [])
      .filter((record) => Number(record.day || 0) >= state.day - 3)
      .map((record) => record.opponentId)
      .filter(Boolean)
  );
  const candidatePower = powerOf(candidate.entity, state);
  const powerGap = Math.abs(currentPower - candidatePower);
  const powerScale = Math.max(120, Math.max(currentPower, candidatePower) * 0.25);
  const rankWeight = [1, 0.45, 0.15][duelRankGap(current.entity, candidate.entity)] || 0.1;
  const powerWeight = Math.exp(-powerGap / powerScale);
  const rematchWeight = recentOpponentIds.has(candidate.entity.id) ? 0.18 : 1;
  return Math.max(0.01, rankWeight * powerWeight * rematchWeight);
}

function findDuelLeftIndex(state, queue) {
  const groupCounts = new Map();
  for (const entry of queue) {
    const key = duelMatchGroupKey(entry);
    groupCounts.set(key, (groupCounts.get(key) || 0) + 1);
  }
  const largestGroupSize = Math.max(...groupCounts.values());
  let selectedIndex = 0;
  let fewestPreferredOpponents = Number.POSITIVE_INFINITY;
  for (const [index, entry] of queue.entries()) {
    if (groupCounts.get(duelMatchGroupKey(entry)) !== largestGroupSize) continue;
    const preferredOpponentCount = queue.reduce((count, candidate, candidateIndex) => (
      candidateIndex !== index && canDuelMatch(entry.entity, candidate.entity) ? count + 1 : count
    ), 0);
    if (preferredOpponentCount < fewestPreferredOpponents) {
      selectedIndex = index;
      fewestPreferredOpponents = preferredOpponentCount;
    }
  }
  return selectedIndex;
}

function findDuelOpponentIndex(state, queue, current) {
  const currentGroup = duelMatchGroupKey(current);
  const crossSectCandidates = queue.flatMap((candidate, index) => (
    duelMatchGroupKey(candidate) === currentGroup
      ? []
      : [{ index, candidate, preferred: canDuelMatch(current.entity, candidate.entity) }]
  ));
  const preferredCandidates = crossSectCandidates.filter((candidate) => candidate.preferred);
  const candidatePool = preferredCandidates.length ? preferredCandidates : crossSectCandidates;
  const candidates = candidatePool.map(({ index, candidate }) => ({
    index,
    weight: duelOpponentWeight(state, current, candidate)
  }));
  if (!candidates.length) return -1;

  const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const candidate of candidates) {
    roll -= candidate.weight;
    if (roll <= 0) return candidate.index;
  }
  return candidates[candidates.length - 1].index;
}

export function runDailyDuels(state, foughtAt = timestampKey()) {
  if (duelPhaseForDay(state.day) === "tournament") return runDailyTournament(state, foughtAt);
  state.duelDays ??= [];
  const existing = state.duelDays.find((record) => record.day === state.day);
  if (existing) {
    syncDuelDayRecords(state);
    return existing;
  }

  const roster = [
    { entity: state.player, kind: "player" },
    ...state.npcs.map((npc) => ({ entity: npc, kind: "npc" }))
  ];
  const matches = [];
  const queue = shuffle(roster);
  let order = 1;

  while (queue.length) {
    const leftIndex = findDuelLeftIndex(state, queue);
    const [left] = queue.splice(leftIndex, 1);
    const rightIndex = findDuelOpponentIndex(state, queue, left);
    if (rightIndex < 0) {
      matches.push({
        id: `day-${state.day}-bye-${left.entity.id}`,
        type: "bye",
        winner: entityRef(left.entity, left.kind),
        summary: `${left.entity.name}本轮没有合适对手，轮空待战。`
      });
      continue;
    }
    const [right] = queue.splice(rightIndex, 1);
    const matchId = `day-${state.day}-match-${order}`;
    const { replay, winner, loser, winnerScoreDelta, loserScoreDelta } = runDuelMatch(state, left.entity, right.entity, { matchId, foughtAt });
    matches.push({
      id: matchId,
      type: "battle",
      order,
      left: replay.left,
      right: replay.right,
      winner: replay.winner === "left" ? replay.left : replay.right,
      loser: replay.winner === "left" ? replay.right : replay.left,
      winnerScoreDelta,
      loserScoreDelta,
      time: foughtAt,
      replayId: replay.replayId,
      summary: `${winner.name}胜过${loser.name}，积分 ${winnerScoreDelta > 0 ? "+" : ""}${winnerScoreDelta}`
    });
    order += 1;
  }

  const record = {
    day: state.day,
    date: stateDateForDay(state),
    createdAt: foughtAt,
    matches
  };
  state.duelDays.unshift(record);
  state.duelDays = trimDuelDays(state.duelDays, state.day);
  syncDuelDayRecords(state);
  log(state, `${record.date} 全员切磋完成，共 ${matches.length} 组对阵。`, "gold");
  return record;
}

export function buyItem(state, kind) {
  ensureStateShape(state);
  const item = itemCatalog[kind];
  if (!item) throw new Error("未知物品");
  const itemState = shopItemState(state, kind);
  if (!itemState.canBuy) {
    log(state, itemState.reason || "今日不可购买。", "bad");
    return;
  }
  if (state.player.spirit < itemState.price) {
    log(state, "灵石不足，掌柜只是笑着摇头。", "bad");
    return;
  }
  const record = shopPurchaseRecord(state, kind);
  state.player.spirit -= itemState.price;
  state.bag[kind] = Math.max(0, Math.floor(Number(state.bag[kind]) || 0)) + 1;
  record.count = Math.max(0, Math.floor(Number(record.count) || 0)) + 1;
  if (item.limit?.type === "permanent") {
    state.shop.permanentPurchases ??= {};
    state.shop.permanentPurchases[kind] = Math.max(0, Math.floor(Number(state.shop.permanentPurchases[kind]) || 0)) + 1;
  }
  log(state, `在坊市购得「${item.name}」一枚，花费 ${itemState.price} 灵石。`);
}

export function sellItem(state, kind) {
  ensureStateShape(state);
  const item = itemCatalog[kind];
  if (!item) throw new Error("未知物品");
  const count = Math.max(0, Math.floor(Number(state.bag[kind]) || 0));
  if (count <= 0) {
    log(state, `丹匣中没有「${item.name}」可售。`, "bad");
    return;
  }
  const sellPrice = shopSellPriceFor(state, kind);
  state.bag[kind] = count - 1;
  state.player.spirit += sellPrice;
  if (item.limit?.type === "permanent") {
    state.shop ??= {};
    state.shop.permanentPurchases ??= {};
    const bought = Math.max(0, Math.floor(Number(state.shop.permanentPurchases[kind]) || 0));
    const used = Math.max(0, Math.floor(Number(state.shop.permanentUses?.[kind]) || 0));
    state.shop.permanentPurchases[kind] = Math.max(used, bought - 1);
  }
  log(state, `售出「${item.name}」一枚，按今日行情九折换得 ${sellPrice} 灵石。`, "gold");
}

export function updatePlayerSectPlan(state, payload = {}) {
  ensureStateShape(state);
  const plan = normalizePlayerSectPlan(payload, state.day + 1, attackTeamLimitForSect(state, state.sect.name));
  const target = plan.attack.targetProvinceId ? provinceStateById(state, plan.attack.targetProvinceId) : null;
  if (target && (!target.owner || target.owner === state.sect.name)) {
    throw new Error("明日战略只能指定其他宗门占领的城市。");
  }
  state.playerSectPlan = plan;
  log(state, `已保存${state.sect.name}第 ${state.day + 1} 天明日战略。`, "gold");
  return state.playerSectPlan;
}

export function useItem(state, kind) {
  ensureStateShape(state);
  if (!itemCatalog[kind]) throw new Error("未知物品");
  if (state.bag[kind] <= 0) return;
  const item = itemCatalog[kind];
  const effect = item.effect || {};
  const p = state.player;
  normalizeElixirEffects(state);

  if (effect.type === "xpMultiplier") {
    const current = publicElixirEffects(state);
    const nextMultiplier = Number(effect.multiplier) || 1;
    const nextUntilDay = state.day + Math.max(1, Math.floor(Number(effect.days) || 1)) - 1;
    if (current.cultivationMultiplier > nextMultiplier) {
      log(state, `当前修为丹药力更强，暂不服用「${item.name}」。`, "bad");
      return;
    }
    p.elixirEffects.cultivationMultiplier = nextMultiplier;
    p.elixirEffects.cultivationMultiplierUntilDay = Math.max(Number(p.elixirEffects.cultivationMultiplierUntilDay) || 0, nextUntilDay);
    state.bag[kind] -= 1;
    rememberTaskMultiplierForDay(state, state.day);
    log(state, `服下「${item.name}」，现实任务修为收益提升至 x${nextMultiplier}，持续到第 ${p.elixirEffects.cultivationMultiplierUntilDay} 天。`, "gold");
    return;
  }

  if (effect.type === "breakthroughBonus") {
    const nextBonus = Math.max(0, Number(effect.bonus) || 0);
    const current = publicElixirEffects(state);
    const stacks = Array.isArray(p.elixirEffects.nextBreakthroughBonusStacks) ? p.elixirEffects.nextBreakthroughBonusStacks : [];
    if (stacks.length >= maxBreakthroughBonusStacks) {
      log(state, `下次突破最多可叠加 ${maxBreakthroughBonusStacks} 枚破境丹，暂不服用「${item.name}」。`, "bad");
      return;
    }
    const nextStacks = [...stacks, { itemId: kind, name: item.name, bonus: nextBonus }];
    p.elixirEffects.nextBreakthroughBonusStacks = nextStacks;
    p.elixirEffects.nextBreakthroughBonus = nextStacks.reduce((sum, stack) => sum + Math.max(0, Number(stack.bonus) || 0), 0);
    p.elixirEffects.nextBreakthroughBonusItem = nextStacks.map((stack) => stack.name).join("、");
    state.bag[kind] -= 1;
    log(state, `服下「${item.name}」，下次突破成功率额外 +${Math.round(nextBonus * 100)}%，当前累计 +${Math.round(p.elixirEffects.nextBreakthroughBonus * 100)}%（${current.nextBreakthroughBonusCount + 1}/${maxBreakthroughBonusStacks}）。`, "gold");
    return;
  }

  if (effect.type === "breakthroughAttempts") {
    const info = breakthroughAttemptInfo(state);
    if (info.total >= info.max) {
      log(state, "今日经脉承载已至上限，不能再增加突破次数。", "bad");
      return;
    }
    const added = Math.min(Math.max(1, Math.floor(Number(effect.amount) || 1)), info.max - info.total);
    p.elixirEffects.extraBreakthroughAttemptsToday = info.extra + added;
    p.elixirEffects.breakthroughAttemptEffectDay = state.day;
    state.bag[kind] -= 1;
    log(state, `服下「${item.name}」，今日额外突破次数 +${added}。`, "gold");
    return;
  }

  if (effect.type === "permanentStat") {
    state.shop.permanentPurchases ??= {};
    state.shop.permanentUses ??= {};
    const used = Math.max(0, Math.floor(Number(state.shop.permanentUses[kind]) || 0));
    const max = Math.max(0, Math.floor(Number(item.limit?.max) || 0));
    if (max && used >= max) {
      log(state, "此丹药性已满，再服无益。", "bad");
      return;
    }
    const amount = Math.max(1, Math.floor(Number(effect.amount) || 1));
    const stat = effect.stat;
    p[stat] = Math.max(0, Math.floor(Number(p[stat]) || 0)) + amount;
    if (stat === "maxHp") p.hp = clamp((p.hp || 0) + amount, 0, effectiveMaxHp(p, state));
    if (stat === "maxMana") p.mana = clamp((p.mana || 0) + amount, 0, effectiveMaxMana(p, state));
    state.shop.permanentUses[kind] = used + 1;
    state.bag[kind] -= 1;
    log(state, `炼化「${item.name}」，${item.text}`, "gold");
  }
}
