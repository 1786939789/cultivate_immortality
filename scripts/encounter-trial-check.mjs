import assert from "node:assert/strict";
import { encounterDefinitionCount, encounterDefinitions } from "../server/encounterData.mjs";
import { daoTrialEventOptions, daoTrialRoutes, daoTrialSeals } from "../server/daoTrialData.mjs";
import {
  advanceDaoTrial,
  createDefaultState,
  ensureStateShape,
  generateDailyEncounter,
  getPublicState,
  resolveEncounter,
  startDaoTrial,
  updateEncounterFocus
} from "../server/gameLogic.mjs";

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
assert.equal(daoTrialSeals.length, 48, "问道秘境应提供四十八道印");
assert.equal(new Set(daoTrialSeals.map((seal) => seal.id)).size, 48, "道印 ID 必须唯一");
for (const route of daoTrialRoutes) assert.equal(route.nodes.length, 7, `${route.id} 必须包含七个节点`);
for (const [eventId, options] of Object.entries(daoTrialEventOptions)) assert.equal(options.length, 3, `${eventId} 必须提供三个取舍`);
for (const event of encounterDefinitions) {
  for (const choice of event.choices) {
    if (choice.effects?.nextEventId) assert.ok(encounterDefinitions.some((candidate) => candidate.id === choice.effects.nextEventId), `${event.id} 后续节点不存在`);
  }
}

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

const focusIds = state.npcs.slice(0, 3).map((npc) => npc.id);
for (const npcId of focusIds) updateEncounterFocus(state, { npcId, focused: true });
assert.equal(state.encounters.focusedNpcIds.length, 3, "关注修士上限应为三人");
assert.throws(() => updateEncounterFocus(state, { npcId: state.npcs[3].id, focused: true }), /最多关注三名/);

state.day = 1;
state.daoTrial = null;
ensureStateShape(state);
const companionId = getPublicState(state).daoTrial.companions[0]?.person?.id || "";
const started = startDaoTrial(state, { routeId: "golden-pass", companionId });
assert.ok(started.run && !started.practice, "首次问道应为正式挑战");

let actions = 0;
while (state.daoTrial.activeRun && actions < 30) {
  const run = getPublicState(state).daoTrial.activeRun;
  if (run.sealOffer.length) {
    advanceDaoTrial(state, { action: "seal", sealId: run.sealOffer[0].id });
  } else if (run.currentNode.type === "battle") {
    advanceDaoTrial(state, { strategy: "balanced" });
  } else {
    advanceDaoTrial(state, { optionId: run.eventOptions[0].id });
  }
  actions += 1;
}

assert.ok(actions < 30, "问道流程不应陷入死循环");
assert.equal(state.daoTrial.activeRun, null, "问道挑战应正常结束");
assert.equal(state.daoTrial.history.length, 1, "问道结果应写入历史");
assert.doesNotThrow(() => JSON.stringify(getPublicState(state)), "公开状态必须可序列化");

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
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const start = startDaoTrial(routeState, { routeId: route.id });
    assert.equal(start.practice, attempt >= 3, `${route.id} 第四次起应为演练`);
    let routeActions = 0;
    while (routeState.daoTrial.activeRun && routeActions < 40) {
      const run = getPublicState(routeState).daoTrial.activeRun;
      if (run.sealOffer.length) {
        if (run.canReroll && routeActions % 3 === 0) advanceDaoTrial(routeState, { action: "reroll" });
        const refreshed = getPublicState(routeState).daoTrial.activeRun;
        advanceDaoTrial(routeState, { action: "seal", sealId: refreshed.sealOffer[0].id });
      } else if (run.currentNode.type === "battle") {
        advanceDaoTrial(routeState, {});
      } else {
        advanceDaoTrial(routeState, { optionId: run.eventOptions[attempt % run.eventOptions.length].id });
      }
      routeActions += 1;
    }
    assert.ok(routeActions < 40, `${route.id} 第 ${attempt + 1} 次挑战不应卡死`);
  }
  assert.equal(routeState.daoTrial.attemptsUsed, 3, `${route.id} 正式次数应封顶三次`);
  assert.equal(routeState.daoTrial.history.length, 4, `${route.id} 应保存三次正式记录和一次演练`);
  assert.ok(routeState.daoTrial.claimedMilestones.length <= 3, `${route.id} 里程碑不得重复领取`);
}

console.log(`encounter-trial-check: passed (${generated} events, max empty ${longestEmptyRun} days, ${actions} trial actions)`);
