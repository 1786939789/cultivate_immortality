import { combatSkills, dungeons, itemCatalog, npcGenders, npcNames, provinceVersion, provinces, realms, realmStages, roots, rosterVersion, sectRoster, sects, taskTemplates } from "./gameData.mjs";

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

export function xpNeed(realm) {
  return Math.floor(100 * Math.pow(1.34, realm));
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
    const defenseMin = 3 + stageIndex;
    const defenseMax = defenseMin + 2;
    const attackMin = defenseMax + 4;
    return {
      maxHp: [38 + stageIndex * 12, 54 + stageIndex * 14],
      maxMana: [18 + stageIndex * 5, 28 + stageIndex * 6],
      attack: [attackMin, attackMin + 5],
      defense: [defenseMin, defenseMax],
      divineSense: [4 + stageIndex, 7 + stageIndex]
    };
  }

  const defenseMin = 1 + Math.floor(stageIndex / 2) + Math.floor(level / 6);
  const defenseMax = defenseMin + 1;
  const attackMin = defenseMax + 3 + Math.floor(stageIndex / 2);
  return {
    maxHp: [14 + stageIndex * 5 + Math.floor(level / 3) * 2, 22 + stageIndex * 6 + Math.floor(level / 3) * 2],
    maxMana: [7 + stageIndex * 3 + Math.floor(level / 4), 12 + stageIndex * 4 + Math.floor(level / 4)],
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

function isKnownRoot(root) {
  return Boolean(root?.key && roots.some((item) => item.key === root.key));
}

export function normalizeRoot(root) {
  const picked = root?.key ? roots.find((item) => item.key === root.key) || pick(roots) : pick(roots);
  const bonus = Number((picked.min + Math.random() * (picked.max - picked.min)).toFixed(3));
  return { ...picked, bonus: typeof root?.bonus === "number" ? root.bonus : bonus };
}

export function needsRootMigration(root) {
  const canonical = root?.key ? roots.find((item) => item.key === root.key) : null;
  return !canonical || typeof root?.bonus !== "number" || root.name !== canonical.name || root.effect !== canonical.effect;
}

export function effectiveAttack(entity) {
  const bonus = entity.root?.effect === "attack" ? rootBonus(entity.root) : 0;
  return Math.floor((entity.attack || 0) * (1 + bonus));
}

export function effectiveDefense(entity) {
  const bonus = entity.root?.effect === "defense" ? rootBonus(entity.root) : 0;
  return Math.floor((entity.defense || 0) * (1 + bonus));
}

export function effectiveMaxHp(entity) {
  const bonus = entity.root?.effect === "hp" ? rootBonus(entity.root) : 0;
  return Math.floor((entity.maxHp || 0) * (1 + bonus));
}

export function effectiveMaxMana(entity) {
  const bonus = entity.root?.effect === "mana" ? rootBonus(entity.root) : 0;
  return Math.floor((entity.maxMana || 0) * (1 + bonus));
}

export function effectiveDivineSense(entity) {
  const bonus = entity.root?.effect === "divineSense" ? rootBonus(entity.root) : 0;
  return Math.floor((entity.divineSense || 0) * (1 + bonus));
}

export function effectiveStats(entity) {
  const attack = effectiveAttack(entity);
  const defense = effectiveDefense(entity);
  const maxHp = effectiveMaxHp(entity);
  const divineSense = effectiveDivineSense(entity);
  const maxMana = effectiveMaxMana(entity);
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
  return entity.root?.effect === "xp" ? 1 + rootBonus(entity.root) : 1;
}

export function applyXpGain(entity, amount, extraMultiplier = 1) {
  const gain = Math.floor(amount * xpGainMultiplier(entity) * extraMultiplier);
  entity.xp += gain;
  return gain;
}

function applyDamage(entity, amount) {
  const damage = Math.max(1, Math.floor(amount));
  entity.hp = clamp((entity.hp || 0) - damage, 0, effectiveMaxHp(entity));
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

function combatSnapshot(entity) {
  return {
    attack: effectiveAttack(entity),
    defense: effectiveDefense(entity),
    maxHp: effectiveMaxHp(entity),
    hp: Math.max(0, Math.min(entity.hp || effectiveMaxHp(entity), effectiveMaxHp(entity))),
    divineSense: effectiveDivineSense(entity),
    maxMana: effectiveMaxMana(entity),
    mana: Math.max(0, Math.min(entity.mana ?? effectiveMaxMana(entity), effectiveMaxMana(entity)))
  };
}

function runTurnBattle(left, right, options = {}) {
  const a = combatSnapshot(left);
  const b = combatSnapshot(right);
  const order = a.divineSense >= b.divineSense ? ["left", "right"] : ["right", "left"];
  const maxRounds = options.maxRounds || 18;
  let leftHp = a.hp;
  let rightHp = b.hp;
  let leftMana = a.mana;
  let rightMana = b.mana;
  const events = [];
  let currentRound = 0;
  const skills = { left: findSkill(left.skillId), right: findSkill(right.skillId) };
  const cooldowns = { left: 0, right: 0 };
  const effects = { left: [], right: [] };

  const pushEvent = (kind, text, detail = {}) => {
    events.push({ round: currentRound, kind, text, ...detail });
  };

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

    const senseGap = Math.max(0, state.target.divineSense - state.actor.divineSense);
    const baseDodge = clamp(senseGap / 260, 0, 0.28);
    const extraDodge = effectValue(targetSide, "evasion", "chance");
    if (Math.random() < clamp(baseDodge + extraDodge, 0, 0.62)) {
      pushEvent("dodge", `${state.targetName}凭神识预判避开一击`, {
        actorSide: targetSide,
        targetSide: side,
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
  const levelPenalty = (info.level - 1) * 0.018;
  const stagePenalty = info.stageIndex * 0.045;
  const bottleneckPenalty = info.level === 10 ? 0.12 + info.stageIndex * 0.012 : 0;
  return clamp(0.86 - levelPenalty - stagePenalty - bottleneckPenalty, 0.08, 0.9);
}

export function breakthroughChance(entity) {
  const base = baseBreakthroughChance(entity.realm || 0);
  const rootMultiplier = entity.root?.effect === "xp" ? entity.root.breakMultiplier || 1.1 : 1;
  return clamp(base * rootMultiplier, 0.05, 0.95);
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
    effect.value = Number((0.05 + 0.05 * tier).toFixed(3));
    effect.text = `突破概率 +${Math.round(effect.value * 100)}%`;
  } else {
    effect.type = "spirit";
    effect.label = "灵石";
    effect.value = 10 + Math.round(10 * tier);
    effect.text = `每日成员灵石 +${effect.value}`;
  }
  return effect;
}

function createProvinceState() {
  return provinces.map((province, index) => ({
    id: province.id,
    owner: index < sects.length * 2 ? sects[index % sects.length] : null,
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

function membersForSect(state, sectName) {
  return allCultivators(state)
    .filter((item) => (item.entity.id === "player" ? state.sect.name : item.entity.sect) === sectName)
    .sort((a, b) => powerOf(b.entity, state) - powerOf(a.entity, state));
}

function membersForSectAscending(state, sectName) {
  return [...membersForSect(state, sectName)].sort((a, b) => powerOf(a.entity, state) - powerOf(b.entity, state));
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
  state.provinces ??= createProvinceState();
  let changed = false;
  for (const sectName of sects) {
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
  state.provinces ??= createProvinceState();
  let changed = false;
  const setDefenders = (territory, defenders) => {
    const previous = territory.defenders || [];
    if (previous.length !== defenders.length || previous.some((id, index) => id !== defenders[index])) {
      territory.defenders = defenders;
      changed = true;
    }
  };
  for (const territory of state.provinces) setDefenders(territory, []);
  for (const sectName of sects) {
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
    state.provinces = createProvinceState().map((item) => ({
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
  return clamp(breakthroughChance(entity) + sectBreakthroughBonus(state, sectName), 0.05, 0.95);
}

function breakthroughChanceParts(state, entity) {
  const base = breakthroughChance(entity);
  const sectName = entity.id === "player" ? state.sect.name : entity.sect;
  const bonus = sectBreakthroughBonus(state, sectName);
  return { base, bonus, total: clamp(base + bonus, 0.05, 0.95) };
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
    state.provinceIncomeLog = state.provinceIncomeLog.slice(0, 12);
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
      hp: carry.attackerHp ?? effectiveMaxHp(attacker.entity),
      mana: carry.attackerMana ?? effectiveMaxMana(attacker.entity)
    };
    const defenderWithBuff = withSiegeDefenseBuff(defender.entity);
    const right = {
      ...defenderWithBuff,
      hp: carry.defenderHp ?? effectiveMaxHp(defenderWithBuff),
      mana: carry.defenderMana ?? effectiveMaxMana(defenderWithBuff)
    };
    const battle = runTurnBattle(left, right, { maxRounds: 16 });
    const attackerWon = battle.winner === "left";
    battles.push({
      order: battles.length + 1,
      attacker: siegeEntityRef(attacker),
      defender: siegeEntityRef(defender),
      winnerSide: attackerWon ? "attacker" : "defender",
      winnerName: attackerWon ? attacker.entity.name : defender.entity.name,
      summary: `${attacker.entity.name} ${attackerWon ? "击败" : "败于"} ${defender.entity.name}`,
      replay: buildReplay(left, right, battle, attackerWon ? "胜" : "负", timestampKey())
    });
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
    attackerSurvivor: attackers[attackerIndex]?.entity.name || "",
    defenderSurvivor: defenders[defenderIndex]?.entity.name || ""
  };
}

function runProvinceSieges(state, settlementDate) {
  state.provinceWars ??= [];
  const targeted = new Set();
  const wars = [];
  for (const attackerSect of shuffle(sects)) {
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
    state.provinceWars = state.provinceWars.slice(0, 40);
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
  return sects[index % sects.length];
}

function shuffle(list) {
  const result = [...list];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function makeNpc(name, index) {
  const root = normalizeRoot(pick(roots));
  const realm = 0;
  const stats = rollBirthStats(realm);
  const body = 7 + Math.floor(Math.random() * 7);
  const wisdom = 7 + Math.floor(Math.random() * 8);

  return {
    id: `npc-${index}`,
    name,
    gender: npcGenders[name] || "male",
    sect: sectForNpcIndex(index),
    root,
    realm,
    xp: 0,
    hp: effectiveMaxHp({ root, maxHp: stats.maxHp }),
    maxHp: stats.maxHp,
    mana: effectiveMaxMana({ root, maxMana: stats.maxMana }),
    maxMana: stats.maxMana,
    skillId: randomSkillId(),
    spirit: 0,
    reputation: 0,
    body,
    wisdom,
    attack: stats.attack,
    defense: stats.defense,
    divineSense: stats.divineSense,
    chance: 4 + Math.floor(Math.random() * 8),
    wealth: 0,
    heartDemon: Math.floor(Math.random() * 8),
    mood: pick(["谨慎", "好斗", "闭关", "游历"]),
    duelWins: 0,
    duelLosses: 0,
    dungeonClears: 0,
    bestDungeonPower: 0,
    bestDungeonName: "未入秘境",
    dailyRecords: [],
    breakthroughs: [],
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

export function createDefaultState() {
  const root = normalizeRoot(pick(roots));
  const stats = rollBirthStats();

  return {
    day: 1,
    player: {
      id: "player",
      name: "无名散修",
      gender: "male",
      root,
      realm: 0,
      xp: 0,
      hp: effectiveMaxHp({ root, maxHp: stats.maxHp }),
      maxHp: stats.maxHp,
      mana: effectiveMaxMana({ root, maxMana: stats.maxMana }),
      maxMana: stats.maxMana,
      skillId: randomSkillId(),
      spirit: 80,
      reputation: 0,
      body: 8,
      wisdom: 8,
      attack: stats.attack,
      defense: stats.defense,
      divineSense: stats.divineSense,
      chance: 5,
      wealth: 0,
      heartDemon: 0,
      duelWins: 0,
      duelLosses: 0,
      dungeonClears: 0,
      bestDungeonPower: 0,
      bestDungeonName: "未入秘境",
      dailyRecords: [],
      breakthroughs: [],
      duelHistory: []
    },
    bag: { focus: 1, blood: 1, insight: 0 },
    rosterVersion,
    tasks: [],
    npcs: npcNames.map((name, index) => makeNpc(name, index)),
    sect: {
      name: "黄枫谷",
      reputation: 20,
      supplies: 80,
      rivalHeat: 18,
      warWins: 0,
      warLosses: 0
    },
    sectRivals: Object.fromEntries(sects.map((name, index) => [name, makeSectStatus(name, index)])),
    provinceVersion,
    provinces: createNeutralProvinceState(),
    provinceWars: [],
    provinceIncomeLog: [],
    duelDays: [],
    calendarStartDate: dateKey(),
    lastSettlementDate: dateKey(),
    log: [{ text: "你在山脚租下一间小屋，翻开第一卷长生札记。", type: "", day: 1, date: dateKey(), time: "初入" }]
  };
}

export function clearProgressHistory(state) {
  const resetPerson = (person) => {
    person.duelWins = 0;
    person.duelLosses = 0;
    person.duelHistory = [];
    person.dungeonClears = 0;
    person.bestDungeonPower = 0;
    person.bestDungeonName = "未入秘境";
    person.dailyRecords = [];
    person.breakthroughs = [];
  };

  resetPerson(state.player);
  for (const npc of state.npcs || []) resetPerson(npc);
  state.duelDays = [];
  state.provinces = createNeutralProvinceState();
  state.provinceVersion = provinceVersion;
  state.provinceWars = [];
  state.provinceIncomeLog = [];
  state.tasks = [];
  state.player.sect = state.sect?.name || "黄枫谷";
  state.sect.warWins = 0;
  state.sect.warLosses = 0;
  return state;
}

function migrateRoster(state) {
  state.rosterVersion = rosterVersion;
  state.sect = {
    name: "黄枫谷",
    reputation: state.sect?.reputation ?? 20,
    supplies: state.sect?.supplies ?? 80,
    rivalHeat: state.sect?.rivalHeat ?? 18,
    warWins: 0,
    warLosses: 0
  };
  state.player.sect = state.sect.name;
  state.npcs = npcNames.map((name, index) => makeNpc(name, index));
  state.sectRivals = Object.fromEntries(sects.map((name, index) => [name, makeSectStatus(name, index)]));
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
  state.player.id ??= "player";
  changed = ensureField(state.player, "gender", "male") || changed;
  state.player.sect ??= state.sect?.name || "黄枫谷";
  state.player.duelWins ??= 0;
  state.player.duelLosses ??= 0;
  state.player.dungeonClears ??= 0;
  state.player.bestDungeonPower ??= 0;
  state.player.bestDungeonName ??= "未入秘境";
  state.player.dailyRecords ??= [];
  state.player.breakthroughs ??= [];
  state.player.duelHistory ??= [];
  for (const record of state.player.dailyRecords) changed = ensureDatedRecord(record) || changed;
  for (const record of state.player.breakthroughs) changed = ensureDatedRecord(record) || changed;
  if (needsSkillMigration(state.player.skillId)) {
    state.player.skillId = randomSkillId();
    changed = true;
  }
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
  changed = ensureField(state.player, "mana", () => effectiveMaxMana(state.player)) || changed;
  changed = ensureField(state.player, "hp", () => effectiveMaxHp(state.player)) || changed;
  state.player.hp = Math.min(state.player.hp, effectiveMaxHp(state.player));
  state.player.mana = Math.min(state.player.mana, effectiveMaxMana(state.player));
  state.sect.warWins ??= 0;
  state.sect.warLosses ??= 0;
  state.duelDays ??= [];
  state.sectRivals ??= {};
  for (const [index, name] of sects.entries()) {
    if (!state.sectRivals[name]) {
      state.sectRivals[name] = makeSectStatus(name, index);
      changed = true;
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
    changed = ensureField(full, "duelHistory", []) || changed;
    for (const record of full.dailyRecords) changed = ensureDatedRecord(record) || changed;
    for (const record of full.breakthroughs) changed = ensureDatedRecord(record) || changed;
    changed = ensureField(full, "duelWins", () => Math.floor(Math.random() * 6)) || changed;
    changed = ensureField(full, "duelLosses", () => Math.floor(Math.random() * 4)) || changed;
    changed = ensureField(full, "dungeonClears", () => Math.floor(Math.random() * 5)) || changed;
    changed = ensureField(full, "bestDungeonPower", () => Math.floor(Math.random() * 90)) || changed;
    changed = ensureField(full, "bestDungeonName", () => full.bestDungeonPower > 65 ? "沉星矿脉" : full.bestDungeonPower > 0 ? "雾隐药谷" : "未入秘境") || changed;
    full.hp = Math.min(full.hp, effectiveMaxHp(full));
    full.mana = Math.min(full.mana, effectiveMaxMana(full));
    return full;
  });
  if (state.duelDays.length) {
    syncDuelDayRecords(state);
    changed = true;
  }
  changed = ensureProvinceState(state) || changed;
  return changed;
}

export function powerOf(entity, state) {
  return Math.floor(
    effectiveAttack(entity) * 2.8 +
    effectiveDefense(entity) * 2 +
    effectiveMaxHp(entity) * 0.42 +
    effectiveDivineSense(entity) * 1.35 +
    effectiveMaxMana(entity) * 0.55
  );
}

export function getPublicState(state) {
  ensureStateShape(state);
  const nextRealm = realms[Math.min(state.player.realm + 1, realms.length - 1)];
  const currentRealmInfo = realmInfo(state.player.realm);
  const breakChance = breakthroughChanceFor(state, state.player);

  return {
    ...state,
    catalog: { realms, realmStages, roots, dungeons, taskTemplates, itemCatalog, sects, combatSkills, provinces },
    derived: {
      xpNeed: xpNeed(state.player.realm),
      currentRealmInfo,
      realmProgression: buildRealmProgression(state.player),
      playerPower: powerOf(state.player, state),
      effectiveStats: effectiveStats(state.player),
      nextRealm,
      breakChance,
      baseBreakChance: currentRealmInfo.baseBreakChance,
      npcPowers: Object.fromEntries(state.npcs.map((npc) => [npc.id, powerOf(npc)])),
      sects: buildSectSummaries(state)
    }
  };
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
    ...state.npcs.map((npc) => ({ ...npc, power: powerOf(npc), isPlayer: false }))
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
      realm: member.realm,
      mood: member.mood,
      skillId: member.skillId,
      power: member.power,
      isPlayer: member.isPlayer
    });
    current.totalPower += member.power;
    groups.set(member.sect, current);
  }

  return [...groups.values()]
    .map((sect) => ({
      ...sect,
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
      totalPower: Math.round(sect.totalPower),
      leader: [...sect.members].sort((a, b) => b.power - a.power)[0]?.name || "无"
    }))
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

  for (const npc of state.npcs) {
    const beforeRealm = npc.realm;
    const baseXp = 100;
    const xpMultiplier = xpGainMultiplier(npc) * (1 + sectXpBonus(state, npc.sect));
    const totalXp = Math.floor(baseXp * xpMultiplier);
    const bonusXp = Math.max(0, totalXp - baseXp);
    npc.xp += totalXp;

    const spirit = sectSpiritIncome(state, npc.sect);
    npc.spirit += spirit;

    let boughtXp = 0;
    const needBeforeBreak = xpNeed(npc.realm);
    const missingXp = Math.max(0, needBeforeBreak - npc.xp);
    if (missingXp > 0 && missingXp <= npc.spirit && npc.realm < realms.length - 1) {
      npc.spirit -= missingXp;
      npc.xp += missingXp;
      boughtXp = missingXp;
    }

    const chanceParts = breakthroughChanceParts(state, npc);
    let breakthroughNote = "日常修炼";
    if (npc.xp >= xpNeed(npc.realm) && npc.realm < realms.length - 1) {
      const fromRealm = npc.realm;
      const targetRealm = npc.realm + 1;
      npc.xp -= xpNeed(npc.realm);
      const success = Math.random() < chanceParts.total;
      let growth = null;
      if (success) {
        npc.realm = targetRealm;
        growth = applyBreakthroughGrowth(npc, fromRealm);
        npc.hp = effectiveMaxHp(npc);
        npc.mana = effectiveMaxMana(npc);
        npc.reputation += 4 + npc.realm;
        breakthroughNote = `突破至${realms[npc.realm]}`;
      } else {
        npc.hp = clamp(npc.hp - 18, 1, effectiveMaxHp(npc));
        npc.mana = clamp((npc.mana || 0) - 12, 0, effectiveMaxMana(npc));
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
      npc.breakthroughs = npc.breakthroughs.slice(0, 12);
    }

    npc.dailyRecords.unshift({
      day: state.day,
      date: settlementDate,
      xp: totalXp + boughtXp,
      baseXp,
      bonusXp,
      boughtXp,
      spirit,
      realm: realms[npc.realm],
      breakChance: chanceParts.total,
      baseBreakChance: chanceParts.base,
      bonusBreakChance: chanceParts.bonus,
      note: breakthroughNote || (npc.realm > beforeRealm ? `突破至${realms[npc.realm]}` : "日常修炼")
    });
    npc.dailyRecords = npc.dailyRecords.slice(0, 14);
    npc.mood = pick(["谨慎", "好斗", "闭关", "游历"]);
  }

  state.sect.supplies = clamp(state.sect.supplies + Math.floor(Math.random() * 18) - 5, 0, 160);
  state.sect.rivalHeat = clamp(state.sect.rivalHeat + Math.floor(Math.random() * 15) - 4, 0, 100);
  for (const status of Object.values(state.sectRivals || {})) {
    status.supplies = clamp(status.supplies + Math.floor(Math.random() * 14) - 4, 0, 180);
    status.rivalHeat = clamp(status.rivalHeat + Math.floor(Math.random() * 13) - 4, 0, 100);
  }
  const beforeHp = state.player.hp;
  state.player.hp = clamp(state.player.hp + 10, 0, effectiveMaxHp(state.player));
  const beforeMana = state.player.mana;
  state.player.mana = clamp((state.player.mana || 0) + 8, 0, effectiveMaxMana(state.player));
  state.player.dailyRecords.unshift({
    day: state.day,
    date: settlementDate,
    xp: 0,
    spirit: 0,
    realm: realms[state.player.realm],
    note: `自然恢复：血量 +${state.player.hp - beforeHp}，法力 +${state.player.mana - beforeMana}`
  });
  state.player.dailyRecords = state.player.dailyRecords.slice(0, 14);
  runDailyDuels(state);
  runProvinceSieges(state, settlementDate);
  state.lastSettlementDate = dateKey();

  if (options.auto) log(state, "子时已过，天地灵机一转，今日自动结算完成。", "gold");
  if (options.manual) log(state, "你翻过一页札记，手动推进了一天。", "gold");
  log(state, pick(events), "gold");
}

export function addTask(state, payload) {
  const type = payload.type || "study";
  const diff = clamp(Number(payload.diff || 3), 1, 5);
  const template = taskTemplates[type];
  if (!template) throw new Error("未知任务类型");

  const name = String(payload.name || template.label).trim().slice(0, 40);
  const p = state.player;
  const baseXpGain = Math.floor(template.xp * diff);
  const xpGain = applyXpGain(p, baseXpGain, 1 + sectXpBonus(state, state.sect.name));

  p.hp = clamp(p.hp + template.hp * diff, 0, effectiveMaxHp(p));
  p.mana = clamp((p.mana || 0) + template.mana * diff, 0, effectiveMaxMana(p));
  p.spirit += template.spirit * diff;

  if (type === "body") {
    p.attack += Math.ceil(diff / 2);
  }
  if (type === "study") p.defense += Math.ceil(diff / 2);
  if (type === "craft") p.divineSense += Math.ceil(diff / 2);
  if (type === "discipline") p.maxMana += diff;

  state.tasks.unshift({ name, type: template.label, diff, xp: xpGain, day: state.day, date: stateDateForDay(state) });
  state.tasks = state.tasks.slice(0, 16);
  log(state, `完成「${name}」，获得 ${xpGain} 经验。${template.label}让你的道基更扎实。`, "gold");
}

export function attemptBreakthrough(state) {
  const p = state.player;
  const need = xpNeed(p.realm);
  if (p.realm >= realms.length - 1) {
    log(state, "前路被天地法则遮蔽，此版本暂未开放更高境界。");
    return;
  }
  if (p.xp < need) {
    log(state, `经验尚浅，还差 ${need - p.xp} 点经验才能冲击下一层。`, "bad");
    return;
  }

  const chance = breakthroughChanceFor(state, p);
  p.xp -= need;
  if (Math.random() < chance) {
    const fromRealm = p.realm;
    p.realm += 1;
    const growth = applyBreakthroughGrowth(p, fromRealm);
    p.hp = effectiveMaxHp(p);
    p.mana = effectiveMaxMana(p);
    p.reputation += 6 + p.realm;
    p.breakthroughs.unshift({ day: state.day, date: stateDateForDay(state), from: realms[p.realm - 1], to: realms[p.realm], success: true, chance, growth });
    p.breakthroughs = p.breakthroughs.slice(0, 12);
    log(state, `灵气贯通周天，你成功突破至「${realms[p.realm]}」。`, "gold");
  } else {
    p.hp = clamp(p.hp - 26, 1, effectiveMaxHp(p));
    p.mana = clamp((p.mana || 0) - 18, 0, effectiveMaxMana(p));
    p.breakthroughs.unshift({ day: state.day, date: stateDateForDay(state), from: realms[p.realm], to: realms[p.realm + 1] || "未知境界", success: false, chance });
    p.breakthroughs = p.breakthroughs.slice(0, 12);
    log(state, "突破失败，灵力逆冲经脉。气息紊乱，需要调息或完成自律任务。", "bad");
  }
}

export function rest(state) {
  const p = state.player;
  p.hp = clamp(p.hp + 24 + p.body, 0, effectiveMaxHp(p));
  p.mana = clamp((p.mana || 0) + 20 + Math.ceil(effectiveDivineSense(p) / 4), 0, effectiveMaxMana(p));
  log(state, "你闭门调息一夜，血量与法力渐复。");
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
  guardian.hp = effectiveMaxHp(guardian);
  guardian.mana = effectiveMaxMana(guardian);

  const beforeHp = p.hp;
  const battle = runTurnBattle(p, guardian, { maxRounds: 14 });
  p.hp = battle.leftHp;
  p.mana = battle.leftMana;

  if (battle.winner === "left") {
    const xp = applyXpGain(p, Math.floor(dungeon.power * 0.48 + Math.random() * 35), 1 + sectXpBonus(state, state.sect.name));
    const spirit = Math.floor(24 + Math.random() * 30);
    p.spirit += spirit;
    p.dungeonClears += 1;
    if (dungeon.power > p.bestDungeonPower) {
      p.bestDungeonPower = dungeon.power;
      p.bestDungeonName = dungeon.name;
    }
    log(state, `你通关${dungeon.name}，回合战损失 ${beforeHp - p.hp} 血量，获得 ${xp} 经验与 ${spirit} 灵石。`, "gold");
  } else {
    p.hp = Math.max(1, p.hp);
    applyXpGain(p, Math.floor(dungeon.power * 0.12), 1 + sectXpBonus(state, state.sect.name));
    log(state, `${dungeon.name}险象环生，你血量见底后撤出，只带回少量感悟。`, "bad");
  }
}

export function sectMission(state) {
  const p = state.player;
  const xp = applyXpGain(p, 32 + p.realm * 7, 1 + sectXpBonus(state, state.sect.name));
  const rep = 5 + Math.floor(Math.random() * 6);
  p.reputation += rep;
  p.spirit += 16;
  state.sect.reputation += rep;
  state.sect.supplies += 10;
  p.hp = clamp(p.hp - 6, 1, effectiveMaxHp(p));
  log(state, `完成${state.sect.name}任务，获得 ${xp} 经验、${rep} 声望与 16 灵石。`, "gold");
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
  enemy.hp = effectiveMaxHp(enemy);
  enemy.mana = effectiveMaxMana(enemy);
  const battle = runTurnBattle(p, enemy, { maxRounds: 16 });
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
  return {
    kind,
    id: entity.id,
    name: entity.name,
    realm: entity.realm,
    sect: kind === "player" ? entity.sect || "黄枫谷" : entity.sect,
    root: entity.root,
    skillId: entity.skillId
  };
}

function buildReplay(left, right, battle, result, foughtAt) {
  const leftBefore = { ...left };
  const rightBefore = { ...right };

  return {
    kind: "duel",
    result,
    winner: battle.winner,
    foughtAt,
    left: {
      ...entityRef(leftBefore, leftBefore.id === "player" ? "player" : "npc"),
      power: powerOf(leftBefore),
      stats: effectiveStats(leftBefore),
      startHp: battle.leftStart.hp,
      startMana: battle.leftStart.mana,
      endHp: battle.leftHp,
      endMana: battle.leftMana
    },
    right: {
      ...entityRef(rightBefore, rightBefore.id === "player" ? "player" : "npc"),
      power: powerOf(rightBefore),
      stats: effectiveStats(rightBefore),
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
  const duelLeft = { ...left, hp: effectiveMaxHp(left), mana: effectiveMaxMana(left) };
  const duelRight = { ...right, hp: effectiveMaxHp(right), mana: effectiveMaxMana(right) };
  const battle = runTurnBattle(duelLeft, duelRight);
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
  left.hp = effectiveMaxHp(left);
  left.mana = effectiveMaxMana(left);
  right.hp = effectiveMaxHp(right);
  right.mana = effectiveMaxMana(right);

  const replay = buildReplay(leftBefore, rightBefore, battle, result, foughtAt);

  left.duelHistory.unshift({ foughtAt, opponent: right.name, result: leftResult, replay });
  right.duelHistory.unshift({ foughtAt, opponent: left.name, result: rightResult, replay });
  left.duelHistory = left.duelHistory.slice(0, 20);
  right.duelHistory = right.duelHistory.slice(0, 20);

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
  for (const entity of map.values()) {
    entity.duelWins = 0;
    entity.duelLosses = 0;
    entity.duelHistory = [];
  }

  const records = [...(state.duelDays || [])].sort((a, b) => a.day - b.day);
  for (const record of records) {
    for (const match of record.matches || []) {
      if (match.type === "bye") {
        const winner = map.get(match.winner?.id);
        if (winner) winner.duelWins += 1;
        continue;
      }
      if (!match.replay) continue;
      const left = map.get(match.replay.left?.id);
      const right = map.get(match.replay.right?.id);
      if (!left || !right) continue;
      const winnerId = match.winner?.id || (match.replay.winner === "left" ? left.id : right.id);
      const loserId = match.loser?.id || (winnerId === left.id ? right.id : left.id);
      const winner = map.get(winnerId);
      const loser = map.get(loserId);
      if (winner) winner.duelWins += 1;
      if (loser) loser.duelLosses += 1;

      left.duelHistory.unshift({ foughtAt: match.replay.foughtAt || record.createdAt, opponent: right.name, result: replayResultFor(match.replay, left.id), replay: match.replay });
      right.duelHistory.unshift({ foughtAt: match.replay.foughtAt || record.createdAt, opponent: left.name, result: replayResultFor(match.replay, right.id), replay: match.replay });
    }
  }

  for (const entity of map.values()) {
    entity.duelHistory = entity.duelHistory.slice(0, 20);
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
  state.duelDays = state.duelDays.slice(0, 30);
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
    p.mana = clamp((p.mana || 0) + 12, 0, effectiveMaxMana(p));
    log(state, "服下凝神散，神识澄明，法力回涌。");
  }
  if (kind === "blood") {
    p.hp = clamp(p.hp + 45, 0, effectiveMaxHp(p));
    log(state, "服下养血丹，血量回升。");
  }
  if (kind === "insight") {
    applyXpGain(p, 55, 1 + sectXpBonus(state, state.sect.name));
    p.divineSense += 1;
    log(state, "饮下悟道茶，数处疑难豁然贯通。", "gold");
  }
}
