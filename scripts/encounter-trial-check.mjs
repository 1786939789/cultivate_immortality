import assert from "node:assert/strict";
import { encounterDefinitionCount, encounterDefinitions } from "../server/encounterData.mjs";
import { daoTrialEventOptions, daoTrialLaws, daoTrialRoutes, daoTrialSeals } from "../server/daoTrialData.mjs";
import {
  advanceDaoTrial,
  createDefaultState,
  dailySettlement,
  effectiveStats,
  ensureStateShape,
  getCombatSnapshot,
  getDailyRootFortune,
  getEffectiveSkillSnapshot,
  generateDailyEncounter,
  getPublicState,
  resolveEncounter,
  startDaoTrial,
  updateEncounterFocus
} from "../server/gameLogic.mjs";

function setSingleRoot(person, rootKey, catalog) {
  const root = { ...catalog.find((entry) => entry.key === rootKey), bonus: 0 };
  person.root = root;
  person.roots = [root];
  person.primaryRootKey = rootKey;
}

function advanceToFortune(rootKey) {
  const testState = createDefaultState();
  const targetDay = Array.from({ length: 6 }, (_, day) => day).find((day) => getDailyRootFortune(testState, testState.player, day).rootKey === rootKey);
  testState.day = targetDay;
  ensureStateShape(testState);
  return testState;
}

function advanceTrialStep(state, { checkpoint = "exit", optionIndex = 0 } = {}) {
  const run = getPublicState(state).daoTrial.activeRun;
  if (!run) return null;
  if (run.lawOffer.length) return advanceDaoTrial(state, { action: "law", lawId: run.lawOffer[0].id });
  if (run.checkpointPending) return advanceDaoTrial(state, { action: checkpoint === "continue" ? "continue" : "checkpoint-exit" });
  if (run.sealOffer.length) return advanceDaoTrial(state, { action: "seal", sealId: run.sealOffer[0].id });
  if (run.currentNode.type === "battle") return advanceDaoTrial(state, { action: "battle" });
  return advanceDaoTrial(state, { optionId: run.eventOptions[optionIndex % run.eventOptions.length].id });
}

assert.equal(encounterDefinitionCount, 240, "首发因缘节点必须为 240 个");
assert.equal(new Set(encounterDefinitions.map((event) => event.id)).size, 240, "因缘节点 ID 必须唯一");
assert.ok(encounterDefinitions.some((event) => event.season === "spring" && event.seasonal), "应包含春季因缘");
assert.ok(encounterDefinitions.some((event) => event.season === "winter" && event.seasonal), "应包含冬季因缘");
assert.ok(encounterDefinitions.some((event) => event.familyId), "因缘节点必须有事件家族");
for (const event of encounterDefinitions) {
  assert.equal(event.choices.length, 3, `${event.id} 必须提供三个选择`);
  assert.ok(event.title && event.text && event.category, `${event.id} 缺少基础内容`);
  assert.equal(new Set(event.choices.map((choice) => choice.id)).size, 3, `${event.id} 选择 ID 必须唯一`);
}
assert.equal(daoTrialRoutes.length, 3, "问道秘境应提供三条完整路线");
assert.equal(daoTrialSeals.length, 256, "问道秘境应提供二百五十六道印");
assert.equal(daoTrialLaws.length, 64, "问道秘境应提供六十四项问道法则");
assert.equal(new Set(daoTrialSeals.map((seal) => seal.id)).size, 256, "道印 ID 必须唯一");
for (const route of daoTrialRoutes) assert.equal(route.nodes.length, 7, `${route.id} 必须包含七个节点`);
for (const [eventId, options] of Object.entries(daoTrialEventOptions)) assert.equal(options.length, 3, `${eventId} 必须提供三个取舍`);
for (const event of encounterDefinitions) {
  for (const choice of event.choices) {
    if (choice.effects?.nextEventId) assert.ok(encounterDefinitions.some((candidate) => candidate.id === choice.effects.nextEventId), `${event.id} 后续节点不存在`);
  }
}

const calendarState = createDefaultState();
ensureStateShape(calendarState);
assert.equal(getPublicState(calendarState).daoTrial.tickets, 1, "新存档应有一枚问道签");
const openingDate = calendarState.calendarStartDate;
dailySettlement(calendarState, { manual: true, settlementTime: `${openingDate} 00:01:00` });
const expectedFirstDayDate = new Date(`${openingDate}T00:00:00`);
expectedFirstDayDate.setDate(expectedFirstDayDate.getDate() + 1);
const expectedFirstDayText = `${expectedFirstDayDate.getFullYear()}-${String(expectedFirstDayDate.getMonth() + 1).padStart(2, "0")}-${String(expectedFirstDayDate.getDate()).padStart(2, "0")}`;
assert.equal(calendarState.day, 1, "首次结算后应进入第 1 天");
assert.equal(calendarState.player.dailyRecords[0].date, expectedFirstDayText, "第 1 天应对应建档日次日");
assert.equal(getPublicState(calendarState).daoTrial.tickets, 2, "每日结算应补充问道签并封顶两枚");

