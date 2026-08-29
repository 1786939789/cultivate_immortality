import assert from "node:assert/strict";
import { rootCycle, roots } from "../server/gameData.mjs";
import { daoTrialLaws, daoTrialRoutes, daoTrialSeals, daoTrialSealSchoolResonances } from "../server/daoTrialData.mjs";
import { resolveLawMechanics } from "../server/daoTrialLawDesign.mjs";
import {
  advanceDaoTrial,
  combinedTrialBuffs,
  createDefaultState,
  ensureStateShape,
  getPublicState,
  runTurnBattle,
  startDaoTrial
} from "../server/gameLogic.mjs";

const statKeys = ["attack", "defense", "maxHp", "maxMana", "divineSense"];
const outOfBattleActions = new Set(["battleMomentum", "freeReroll", "residualChoice", "eventCompensation", "fortune"]);
const stackMultiplier = (stack) => [1, 1.6, 2, 2.25, 2.4][Math.max(1, Math.min(5, stack)) - 1];
const rootMap = Object.fromEntries(roots.map((root) => [root.key, root]));
const almostEqual = (actual, expected, message) => assert.ok(Math.abs(Number(actual) - Number(expected)) < 1e-9, `${message}: ${actual} !== ${expected}`);

function finiteNumber(value, message) {
  assert.ok(Number.isFinite(Number(value)), `${message} 必须是有限数值，实际 ${value}`);
}

function minimalRun(kind, item, stack, { companion = false } = {}) {
  return {
    sealIds: kind === "seal" ? [item.id] : [],
    sealStacks: kind === "seal" ? { [item.id]: stack } : {},
    lawIds: kind === "law" ? [item.id] : [],
    lawStacks: kind === "law" ? { [item.id]: stack } : {},
    combatant: { maxMana: 200, mana: 200 },
    companion: companion ? { support: { type: "none", potency: 0 } } : null,
    tempAttack: 0,
    tempDefense: 0,
    tempSense: 0,
    fortune: 0
  };
}

function baseFighter(overrides = {}) {
  return {
    id: "audit-left",
    name: "验算法身",
    realm: 0,
    attack: 100,
    defense: 80,
    maxHp: 1_000,
    hp: 1_000,
    maxMana: 200,
    mana: 200,
    divineSense: 60,
    skillId: "azure_sword",
    skillRanks: { azure_sword: 1 },
    root: rootMap.metal,
    roots: [rootMap.metal],
    primaryRootKey: "metal",
    trialStatsAreEffective: true,
    ...overrides
  };
}

function baseOpponent(overrides = {}) {
  return baseFighter({
    id: "audit-right",
    name: "验算守关者",
    attack: 70,
    defense: 40,
    maxHp: 2_000,
    hp: 2_000,
    maxMana: 1,
    mana: 0,
    divineSense: 30,
    ...overrides
  });
}

function numericBuffSnapshot(buffs) {
  return Object.fromEntries(Object.entries(buffs)
    .filter(([key, value]) => !key.startsWith("__") && (typeof value === "number" || typeof value === "boolean"))
    .sort(([left], [right]) => left.localeCompare(right)));
}

