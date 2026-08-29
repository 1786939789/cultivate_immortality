import assert from "node:assert/strict";
import { advanceDaoTrial, createDefaultState, ensureStateShape, getPublicState, startDaoTrial } from "../server/gameLogic.mjs";
import { daoTrialRoutes } from "../server/daoTrialData.mjs";

function choosePending(state) {
  const run = getPublicState(state).daoTrial.activeRun;
  if (!run) return null;
  if (run.lawOffer.length) return advanceDaoTrial(state, { action: "law", lawId: run.lawOffer[0].id });
  if (run.sealOffer.length) return advanceDaoTrial(state, { action: "seal", sealId: run.sealOffer[0].id });
  if (run.checkpointPending) return advanceDaoTrial(state, { action: "continue" });
  if (run.currentNode.type === "battle") return advanceDaoTrial(state, { action: "battle" });
  return advanceDaoTrial(state, { optionId: run.eventOptions[0].id });
}

const encounterKinds = new Set();
for (const route of daoTrialRoutes) {
  const state = createDefaultState();
  state.rebirth = 8_000 + daoTrialRoutes.indexOf(route);
  ensureStateShape(state);
  const start = startDaoTrial(state, { routeId: route.id }).run;
  assert.equal(start.nodes.length, 30, `${route.name} 应生成 30 层核心节点`);
  const snapshots = Object.values(state.daoTrial.activeRun.opponentSnapshots);
  assert.equal(snapshots.length, 18, `${route.name} 应为 18 个战斗节点生成快照`);
  assert.equal(new Set(snapshots.map((snapshot) => snapshot.kind === "npc" ? snapshot.npcId : snapshot.id)).size, snapshots.length, `${route.name} 战斗对手不得重复`);
  for (const snapshot of snapshots) {
    encounterKinds.add(snapshot.kind);
    if (snapshot.kind === "npc") assert.ok(state.npcs.some((npc) => npc.id === snapshot.npcId), `${route.name} NPC 快照必须来自真实 NPC`);
  }
  const run = getPublicState(state).daoTrial.activeRun;
  assert.ok(run.opponentPreview, `${route.name} 应公开当前战前预览`);
  assert.ok(["npc", "monster"].includes(run.opponentPreview.encounterKind), `${route.name} 遭遇类型必须可识别`);
  assert.ok(Number(run.opponentPreview.power) > 0, `${route.name} 对手战力必须为正数`);
  assert.ok(Number(run.opponentPreview.rewardPreview?.spirit) >= 0, `${route.name} 战前应公开奖励预览`);
  let guard = 0;
  while (getPublicState(state).daoTrial.activeRun && guard < 80) {
    const result = choosePending(state);
    if (result?.completed) break;
    guard += 1;
  }
}

assert.ok(encounterKinds.has("npc"), "固定种子样本应包含真实 NPC");
assert.ok(encounterKinds.has("monster"), "固定种子样本应包含秘境妖物");

const eliteState = createDefaultState();
ensureStateShape(eliteState);
startDaoTrial(eliteState, { routeId: "golden-pass" });
const eliteRun = eliteState.daoTrial.activeRun;
const ordinary = getPublicState(eliteState).daoTrial.activeRun.opponentPreview;
eliteRun.nodeIndex = 4;
eliteRun.floor = 5;
eliteRun.lawOffer = [];
const elite = getPublicState(eliteState).daoTrial.activeRun.opponentPreview;
assert.ok(elite.rewardPreview.multiplier > ordinary.rewardPreview.multiplier, "精英层奖励倍率应高于普通层");
assert.ok(elite.kind.includes("精英") || elite.encounterKind === "monster", "第五层应公开精英敌人类型");

console.log(JSON.stringify({ encounterKinds: [...encounterKinds], status: "passed" }, null, 2));
console.log("dao-trial-encounter-check: passed");
