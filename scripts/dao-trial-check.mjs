import assert from "node:assert/strict";
import { daoTrialLaws, daoTrialRoutes, daoTrialSeals, daoTrialSealSchoolResonances } from "../server/daoTrialData.mjs";
import { replayStatMax } from "../web/src/battleReplay.js";
import { advanceDaoTrial, createDefaultState, ensureStateShape, getDaoTrialAnalytics, getPublicReplay, getPublicState, startDaoTrial } from "../server/gameLogic.mjs";

function strengthenPlayer(state, multiplier = 20) {
  for (const key of ["maxHp", "attack", "defense", "divineSense", "maxMana"]) state.player[key] *= multiplier;
  state.player.hp = state.player.maxHp;
  state.player.mana = state.player.maxMana;
}

function strengthenTrialCombatant(state, multiplier = 100) {
  const combatant = state.daoTrial.activeRun.combatant;
  for (const key of ["maxHp", "attack", "defense", "divineSense", "maxMana"]) combatant[key] *= multiplier;
  combatant.hp = combatant.maxHp;
  combatant.mana = combatant.maxMana;
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

function startedNpcTrial({ multiplier = 1, practice = false } = {}) {
  for (let seed = 0; seed < 80; seed += 1) {
    const state = createDefaultState();
    state.day = 8 + seed * 7;
    state.rebirth = 2_000 + seed;
    if (multiplier > 1) strengthenPlayer(state, multiplier);
    ensureStateShape(state);
    if (practice) state.daoTrial.tickets = 0;
    startDaoTrial(state, { routeId: "golden-pass" });
    if (state.daoTrial.activeRun.opponentSnapshots["1"]?.kind === "npc") return state;
  }
  assert.fail("应能通过不同固定种子生成首层 NPC 遭遇");
}

function forcedFailureState({ affixId = "ore-awakening", sealIds = [], requireNpc = false } = {}) {
  const state = requireNpc ? startedNpcTrial() : (() => {
    const fresh = createDefaultState();
    fresh.day = 8;
    ensureStateShape(fresh);
    startDaoTrial(fresh, { routeId: "golden-pass" });
    return fresh;
  })();
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

assert.equal(daoTrialLaws.length, 256, "应配置二百五十六项问道法则");
assert.equal(daoTrialSeals.length, 1024, "应配置一千零二十四项问道道印");
assert.equal(new Set(daoTrialLaws.map((law) => law.id)).size, daoTrialLaws.length, "问道法则 ID 必须唯一");
assert.equal(new Set(daoTrialSeals.map((seal) => seal.id)).size, daoTrialSeals.length, "问道道印 ID 必须唯一");
assert.ok(Object.values(Object.groupBy(daoTrialLaws, (law) => law.school)).every((entries) => entries.length === 32), "八个法则流派应各有三十二项法则");
assert.ok(Object.values(Object.groupBy(daoTrialSeals, (seal) => seal.school)).every((entries) => entries.length === 128), "八个道印流派应各有一百二十八项道印");
assert.equal(daoTrialSealSchoolResonances.length, 24, "八个道印流派应各有 2/4/6 三档共鸣");
for (const law of daoTrialLaws) {
  assert.ok(law.name && law.school && law.trigger && law.text, `${law.id} 缺少展示或触发信息`);
  assert.ok(Object.keys(law.effects || {}).length, `${law.id} 必须包含结构化效果`);
}
for (const seal of daoTrialSeals) {
  assert.ok(seal.name && seal.school && seal.text, `${seal.id} 缺少展示信息`);
  assert.ok(Object.keys(seal.effects || {}).length, `${seal.id} 必须包含结构化效果`);
}

const goldPityState = createDefaultState();
ensureStateShape(goldPityState);
goldPityState.daoTrial.lawPity = { withoutGold: 2, withoutDiamond: 3 };
const goldPityRun = startDaoTrial(goldPityState, { routeId: "golden-pass" }).run;
assert.equal(goldPityRun.lawOffer.length, 3, "等权随机应提供三项法则");

const diamondPityState = createDefaultState();
ensureStateShape(diamondPityState);
diamondPityState.daoTrial.lawPity = { withoutGold: 2, withoutDiamond: 12 };
const diamondPityRun = startDaoTrial(diamondPityState, { routeId: "golden-pass" }).run;
assert.equal(diamondPityRun.lawOffer.length, 3, "等权随机应提供三项法则");
assert.equal(new Set(diamondPityRun.lawOffer.map((law) => law.id)).size, diamondPityRun.lawOffer.length, "单次法则选择不得重复");
assert.deepEqual(diamondPityRun.lawRarityRates, { silver: 62.5, gold: 25, diamond: 12.5 }, "品质概率应按等权条目池的实际数量公开");
assert.equal(diamondPityState.daoTrial.discoveredLawIds.length, 3, "展示的法则应立即进入发现记录");
assert.deepEqual(diamondPityState.daoTrial.recentLawOfferIds.slice(-3), diamondPityRun.lawOffer.map((law) => law.id), "最近展示记录应保存本次法则选项");

const practicePityState = createDefaultState();
ensureStateShape(practicePityState);
practicePityState.daoTrial.tickets = 0;
practicePityState.daoTrial.lawPity = { withoutGold: 1, withoutDiamond: 5 };
startDaoTrial(practicePityState, { routeId: "golden-pass" });
assert.deepEqual(practicePityState.daoTrial.lawPity, { withoutGold: 1, withoutDiamond: 5 }, "演练不应推进法则保底计数");

const resonanceState = createDefaultState();
const resonanceRoot = getPublicState(resonanceState).catalog.roots.find((root) => root.key === "earth");
resonanceState.player.root = resonanceRoot;
resonanceState.player.roots = [resonanceRoot];
resonanceState.player.primaryRootKey = resonanceRoot.key;
strengthenPlayer(resonanceState);
ensureStateShape(resonanceState);
startDaoTrial(resonanceState, { routeId: "golden-pass" });
resonanceState.daoTrial.activeRun.lawOffer = [];
resonanceState.daoTrial.activeRun.sealIds = ["edge-intent", "star-edge"];
const resonanceOpponent = resonanceState.daoTrial.activeRun.opponentSnapshots["1"];
resonanceOpponent.root = { ...resonanceRoot };
resonanceOpponent.roots = [{ ...resonanceRoot }];
resonanceOpponent.primaryRootKey = resonanceRoot.key;
const resonancePublic = getPublicState(resonanceState).daoTrial.activeRun;
assert.ok(resonancePublic.synergies.some((entry) => entry.id === "school-attack-2"), "持有两枚攻伐道印应激活第一档流派共鸣");
assert.deepEqual(resonancePublic.resonanceProgress.find((entry) => entry.school === "攻伐"), { school: "攻伐", count: 2, activeThreshold: 2, nextThreshold: 4, complete: false }, "应公开下一档共鸣进度");
const resonanceBaseAttack = resonanceState.daoTrial.activeRun.combatant.attack;
const resonanceBattle = advanceDaoTrial(resonanceState, { action: "battle" });
assert.equal(resonanceBattle.replay.left.stats.attack, Math.floor(resonanceBaseAttack * 1.19), "两枚攻伐道印应叠加自身 16% 攻击与第一档 3% 共鸣效果");
const resonanceSealOffer = getPublicState(resonanceState).daoTrial.activeRun.sealOffer;
assert.equal(new Set(resonanceSealOffer.map((seal) => seal.id)).size, resonanceSealOffer.length, "单次道印选择不得重复");
assert.ok(resonanceSealOffer.every((seal) => resonanceState.daoTrial.discoveredSealIds.includes(seal.id)), "展示的道印应立即进入发现记录");

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
const lawBattlePreview = getPublicState(lawBattleState).daoTrial.activeRun.opponentPreview;
const deterministicBattleState = structuredClone(lawBattleState);
const worldBaselineState = structuredClone(lawBattleState);
const lawBattle = advanceDaoTrial(lawBattleState, { action: "battle" });
const repeatedBattle = advanceDaoTrial(deterministicBattleState, { action: "battle" });
assert.ok(lawBattlePreview?.power > 0 && lawBattlePreview?.threat?.label, "战斗前应公开守关修士的投影战力和危险等级");
assert.equal(lawBattlePreview.person.id, lawBattle.replay.right.id, "战前预览与实际出战 NPC 必须一致");
assert.equal(lawBattlePreview.name, lawBattle.replay.right.name, "战前预览与实际出战 NPC 名字必须一致");
assert.equal(lawBattlePreview.power, lawBattle.replay.right.power, "战前预览与实际出战 NPC 投影战力必须一致");
assert.ok(lawBattle.replay.events.some((event) => event.kind === "law" && event.lawId === "triple-edge"), "剑鸣三叠应在第三次普通攻击后产生法则事件");
assert.deepEqual(repeatedBattle.replay.right, lawBattle.replay.right, "同周期同路线同层 NPC 投影必须稳定可复现");
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
assert.deepEqual(worldMutationBattle.replay.right, lawBattle.replay.right, "守关 NPC 应使用入场快照，不应被中途改属性影响");

const normalFailure = advanceDaoTrial(forcedFailureState(), { action: "battle" }).summary;
const affixFailure = advanceDaoTrial(forcedFailureState({ affixId: "borrowed-fate" }), { action: "battle" }).summary;
const sealFailure = advanceDaoTrial(forcedFailureState({ sealIds: ["last-light"] }), { action: "battle" }).summary;
const reducedScoreFailure = advanceDaoTrial(forcedFailureState({ affixId: "silent-bell" }), { action: "battle" }).summary;
assert.equal(normalFailure.score, 135, "基础失败分应保留原始分数");
assert.equal(affixFailure.score, 176, "借命一线应使失败分提高 30%");
assert.equal(sealFailure.score, 162, "末光印应使失败分提高 20%");
assert.equal(reducedScoreFailure.score, 128, "无声古钟应使结算分数降低 5%");

const npcWinState = forcedFailureState({ requireNpc: true });
npcWinState.daoTrial.activeRun.rewards = { xp: 11, spirit: 13, dust: 5, milestones: ["测试"] };
const npcWinOpponentId = npcWinState.daoTrial.activeRun.opponentSnapshots["1"].npcId;
const npcWinOpponent = npcWinState.npcs.find((npc) => npc.id === npcWinOpponentId);
const uninvolvedNpc = npcWinState.npcs.find((npc) => npc.id !== npcWinOpponentId);
const uninvolvedAssets = { xp: uninvolvedNpc.xp, spirit: uninvolvedNpc.spirit, dust: uninvolvedNpc.spiritPearls.dust };
const npcPermanentStats = Object.fromEntries(["realm", "layer", "maxHp", "hp", "attack", "defense", "divineSense", "maxMana", "mana"].map((key) => [key, npcWinOpponent[key]]));
const npcAssetsBefore = {
  xp: npcWinOpponent.xp,
  spirit: npcWinOpponent.spirit,
  dust: npcWinOpponent.spiritPearls.dust,
  defenses: npcWinOpponent.daoTrialDefenses,
  wins: npcWinOpponent.daoTrialWins
};
const npcWinResult = advanceDaoTrial(npcWinState, { action: "battle" });
assert.equal(npcWinResult.completed, true, "玩家战败后应立即结束本轮问道");
assert.deepEqual(
  { xp: npcWinResult.summary.rewards.opponentReward.xp, spirit: npcWinResult.summary.rewards.opponentReward.spirit, dust: npcWinResult.summary.rewards.opponentReward.dust },
  { xp: 7, spirit: 8, dust: 3 },
  "NPC 获胜时应取得原始奖励包扣除玩家 40% 基础份额后的全部余数"
);
assert.equal(npcWinResult.summary.rewards.opponentReward.opponent.id, npcWinOpponentId, "奖励必须发给实际击败玩家的 NPC");
assert.equal(npcWinResult.summary.defeatedBy.id, npcWinOpponentId, "结算摘要应公开实际击败玩家的 NPC");
assert.deepEqual({ spirit: npcWinResult.summary.rewards.spirit, dust: npcWinResult.summary.rewards.dust }, { spirit: 5, dust: 2 }, "玩家战败时基础灵石与灵尘应精确保留原始行囊的 40%");
assert.deepEqual({
  xp: npcWinOpponent.xp - npcAssetsBefore.xp,
  spirit: npcWinOpponent.spirit - npcAssetsBefore.spirit,
  dust: npcWinOpponent.spiritPearls.dust - npcAssetsBefore.dust,
  defenses: npcWinOpponent.daoTrialDefenses - npcAssetsBefore.defenses,
  wins: npcWinOpponent.daoTrialWins - npcAssetsBefore.wins
}, { xp: 7, spirit: 8, dust: 3, defenses: 1, wins: 1 }, "胜方 NPC 的资源、守关和胜场数据应精确入账");
assert.deepEqual({ xp: uninvolvedNpc.xp, spirit: uninvolvedNpc.spirit, dust: uninvolvedNpc.spiritPearls.dust }, uninvolvedAssets, "未参与最终胜负的 NPC 不得收到分账");
assert.deepEqual(
  Object.fromEntries(Object.keys(npcPermanentStats).map((key) => [key, npcWinOpponent[key]])),
  npcPermanentStats,
  "秘境投影和战斗不得修改 NPC 的境界、气血、法力或永久战斗属性"
);
const npcWinHistory = npcWinOpponent.dungeonHistory.find((record) => record.type === "dao-trial-defense" && record.replayId === npcWinResult.replay.replayId);
assert.deepEqual({ result: npcWinHistory.result, xp: npcWinHistory.xp, spirit: npcWinHistory.spirit, dust: npcWinHistory.dust }, { result: "守关得胜", xp: 7, spirit: 8, dust: 3 }, "NPC 守关历史应保存胜负和实际所得");
assert.throws(() => advanceDaoTrial(npcWinState, { action: "battle" }), /没有进行中的问道/, "已结算挑战不得重复触发 NPC 奖励");

const playerWinState = startedNpcTrial({ multiplier: 100 });
playerWinState.daoTrial.activeRun.lawOffer = [];
const playerWinOpponentId = playerWinState.daoTrial.activeRun.opponentSnapshots["1"].npcId;
const playerWinOpponent = playerWinState.npcs.find((npc) => npc.id === playerWinOpponentId);
const playerWinAssets = { xp: playerWinOpponent.xp, spirit: playerWinOpponent.spirit, dust: playerWinOpponent.spiritPearls.dust, defenses: playerWinOpponent.daoTrialDefenses, wins: playerWinOpponent.daoTrialWins };
const playerWinResult = advanceDaoTrial(playerWinState, { action: "battle" });
assert.equal(playerWinResult.replay.result, "胜", "强化后的玩家应击败首层守关 NPC");
assert.deepEqual({ xp: playerWinOpponent.xp, spirit: playerWinOpponent.spirit, dust: playerWinOpponent.spiritPearls.dust }, { xp: playerWinAssets.xp, spirit: playerWinAssets.spirit, dust: playerWinAssets.dust }, "NPC 败北时不得获得资源");
assert.deepEqual({ defenses: playerWinOpponent.daoTrialDefenses - playerWinAssets.defenses, wins: playerWinOpponent.daoTrialWins - playerWinAssets.wins }, { defenses: 1, wins: 0 }, "正式挑战中败北的 NPC 只记录参与，不增加守关胜场");

const practiceNpcState = startedNpcTrial({ practice: true });
practiceNpcState.daoTrial.activeRun.lawOffer = [];
practiceNpcState.daoTrial.activeRun.rewards = { xp: 11, spirit: 13, dust: 5, milestones: [] };
for (const key of ["maxHp", "hp", "attack", "divineSense", "maxMana"]) practiceNpcState.daoTrial.activeRun.combatant[key] = 1;
practiceNpcState.daoTrial.activeRun.combatant.defense = 0;
practiceNpcState.daoTrial.activeRun.combatant.mana = 0;
const practiceOpponentId = practiceNpcState.daoTrial.activeRun.opponentSnapshots["1"].npcId;
const practiceOpponent = practiceNpcState.npcs.find((npc) => npc.id === practiceOpponentId);
const practiceAssets = { xp: practiceOpponent.xp, spirit: practiceOpponent.spirit, dust: practiceOpponent.spiritPearls.dust, defenses: practiceOpponent.daoTrialDefenses, wins: practiceOpponent.daoTrialWins, history: practiceOpponent.dungeonHistory.length };
const practiceResult = advanceDaoTrial(practiceNpcState, { action: "battle" });
assert.equal(practiceResult.summary.rewards.opponentReward, undefined, "无奖励演练中 NPC 获胜也不得分账");
assert.deepEqual({ xp: practiceOpponent.xp, spirit: practiceOpponent.spirit, dust: practiceOpponent.spiritPearls.dust, defenses: practiceOpponent.daoTrialDefenses, wins: practiceOpponent.daoTrialWins, history: practiceOpponent.dungeonHistory.length }, practiceAssets, "演练不得刷取 NPC 资源、参与次数、胜场或历史");

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

function publicTrialSkillComparison(lawId, skillId) {
  const state = createDefaultState();
  ensureStateShape(state);
  state.player.skillId = skillId;
  startDaoTrial(state, { routeId: "golden-pass" });
  state.daoTrial.activeRun.lawOffer = [];
  state.daoTrial.activeRun.lawIds = [lawId];
  return getPublicState(state).daoTrial.activeRun.combatModifiers.skill;
}

const piercingSkill = publicTrialSkillComparison("armor-sunder-law", "thunder_pearl");
assert.ok(piercingSkill.effectComparisons.find((entry) => entry.key === "pierce").current > 0.45, "技能效果加成应同时提高破防比例");
const numericSkill = publicTrialSkillComparison("armor-sunder-law", "soul_hook");
assert.ok(numericSkill.effectComparisons.find((entry) => entry.key === "burn").current > 14, "技能效果加成应同时提高法力削减数值");
const healingSkill = publicTrialSkillComparison("armor-sunder-law", "wood_recovery");
assert.ok(healingSkill.effectComparisons.find((entry) => entry.key === "percent").current > 0.22, "技能效果加成应同时提高治疗比例");

function delayedActionSkillBattle(skillId) {
  const state = createDefaultState();
  ensureStateShape(state);
  startDaoTrial(state, { routeId: "golden-pass" });
  const run = state.daoTrial.activeRun;
  run.lawOffer = [];
  run.combatant.skillId = skillId;
  run.combatant.attack = 5;
  run.combatant.defense = 100;
  run.combatant.maxHp = 2_000;
  run.combatant.hp = 2_000;
  run.combatant.divineSense = 1;
  run.combatant.maxMana = 1_000;
  run.combatant.mana = 1_000;
  return advanceDaoTrial(state, { action: "battle" }).replay.events;
}

assert.ok(delayedActionSkillBattle("blood_escape").some((event) => event.kind === "dodge"), "血影遁应在后手施放时保留到下一次受击");
assert.ok(delayedActionSkillBattle("magnetic_light").some((event) => event.kind === "status" && event.text.includes("错过一次行动")), "眩晕应在后手施放时保留到目标下一次行动");

const openingBattle = dynamicLawBattle("opening-break", "thunder_pearl");
assert.equal(openingBattle.result.replay.events.filter((event) => event.lawId === "opening-break").length, 1, "破势追击只能强化首次符合条件的技能");
const steadyBattle = dynamicLawBattle("steady-heart", "thunder_pearl");
assert.ok(steadyBattle.result.replay.events.some((event) => event.lawId === "steady-heart"), "守中不乱应按回合生成减伤法则事件");
const poisonBattle = dynamicLawBattle("poison-formation", "poison_flame");
assert.ok(poisonBattle.result.replay.events.some((event) => event.lawId === "poison-formation"), "毒经成势应在持续伤害施加后叠层");
const echoBattle = Array.from({ length: 12 }, (_, index) => dynamicLawBattle("spell-echo", "thunder_pearl", `|echo-${index}`))
  .find((entry) => entry.result.replay.events.some((event) => event.lawId === "spell-echo"));
assert.ok(echoBattle, "术后余音应按确定性概率产生额外伤害事件");
const expandedEchoBattle = Array.from({ length: 20 }, (_, index) => dynamicLawBattle("arcane-overflow", "thunder_pearl", `|expanded-echo-${index}`))
  .find((entry) => entry.result.replay.events.some((event) => event.lawId === "arcane-overflow"));
assert.ok(expandedEchoBattle, "新法则复用术法余波机制时，战斗日志应记录实际法则来源");
assert.ok(expandedEchoBattle.result.replay.events.filter((event) => event.kind === "law").every((event) => event.lawId !== "spell-echo"), "未持有术后余音时不得错误记录旧法则 ID");
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

const warmCurrentState = createDefaultState();
ensureStateShape(warmCurrentState);
startDaoTrial(warmCurrentState, { routeId: "golden-pass" });
const warmCurrentRun = warmCurrentState.daoTrial.activeRun;
warmCurrentRun.affixId = "heart-echo";
warmCurrentRun.lawOffer = [];
warmCurrentRun.sealIds = ["warm-current"];
warmCurrentRun.nodes[0] = { id: "warm-rest", name: "暖流调息测试", type: "rest", event: "gold-spring", floor: 1 };
warmCurrentRun.combatant.maxHp = 1_000;
warmCurrentRun.combatant.hp = 500;
advanceDaoTrial(warmCurrentState, { optionId: "heal" });
assert.equal(warmCurrentRun.combatant.hp, 913, "暖流印的调息恢复应按描述提高 18%");

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
assert.equal(rolloverState.daoTrial.history[0].rewards.opponentReward, undefined, "周期结束自动结算不得向 NPC 发放奖励");
assert.equal(rolloverState.daoTrial.routeMastery["golden-pass"].runs, 1, "周期结束应计入路线精通次数");

const routeState = createDefaultState();
strengthenPlayer(routeState);
ensureStateShape(routeState);
const routePublic = getPublicState(routeState).daoTrial;
const expectedCorePattern = [
  "battle", "event", "battle", "rest", "elite",
  "battle", "event", "battle", "rest", "boss",
  "battle", "event", "elite", "rest", "boss"
];
for (const route of routePublic.routes) {
  assert.equal(route.nodes.length, 15, `${route.id} 必须生成十五个核心层`);
  assert.deepEqual(
    route.nodes.map((node) => node.boss ? "boss" : node.elite ? "elite" : node.type),
    expectedCorePattern,
    `${route.id} 必须遵循固定的战斗、取舍和调息节奏`
  );
  assert.deepEqual(route.nodes.map((node, index) => node.boss ? index + 1 : 0).filter(Boolean), [10, 15], `${route.id} 应在 10/15 层生成首领`);
  assert.deepEqual(route.nodes.map((node, index) => node.elite ? index + 1 : 0).filter(Boolean), [5, 13], `${route.id} 应在 5/13 层生成精英`);
}

const opponentRosterState = createDefaultState();
strengthenPlayer(opponentRosterState, 20);
ensureStateShape(opponentRosterState);
const rosterCompanion = getPublicState(opponentRosterState).daoTrial.companions[0];
startDaoTrial(opponentRosterState, { routeId: "golden-pass", companionId: rosterCompanion.person.id });
const coreOpponentIds = [...opponentRosterState.daoTrial.activeRun.opponentIds];
assert.equal(coreOpponentIds.length, 9, "十五层核心路线的九个战斗节点应预先分配九名真实 NPC");
assert.equal(new Set(coreOpponentIds).size, 9, "同一轮核心路线不得重复出现同一名守关 NPC");
assert.ok(!coreOpponentIds.includes(rosterCompanion.person.id), "同行修士不得被选为本轮守关 NPC");
const rosterReload = structuredClone(opponentRosterState);
assert.deepEqual(
  getPublicState(rosterReload).daoTrial.activeRun.opponentPreview,
  getPublicState(opponentRosterState).daoTrial.activeRun.opponentPreview,
  "存档重载后当前层的 NPC 身份和投影属性必须保持一致"
);

const seededOpponentIds = new Set();
for (let index = 0; index < 36; index += 1) {
  const state = createDefaultState();
  state.day = index * 7 + 1;
  ensureStateShape(state);
  startDaoTrial(state, { routeId: daoTrialRoutes[index % daoTrialRoutes.length].id });
  seededOpponentIds.add(state.daoTrial.activeRun.opponentIds[0]);
}
assert.ok(seededOpponentIds.size >= 18, `固定种子抽取应覆盖足够广的 NPC，实际覆盖 ${seededOpponentIds.size}/36`);

const npcPressureState = createDefaultState();
for (const npc of npcPressureState.npcs) {
  for (const key of ["maxHp", "attack", "defense", "divineSense", "maxMana"]) npc[key] *= 100;
}
ensureStateShape(npcPressureState);
const npcPressureStart = startDaoTrial(npcPressureState, { routeId: "golden-pass" }).run;
if (npcPressureStart.opponentPreview.encounterKind === "npc") {
  assert.ok(npcPressureStart.opponentPreview.projectionPercent >= 0, "真实 NPC 投影不得向下削弱");
} else {
  assert.ok(npcPressureStart.opponentPreview.powerRatio <= 90, "首层妖物应按渐进曲线生成，不应直接形成碾压");
}
const pressureRun = npcPressureState.daoTrial.activeRun;
pressureRun.lawOffer = [];
pressureRun.nodeIndex = 4;
pressureRun.floor = 5;
const floorFivePreview = getPublicState(npcPressureState).daoTrial.activeRun.opponentPreview;
if (floorFivePreview.encounterKind === "npc") {
  assert.ok(floorFivePreview.projectionPercent >= 0, "第五层真实 NPC 投影不得向下削弱");
} else {
  assert.ok(floorFivePreview.powerRatio >= 55 && floorFivePreview.powerRatio <= 110, "第五层精英妖物应接近玩家入场战力，不应直接形成碾压");
}
pressureRun.combatant.hp = Math.max(1, Math.floor(pressureRun.combatant.maxHp * 0.2));
pressureRun.combatant.mana = Math.floor(pressureRun.combatant.maxMana * 0.1);
const depletedPreview = getPublicState(npcPressureState).daoTrial.activeRun.opponentPreview;
assert.ok(depletedPreview.playerPower < depletedPreview.playerMaxPower, "战前预览应按当前气血与法力降低玩家状态战力");

startDaoTrial(routeState, { routeId: daoTrialRoutes[0].id });
strengthenTrialCombatant(routeState);
const initialOpponentSnapshots = structuredClone(routeState.daoTrial.activeRun.opponentSnapshots);
let active = getPublicState(routeState).daoTrial.activeRun;
assert.equal(active.lawOffer.length, 3, "入境应先提供三项问道法则");
active = reachCheckpoint(routeState, 5);
assert.equal(active.maxFloor, 5, "第一阶段应记录通过五层");
assert.deepEqual(active.bag, { xp: 4, spirit: 15, dust: 2, milestones: ["入境", "精英"] }, "前五层日常奖励应包含受控的战斗掉落与里程碑奖励");
assert.equal(active.scoreBreakdown.progress, 700, "前五层进度分应为 100+120+140+160+180");
assert.ok(active.scoreBreakdown.quality > 0, "战斗层应产生表现分");
const floorFiveScore = active.score;
assert.deepEqual(active.checkpointRecovery, { hpPercent: 25, manaPercent: 35 }, "检查点应公开继续挑战的恢复比例");
const recoveryState = structuredClone(routeState);
const recoveryRun = recoveryState.daoTrial.activeRun;
recoveryRun.combatant.hp = 1;
recoveryRun.combatant.mana = 0;
const expectedRecoveredHp = 1 + Math.floor(recoveryRun.combatant.maxHp * 0.25);
const expectedRecoveredMana = Math.floor(recoveryRun.combatant.maxMana * 0.35);
advanceDaoTrial(recoveryState, { action: "continue" });
assert.equal(recoveryRun.combatant.hp, expectedRecoveredHp, "继续挑战应恢复最大气血的 25%");
assert.equal(recoveryRun.combatant.mana, expectedRecoveredMana, "继续挑战应恢复最大法力的 35%");
const cappedRecoveryState = structuredClone(routeState);
const cappedRecoveryRun = cappedRecoveryState.daoTrial.activeRun;
cappedRecoveryRun.combatant.hp = cappedRecoveryRun.combatant.maxHp - 1;
cappedRecoveryRun.combatant.mana = cappedRecoveryRun.combatant.maxMana - 1;
advanceDaoTrial(cappedRecoveryState, { action: "continue" });
assert.equal(cappedRecoveryRun.combatant.hp, cappedRecoveryRun.combatant.maxHp, "检查点气血恢复不得超过上限");
assert.equal(cappedRecoveryRun.combatant.mana, cappedRecoveryRun.combatant.maxMana, "检查点法力恢复不得超过上限");
advanceDaoTrial(routeState, { action: "continue" });
active = reachCheckpoint(routeState, 10);
assert.deepEqual(active.bag, { xp: 7, spirit: 44, dust: 7, milestones: ["入境", "精英", "问心"] }, "前十层累计奖励应正确叠加战斗掉落与里程碑奖励");
assert.ok(active.score > floorFiveScore, "更深层数的总分必须严格提高");
advanceDaoTrial(routeState, { action: "continue" });
active = reachCheckpoint(routeState, 15);
assert.equal(active.maxFloor, 15, "应完成十五层核心秘境");
assert.deepEqual(active.bag, { xp: 10, spirit: 72, dust: 10, milestones: ["入境", "精英", "问心", "归一"] }, "炼气十五层奖励应精确包含封顶后的战斗掉落和里程碑奖励");
advanceDaoTrial(routeState, { action: "continue" });
active = getPublicState(routeState).daoTrial.activeRun;
assert.equal(active.floor, 16, "十五层后应进入第十六层问天阶");
assert.equal(active.nodes.length, 20, "问天阶应按五层继续扩展节点");
assert.equal(active.endless, true, "第十六层应标记为问天阶");
assert.equal(routeState.daoTrial.activeRun.opponentIds.length, 12, "扩展至二十层后应新增三名不重复守关 NPC");
assert.equal(new Set(routeState.daoTrial.activeRun.opponentIds).size, 12, "问天阶新增的守关 NPC 不得与前十五层重复");
assert.deepEqual(
  Object.fromEntries(Object.entries(routeState.daoTrial.activeRun.opponentSnapshots).filter(([floor]) => Number(floor) <= 15)),
  initialOpponentSnapshots,
  "扩展问天阶时不得改写核心层已经确定的 NPC 快照"
);
active = reachCheckpoint(routeState, 20);
assert.deepEqual(active.bag, { xp: 10, spirit: 72, dust: 10, milestones: ["入境", "精英", "问心", "归一"] }, "问天阶只应提供分数与纪录，不得让单张问道签无限产出资源");

const exitState = createDefaultState();
strengthenPlayer(exitState);
ensureStateShape(exitState);
startDaoTrial(exitState, { routeId: "golden-pass" });
strengthenTrialCombatant(exitState);
const exitRun = reachCheckpoint(exitState, 5);
const earnedScore = exitRun.score;
const exitResult = advanceDaoTrial(exitState, { action: "checkpoint-exit" });
assert.equal(exitResult.summary.score, earnedScore, "安全离境不得折损已经取得的分数");
assert.equal(exitResult.summary.rewards.retention, 1.2, "检查点安全离境应按 120% 结算奖励");
assert.deepEqual({ xp: exitResult.summary.rewards.xp, spirit: exitResult.summary.rewards.spirit, dust: exitResult.summary.rewards.dust }, { xp: 4, spirit: 18, dust: 2 }, "炼气五层安全收功后的实际入账应保持克制");
assert.equal(exitResult.summary.floor, 5, "历史应保存最深层数");
assert.equal(exitResult.summary.rewards.opponentReward, undefined, "主动安全离境不得向任何 NPC 发放奖励");
const exitPublic = getPublicState(exitState).daoTrial;
assert.equal(exitPublic.rankings.overall.floor, 5, "综合最佳记录应按层数派生");
assert.equal(exitPublic.rankings.solo.floor, 5, "独行挑战应进入独行最佳记录");
assert.equal(exitPublic.yearGoals.deepestFloor, 5, "年度问道志应记录最深层数");
exitState.daoTrial.history.push({ ...exitResult.summary, id: "previous-cycle-best", cycle: exitState.daoTrial.cycle - 1, floor: 99, score: 99_999 });
assert.equal(getPublicState(exitState).daoTrial.rankings.overall.cycle, exitState.daoTrial.cycle, "本期排行不得混入往期高分记录");

const foundationRewardState = createDefaultState();
foundationRewardState.player.realm = 18;
strengthenPlayer(foundationRewardState);
ensureStateShape(foundationRewardState);
startDaoTrial(foundationRewardState, { routeId: "golden-pass" });
strengthenTrialCombatant(foundationRewardState);
const foundationRewardRun = reachCheckpoint(foundationRewardState, 15);
assert.deepEqual(foundationRewardRun.bag, { xp: 10, spirit: 81, dust: 10, milestones: ["入境", "精英", "问心", "归一"] }, "筑基日常问道的境界成长应集中在适量灵石，不得额外放大修为和灵尘");
const foundationRewardResult = advanceDaoTrial(foundationRewardState, { action: "checkpoint-exit" });
assert.deepEqual({ xp: foundationRewardResult.summary.rewards.xp, spirit: foundationRewardResult.summary.rewards.spirit, dust: foundationRewardResult.summary.rewards.dust }, { xp: 12, spirit: 97, dust: 12 }, "筑基十五层安全收功应精确结算受控的战斗与里程碑奖励");

const masteryState = createDefaultState();
ensureStateShape(masteryState);
masteryState.daoTrial.routeMastery["golden-pass"].clears = 4;
const masteryStart = startDaoTrial(masteryState, { routeId: "golden-pass" }).run;
assert.ok(masteryStart.insight >= 2, "二级路线精通应提供额外悟机");
assert.ok(masteryStart.freeRerolls >= 1, "四级路线精通应提供免费重观");

function finishSyntheticHarmonyRun(state, routeId, floor = 15) {
  state.daoTrial.tickets = 1;
  startDaoTrial(state, { routeId });
  const run = state.daoTrial.activeRun;
  run.lawOffer = [];
  run.pendingSealIds = [];
  run.nodesCleared = floor;
  run.maxFloor = floor;
  run.checkpointFloor = floor;
  run.checkpointPending = true;
  return advanceDaoTrial(state, { action: "checkpoint-exit" }).summary;
}

const harmonyState = createDefaultState();
ensureStateShape(harmonyState);
const harmonyStartingAssets = { xp: harmonyState.player.xp, spirit: harmonyState.player.spirit, dust: harmonyState.player.spiritPearls.dust };
const harmonyInitial = getPublicState(harmonyState).daoTrial;
assert.equal(harmonyInitial.harmony.progress, 0, "新一期三脉合参应从零开始");
assert.deepEqual(harmonyInitial.harmony.milestones.map((milestone) => milestone.target), [15, 30, 45], "三脉合参应提供 15/30/45 三档奖励");

const foundationHarmonyState = createDefaultState();
foundationHarmonyState.player.realm = 18;
ensureStateShape(foundationHarmonyState);
assert.deepEqual(getPublicState(foundationHarmonyState).daoTrial.harmony.milestones.map((milestone) => milestone.reward.spirit), [10, 15, 22], "筑基九层应按筑基大境界统一计算三档灵石奖励，不得随小境界产生小数倍率");

const harmonyGold = finishSyntheticHarmonyRun(harmonyState, "golden-pass");
assert.deepEqual(harmonyGold.harmonyRewards, { xp: 0, spirit: 8, dust: 1, milestones: [{ id: "harmony-15", target: 15, label: "初窥三脉" }] }, "首条路线十五层应领取第一档合参奖励");
assert.equal(getPublicState(harmonyState).daoTrial.harmony.progress, 15, "单条路线对合参最多贡献十五层");

const harmonyGoldRepeat = finishSyntheticHarmonyRun(harmonyState, "golden-pass");
assert.equal(harmonyGoldRepeat.harmonyRewards, null, "重复同一路线不得重复领取合参奖励");
assert.equal(getPublicState(harmonyState).daoTrial.harmony.progress, 15, "重复同一路线不得继续提高合参进度");

const harmonyWind = finishSyntheticHarmonyRun(harmonyState, "wind-thunder-path");
assert.deepEqual(harmonyWind.harmonyRewards, { xp: 2, spirit: 12, dust: 1, milestones: [{ id: "harmony-30", target: 30, label: "两脉互证" }] }, "第二条路线十五层应领取第二档合参奖励");
const harmonyMarsh = finishSyntheticHarmonyRun(harmonyState, "nether-marsh");
assert.deepEqual(harmonyMarsh.harmonyRewards, { xp: 3, spirit: 18, dust: 2, milestones: [{ id: "harmony-45", target: 45, label: "三脉归一" }] }, "三条路线十五层应领取最终合参奖励");
const harmonyComplete = getPublicState(harmonyState).daoTrial.harmony;
assert.equal(harmonyComplete.progress, 45, "三条路线全部达到十五层时合参应满进度");
assert.ok(harmonyComplete.milestones.every((milestone) => milestone.claimed), "三档合参奖励应全部标记为已领取");
assert.deepEqual({
  xp: harmonyState.player.xp - harmonyStartingAssets.xp,
  spirit: harmonyState.player.spirit - harmonyStartingAssets.spirit,
  dust: harmonyState.player.spiritPearls.dust - harmonyStartingAssets.dust
}, { xp: 5, spirit: 38, dust: 4 }, "第一期三档合参奖励应精确入账修为 5、灵石 38、灵尘 4");

const harmonyPreviousCycle = harmonyState.daoTrial.cycle;
const harmonyAssetsBeforeRollover = { xp: harmonyState.player.xp, spirit: harmonyState.player.spirit, dust: harmonyState.player.spiritPearls.dust };
harmonyState.day = harmonyState.daoTrial.cycleEndDay + 1;
ensureStateShape(harmonyState);
assert.equal(harmonyState.daoTrial.cycle, harmonyPreviousCycle + 1, "跨七日周期应进入下一期问道");
assert.equal(getPublicState(harmonyState).daoTrial.harmony.progress, 0, "换期后合参进度应重置");
assert.deepEqual(harmonyState.daoTrial.claimedHarmonyMilestones, [], "换期后合参领取状态应重置");
assert.deepEqual({ xp: harmonyState.player.xp, spirit: harmonyState.player.spirit, dust: harmonyState.player.spiritPearls.dust }, harmonyAssetsBeforeRollover, "一期结束时不得重复发放已经领取的合参奖励");

const secondCycleStartingAssets = { xp: harmonyState.player.xp, spirit: harmonyState.player.spirit, dust: harmonyState.player.spiritPearls.dust };
finishSyntheticHarmonyRun(harmonyState, "golden-pass");
finishSyntheticHarmonyRun(harmonyState, "wind-thunder-path");
finishSyntheticHarmonyRun(harmonyState, "nether-marsh");
assert.deepEqual({
  xp: harmonyState.player.xp - secondCycleStartingAssets.xp,
  spirit: harmonyState.player.spirit - secondCycleStartingAssets.spirit,
  dust: harmonyState.player.spiritPearls.dust - secondCycleStartingAssets.dust
}, { xp: 5, spirit: 38, dust: 4 }, "第二期应可重新领取完整三档合参奖励");
assert.equal(getPublicState(harmonyState).daoTrial.harmony.progress, 45, "第二期三路线记录必须独立计算为 45 点");

const incompleteHarmonyState = createDefaultState();
ensureStateShape(incompleteHarmonyState);
const incompleteStartingAssets = { xp: incompleteHarmonyState.player.xp, spirit: incompleteHarmonyState.player.spirit, dust: incompleteHarmonyState.player.spiritPearls.dust };
finishSyntheticHarmonyRun(incompleteHarmonyState, "golden-pass", 5);
finishSyntheticHarmonyRun(incompleteHarmonyState, "wind-thunder-path", 4);
finishSyntheticHarmonyRun(incompleteHarmonyState, "nether-marsh", 5);
assert.equal(getPublicState(incompleteHarmonyState).daoTrial.harmony.progress, 14, "未达第一档时合参应准确记录 14 点");
incompleteHarmonyState.day = incompleteHarmonyState.daoTrial.cycleEndDay + 1;
ensureStateShape(incompleteHarmonyState);
assert.deepEqual({
  xp: incompleteHarmonyState.player.xp - incompleteStartingAssets.xp,
  spirit: incompleteHarmonyState.player.spirit - incompleteStartingAssets.spirit,
  dust: incompleteHarmonyState.player.spiritPearls.dust - incompleteStartingAssets.dust
}, { xp: 0, spirit: 0, dust: 0 }, "一期结束时未达到 15 点不得误发合参奖励");

const rolloverHarmonyState = createDefaultState();
ensureStateShape(rolloverHarmonyState);
finishSyntheticHarmonyRun(rolloverHarmonyState, "golden-pass", 10);
finishSyntheticHarmonyRun(rolloverHarmonyState, "wind-thunder-path", 4);
const rolloverHarmonyStartingAssets = { xp: rolloverHarmonyState.player.xp, spirit: rolloverHarmonyState.player.spirit, dust: rolloverHarmonyState.player.spiritPearls.dust };
rolloverHarmonyState.daoTrial.tickets = 1;
startDaoTrial(rolloverHarmonyState, { routeId: "nether-marsh" });
rolloverHarmonyState.daoTrial.activeRun.lawOffer = [];
rolloverHarmonyState.daoTrial.activeRun.nodesCleared = 1;
rolloverHarmonyState.daoTrial.activeRun.maxFloor = 1;
rolloverHarmonyState.day = rolloverHarmonyState.daoTrial.cycleEndDay + 1;
ensureStateShape(rolloverHarmonyState);
assert.deepEqual({
  xp: rolloverHarmonyState.player.xp - rolloverHarmonyStartingAssets.xp,
  spirit: rolloverHarmonyState.player.spirit - rolloverHarmonyStartingAssets.spirit,
  dust: rolloverHarmonyState.player.spiritPearls.dust - rolloverHarmonyStartingAssets.dust
}, { xp: 0, spirit: 8, dust: 1 }, "周期结束自动结算进行中挑战时，达到 15 点应发放第一档奖励");
assert.equal(rolloverHarmonyState.daoTrial.history[0].result, "周期结束", "跨期进行中的挑战应写入周期结束记录");
assert.equal(rolloverHarmonyState.daoTrial.history[0].harmonyProgress, 15, "周期结束记录应保存结算前的合参进度");
assert.deepEqual(rolloverHarmonyState.daoTrial.history[0].harmonyRewards?.milestones, [{ id: "harmony-15", target: 15, label: "初窥三脉" }], "周期结束记录应保存实际发放的合参档位");

const firstExploreState = createDefaultState();
ensureStateShape(firstExploreState);
firstExploreState.daoTrial.routeMastery["golden-pass"].clears = 6;
const firstExplorePublic = getPublicState(firstExploreState).daoTrial;
assert.equal(firstExplorePublic.routes.find((route) => route.id === "wind-thunder-path").firstExplore.freeRerolls, 1, "低于最高精通两级的未探索路线应获得追赶重观");
const firstExploreRun = startDaoTrial(firstExploreState, { routeId: "wind-thunder-path" }).run;
assert.deepEqual(firstExploreRun.firstExploreSupport, { applied: true, insight: 1, freeRerolls: 1, masteryGap: 6 }, "本期首次正式进入弱路线应应用首探护持");
assert.equal(firstExploreRun.insight, 2, "首探护持应额外提供一点悟机");
assert.equal(firstExploreRun.freeRerolls, 1, "弱路线首探应额外提供一次免费重观");
firstExploreState.daoTrial.activeRun.lawOffer = [];
firstExploreState.daoTrial.activeRun.pendingSealIds = [];
firstExploreState.daoTrial.activeRun.nodesCleared = 5;
firstExploreState.daoTrial.activeRun.maxFloor = 5;
firstExploreState.daoTrial.activeRun.checkpointFloor = 5;
firstExploreState.daoTrial.activeRun.checkpointPending = true;
advanceDaoTrial(firstExploreState, { action: "checkpoint-exit" });
firstExploreState.daoTrial.tickets = 0;
const practiceFirstExplore = startDaoTrial(firstExploreState, { routeId: "nether-marsh" }).run;
assert.equal(practiceFirstExplore.firstExploreSupport.applied, false, "无奖励演练不得消耗或获得首探护持");
assert.equal(practiceFirstExplore.insight, 1, "演练不应获得首探悟机");

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
legacyState.daoTrial.discoveredLawIds = undefined;
legacyState.daoTrial.discoveredSealIds = undefined;
legacyState.daoTrial.yearGoals.lawsSeen = ["triple-edge"];
legacyState.daoTrial.history = [{ id: "legacy", routeId: "golden-pass", routeName: "金石关", success: true, nodesCleared: 4, score: 618, practice: false, lawIds: ["spell-echo"], sealIds: ["edge-intent"] }];
ensureStateShape(legacyState);
assert.equal(legacyState.daoTrial.version, 7, "旧秘境状态应迁移到 V7");
assert.deepEqual(legacyState.daoTrial.recentLawOfferIds, [], "旧存档应补齐最近法则展示记录");
assert.deepEqual(legacyState.daoTrial.recentSealOfferIds, [], "旧存档应补齐最近道印展示记录");
assert.deepEqual(legacyState.daoTrial.lawPity, { withoutGold: 0, withoutDiamond: 0 }, "旧存档应补齐法则保底状态");
assert.deepEqual(legacyState.daoTrial.claimedHarmonyMilestones, [], "旧存档应补齐本期合参领取状态");
assert.deepEqual(new Set(legacyState.daoTrial.discoveredLawIds), new Set(["triple-edge", "spell-echo"]), "旧存档应从年度与历史记录恢复已发现法则");
assert.deepEqual(legacyState.daoTrial.discoveredSealIds, ["edge-intent"], "旧存档应从历史记录恢复已发现道印");
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

console.log("dao-trial-check: passed (256 laws, 1024 seals, uniform offers, stacking, resonance, 15 core floors, endless, scoring, companion, determinism, migration)");
