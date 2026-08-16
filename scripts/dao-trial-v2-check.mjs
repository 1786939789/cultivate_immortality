import assert from "node:assert/strict";
import { daoTrialLaws, daoTrialRoutes } from "../server/daoTrialData.mjs";
import { replayStatMax } from "../web/src/battleReplay.js";
import { advanceDaoTrial, createDefaultState, ensureStateShape, getPublicReplay, getPublicState, startDaoTrial } from "../server/gameLogic.mjs";

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

console.log("dao-trial-v2-check: passed (15 core floors, floor 16 endless, scoring, companion, laws, determinism, migration)");
