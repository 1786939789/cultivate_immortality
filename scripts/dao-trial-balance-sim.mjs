import { advanceDaoTrial, createDefaultState, ensureStateShape, getPublicState, startDaoTrial } from "../server/gameLogic.mjs";
import { daoTrialRoutes } from "../server/daoTrialData.mjs";

const runsPerRoute = Math.max(1, Math.floor(Number(process.argv[2]) || 6));
const scenarios = [
  { id: "solo", label: "独行" },
  { id: "companion", label: "最强同行" },
  { id: "boons", label: "最强同行 + 四类任务助力", boons: true }
];

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

function bestBuildChoice(options = []) {
  return [...options].sort((a, b) => effectScore(b.effects) - effectScore(a.effects))[0];
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
  state.taskCompletions = ["study", "exercise", "work", "life"].map((category, index) => ({
    id: `sim-${state.day}-${index}`,
    day: state.day,
    category
  }));
}

function createSimulationState(index) {
  const state = createDefaultState();
  state.day = 1 + index * 7;
  state.rebirth = index + 1;
  ensureStateShape(state);
  return state;
}

function runSimulation(scenario, state, route) {
  const publicState = getPublicState(state);
  const companion = scenario.id === "solo"
    ? null
    : [...publicState.daoTrial.companions].sort((a, b) => b.support.power - a.support.power)[0];
  startDaoTrial(state, { routeId: route.id, companionId: companion?.person?.id });

  let guard = 0;
  while (guard < 160) {
    const run = getPublicState(state).daoTrial.activeRun;
    if (!run) break;
    if (run.maxFloor >= 15) return { floor: run.maxFloor, clear: true, routeId: route.id, routeName: route.name };
    if (run.lawOffer.length) {
      advanceDaoTrial(state, { action: "law", lawId: bestBuildChoice(run.lawOffer).id });
    } else if (run.checkpointPending) {
      advanceDaoTrial(state, { action: "continue" });
    } else if (run.canUseLifeHeal && run.combat.hp / run.combat.maxHp < 0.5) {
      advanceDaoTrial(state, { action: "life-heal" });
    } else if (run.companion && !run.companion.supportUsed
      && (run.combat.hp / run.combat.maxHp < 0.55 || run.combat.mana / run.combat.maxMana < 0.35)) {
      advanceDaoTrial(state, { action: "companion" });
    } else if (run.sealOffer.length) {
      advanceDaoTrial(state, { action: "seal", sealId: bestBuildChoice(run.sealOffer).id });
    } else if (run.currentNode.type === "battle") {
      const result = advanceDaoTrial(state, { action: "battle" });
      if (result.completed) return { floor: result.summary.floor, clear: result.summary.floor >= 15, routeId: route.id, routeName: route.name };
    } else {
      advanceDaoTrial(state, { optionId: bestEventChoice(run).id });
    }
    guard += 1;
  }
  const history = getPublicState(state).daoTrial.history[0];
  return { floor: history?.floor || 0, clear: Number(history?.floor) >= 15, routeId: route.id, routeName: route.name };
}

const simulationStates = Array.from({ length: runsPerRoute }, (_, index) => createSimulationState(index));

for (const scenario of scenarios) {
  const results = simulationStates.flatMap((baseState) => {
    const state = structuredClone(baseState);
    if (scenario.boons) addAllTaskBoons(state);
    return daoTrialRoutes.map((route) => runSimulation(scenario, structuredClone(state), route));
  });
  const reached = (floor) => results.filter((result) => result.floor >= floor).length;
  const average = results.reduce((sum, result) => sum + result.floor, 0) / results.length;
  console.log(`${scenario.label}: ${results.length} 局，5层 ${reached(5)}/${results.length}，10层 ${reached(10)}/${results.length}，15层 ${reached(15)}/${results.length}，平均 ${average.toFixed(1)} 层`);
  for (const route of daoTrialRoutes) {
    const routeResults = results.filter((result) => result.routeId === route.id);
    const routeReached = (floor) => routeResults.filter((result) => result.floor >= floor).length;
    const routeAverage = routeResults.reduce((sum, result) => sum + result.floor, 0) / Math.max(1, routeResults.length);
    console.log(`  ${route.name}: ${routeResults.length} 局，5层 ${routeReached(5)}/${routeResults.length}，10层 ${routeReached(10)}/${routeResults.length}，15层 ${routeReached(15)}/${routeResults.length}，平均 ${routeAverage.toFixed(1)} 层`);
  }
}
