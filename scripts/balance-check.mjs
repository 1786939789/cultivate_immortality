import assert from "node:assert/strict";
import {
  addTask,
  createDefaultState,
  dailySettlement,
  getPublicState,
  updatePlayerBattleStrategy
} from "../server/gameLogic.mjs";

function mustThrow(action, message) {
  let thrown = false;
  try {
    action();
  } catch {
    thrown = true;
  }
  assert.equal(thrown, true, message);
}

const state = createDefaultState();

addTask(state, { taskId: "task-fitness" });
mustThrow(() => addTask(state, { taskId: "task-fitness" }), "完成型任务不应在同一天重复结算");

addTask(state, { taskId: "task-work-hour", completedAmount: 1 });
mustThrow(() => addTask(state, { taskId: "task-work-hour", completedAmount: 1 }), "计量任务不应重复结算相同进度");
addTask(state, { taskId: "task-work-hour", completedAmount: 4 });
mustThrow(() => addTask(state, { taskId: "task-work-hour", completedAmount: 4 }), "计量任务达到上限后不应继续结算");

updatePlayerBattleStrategy(state, { strategy: "guard" });
assert.equal(state.player.battleStrategy, "guard", "斗法策略应写入玩家存档");

dailySettlement(state, { manual: true });
const publicState = getPublicState(state);
assert.ok(publicState.derived.todayPlan, "公开状态应包含今日计划");
assert.equal(publicState.derived.todayPlan.dungeonForecasts.length, 3, "应为全部副本提供预测");
assert.ok(publicState.derived.sectStrategy.forecasts, "应提供宗门攻城预测");
assert.ok(state.duelDays[0]?.matches?.some((match) => match.replayId), "每日切磋应生成回放");

console.log("balance-check: passed");