function assertBattleShape(battle, context) {
  for (const key of ["leftHp", "rightHp", "leftMana", "rightMana"]) finiteNumber(battle[key], `${context} ${key}`);
  for (const side of ["leftStart", "rightStart"]) {
    for (const key of [...statKeys, "hp", "mana"]) finiteNumber(battle[side][key], `${context} ${side}.${key}`);
  }
  assert.ok(battle.leftHp >= 0 && battle.leftHp <= battle.leftStart.maxHp, `${context} 左方结束气血越界`);
  assert.ok(battle.rightHp >= 0 && battle.rightHp <= battle.rightStart.maxHp, `${context} 右方结束气血越界`);
  assert.ok(battle.leftMana >= 0 && battle.leftMana <= battle.leftStart.maxMana, `${context} 左方法力越界`);
  assert.ok(battle.rightMana >= 0 && battle.rightMana <= battle.rightStart.maxMana, `${context} 右方法力越界`);
  let hp = { left: battle.leftStart.hp, right: battle.rightStart.hp };
  let round = 0;
  for (const event of battle.events) {
    finiteNumber(event.round, `${context} 事件回合`);
    assert.ok(event.round >= round, `${context} 事件回合不得倒退`);
    round = event.round;
    for (const key of ["leftHp", "rightHp", "leftMana", "rightMana", "damage", "healing", "shields", "mana"]) {
      if (event[key] !== undefined) finiteNumber(event[key], `${context} ${event.kind}.${key}`);
    }
    const beforeHp = { ...hp };
    if (event.leftHp !== undefined) {
      assert.ok(event.leftHp >= 0 && event.leftHp <= battle.leftStart.maxHp, `${context} 事件左方气血越界`);
      hp.left = event.leftHp;
    }
    if (event.rightHp !== undefined) {
      assert.ok(event.rightHp >= 0 && event.rightHp <= battle.rightStart.maxHp, `${context} 事件右方气血越界`);
      hp.right = event.rightHp;
    }
    if (Number(event.damage) > 0 && ["left", "right"].includes(event.actorSide) && ["left", "right"].includes(event.targetSide)) {
      const targetDelta = beforeHp[event.targetSide] - hp[event.targetSide];
      assert.ok(targetDelta >= 0, `${context} 伤害事件不能让目标回血：${event.text}`);
    }
  }
}

function expectedSealBuff(seal, key, stack) {
  const multiplier = stackMultiplier(stack);
  const direct = Number(seal.effects?.[key]) || 0;
  const activeResonances = daoTrialSealSchoolResonances.filter((entry) => entry.school === seal.school && entry.threshold <= stack);
  const resonance = activeResonances.reduce((sum, entry) => sum + (Number(entry.effects?.[key]) || 0), 0);
  const soloResonance = activeResonances.reduce((sum, entry) => sum + (Number(entry.effects?.maxHpWithoutCompanion) || 0), 0);
  if (key === "maxHp") return (direct + (Number(seal.effects?.maxHpWithoutCompanion) || 0)) * multiplier + resonance + soloResonance;
  return direct * multiplier + resonance;
}

function auditAllSeals() {
  const effectKeys = new Set();
  let battles = 0;
  for (const seal of daoTrialSeals) {
    const snapshots = [];
    for (let stack = 1; stack <= 5; stack += 1) {
      const buffs = combinedTrialBuffs(minimalRun("seal", seal, stack));
      for (const [key, value] of Object.entries(seal.effects || {})) {
        effectKeys.add(key);
        finiteNumber(value, `${seal.name} ${key}`);
        almostEqual(buffs[key], expectedSealBuff(seal, key, stack), `${seal.name} ×${stack} 的 ${key} 未正确汇总`);
      }
      if (seal.effects?.maxHpWithoutCompanion) {
        almostEqual(buffs.maxHp, expectedSealBuff(seal, "maxHp", stack), `${seal.name} 独行气血未生效`);
      }
      const left = baseFighter({ trialBuffs: buffs, mana: 0 });
      const battle = runTurnBattle(left, baseOpponent(), { maxRounds: 2, random: () => 0.999 });
      assertBattleShape(battle, `${seal.name} ×${stack}`);
      for (const key of statKeys) {
        const base = Number(left[key]);
        const minimum = key === "defense" ? 0 : 1;
        const expected = Math.max(minimum, Math.floor(base * (1 + (Number(buffs[key]) || 0))));
        assert.equal(battle.leftStart[key], expected, `${seal.name} ×${stack} 的 ${key} 未进入真实战斗`);
      }
      snapshots.push(numericBuffSnapshot(buffs));
      battles += 1;
    }
    assert.notDeepEqual(snapshots[0], snapshots[4], `${seal.name} 重复五次后没有任何数值成长`);
  }
  return { items: daoTrialSeals.length, battles, effectKeys: [...effectKeys].sort() };
}

