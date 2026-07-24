import assert from "node:assert/strict";
import {
  abandonActiveExpedition,
  advanceActiveExpedition,
  commandSectOperation,
  createDefaultState,
  dailySettlement,
  deleteTaskCompletion,
  getPublicState,
  addTask,
  startActiveExpedition,
  startSectOperation,
  updateActiveSectSquad,
  updatePlayerCombatBuild
} from "../server/gameLogic.mjs";

function publicActive(state) {
  return getPublicState(state, { scope: "home" }).activePlay;
}

function expectError(action, pattern) {
  assert.throws(action, pattern);
}

function resolveFirstExpeditionBattle(state, commandId = "bulwark") {
  const staged = advanceActiveExpedition(state, { action: "battle" });
  if (!staged.pendingDecision) return staged;
  return advanceActiveExpedition(state, { action: "command", commandId });
}

const loadoutState = createDefaultState();
const initialBuild = publicActive(loadoutState).build;
assert.equal(initialBuild.skillIds.length, 3, "default player loadout must contain three skills");
assert.equal(new Set(initialBuild.skillIds).size, 3, "default player skills must be unique");
expectError(
  () => updatePlayerCombatBuild(loadoutState, { skillIds: initialBuild.skillIds.slice(0, 2), stanceId: "balanced", commandId: "bulwark" }),
  /三项不同功法/
);
expectError(
  () => updatePlayerCombatBuild(loadoutState, { skillIds: [initialBuild.skillIds[0], initialBuild.skillIds[0], initialBuild.skillIds[1]], stanceId: "balanced", commandId: "bulwark" }),
  /三项不同功法/
);
expectError(
  () => updatePlayerCombatBuild(loadoutState, { skillIds: [initialBuild.skillIds[0], initialBuild.skillIds[1], "unknown-skill"], stanceId: "balanced", commandId: "bulwark" }),
  /尚未领悟/
);
expectError(
  () => updatePlayerCombatBuild(loadoutState, {
    skillIds: initialBuild.skillIds,
    stanceId: "balanced",
    commandId: "bulwark",
    equipmentBySlot: { weapon: "forged-item" }
  }),
  /不属于你/
);
const ownedItem = publicActive(loadoutState).ownedEquipment[0];
const equipmentBySlot = ownedItem ? { [ownedItem.slot]: ownedItem.id } : {};
updatePlayerCombatBuild(loadoutState, {
  skillIds: [...initialBuild.skillIds].reverse(),
  stanceId: "control",
  commandId: "focus",
  equipmentBySlot
});
const updatedBuild = publicActive(loadoutState).build;
assert.equal(updatedBuild.stanceId, "control");
assert.equal(updatedBuild.commandId, "focus");
assert.deepEqual(updatedBuild.equipmentBySlot, equipmentBySlot);

const expeditionState = createDefaultState();
assert.equal(publicActive(expeditionState).action.available, 1);
startActiveExpedition(expeditionState, { routeId: "green-ridge" });
assert.equal(publicActive(expeditionState).action.available, 0, "starting an expedition must spend one action token");
expectError(() => startActiveExpedition(expeditionState, { routeId: "green-ridge" }), /正在进行/);
assert.equal(publicActive(expeditionState).action.available, 0, "a rejected duplicate start must not spend another token");

const restoredExpedition = structuredClone(expeditionState);
assert.equal(publicActive(restoredExpedition).activeExpedition.route.id, "green-ridge", "active expedition must survive serialization");
const deterministicA = structuredClone(restoredExpedition);
const deterministicB = structuredClone(restoredExpedition);
const battleA = resolveFirstExpeditionBattle(deterministicA, "bulwark");
const battleB = resolveFirstExpeditionBattle(deterministicB, "bulwark");
assert.equal(battleA.won, battleB.won, "same seed and command must produce the same winner");
assert.deepEqual(battleA.replay?.events, battleB.replay?.events, "same seed and command must produce the same battle events");
if (battleA.won) {
  const offer = publicActive(deterministicA).activeExpedition.pendingReward;
  assert.ok(offer?.length >= 3, "a won expedition battle must offer rewards");
  const spiritBefore = deterministicA.player.spirit;
  const selected = offer.find((entry) => entry.type === "spirit") || offer[0];
  advanceActiveExpedition(deterministicA, { action: "reward", rewardId: selected.id });
  const spiritAfter = deterministicA.player.spirit;
  expectError(() => advanceActiveExpedition(deterministicA, { action: "reward", rewardId: selected.id }), /需要作出选择|需要开始战斗/);
  assert.equal(deterministicA.player.spirit, spiritAfter, "a reward must not be claimable twice");
  assert.ok(spiritAfter >= spiritBefore);
}
abandonActiveExpedition(expeditionState);
assert.equal(publicActive(expeditionState).expeditionHistory[0].result, "abandoned");

