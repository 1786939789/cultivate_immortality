import { combatSkills, dungeons, duelLossScore, duelRankForScore, duelRanks, duelSeasonDay, duelSeasonLength, duelSeasonMaxScore, duelSeasonOfDay, duelWinScore, equipmentCatalog, equipmentSlots, equipmentTiers, itemCatalog, npcGenders, npcNames, provinceVersion, provinces, realms, realmStages, rootCycle, specialRoots, roots, rosterVersion, sectRoster, sects, taskTemplates } from "./gameData.mjs";

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
  return addDays(state.calendarStartDate || state.lastSettlementDate || dateKey(), Math.max(0, Number(day || 1) - 1));
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
const playerDailyBaseXp = 10;
const taskDefinitionLimit = 80;
const taskCompletionLimit = 120;
const taskCategories = ["生活", "工作", "运动"];
const defaultTaskDefinitions = [
  { id: "task-work-hour", name: "加班", detail: "按实际投入时间记录额外工作。", type: "measurable", category: "工作", unitName: "小时", targetAmount: 1, xpReward: 100, spiritReward: 10, maxMultiplier: 4, enabled: true },
  { id: "task-reading-pages", name: "看书", detail: "读完指定页数，沉淀现实里的悟性。", type: "measurable", category: "生活", unitName: "页", targetAmount: 10, xpReward: 50, spiritReward: 5, maxMultiplier: 5, enabled: true },
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

function rollRange([min, max]) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function statRangeText(range) {
  return `${range[0]}-${range[1]}`;
}

function growthRangeText(range) {
  return `血${statRangeText(range.maxHp)} 攻${statRangeText(range.attack)} 防${statRangeText(range.defense)} 神${statRangeText(range.divineSense)} 法${statRangeText(range.maxMana)}`;
}

export function breakthroughGrowthRange(fromRealm) {
  const safeRealm = clamp(Math.floor(fromRealm || 0), 0, realms.length - 1);
  const targetRealm = Math.min(safeRealm + 1, realms.length - 1);
  const stageIndex = Math.floor(targetRealm / 10);
  const level = (targetRealm % 10) + 1;
  const major = safeRealm % 10 === 9;

  if (major) {
    const defenseMin = 6 + stageIndex * 2;
    const defenseMax = defenseMin + 4;
    const attackMin = 14 + stageIndex * 3;
    return {
      maxHp: [78 + stageIndex * 28, 108 + stageIndex * 34],
      maxMana: [24 + stageIndex * 8, 38 + stageIndex * 10],
      attack: [attackMin, attackMin + 7],
      defense: [defenseMin, defenseMax],
      divineSense: [7 + stageIndex * 2, 11 + stageIndex * 3]
    };
  }

  const defenseMin = 1 + Math.floor(stageIndex / 2) + Math.floor(level / 6);
  const defenseMax = defenseMin + 1;
  const attackMin = defenseMax + 3 + Math.floor(stageIndex / 2);
  return {
    maxHp: [20 + stageIndex * 7 + Math.floor(level / 3) * 3, 32 + stageIndex * 8 + Math.floor(level / 3) * 3],
    maxMana: [5 + stageIndex * 2 + Math.floor(level / 5), 9 + stageIndex * 3 + Math.floor(level / 5)],
    attack: [attackMin, attackMin + 3],
    defense: [defenseMin, defenseMax],
    divineSense: [1 + Math.ceil(stageIndex / 2), 3 + Math.ceil(stageIndex / 2)]
  };
}

function rollBreakthroughGrowth(fromRealm) {
  const range = breakthroughGrowthRange(fromRealm);
  return Object.fromEntries(Object.entries(range).map(([key, value]) => [key, rollRange(value)]));
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

function rollBirthStats(realm = 0) {
  const stats = {
    maxHp: rollRange(birthStatRanges.maxHp),
    attack: rollRange(birthStatRanges.attack),
    defense: rollRange(birthStatRanges.defense),
    divineSense: rollRange(birthStatRanges.divineSense),
    maxMana: rollRange(birthStatRanges.maxMana)
  };
  if (stats.attack <= stats.defense) stats.attack = stats.defense + rollRange([3, 5]);

  for (let fromRealm = 0; fromRealm < realm; fromRealm += 1) {
    const growth = rollBreakthroughGrowth(fromRealm);
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

function activeSpecialRoot(entity) {
  const keys = new Set(normalizeRootSet(entity).roots.map((root) => root.key));
  return specialRoots
    .filter((special) => special.keys.every((key) => keys.has(key)))
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
  return 0.1 * Math.pow(0.5, realmGap);
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
  const bonus = rootEffectBonus(entity, "attack");
  return Math.floor((entity.attack || 0) * (1 + bonus + equipmentBonusFor(state, entity, "attack")));
}

export function effectiveDefense(entity, state) {
  const bonus = rootEffectBonus(entity, "defense");
  return Math.floor((entity.defense || 0) * (1 + bonus + equipmentBonusFor(state, entity, "defense")));
}

export function effectiveMaxHp(entity, state) {
  const bonus = rootEffectBonus(entity, "hp");
  return Math.floor((entity.maxHp || 0) * (1 + bonus + equipmentBonusFor(state, entity, "maxHp")));
}

export function effectiveMaxMana(entity, state) {
  const bonus = rootEffectBonus(entity, "mana");
  return Math.floor((entity.maxMana || 0) * (1 + bonus + equipmentBonusFor(state, entity, "maxMana")));
}

export function effectiveDivineSense(entity, state) {
  const bonus = rootEffectBonus(entity, "divineSense");
  return Math.floor((entity.divineSense || 0) * (1 + bonus + equipmentBonusFor(state, entity, "divineSense")));
}

export function effectiveStats(entity, state) {
  const attack = effectiveAttack(entity, state);
  const defense = effectiveDefense(entity, state);
  const maxHp = effectiveMaxHp(entity, state);
  const divineSense = effectiveDivineSense(entity, state);
  const maxMana = effectiveMaxMana(entity, state);
  return {
    attack,
    defense,
    maxHp,
    divineSense,
    maxMana,
    xpMultiplier: xpGainMultiplier(entity),
    bonuses: {
      attack: attack - (entity.attack || 0),
      defense: defense - (entity.defense || 0),
      maxHp: maxHp - (entity.maxHp || 0),
      divineSense: divineSense - (entity.divineSense || 0),
      maxMana: maxMana - (entity.maxMana || 0)
    }
  };
}

export function xpGainMultiplier(entity) {
  return (1 + rootEffectBonus(entity, "xp")) * rootCultivationMultiplier(entity);
}

export function applyXpGain(entity, amount, extraMultiplier = 1) {
  const gain = Math.floor(amount * xpGainMultiplier(entity) * extraMultiplier);
  entity.xp += gain;
  return gain;
}

function applyDamage(entity, amount, state) {
  const damage = Math.max(1, Math.floor(amount));
  entity.hp = clamp((entity.hp || 0) - damage, 0, effectiveMaxHp(entity, state));
  return damage;
}

function randomSkillId() {
  return pick(combatSkills).id;
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

function skillManaCost(skill, rank) {
  return Math.max(0, Math.ceil((skill.cost || 0) * (1 + 0.08 * (rank - 1))));
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

function effectiveSkill(skill, rank = 1) {
  const safeRank = clamp(Math.floor(rank || 1), 1, maxSkillRank);
  const target = skillUpgradeTargets[skill.id] || {};
  const progress = (safeRank - 1) / (maxSkillRank - 1);
  const upgraded = { ...skill, baseCost: skill.cost, rank: safeRank, cost: skillManaCost(skill, safeRank) };
  for (const key of Object.keys(target)) {
    upgraded[key] = scaleSkillValue(skill, key, target[key], progress);
  }
  upgraded.text = skillEffectText(upgraded);
  return upgraded;
}

function effectiveSkillForEntity(entity) {
  const skill = findSkill(entity?.skillId);
  return effectiveSkill(skill, skillRankOf(entity, skill.id));
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
    current: effectiveSkill(skill, rank),
    next: rank >= maxSkillRank ? null : effectiveSkill(skill, targetRank),
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

function skillRankPlan(skill) {
  return Array.from({ length: maxSkillRank }, (_, index) => {
    const rank = index + 1;
    const requirement = skillUpgradeRealmRequirement(rank);
    return {
      rank,
      requirementRealm: rank <= 1 ? "初始" : realms[requirement] || realms[0],
      requirementRealmIndex: requirement,
      cost: rank <= 1 ? 0 : skillUpgradeCost(skill, rank),
      chance: rank <= 1 ? 1 : skillUpgradeChance(rank),
      skill: effectiveSkill(skill, rank)
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
      ranks: skillRankPlan(skill),
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
  if (success) recordSkillUpgrade(state, entity, result);
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
    cost: result.cost,
    chance: result.chance
  });
  entity.skillUpgrades = entity.skillUpgrades.slice(0, recentRecordDays);
}

function autoUpgradeNpcSkill(state, npc) {
  const result = attemptSkillUpgrade(state, npc, { auto: true });
  if (!result) return null;
  return `${result.name}${result.success ? `升至${result.targetRank}阶` : `升${result.targetRank}阶失败`}`;
}

function combatSnapshot(entity, state) {
  return {
    attack: effectiveAttack(entity, state),
    defense: effectiveDefense(entity, state),
    maxHp: effectiveMaxHp(entity, state),
    hp: Math.max(0, Math.min(entity.hp || effectiveMaxHp(entity, state), effectiveMaxHp(entity, state))),
    divineSense: effectiveDivineSense(entity, state),
    maxMana: effectiveMaxMana(entity, state),
    mana: Math.max(0, Math.min(entity.mana ?? effectiveMaxMana(entity, state), effectiveMaxMana(entity, state)))
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

function runTurnBattle(left, right, options = {}) {
  const leftPenalty = rootCounterPenalty(right, left);
  const rightPenalty = rootCounterPenalty(left, right);
  const a = applyBattleRootPenalty(combatSnapshot(left, options.state), leftPenalty);
  const b = applyBattleRootPenalty(combatSnapshot(right, options.state), rightPenalty);
  const order = a.divineSense >= b.divineSense ? ["left", "right"] : ["right", "left"];
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

  const pushEvent = (kind, text, detail = {}) => {
    events.push({ round: currentRound, kind, text, ...detail });
  };

  if (leftPenalty) pushEvent("root", `${right.name}主灵根克制${left.name}，${left.name}攻击、防御、神识降低 ${Math.round(leftPenalty * 1000) / 10}%`, { side: "left", penalty: leftPenalty });
  if (rightPenalty) pushEvent("root", `${left.name}主灵根克制${right.name}，${right.name}攻击、防御、神识降低 ${Math.round(rightPenalty * 1000) / 10}%`, { side: "right", penalty: rightPenalty });

  const sideState = (side) => side === "left"
    ? { actor: a, target: b, actorName: left.name, targetName: right.name, hp: leftHp, targetHp: rightHp, mana: leftMana, targetMana: rightMana }
    : { actor: b, target: a, actorName: right.name, targetName: left.name, hp: rightHp, targetHp: leftHp, mana: rightMana, targetMana: leftMana };
  const setHp = (side, hp) => {
    if (side === "left") leftHp = clamp(hp, 0, a.maxHp);
    else rightHp = clamp(hp, 0, b.maxHp);
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
          actorSide: side,
          damage,
          leftHp,
          rightHp,
          leftMana,
          rightMana
        });
        target = sideState(side);
      }
      effect.duration -= 1;
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
    if (Math.random() < clamp(baseDodge + extraDodge, 0, 0.62)) {
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
    const rawDamage = attack * multiplier - defense * (1 - pierce);
    let damage = Math.max(1, Math.floor(rawDamage + Math.random() * 5));
    const reduction = effectValue(targetSide, "shield", "reduce");
    damage = Math.max(1, Math.floor(damage * (1 - reduction)));
    setHp(targetSide, state.targetHp - damage);

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
    return damage;
  };
  const castSkill = (side, skill) => {
    const targetSide = opposite(side);
    const state = sideState(side);
    setMana(side, state.mana - skill.cost);
    cooldowns[side] = skill.cooldown;
    let total = 0;

    if (skill.type === "double") {
      total += applyStrike(side, skill.power);
      if ((targetSide === "left" ? leftHp : rightHp) > 0) total += applyStrike(side, skill.power);
      pushEvent("skill", `${state.actorName}施展${skill.name}，双击共造成 ${total} 伤害`, { actorSide: side, targetSide, skill: skill.name, damage: total, leftHp, rightHp, leftMana, rightMana });
      return;
    }
    if (skill.type === "multi") {
      for (let hit = 0; hit < skill.hits && (targetSide === "left" ? leftHp : rightHp) > 0; hit += 1) total += applyStrike(side, skill.power);
      pushEvent("skill", `${state.actorName}催动${skill.name}，连斩共造成 ${total} 伤害`, { actorSide: side, targetSide, skill: skill.name, damage: total, leftHp, rightHp, leftMana, rightMana });
      return;
    }
    if (["pierce", "heavy", "speedStrike", "manaBurn", "weaken", "execute", "lifesteal", "dotStrike", "stun"].includes(skill.type)) {
      const multiplier = skill.type === "execute" && state.targetHp / state.target.maxHp <= skill.threshold ? skill.power + skill.bonus : skill.power;
      const damage = applyStrike(side, multiplier, { pierce: skill.pierce || 0 });
      total += damage;
      if (skill.type === "manaBurn") setMana(targetSide, state.targetMana - skill.burn);
      if (skill.type === "weaken") addEffect(targetSide, { type: "attackDown", amount: skill.amount, duration: skill.duration });
      if (skill.type === "dotStrike") addEffect(targetSide, { type: "dot", name: skill.name, percent: skill.percent, duration: skill.duration });
      if (skill.type === "stun") addEffect(targetSide, { type: "stun", duration: skill.duration });
      if (skill.type === "speedStrike") addEffect(side, { type: "evasion", chance: skill.extraDodge, duration: skill.duration });
      if (skill.type === "lifesteal" && damage > 0) setHp(side, state.hp + Math.floor(damage * skill.leech));
      pushEvent("skill", `${state.actorName}施展${skill.name}，造成 ${damage} 伤害`, { actorSide: side, targetSide, skill: skill.name, damage, leftHp, rightHp, leftMana, rightMana });
      return;
    }
    if (skill.type === "dodge") {
      addEffect(side, { type: "dodgeNext", duration: skill.duration });
      pushEvent("skill", `${state.actorName}施展${skill.name}，准备闪避下一击`, { actorSide: side, targetSide, skill: skill.name, leftHp, rightHp, leftMana, rightMana });
      return;
    }
    if (skill.type === "dot") {
      addEffect(targetSide, { type: "dot", name: skill.name, percent: skill.percent, duration: skill.duration });
      pushEvent("skill", `${state.actorName}放出${skill.name}，${state.targetName}陷入持续伤害`, { actorSide: side, targetSide, skill: skill.name, leftHp, rightHp, leftMana, rightMana });
      return;
    }
    if (skill.type === "shield") {
      addEffect(side, { type: "shield", reduce: skill.reduce, duration: skill.duration });
      pushEvent("skill", `${state.actorName}施展${skill.name}，伤害减免提升`, { actorSide: side, targetSide, skill: skill.name, leftHp, rightHp, leftMana, rightMana });
      return;
    }
    if (skill.type === "defenseBuff") {
      addEffect(side, { type: "defenseUp", amount: skill.amount, duration: skill.duration });
      pushEvent("skill", `${state.actorName}施展${skill.name}，防御暂时提高`, { actorSide: side, targetSide, skill: skill.name, leftHp, rightHp, leftMana, rightMana });
      return;
    }
    if (skill.type === "heal") {
      const heal = Math.floor(state.actor.maxHp * skill.percent);
      setHp(side, state.hp + heal);
      pushEvent("skill", `${state.actorName}运转${skill.name}，恢复 ${heal} 血量`, { actorSide: side, targetSide, skill: skill.name, healing: heal, leftHp, rightHp, leftMana, rightMana });
      return;
    }
    if (skill.type === "evasionBuff") {
      addEffect(side, { type: "evasion", chance: skill.chance, duration: skill.duration });
      pushEvent("skill", `${state.actorName}施展${skill.name}，身法更难捉摸`, { actorSide: side, targetSide, skill: skill.name, leftHp, rightHp, leftMana, rightMana });
      return;
    }
    if (skill.type === "reflect") {
      addEffect(side, { type: "reflect", reflect: skill.reflect, duration: skill.duration });
      pushEvent("skill", `${state.actorName}施展${skill.name}，准备反弹伤害`, { actorSide: side, targetSide, skill: skill.name, leftHp, rightHp, leftMana, rightMana });
      return;
    }
    if (skill.type === "field") {
      addEffect(side, { type: "shield", reduce: skill.reduce, duration: skill.duration });
      addEffect(targetSide, { type: "defenseDown", amount: skill.amount, duration: skill.duration });
      pushEvent("skill", `${state.actorName}布下${skill.name}，阵势压制对手`, { actorSide: side, targetSide, skill: skill.name, leftHp, rightHp, leftMana, rightMana });
    }
  };

  for (let round = 1; round <= maxRounds && leftHp > 0 && rightHp > 0; round += 1) {
    currentRound = round;
    pushEvent("round", `第 ${round} 回合`, { leftHp, rightHp, leftMana, rightMana });
    tickEffects("left");
    tickEffects("right");
    if (leftHp <= 0 || rightHp <= 0) break;

    for (const side of order) {
      const targetSide = opposite(side);
      const state = sideState(side);
      if (state.targetHp <= 0 || state.hp <= 0) break;

      if (consumeEffect(side, "stun")) {
        pushEvent("status", `${state.actorName}被压制，错过一次行动`, { actorSide: side, leftHp, rightHp, leftMana, rightMana });
        continue;
      }

      const skill = skills[side];
      if (skill && state.mana >= skill.cost && cooldowns[side] <= 0) {
        castSkill(side, skill);
      } else {
        const damage = applyStrike(side);
        pushEvent("attack", `${state.actorName}出手造成 ${damage} 伤害`, { actorSide: side, targetSide, damage, leftHp, rightHp, leftMana, rightMana });
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
    events
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
  const info = {
    stageIndex: Math.floor((realm || 0) / 10),
    level: ((realm || 0) % 10) + 1
  };
  const levelPenalty = (info.level - 1) * 0.024;
  const stagePenalty = info.stageIndex * 0.058;
  const bottleneckPenalty = info.level === 10 ? 0.26 + info.stageIndex * 0.04 : 0;
  return clamp(0.76 - levelPenalty - stagePenalty - bottleneckPenalty, 0.04, 0.86);
}

export function breakthroughChance(entity) {
  const base = baseBreakthroughChance(entity.realm || 0);
  const waterBonus = normalizeRootSet(entity).roots
    .filter((root) => root.effect === "xp")
    .reduce((sum, root) => sum + ((root.breakMultiplier || 1.1) - 1) / rootCount(entity), 0);
  const rootMultiplier = (1 + waterBonus) * rootBreakthroughMultiplier(entity);
  return clamp(base * rootMultiplier, 0.04, 0.88);
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
const equipmentVersion = 3;
const dungeonRecordVersion = 3;
const starSeaTeamSize = 10;
const starSeaCycleLength = 10;
const starSeaMaxRounds = 100;
const starSeaDropChance = 0.1;
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
const sharedDungeonItemIds = equipmentCatalog.map((item) => item.id);
const recentRecordDays = 30;
const duelRecordDays = 7;
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
    sourceText: "全副本共享装备池；乱星海猎妖结算时贡献最高者优先获得"
  }
};

function createEquipmentState() {
  return equipmentCatalog.map((item) => ({
    ...item,
    ownerId: "",
    acquiredDay: 1,
    acquiredDate: dateKey()
  }));
}

function normalizeEquipmentItem(item, fallback = {}) {
  const catalogItem = equipmentCatalog.find((entry) => entry.id === item?.id) || fallback;
  return {
    ...catalogItem,
    ...item,
    ownerId: item?.ownerId || "",
    acquiredDay: item?.acquiredDay || 1,
    acquiredDate: item?.acquiredDate || dateKey()
  };
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
  return changed;
}

function equipmentTier(item) {
  return equipmentTierMap[item?.tier] || equipmentTiers[0];
}

function equipmentSlot(item) {
  return equipmentSlotMap[item?.slot] || equipmentSlots[0];
}

function equipmentScore(item) {
  return (item?.tier || 0) * 100 + Math.round((item?.bonus || 0) * 1000);
}

function equipmentValue(item) {
  const tier = clamp(Number(item?.tier || 1), 1, equipmentTiers.length);
  const baseByTier = [220, 320, 500, 800, 1350, 2700];
  const tierData = equipmentTier(item);
  const minBonus = tierData.min || 0;
  const maxBonus = tierData.max || minBonus + 0.01;
  const bonusRatio = clamp(((item?.bonus || minBonus) - minBonus) / Math.max(0.01, maxBonus - minBonus), 0, 1);
  const spread = [40, 80, 140, 240, 500, 500][tier - 1] || 80;
  const slotPremium = item?.slot === "weapon" ? 40 : item?.slot === "trinket" ? 30 : item?.slot === "armor" ? 20 : 0;
  return Math.max(200, Math.round(baseByTier[tier - 1] + spread * bonusRatio + slotPremium));
}

function equipmentSellValue(item) {
  return Math.max(20, Math.floor(equipmentValue(item) * 0.6));
}

function equipmentCompensation(item) {
  return Math.max(8, Math.floor(14 + (item?.tier || 1) * 18 + (item?.bonus || 0) * 260));
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
  const seed = `${state?.calendarStartDate || ""}|${day}|${dungeonId}|${depth}|${item?.id}`;
  const dailyMultiplier = 0.72 + stableUnit(seed) * 0.56;
  return clamp(dungeonLootBaseChance(item, depth) * dailyMultiplier, 0.000001, 0.01);
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
    return {
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
    context,
    replacedItemName: current?.name || "",
    compensation
  };
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
    slotName: equipmentSlot(item).name,
    stat: equipmentSlot(item).stat,
    statName: equipmentSlot(item).statName,
    tierName: equipmentTier(item).name,
    value: equipmentValue(item),
    stealChance: equipmentTier(item).stealChance,
    ownerName: owner?.name || "",
    ownerSect: owner?.id === "player" ? state.sect.name : owner?.sect || "",
    equipped: Boolean(owner && equippedItemsFor(state, owner).some((equipped) => equipped.id === item.id))
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
    context
  };
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
  if ((province.rank || 99) <= 5) return 1;
  if ((province.rank || 99) <= 12) return 0.82;
  if ((province.rank || 99) <= 22) return 0.62;
  return 0.42;
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
    effect.value = 10 + Math.round(10 * tier);
    effect.text = `每日成员灵石 +${effect.value}`;
  } else if (province.type === "xp") {
    effect.label = "经验";
    effect.value = Number((0.4 + 0.2 * tier).toFixed(2));
    effect.text = `经验获取 +${Math.round(effect.value * 100)}%`;
  } else if (province.type === "breakthrough") {
    effect.label = "突破";
    effect.value = Number((0.025 + 0.035 * tier).toFixed(3));
    effect.text = `突破概率 +${Math.round(effect.value * 100)}%`;
  } else {
    effect.type = "spirit";
    effect.label = "灵石";
    effect.value = 10 + Math.round(10 * tier);
    effect.text = `每日成员灵石 +${effect.value}`;
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

function makeMonster(name, realm, rootKey, intensity = 1) {
  const stats = rollBirthStats(capRealm(realm));
  const monsterRootKey = rootKey || pick(roots).key;
  const attack = Math.max(stats.attack + 2, Math.floor(stats.attack * (1.16 + intensity * 0.1)));
  const defense = Math.max(stats.defense + 1, Math.floor(stats.defense * (1.14 + intensity * 0.08)));
  const monster = {
    id: `monster-${stateSafeId(name)}-${realm}-${Math.floor(Math.random() * 100000)}`,
    name,
    realm: capRealm(realm),
    root: normalizeRoot({ key: monsterRootKey, bonus: monsterRootKey === "heaven" ? 0 : undefined }),
    roots: [],
    primaryRootKey: monsterRootKey,
    attack,
    defense,
    maxHp: Math.floor(stats.maxHp * (1.34 + intensity * 0.24)),
    hp: 1,
    maxMana: Math.floor(stats.maxMana * (1.08 + intensity * 0.1)),
    mana: 1,
    divineSense: Math.floor(stats.divineSense * (1.12 + intensity * 0.08)),
    skillId: randomSkillId()
  };
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
  return runTurnBattle(left, right, { maxRounds, state });
}

function ensureDungeonState(state) {
  const previousDungeonRecordVersion = Number(state.dungeonRecordVersion || 1);
  state.dungeonDays ??= [];
  state.dungeonDays = [...state.dungeonDays]
    .filter((record) => (state.day || 1) - (record.day || 1) < recentRecordDays)
    .sort((a, b) => b.day - a.day)
    .slice(0, recentRecordDays);
  for (const record of state.dungeonDays) {
    record.voidHallSpiritPools ??= buildVoidHallSpiritPools(state, record.day || state.day);
  }
  for (const { entity } of allCultivators(state)) {
    entity.dungeonHistory ??= [];
    entity.dungeonHistory = entity.dungeonHistory.slice(0, recentRecordDays);
  }
  if (previousDungeonRecordVersion < dungeonRecordVersion) {
    migrateStarSeaSpiritRewards(state);
    state.dungeonRecordVersion = dungeonRecordVersion;
  }
}

function pushDungeonHistory(entity, entry) {
  entity.dungeonHistory ??= [];
  entity.dungeonHistory.unshift(entry);
  entity.dungeonHistory = entity.dungeonHistory.slice(0, recentRecordDays);
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

function createBloodTrialCaves(maxStage) {
  return Array.from({ length: realmStages.length }, (_, cave) => {
    const stage = clamp(cave, 0, realmStages.length - 1);
    const realm = topRealmOfStage(stage);
    const stageMonsterNames = monsterNamesByStage[stage] || monsterNames;
    return {
      cave: cave + 1,
      name: dungeonTierNames[stage],
      monster: makeMonster(`${dungeonTierNames[stage]}·${pick(stageMonsterNames)}`, realm, pick(roots).key, 0.8 + cave * 0.18),
      clears: [],
      challengers: []
    };
  });
}

function rollSpiritFromRange(range) {
  return Math.floor((range?.min || 0) + Math.random() * Math.max(1, (range?.max || 0) - (range?.min || 0) + 1));
}

function distributeBasePool(total, entries) {
  if (!entries.length || total <= 0) return;
  const base = Math.max(1, Math.floor(total / entries.length));
  for (const entry of entries) entry.spirit = (entry.spirit || 0) + base;
  let remainder = Math.max(0, total - base * entries.length);
  const priority = [...entries].sort((a, b) => (a.rounds || 999) - (b.rounds || 999) || (b.output || 0) - (a.output || 0));
  for (let index = 0; remainder > 0; index = (index + 1) % priority.length) {
    priority[index].spirit += 1;
    remainder -= 1;
  }
}

function distributeBonusPool(total, entries) {
  const winners = [...entries]
    .sort((a, b) => (a.rounds || 999) - (b.rounds || 999) || (b.output || 0) - (a.output || 0))
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
    const basePool = rollSpiritFromRange(poolRange);
    const bonusPool = rollSpiritFromRange(bonusRange);
    cave.spiritPool = {
      base: basePool,
      bonus: bonusPool,
      total: basePool + bonusPool,
      baseRange: poolRange,
      bonusRange
    };
    const clears = cave.clears || [];
    distributeBasePool(basePool, clears);
    distributeBonusPool(bonusPool, clears);
    for (const clear of clears) {
      const person = allCultivators(state).find(({ entity }) => entity.id === clear.id)?.entity;
      if (person) person.spirit += clear.spirit || 0;
      const challenger = (cave.challengers || []).find((entry) => entry.id === clear.id);
      if (challenger) {
        challenger.spirit = clear.spirit || 0;
        challenger.bonusSpirit = clear.bonusSpirit || 0;
      }
    }
  }
}

function runSoloDungeonFor(state, entity, date, caves) {
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

  for (const cave of caves) {
    const monster = cave.monster;
    const startHp = runHp;
    const startMana = runMana;
    const battle = fightMonster(state, entity, monster, 13 + cave.cave, { hp: startHp, mana: startMana });
    const replay = buildReplay({ ...entity, hp: startHp, mana: startMana }, { ...monster }, battle, battle.winner === "left" ? "胜" : "负", timestampKey(), state);
    replay.replayId = makeReplayId("blood-trial", state.day, cave.cave, entity.id);
    finalMonster = monster.name;
    finalRealm = monster.realm;
    finalReplay = publicReplay(replay);
    const output = Math.max(1, Math.floor(monster.maxHp - battle.rightHp));
    const rounds = Math.max(1, Math.max(...battle.events.map((event) => event.round || 1)));
    cave.challengers.push({
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
    });
    if (battle.winner !== "left") break;
    runHp = clamp(battle.leftHp + Math.floor(maxHp * 0.5), 1, maxHp);
    runMana = clamp(battle.leftMana + Math.floor(maxMana * 0.5), 0, maxMana);

    clears += 1;
    const tierCap = equipmentTierForRealm(monster.realm);
    const candidate = rollEquipmentDrop(state, tierCap, "blood_trial", { cave: cave.cave });
    if (candidate) drop = candidate;
    finalOutput = output;
    finalRounds = rounds;
    const challenger = cave.challengers.find((item) => item.id === entity.id);
    if (challenger) challenger.spirit = spirit;
    cave.clears.push({
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
      item: candidate?.name || "",
      tierName: candidate ? equipmentTier(candidate).name : "",
      replay: finalReplay
    });
  }

  const score = clears ? finalRealm + clears * 8 : stageIndexOfRealm(entity.realm) * 10;
  if (clears) updateDungeonBest(entity, "血色禁地", score, clears);
  const transfer = drop ? awardEquipment(state, entity, drop, "血色禁地") : null;
  const entry = {
    type: "solo",
    name: "血色禁地",
    day: state.day,
    date,
    clears,
    spirit,
    monster: finalMonster,
    monsterRealm: realms[finalRealm],
    damage: finalOutput,
    rounds: finalRounds,
    replay: finalReplay,
    item: transfer?.itemName || "",
    tierName: transfer?.tierName || "",
    compensation: transfer?.compensation || 0,
    result: clears ? `连破 ${clears} 洞` : "外谷败退"
  };
  for (const cave of caves.slice(0, clears)) {
    const clear = cave.clears.find((item) => item.id === entity.id);
    if (clear && transfer?.itemName && cave.cave === clears) {
      clear.item = transfer.itemName;
      clear.tierName = transfer.tierName;
      const challenger = cave.challengers.find((item) => item.id === entity.id);
      if (challenger) {
        challenger.item = transfer.itemName;
        challenger.tierName = transfer.tierName;
      }
    }
  }
  pushDungeonHistory(entity, entry);
  return entry;
}

function runSectDungeon(state, sectName, members, date) {
  if (!members.length) return null;
  const highestRealm = Math.max(...members.map(({ entity }) => entity.realm || 0));
  const monsterRealm = voidHallMonsterRealmForHighestRealm(highestRealm);
  const targetStage = stageIndexOfRealm(monsterRealm);
  const monster = makeMonster(`虚天殿·${pick(monsterNames)}王`, monsterRealm, pick(roots).key, 1.2 + targetStage * 0.14);
  const monsterPower = powerOf(monster, state);
  const contributions = [];
  const battles = [];
  let monsterHp = monster.maxHp;
  let monsterMana = monster.maxMana;
  for (const { entity } of members) {
    if (monsterHp <= 0) break;
    const beforeMonsterHp = monsterHp;
    const beforeMonsterMana = monsterMana;
    const battle = fightMonster(state, entity, monster, 16, { monsterHp, monsterMana });
    const damage = Math.max(0, beforeMonsterHp - battle.rightHp);
    monsterHp = battle.rightHp;
    monsterMana = battle.rightMana;
    const replay = buildReplay({ ...entity }, { ...monster, hp: beforeMonsterHp, mana: beforeMonsterMana }, battle, battle.winner === "left" ? "胜" : "负", timestampKey(), state);
    const order = battles.length + 1;
    replay.replayId = makeReplayId("void-hall", state.day, sectName, order, entity.id);
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

  const record = {
    type: "sect",
    name: "虚天殿",
    sect: sectName,
    day: state.day,
    date,
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
    historyReplay.replayId = makeReplayId("void-hall", state.day, sectName, "history", entity.id);
    pushDungeonHistory(entity, {
      type: "sect",
      name: "虚天殿",
      day: state.day,
      date,
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
      }
    }

    const maxMonsterRealm = Math.max(...records.map((record) => record.monsterStats?.realmIndex || stage * 10));
    const item = rollEquipmentDrop(state, equipmentTierForRealm(maxMonsterRealm), "void_hall", { cave: stage + 1, stage });
    if (item) {
      const candidates = records
        .flatMap((record) => (record.rewardCandidates || []).map((candidate) => ({ ...candidate, record })))
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
        log(state, `${winnerRecord.sect}攻破虚天殿，${winnerName}凭同境界最高贡献得「${itemName}」。`, "gold");
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
  const monster = makeMonster(`乱星海·${pick(monsterNamesByStage[stage] || monsterNames)}`, realm, pick(roots).key, 1.15 + stage * 0.1);
  monster.defense = Math.max(1, Math.floor(monster.defense * 0.52));
  monster.attack = Math.max(1, Math.floor(monster.attack * 0.82));
  monster.maxHp = Math.max(monster.maxHp * 4, Math.floor(allCultivators(state).reduce((sum, { entity }) => sum + powerOf(entity, state), 0) * 0.34));
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
      const useSkill = monsterSkill && monsterState.mana >= monsterSkill.cost && monsterState.cooldown <= 0 && Math.random() < 0.45;
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
      const canSkill = fighter.skill && fighter.mana >= fighter.skill.cost && fighter.cooldown <= 0 && Math.random() < 0.46;
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

function distributeStarSeaTeamSpirit(teamRecord, teamSpirit) {
  const members = teamRecord.members || [];
  for (const member of members) member.spirit = 0;
  if (!members.length || teamSpirit <= 0) return;
  const basePool = Math.floor(teamSpirit * 0.2);
  const outputPool = teamSpirit - basePool;
  const baseShare = Math.floor(basePool / members.length);
  let remainder = teamSpirit - baseShare * members.length;
  const totalDamage = Math.max(1, members.reduce((sum, member) => sum + (member.damage || 0), 0));
  const ranked = [...members].sort((a, b) => (b.damage || 0) - (a.damage || 0));
  for (const member of ranked) {
    const outputShare = Math.floor(outputPool * (member.damage || 0) / totalDamage);
    member.spirit = baseShare + outputShare;
    remainder -= outputShare;
  }
  for (let index = 0; remainder > 0 && ranked.length; index = (index + 1) % ranked.length) {
    ranked[index].spirit += 1;
    remainder -= 1;
  }
}

function assignStarSeaSpiritShares(teamRecords, pool) {
  if (!teamRecords.length) return;
  const minimumShare = 6;
  const basePool = Math.min(pool, teamRecords.length * minimumShare);
  const baseShare = Math.floor(basePool / teamRecords.length);
  let remainder = pool - baseShare * teamRecords.length;
  for (const record of teamRecords) record.spirit = baseShare;

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

  for (const record of teamRecords) distributeStarSeaTeamSpirit(record, record.spirit);
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
      .sort((a, b) => b.damage - a.damage)
      .slice(0, 10);

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
  assignStarSeaSpiritShares(teamRecords, pool);

  for (const record of teamRecords) {
    for (const member of record.members || []) {
      const entity = cultivatorById(state, member.id);
      if (entity) entity.spirit += member.spirit || 0;
    }
  }
}

function rollStarSeaEquipmentDrop(state, monster) {
  if (Math.random() >= starSeaDropChance) return null;
  const pool = availableDungeonEquipmentPool(state, "star_sea", equipmentTierForRealm(monster.realm));
  if (!pool.length) return null;
  const weighted = pool.map((item) => ({ item, weight: 1 / Math.pow(item.tier || 1, 2.4) }));
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) return entry.item;
  }
  return weighted[weighted.length - 1]?.item || null;
}

function settleStarSeaAuction(state, teamRecords, item) {
  if (!item) return null;
  for (const team of teamRecords) {
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

      const participants = allCultivators(state).map(({ entity: person }) => person).filter((person) => person.id !== entity.id);
      const dividend = participants.length ? Math.floor(value / participants.length) : 0;
      let remainder = value - dividend * participants.length;
      for (const person of participants) person.spirit += dividend;
      for (const person of participants.slice(0, remainder)) person.spirit += 1;

      const transfer = {
        type: "auction",
        itemId: item.id,
        itemName: item.name,
        tierName: equipmentTier(item).name,
        slotName: equipmentSlot(item).name,
        statName: equipmentSlot(item).statName,
        bonus: item.bonus || 0,
        value,
        dividend,
        dividendRemainder: remainder,
        winnerId: entity.id,
        winnerName: entity.name,
        loserId: "",
        loserName: "乱星海竞拍",
        replacedItemId: soldItem?.id || "",
        replacedItemName: soldItem?.name || "",
        soldValue,
        chance: starSeaDropChance,
        day: state.day,
        date: stateDateForDay(state),
        context: "乱星海猎妖竞拍"
      };
      state.equipmentTransfers ??= [];
      state.equipmentTransfers.unshift(transfer);
      state.equipmentTransfers = state.equipmentTransfers.slice(0, recentRecordDays);
      team.item = item.name;
      team.itemOwner = entity.name;
      team.itemValue = value;
      team.auctionDividend = dividend;
      candidate.item = item.name;
      candidate.tierName = equipmentTier(item).name;
      const soldText = soldItem ? `，并卖出旧装备「${soldItem.name}」得 ${soldValue} 灵石` : "";
      log(state, `${entity.name}以 ${value} 灵石竞得${equipmentTier(item).name}「${item.name}」${soldText}，其余修士各分润 ${dividend} 灵石。`, item.tier >= 4 ? "gold" : "");
      return transfer;
    }
  }
  return null;
}

function runStarSeaDungeon(state, roster, date) {
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
  const spiritPool = Math.max(teamRecords.length * 10, rollSpiritFromRange(spiritRange));
  settleStarSeaSpirit(state, teamRecords, spiritPool);

  const item = rollStarSeaEquipmentDrop(state, monster);
  const transfer = settleStarSeaAuction(state, teamRecords, item);

  for (const record of teamRecords) {
    const replay = publicStarSeaTeamReplay(record, monster, state);
    record.replay = replay;
    for (const member of record.members) {
      const entity = cultivatorById(state, member.id);
      if (!entity) continue;
      pushDungeonHistory(entity, {
        type: "public",
        name: "乱星海猎妖",
        day: state.day,
        date,
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
        tierName: member.tierName || ""
      });
      updateDungeonBest(entity, "乱星海猎妖", monsterStage * 10 + Math.floor((record.score || 0) / 220), record.success ? 1 : 0);
    }
  }

  return {
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
    dropChance: starSeaDropChance,
    replay: publicStarSeaTeamReplay(teamRecords[0], monster, state),
    teams: teamRecords,
    top: teamRecords.flatMap((record) => record.members.map((member) => ({ ...member, teamName: record.name, teamRank: record.rank })))
      .sort((a, b) => b.damage - a.damage)
      .slice(0, 10),
    item: transfer?.itemName || "",
    itemOwner: transfer?.winnerName || "",
    tierName: transfer?.tierName || "",
    itemValue: transfer?.value || 0,
    auctionDividend: transfer?.dividend || 0
  };
}

function runDailyDungeons(state, date) {
  ensureDungeonState(state);
  if (state.dungeonDays.some((record) => record.day === state.day)) return state.dungeonDays.find((record) => record.day === state.day);
  const roster = allCultivators(state);
  const maxStage = Math.max(...roster.map(({ entity }) => stageIndexOfRealm(entity.realm || 0)));
  const bloodCaves = createBloodTrialCaves(maxStage);
  const solo = roster.map(({ entity }) => ({ id: entity.id, personName: entity.name, sect: entity.id === "player" ? state.sect.name : entity.sect, ...runSoloDungeonFor(state, entity, date, bloodCaves) }));
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
      clears: cave.clears
        .sort((a, b) => (a.rounds || 999) - (b.rounds || 999) || b.output - a.output)
        .slice(0, 12),
      challengers: cave.challengers
        .sort((a, b) => Number(b.success) - Number(a.success) || (a.success ? (a.rounds || 999) - (b.rounds || 999) : (b.output || 0) - (a.output || 0)) || (b.output || 0) - (a.output || 0))
        .slice(0, 12)
    }))
  };
  const sectRecords = activeSectNames(state)
    .map((sectName) => runSectDungeon(state, sectName, membersForSect(state, sectName), date))
    .filter(Boolean);
  settleVoidHallRewards(state, sectRecords);
  const voidHallSpiritPools = buildVoidHallSpiritPools(state);
  const publicRecord = runStarSeaDungeon(state, roster, date);
  const record = {
    day: state.day,
    date,
    bloodTrial,
    solo: solo.slice(0, 20),
    sects: sectRecords,
    voidHallSpiritPools,
    public: publicRecord
  };
  state.dungeonDays.unshift(record);
  state.dungeonDays = state.dungeonDays
    .filter((item) => (state.day || 1) - (item.day || 1) < recentRecordDays)
    .sort((a, b) => (b.day || 0) - (a.day || 0))
    .slice(0, recentRecordDays);
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

function sectXpBonus(state, sectName) {
  return provinceEffectsForSect(state, sectName)
    .filter((effect) => effect.type === "xp")
    .reduce((sum, effect) => sum + effect.value, 0);
}

function sectSpiritIncome(state, sectName) {
  return provinceEffectsForSect(state, sectName)
    .filter((effect) => effect.type === "spirit")
    .reduce((sum, effect) => sum + effect.value, 0);
}

function sectBreakthroughBonus(state, sectName) {
  return provinceEffectsForSect(state, sectName)
    .filter((effect) => effect.type === "breakthrough")
    .reduce((sum, effect) => sum + effect.value, 0);
}

function provinceRankOf(territory) {
  return provinceById(territory.id)?.rank || 99;
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
      const count = baseCount + (index < remainder ? 1 : 0);
      const defenders = members.slice(cursor, cursor + count).map((member) => member.entity.id);
      cursor += count;
      setDefenders(territory, defenders);
    });
  }
  return changed;
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
  return clamp(breakthroughChance(entity) * (1 + sectBreakthroughBonus(state, sectName)), 0.04, 0.88);
}

function breakthroughChanceParts(state, entity) {
  const realmBase = baseBreakthroughChance(entity.realm || 0);
  const base = breakthroughChance(entity);
  const sectName = entity.id === "player" ? state.sect.name : entity.sect;
  const bonus = sectBreakthroughBonus(state, sectName);
  const sectMultiplier = 1 + bonus;
  return {
    realmBase,
    rootMultiplier: base / Math.max(0.0001, realmBase),
    sectMultiplier,
    base,
    bonus,
    total: clamp(base * sectMultiplier, 0.04, 0.88)
  };
}

function xpPreviewParts(state, entity, baseXp = entity.id === "player" ? playerDailyBaseXp : 100) {
  const sectName = entity.id === "player" ? state.sect.name : entity.sect;
  const rootMultiplier = entity.id === "player" ? 1 : xpGainMultiplier(entity);
  const sectMultiplier = entity.id === "player" ? 1 : 1 + sectXpBonus(state, sectName);
  const total = entity.id === "player" ? baseXp : Math.floor(baseXp * rootMultiplier * sectMultiplier);
  return {
    baseXp,
    rootMultiplier,
    sectMultiplier,
    total,
    rootDelta: Math.floor(baseXp * rootMultiplier) - baseXp,
    sectDelta: total - Math.floor(baseXp * rootMultiplier)
  };
}

function personInsight(state, entity) {
  return {
    rootProfile: rootProfile(entity),
    effectiveStats: effectiveStats(entity, state),
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

function addProvinceIncome(state, settlementDate) {
  const incomes = [];
  for (const territory of state.provinces || []) {
    if (!territory.owner) continue;
    const province = provinceById(territory.id);
    if (!province) continue;
    const effect = provinceEffect(province);
    if (effect.type !== "spirit") continue;
    for (const member of membersForSect(state, territory.owner)) {
      member.entity.spirit += effect.value;
    }
    incomes.push(`${territory.owner}据有${province.name}，门人各得 ${effect.value} 灵石`);
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

function withSiegeDefenseBuff(entity) {
  return {
    ...entity,
    attack: Math.floor((entity.attack || 0) * 1.1),
    defense: Math.floor((entity.defense || 0) * 1.1),
    maxHp: Math.floor((entity.maxHp || 0) * 1.1),
    hp: Math.floor((entity.hp ?? entity.maxHp ?? 0) * 1.1),
    divineSense: Math.floor((entity.divineSense || 0) * 1.1),
    maxMana: Math.floor((entity.maxMana || 0) * 1.1),
    mana: Math.floor((entity.mana ?? entity.maxMana ?? 0) * 1.1)
  };
}

function runWheelBattle(state, province, attackerSect, defenderSect) {
  const attackers = membersForSectAscending(state, attackerSect);
  const defenderIds = provinceStateById(state, province.id)?.defenders || [];
  const map = cultivatorMap(state);
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
    const left = {
      ...attacker.entity,
      hp: carry.attackerHp ?? effectiveMaxHp(attacker.entity, state),
      mana: carry.attackerMana ?? effectiveMaxMana(attacker.entity, state)
    };
    const defenderWithBuff = withSiegeDefenseBuff(defender.entity);
    const right = {
      ...defenderWithBuff,
      hp: carry.defenderHp ?? effectiveMaxHp(defenderWithBuff, state),
      mana: carry.defenderMana ?? effectiveMaxMana(defenderWithBuff, state)
    };
    const battle = runTurnBattle(left, right, { maxRounds: 16, state });
    const attackerWon = battle.winner === "left";
    battles.push({
      order: battles.length + 1,
      attacker: siegeEntityRef(attacker),
      defender: siegeEntityRef(defender),
      winnerSide: attackerWon ? "attacker" : "defender",
      winnerName: attackerWon ? attacker.entity.name : defender.entity.name,
      summary: `${attacker.entity.name} ${attackerWon ? "击败" : "败于"} ${defender.entity.name}`,
      replay: buildReplay(left, right, battle, attackerWon ? "胜" : "负", timestampKey(), state)
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

function runProvinceSieges(state, settlementDate) {
  state.provinceWars ??= [];
  const targeted = new Set();
  const wars = [];
  for (const attackerSect of shuffle(activeSectNames(state))) {
    if (provinceIdsForSect(state, attackerSect).length >= membersForSect(state, attackerSect).length) continue;
    const candidates = shuffle((state.provinces || []).filter((item) => item.owner !== attackerSect && !targeted.has(item.id)));
    const target = candidates[0];
    if (!target) continue;
    targeted.add(target.id);
    const province = provinceById(target.id);
    if (!province) continue;
    const defenderSect = target.owner;
    const record = {
      id: `${settlementDate}-${attackerSect}-${target.id}`,
      day: state.day,
      date: settlementDate,
      provinceId: target.id,
      provinceName: province.name,
      attacker: attackerSect,
      defender: defenderSect || "无主之地",
      captured: false,
      result: "",
      battles: []
    };
    if (!defenderSect) {
      target.owner = attackerSect;
      enforceProvinceOccupationLimits(state);
      record.captured = true;
      record.result = `${attackerSect}兵不血刃占下${province.name}`;
    } else {
      const result = runWheelBattle(state, province, attackerSect, defenderSect);
      record.battles = result.battles;
      record.attackerLineup = result.attackerLineup;
      record.defenderLineup = result.defenderLineup;
      record.captured = result.captured;
      record.result = result.captured
        ? `${attackerSect}攻破${defenderSect}防线，占下${province.name}`
        : `${defenderSect}守住${province.name}，${result.defenderSurvivor || "守城修士"}仍立城头`;
      if (result.captured) {
        target.owner = attackerSect;
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
    wars.push(record);
  }
  if (wars.length) {
    state.provinceWars.unshift(...wars);
    state.provinceWars = state.provinceWars
      .filter((record) => (state.day || 1) - (record.day || 1) < recentRecordDays)
      .sort((a, b) => (b.day || 0) - (a.day || 0))
      .slice(0, recentRecordDays);
    enforceProvinceOccupationLimits(state);
    assignProvinceDefenders(state);
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

function applyDuelScore(person, won, day) {
  normalizeDuelSeason(person, day);
  person.duelSeason.score = Math.max(0, Math.min(duelSeasonMaxScore, person.duelSeason.score + (won ? duelWinScore : duelLossScore)));
  if (won) person.duelSeason.wins += 1;
  else person.duelSeason.losses += 1;
}

function duelSeasonStatsFromRecords(state) {
  const currentSeason = duelSeasonOfDay(state.day);
  const stats = new Map(allCultivators(state).map(({ entity }) => [entity.id, { score: 0, wins: 0, losses: 0 }]));
  const records = [...(state.duelDays || [])]
    .filter((record) => duelSeasonOfDay(record.day || state.day) === currentSeason)
    .sort((a, b) => (a.day || 0) - (b.day || 0));
  for (const record of records) {
    for (const match of record.matches || []) {
      const winnerId = match.winner?.id;
      const loserId = match.loser?.id;
      const winner = stats.get(winnerId);
      if (winner) {
        winner.score = Math.min(duelSeasonMaxScore, winner.score + duelWinScore);
        winner.wins += 1;
      }
      if (match.type === "bye") continue;
      const loser = stats.get(loserId);
      if (loser) {
        loser.score = Math.max(0, loser.score + duelLossScore);
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
  const minDayToKeep = Math.max(1, Number(currentDay || 1) - duelRecordDays + 1);
  return [...(records || [])]
    .filter((record) => (record.day || currentDay) >= minDayToKeep)
    .sort((a, b) => b.day - a.day)
    .slice(0, duelRecordDays);
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

  return {
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
    portraitVariant: 0,
    dungeonHistory: [],
    dailyRecords: [],
    breakthroughs: [],
    skillUpgrades: [],
    duelHistory: []
  };
}

function log(state, text, type = "") {
  state.log.unshift({
    text,
    type,
    day: state.day,
    date: stateDateForDay(state),
    time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
  });
  state.log = state.log.slice(0, 80);
}

function makeId(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeTaskCategory(value) {
  const text = String(value || "").trim();
  if (taskCategories.includes(text)) return text;
  if (["工作", "加班", "职业"].includes(text)) return "工作";
  if (["运动", "锻炼", "健身", "修行", "body"].includes(text)) return "运动";
  return "生活";
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

function defaultRealityTasks() {
  return defaultTaskDefinitions.map((definition) => normalizeTaskDefinition(definition));
}

function ensureTaskSystem(state) {
  let changed = false;
  if (!Array.isArray(state.taskDefinitions) || !state.taskDefinitions.length) {
    state.taskDefinitions = defaultRealityTasks();
    changed = true;
  } else {
    state.taskDefinitions = state.taskDefinitions.map((definition) => normalizeTaskDefinition(definition)).slice(0, taskDefinitionLimit);
  }
  if (!Array.isArray(state.taskCompletions)) {
    state.taskCompletions = Array.isArray(state.tasks) ? [...state.tasks] : [];
    changed = true;
  }
  state.tasks ??= [];
  return changed;
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

  return {
    day: 1,
    xpModeVersion,
    player: {
      id: "player",
      name: "李昕纾",
      gender: "female",
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
      dungeonClears: 0,
      bestDungeonPower: 0,
      bestDungeonName: "未入秘境",
      dungeonHistory: [],
      dailyRecords: [],
      breakthroughs: [],
      skillUpgrades: [],
      duelHistory: []
    },
    bag: { focus: 1, blood: 1, insight: 0 },
    equipment: createEquipmentState(),
    equipmentVersion,
    equipmentTransfers: [],
    dungeonRecordVersion,
    dungeonDays: [],
    starSeaCycle: null,
    rosterVersion,
    tasks: [],
    taskDefinitions: defaultRealityTasks(),
    taskCompletions: [],
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
    provinceVersion,
    provinces: createNeutralProvinceState(),
    provinceWars: [],
    provinceIncomeLog: [],
    duelDays: [],
    calendarStartDate: dateKey(),
    lastSettlementDate: dateKey(),
    log: [{ text: openingLog, type: "", day: 1, date: dateKey(), time: "初入" }]
  };
}

export function clearProgressHistory(state) {
  const resetPerson = (person) => {
    person.duelWins = 0;
    person.duelLosses = 0;
    person.duelSeason = defaultDuelSeason(state.day);
    person.duelSeasonHistory = [];
    person.duelHistory = [];
    person.dungeonClears = 0;
    person.bestDungeonPower = 0;
    person.bestDungeonName = "未入秘境";
    person.dungeonHistory = [];
    person.dailyRecords = [];
    person.breakthroughs = [];
    person.skillUpgrades = [];
  };

  resetPerson(state.player);
  for (const npc of state.npcs || []) resetPerson(npc);
  state.duelDays = [];
  state.provinces = createNeutralProvinceState();
  state.provinceVersion = provinceVersion;
  state.provinceWars = [];
  state.provinceIncomeLog = [];
  state.equipment = createEquipmentState();
  state.equipmentVersion = equipmentVersion;
  state.equipmentTransfers = [];
  state.dungeonRecordVersion = dungeonRecordVersion;
  state.dungeonDays = [];
  state.starSeaCycle = null;
  state.tasks = [];
  state.taskDefinitions = defaultRealityTasks();
  state.taskCompletions = [];
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
    primaryRootKey: entity.primaryRootKey || entity.root?.key || ""
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
  state.log = [{
    text: `你在山脚租下一间小屋，翻开第一卷长生札记。本世灵根为${rootText}。`,
    type: "",
    day: 1,
    date: dateKey(),
    time: "初入"
  }];
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

  copyCultivatorProfile(state.player, previousAdminProfiles.cultivators?.player || previousState.player);
  state.player.sect = state.sect.name;
  rememberCultivatorProfile(state, state.player);

  const previousNpcMap = new Map((previousState.npcs || []).map((npc) => [npc.id, npc]));
  for (const npc of state.npcs || []) {
    const previousNpc = previousAdminProfiles.cultivators?.[npc.id] || previousNpcMap.get(npc.id);
    copyCultivatorProfile(npc, previousNpc);
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

export function ensureStateShape(state) {
  let changed = false;
  if (state.rosterVersion !== rosterVersion) {
    migrateRoster(state);
    changed = true;
  }
  if (!state.calendarStartDate) {
    state.calendarStartDate = addDays(state.lastSettlementDate || dateKey(), 1 - Number(state.day || 1));
    changed = true;
  }
  const ensureDatedRecord = (record) => {
    if (record && !record.date) {
      record.date = stateDateForDay(state, record.day || state.day);
      return true;
    }
    return false;
  };
  if (Array.isArray(state.log)) {
    for (const entry of state.log) changed = ensureDatedRecord(entry) || changed;
  }
  if (Array.isArray(state.tasks)) {
    for (const task of state.tasks) changed = ensureDatedRecord(task) || changed;
  }
  changed = ensureTaskSystem(state) || changed;
  if (Array.isArray(state.taskCompletions)) {
    for (const task of state.taskCompletions) changed = ensureDatedRecord(task) || changed;
  }
  if (Array.isArray(state.duelDays)) {
    for (const record of state.duelDays) changed = ensureDatedRecord(record) || changed;
  }
  if (Array.isArray(state.provinceWars)) {
    for (const record of state.provinceWars) changed = ensureDatedRecord(record) || changed;
  }
  if ("talent" in state.player) {
    delete state.player.talent;
    changed = true;
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
  ensureDungeonState(state);
  if (state.starSeaCycle === undefined) {
    state.starSeaCycle = null;
    changed = true;
  }
  changed = ensureField(state.player, "mana", () => effectiveMaxMana(state.player)) || changed;
  changed = ensureField(state.player, "hp", () => effectiveMaxHp(state.player)) || changed;
  state.player.hp = Math.min(state.player.hp, effectiveMaxHp(state.player, state));
  state.player.mana = Math.min(state.player.mana, effectiveMaxMana(state.player, state));
  state.sect.warWins ??= 0;
  state.sect.warLosses ??= 0;
  state.duelDays ??= [];
  state.duelDays = trimDuelDays(state.duelDays, state.day);
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
  state.npcs = state.npcs.map((npc, index) => {
    const full = { ...npc };
    full.id ??= `npc-${index}`;
    if ("talent" in full) {
      delete full.talent;
      changed = true;
    }
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
    changed = ensureField(full, "dungeonHistory", []) || changed;
    full.hp = Math.min(full.hp, effectiveMaxHp(full, state));
    full.mana = Math.min(full.mana, effectiveMaxMana(full, state));
    return full;
  });
  const adminProfiles = ensureAdminProfiles(state);
  adminProfiles.playerSect ||= state.sect.name;
  if (!adminProfiles.cultivators.player) {
    rememberCultivatorProfile(state, state.player);
    changed = true;
  }
  for (const npc of state.npcs || []) {
    if (!adminProfiles.cultivators[npc.id]) {
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
  return changed;
}

export function powerOf(entity, state) {
  return Math.floor(
    effectiveAttack(entity, state) * 2.8 +
    effectiveDefense(entity, state) * 2 +
    effectiveMaxHp(entity, state) * 0.42 +
    effectiveDivineSense(entity, state) * 1.35 +
    effectiveMaxMana(entity, state) * 0.55
  );
}

export function compactStateForStorage(state) {
  compactReplayFields(state);
  compactNonPlayerReplays(state);
  for (const { entity } of allCultivators(state)) {
    entity.dailyRecords = (entity.dailyRecords || []).slice(0, recentRecordDays);
    entity.breakthroughs = (entity.breakthroughs || []).slice(0, recentRecordDays);
    entity.skillUpgrades = (entity.skillUpgrades || []).slice(0, recentRecordDays);
    entity.duelHistory = (entity.duelHistory || []).slice(0, recentRecordDays);
    entity.dungeonHistory = (entity.dungeonHistory || []).slice(0, recentRecordDays);
  }
  state.duelDays = trimDuelDays(state.duelDays || [], state.day || 1);
  state.provinceWars = (state.provinceWars || []).filter((record) => (state.day || 1) - (record.day || 1) < recentRecordDays).slice(0, recentRecordDays);
  state.dungeonDays = (state.dungeonDays || []).filter((record) => (state.day || 1) - (record.day || 1) < recentRecordDays).slice(0, recentRecordDays);
  state.equipmentTransfers = (state.equipmentTransfers || []).filter((record) => (state.day || 1) - (record.day || 1) < recentRecordDays).slice(0, recentRecordDays);
  state.log = (state.log || []).slice(0, 80);
  state.tasks = (state.tasks || []).slice(0, 16);
  state.taskCompletions = (state.taskCompletions || []).slice(0, taskCompletionLimit);
  state.taskDefinitions = (state.taskDefinitions || []).slice(0, taskDefinitionLimit);
  return state;
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
  ensureStateShape(state);
  const nextRealm = realms[Math.min(state.player.realm + 1, realms.length - 1)];
  const currentRealmInfo = realmInfo(state.player.realm);
  const breakChance = breakthroughChanceFor(state, state.player);
  const derivedBase = {
    xpNeed: xpNeed(state.player.realm),
    currentRealmInfo,
    realmProgression: buildRealmProgression(state.player),
    playerPower: powerOf(state.player, state),
    effectiveStats: effectiveStats(state.player, state),
    dungeonLootPools: publicDungeonLootPools(state),
    duelSeason: {
      season: duelSeasonOfDay(state.day),
      seasonDay: duelSeasonDay(state.day),
      length: duelSeasonLength,
      maxScore: duelSeasonMaxScore,
      winScore: duelWinScore,
      lossScore: duelLossScore
    },
    nextRealm,
    breakChance,
    baseBreakChance: currentRealmInfo.baseBreakChance,
    skillUpgrade: previewSkillUpgradeForState(state, state.player),
    skillUpgradePlan: skillUpgradePlanForState(state, state.player),
    sects: buildSectSummaries(state)
  };

  if (options.scope === "lite") {
    return {
      __scope: "lite",
      day: state.day,
      calendarStartDate: state.calendarStartDate,
      lastSettlementDate: state.lastSettlementDate,
      player: publicCultivator(state.player, state, { includeRecentReplays: true }),
      sect: state.sect,
      tasks: state.tasks,
      taskDefinitions: state.taskDefinitions,
      taskCompletions: state.taskCompletions,
      log: state.log,
      bag: state.bag,
      equipmentTransfers: state.equipmentTransfers,
      provinces: state.provinces,
      sectProfiles: publicSectProfiles(state),
      derived: derivedBase
    };
  }

  return {
    ...state,
    player: publicCultivator(state.player, state, { includeRecentReplays: true }),
    npcs: state.npcs.map((npc) => publicCultivator(npc, state)),
    equipment: state.equipment.map((item) => publicEquipment(item, state)),
    duelDays: publicDuelDays(state.duelDays || []),
    provinceWars: publicProvinceWars(state.provinceWars || []),
    dungeonDays: publicDungeonDays(state.dungeonDays || []),
    sectProfiles: publicSectProfiles(state),
    catalog: { realms, realmStages, roots, rootRules: rootRulesCatalog(), dungeons, taskTemplates, itemCatalog, sects, combatSkills, provinces, equipmentSlots, equipmentTiers, equipmentCatalog, duelRanks },
    derived: {
      ...derivedBase,
      personInsights: Object.fromEntries(allCultivators(state).map(({ entity }) => [entity.id, personInsight(state, entity)])),
      equippedItems: Object.fromEntries(allCultivators(state).map(({ entity }) => [entity.id, equippedItemsFor(state, entity).map((item) => publicEquipment(item, state))])),
      duelRanks: Object.fromEntries(allCultivators(state).map(({ entity }) => [entity.id, duelRankSnapshot(entity)])),
      npcPowers: Object.fromEntries(state.npcs.map((npc) => [npc.id, powerOf(npc, state)])),
    }
  };
}

function publicCultivator(entity, state, options = {}) {
  return {
    ...entity,
    skillRank: skillRankOf(entity, entity.skillId),
    effectiveSkill: effectiveSkillForEntity(entity),
    duelHistory: publicDuelHistory(entity.duelHistory || [], options),
    dungeonHistory: publicDungeonHistory(entity.dungeonHistory || []),
    power: powerOf(entity, state)
  };
}

function publicDungeonHistory(records) {
  return records.map((record) => ({
    ...record,
    replayId: record.replayId || "",
    hasReplay: Boolean(record.replay || record.replayId),
    replay: null
  }));
}

function publicDuelHistory(records, options = {}) {
  const replayLimit = options.includeRecentReplays ? 5 : 0;
  return records.map((record, index) => ({
    ...record,
    replayId: record.replayId || "",
    hasReplay: Boolean(record.replay || record.replayId),
    replay: index < replayLimit ? publicReplay(record.replay) : null
  }));
}

function publicDuelDays(records) {
  return records.map((record, recordIndex) => ({
    ...record,
    matches: (record.matches || []).map((match, matchIndex) => ({
      ...match,
      left: publicEntityRef(match.left),
      right: publicEntityRef(match.right),
      winner: publicEntityRef(match.winner),
      loser: publicEntityRef(match.loser),
      replayId: match.replayId || "",
      hasReplay: Boolean(match.replay || match.replayId),
      replay: null
    }))
  }));
}

function publicDungeonDays(records) {
  return (records || []).map((record) => ({
    day: record.day,
    date: record.date,
    bloodTrial: record.bloodTrial ? {
      name: record.bloodTrial.name,
      caves: (record.bloodTrial.caves || []).map(publicBloodCaveRecord)
    } : null,
    solo: (record.solo || []).slice(0, 20).map(publicDungeonHistoryEntry),
    sects: (record.sects || []).map(publicSectDungeonRecord),
    voidHallSpiritPools: record.voidHallSpiritPools || [],
    public: record.public ? publicStarSeaRecord(record.public) : null
  }));
}

function publicBloodCaveRecord(cave) {
  return {
    cave: cave.cave,
    name: cave.name,
    monster: cave.monster,
    spiritPool: cave.spiritPool,
    clears: (cave.clears || []).map(publicBloodEntry),
    challengers: (cave.challengers || []).map(publicBloodEntry)
  };
}

function publicBloodEntry(entry) {
  return {
    id: entry.id,
    name: entry.name,
    sect: entry.sect,
    realm: entry.realm,
    gender: entry.gender,
    primaryRootKey: entry.primaryRootKey,
    skillId: entry.skillId,
    output: entry.output,
    rounds: entry.rounds,
    success: Boolean(entry.success),
    spirit: entry.spirit || 0,
    bonusSpirit: entry.bonusSpirit || 0,
    item: entry.item || "",
    tierName: entry.tierName || "",
    replayId: entry.replayId || "",
    hasReplay: Boolean(entry.replay || entry.replayId),
    replay: null
  };
}

function publicDungeonHistoryEntry(record) {
  return {
    ...record,
    replayId: record.replayId || "",
    hasReplay: Boolean(record.replay || record.replayId),
    replay: null
  };
}

function publicSectDungeonRecord(record) {
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
      challenger: publicEntityRef(battle.challenger),
      damage: battle.damage,
      monsterStartHp: battle.monsterStartHp,
      monsterStartMana: battle.monsterStartMana,
      monsterEndHp: battle.monsterEndHp,
      monsterEndMana: battle.monsterEndMana,
      monsterMaxHp: battle.monsterMaxHp,
      monsterMaxMana: battle.monsterMaxMana,
      winnerName: battle.winnerName,
      replayId: battle.replayId || "",
      hasReplay: Boolean(battle.replay || battle.replayId),
      replay: null
    })),
    item: record.item || "",
    itemOwner: record.itemOwner || "",
    tierName: record.tierName || "",
    replayId: record.replayId || "",
    hasReplay: Boolean(record.replay || record.replayId),
    replay: null
  };
}

function publicStarSeaRecord(record) {
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
    teams: (record.teams || []).map(publicStarSeaTeam),
    top: (record.top || []).map(publicStarSeaMember),
    item: record.item || "",
    itemOwner: record.itemOwner || "",
    tierName: record.tierName || "",
    itemValue: record.itemValue || 0,
    auctionDividend: record.auctionDividend || 0,
    replayId: record.replayId || "",
    hasReplay: Boolean(record.replay || record.replayId),
    replay: null
  };
}

function publicStarSeaTeam(record) {
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
    members: (record.members || []).map(publicStarSeaMember),
    top: (record.top || []).map(publicStarSeaMember),
    item: record.item || "",
    itemOwner: record.itemOwner || "",
    itemValue: record.itemValue || 0,
    auctionDividend: record.auctionDividend || 0,
    replayId: record.replayId || "",
    hasReplay: Boolean(record.replay || record.replayId),
    replay: null
  };
}

function publicStarSeaMember(member) {
  return {
    id: member.id,
    name: member.name,
    sect: member.sect,
    realm: member.realm,
    gender: member.gender,
    teamName: member.teamName,
    teamRank: member.teamRank,
    damage: member.damage || 0,
    spirit: member.spirit || 0,
    item: member.item || "",
    tierName: member.tierName || ""
  };
}

export function getDuelReplay(state, day, matchId) {
  ensureStateShape(state);
  const numericDay = Number(day);
  const record = (state.duelDays || []).find((item) => Number(item.day) === numericDay);
  if (!record) throw new Error("未找到该日切磋记录");
  const match = (record.matches || []).find((item) => item.id === matchId);
  if (!match || match.type !== "battle") throw new Error("未找到该场切磋");
  if (!match.replay) throw new Error("该场切磋尚未保存回放");
  return publicReplay(match.replay);
}

export function getDuelReplayId(state, day, matchId) {
  ensureStateShape(state);
  const numericDay = Number(day);
  const record = (state.duelDays || []).find((item) => Number(item.day) === numericDay);
  if (!record) throw new Error("未找到该日切磋记录");
  const match = (record.matches || []).find((item) => item.id === matchId);
  if (!match || match.type !== "battle") throw new Error("未找到该场切磋");
  return match.replayId || "";
}

function publicProvinceWars(records) {
  return records.map((record, recordIndex) => ({
    ...record,
    battles: (record.battles || []).map((battle, battleIndex) => ({
      ...battle,
      attacker: publicEntityRef(battle.attacker),
      defender: publicEntityRef(battle.defender),
      replayId: battle.replayId || "",
      hasReplay: Boolean(battle.replay || battle.replayId),
      replay: null
    }))
  }));
}

function publicReplay(replay) {
  if (!replay) return null;
  const eventLimit = replay.kind === "starSeaTeam" ? 80 : 40;
  return {
    ...replay,
    replayId: replay.replayId || makeReplayId("battle", timestampKey(), Math.random().toString(36).slice(2, 8)),
    events: (replay.events || []).slice(0, eventLimit)
  };
}

export function getPublicReplay(replay) {
  return publicReplay(replay);
}

function publicEntityRef(ref) {
  if (!ref) return ref;
  return {
    kind: ref.kind,
    id: ref.id,
    name: ref.name,
    realm: ref.realm,
    sect: ref.sect,
    skillId: ref.skillId,
    skillRank: skillRankOf(ref, ref.skillId),
    effectiveSkill: effectiveSkillForEntity(ref)
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
      portraitUrl: member.portraitUrl || "",
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
        leaderId: leader?.id || "",
        leaderName: leader?.name || "无",
        leader: leader?.name || "无",
        elders,
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
        totalPower: Math.round(sect.totalPower)
      };
    })
    .sort((a, b) => b.totalPower - a.totalPower);
}

export function settleIfNeeded(state) {
  const today = dateKey();
  if (!state.lastSettlementDate) state.lastSettlementDate = today;
  if (state.lastSettlementDate === today) return false;
  dailySettlement(state, { auto: true });
  return true;
}

export function dailySettlement(state, options = {}) {
  state.day += 1;
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

  for (const npc of state.npcs) {
    const beforeRealm = npc.realm;
    const baseXp = 100;
    const xpMultiplier = xpGainMultiplier(npc) * (1 + sectXpBonus(state, npc.sect));
    const totalXp = Math.floor(baseXp * xpMultiplier);
    const bonusXp = Math.max(0, totalXp - baseXp);
    npc.xp += totalXp;

    const baseSpirit = sectSpiritIncome(state, npc.sect);
    const spirit = Math.floor(baseSpirit * spiritIncomeMultiplier(npc));
    npc.spirit += spirit;

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
        from: realms[fromRealm],
        to: realms[targetRealm] || "未知境界",
        success,
        chance: chanceParts.total,
        baseChance: chanceParts.base,
        bonusChance: chanceParts.bonus,
        growth
      });
      npc.breakthroughs = npc.breakthroughs.slice(0, recentRecordDays);
    }

    const duelSeasonReward = duelSeasonRewards.get(npc.id)?.reward || 0;
    const skillUpgradeNote = autoUpgradeNpcSkill(state, npc);
    npc.dailyRecords.unshift({
      day: state.day,
      date: settlementDate,
      xp: totalXp + boughtXp,
      baseXp,
      bonusXp,
      boughtXp,
      spirit: spirit + duelSeasonReward,
      baseSpirit,
      duelSeasonReward,
      rootXpMultiplier: xpGainMultiplier(npc),
      sectXpMultiplier: 1 + sectXpBonus(state, npc.sect),
      rootCount: rootCount(npc),
      realm: realms[npc.realm],
      breakChance: chanceParts.total,
      realmBaseBreakChance: chanceParts.realmBase,
      rootBreakMultiplier: chanceParts.rootMultiplier,
      sectBreakMultiplier: chanceParts.sectMultiplier,
      baseBreakChance: chanceParts.base,
      bonusBreakChance: chanceParts.bonus,
      note: `${breakthroughNote || (npc.realm > beforeRealm ? `突破至${realms[npc.realm]}` : "日常修炼")}${duelSeasonReward ? `；切磋赛季奖励 +${duelSeasonReward} 灵石` : ""}${skillUpgradeNote ? `；技能${skillUpgradeNote}` : ""}`
    });
    npc.dailyRecords = npc.dailyRecords.slice(0, recentRecordDays);
    npc.mood = pick(["谨慎", "好斗", "闭关", "游历"]);
  }

  state.sect.supplies = clamp(state.sect.supplies + Math.floor(Math.random() * 18) - 5, 0, 160);
  state.sect.rivalHeat = clamp(state.sect.rivalHeat + Math.floor(Math.random() * 15) - 4, 0, 100);
  for (const status of Object.values(state.sectRivals || {})) {
    status.supplies = clamp(status.supplies + Math.floor(Math.random() * 14) - 4, 0, 180);
    status.rivalHeat = clamp(status.rivalHeat + Math.floor(Math.random() * 13) - 4, 0, 100);
  }
  const beforeHp = state.player.hp;
  state.player.hp = clamp(state.player.hp + 10, 0, effectiveMaxHp(state.player, state));
  const beforeMana = state.player.mana;
  state.player.mana = clamp((state.player.mana || 0) + 8, 0, effectiveMaxMana(state.player, state));
  state.player.xp += playerDailyBaseXp;
  autoAttemptPlayerBreakthrough(state);
  runDailyDungeons(state, settlementDate);
  const playerDungeonEntries = (state.player.dungeonHistory || []).filter((record) => record.day === state.day);
  const playerSoloDungeon = playerDungeonEntries.find((record) => record.type === "solo");
  const playerDungeonSpirit = playerDungeonEntries.reduce((sum, record) => sum + (record.spirit || 0), 0);
  const playerDuelSeasonReward = duelSeasonRewards.get(state.player.id)?.reward || 0;
  const playerChanceParts = breakthroughChanceParts(state, state.player);
  state.player.dailyRecords.unshift({
    day: state.day,
    date: settlementDate,
    xp: playerDailyBaseXp,
    baseXp: playerDailyBaseXp,
    bonusXp: 0,
    passiveXp: playerDailyBaseXp,
    spirit: playerDungeonSpirit + playerDuelSeasonReward,
    duelSeasonReward: playerDuelSeasonReward,
    realm: realms[state.player.realm],
    breakChance: playerChanceParts.total,
    realmBaseBreakChance: playerChanceParts.realmBase,
    rootBreakMultiplier: playerChanceParts.rootMultiplier,
    sectBreakMultiplier: playerChanceParts.sectMultiplier,
    baseBreakChance: playerChanceParts.base,
    bonusBreakChance: playerChanceParts.bonus,
    note: `每日修行：经验 +${playerDailyBaseXp}，血量 +${state.player.hp - beforeHp}，法力 +${state.player.mana - beforeMana}；副本：${playerSoloDungeon?.name || "今日历练"} ${playerSoloDungeon?.result || ""}${playerDuelSeasonReward ? `；切磋赛季奖励 +${playerDuelSeasonReward} 灵石` : ""}`
  });
  state.player.dailyRecords = state.player.dailyRecords.slice(0, recentRecordDays);
  runDailyDuels(state);
  runProvinceSieges(state, settlementDate);
  state.lastSettlementDate = dateKey();

  if (options.auto) log(state, "子时已过，天地灵机一转，今日自动结算完成。", "gold");
  if (options.manual) log(state, "你翻过一页札记，手动推进了一天。", "gold");
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
  const completedAmount = definition.type === "measurable"
    ? Math.max(0, Number(payload.completedAmount ?? payload.amount ?? definition.targetAmount) || 0)
    : 1;
  if (completedAmount <= 0) throw new Error("完成量必须大于 0");
  const rawMultiplier = definition.type === "measurable" ? completedAmount / definition.targetAmount : 1;
  const multiplier = definition.type === "measurable" ? clamp(rawMultiplier, 0, definition.maxMultiplier) : 1;
  const baseXpGain = Math.floor(definition.xpReward * multiplier);
  const spiritGain = Math.floor(definition.spiritReward * multiplier);
  const xpGain = baseXpGain;
  p.xp += xpGain;
  p.spirit += spiritGain;

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
    multiplier,
    xp: xpGain,
    baseXp: baseXpGain,
    spirit: spiritGain,
    day: state.day,
    date: stateDateForDay(state)
  };
  state.taskCompletions.unshift(completion);
  state.taskCompletions = state.taskCompletions.slice(0, taskCompletionLimit);
  state.tasks.unshift(completion);
  state.tasks = state.tasks.slice(0, 16);
  addTaskXpToDailyRecord(state, {
    xpGain,
    baseXpGain,
    taskName: definition.name,
    taskType: definition.category,
    spiritGain
  });
  log(state, `完成「${definition.name}」，获得 ${xpGain} 经验与 ${spiritGain} 灵石。`, "gold");
  autoAttemptPlayerBreakthrough(state);
}

function addTaskXpToDailyRecord(state, { xpGain, baseXpGain, taskName, taskType, spiritGain = 0 }) {
  const player = state.player;
  const today = state.day;
  const todayDate = stateDateForDay(state);
  player.dailyRecords ??= [];
  let record = player.dailyRecords.find((item) => item.day === today);
  if (!record) {
    const chanceParts = breakthroughChanceParts(state, player);
    record = {
      day: today,
      date: todayDate,
      xp: 0,
      baseXp: 0,
      bonusXp: 0,
      spirit: 0,
      realm: realms[player.realm],
      breakChance: chanceParts.total,
      realmBaseBreakChance: chanceParts.realmBase,
      rootBreakMultiplier: chanceParts.rootMultiplier,
      sectBreakMultiplier: chanceParts.sectMultiplier,
      baseBreakChance: chanceParts.base,
      bonusBreakChance: chanceParts.bonus,
      note: "现实任务"
    };
    player.dailyRecords.unshift(record);
  }

  const bonusXp = Math.max(0, xpGain - baseXpGain);
  record.xp = (Number(record.xp) || 0) + xpGain;
  record.baseXp = (Number(record.baseXp) || 0) + baseXpGain;
  record.bonusXp = (Number(record.bonusXp) || 0) + bonusXp;
  record.spirit = (Number(record.spirit) || 0) + spiritGain;
  record.taskXp = (Number(record.taskXp) || 0) + xpGain;
  record.taskBaseXp = (Number(record.taskBaseXp) || 0) + baseXpGain;
  record.taskBonusXp = (Number(record.taskBonusXp) || 0) + bonusXp;
  record.taskSpirit = (Number(record.taskSpirit) || 0) + spiritGain;
  record.taskCount = (Number(record.taskCount) || 0) + 1;
  record.taskNames = [taskName, ...(record.taskNames || [])].slice(0, 5);
  record.taskTypes = Array.from(new Set([taskType, ...(record.taskTypes || [])])).slice(0, 5);
  record.date ||= todayDate;
  record.realm = realms[player.realm];
  player.dailyRecords = player.dailyRecords
    .sort((a, b) => (b.day || 0) - (a.day || 0))
    .slice(0, recentRecordDays);
}

export function createTaskDefinition(state, payload = {}) {
  ensureTaskSystem(state);
  const definition = normalizeTaskDefinition({ ...payload, id: makeId("task") });
  state.taskDefinitions.unshift(definition);
  state.taskDefinitions = state.taskDefinitions.slice(0, taskDefinitionLimit);
  log(state, `后台新增现实任务「${definition.name}」。`, "gold");
  return definition;
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
  if (Buffer.byteLength(text, "utf8") > 240_000) {
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
  const portraitUrl = normalizePortraitUrl(payload.portraitUrl);
  if (portraitUrl !== undefined) {
    entity.portraitUrl = portraitUrl;
    if (id === "player") entity.portraitVariant = 0;
  }
  if (id === "player") state.player.sect = state.sect.name;
  rememberCultivatorProfile(state, entity);
  rememberSectProfiles(state);
  log(state, `后台已更新${entity.name}的资料。`, "gold");
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

function autoAttemptPlayerBreakthrough(state) {
  const p = state.player;
  const need = xpNeed(p.realm);
  if (p.realm >= realms.length - 1) {
    return false;
  }
  if (p.xp < need) {
    return false;
  }
  if (p.lastBreakthroughDay === state.day) {
    return false;
  }

  const chance = breakthroughChanceFor(state, p);
  p.lastBreakthroughDay = state.day;
  if (Math.random() < chance) {
    const fromRealm = p.realm;
    p.realm += 1;
    const growth = applyBreakthroughGrowth(p, fromRealm);
    p.hp = effectiveMaxHp(p, state);
    p.mana = effectiveMaxMana(p, state);
    p.reputation += 6 + p.realm;
    p.breakthroughs.unshift({ day: state.day, date: stateDateForDay(state), from: realms[p.realm - 1], to: realms[p.realm], success: true, chance, growth });
    p.breakthroughs = p.breakthroughs.slice(0, recentRecordDays);
    log(state, `经验圆满，灵气自发贯通周天，你自动突破至「${realms[p.realm]}」。`, "gold");
  } else {
    p.hp = clamp(p.hp - 26, 1, effectiveMaxHp(p, state));
    p.mana = clamp((p.mana || 0) - 18, 0, effectiveMaxMana(p, state));
    p.breakthroughs.unshift({ day: state.day, date: stateDateForDay(state), from: realms[p.realm], to: realms[p.realm + 1] || "未知境界", success: false, chance });
    p.breakthroughs = p.breakthroughs.slice(0, recentRecordDays);
    log(state, "经验圆满后自动冲击境界失败，灵力逆冲经脉。今日不可再次突破。", "bad");
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
    root: entity.root,
    roots: profile.roots,
    primaryRootKey: profile.primaryRootKey,
    rootProfile: profile,
    skillId: entity.skillId,
    skillRank: skillRankOf(entity, entity.skillId),
    effectiveSkill: effectiveSkillForEntity(entity)
  };
}

function buildReplay(left, right, battle, result, foughtAt, state) {
  const leftBefore = { ...left };
  const rightBefore = { ...right };

  return {
    kind: "duel",
    result,
    winner: battle.winner,
    foughtAt,
    left: {
      ...entityRef(leftBefore, leftBefore.id === "player" ? "player" : "npc"),
      power: powerOf(leftBefore, state),
      stats: battle.leftStart,
      baseStats: effectiveStats(leftBefore, state),
      rootCounterPenalty: battle.leftStart.rootCounterPenalty || 0,
      startHp: battle.leftStart.hp,
      startMana: battle.leftStart.mana,
      endHp: battle.leftHp,
      endMana: battle.leftMana
    },
    right: {
      ...entityRef(rightBefore, rightBefore.id === "player" ? "player" : "npc"),
      power: powerOf(rightBefore, state),
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

function runDuelMatch(state, left, right, options = {}) {
  const foughtAt = timestampKey();
  const leftBefore = { ...left };
  const rightBefore = { ...right };
  const duelLeft = { ...left, hp: effectiveMaxHp(left, state), mana: effectiveMaxMana(left, state) };
  const duelRight = { ...right, hp: effectiveMaxHp(right, state), mana: effectiveMaxMana(right, state) };
  const battle = runTurnBattle(duelLeft, duelRight, { state });
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
  applyDuelScore(winner, true, state.day);
  applyDuelScore(loser, false, state.day);
  left.hp = effectiveMaxHp(left, state);
  left.mana = effectiveMaxMana(left, state);
  right.hp = effectiveMaxHp(right, state);
  right.mana = effectiveMaxMana(right, state);

  const replay = buildReplay(leftBefore, rightBefore, battle, result, foughtAt, state);
  const replayId = `duel-${state.day}-${left.id}-${right.id}-${foughtAt}`;
  replay.replayId = replayId;
  const transfer = tryTransferEquipment(state, winner, loser, "每日切磋");
  if (transfer) replay.equipmentTransfer = transfer;

  left.duelHistory.unshift({ foughtAt, opponent: right.name, result: leftResult, replayId, replay });
  right.duelHistory.unshift({ foughtAt, opponent: left.name, result: rightResult, replayId, replay });
  left.duelHistory = left.duelHistory.slice(0, recentRecordDays);
  right.duelHistory = right.duelHistory.slice(0, recentRecordDays);

  return { replay, winner, loser, result: leftResult };
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
  for (const entity of map.values()) {
    entity.duelHistory = [];
    normalizeDuelSeason(entity, state.day);
  }

  for (const record of records) {
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

      left.duelHistory.unshift({ foughtAt, opponent: right.name, result: leftWon ? "胜" : "负", ...replayInfo });
      right.duelHistory.unshift({ foughtAt, opponent: left.name, result: leftWon ? "负" : "胜", ...replayInfo });
    }
  }

  for (const entity of map.values()) {
    normalizeDuelSeason(entity, state.day);
    entity.duelHistory = entity.duelHistory.slice(0, recentRecordDays);
  }
}

export function duel(state, index) {
  const npc = state.npcs[Number(index)];
  if (!npc) throw new Error("未知对手");
  const { replay } = runDuelMatch(state, state.player, npc, { logPlayer: true });

  return replay;
}

export function runDailyDuels(state) {
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
  const shuffled = shuffle(roster);
  const matches = [];

  if (shuffled.length % 2 === 1) {
    const bye = shuffled.pop();
    bye.entity.duelWins += 1;
    applyDuelScore(bye.entity, true, state.day);
    matches.push({
      id: `day-${state.day}-bye-${bye.entity.id}`,
      type: "bye",
      winner: entityRef(bye.entity, bye.kind),
      summary: `${bye.entity.name}本轮轮空，直接记为胜。`
    });
  }

  for (let index = 0; index < shuffled.length; index += 2) {
    const left = shuffled[index];
    const right = shuffled[index + 1];
    const { replay, winner, loser } = runDuelMatch(state, left.entity, right.entity);
    matches.push({
      id: `day-${state.day}-match-${index / 2 + 1}`,
      type: "battle",
      left: entityRef(left.entity, left.kind),
      right: entityRef(right.entity, right.kind),
      winner: entityRef(winner, winner.id === "player" ? "player" : "npc"),
      loser: entityRef(loser, loser.id === "player" ? "player" : "npc"),
      replay,
      summary: `${winner.name}胜过${loser.name}`
    });
  }

  const record = {
    day: state.day,
    date: stateDateForDay(state),
    createdAt: timestampKey(),
    matches
  };
  state.duelDays.unshift(record);
  state.duelDays = trimDuelDays(state.duelDays, state.day);
  syncDuelDayRecords(state);
  log(state, `${record.date} 全员切磋完成，共 ${matches.length} 组对阵。`, "gold");
  return record;
}

export function buyItem(state, kind) {
  const item = itemCatalog[kind];
  if (!item) throw new Error("未知物品");
  if (state.player.spirit < item.price) {
    log(state, "灵石不足，掌柜只是笑着摇头。", "bad");
    return;
  }
  state.player.spirit -= item.price;
  state.bag[kind] += 1;
  log(state, `购得${item.name}一份。`);
}

export function useItem(state, kind) {
  if (!itemCatalog[kind]) throw new Error("未知物品");
  if (state.bag[kind] <= 0) return;
  const p = state.player;
  state.bag[kind] -= 1;

  if (kind === "focus") {
    p.divineSense += 2;
    p.mana = clamp((p.mana || 0) + 12, 0, effectiveMaxMana(p, state));
    log(state, "服下凝神散，神识澄明，法力回涌。");
  }
  if (kind === "blood") {
    p.hp = clamp(p.hp + 45, 0, effectiveMaxHp(p, state));
    log(state, "服下养血丹，血量回升。");
  }
  if (kind === "insight") {
    p.divineSense += 1;
    log(state, "饮下悟道茶，神识更见通明。", "gold");
  }
}