function auditAllLaws() {
  const effectKeys = new Set();
  const mechanicActions = new Set();
  let battles = 0;
  for (const law of daoTrialLaws) {
    const snapshots = [];
    for (let stack = 1; stack <= 5; stack += 1) {
      const buffs = combinedTrialBuffs(minimalRun("law", law, stack));
      for (const [key, value] of Object.entries(law.effects || {})) {
        effectKeys.add(key);
        if (typeof value !== "boolean") finiteNumber(value, `${law.name} ${key}`);
      }
      const mechanics = resolveLawMechanics(law, stack);
      for (const mechanic of mechanics) {
        mechanicActions.add(mechanic.action);
        assert.equal(mechanic.stack, stack, `${law.name} 机制层数错误`);
        for (const value of Object.values(mechanic.params || {})) finiteNumber(value, `${law.name} ${mechanic.action} 参数`);
      }
      const left = baseFighter({ trialBuffs: buffs, mana: 0 });
      const battle = runTurnBattle(left, baseOpponent(), { maxRounds: 2, random: () => 0.999 });
      assertBattleShape(battle, `${law.name} ×${stack}`);
      for (const key of statKeys) {
        const base = Number(left[key]);
        const minimum = key === "defense" ? 0 : 1;
        const expected = Math.max(minimum, Math.floor(base * (1 + (Number(buffs[key]) || 0))));
        assert.equal(battle.leftStart[key], expected, `${law.name} ×${stack} 的 ${key} 未进入真实战斗`);
      }
      snapshots.push({ buffs: numericBuffSnapshot(buffs), mechanics });
      battles += 1;
    }
    assert.notDeepEqual(snapshots[0], snapshots[4], `${law.name} 重复五次后没有任何效果成长`);
  }
  return { items: daoTrialLaws.length, battles, effectKeys: [...effectKeys].sort(), mechanicActions: [...mechanicActions].sort() };
}

function mechanicBattle(law) {
  const mechanic = resolveLawMechanics(law, 5)[0];
  const action = mechanic.action;
  const run = minimalRun("law", law, 5, { companion: action.startsWith("companion") });
  const buffs = combinedTrialBuffs(run);
  const left = baseFighter({
    attack: 70,
    defense: 80,
    maxHp: 5_000,
    hp: 3_000,
    maxMana: 2_000,
    mana: 2_000,
    divineSense: 100,
    skillId: "fire_crow",
    skillRanks: { fire_crow: 1 },
    trialBuffs: buffs
  });
  const right = baseOpponent({ attack: 55, defense: 20, maxHp: 50_000, hp: 50_000, divineSense: 20 });
  const options = { maxRounds: 18, random: () => 0.999 };

  if (["attackEcho", "cooldownFlow", "soloEcho", "executeStrike", "damageStore"].includes(action)) left.mana = 0;
  if (action === "executeStrike") right.hp = 5_000;
  if (["lethalWard", "companionLethalWard"].includes(action)) {
    left.hp = 80;
    left.defense = 0;
    left.attack = 2;
    left.mana = 0;
    left.divineSense = 5;
    right.attack = 800;
    right.divineSense = 200;
  }
  if (["damageStore", "damageReflect", "noHitCounter", "adversityGrowth"].includes(action)) {
    left.divineSense = 10;
    right.attack = 220;
    right.divineSense = 200;
  }
  if (["lifesteal", "roundRegen"].includes(action)) left.hp = 1_500;
  if (action === "healStrike") {
    left.hp = 1_500;
    left.skillId = "wood_recovery";
    left.skillRanks = { wood_recovery: 1 };
  }
  if (action === "lowHpEcho") left.hp = Math.floor(left.maxHp * 0.2);
  if (action === "bloodCast") left.mana = 0;
  if (action === "statusDetonate") {
    left.skillId = "fire_crow";
    left.skillRanks = { fire_crow: 1 };
  }
  if (action === "rootReversal") {
    left.root = rootMap.wood;
    left.roots = [rootMap.wood];
    left.primaryRootKey = "wood";
    right.root = rootMap.metal;
    right.roots = [rootMap.metal];
    right.primaryRootKey = "metal";
  }
  if (action.startsWith("companion")) options.trialCompanion = { name: "验算道友", type: "assault", interval: 2, damage: 5 };

  return { mechanic, battle: runTurnBattle(left, right, options) };
}

