import assert from "node:assert/strict";
import { combatSkills, roots } from "../server/gameData.mjs";
import { createDefaultState, ensureStateShape, getPublicState, startDaoTrial } from "../server/gameLogic.mjs";

const routeIds = ["golden-pass", "wind-thunder-path", "nether-marsh"];
const unrestrictedSkills = new Set(["blood_escape", "poison_flame", "bone_spike", "fire_crow", "wood_recovery"]);

function newPracticeState(realm = 10) {
  const state = createDefaultState();
  state.day = 8;
  state.daoTrial.tickets = 0;
  state.player.realm = realm;
  ensureStateShape(state);
  return state;
}

function monsterSnapshots(run) {
  return Object.entries(run.opponentSnapshots || {})
    .filter(([, snapshot]) => snapshot?.kind === "monster")
    .sort(([a], [b]) => Number(a) - Number(b));
}

function auditSingleRun() {
  const state = newPracticeState(10);
  startDaoTrial(state, { routeId: "golden-pass" });
  const run = state.daoTrial.activeRun;
  const monsters = monsterSnapshots(run);
  assert.ok(monsters.length >= 2, "一轮秘境至少应生成两个妖物用于验证");

  const firstRoots = monsters.slice(0, Math.min(roots.length, monsters.length)).map(([, snapshot]) => snapshot.primaryRootKey);
  assert.equal(new Set(firstRoots).size, firstRoots.length, "同一轮前六个妖物灵根不应重复");
  for (const [floor, snapshot] of monsters) {
    assert.ok(roots.some((root) => root.key === snapshot.primaryRootKey), `${floor} 层妖物灵根不在目录中`);
    assert.ok(combatSkills.some((skill) => skill.id === snapshot.skillId), `${floor} 层妖物技能不在完整技能池中`);
    assert.equal(snapshot.skillRanks?.[snapshot.skillId], 2, `${floor} 层筑基妖物技能应为 2 级`);
  }

  const before = JSON.stringify(run.opponentSnapshots);
  const publicState = getPublicState(state);
  const preview = publicState.daoTrial.activeRun.opponentPreview;
  if (preview?.kindKey === "monster") {
    const snapshot = run.opponentSnapshots[String(run.nodeIndex + 1)];
    assert.ok(snapshot, "妖物预览应能定位到当前楼层快照");
    assert.equal(preview.skillId, snapshot.skillId, "前端预览技能与后端快照不一致");
    assert.equal(preview.skillRank, snapshot.skillRanks[snapshot.skillId], "前端预览技能等级与后端快照不一致");
    assert.equal(preview.primaryRootKey, snapshot.primaryRootKey, "前端预览灵根与后端快照不一致");
  }
  assert.equal(JSON.stringify(run.opponentSnapshots), before, "重复读取状态不应重抽妖物配置");
  return { monsters: monsters.length, roots: firstRoots, preview: preview?.skillId || null };
}

function auditRealmSkillRanks() {
  const ranks = [];
  for (const realm of [0, 10, 20]) {
    const state = newPracticeState(realm);
    startDaoTrial(state, { routeId: routeIds[realm / 10] || routeIds[0] });
    for (const [, snapshot] of monsterSnapshots(state.daoTrial.activeRun)) {
      ranks.push({ realm, rank: snapshot.skillRanks?.[snapshot.skillId] });
    }
  }
  assert.ok(ranks.some((entry) => entry.realm === 0 && entry.rank === 1), "练气妖物技能应为 1 级");
  assert.ok(ranks.some((entry) => entry.realm === 10 && entry.rank === 2), "筑基妖物技能应为 2 级");
  assert.ok(ranks.some((entry) => entry.realm === 20 && entry.rank === 3), "结丹妖物技能应为 3 级");
  return ranks;
}

function auditUnrestrictedPool() {
  const seen = new Set();
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const state = newPracticeState(10);
    startDaoTrial(state, { routeId: routeIds[attempt % routeIds.length] });
    for (const [, snapshot] of monsterSnapshots(state.daoTrial.activeRun)) seen.add(snapshot.skillId);
  }
  assert.ok([...seen].some((skillId) => unrestrictedSkills.has(skillId)), "秘境妖物应能抽到 archetype 之外的完整技能池技能");
  return [...seen].sort();
}

const singleRun = auditSingleRun();
const ranks = auditRealmSkillRanks();
const skills = auditUnrestrictedPool();
console.log(JSON.stringify({ singleRun, ranks: [...new Set(ranks.map((entry) => `${entry.realm}:${entry.rank}`))].sort(), skills }, null, 2));
console.log("dao-trial-monster-check: passed");
