import assert from "node:assert/strict";
import { daoTrialLaws, daoTrialRoutes } from "../server/daoTrialData.mjs";
import { replayStatMax } from "../web/src/battleReplay.js";
import { advanceDaoTrial, createDefaultState, ensureStateShape, getDaoTrialAnalytics, getPublicReplay, getPublicState, startDaoTrial } from "../server/gameLogic.mjs";

function strengthenPlayer(state, multiplier = 20) {
  for (const key of ["maxHp", "attack", "defense", "divineSense", "maxMana"]) state.player[key] *= multiplier;
  state.player.hp = state.player.maxHp;
  state.player.mana = state.player.maxMana;
}

function choosePending(state) {
  const run = getPublicState(state).daoTrial.activeRun;
  if (!run) return null;
  if (run.lawOffer.length) return advanceDaoTrial(state, { action: "law", lawId: run.lawOffer[0].id });
  if (run.sealOffer.length) return advanceDaoTrial(state, { action: "seal", sealId: run.sealOffer[0].id });
  if (run.currentNode.type === "battle") return advanceDaoTrial(state, { action: "battle" });
  return advanceDaoTrial(state, { optionId: run.eventOptions[0].id });
}

function reachCheckpoint(state, targetFloor) {
  let guard = 0;
  while (guard < 120) {
    const run = getPublicState(state).daoTrial.activeRun;
    assert.ok(run, `抵达第 ${targetFloor} 层前挑战不应结束`);
    if (run.checkpointPending && run.checkpointFloor === targetFloor && !run.lawOffer.length) return run;
    if (run.checkpointPending && !run.lawOffer.length) advanceDaoTrial(state, { action: "continue" });
    else choosePending(state);
    guard += 1;
  }
  assert.fail(`抵达第 ${targetFloor} 层的流程不应卡死`);
}

function forcedFailureState({ affixId = "ore-awakening", sealIds = [] } = {}) {
  const state = createDefaultState();
  state.day = 8;
  ensureStateShape(state);
  startDaoTrial(state, { routeId: "golden-pass" });
  const run = state.daoTrial.activeRun;
  run.affixId = affixId;
  run.sealIds = [...sealIds];
  run.lawOffer = [];
  run.scoreBreakdown = { progress: 100, quality: 20, risk: 10, build: 5, total: 135 };
  run.combatant.maxHp = 1;
  run.combatant.hp = 1;
  run.combatant.attack = 1;
  run.combatant.defense = 0;
  run.combatant.divineSense = 1;
  run.combatant.maxMana = 1;
  run.combatant.mana = 0;
  return state;
}

assert.equal(daoTrialLaws.length, 18, "应配置十八项问道法则");
assert.equal(new Set(daoTrialLaws.map((law) => law.id)).size, daoTrialLaws.length, "问道法则 ID 必须唯一");
for (const law of daoTrialLaws) {
  assert.ok(law.name && law.school && law.trigger && law.text, `${law.id} 缺少展示或触发信息`);
  assert.ok(Object.keys(law.effects || {}).length, `${law.id} 必须包含结构化效果`);
}

for (const law of daoTrialLaws) {
  const lawState = createDefaultState();
  ensureStateShape(lawState);
  startDaoTrial(lawState, { routeId: "golden-pass" });
  lawState.daoTrial.activeRun.lawOffer = [law.id];
  advanceDaoTrial(lawState, { action: "law", lawId: law.id });
  assert.equal(getPublicState(lawState).daoTrial.activeRun.laws[0]?.id, law.id, `${law.id} 应可选择、保存并公开展示`);
}