function preparedStateWithLaw(law) {
  const state = createDefaultState();
  state.day = 8;
  ensureStateShape(state);
  state.daoTrial.tickets = 2;
  startDaoTrial(state, { routeId: "golden-pass" });
  const run = state.daoTrial.activeRun;
  run.lawOffer = [];
  run.lawIds = [law.id];
  run.lawStacks = { [law.id]: 5 };
  return { state, run };
}

function triggerOutOfBattleMechanic(law, action) {
  const { state, run } = preparedStateWithLaw(law);
  if (action === "freeReroll") {
    run.insight = 0;
    run.lawOffer = ["edge-pressure", "deep-channel", "stone-skin-law"];
    advanceDaoTrial(state, { action: "reroll-law" });
  } else if (action === "residualChoice") {
    run.lawOffer = ["edge-pressure", "deep-channel", "stone-skin-law"];
    advanceDaoTrial(state, { action: "law", lawId: "edge-pressure" });
  } else if (action === "eventCompensation") {
    run.nodes[0] = { id: "audit-event", name: "穷举事件", type: "event", event: "static-fork", floor: 1 };
    advanceDaoTrial(state, { optionId: "touch" });
  } else {
    for (const key of ["maxHp", "hp", "attack", "defense", "divineSense", "maxMana", "mana"]) {
      run.combatant[key] = Math.max(1, Math.floor(Number(run.combatant[key]) * 200));
    }
    advanceDaoTrial(state, { action: "battle" });
  }
  assert.equal(run.lastLawEvent?.lawId, law.id, `${law.name} 的 ${action} 没有在实际流程触发`);
}

function auditEveryAdvancedMechanic() {
  let battleMechanics = 0;
  let externalMechanics = 0;
  for (const law of daoTrialLaws.filter((entry) => entry.mechanics?.length)) {
    const actions = [...new Set(resolveLawMechanics(law, 5).map((entry) => entry.action))];
    for (const action of actions) {
      if (outOfBattleActions.has(action)) {
        triggerOutOfBattleMechanic(law, action);
        externalMechanics += 1;
      } else {
        const { battle } = mechanicBattle(law);
        assertBattleShape(battle, `${law.name} ${action}`);
        const events = battle.events.filter((event) => event.kind === "law" && event.lawId === law.id && event.mechanicType);
        assert.ok(events.length > 0, `${law.name} 的 ${action} 未产生真实战斗事件`);
        assert.ok(events.every((event) => event.lawStack === 5), `${law.name} 的战斗日志层数错误`);
        battleMechanics += 1;
      }
    }
  }
  return { battleMechanics, externalMechanics };
}

