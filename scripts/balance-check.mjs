import assert from "node:assert/strict";
import {
  addTask,
  advanceDailyRootFortuneDay,
  createDefaultState,
  dailySettlement,
  deleteTaskCompletion,
  effectiveStats,
  ensureStateShape,
  getCombatSnapshot,
  getDailyRootFortune,
  getPublicCultivatorDetail,
  getPublicState,
  powerOf,
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

const fortuneRotationState = createDefaultState();
const fortuneDays = Array.from({ length: 12 }, (_, day) => getDailyRootFortune(fortuneRotationState, fortuneRotationState.player, day));
assert.equal(new Set(fortuneDays.slice(0, 6).map((fortune) => fortune.rootKey)).size, 6, "每个六日轮次应覆盖全部基础灵根");
assert.equal(new Set(fortuneDays.slice(6, 12).map((fortune) => fortune.rootKey)).size, 6, "下一轮六日仍应覆盖全部基础灵根");
assert.notEqual(fortuneDays[5].rootKey, fortuneDays[6].rootKey, "相邻轮次边界不应连续出现同一幸运灵根");
assert.deepEqual(
  fortuneDays.map((fortune) => fortune.rootKey),
  Array.from({ length: 12 }, (_, day) => getDailyRootFortune(fortuneRotationState, fortuneRotationState.player, day).rootKey),
  "幸运灵根轮转应稳定可复现"
);

function setSingleRoot(person, rootKey) {
  const root = { ...getPublicState(createDefaultState()).catalog.roots.find((entry) => entry.key === rootKey), bonus: 0 };
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

for (const [rootKey, stat, expectedRate] of [
  ["metal", "attack", 0.12],
  ["wood", "maxHp", 0.15],
  ["fire", "divineSense", 0.12],
  ["earth", "defense", 0.12],
  ["heaven", "maxMana", 0.15]
]) {
  const fortuneState = advanceToFortune(rootKey);
  setSingleRoot(fortuneState.player, rootKey);
  const base = fortuneState.player[stat];
  assert.equal(effectiveStats(fortuneState.player, fortuneState)[stat], Math.floor(base * (1 + expectedRate)), `${rootKey}幸运日应提高对应有效属性`);
  assert.equal(getCombatSnapshot(fortuneState.player, fortuneState)[stat], effectiveStats(fortuneState.player, fortuneState)[stat], `${rootKey}幸运日战斗快照应使用天运后的有效属性`);
  const other = fortuneState.npcs[0];
  setSingleRoot(other, rootKey === "metal" ? "wood" : "metal");
  assert.equal(getDailyRootFortune(fortuneState, other).playerMatched, false, "不拥有幸运灵根的修士不应触发加成");
}

const monsterFortuneState = advanceToFortune("metal");
const testMonster = {
  id: "monster-fortune-audit",
  name: "天运审计妖兽",
  attack: 100,
  defense: 40,
  maxHp: 300,
  hp: 300,
  divineSense: 30,
  maxMana: 80,
  mana: 80,
  skillId: monsterFortuneState.player.skillId
};
setSingleRoot(testMonster, "metal");
const monsterPowerWithMetalFortune = powerOf(testMonster, monsterFortuneState);
monsterFortuneState.day = Array.from({ length: 6 }, (_, day) => day).find((day) => getDailyRootFortune(monsterFortuneState, monsterFortuneState.player, day).rootKey !== "metal");
ensureStateShape(monsterFortuneState);
assert.equal(powerOf(testMonster, monsterFortuneState), monsterPowerWithMetalFortune, "妖兽和临时守关者不应获得修士的幸运灵根加成");

const duelFortuneState = advanceToFortune("metal");
duelFortuneState.npcs = duelFortuneState.npcs.slice(0, 1);
setSingleRoot(duelFortuneState.player, "metal");
setSingleRoot(duelFortuneState.npcs[0], "wood");
duelFortuneState.npcs[0].sect = "天运审计宗";
const duelPlayerAttack = effectiveStats(duelFortuneState.player, duelFortuneState).attack;
const duelDay = runDailyDuels(duelFortuneState, "2177-01-01 00:00:00");
const duelPlayerSide = duelDay.matches[0].left.id === "player" ? duelDay.matches[0].left : duelDay.matches[0].right;
assert.equal(duelPlayerSide.stats.attack, duelPlayerAttack, "每日切磋回放应记录幸运灵根加成后的实战攻击");

const dilutedState = advanceToFortune("metal");
const metalRoot = { ...getPublicState(createDefaultState()).catalog.roots.find((entry) => entry.key === "metal"), bonus: 0 };
const woodRoot = { ...getPublicState(createDefaultState()).catalog.roots.find((entry) => entry.key === "wood"), bonus: 0 };
dilutedState.player.root = metalRoot;
dilutedState.player.roots = [metalRoot, woodRoot];
dilutedState.player.primaryRootKey = "metal";
assert.equal(getDailyRootFortune(dilutedState).playerRate, 0.06, "双灵根应将幸运灵根属性加成稀释为一半");
assert.equal(effectiveStats(dilutedState.player, dilutedState).attack, Math.floor(dilutedState.player.attack * 1.06), "双灵根实际属性应按稀释后的 6% 计算");

const waterState = advanceToFortune("water");
setSingleRoot(waterState.player, "water");
waterState.player.root.bonus = 0;
waterState.player.roots[0].bonus = 0;
const waterFortune = getDailyRootFortune(waterState);
assert.equal(waterFortune.playerRate, 0.2, "单水灵根幸运日应获得 20% 修为加成");
assert.equal(waterFortune.playerBreakthroughBonus, 0.03, "单水灵根幸运日应增加 3 个百分点突破率");
const fortuneHome = getPublicState(waterState, { scope: "home" });
assert.equal(fortuneHome.home.ticker[0].label, "天运", "首页播报第一条应展示今日幸运灵根");
assert.equal(fortuneHome.home.ticker[0].name, "水灵根", "首页天运播报应对应当前幸运灵根");
const breakWithoutFortune = getPublicState({ ...waterState, day: (waterState.day + 1) % 6, dailyRootFortune: null }).derived.breakChance;
const breakWithFortune = getPublicState(waterState).derived.breakChance;
assert.ok(breakWithFortune >= breakWithoutFortune + 0.029, "水灵根幸运日应实际提高突破概率");
const taskControlState = structuredClone(waterState);
taskControlState.day = Array.from({ length: 6 }, (_, day) => day).find((day) => getDailyRootFortune(taskControlState, taskControlState.player, day).rootKey !== "water");
ensureStateShape(taskControlState);
const taskXpBefore = waterState.player.xp;
const controlXpBefore = taskControlState.player.xp;
addTask(waterState, { taskId: "task-fitness" });
addTask(taskControlState, { taskId: "task-fitness" });
const fortuneTaskXp = waterState.player.xp - taskXpBefore;
const controlTaskXp = taskControlState.player.xp - controlXpBefore;
assert.ok(fortuneTaskXp >= Math.round(controlTaskXp * 1.19), "水灵根幸运日现实任务应比无天运时多约 20% 修为");
assert.equal(waterState.taskCompletions[0].dailyRootFortuneXpMultiplier, 1.2, "任务记录应保存当天幸运灵根修为倍率");

const ratioState = createDefaultState();
const nextFortuneKey = getDailyRootFortune(ratioState, ratioState.player, ratioState.day + 1).rootKey;
setSingleRoot(ratioState.player, nextFortuneKey);
ratioState.player.hp = Math.floor(effectiveStats(ratioState.player, ratioState).maxHp * 0.47);
ratioState.player.mana = Math.floor(effectiveStats(ratioState.player, ratioState).maxMana * 0.63);
const hpRatioBefore = ratioState.player.hp / effectiveStats(ratioState.player, ratioState).maxHp;
const manaRatioBefore = ratioState.player.mana / effectiveStats(ratioState.player, ratioState).maxMana;
advanceDailyRootFortuneDay(ratioState);
const hpRatioAfter = ratioState.player.hp / effectiveStats(ratioState.player, ratioState).maxHp;
const manaRatioAfter = ratioState.player.mana / effectiveStats(ratioState.player, ratioState).maxMana;
assert.ok(Math.abs(hpRatioAfter - hpRatioBefore) < 0.02, "幸运灵根换日后应保持当前血量比例");
assert.ok(Math.abs(manaRatioAfter - manaRatioBefore) < 0.02, "幸运灵根换日后应保持当前法力比例");

const settlementFortuneState = createDefaultState();
dailySettlement(settlementFortuneState, { manual: true });
assert.ok(settlementFortuneState.log.some((entry) => entry.text.includes("今日天运落于")), "每日结算日志应播报新的幸运灵根");

const npcFortuneState = advanceToFortune("fire");
setSingleRoot(npcFortuneState.npcs[0], "fire");
npcFortuneState.npcs[0].root.bonus = 0;
npcFortuneState.npcs[0].roots[0].bonus = 0;
assert.equal(effectiveStats(npcFortuneState.npcs[0], npcFortuneState).divineSense, Math.floor(npcFortuneState.npcs[0].divineSense * 1.12), "NPC 也应获得幸运灵根属性加成");
assert.equal(getPublicState(npcFortuneState).npcs[0].dailyRootFortune.playerMatched, true, "NPC 公开数据应标记今日天运共鸣");
npcFortuneState.npcs[0].attack = 1_000_000;
const npcFortuneHomeEntry = getPublicState(npcFortuneState, { scope: "home" }).home.ranking.find((entry) => entry.id === npcFortuneState.npcs[0].id);
assert.equal(npcFortuneHomeEntry?.dailyRootFortune.playerMatched, true, "首页修士榜应保留 NPC 天运共鸣标记");

const oldSave = createDefaultState();
delete oldSave.dailyRootFortune;
assert.equal(ensureStateShape(oldSave), true, "旧存档应补齐幸运灵根状态");
assert.equal(oldSave.dailyRootFortune.day, oldSave.day, "补齐后的幸运灵根应对应当前游戏日");

const livePowerTrendState = createDefaultState();
livePowerTrendState.day = 2;
ensureStateShape(livePowerTrendState);
for (const person of [livePowerTrendState.player, ...livePowerTrendState.npcs]) {
  person.dailyRecords = [
    { day: 2, power: 1, powerRank: 200 },
    { day: 1, power: person.id === "player" ? 77 : 100, powerRank: person.id === "player" ? 150 : 1 }
  ];
}
livePowerTrendState.player.attack = 1_000_000;
const livePowerTrend = getPublicCultivatorDetail(livePowerTrendState, "player").rankingTrends.power;
const livePowerToday = livePowerTrend.find((entry) => entry.day === livePowerTrendState.day);
const livePowerYesterday = livePowerTrend.find((entry) => entry.day === livePowerTrendState.day - 1);
assert.equal(livePowerToday.rank, 1, "今日战斗力趋势应按突破、装备等变化后的实时战力重新排名");
assert.equal(livePowerToday.value, powerOf(livePowerTrendState.player, livePowerTrendState), "今日趋势应展示当前实时战力");
assert.equal(livePowerYesterday.value, 77, "历史日期仍应保留当日结算的战力快照");

addTask(state, { taskId: "task-fitness" });
mustThrow(() => addTask(state, { taskId: "task-fitness" }), "完成型任务不应在同一天重复结算");

addTask(state, { taskId: "task-work-hour", completedAmount: 1 });
mustThrow(() => addTask(state, { taskId: "task-work-hour", completedAmount: 1 }), "计量任务不应重复结算相同进度");
addTask(state, { taskId: "task-work-hour", completedAmount: 4 });
mustThrow(() => addTask(state, { taskId: "task-work-hour", completedAmount: 4 }), "计量任务达到上限后不应继续结算");

const taskDeleteState = createDefaultState();
taskDeleteState.day = 1;
ensureStateShape(taskDeleteState);
const taskDeleteXpBefore = taskDeleteState.player.xp;
const taskDeleteSpiritBefore = taskDeleteState.player.spirit;
const taskDeleteResult = addTask(taskDeleteState, { taskId: "task-fitness" });
deleteTaskCompletion(taskDeleteState, { id: taskDeleteResult.completion.id });
assert.equal(taskDeleteState.player.xp, taskDeleteXpBefore, "撤回现实任务应退回该任务增加的修为");
assert.equal(taskDeleteState.player.spirit, taskDeleteSpiritBefore, "撤回现实任务应退回该任务增加的灵石");
assert.equal(taskDeleteState.taskCompletions.some((entry) => entry.id === taskDeleteResult.completion.id), false, "撤回现实任务应移除完成记录");

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
