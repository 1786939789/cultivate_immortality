import assert from "node:assert/strict";
import { daoTrialLaws, daoTrialSeals } from "../server/daoTrialData.mjs";
import { createDefaultState, startDaoTrial, advanceDaoTrial, getPublicState, ensureStateShape, sampleDaoTrialEqualOffer } from "../server/gameLogic.mjs";

const unique = (items) => new Set(items).size;
assert.equal(daoTrialLaws.length, 256);
assert.equal(daoTrialSeals.length, 1024);
assert.deepEqual(Object.fromEntries(Object.entries(Object.groupBy(daoTrialLaws, (item) => item.rarity)).map(([key, items]) => [key, items.length])), { silver: 160, gold: 64, diamond: 32 });
assert.equal(unique(daoTrialLaws.map((item) => item.id)), 256);
assert.equal(unique(daoTrialSeals.map((item) => item.id)), 1024);
for (const item of [...daoTrialLaws, ...daoTrialSeals]) {
  assert.ok(item.id && item.name && item.school && item.text);
  assert.ok(item.effects && typeof item.effects === "object");
}
for (const [school, count] of Object.entries(Object.groupBy(daoTrialLaws, (item) => item.school))) assert.equal(count.length, 32, `法则流派 ${school}`);
for (const [school, count] of Object.entries(Object.groupBy(daoTrialSeals, (item) => item.school))) assert.equal(count.length, 128, `道印流派 ${school}`);
for (const [school, count] of Object.entries(Object.groupBy(daoTrialLaws, (item) => item.school))) {
  assert.deepEqual(Object.fromEntries(Object.entries(Object.groupBy(count, (item) => item.rarity)).map(([key, items]) => [key, items.length])), { silver: 20, gold: 8, diamond: 4 });
}
assert.deepEqual(daoTrialLaws.find((item) => item.id === "expanded-law-attack-17")?.effects, { attack: 0.057 }, "降为白银的法则应同步降低数值强度");
assert.deepEqual(daoTrialLaws.find((item) => item.id === "expanded-law-attack-25")?.effects, { attack: 0.07 }, "降为黄金的法则应同步调整数值强度");
assert.deepEqual(daoTrialLaws.find((item) => item.id === "expanded-law-attack-30")?.effects, { divineSense: 0.071, attack: 0.06 }, "钻石法则应保留最高数值强度");
const attackLawProgression = ["expanded-law-attack-22", "expanded-law-attack-26", "expanded-law-attack-30"].map((id) => daoTrialLaws.find((item) => item.id === id));
assert.deepEqual(attackLawProgression.map((item) => item.rarity), ["silver", "gold", "diamond"]);
assert.ok(attackLawProgression[0].effects.attack < attackLawProgression[1].effects.attack && attackLawProgression[1].effects.attack < attackLawProgression[2].effects.attack, "同效果模板应按白银、黄金、钻石逐级增强");

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