const rolloverState = createDefaultState();
rolloverState.taskCompletions.push({ day: 1, baseXp: 500 });
assert.equal(publicActive(rolloverState).action.available, 4, "500 effective task XP should earn three bonus tokens");
startActiveExpedition(rolloverState, { routeId: "green-ridge" });
abandonActiveExpedition(rolloverState);
assert.equal(publicActive(rolloverState).action.available, 3);
dailySettlement(rolloverState, { manual: true });
const rolloverAction = publicActive(rolloverState).action;
assert.equal(rolloverAction.carry, 0, "day zero and day one share the first task accounting period");
assert.equal(rolloverAction.available, 3, "the opening task period must not award the same task tokens twice");
dailySettlement(rolloverState, { manual: true });
const secondRolloverAction = publicActive(rolloverState).action;
assert.equal(secondRolloverAction.carry, 2, "only two unused tokens may carry into a genuinely new task day");
assert.equal(secondRolloverAction.available, 3, "a new task day should provide carried tokens plus one daily token");

const openingTaskState = createDefaultState();
addTask(openingTaskState, { taskId: "task-writing" });
assert.equal(openingTaskState.taskCompletions[0].day, 1, "opening tasks use the first task accounting day");
assert.equal(publicActive(openingTaskState).action.effectiveTaskXp, 120, "opening tasks must immediately count toward action thresholds");
assert.equal(publicActive(openingTaskState).action.available, 2, "the first opening threshold must immediately grant a token");
deleteTaskCompletion(openingTaskState, { id: openingTaskState.taskCompletions[0].id });
assert.equal(publicActive(openingTaskState).action.effectiveTaskXp, 0, "withdrawing an opening task must remove its threshold progress");
assert.equal(publicActive(openingTaskState).action.available, 1, "withdrawing an opening task must remove its unspent bonus token");

const archiveState = createDefaultState();
archiveState.day = 11;
archiveState.duelDays = [{ day: 1, matches: [] }];
dailySettlement(archiveState, { manual: true });
assert.equal(archiveState.battleArchives.summaries.length, 1, "expired battle records must be archived during settlement");
assert.equal(archiveState.battleArchives.summaries[0].startDay, 1, "battle archives must use the correct ten-day bucket");
assert.equal(archiveState.duelDays.some((record) => Number(record.day) === 1), false, "archived battle details must be removed from the live window");

const sectState = createDefaultState();
const roster = publicActive(sectState).sect.roster;
assert.ok(roster.length >= 5, "player sect must expose at least five operation members");
const rosterIds = roster.map((entry) => entry.person.id);
const squadIds = (size) => ["player", ...rosterIds.filter((id) => id !== "player")].slice(0, size);
const memberIds = squadIds(4);
expectError(
  () => updateActiveSectSquad(sectState, { memberIds: memberIds.filter((id) => id !== "player"), formationId: "spearhead" }),
  /必须包含玩家/
);
for (const size of [3, 4, 5]) {
  updateActiveSectSquad(sectState, { memberIds: squadIds(size), formationId: "five-elements" });
  assert.equal(publicActive(sectState).sect.squad.memberIds.length, size, `an explicit ${size}-member squad must keep its size`);
}
updateActiveSectSquad(sectState, { memberIds, formationId: "five-elements" });
const fatigueBefore = Object.fromEntries(memberIds.map((id) => [id, Number(sectState.sectFatigue[id]) || 0]));
const allFatigueBefore = { ...sectState.sectFatigue };
const operationStart = startSectOperation(sectState, { operationId: "patrol" });
assert.equal(publicActive(sectState).action.available, 0, "starting a sect operation must spend one action token");
if (!operationStart.completed) {
  assert.equal(
    publicActive(sectState).sect.activeOperation.rivalMemberIds.length,
    memberIds.length,
    "rival operations must field the same number of members as the player squad"
  );
}
const operationResult = operationStart.completed
  ? operationStart
  : commandSectOperation(sectState, { commandId: "bulwark" });
assert.equal(operationResult.completed, true);
assert.equal(publicActive(sectState).sect.activeOperation, null);
for (const id of memberIds) assert.ok((sectState.sectFatigue[id] || 0) > fatigueBefore[id], "operation members must gain fatigue");
for (const id of operationResult.record.rivalMemberIds) {
  assert.ok((sectState.sectFatigue[id] || 0) > (allFatigueBefore[id] || 0), "rival operation members must gain fatigue under the same rules");
}
expectError(() => commandSectOperation(sectState, { commandId: "bulwark" }), /没有等待指令/);
assert.equal(publicActive(sectState).sect.history.length, 1, "a completed operation must only create one history entry");

console.log("active-play-check: passed (loadout, actions, replay, rewards, rollover, squad, operation)");
