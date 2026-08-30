import assert from "node:assert/strict";
import { combatSkills, roots } from "../server/gameData.mjs";
import { daoTrialLawMap } from "../server/daoTrialData.mjs";
import { createDefaultState, dailySettlement, ensureStateShape, getPublicState, startDaoTrial } from "../server/gameLogic.mjs";

const routeIds = ["golden-pass", "wind-thunder-path", "nether-marsh"];

function newPracticeState(realm = 10, seedOffset = 0) {
  const state = createDefaultState();
  state.day = 8 + seedOffset;
  state.rebirth = 1 + seedOffset;
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
  for (const [floor, snapshot] of monsters) {
    assert.ok(roots.some((root) => root.key === snapshot.primaryRootKey), `${floor} 层妖物灵根不在目录中`);
    assert.equal(snapshot.roots?.length, 1, `${floor} 层妖物必须是单灵根`);
    assert.equal(snapshot.roots[0].key, snapshot.primaryRootKey, `${floor} 层妖物主灵根与单灵根快照不一致`);
    assert.ok(combatSkills.some((skill) => skill.id === snapshot.skillId), `${floor} 层妖物技能不在完整技能池中`);
    assert.equal(snapshot.skillRanks?.[snapshot.skillId], 2, `${floor} 层筑基妖物技能应为 2 级`);
    assert.ok(daoTrialLawMap[snapshot.lawId], `${floor} 层妖物应有有效法则加成`);
    assert.equal(snapshot.lawStack, 1, `${floor} 层妖物法则默认应为 1 层`);
  }
  for (const snapshot of Object.values(run.opponentSnapshots)) {
    assert.ok(daoTrialLawMap[snapshot.lawId], `${snapshot.name} 应有有效法则加成`);
    assert.equal(snapshot.lawStack, 1, `${snapshot.name} 法则默认应为 1 层`);
  }
  const lawIds = new Set(Object.values(run.opponentSnapshots).map((snapshot) => snapshot.lawId));
  assert.ok(lawIds.size >= 2, "同一轮不同敌人应能随机到不同法则");

  const before = JSON.stringify(run.opponentSnapshots);
  const publicState = getPublicState(state);
  const preview = publicState.daoTrial.activeRun.opponentPreview;
  if (preview?.kindKey === "monster") {
    const snapshot = run.opponentSnapshots[String(run.nodeIndex + 1)];
    assert.ok(snapshot, "妖物预览应能定位到当前楼层快照");
    assert.equal(preview.skillId, snapshot.skillId, "前端预览技能与后端快照不一致");
    assert.equal(preview.skillRank, snapshot.skillRanks[snapshot.skillId], "前端预览技能等级与后端快照不一致");
    assert.equal(preview.primaryRootKey, snapshot.primaryRootKey, "前端预览灵根与后端快照不一致");
    assert.equal(preview.lawId, snapshot.lawId, "前端预览法则与后端快照不一致");
    assert.equal(preview.law?.id, snapshot.lawId, "前端预览应包含敌方法则详情");
  }
  assert.equal(JSON.stringify(run.opponentSnapshots), before, "重复读取状态不应重抽妖物配置");
  return { monsters: monsters.length, roots: firstRoots, preview: preview?.skillId || null };
}

function auditOpponentLawDistribution() {
  const lawIds = new Set();
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const state = newPracticeState(10, attempt);
    startDaoTrial(state, { routeId: routeIds[attempt % routeIds.length] });
    for (const snapshot of Object.values(state.daoTrial.activeRun.opponentSnapshots)) {
      assert.ok(daoTrialLawMap[snapshot.lawId], "敌方法则必须来自法则目录");
      lawIds.add(snapshot.lawId);
    }
  }
  assert.ok(lawIds.size >= 6, "多轮秘境应覆盖多个随机敌方法则");
  return [...lawIds].sort();
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
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const state = newPracticeState(10, attempt);
    startDaoTrial(state, { routeId: routeIds[attempt % routeIds.length] });
    for (const [, snapshot] of monsterSnapshots(state.daoTrial.activeRun)) seen.add(snapshot.skillId);
  }
  assert.deepEqual([...seen].sort(), combatSkills.map((skill) => skill.id).sort(), "秘境妖物应能从完整技能池抽到全部技能");
  return [...seen].sort();
}

function auditRandomSingleRoots() {
  const seen = new Set();
  for (let attempt = 0; attempt < 48; attempt += 1) {
    const state = newPracticeState(10, attempt);
    startDaoTrial(state, { routeId: routeIds[attempt % routeIds.length] });
    for (const [, snapshot] of monsterSnapshots(state.daoTrial.activeRun)) {
      assert.equal(snapshot.roots?.length, 1, "秘境妖物必须保持单灵根");
      seen.add(snapshot.primaryRootKey);
    }
  }
  assert.deepEqual([...seen].sort(), roots.map((root) => root.key).sort(), "秘境妖物随机灵根应覆盖完整基础灵根池");
  return [...seen].sort();
}

function auditDailyDungeonMonsters() {
  const state = createDefaultState();
  state.player.realm = 10;
  ensureStateShape(state);
  dailySettlement(state, { manual: true });
  const dungeonDay = state.dungeonDays[0];
  const groups = {
    bloodTrial: (dungeonDay?.bloodTrial?.caves || []).map((cave) => cave.monster).filter(Boolean),
    voidHall: (dungeonDay?.sects || []).map((record) => record.monsterStats).filter(Boolean),
    starSea: (dungeonDay?.public?.monsters || []).filter(Boolean)
  };
  const summary = {};
  for (const [group, monsters] of Object.entries(groups)) {
    assert.ok(monsters.length, `${group} 应生成副本妖物`);
    const unique = [...new Map(monsters.map((monster) => [monster.id, monster])).values()];
    for (const monster of unique) {
      const expectedRank = Math.floor(Number(monster.realmIndex) / 10) + 1;
      assert.equal(monster.skillRank, expectedRank, `${monster.name} 技能等级应与境界对应`);
      assert.ok(combatSkills.some((skill) => skill.id === monster.skillId), `${monster.name} 技能必须来自完整技能池`);
      assert.equal(monster.roots?.length, 1, `${monster.name} 必须是单灵根`);
      assert.ok(roots.some((root) => root.key === monster.primaryRootKey), `${monster.name} 灵根必须来自完整基础灵根池`);
    }
    summary[group] = unique.map((monster) => `${monster.realmIndex}:${monster.skillRank}:${monster.primaryRootKey}:${monster.skillId}`);
  }
  return summary;
}

const singleRun = auditSingleRun();
const ranks = auditRealmSkillRanks();
const skills = auditUnrestrictedPool();
const randomRoots = auditRandomSingleRoots();
const laws = auditOpponentLawDistribution();
const dailyDungeons = auditDailyDungeonMonsters();
console.log(JSON.stringify({ singleRun, ranks: [...new Set(ranks.map((entry) => `${entry.realm}:${entry.rank}`))].sort(), skills, randomRoots, laws, dailyDungeons }, null, 2));
console.log("dao-trial-monster-check: passed");