const state = createDefaultState();
ensureStateShape(state);
let generated = 0;
let longestEmptyRun = 0;
let emptyRun = 0;

for (let day = 2; day <= 140; day += 1) {
  state.day = day;
  const event = generateDailyEncounter(state);
  if (event) {
    generated += 1;
    emptyRun = 0;
  } else {
    emptyRun += 1;
    longestEmptyRun = Math.max(longestEmptyRun, emptyRun);
  }
  const pending = state.encounters.pending[0];
  if (pending) {
    const publicEvent = getPublicState(state, { scope: "home" }).encounters.pending.find((item) => item.id === pending.id);
    const choice = publicEvent.choices.find((item) => item.canChoose) || publicEvent.choices[2];
    resolveEncounter(state, { eventId: pending.id, choiceId: choice.id });
  }
}

assert.ok(generated >= 35 && generated <= 70, `140 天内事件数量异常（2-4 天一场）：${generated}`);
assert.ok(longestEmptyRun <= 3, `三日保底失效：连续 ${longestEmptyRun} 天无事件`);
assert.ok(state.encounters.history.length > 50, "因缘历史应持续积累");
assert.ok(Object.keys(state.relationships).length > 10, "事件应建立多名修士关系");

const encounterCatalog = getPublicState(createDefaultState()).catalog.roots;
const encounterFortuneState = advanceToFortune("water");
setSingleRoot(encounterFortuneState.player, "water", encounterCatalog);
encounterFortuneState.player.spirit = 10_000;
const positiveEncounter = encounterDefinitions
  .flatMap((definition) => definition.choices.map((choice) => ({ definition, choice })))
  .find(({ choice }) => Number(choice.effects?.xp) >= 5);
assert.ok(positiveEncounter, "测试数据应包含正修为因缘选择");
encounterFortuneState.encounters.pending = [{
  id: "fortune-positive-encounter",
  definitionId: positiveEncounter.definition.id,
  actorId: encounterFortuneState.npcs[0].id,
  title: positiveEncounter.definition.title,
  familyId: positiveEncounter.definition.familyId,
  category: positiveEncounter.definition.category
}];
const positiveXpBefore = encounterFortuneState.player.xp;
const positiveResult = resolveEncounter(encounterFortuneState, {
  eventId: "fortune-positive-encounter",
  choiceId: positiveEncounter.choice.id
});
const rawPositiveXp = Number(positiveEncounter.choice.effects.xp);
assert.equal(encounterFortuneState.player.xp - positiveXpBefore, Math.round(rawPositiveXp * 1.2), "水灵根幸运日的因缘正修为应提高 20%");
assert.match(positiveResult.history.impact, new RegExp(`修为 \\+${Math.round(rawPositiveXp * 1.2)}`), "因缘记录应展示实际结算后的幸运修为");

const negativeEncounter = positiveEncounter;
const originalNegativeTestXp = negativeEncounter.choice.effects.xp;
negativeEncounter.choice.effects.xp = -5;
encounterFortuneState.encounters.pending = [{
  id: "fortune-negative-encounter",
  definitionId: negativeEncounter.definition.id,
  actorId: encounterFortuneState.npcs[1].id,
  title: negativeEncounter.definition.title,
  familyId: negativeEncounter.definition.familyId,
  category: negativeEncounter.definition.category
}];
encounterFortuneState.player.xp = Math.max(100, encounterFortuneState.player.xp);
const negativeXpBefore = encounterFortuneState.player.xp;
resolveEncounter(encounterFortuneState, {
  eventId: "fortune-negative-encounter",
  choiceId: negativeEncounter.choice.id
});
assert.equal(encounterFortuneState.player.xp - negativeXpBefore, Number(negativeEncounter.choice.effects.xp), "幸运灵根不应放大因缘中的修为损失");
negativeEncounter.choice.effects.xp = originalNegativeTestXp;

const focusIds = state.npcs.slice(0, 3).map((npc) => npc.id);
for (const npcId of focusIds) updateEncounterFocus(state, { npcId, focused: true });
assert.equal(state.encounters.focusedNpcIds.length, 3, "关注修士上限应为三人");
assert.throws(() => updateEncounterFocus(state, { npcId: state.npcs[3].id, focused: true }), /最多关注三名/);

