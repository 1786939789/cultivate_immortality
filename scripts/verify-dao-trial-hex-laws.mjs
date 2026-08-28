import assert from "node:assert/strict";
import { daoTrialLaws } from "../server/daoTrialData.mjs";
import { resolveLawMechanics } from "../server/daoTrialLawDesign.mjs";
import { advanceDaoTrial, createDefaultState, ensureStateShape, getPublicState, startDaoTrial } from "../server/gameLogic.mjs";

const diamondLaws = daoTrialLaws.filter((law) => law.rarity === "diamond");
const goldLaws = daoTrialLaws.filter((law) => law.rarity === "gold");
const supportedActions = new Set([
  "attackEcho", "openingSurge", "executeStrike", "battleMomentum",
  "freeCast", "repeatSkill", "cooldownFlow", "manaTide",
  "lethalWard", "damageStore", "noHitCounter", "damageReflect",
  "lifesteal", "roundRegen", "healStrike", "lowHpEcho",
  "bloodCast", "adversityGrowth", "battleWager", "companionSkillEcho",
  "companionFollowup", "companionLethalWard", "soloEcho", "elementCycle",
  "statusDetonate", "rootReversal", "elementPulse", "freeReroll",
  "residualChoice", "eventCompensation", "fortune"
]);

assert.equal(diamondLaws.length, 32);
assert.equal(goldLaws.length, 64);
assert.equal(new Set(diamondLaws.flatMap((law) => law.mechanics.map((mechanic) => mechanic.type))).size, 32);
for (const law of [...goldLaws, ...diamondLaws]) {
  assert.ok(law.branch && law.designRole && law.stackPlan?.length === 5, `${law.id} 缺少构筑展示字段`);
  assert.ok(law.mechanics.length > 0, `${law.id} 缺少机制`);
  for (const mechanic of law.mechanics) assert.ok(supportedActions.has(mechanic.action), `${law.id} 使用了未接入的动作 ${mechanic.action}`);
  assert.notDeepEqual(resolveLawMechanics(law, 1), resolveLawMechanics(law, 5), `${law.id} 重复五次后机制没有成长`);
}

function preparedTrial(lawId, { skillId = "thunder_pearl", companion = false, weak = false, lowHp = false } = {}) {
  const state = createDefaultState();
  state.day = 8;
  state.player.skillId = skillId;
  ensureStateShape(state);
  const companionId = companion ? getPublicState(state).daoTrial.companions[0]?.person?.id : "";
  startDaoTrial(state, { routeId: "golden-pass", companionId });
  const run = state.daoTrial.activeRun;
  run.lawOffer = [];
  run.lawIds = [lawId];
  run.lawStacks = { [lawId]: 1 };
  run.combatant.maxHp = weak ? 20 : 5_000;
  run.combatant.hp = weak ? 1 : lowHp ? 1_200 : 5_000;
  run.combatant.attack = weak ? 2 : 45;
  run.combatant.defense = weak ? 0 : 180;
  run.combatant.divineSense = 100;
  run.combatant.maxMana = 2_000;
  run.combatant.mana = skillId ? 2_000 : 0;
  const snapshot = run.opponentSnapshots["1"];
  snapshot.stats = { attack: weak ? 600 : 28, defense: 12, maxHp: 8_000, maxMana: 200, divineSense: 20 };
  snapshot.basePower = 1_000;
  return state;
}

function battleEvents(lawId, options = {}) {
  const state = preparedTrial(lawId, options);
  const result = advanceDaoTrial(state, { action: "battle" });
  return { state, result, events: result.replay.events.filter((event) => event.lawId === lawId) };
}

const representativeBattles = [
  ["sword-domain", { skillId: "" }],
  ["boundless-casting", { skillId: "thunder_pearl" }],
  ["unyielding-law", { weak: true }],
  ["immortal-spring", { weak: true }],
  ["life-wager", { lowHp: true }],
  ["twin-stars-law", { companion: true }],
  ["element-domain-law", {}]
];
for (const [lawId, options] of representativeBattles) {
  const battle = battleEvents(lawId, options);
  assert.ok(battle.events.length > 0, `${lawId} 代表性战斗必须产生专属法则日志`);
  assert.ok(battle.events.every((event) => event.mechanicType && event.lawStack === 1), `${lawId} 日志必须记录机制与层数`);
}

for (const law of diamondLaws) {
  const state = preparedTrial(law.id, { companion: law.school === "同行共鸣" });
  assert.doesNotThrow(() => advanceDaoTrial(state, { action: "battle" }), `${law.id} 不得导致战斗执行异常`);
}
for (const law of goldLaws) {
  const state = preparedTrial(law.id, { companion: law.school === "同行共鸣" });
  assert.doesNotThrow(() => advanceDaoTrial(state, { action: "battle" }), `${law.id} 黄金联动不得导致战斗执行异常`);
}

const rerollState = preparedTrial("rewrite-fate-law");
rerollState.daoTrial.activeRun.insight = 0;
rerollState.daoTrial.activeRun.lawOffer = ["edge-pressure", "deep-channel", "stone-skin-law"];
const rerollBefore = rerollState.daoTrial.activeRun.insight;
advanceDaoTrial(rerollState, { action: "reroll-law" });
assert.equal(rerollState.daoTrial.activeRun.insight, rerollBefore, "改命一掷首次重观必须免费");
assert.equal(rerollState.daoTrial.activeRun.lastLawEvent.lawId, "rewrite-fate-law");

const residualState = preparedTrial("expanded-law-fate-30");
residualState.daoTrial.activeRun.lawOffer = ["edge-pressure", "deep-channel", "stone-skin-law"];
const residualAttack = residualState.daoTrial.activeRun.tempAttack || 0;
advanceDaoTrial(residualState, { action: "law", lawId: "edge-pressure" });
assert.ok(residualState.daoTrial.activeRun.tempAttack > residualAttack, "一法化三必须吸收未选项残悟");

const eventState = preparedTrial("expanded-law-fate-31");
const eventRun = eventState.daoTrial.activeRun;
eventRun.nodes[0] = { id: "misfortune-test", name: "福祸测试", type: "event", event: "static-fork", floor: 1 };
eventRun.lawOffer = [];
const insightBefore = eventRun.insight;
advanceDaoTrial(eventState, { optionId: "touch" });
assert.ok(eventRun.insight > insightBefore, "福祸相生必须把负面事件转化为悟机");

const catalog = getPublicState(createDefaultState()).daoTrial.lawCatalog;
assert.ok(catalog.every((law) => law.branch && law.stackPlan?.length === 5));
assert.ok(catalog.filter((law) => law.rarity === "diamond").every((law) => law.mechanics?.[0]?.summary));

console.log("dao-trial hex law verification passed", JSON.stringify({
  diamonds: diamondLaws.length,
  golds: goldLaws.length,
  mechanicTypes: new Set(diamondLaws.flatMap((law) => law.mechanics.map((mechanic) => mechanic.type))).size,
  representativeBattles: representativeBattles.length
}));
