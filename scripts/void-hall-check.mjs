import assert from "node:assert/strict";
import {
  createDefaultState,
  ensureStateShape,
  getPublicState,
  powerOf,
  runDailyDungeons
} from "../server/gameLogic.mjs";

const state = createDefaultState();
ensureStateShape(state);
state.day = 8;
state.dungeonDays = [];

const sectMembers = new Map();
const addMember = (sect, entity) => {
  if (!sectMembers.has(sect)) sectMembers.set(sect, []);
  sectMembers.get(sect).push(entity);
};
addMember(state.sect.name, state.player);
for (const npc of state.npcs) addMember(npc.sect, npc);

const activeSects = [...sectMembers.entries()].filter(([sect, members]) => sect && members.length);
assert.ok(activeSects.length >= 4, "专项校验至少需要四个有成员的宗门");
for (const [index, [, members]] of activeSects.entries()) {
  const realm = index % 2 === 0 ? 4 : 5;
  for (const member of members) member.realm = realm;
}

const dungeonDay = runDailyDungeons(state, "2026-08-15", "2026-08-15 08:00:00");
const records = dungeonDay.sects || [];
assert.equal(records.length, activeSects.length, "每个有成员的宗门都应生成一条虚天殿战绩");

const recordsByRealm = new Map();
for (const record of records) {
  if (!recordsByRealm.has(record.monsterRealm)) recordsByRealm.set(record.monsterRealm, []);
  recordsByRealm.get(record.monsterRealm).push(record);
}
assert.equal(recordsByRealm.size, 2, "测试数据应只需要两个境界的妖物");

for (const [realm, realmRecords] of recordsByRealm.entries()) {
  assert.ok(realmRecords.length >= 2, `${realm} 应由多个宗门共享同一只妖物`);
  const expected = realmRecords[0];
  for (const record of realmRecords.slice(1)) {
    assert.equal(record.monster, expected.monster, `${realm} 的妖物名称必须一致`);
    assert.deepEqual(record.monsterStats, expected.monsterStats, `${realm} 的妖物属性必须一致`);
    assert.equal(record.monsterPower, expected.monsterPower, `${realm} 的妖物战力必须一致`);
    assert.equal(record.requiredDamage, expected.requiredDamage, `${realm} 的妖物血量必须一致`);
  }
}

const cultivators = new Map([[state.player.id, state.player], ...state.npcs.map((npc) => [npc.id, npc])]);
for (const record of records) {
  assert.ok(record.battles.length > 0, `${record.sect} 应至少有一场战斗`);
  assert.equal(record.battles[0].monsterStartHp, record.battles[0].monsterMaxHp, `${record.sect} 应从妖物满血开始`);
  assert.equal(record.battles[0].monsterStartMana, record.battles[0].monsterMaxMana, `${record.sect} 应从妖物满蓝开始`);

  const expectedOrder = sectMembers.get(record.sect)
    .map((entity) => ({ id: entity.id, power: powerOf(entity, state) }))
    .sort((a, b) => a.power - b.power || String(a.id).localeCompare(String(b.id)))
    .map((entry) => entry.id)
    .slice(0, record.battles.length);
  const actualOrder = record.battles.map((battle) => battle.challenger.id);
  assert.deepEqual(actualOrder, expectedOrder, `${record.sect} 应按战力从低到高出战`);

  const battlePowers = actualOrder.map((id) => powerOf(cultivators.get(id), state));
  assert.ok(battlePowers.every((power, index) => index === 0 || battlePowers[index - 1] <= power), `${record.sect} 出战战力必须单调递增`);
}

const publicDungeonDay = getPublicState(state).dungeonDays.find((record) => record.day === state.day);
assert.equal(publicDungeonDay?.sects?.length, records.length, "公开状态应返回完整虚天殿宗门战绩");
assert.doesNotThrow(() => JSON.stringify(publicDungeonDay), "虚天殿公开战绩必须可以序列化");
for (const realmRecords of recordsByRealm.values()) {
  const publicRecords = realmRecords.map((record) => publicDungeonDay.sects.find((item) => item.sect === record.sect));
  assert.ok(publicRecords.every(Boolean), "公开状态不应遗漏宗门战绩");
  for (const record of publicRecords.slice(1)) {
    assert.deepEqual(record.monsterStats, publicRecords[0].monsterStats, "公开状态中的同境界妖物属性必须一致");
  }
}

console.log(`void-hall-check: passed (${records.length} sects, ${recordsByRealm.size} shared monsters)`);