const lawBattleState = createDefaultState();
lawBattleState.day = 8;
lawBattleState.player.maxHp *= 20;
lawBattleState.player.hp = lawBattleState.player.maxHp;
lawBattleState.player.defense *= 20;
ensureStateShape(lawBattleState);
startDaoTrial(lawBattleState, { routeId: "golden-pass" });
assert.equal(lawBattleState.daoTrial.activeRun.nodes[0].type, "battle", "法则行为测试应从战斗层开始");
lawBattleState.daoTrial.activeRun.combatant.attack = 1;
lawBattleState.daoTrial.activeRun.combatant.maxMana = 1;
lawBattleState.daoTrial.activeRun.combatant.mana = 1;
lawBattleState.daoTrial.activeRun.sealIds = ["long-life"];
lawBattleState.daoTrial.activeRun.lawOffer = ["triple-edge"];
advanceDaoTrial(lawBattleState, { action: "law", lawId: "triple-edge" });
const deterministicBattleState = structuredClone(lawBattleState);
const worldBaselineState = structuredClone(lawBattleState);
const lawBattle = advanceDaoTrial(lawBattleState, { action: "battle" });
const repeatedBattle = advanceDaoTrial(deterministicBattleState, { action: "battle" });
assert.ok(lawBattle.replay.events.some((event) => event.kind === "law" && event.lawId === "triple-edge"), "剑鸣三叠应在第三次普通攻击后产生法则事件");
assert.deepEqual(repeatedBattle.replay.right, lawBattle.replay.right, "同周期同路线同层怪物属性必须稳定可复现");
assert.deepEqual(repeatedBattle.replay.events, lawBattle.replay.events, "相同存档与操作的秘境回合必须稳定可复现");
assert.ok(lawBattle.replay.left.stats.maxHp > lawBattle.replay.left.baseStats.maxHp, "秘境生命法则应提高战斗快照的最大血量");
assert.equal(replayStatMax(lawBattle.replay.left, "hp"), lawBattle.replay.left.stats.maxHp, "回放血量上限应优先使用有效战斗快照");
assert.equal(replayStatMax(lawBattle.replay.left, "mana"), lawBattle.replay.left.stats.maxMana, "回放法力上限应优先使用有效战斗快照");
const replayPowerStats = lawBattle.replay.left.stats;
const expectedReplayPower = Math.floor(
  replayPowerStats.attack * 2.8
  + replayPowerStats.defense * 2
  + replayPowerStats.maxHp * 0.42
  + replayPowerStats.divineSense * 1.35
  + replayPowerStats.maxMana * 0.55
);
assert.equal(lawBattle.replay.left.power, expectedReplayPower, "回放战力应按实际战斗快照计算");
const stalePowerReplay = structuredClone(lawBattle.replay);
stalePowerReplay.left.power = 1;
assert.equal(getPublicReplay(stalePowerReplay, lawBattleState).left.power, expectedReplayPower, "旧回放应按已保存的战斗快照修正历史战力");
assert.equal(replayStatMax({ stats: { maxHp: 180, maxMana: 90 }, baseStats: { maxHp: 120, maxMana: 60 }, startHp: 150, startMana: 70 }, "hp"), 180, "回放上限工具应避免基础属性覆盖有效属性");

const worldMutationState = structuredClone(worldBaselineState);
for (const key of ["maxHp", "attack", "defense", "divineSense", "maxMana"]) {
  worldMutationState.player[key] = Math.max(1, Math.floor(worldMutationState.player[key] * 0.05));
  for (const npc of worldMutationState.npcs) npc[key] = Math.max(1, Math.floor(npc[key] * 0.05));
}
worldMutationState.player.hp = worldMutationState.player.maxHp;
worldMutationState.player.mana = worldMutationState.player.maxMana;
const worldMutationBattle = advanceDaoTrial(worldMutationState, { action: "battle" });
assert.deepEqual(worldMutationBattle.replay.right, lawBattle.replay.right, "秘境怪物应使用入场时世界战力快照，不应被中途改属性影响");

const normalFailure = advanceDaoTrial(forcedFailureState(), { action: "battle" }).summary;
const affixFailure = advanceDaoTrial(forcedFailureState({ affixId: "borrowed-fate" }), { action: "battle" }).summary;
const sealFailure = advanceDaoTrial(forcedFailureState({ sealIds: ["last-light"] }), { action: "battle" }).summary;
const reducedScoreFailure = advanceDaoTrial(forcedFailureState({ affixId: "silent-bell" }), { action: "battle" }).summary;
assert.equal(normalFailure.score, 135, "基础失败分应保留原始分数");
assert.equal(affixFailure.score, 176, "借命一线应使失败分提高 30%");
assert.equal(sealFailure.score, 162, "末光印应使失败分提高 20%");
assert.equal(reducedScoreFailure.score, 128, "无声古钟应使结算分数降低 5%");

function dynamicLawBattle(lawId, skillId, seedSuffix = "") {
  const state = createDefaultState();
  state.day = 8;
  ensureStateShape(state);
  startDaoTrial(state, { routeId: "golden-pass" });
  const run = state.daoTrial.activeRun;
  run.lawOffer = [];
  run.lawIds = [lawId];
  run.seed += seedSuffix;
  run.combatant.skillId = skillId;
  run.combatant.attack = 30;
  run.combatant.defense *= 10;
  run.combatant.maxHp *= 10;
  run.combatant.hp = run.combatant.maxHp;
  run.combatant.divineSense *= 10;
  run.combatant.maxMana = 1000;
  run.combatant.mana = 1000;
  return { state, result: advanceDaoTrial(state, { action: "battle" }) };
}

