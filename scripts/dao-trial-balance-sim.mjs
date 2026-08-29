import assert from "node:assert/strict";
import { advanceDaoTrial, createDefaultState, ensureStateShape, getPublicState, startDaoTrial } from "../server/gameLogic.mjs";
import { daoTrialRoutes } from "../server/daoTrialData.mjs";

const runsPerRoute = Math.max(1, Math.floor(Number(process.argv[2]) || 6));
const scenarios = [
  { id: "solo", label: "独行" },
  { id: "companion", label: "最强同行" },
  { id: "boons", label: "最强同行 + 四类任务助力", boons: true },
  { id: "veteran", label: "满路线精通 + 最强同行 + 四类任务助力", boons: true, mastery: true }
];
const scenarioFilter = String(process.argv[3] || "").trim();

function seededRandom(seed = "dao-trial-balance") {
  let value = 2166136261;
  for (const char of String(seed)) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return () => {
    value += 0x6D2B79F5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function effectScore(effects = {}) {
  return (Number(effects.postBattleHeal) || 0) * 12
    + (Number(effects.postBattleMana) || 0) * 10
    + (Number(effects.healing) || 0) * 7
    + (Number(effects.maxHp) || 0) * 6
    + (Number(effects.defense) || 0) * 5
    + (Number(effects.attack) || 0) * 4
    + (Number(effects.maxMana) || 0) * 3
    + (Number(effects.divineSense) || 0) * 3
    + (Number(effects.skillPower) || 0) * 2
    + (Number(effects.manaCost) || 0) * -2;
}

const mechanicWeights = {
  lethalWard: 2.6,
  companionLethalWard: 2.2,
  roundRegen: 1.9,
  lifesteal: 1.7,
  healStrike: 1.5,
  damageStore: 1.4,
  noHitCounter: 1.4,
  damageReflect: 1.3,
  freeCast: 1.4,
  manaTide: 1.2,
  cooldownFlow: 1.1,
  repeatSkill: 1.1,
  battleMomentum: 1.4,
  adversityGrowth: 1.2,
  companionSkillEcho: 1.2,
  companionFollowup: 1.2,
  elementCycle: 1.5,
  rootReversal: 1.2,
  residualChoice: 1.1,
  fortune: 1.1,
  freeReroll: 0.9,
  eventCompensation: 0.8,
  attackEcho: 1,
  openingSurge: 1,
  executeStrike: 0.9,
  lowHpEcho: 0.8,
  bloodCast: 0.8,
  battleWager: 0.7,
  soloEcho: 1,
  statusDetonate: 1,
  elementPulse: 1
};

function buildScore(option = {}) {
  const mechanicScore = (option.mechanics || []).reduce((sum, mechanic) => sum + (mechanicWeights[mechanic.action] || 0.7), 0);
  const rarityScore = option.rarity === "diamond" ? 0.55 : option.rarity === "gold" ? 0.25 : 0;
  const repeatScore = Math.max(0, Number(option.stack || 1) - 1) * 0.08;
  return effectScore(option.effects) + mechanicScore + rarityScore + repeatScore;
}

function bestBuildChoice(options = []) {
  return [...options].sort((a, b) => buildScore(b) - buildScore(a))[0];
}

function bestEventChoice(run) {
  const hpNeed = 1 - run.combat.hp / Math.max(1, run.combat.maxHp);
  const manaNeed = 1 - run.combat.mana / Math.max(1, run.combat.maxMana);
  return [...run.eventOptions].sort((a, b) => {
    const score = (option) => {
      const effects = option.effects || {};
      return (Number(effects.hp) || 0) * (6 + hpNeed * 12)
        + (Number(effects.mana) || 0) * (4 + manaNeed * 10)
        + (Number(effects.insight) || 0) * 0.25
        + (effects.grantSeal ? 0.4 : 0);
    };
    return score(b) - score(a);
  })[0];
}

function addAllTaskBoons(state) {
  state.taskCompletions = ["学习", "运动", "工作", "生活"].map((category, index) => ({
    id: `sim-${state.day}-${index}`,
    day: state.day,
    category
  }));
}

function createSimulationState(index) {
  const originalRandom = Math.random;
  Math.random = seededRandom(`dao-trial-balance|${index}`);
  try {
    const state = createDefaultState();
    state.day = 1 + index * 7;
    state.rebirth = index + 1;
    ensureStateShape(state);
    return state;
  } finally {
    Math.random = originalRandom;
  }
}

function runSimulation(scenario, state, route) {
  if (scenario.mastery) {
    Object.assign(state.daoTrial.routeMastery[route.id], {
      runs: 30,
      clears: 10,
      eliteClears: 10,
      bossClears: 10,
      bestFloor: 30,
      bestScore: 20_000
    });
  }
  const publicState = getPublicState(state);
  const companion = scenario.id === "solo"
    ? null
    : [...publicState.daoTrial.companions].sort((a, b) => b.support.power - a.support.power)[0];
  startDaoTrial(state, { routeId: route.id, companionId: companion?.person?.id });
  if (scenario.boons) assert.equal(state.daoTrial.activeRun.taskBoons.length, 4, "四类任务助力模拟必须实际激活四种助力");

  const rerolledOffers = new Set();
  let guard = 0;
  while (guard < 160) {
    const run = getPublicState(state).daoTrial.activeRun;
    if (!run) break;
    if (run.maxFloor >= 30) return { floor: run.maxFloor, clear: true, routeId: route.id, routeName: route.name };
    if (run.lawOffer.length) {
      const best = bestBuildChoice(run.lawOffer);
      const offerKey = `law-${run.floor}`;
      if (run.canReroll && buildScore(best) < 0.85 && !rerolledOffers.has(offerKey)) {
        rerolledOffers.add(offerKey);
        advanceDaoTrial(state, { action: "reroll-law" });
      } else advanceDaoTrial(state, { action: "law", lawId: best.id });
    } else if (run.checkpointPending) {
      advanceDaoTrial(state, { action: "continue" });
    } else if (run.canUseLifeHeal && run.combat.hp / run.combat.maxHp < 0.5) {
      advanceDaoTrial(state, { action: "life-heal" });
    } else if (run.companion && !run.companion.supportUsed
      && (run.combat.hp / run.combat.maxHp < 0.55 || run.combat.mana / run.combat.maxMana < 0.35)) {
      advanceDaoTrial(state, { action: "companion" });
    } else if (run.sealOffer.length) {
      const best = bestBuildChoice(run.sealOffer);
      const offerKey = `seal-${run.floor}`;
      if (run.canReroll && buildScore(best) < 0.35 && !rerolledOffers.has(offerKey)) {
        rerolledOffers.add(offerKey);
        advanceDaoTrial(state, { action: "reroll" });
      } else advanceDaoTrial(state, { action: "seal", sealId: best.id });
    } else if (run.currentNode.type === "battle") {
      const result = advanceDaoTrial(state, { action: "battle" });
      if (result.completed) return { floor: result.summary.floor, clear: result.summary.floor >= 30, routeId: route.id, routeName: route.name };
    } else {
      advanceDaoTrial(state, { optionId: bestEventChoice(run).id });
    }
    guard += 1;
  }
  const history = getPublicState(state).daoTrial.history[0];
  return { floor: history?.floor || 0, clear: Number(history?.floor) >= 30, routeId: route.id, routeName: route.name };
}

const simulationStates = Array.from({ length: runsPerRoute }, (_, index) => createSimulationState(index));

for (const scenario of scenarios.filter((entry) => !scenarioFilter || entry.id === scenarioFilter)) {
  const results = simulationStates.flatMap((baseState) => {
    const state = structuredClone(baseState);
    if (scenario.boons) addAllTaskBoons(state);
    return daoTrialRoutes.map((route) => runSimulation(scenario, structuredClone(state), route));
  });
  const reached = (floor) => results.filter((result) => result.floor >= floor).length;
  const average = results.reduce((sum, result) => sum + result.floor, 0) / results.length;
  console.log(`${scenario.label}: ${results.length} 局，10层 ${reached(10)}/${results.length}，20层 ${reached(20)}/${results.length}，30层 ${reached(30)}/${results.length}，平均 ${average.toFixed(1)} 层`);
  for (const route of daoTrialRoutes) {
    const routeResults = results.filter((result) => result.routeId === route.id);
    const routeReached = (floor) => routeResults.filter((result) => result.floor >= floor).length;
    const routeAverage = routeResults.reduce((sum, result) => sum + result.floor, 0) / Math.max(1, routeResults.length);
    console.log(`  ${route.name}: ${routeResults.length} 局，10层 ${routeReached(10)}/${routeResults.length}，20层 ${routeReached(20)}/${routeResults.length}，30层 ${routeReached(30)}/${routeResults.length}，平均 ${routeAverage.toFixed(1)} 层`);
  }
}