function auditExactCombatMath() {
  const defeated = runTurnBattle(baseFighter({ hp: 0, mana: 0 }), baseOpponent({ hp: 0, mana: 0 }), { maxRounds: 1, random: () => 0.999 });
  assert.equal(defeated.leftStart.hp, 0, "零血角色进入战斗快照时不得被错误恢复满血");
  assert.equal(defeated.rightStart.hp, 0, "零血对手进入战斗快照时不得被错误恢复满血");

  const leftLethal = runTurnBattle(baseFighter({ attack: 500, maxHp: 1_000, hp: 1_000, maxMana: 1, mana: 0 }), baseOpponent({ attack: 1, defense: 0, maxHp: 80, hp: 80, divineSense: 10 }), { maxRounds: 1, random: () => 0.999 });
  assert.equal(leftLethal.winner, "left", "左方致死最后一击应判左方获胜");
  assert.equal(leftLethal.rightHp, 0, "左方致死最后一击应将右方气血降为 0");
  assert.equal(leftLethal.leftHp, 1_000, "左方致死最后一击不得误扣左方气血");
  const rightLethal = runTurnBattle(baseFighter({ attack: 1, defense: 0, maxHp: 80, hp: 80, divineSense: 10 }), baseOpponent({ attack: 500, defense: 0, maxHp: 1_000, hp: 1_000, divineSense: 100 }), { maxRounds: 1, random: () => 0.999 });
  assert.equal(rightLethal.winner, "right", "右方致死最后一击应判右方获胜");
  assert.equal(rightLethal.leftHp, 0, "右方致死最后一击应将左方气血降为 0");
  assert.equal(rightLethal.rightHp, 1_000, "右方致死最后一击不得误扣右方气血");

  const left = baseFighter({ attack: 100, defense: 20, maxHp: 500, hp: 500, maxMana: 1, mana: 0, divineSense: 20 });
  const right = baseOpponent({ attack: 80, defense: 30, maxHp: 500, hp: 500, divineSense: 10 });
  const battle = runTurnBattle(left, right, { maxRounds: 1, random: () => 0.999 });
  const attacks = battle.events.filter((event) => event.kind === "attack");
  assert.equal(attacks.length, 2, "基础验算应各行动一次");
  assert.deepEqual(attacks.map((event) => event.damage), [74, 64], "基础攻防减伤公式错误");
  assert.deepEqual(attacks.map((event) => [event.leftHp, event.rightHp]), [[500, 426], [436, 426]], "逐次攻击气血扣减错误");

  const highDefense = runTurnBattle(left, { ...right, defense: 60 }, { maxRounds: 1, random: () => 0.999 });
  const highDefenseDamage = highDefense.events.find((event) => event.kind === "attack" && event.actorSide === "left")?.damage;
  assert.equal(highDefenseDamage, 44, "防御提高 30 点后应准确少受 30 点伤害");

  const buffedAttack = runTurnBattle({ ...left, trialBuffs: { attack: 0.2 } }, right, { maxRounds: 1, random: () => 0.999 });
  assert.equal(buffedAttack.leftStart.attack, 120, "20% 攻击加成未进入战斗属性");
  assert.equal(buffedAttack.events.find((event) => event.kind === "attack" && event.actorSide === "left")?.damage, 94, "20% 攻击加成后的伤害错误");

  const fullResourceBuff = runTurnBattle(baseFighter({
    maxHp: 118,
    hp: 118,
    maxMana: 61,
    mana: 61,
    trialBuffs: { maxHp: 0.03, maxMana: 0.1 }
  }), right, { maxRounds: 1, random: () => 0.999 });
  assert.equal(fullResourceBuff.leftStart.maxHp, 121, "3% 气血上限加成取整错误");
  assert.equal(fullResourceBuff.leftStart.hp, 121, "满血应用上限加成后不应因浮点取整损失 1 点气血");
  assert.equal(fullResourceBuff.leftStart.maxMana, 67, "10% 法力上限加成取整错误");
  assert.equal(fullResourceBuff.leftStart.mana, 67, "满法力应用上限加成后不应因浮点取整损失 1 点法力");
  return { baselineDamage: [74, 64], highDefenseDamage, buffedDamage: 94 };
}