const openingBattle = dynamicLawBattle("opening-break", "thunder_pearl");
assert.equal(openingBattle.result.replay.events.filter((event) => event.lawId === "opening-break").length, 1, "破势追击只能强化首次符合条件的技能");
const steadyBattle = dynamicLawBattle("steady-heart", "thunder_pearl");
assert.ok(steadyBattle.result.replay.events.some((event) => event.lawId === "steady-heart"), "守中不乱应按回合生成减伤法则事件");
const poisonBattle = dynamicLawBattle("poison-formation", "poison_flame");
assert.ok(poisonBattle.result.replay.events.some((event) => event.lawId === "poison-formation"), "毒经成势应在持续伤害施加后叠层");
const echoBattle = dynamicLawBattle("spell-echo", "thunder_pearl", "|echo");
assert.ok(echoBattle.result.replay.events.some((event) => event.lawId === "spell-echo"), "术后余音应按确定性概率产生额外伤害事件");
const executionBattle = dynamicLawBattle("execution-return", "thunder_pearl");
assert.equal(executionBattle.state.daoTrial.activeRun?.nextBattleAttack, 0.12, "斩意回流应在获胜后储存下一战攻击加成");

function eventManaAfter(affixId, sealIds = []) {
  const state = createDefaultState();
  state.day = 8;
  ensureStateShape(state);
  startDaoTrial(state, { routeId: "golden-pass" });
  const run = state.daoTrial.activeRun;
  run.affixId = affixId;
  run.sealIds = sealIds;
  run.lawOffer = [];
  run.nodes[0] = { id: "mana-loss", name: "法力损耗测试", type: "event", event: "static-fork", floor: 1 };
  run.combatant.maxHp = 1000;
  run.combatant.hp = 500;
  run.combatant.maxMana = 1000;
  run.combatant.mana = 500;
  advanceDaoTrial(state, { optionId: "touch" });
  return run.combatant.mana;
}
assert.equal(eventManaAfter("ore-awakening"), 400, "普通事件的负法力应损失 10%");
assert.equal(eventManaAfter("marsh-flood"), 395, "玄阴涨潮应放大负法力事件损耗");
assert.equal(eventManaAfter("marsh-flood", ["life-knot"]), 410, "事件损耗抗性应同时保护法力");

const rolloverState = createDefaultState();
rolloverState.day = 8;
ensureStateShape(rolloverState);
startDaoTrial(rolloverState, { routeId: "golden-pass" });
const rolloverRun = rolloverState.daoTrial.activeRun;
rolloverRun.nodesCleared = 5;
rolloverRun.maxFloor = 5;
rolloverRun.rewards = { xp: 40, spirit: 70, dust: 6, milestones: ["入境"] };
rolloverRun.scoreBreakdown = { progress: 700, quality: 30, risk: 10, build: 5, total: 745 };
const rolloverXp = rolloverState.player.xp;
const rolloverSpirit = rolloverState.player.spirit;
rolloverState.day = rolloverState.daoTrial.cycleEndDay + 1;
ensureStateShape(rolloverState);
assert.equal(rolloverState.player.xp, rolloverXp + 16, "周期结束应按失败保留率结算秘境修为");
assert.equal(rolloverState.player.spirit, rolloverSpirit + 28, "周期结束应按失败保留率结算灵石");
assert.equal(rolloverState.daoTrial.history[0].rewards.retention, 0.4, "周期结束记录应保存失败结算倍率");
assert.equal(rolloverState.daoTrial.routeMastery["golden-pass"].runs, 1, "周期结束应计入路线精通次数");

const routeState = createDefaultState();
strengthenPlayer(routeState);
ensureStateShape(routeState);
const routePublic = getPublicState(routeState).daoTrial;
for (const route of routePublic.routes) {
  assert.equal(route.nodes.length, 15, `${route.id} 必须生成十五个核心层`);
  assert.deepEqual(route.nodes.map((node, index) => node.boss ? index + 1 : 0).filter(Boolean), [5, 10, 15], `${route.id} 应在 5/10/15 层生成首领`);
}

