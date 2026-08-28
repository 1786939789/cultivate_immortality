import assert from "node:assert/strict";
import { daoTrialLaws, daoTrialSeals } from "../server/daoTrialData.mjs";
import { daoTrialDiamondMechanicTypes, daoTrialLawBranches, resolveLawMechanics } from "../server/daoTrialLawDesign.mjs";
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
  for (const branch of daoTrialLawBranches[school]) {
    const branchLaws = count.filter((item) => item.branch === branch);
    assert.deepEqual(Object.fromEntries(Object.entries(Object.groupBy(branchLaws, (item) => item.rarity)).map(([key, items]) => [key, items.length])), { silver: 5, gold: 2, diamond: 1 }, `${school} · ${branch}`);
  }
}
const silverLaws = daoTrialLaws.filter((item) => item.rarity === "silver");
const goldLaws = daoTrialLaws.filter((item) => item.rarity === "gold");
const diamondLaws = daoTrialLaws.filter((item) => item.rarity === "diamond");
assert.ok(silverLaws.every((item) => item.designRole === "基础组件" && item.stackPlan?.length === 5));
assert.ok(silverLaws.every((item) => !Object.values(item.effects).some((value) => typeof value === "boolean")), "白银不得携带免死类布尔规则");
assert.ok(goldLaws.every((item) => item.designRole === "构筑核心" && item.mechanics?.length && item.stackPlan?.length === 5), "黄金必须包含条件联动机制");
assert.ok(diamondLaws.every((item) => item.designRole === "规则改变" && item.mechanics?.length && item.stackPlan?.length === 5), "钻石必须包含独有规则机制");
assert.equal(unique(daoTrialDiamondMechanicTypes), 32, "三十二个钻石法则必须拥有独立机制类型");
assert.ok(diamondLaws.every((item) => !/^.+(天机|玄变|归藏|问真|太初|无极|鸿蒙|极境)\d+$/.test(item.name)), "钻石法则不得继续使用编号模板名");
for (const item of [...goldLaws, ...diamondLaws]) {
  assert.notDeepEqual(resolveLawMechanics(item, 1), resolveLawMechanics(item, 5), `${item.id} 五层机制必须强于一层`);
}

const lawA = sampleDaoTrialEqualOffer("law", "verify-seed");
assert.deepEqual(lawA, sampleDaoTrialEqualOffer("law", "verify-seed"));
assert.equal(new Set(lawA).size, 3);
const uniformCounts = {};
for (let seed = 0; seed < 4_096; seed += 1) {
  for (const id of sampleDaoTrialEqualOffer("law", `uniform-${seed}`)) uniformCounts[id] = (uniformCounts[id] || 0) + 1;
}
const uniformValues = Object.values(uniformCounts);
assert.equal(uniformValues.length, 256, "等权样本必须覆盖全部法则");
assert.ok(Math.min(...uniformValues) >= 25 && Math.max(...uniformValues) <= 75, `等权抽样偏差过大：${Math.min(...uniformValues)}-${Math.max(...uniformValues)}`);
const sampledRarities = Object.fromEntries(Object.entries(Object.groupBy(Object.entries(uniformCounts), ([id]) => daoTrialLaws.find((law) => law.id === id).rarity)).map(([rarity, entries]) => [rarity, entries.reduce((sum, [, count]) => sum + count, 0)]));
assert.ok(Math.abs(sampledRarities.silver / 12_288 - 0.625) < 0.03);
assert.ok(Math.abs(sampledRarities.gold / 12_288 - 0.25) < 0.03);
assert.ok(Math.abs(sampledRarities.diamond / 12_288 - 0.125) < 0.03);
const sealA = sampleDaoTrialEqualOffer("seal", "verify-seed");
assert.deepEqual(sealA, sampleDaoTrialEqualOffer("seal", "verify-seed"));
assert.equal(new Set(sealA).size, 3);

const state = createDefaultState();
state.daoTrial.tickets = 2;
startDaoTrial(state, { routeId: "golden-pass" });
assert.deepEqual(getPublicState(state).daoTrial.activeRun.lawRarityRates, { silver: 62.5, gold: 25, diamond: 12.5 });
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