function auditPartialResourceScaling() {
  const state = createDefaultState();
  ensureStateShape(state);
  startDaoTrial(state, { routeId: "golden-pass" });
  const run = state.daoTrial.activeRun;
  const hpSeal = daoTrialSeals.find((seal) => Number(seal.effects?.maxHp) < 0);
  const manaSeal = daoTrialSeals.find((seal) => Number(seal.effects?.maxMana) < 0);
  assert.ok(hpSeal && manaSeal, "应存在负气血与负法力的风险道印");
  run.lawOffer = [];
  run.sealIds = [hpSeal.id, manaSeal.id];
  run.sealStacks = { [hpSeal.id]: 1, [manaSeal.id]: 1 };
  run.combatant.maxHp = 1_000;
  run.combatant.hp = 400;
  run.combatant.maxMana = 1_000;
  run.combatant.mana = 400;
  run.combatant.attack = 50;
  run.combatant.defense = 500;
  const buffs = combinedTrialBuffs(run);
  const expectedHp = Math.floor(run.combatant.hp * (1 + Number(buffs.maxHp || 0)));
  const expectedMana = Math.floor(run.combatant.mana * (1 + Number(buffs.maxMana || 0)));
  const replay = advanceDaoTrial(state, { action: "battle" }).replay;
  assert.equal(replay.left.startHp, expectedHp, "部分气血进入战斗时被重复缩放");
  assert.equal(replay.left.startMana, expectedMana, "部分法力进入战斗时被重复缩放");
  assert.equal(run.combatant.hp, Math.max(1, Math.round(replay.left.endHp / replay.left.stats.maxHp * run.combatant.maxHp)), "战后气血回写应取最近值，不能持续向下损耗");
  assert.equal(run.combatant.mana, Math.max(0, Math.round(replay.left.endMana / replay.left.stats.maxMana * run.combatant.maxMana)), "战后法力回写应取最近值，不能持续向下损耗");
  return { hpSeal: hpSeal.name, manaSeal: manaSeal.name, expectedHp, expectedMana };
}

function auditPreviewBattleConsistency() {
  const state = createDefaultState();
  ensureStateShape(state);
  startDaoTrial(state, { routeId: "golden-pass" });
  const run = state.daoTrial.activeRun;
  run.lawOffer = [];
  run.lawIds = ["element-domain-law"];
  run.lawStacks = { "element-domain-law": 5 };
  for (const key of ["maxHp", "hp", "attack", "defense", "divineSense", "maxMana", "mana"]) {
    run.combatant[key] = Math.max(1, Math.floor(Number(run.combatant[key]) * 100));
  }
  const playerKey = run.combatant.primaryRootKey || run.combatant.root?.key || "metal";
  const playerIndex = Math.max(0, rootCycle.indexOf(playerKey));
  const counterKey = rootCycle[(playerIndex - 1 + rootCycle.length) % rootCycle.length];
  const snapshot = run.opponentSnapshots["1"];
  snapshot.root = rootMap[counterKey];
  snapshot.roots = [rootMap[counterKey]];
  snapshot.primaryRootKey = counterKey;
  const preview = getPublicState(state).daoTrial.activeRun.opponentPreview;
  const replay = advanceDaoTrial(state, { action: "battle" }).replay;
  assert.equal(preview.playerMaxPower, replay.left.power, "灵根抗性下预览战力与真实战斗战力不一致");
  return { playerKey, counterKey, power: replay.left.power };
}

function auditBattleMetrics() {
  const state = createDefaultState();
  state.player.skillId = "fire_crow";
  state.player.skillRanks.fire_crow = 1;
  ensureStateShape(state);
  startDaoTrial(state, { routeId: "golden-pass" });
  const run = state.daoTrial.activeRun;
  run.lawOffer = [];
  run.lawIds = ["element-harmony-law"];
  run.lawStacks = { "element-harmony-law": 5 };
  run.combatant.maxHp = 5_000;
  run.combatant.hp = 2_000;
  run.combatant.attack = 160;
  run.combatant.defense = 300;
  run.combatant.maxMana = 2_000;
  run.combatant.mana = 2_000;
  const snapshot = run.opponentSnapshots["1"];
  snapshot.stats = { attack: 30, defense: 20, maxHp: 3_000, maxMana: 1, divineSense: 20 };
  snapshot.basePower = 1_000;
  const result = advanceDaoTrial(state, { action: "battle" });
  const events = result.replay.events;
  const expectedDealt = events.filter((event) => event.actorSide === "left" && event.targetSide === "right").reduce((sum, event) => sum + Math.max(0, Number(event.damage) || 0), 0);
  const expectedTaken = events.filter((event) => event.actorSide === "right" && event.targetSide === "left").reduce((sum, event) => sum + Math.max(0, Number(event.damage) || 0), 0);
  const expectedHealing = events.filter((event) => event.actorSide === "left").reduce((sum, event) => sum + Math.max(0, Number(event.healing) || 0), 0);
  const metrics = state.daoTrial.activeRun.lastBattle.metrics;
  assert.equal(metrics.damageDealt, expectedDealt, "法则/持续伤害没有完整计入输出统计");
  assert.equal(metrics.damageTaken, expectedTaken, "持续伤害或反震没有正确计入承伤统计");
  assert.equal(metrics.healing, expectedHealing, "法则治疗没有完整计入治疗统计");
  return { damageDealt: expectedDealt, damageTaken: expectedTaken, healing: expectedHealing };
}

