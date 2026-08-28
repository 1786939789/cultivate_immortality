import assert from "node:assert/strict";
import { daoTrialLaws, daoTrialSeals } from "../server/daoTrialData.mjs";
import { advanceDaoTrial, combinedTrialBuffs, createDefaultState, ensureStateShape, getPublicState, startDaoTrial } from "../server/gameLogic.mjs";

const passiveModifierKeys = new Set(["attack", "defense", "maxHp", "maxMana", "divineSense", "skillPower", "statusPower", "healing", "manaCost", "cooldown", "rootResist", "postBattleHeal", "postBattleMana"]);
const represented = new Set();
const state = createDefaultState();
ensureStateShape(state);
state.daoTrial.tickets = 2;
startDaoTrial(state, { routeId: "golden-pass" });
const baselineRun = structuredClone(state.daoTrial.activeRun);

function inspect(kind, item) {
  const run = structuredClone(baselineRun);
  if (kind === "law") run.lawStacks = { [item.id]: 1 }, run.lawIds = [item.id];
  else run.sealStacks = { [item.id]: 1 }, run.sealIds = [item.id];
  const modifiers = combinedTrialBuffs(run);
  for (const key of Object.keys(item.effects || {})) if (passiveModifierKeys.has(key)) represented.add(key);
  for (const [key, value] of Object.entries(item.effects || {})) if (typeof value === "number" && passiveModifierKeys.has(key)) assert.ok(Number.isFinite(Number(modifiers[key])), `${item.id} 效果 ${key} 未计算`);
}

for (const law of daoTrialLaws) inspect("law", law);
for (const seal of daoTrialSeals) inspect("seal", seal);

for (const key of passiveModifierKeys) {
  assert.ok([...daoTrialLaws, ...daoTrialSeals].some((item) => Object.prototype.hasOwnProperty.call(item.effects || {}, key)), `没有内容覆盖效果字段 ${key}`);
}

// Verify representative trigger laws and generated entries execute a real battle.
const triggerIds = new Set(["triple-edge", "opening-break", "mana-loop", "spell-echo", "iron-rebound", "steady-heart", "unyielding-law", "overheal-shield", "breath-loop", "endless-life", "blood-asking", "poison-formation", "same-heart-law", "twin-array", "mirror-friend", "boundless-casting", "immortal-spring", "life-wager", "twin-stars-law", "element-domain-law", "rewrite-fate-law"]);
const generatedSamples = daoTrialLaws.filter((entry) => entry.id.startsWith("expanded-law-")).filter((_, index) => index % 24 === 0);
for (const item of [...daoTrialLaws, ...daoTrialSeals].filter((entry) => triggerIds.has(entry.id)).concat(generatedSamples)) {
  const trial = createDefaultState();
  trial.daoTrial.tickets = 2;
  trial.player.maxHp *= 50;
  trial.player.hp = trial.player.maxHp;
  trial.player.attack *= 50;
  trial.player.defense *= 50;
  trial.player.maxMana *= 50;
  trial.player.mana = trial.player.maxMana;
  ensureStateShape(trial);
  startDaoTrial(trial, { routeId: "golden-pass" });
  const run = trial.daoTrial.activeRun;
  run.lawOffer = [];
  if (daoTrialLaws.includes(item)) {
    run.lawOffer = [item.id];
    advanceDaoTrial(trial, { action: "law", lawId: item.id });
  } else {
    run.pendingSealIds = [item.id];
    run.advanceAfterSeal = false;
    advanceDaoTrial(trial, { action: "seal", sealId: item.id });
  }
  assert.doesNotThrow(() => advanceDaoTrial(trial, { action: "battle" }), `${item.id} 战斗触发异常`);
}

console.log("dao-trial full verification passed", JSON.stringify({ laws: daoTrialLaws.length, seals: daoTrialSeals.length, passiveKeys: [...represented] }));