startDaoTrial(routeState, { routeId: daoTrialRoutes[0].id });
let active = getPublicState(routeState).daoTrial.activeRun;
assert.equal(active.lawOffer.length, 3, "入境应先提供三项问道法则");
active = reachCheckpoint(routeState, 5);
assert.equal(active.maxFloor, 5, "第一阶段应记录通过五层");
assert.equal(active.scoreBreakdown.progress, 700, "前五层进度分应为 100+120+140+160+180");
assert.ok(active.scoreBreakdown.quality > 0, "战斗层应产生表现分");
const floorFiveScore = active.score;
advanceDaoTrial(routeState, { action: "continue" });
active = reachCheckpoint(routeState, 10);
assert.ok(active.score > floorFiveScore, "更深层数的总分必须严格提高");
advanceDaoTrial(routeState, { action: "continue" });
active = reachCheckpoint(routeState, 15);
assert.equal(active.maxFloor, 15, "应完成十五层核心秘境");
advanceDaoTrial(routeState, { action: "continue" });
active = getPublicState(routeState).daoTrial.activeRun;
assert.equal(active.floor, 16, "十五层后应进入第十六层问天阶");
assert.equal(active.nodes.length, 20, "问天阶应按五层继续扩展节点");
assert.equal(active.endless, true, "第十六层应标记为问天阶");

const exitState = createDefaultState();
strengthenPlayer(exitState);
ensureStateShape(exitState);
startDaoTrial(exitState, { routeId: "golden-pass" });
const exitRun = reachCheckpoint(exitState, 5);
const earnedScore = exitRun.score;
const exitResult = advanceDaoTrial(exitState, { action: "checkpoint-exit" });
assert.equal(exitResult.summary.score, earnedScore, "安全离境不得折损已经取得的分数");
assert.equal(exitResult.summary.rewards.retention, 1.2, "检查点安全离境应按 120% 结算奖励");
assert.equal(exitResult.summary.floor, 5, "历史应保存最深层数");
const exitPublic = getPublicState(exitState).daoTrial;
assert.equal(exitPublic.rankings.overall.floor, 5, "综合最佳记录应按层数派生");
assert.equal(exitPublic.rankings.solo.floor, 5, "独行挑战应进入独行最佳记录");
assert.equal(exitPublic.yearGoals.deepestFloor, 5, "年度问道志应记录最深层数");
exitState.daoTrial.history.push({ ...exitResult.summary, id: "previous-cycle-best", cycle: exitState.daoTrial.cycle - 1, floor: 99, score: 99_999 });
assert.equal(getPublicState(exitState).daoTrial.rankings.overall.cycle, exitState.daoTrial.cycle, "本期排行不得混入往期高分记录");

const masteryState = createDefaultState();
ensureStateShape(masteryState);
masteryState.daoTrial.routeMastery["golden-pass"].clears = 4;
const masteryStart = startDaoTrial(masteryState, { routeId: "golden-pass" }).run;
assert.ok(masteryStart.insight >= 2, "二级路线精通应提供额外悟机");
assert.ok(masteryStart.freeRerolls >= 1, "四级路线精通应提供免费重观");

const companionState = createDefaultState();
strengthenPlayer(companionState, 8);
const boostedNpc = companionState.npcs[0];
for (const key of ["maxHp", "attack", "defense", "divineSense", "maxMana"]) boostedNpc[key] *= 12;
boostedNpc.hp = boostedNpc.maxHp;
boostedNpc.mana = boostedNpc.maxMana;
ensureStateShape(companionState);
const companions = getPublicState(companionState).daoTrial.companions;
for (let index = 1; index < companions.length; index += 1) {
  assert.ok(companions[index - 1].support.potency >= companions[index].support.potency, "同行列表应按实际支援加成从高到低排序");
}
assert.ok(companions.every((entry) => Number.isFinite(entry.affinity) && Number.isFinite(entry.respect)), "同行列表应公开亲和与敬意数值");
const strongest = [...companions].sort((a, b) => b.support.power - a.support.power)[0];
const weakest = [...companions].sort((a, b) => a.support.power - b.support.power)[0];
assert.ok(strongest.support.powerFactor >= weakest.support.powerFactor, "强同行的战力系数不得低于弱同行");
startDaoTrial(companionState, { routeId: "golden-pass", companionId: strongest.person.id });
advanceDaoTrial(companionState, { action: "law", lawId: getPublicState(companionState).daoTrial.activeRun.lawOffer[0].id });
let companionGuard = 0;
while ((getPublicState(companionState).daoTrial.activeRun?.companionContribution?.assists || 0) === 0 && companionGuard < 15) {
  const run = getPublicState(companionState).daoTrial.activeRun;
  assert.ok(run, "同行产生贡献前挑战不应结束");
  if (run.checkpointPending && !run.lawOffer.length) advanceDaoTrial(companionState, { action: "continue" });
  else choosePending(companionState);
  companionGuard += 1;
}
const contribution = getPublicState(companionState).daoTrial.activeRun?.companionContribution;
if (contribution) assert.ok(contribution.assists > 0 && contribution.damage + contribution.healing + contribution.shields > 0, "同行应产生可见且有效的战斗贡献");