function auditSkillModifiers() {
  const state = createDefaultState();
  state.player.skillId = "fire_crow";
  state.player.skillRanks.fire_crow = 1;
  ensureStateShape(state);
  startDaoTrial(state, { routeId: "golden-pass" });
  const run = state.daoTrial.activeRun;
  const selected = [
    daoTrialSeals.find((seal) => Number(seal.effects?.manaCost) < 0),
    daoTrialSeals.find((seal) => Number(seal.effects?.cooldown) < 0),
    daoTrialSeals.find((seal) => Number(seal.effects?.skillPower) > 0),
    daoTrialSeals.find((seal) => Number(seal.effects?.statusPower) > 0)
  ];
  assert.ok(selected.every(Boolean), "技能消耗、冷却、威力与持续效果均应有代表道印");
  run.lawOffer = [];
  run.sealIds = [...new Set(selected.map((seal) => seal.id))];
  run.sealStacks = Object.fromEntries(run.sealIds.map((id) => [id, 5]));
  const buffs = combinedTrialBuffs(run);
  const skill = getPublicState(state).daoTrial.activeRun.combatModifiers.skill;
  assert.equal(skill.cost, Math.max(1, Math.ceil(skill.baseCost * (1 + Number(buffs.manaCost || 0)))), "法力消耗修正值错误");
  assert.equal(skill.cooldown, Math.max(1, Math.round(skill.baseCooldown + Number(buffs.cooldown || 0))), "技能冷却修正值错误");
  const power = skill.effectComparisons.find((entry) => entry.key === "power");
  const status = skill.effectComparisons.find((entry) => entry.key === "percent");
  const rounded = (value) => Math.round(value * 1_000) / 1_000;
  assert.equal(power.current, rounded(power.base * (1 + Number(buffs.skillPower || 0))), "技能伤害倍率修正值错误");
  assert.equal(status.current, rounded(status.base * (1 + Number(buffs.skillPower || 0) + Number(buffs.statusPower || 0))), "持续伤害倍率修正值错误");
  return {
    seals: run.sealIds.map((id) => daoTrialSeals.find((seal) => seal.id === id)?.name),
    cost: [skill.baseCost, skill.cost],
    cooldown: [skill.baseCooldown, skill.cooldown],
    power: [power.base, power.current],
    status: [status.base, status.current]
  };
}

function auditMasteryLongTerm() {
  const novice = createDefaultState();
  ensureStateShape(novice);
  startDaoTrial(novice, { routeId: "golden-pass" });
  assert.equal(novice.daoTrial.activeRun.lawOffer.length, 3, "新路线首轮应保持三项等权法则候选");

  const veteran = createDefaultState();
  ensureStateShape(veteran);
  Object.assign(veteran.daoTrial.routeMastery["golden-pass"], { runs: 30, clears: 10, eliteClears: 10, bossClears: 10 });
  startDaoTrial(veteran, { routeId: "golden-pass" });
  assert.equal(veteran.daoTrial.activeRun.masteryLevel, 10, "长期精通样本应达到十级");
  assert.equal(veteran.daoTrial.activeRun.lawOffer.length, 4, "六级路线共鸣应让首轮法则候选增加一项");
  assert.equal(new Set(veteran.daoTrial.activeRun.lawOffer).size, 4, "精通增加的法则候选不得重复");
  return { noviceOptions: 3, veteranOptions: 4, masteryLevel: veteran.daoTrial.activeRun.masteryLevel };
}

