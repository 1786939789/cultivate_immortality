import assert from "node:assert/strict";
import { daoTrialRoutes } from "../server/daoTrialData.mjs";
import { advanceDaoTrial, createDefaultState, ensureStateShape, getPublicState, startDaoTrial } from "../server/gameLogic.mjs";

const corePattern = [
  "battle", "event", "battle", "rest", "battle",
  "battle", "event", "battle", "rest", "battle",
  "battle", "event", "battle", "rest", "battle",
  "battle", "event", "battle", "rest", "battle",
  "battle", "event", "battle", "rest", "battle",
  "battle", "event", "battle", "rest", "battle"
];
const permanentKeys = ["realm", "layer", "maxHp", "hp", "attack", "defense", "divineSense", "maxMana", "mana"];

function chooseBuild(state) {
  const run = getPublicState(state).daoTrial.activeRun;
  if (run.lawOffer.length) return advanceDaoTrial(state, { action: "law", lawId: run.lawOffer[0].id });
  if (run.sealOffer.length) return advanceDaoTrial(state, { action: "seal", sealId: run.sealOffer[0].id });
  return null;
}

function auditDeepRun(route, routeIndex) {
  const state = createDefaultState();
  state.day = 1 + routeIndex * 7;
  state.rebirth = 700 + routeIndex;
  ensureStateShape(state);
  const companions = getPublicState(state).daoTrial.companions;
  const companion = companions[routeIndex % companions.length];
  startDaoTrial(state, { routeId: route.id, companionId: companion.person.id });
  const internal = state.daoTrial.activeRun;
  assert.equal(internal.nodes.length, 30, `${route.name} 应生成 30 个核心节点`);
  assert.deepEqual(internal.nodes.map((node) => node.type), corePattern, `${route.name} 节点节奏错误`);
  assert.equal(internal.opponentIds.length, 18, `${route.name} 核心层应分配 18 名守关对手`);
  assert.equal(new Set(internal.opponentIds).size, 18, `${route.name} 核心层守关对手不得重复`);
  assert.ok(!internal.opponentIds.includes(companion.person.id), `${route.name} 不得选择同行者守关`);

  for (const key of ["maxHp", "hp", "attack", "defense", "divineSense", "maxMana", "mana"]) {
    internal.combatant[key] = Math.max(1, Math.floor(Number(internal.combatant[key]) * 100));
  }

  const seen = new Set();
  const previews = [];
  let guard = 0;
  while (guard < 180) {
    const run = getPublicState(state).daoTrial.activeRun;
    assert.ok(run, `${route.name} 到达 20 层前不应结束`);
    if (run.checkpointPending && run.checkpointFloor === 20 && !run.lawOffer.length) break;
    if (run.lawOffer.length || run.sealOffer.length) {
      chooseBuild(state);
    } else if (run.checkpointPending) {
      advanceDaoTrial(state, { action: "continue" });
    } else if (run.currentNode.type === "battle") {
      const preview = run.opponentPreview;
      assert.ok(preview?.person?.id && preview.basePower > 0 && preview.power > 0, `${route.name} 第 ${run.floor} 层应公开完整对手预览`);
      assert.ok(!seen.has(preview.person.id), `${route.name} 第 ${run.floor} 层重复出现 ${preview.name}`);
      seen.add(preview.person.id);
      const npc = preview.encounterKind === "npc" ? state.npcs.find((entry) => entry.id === preview.person.id) : null;
      if (preview.encounterKind === "npc") assert.ok(npc, `${route.name} 第 ${run.floor} 层修士预览必须对应真实 NPC`);
      else assert.equal(preview.encounterKind, "monster", `${route.name} 第 ${run.floor} 层对手类型异常`);
      const permanentBefore = npc ? Object.fromEntries(permanentKeys.map((key) => [key, npc[key]])) : null;
      const assetsBefore = npc ? { xp: npc.xp, spirit: npc.spirit, dust: npc.spiritPearls.dust, defenses: npc.daoTrialDefenses, wins: npc.daoTrialWins } : null;
      const result = advanceDaoTrial(state, { action: "battle" });
      assert.equal(result.replay.right.id, preview.person.id, `${route.name} 第 ${run.floor} 层预览与回放 NPC ID 不一致`);
      assert.equal(result.replay.right.name, preview.name, `${route.name} 第 ${run.floor} 层预览与回放姓名不一致`);
      assert.equal(result.replay.right.power, preview.power, `${route.name} 第 ${run.floor} 层预览与回放投影战力不一致`);
      assert.equal(result.replay.result, "胜", `${route.name} 深层审计玩家不应意外战败`);
      if (npc) {
        assert.deepEqual(Object.fromEntries(permanentKeys.map((key) => [key, npc[key]])), permanentBefore, `${route.name} 战斗不得修改 NPC 永久属性`);
        assert.deepEqual({ xp: npc.xp, spirit: npc.spirit, dust: npc.spiritPearls.dust }, { xp: assetsBefore.xp, spirit: assetsBefore.spirit, dust: assetsBefore.dust }, `${route.name} NPC 败北不得获得资源`);
        assert.deepEqual({ defenses: npc.daoTrialDefenses - assetsBefore.defenses, wins: npc.daoTrialWins - assetsBefore.wins }, { defenses: 1, wins: 0 }, `${route.name} NPC 败北只应记录一次守关`);
        const history = npc.dungeonHistory.find((record) => record.replayId === result.replay.replayId);
        assert.deepEqual({ routeId: history.routeId, floor: history.floor, result: history.result }, { routeId: route.id, floor: run.floor, result: "守关失利" }, `${route.name} NPC 守关历史错误`);
      }
      previews.push({ floor: run.floor, npc: preview.name, basePower: preview.basePower, projectedPower: preview.power });
    } else {
      assert.ok(run.eventOptions.length, `${route.name} 第 ${run.floor} 层应提供路线事件选项`);
      advanceDaoTrial(state, { optionId: run.eventOptions[0].id });
    }
    guard += 1;
  }

  const checkpoint = getPublicState(state).daoTrial.activeRun;
  assert.equal(checkpoint.maxFloor, 20, `${route.name} 应抵达第 20 层检查点`);
  assert.equal(seen.size, 12, `${route.name} 前 20 层应遇到 12 名唯一守关对手`);
  assert.equal(state.daoTrial.activeRun.opponentIds.length, 18, `${route.name} 三十层核心名单应包含 18 名对手`);
  assert.deepEqual(checkpoint.bag, { xp: 14, spirit: 67, dust: 16, milestones: ["入境", "初试", "问心", "深入", "二十层"] }, `${route.name} 前 20 层里程碑与逐战奖励包不一致`);
  const summary = advanceDaoTrial(state, { action: "checkpoint-exit" }).summary;
  assert.equal(summary.routeId, route.id, `${route.name} 结算路线错误`);
  assert.equal(summary.floor, 20, `${route.name} 结算层数错误`);
  assert.equal(summary.opponents.length, 12, `${route.name} 结算应保存 12 场守关战斗`);
  assert.equal(summary.rewards.opponentReward, undefined, `${route.name} 安全离境不得给 NPC 分账`);
  assert.equal(state.daoTrial.routeMastery[route.id].runs, 1, `${route.name} 应增加本路线精通次数`);
  for (const other of daoTrialRoutes.filter((entry) => entry.id !== route.id)) {
    assert.equal(state.daoTrial.routeMastery[other.id].runs, 0, `${route.name} 不得误增 ${other.name} 精通`);
  }
  return { route: route.name, battles: seen.size, bag: checkpoint.bag, score: summary.score, first: previews[0], last: previews.at(-1) };
}