state.day = 1;
state.daoTrial = null;
ensureStateShape(state);
state.taskCompletions.unshift(
  { id: "boon-study", day: state.day, category: "学习" },
  { id: "boon-exercise", day: state.day, category: "运动" },
  { id: "boon-work", day: state.day, category: "工作" },
  { id: "boon-life", day: state.day, category: "生活" }
);
const companionId = getPublicState(state).daoTrial.companions[0]?.person?.id || "";
const started = startDaoTrial(state, { routeId: "golden-pass" });
assert.ok(started.run && !started.practice, "首次问道应为正式挑战");
assert.equal(state.daoTrial.tickets, 0, "正式问道应消耗一枚问道签");
assert.equal(started.run.taskBoons.length, 4, "当日四类现实任务应装载四种游历助力");
assert.equal(started.run.freeRerolls, 1, "学习任务应提供一次免费重观");
assert.equal(started.run.combat.maxHp, Math.floor(effectiveStats(state.player, state).maxHp * 1.12), "运动任务应提高本轮最大血量");
const trialBaseStats = effectiveStats(state.player, state);
const trialCombatant = state.daoTrial.activeRun.combatant;
const trialSnapshot = getCombatSnapshot(trialCombatant, state);
assert.equal(trialCombatant.attack, trialBaseStats.attack, "问道秘境应锁定进入时的天运攻击");
assert.equal(trialSnapshot.attack, trialCombatant.attack, "问道战斗不应再次叠加幸运灵根攻击");
assert.equal(trialSnapshot.divineSense, trialCombatant.divineSense, "问道战斗不应再次叠加幸运灵根神识");
const actionState = getPublicState(state, { scope: "dao-trial" });
assert.equal(actionState.__scope, "dao-trial", "问道动作应返回专用局部状态");
assert.ok(actionState.daoTrial.activeRun, "问道局部状态应包含当前挑战");
assert.equal(actionState.npcs, undefined, "问道局部状态不应携带完整 NPC 列表");

let actions = 0;
while (state.daoTrial.activeRun && actions < 30) {
  advanceTrialStep(state);
  actions += 1;
}

assert.ok(actions < 30, "问道流程不应陷入死循环");
assert.equal(state.daoTrial.activeRun, null, "问道挑战应正常结束");
assert.equal(state.daoTrial.history.length, 1, "问道结果应写入历史");
assert.match(state.daoTrial.history[0].date, /^\d{4}-\d{2}-\d{2}$/, "问道记录应保存结算日期");
assert.ok(state.daoTrial.history[0].rewards, "问道记录应保存本轮实际奖励");
assert.ok(Number.isFinite(state.daoTrial.history[0].rewards.spirit), "问道灵石奖励应为数值");
assert.ok(Number.isFinite(state.daoTrial.history[0].rewards.dust), "问道灵尘奖励应为数值");
assert.ok(Number.isFinite(state.daoTrial.history[0].rewards.xp), "问道修为奖励应为数值");
assert.doesNotThrow(() => JSON.stringify(getPublicState(state)), "公开状态必须可序列化");

const trialXpFortuneState = advanceToFortune("water");
setSingleRoot(trialXpFortuneState.player, "water", encounterCatalog);
startDaoTrial(trialXpFortuneState, { routeId: "golden-pass" });
trialXpFortuneState.daoTrial.activeRun.nodeIndex = 3;
trialXpFortuneState.daoTrial.activeRun.nodesCleared = 5;
trialXpFortuneState.daoTrial.activeRun.pendingSealIds = [];
trialXpFortuneState.daoTrial.activeRun.lawOffer = [];
trialXpFortuneState.daoTrial.activeRun.rewards.xp = 10;
const trialXpBefore = trialXpFortuneState.player.xp;
const trialXpResult = advanceDaoTrial(trialXpFortuneState, { action: "abandon" });
assert.equal(trialXpResult.summary.rewards.xp, 9, "水灵根幸运日问道离境应按 10 x 80% x 120% 结算修为");
assert.equal(trialXpResult.summary.rewards.dailyRootFortuneXpMultiplier, 1.2, "问道记录应保存入场时的幸运修为倍率");
assert.equal(trialXpFortuneState.player.xp - trialXpBefore, 9, "问道幸运修为应实际写入玩家修为");