const legacyState = createDefaultState();
legacyState.daoTrial.version = 2;
legacyState.daoTrial.bestFloor = undefined;
legacyState.daoTrial.history = [{ id: "legacy", routeId: "golden-pass", routeName: "金石关", success: true, nodesCleared: 4, score: 618, practice: false }];
ensureStateShape(legacyState);
assert.equal(legacyState.daoTrial.version, 3, "旧秘境状态应迁移到 V3");
assert.equal(getPublicState(legacyState).daoTrial.bestFloor, 7, "旧通关记录应推导为七层历史深度");
assert.equal(getPublicState(legacyState).daoTrial.history[0].scoreBreakdown.legacy, true, "旧版记录应标记为无评分明细");

const analyticsState = createDefaultState();
analyticsState.day = 20;
ensureStateShape(analyticsState);
const analyticsRecord = ({ id, day, routeId, routeName, floor, score, practice = false, xp = 0, spirit = 0 }) => ({
  id,
  cycle: analyticsState.daoTrial.cycle,
  attempt: 1,
  practice,
  routeId,
  routeName,
  floor,
  nodesCleared: floor,
  score,
  scoreBreakdown: { progress: score - 60, quality: 30, risk: 20, build: 10, modifier: 0, total: score },
  combatStats: { battles: 2, rounds: 8, damageDealt: score * 2, damageTaken: 100, lawTriggers: 1 },
  companionContribution: {},
  companion: null,
  remainingHpRate: 72,
  success: floor >= 15,
  result: "主动离境",
  startedDay: day,
  endedDay: day,
  rewards: { xp, spirit, dust: 0 }
});
analyticsState.daoTrial.history = [
  analyticsRecord({ id: "day-20-gold", day: 20, routeId: "golden-pass", routeName: "金石关", floor: 8, score: 750, xp: 20, spirit: 30 }),
  analyticsRecord({ id: "day-20-practice", day: 20, routeId: "nether-marsh", routeName: "玄阴泽", floor: 20, score: 9_999, practice: true, xp: 999, spirit: 999 }),
  analyticsRecord({ id: "day-19-wind", day: 19, routeId: "wind-thunder-path", routeName: "风雷径", floor: 7, score: 700, xp: 10, spirit: 12 }),
  analyticsRecord({ id: "day-19-gold", day: 19, routeId: "golden-pass", routeName: "金石关", floor: 8, score: 650, xp: 14, spirit: 18 }),
  analyticsRecord({ id: "day-18-gold", day: 18, routeId: "golden-pass", routeName: "金石关", floor: 5, score: 600, xp: 8, spirit: 10 })
];
const analytics = getDaoTrialAnalytics(analyticsState, { range: 7 });
assert.equal(analytics.days.length, 7, "七日分析必须包含无挑战日期，图表才能显示空档");
assert.equal(analytics.summary.attempts, 4, "分析必须排除无奖励演练");
assert.equal(analytics.summary.latest.id, "day-20-gold", "最新成绩不得被演练覆盖");
assert.equal(analytics.summary.previous.id, "day-19-gold", "每日最佳必须先比较层数，再比较分数");
assert.equal(analytics.summary.improvementRate, 100, "成绩提升日应比较相邻的有效挑战日");
assert.deepEqual(analytics.days.find((entry) => entry.day === 19).rewards, { xp: 24, spirit: 30, dust: 0 }, "每日奖励应汇总全部正式游历");
assert.equal(analytics.routeStats.find((entry) => entry.routeId === "golden-pass").attempts, 3, "路线效率应统计范围内全部正式游历");
const windAnalytics = getDaoTrialAnalytics(analyticsState, { range: 7, routeId: "wind-thunder-path" });
assert.equal(windAnalytics.summary.attempts, 1, "路线筛选必须只保留指定路线的趋势数据");
assert.equal(windAnalytics.routeStats.find((entry) => entry.routeId === "golden-pass").attempts, 3, "路线筛选不应破坏全路线效率对比");

console.log("dao-trial-v2-check: passed (15 core floors, floor 16 endless, scoring, companion, laws, determinism, migration)");
