import assert from "node:assert/strict";
import { daoTrialLaws, daoTrialSeals } from "../server/daoTrialData.mjs";
import { createDefaultState, startDaoTrial, advanceDaoTrial, getPublicState, ensureStateShape, sampleDaoTrialEqualOffer } from "../server/gameLogic.mjs";

const unique = (items) => new Set(items).size;
assert.equal(daoTrialLaws.length, 256);
assert.equal(daoTrialSeals.length, 1024);
assert.equal(unique(daoTrialLaws.map((item) => item.id)), 256);
assert.equal(unique(daoTrialSeals.map((item) => item.id)), 1024);
for (const item of [...daoTrialLaws, ...daoTrialSeals]) {
  assert.ok(item.id && item.name && item.school && item.text);
  assert.ok(item.effects && typeof item.effects === "object");
}
for (const [school, count] of Object.entries(Object.groupBy(daoTrialLaws, (item) => item.school))) assert.equal(count.length, 32, `法则流派 ${school}`);
for (const [school, count] of Object.entries(Object.groupBy(daoTrialSeals, (item) => item.school))) assert.equal(count.length, 128, `道印流派 ${school}`);

const lawA = sampleDaoTrialEqualOffer("law", "verify-seed");
assert.deepEqual(lawA, sampleDaoTrialEqualOffer("law", "verify-seed"));
assert.equal(new Set(lawA).size, 3);
const sealA = sampleDaoTrialEqualOffer("seal", "verify-seed");
assert.deepEqual(sealA, sampleDaoTrialEqualOffer("seal", "verify-seed"));
assert.equal(new Set(sealA).size, 3);

const state = createDefaultState();
state.daoTrial.tickets = 2;
startDaoTrial(state, { routeId: "golden-pass" });
let run = state.daoTrial.activeRun;
run.lawOffer = ["edge-pressure"];
advanceDaoTrial(state, { action: "law", lawId: "edge-pressure" });
run = state.daoTrial.activeRun;
run.lawOffer = ["edge-pressure"];
advanceDaoTrial(state, { action: "law", lawId: "edge-pressure" });
assert.equal(run.lawStacks["edge-pressure"], 2);
assert.equal(getPublicState(state).daoTrial.activeRun.laws.find((item) => item.id === "edge-pressure").stack, 2);
const attackAtTwo = getPublicState(state).daoTrial.activeRun.combatModifiers.attack;
run = state.daoTrial.activeRun;
run.lawOffer = ["edge-pressure"];
advanceDaoTrial(state, { action: "law", lawId: "edge-pressure" });
assert.equal(run.lawStacks["edge-pressure"], 3);
assert.ok(getPublicState(state).daoTrial.activeRun.combatModifiers.attack > attackAtTwo);

const oldState = createDefaultState();
oldState.daoTrial = { version: 6, discoveredLawIds: ["triple-edge"], discoveredSealIds: ["iron-wall"], history: [], tickets: 1 };
ensureStateShape(oldState);
assert.equal(oldState.daoTrial.version, 7);
assert.equal(oldState.daoTrial.discoveredLawIds.includes("triple-edge"), true);
assert.equal(oldState.daoTrial.discoveredSealIds.includes("iron-wall"), true);

console.log("dao-trial expansion verification passed", JSON.stringify({ laws: daoTrialLaws.length, seals: daoTrialSeals.length, sampleLaw: lawA, sampleSeal: sealA }));