function auditRouteFloors(maxFloor = 30) {
  const summaries = [];
  for (const [routeIndex, route] of daoTrialRoutes.entries()) {
    const state = createDefaultState();
    state.day = 100 + routeIndex * 7;
    state.rebirth = 5_000 + routeIndex;
    ensureStateShape(state);
    startDaoTrial(state, { routeId: route.id });
    const internal = state.daoTrial.activeRun;
    for (const key of ["maxHp", "hp", "attack", "defense", "divineSense", "maxMana", "mana"]) {
      internal.combatant[key] = Math.max(1, Math.floor(Number(internal.combatant[key]) * 500));
    }
    const floors = new Map();
    let battles = 0;
    let guard = 0;
    while (guard < 500) {
      const run = getPublicState(state).daoTrial.activeRun;
      assert.ok(run, `${route.name} 在 ${maxFloor} 层前意外结束`);
      if (run.currentNode) floors.set(run.currentNode.floor, run.currentNode.type);
      if (run.checkpointPending && run.checkpointFloor >= maxFloor && !run.lawOffer.length && !run.sealOffer.length) break;
      if (run.lawOffer.length) advanceDaoTrial(state, { action: "law", lawId: run.lawOffer[0].id });
      else if (run.sealOffer.length) advanceDaoTrial(state, { action: "seal", sealId: run.sealOffer[0].id });
      else if (run.checkpointPending) advanceDaoTrial(state, { action: "continue" });
      else if (run.currentNode.type === "battle") {
        const result = advanceDaoTrial(state, { action: "battle" });
        assert.equal(result.replay.result, "胜", `${route.name} 第 ${run.floor} 层强制审计不应战败`);
        assertBattleShape({
          leftHp: result.replay.left.endHp,
          rightHp: result.replay.right.endHp,
          leftMana: result.replay.left.endMana,
          rightMana: result.replay.right.endMana,
          leftStart: result.replay.left.stats,
          rightStart: result.replay.right.stats,
          events: result.replay.events
        }, `${route.name} 第 ${run.floor} 层`);
        battles += 1;
      } else {
        assert.ok(run.eventOptions.length, `${route.name} 第 ${run.floor} 层缺少事件/调息选项`);
        advanceDaoTrial(state, { optionId: run.eventOptions[0].id });
      }
      guard += 1;
    }
    for (let floor = 1; floor <= maxFloor; floor += 1) assert.ok(floors.has(floor), `${route.name} 未覆盖第 ${floor} 层`);
    assert.ok(new Set(floors.values()).has("battle") && new Set(floors.values()).has("event") && new Set(floors.values()).has("rest"), `${route.name} 未覆盖全部节点类型`);
    summaries.push({ route: route.name, floors: floors.size, battles });
  }
  return summaries;
}

const seals = auditAllSeals();
const laws = auditAllLaws();
const mechanics = auditEveryAdvancedMechanic();
const combatMath = auditExactCombatMath();
const partialScaling = auditPartialResourceScaling();
const previewConsistency = auditPreviewBattleConsistency();
const metrics = auditBattleMetrics();
const skillModifiers = auditSkillModifiers();
const masteryLongTerm = auditMasteryLongTerm();
const routes = auditRouteFloors(30);

console.log(JSON.stringify({ seals, laws, mechanics, combatMath, partialScaling, previewConsistency, metrics, skillModifiers, masteryLongTerm, routes }, null, 2));
console.log("dao-trial-exhaustive-audit: passed");
