import assert from "node:assert/strict";
import {
  addTask,
  createDefaultState,
  dailySettlement,
  getPublicState,
  runDailyDuels
} from "../server/gameLogic.mjs";
import { duelRanks } from "../server/gameData.mjs";

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

dailySettlement(state, { manual: true });
const publicState = getPublicState(state);
assert.ok(publicState.derived.todayPlan, "公开状态应包含今日计划");
assert.equal(publicState.derived.todayPlan.dungeonForecasts.length, 3, "应为全部副本提供预测");
assert.ok(publicState.derived.sectStrategy.forecasts, "应提供宗门攻城预测");
const starSeaRecord = state.dungeonDays[0]?.public;
const starSeaMembers = (starSeaRecord?.teams || []).flatMap((team) => team.members || []);
assert.equal(starSeaMembers.length, 200, "乱星海应包含全部 200 名参赛修士");
assert.ok(starSeaMembers.every((member) => member.spirit >= 1), "乱星海新结算应保证每人至少获得 1 灵石");
assert.equal(starSeaMembers.reduce((sum, member) => sum + member.spirit, 0), starSeaRecord.spiritPool, "乱星海个人奖励总和应等于当日总池");
assert.equal((starSeaRecord.teams || []).reduce((sum, team) => sum + team.spirit, 0), starSeaRecord.spiritPool, "乱星海队伍奖励总和应等于当日总池");
assert.ok(state.duelDays[0]?.matches?.some((match) => match.replayId), "每日切磋应生成回放");
const dailyMatches = state.duelDays[0]?.matches || [];
const dailyParticipants = dailyMatches.flatMap((match) => [match.left?.id, match.right?.id]).filter(Boolean);
assert.equal(dailyMatches.filter((match) => match.type === "bye").length, 0, "200 人日常切磋不应出现轮空");
assert.equal(dailyMatches.filter((match) => match.type === "battle").length, 100, "200 人日常切磋应生成 100 场对阵");
assert.equal(new Set(dailyParticipants).size, 200, "每名修士每日应且只应参加一场切磋");

const pairingState = createDefaultState();
pairingState.npcs = pairingState.npcs.slice(0, 3);
const pairingRoster = [pairingState.player, ...pairingState.npcs];
const rankIndexes = [6, 2, 0, 4];
pairingRoster.forEach((person, index) => {
  person.sect = `测试宗门-${index}`;
  person.duelSeason.score = duelRanks[rankIndexes[index]].min;
});
const originalRandom = Math.random;
const randomSequence = [0, 0.99, 0, 0];
Math.random = () => randomSequence.shift() ?? 0;
let pairingRecord;
try {
  pairingRecord = runDailyDuels(pairingState, "2026-01-01 00:00:00");
} finally {
  Math.random = originalRandom;
}
assert.equal(pairingRecord.matches.filter((match) => match.type === "battle").length, 2, "全局配对应避免贪心选择制造轮空");
assert.equal(pairingRecord.matches.filter((match) => match.type === "bye").length, 0, "存在完整配对时不应轮空");

console.log("balance-check: passed");