function auditLossSplit(route, routeIndex) {
  let state;
  let internal;
  let preview;
  for (let seed = 0; seed < 80; seed += 1) {
    const candidate = createDefaultState();
    candidate.day = 1 + (routeIndex + seed) * 7;
    candidate.rebirth = 900 + routeIndex * 100 + seed;
    ensureStateShape(candidate);
    startDaoTrial(candidate, { routeId: route.id });
    const candidateRun = candidate.daoTrial.activeRun;
    advanceDaoTrial(candidate, { action: "law", lawId: candidateRun.lawOffer[0] });
    const candidatePreview = getPublicState(candidate).daoTrial.activeRun.opponentPreview;
    if (candidatePreview.encounterKind === "npc") {
      state = candidate;
      internal = candidateRun;
      preview = candidatePreview;
      break;
    }
  }
  assert.ok(state && internal && preview, `${route.name} 应能生成真实 NPC 守关样本`);
  internal.rewards = { xp: 11 + routeIndex, spirit: 13 + routeIndex, dust: 5 + routeIndex, milestones: [] };
  for (const key of ["maxHp", "hp", "attack", "divineSense", "maxMana"]) internal.combatant[key] = 1;
  internal.combatant.defense = 0;
  internal.combatant.mana = 0;
  const npc = state.npcs.find((entry) => entry.id === preview.person.id);
  const before = { xp: npc.xp, spirit: npc.spirit, dust: npc.spiritPearls.dust };
  const result = advanceDaoTrial(state, { action: "battle" });
  const raw = { xp: 11 + routeIndex, spirit: 13 + routeIndex, dust: 5 + routeIndex };
  const playerBase = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Math.floor(value * 0.4)]));
  const npcShare = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, value - playerBase[key]]));
  assert.equal(result.completed, true, `${route.name} 玩家战败应结束本轮`);
  assert.equal(result.summary.defeatedBy.id, npc.id, `${route.name} 应记录实际胜方`);
  assert.deepEqual({ spirit: result.summary.rewards.spirit, dust: result.summary.rewards.dust }, { spirit: playerBase.spirit, dust: playerBase.dust }, `${route.name} 玩家 40% 基础份额错误`);
  assert.deepEqual({ xp: result.summary.rewards.opponentReward.xp, spirit: result.summary.rewards.opponentReward.spirit, dust: result.summary.rewards.opponentReward.dust }, npcShare, `${route.name} NPC 60% 份额错误`);
  assert.deepEqual({ xp: npc.xp - before.xp, spirit: npc.spirit - before.spirit, dust: npc.spiritPearls.dust - before.dust }, npcShare, `${route.name} 胜方 NPC 实际入账错误`);
  return { route: route.name, winner: npc.name, raw, playerBase, npcShare };
}

const deepRuns = daoTrialRoutes.map(auditDeepRun);
const losses = daoTrialRoutes.map(auditLossSplit);

const coverage = Object.fromEntries(daoTrialRoutes.map((route, routeIndex) => {
  const ids = new Set();
  for (let seed = 0; seed < 30; seed += 1) {
    const state = createDefaultState();
    state.day = 1 + seed * 7;
    state.rebirth = 1_200 + routeIndex * 100 + seed;
    ensureStateShape(state);
    startDaoTrial(state, { routeId: route.id });
    ids.add(state.daoTrial.activeRun.opponentIds[0]);
  }
  assert.ok(ids.size >= 15, `${route.name} 30 个种子的首层 NPC 覆盖不足，实际 ${ids.size}`);
  return [route.id, ids.size];
}));

console.log(JSON.stringify({ deepRuns, losses, firstFloorCoverage: coverage }, null, 2));
console.log("dao-trial-route-audit: passed");