const heavenTrialState = advanceToFortune("heaven");
setSingleRoot(heavenTrialState.player, "heaven", encounterCatalog);
startDaoTrial(heavenTrialState, { routeId: "golden-pass" });
const heavenCombatant = heavenTrialState.daoTrial.activeRun.combatant;
assert.ok(heavenCombatant.maxMana > heavenCombatant.skillManaBase, "天灵根幸运日问道应增加可用最大法力");
assert.equal(
  getEffectiveSkillSnapshot(heavenCombatant).cost,
  getEffectiveSkillSnapshot({ ...heavenCombatant, maxMana: heavenCombatant.skillManaBase, skillManaBase: undefined }).cost,
  "天灵根幸运法力不应同步抬高问道技能耗蓝"
);

const ticketState = createDefaultState();
ensureStateShape(ticketState);
startDaoTrial(ticketState, { routeId: "golden-pass" });
assert.equal(getPublicState(ticketState).daoTrial.tickets, 0, "消耗当日问道签后应归零");
ticketState.daoTrial.activeRun = null;
assert.equal(startDaoTrial(ticketState, { routeId: "golden-pass" }).practice, true, "无问道签时只能开始演练");
ticketState.daoTrial.activeRun = null;
dailySettlement(ticketState, { manual: true });
assert.equal(getPublicState(ticketState).daoTrial.tickets, 1, "次日应补充一枚问道签");
dailySettlement(ticketState, { manual: true });
dailySettlement(ticketState, { manual: true });
assert.equal(getPublicState(ticketState).daoTrial.tickets, 2, "未使用问道签时最多积存两枚");

const withdrawState = createDefaultState();
withdrawState.player.maxHp *= 6;
withdrawState.player.hp = withdrawState.player.maxHp;
withdrawState.player.attack *= 6;
withdrawState.player.defense *= 6;
withdrawState.player.maxMana *= 6;
withdrawState.player.mana = withdrawState.player.maxMana;
withdrawState.player.divineSense *= 6;
ensureStateShape(withdrawState);
startDaoTrial(withdrawState, { routeId: "golden-pass" });
for (const key of ["maxHp", "hp", "attack", "defense", "maxMana", "mana", "divineSense"]) {
  withdrawState.daoTrial.activeRun.combatant[key] *= 20;
}
assert.throws(() => advanceDaoTrial(withdrawState, { action: "abandon" }), /选择一项问道法则/);
advanceTrialStep(withdrawState);
assert.throws(() => advanceDaoTrial(withdrawState, { action: "abandon" }), /至少完成前五层/);
let withdrawActions = 0;
while (withdrawState.daoTrial.activeRun && !getPublicState(withdrawState).daoTrial.activeRun.canWithdraw && withdrawActions < 20) {
  const run = getPublicState(withdrawState).daoTrial.activeRun;
  if (run.checkpointPending && !run.lawOffer.length) advanceDaoTrial(withdrawState, { action: "continue" });
  else advanceTrialStep(withdrawState, { checkpoint: "continue" });
  withdrawActions += 1;
}
const bagBeforeWithdraw = getPublicState(withdrawState).daoTrial.activeRun.bag;
const spiritBeforeWithdraw = withdrawState.player.spirit;
const withdrawResult = advanceDaoTrial(withdrawState, { action: "abandon" });
assert.equal(withdrawResult.summary.rewards.retention, 0.8, "主动离境应按 80% 结算行囊");
assert.equal(withdrawState.player.spirit - spiritBeforeWithdraw, Math.floor(bagBeforeWithdraw.spirit * 0.8), "离境灵石结算应与行囊一致");

for (const route of daoTrialRoutes) {
  const routeState = createDefaultState();
  routeState.player.maxHp *= 5;
  routeState.player.hp = routeState.player.maxHp;
  routeState.player.attack *= 5;
  routeState.player.defense *= 5;
  routeState.player.maxMana *= 5;
  routeState.player.mana = routeState.player.maxMana;
  routeState.player.divineSense *= 5;
  ensureStateShape(routeState);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const start = startDaoTrial(routeState, { routeId: route.id });
    assert.equal(start.practice, attempt >= 1, `${route.id} 无签后应进入演练`);
    let routeActions = 0;
    while (routeState.daoTrial.activeRun && routeActions < 40) {
      advanceTrialStep(routeState, { optionIndex: attempt });
      routeActions += 1;
    }
    assert.ok(routeActions < 40, `${route.id} 第 ${attempt + 1} 次挑战不应卡死`);
  }
  assert.equal(routeState.daoTrial.attemptsUsed, 1, `${route.id} 应记录一次正式游历`);
  assert.equal(routeState.daoTrial.history.length, 2, `${route.id} 应保存一次正式记录和一次演练`);
}

console.log(`encounter-trial-check: passed (${generated} events, max empty ${longestEmptyRun} days, ${actions} trial actions)`);
