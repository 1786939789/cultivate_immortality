import assert from "node:assert/strict";
import { createDefaultState, ensureStateShape, getPublicState, runProvinceSieges } from "../server/gameLogic.mjs";

let randomSeed = 0x5e1e9e;
Math.random = () => {
  randomSeed = (randomSeed * 1664525 + 1013904223) >>> 0;
  return randomSeed / 0x100000000;
};

function fatigueStats(state, people = [state.player, ...(state.npcs || [])]) {
  const values = people
    .map((person) => Math.max(0, Math.min(20, Math.floor(Number(state.sectFatigue?.[person.id]) || 0))));
  return {
    average: Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)),
    at20: values.filter((value) => value === 20).length,
    at15Plus: values.filter((value) => value >= 15).length,
    below8: values.filter((value) => value < 8).length,
    below12: values.filter((value) => value < 12).length,
    bands: {
      low: values.filter((value) => value < 8).length,
      ready: values.filter((value) => value >= 8 && value < 12).length,
      rotating: values.filter((value) => value >= 12 && value < 16).length,
      high: values.filter((value) => value >= 16).length
    },
    at0: values.filter((value) => value === 0).length
  };
}

function peopleForSect(state, sectName) {
  return [state.player, ...(state.npcs || [])]
    .filter((person) => (person.id === "player" ? state.sect.name : person.sect) === sectName);
}

function dutySnapshot(state, sectName, day) {
  const people = peopleForSect(state, sectName);
  const ids = new Set(people.map((person) => person.id));
  const wars = (state.provinceWars || []).filter((war) => Number(war.day) === Number(day));
  const attackIds = new Set(wars
    .filter((war) => war.kind !== "monster" && war.attacker === sectName)
    .flatMap((war) => (war.attackerLineup || []).map((member) => member.id))
    .filter((id) => ids.has(id)));
  const garrisonIds = new Set((state.provinces || [])
    .filter((province) => province.owner === sectName)
    .flatMap((province) => province.defenders || [])
    .filter((id) => ids.has(id)));
  for (const id of wars
    .filter((war) => war.defender === sectName)
    .flatMap((war) => (war.defenderLineup || []).map((member) => member.id))) {
    if (ids.has(id)) garrisonIds.add(id);
  }
  const restIds = new Set([...ids].filter((id) => !attackIds.has(id) && !garrisonIds.has(id)));
  return { people, attackIds, garrisonIds, restIds, wars };
}

function createRotationState(fatigue) {
  const rotation = createDefaultState();
  ensureStateShape(rotation);
  const playerSect = rotation.sect.name;
  const rivalSect = rotation.npcs.find((npc) => npc.sect !== playerSect)?.sect;
  rotation.npcs = rotation.npcs.filter((npc) => npc.sect === playerSect || npc.sect === rivalSect);
  const people = peopleForSect(rotation, playerSect).slice(0, 10);
  rotation.npcs = rotation.npcs.filter((npc) => npc.sect !== playerSect || people.some((person) => person.id === npc.id));
  rotation.provinces.forEach((territory) => {
    territory.owner = null;
    territory.defenders = [];
  });
  rotation.provinces[0].owner = playerSect;
  rotation.provinces[1].owner = playerSect;
  rotation.provinces[2].owner = rivalSect;
  rotation.provinces[3].owner = rivalSect;
  rotation.provinces[4].owner = rivalSect;
  for (const person of [rotation.player, ...rotation.npcs]) rotation.sectFatigue[person.id] = fatigue;
  return { state: rotation, playerSect, people };
}

for (const ownedCount of [1, 2, 4, 7, 10]) {
  const scenario = createRotationState(20);
  scenario.state.provinces.forEach((territory, index) => {
    territory.owner = index < ownedCount
      ? scenario.playerSect
      : index < ownedCount + 3
        ? scenario.state.npcs.find((npc) => npc.sect !== scenario.playerSect)?.sect
        : null;
    territory.defenders = [];
  });
  scenario.state.day = 1;
  runProvinceSieges(scenario.state, `2177-01-${String(ownedCount).padStart(2, "0")}`, `2177-01-${String(ownedCount).padStart(2, "0")}T00:00:00.000Z`);
  const duty = dutySnapshot(scenario.state, scenario.playerSect, 1);
  const defendedProvinceIds = new Set(scenario.state.provinces
    .filter((province) => province.owner === scenario.playerSect && (province.defenders || []).length)
    .map((province) => province.id));
  for (const war of duty.wars.filter((war) => war.defender === scenario.playerSect && (war.defenderLineup || []).length)) {
    defendedProvinceIds.add(war.provinceId);
  }
  assert.equal(defendedProvinceIds.size, ownedCount, `${ownedCount} 城宗门没有做到每城至少一守：${defendedProvinceIds.size}/${ownedCount}`);
  if (ownedCount <= 4) {
    const expectedDefenders = Math.min(scenario.people.length, Math.max(3, ownedCount));
    assert.ok(duty.garrisonIds.size >= expectedDefenders, `${ownedCount} 城宗门自动守备人数不足：${duty.garrisonIds.size}/${expectedDefenders}`);
  }
  if (ownedCount <= 7) assert.ok(duty.attackIds.size >= 1, `${ownedCount} 城宗门尚有余员时应维持攻城能力`);
  if (ownedCount === 10) assert.equal(duty.attackIds.size, 0, "成员数等于城市数时应优先全城覆盖而暂停攻城");
}

const modeDuties = new Map();
for (const mode of ["conservative", "balanced", "aggressive"]) {
  randomSeed = 0x5e1e9e;
  const scenario = createRotationState(0);
  scenario.state.provinces.forEach((territory, index) => {
    territory.owner = index < 4
      ? scenario.playerSect
      : index < 7
        ? scenario.state.npcs.find((npc) => npc.sect !== scenario.playerSect)?.sect
        : null;
    territory.defenders = [];
  });
  scenario.state.playerSectPlan = {
    targetDay: 1,
    mode,
    attack: { targetProvinceId: "", memberIds: [], autoFill: true, onConflict: "retarget" },
    defense: { provinceIdToMemberIds: {}, autoFill: true }
  };
  scenario.state.day = 1;
  runProvinceSieges(scenario.state, `2178-01-${String(modeDuties.size + 1).padStart(2, "0")}`, `2178-01-01T00:00:00.000Z`);
  modeDuties.set(mode, dutySnapshot(scenario.state, scenario.playerSect, 1));
}
assert.ok(modeDuties.get("conservative").garrisonIds.size >= modeDuties.get("balanced").garrisonIds.size, "稳守策略没有增加守备投入");
assert.ok(modeDuties.get("conservative").attackIds.size <= modeDuties.get("balanced").attackIds.size, "稳守策略没有减少攻城投入");
assert.ok(modeDuties.get("aggressive").attackIds.size >= modeDuties.get("balanced").attackIds.size, "进取策略没有增加攻城投入");

const manualDefense = createRotationState(0);
const manualProvince = manualDefense.state.provinces[0];
manualDefense.state.provinces.forEach((territory, index) => {
  territory.owner = index === 0
    ? manualDefense.playerSect
    : index === 1
      ? manualDefense.state.npcs.find((npc) => npc.sect !== manualDefense.playerSect)?.sect
      : null;
  territory.defenders = [];
});
manualDefense.state.playerSectPlan = {
  targetDay: 1,
  mode: "balanced",
  attack: { targetProvinceId: "", memberIds: [], autoFill: false, onConflict: "retarget" },
  defense: { provinceIdToMemberIds: { [manualProvince.id]: [manualDefense.people[0].id] }, autoFill: false }
};
manualDefense.state.day = 1;
runProvinceSieges(manualDefense.state, "2179-01-01", "2179-01-01T00:00:00.000Z");
const manualDuty = dutySnapshot(manualDefense.state, manualDefense.playerSect, 1);
assert.deepEqual([...manualDuty.garrisonIds], [manualDefense.people[0].id], "关闭自动补位后不应改动手动守城名单");

for (const memberCount of [1, 2, 3, 4, 5]) {
  const scenario = createRotationState(20);
  const kept = scenario.people.slice(0, memberCount);
  const keptIds = new Set(kept.map((person) => person.id));
  scenario.state.npcs = scenario.state.npcs.filter((npc) => npc.sect !== scenario.playerSect || keptIds.has(npc.id));
  scenario.state.provinces.forEach((territory, index) => {
    territory.owner = index === 0 ? scenario.playerSect : index === 1 ? scenario.state.npcs.find((npc) => npc.sect !== scenario.playerSect)?.sect : null;
    territory.defenders = [];
  });
  scenario.state.day = 1;
  runProvinceSieges(scenario.state, `2188-01-${String(memberCount).padStart(2, "0")}`, `2188-01-${String(memberCount).padStart(2, "0")}T00:00:00.000Z`);
  const duty = dutySnapshot(scenario.state, scenario.playerSect, 1);
  assert.ok(duty.garrisonIds.size >= 1, `${memberCount} 人宗门有城时必须保留守军：${JSON.stringify({ attack: [...duty.attackIds], garrison: [...duty.garrisonIds], rest: [...duty.restIds], wars: duty.wars.map((war) => ({ attacker: war.attacker, defender: war.defender, captured: war.captured, attackers: war.attackerLineup?.map((member) => member.id), defenders: war.defenderLineup?.map((member) => member.id) })) })}`);
  if (memberCount >= 2) assert.ok(duty.attackIds.size >= 1, `${memberCount} 人宗门应维持最低攻城能力`);
  if (memberCount >= 4) assert.ok(duty.restIds.size >= 1, `${memberCount} 人宗门应保留轮换休整成员`);
}

const zeroTerritory = createRotationState(20);
zeroTerritory.state.provinces.forEach((territory, index) => {
  territory.owner = index < 3 ? zeroTerritory.state.npcs.find((npc) => npc.sect !== zeroTerritory.playerSect)?.sect : null;
  territory.defenders = [];
});
zeroTerritory.state.day = 1;
runProvinceSieges(zeroTerritory.state, "2189-01-01", "2189-01-01T00:00:00.000Z");
const zeroTerritoryDuty = dutySnapshot(zeroTerritory.state, zeroTerritory.playerSect, 1);
assert.ok(zeroTerritoryDuty.attackIds.size >= 3, "零城高疲劳宗门应维持破局攻城队");
assert.ok(zeroTerritoryDuty.restIds.size >= 1, "零城高疲劳宗门也应保留轮换休整组");

for (const startingFatigue of [16, 19, 20]) {
  const scenario = createRotationState(startingFatigue);
  scenario.state.day = 1;
  runProvinceSieges(scenario.state, `2199-01-${String(startingFatigue).padStart(2, "0")}`, `2199-01-${String(startingFatigue).padStart(2, "0")}T00:00:00.000Z`);
  const duty = dutySnapshot(scenario.state, scenario.playerSect, 1);
  assert.ok(duty.attackIds.size >= 3, `全员疲劳 ${startingFatigue} 时仍应至少派 3 人攻城，实际 ${duty.attackIds.size}`);
  assert.ok(duty.garrisonIds.size >= 1, `全员疲劳 ${startingFatigue} 时仍应保留守军`);
  assert.ok(duty.restIds.size >= 1, `全员疲劳 ${startingFatigue} 时仍应保留轮换休整组`);
}

const longRotation = createRotationState(20);
const consecutiveDuty = new Map(longRotation.people.map((person) => [person.id, 0]));
let maximumConsecutiveDuty = 0;
let maximumAllowedDuty = 0;
for (let day = 1; day <= 90; day += 1) {
  longRotation.state.day = day;
  const ownedProvinceIdsBefore = longRotation.state.provinces
    .filter((province) => province.owner === longRotation.playerSect)
    .map((province) => province.id);
  const ownedBefore = ownedProvinceIdsBefore.length;
  runProvinceSieges(longRotation.state, `2299-${String(Math.ceil(day / 28)).padStart(2, "0")}-${String((day - 1) % 28 + 1).padStart(2, "0")}`, `2299-01-01T00:00:00.000Z`);
  const duty = dutySnapshot(longRotation.state, longRotation.playerSect, day);
  const defendedProvinceIds = new Set(longRotation.state.provinces
    .filter((province) => province.owner === longRotation.playerSect && (province.defenders || []).length)
    .map((province) => province.id));
  for (const war of duty.wars.filter((war) => war.defender === longRotation.playerSect && (war.defenderLineup || []).length)) {
    defendedProvinceIds.add(war.provinceId);
  }
  assert.ok(ownedProvinceIdsBefore.every((provinceId) => defendedProvinceIds.has(provinceId)), `长期轮换第 ${day} 天存在原有城市未安排守军`);
  const remainingAfterCoverage = Math.max(0, longRotation.people.length - ownedBefore);
  const restFloor = remainingAfterCoverage >= 2 ? 1 : 0;
  const expectedAttackers = Math.min(1, Math.max(0, remainingAfterCoverage - restFloor));
  assert.ok(duty.attackIds.size >= expectedAttackers, `长期轮换第 ${day} 天攻城人数不足：${duty.attackIds.size}/${expectedAttackers}`);
  if (ownedBefore) assert.ok(duty.garrisonIds.size >= 1, `长期轮换第 ${day} 天计划时有城却无守军`);
  if (restFloor) assert.ok(duty.restIds.size >= 1, `长期轮换第 ${day} 天有余员却无休整成员`);
  const allowedDuty = restFloor ? Math.ceil(longRotation.people.length / Math.max(1, duty.restIds.size)) - 1 : 0;
  maximumAllowedDuty = Math.max(maximumAllowedDuty, allowedDuty);
  for (const person of longRotation.people) {
    const active = duty.attackIds.has(person.id) || duty.garrisonIds.has(person.id);
    const next = restFloor && active ? (consecutiveDuty.get(person.id) || 0) + 1 : 0;
    consecutiveDuty.set(person.id, next);
    maximumConsecutiveDuty = Math.max(maximumConsecutiveDuty, next);
  }
}
const longRotationFatigue = fatigueStats(longRotation.state, longRotation.people);
assert.ok(longRotationFatigue.at20 < longRotation.people.length, "长期轮换后仍然全员满疲劳");

const fixedCoverage = createRotationState(20);
fixedCoverage.state.provinces.forEach((territory, index) => {
  territory.owner = index < 7 ? fixedCoverage.playerSect : null;
  territory.defenders = [];
});
const fixedConsecutive = new Map(fixedCoverage.people.map((person) => [person.id, 0]));
let fixedMaximumConsecutive = 0;
for (let day = 1; day <= 30; day += 1) {
  fixedCoverage.state.provinces.forEach((territory, index) => {
    territory.owner = index < 7 ? fixedCoverage.playerSect : null;
    territory.defenders = [];
  });
  fixedCoverage.state.day = day;
  runProvinceSieges(fixedCoverage.state, `2277-02-${String(day).padStart(2, "0")}`, `2277-02-${String(day).padStart(2, "0")}T00:00:00.000Z`);
  const duty = dutySnapshot(fixedCoverage.state, fixedCoverage.playerSect, day);
  const defendedProvinceIds = new Set(fixedCoverage.state.provinces
    .filter((province) => province.owner === fixedCoverage.playerSect && (province.defenders || []).length)
    .map((province) => province.id));
  for (const war of duty.wars.filter((war) => war.defender === fixedCoverage.playerSect && (war.defenderLineup || []).length)) {
    defendedProvinceIds.add(war.provinceId);
  }
  assert.ok(fixedCoverage.state.provinces.slice(0, 7).every((province) => defendedProvinceIds.has(province.id)), `固定七城第 ${day} 天存在空城`);
  assert.ok(duty.restIds.size >= 1, `固定七城第 ${day} 天无轮换休整成员`);
  for (const person of fixedCoverage.people) {
    const active = duty.attackIds.has(person.id) || duty.garrisonIds.has(person.id);
    const next = active ? (fixedConsecutive.get(person.id) || 0) + 1 : 0;
    fixedConsecutive.set(person.id, next);
    fixedMaximumConsecutive = Math.max(fixedMaximumConsecutive, next);
  }
}
assert.ok(fixedMaximumConsecutive <= 9, `固定七城轮换失效，最长连续执勤 ${fixedMaximumConsecutive} 天`);

const state = createDefaultState();
ensureStateShape(state);
const simulatedSects = [state.sect.name, ...new Set(state.npcs.map((npc) => npc.sect).filter((name) => name !== state.sect.name))].slice(0, 4);
state.npcs = state.npcs.filter((npc) => simulatedSects.includes(npc.sect));
const simulatedPeople = [state.player, ...state.npcs];
state.provinces.forEach((territory, index) => {
  territory.owner = index < 12 ? simulatedSects[index % simulatedSects.length] : null;
  territory.defenders = [];
});
const days = 24;
const daily = [];

for (let day = 1; day <= days; day += 1) {
  state.day = day;
  runProvinceSieges(state, `2099-01-${String(day).padStart(2, "0")}`, `2099-01-${String(day).padStart(2, "0")}T00:00:00.000Z`);
  const wars = (state.provinceWars || []).filter((war) => Number(war.day) === day);
  const sectWars = wars.filter((war) => war.kind !== "monster");
  const occupiedWars = sectWars.filter((war) => war.ownerBefore);
  const targetIds = sectWars.map((war) => war.provinceId);
  assert.equal(new Set(targetIds).size, targetIds.length, `第 ${day} 天存在多个宗门攻击同一城市`);
  daily.push({
    day,
    wars: wars.length,
    sectWars: sectWars.length,
    occupiedWars: occupiedWars.length,
    defenderCounts: occupiedWars.map((war) => (war.defenderLineup || []).length),
    defenderTerritoryCounts: occupiedWars.map((war) => Number(war.defenderTerritoryCount) || 0),
    captured: occupiedWars.filter((war) => war.captured).length,
    fatigue: fatigueStats(state, simulatedPeople)
  });
}

const finalFatigue = fatigueStats(state, simulatedPeople);
const peopleCount = simulatedPeople.length;
const publicState = getPublicState(state);
const playerSect = publicState.sect.name;
const defenderCounts = daily.flatMap((item) => item.defenderCounts);
const defenderTerritoryCounts = daily.flatMap((item) => item.defenderTerritoryCounts);
const adequatelyStaffedWars = defenderCounts
  .map((count, index) => ({ count, territoryCount: defenderTerritoryCounts[index] }))
  .filter((item) => item.territoryCount <= 6);
const occupiedWarCount = daily.reduce((sum, item) => sum + item.occupiedWars, 0);
const capturedWarCount = daily.reduce((sum, item) => sum + item.captured, 0);
const multiDefenderRate = defenderCounts.filter((count) => count >= 2).length / Math.max(1, defenderCounts.length);
const averageDefenders = defenderCounts.reduce((sum, count) => sum + count, 0) / Math.max(1, defenderCounts.length);
const captureRate = capturedWarCount / Math.max(1, occupiedWarCount);
assert.ok(!("sectSiegeDuty" in publicState), "公开状态泄露了内部轮换负担数据");
const enemyTerritories = publicState.provinces.filter((territory) => territory.owner && territory.owner !== playerSect);
const ownTerritories = publicState.provinces.filter((territory) => territory.owner === playerSect);

assert.ok(enemyTerritories.length > 0, "模拟后应存在敌方城市");
assert.ok(enemyTerritories.every((territory) => Array.isArray(territory.defenders) && territory.defenders.length === 0), "公开状态泄露了敌方今日守军");
assert.ok(enemyTerritories.every((territory) => territory.defenseIntel?.label), "敌方城市缺少模糊守备情报");
assert.ok(ownTerritories.every((territory) => Array.isArray(territory.defenders)), "己方城市缺少可管理的守军状态");

const forecasts = Object.values(publicState.derived.sectStrategy.forecasts || {});
assert.ok(forecasts.length > 0, "应生成敌方城市战前研判");
assert.ok(forecasts.every((forecast) => forecast.outlook && forecast.risk), "战前研判缺少态势或守备迹象");
assert.ok(forecasts.every((forecast) => !("winChance" in forecast) && !("defenderPower" in forecast)), "战前研判仍泄露精确胜率或守军战力");

const detailedWar = (state.provinceWars || []).find((war) => war.kind !== "monster" && war.ownerBefore);
assert.ok(detailedWar, "模拟期间应至少发生一场宗门攻守战");
assert.ok(detailedWar.strategy?.preBattle?.points?.length, "战报缺少战前研判");
assert.ok(detailedWar.strategy?.postBattle?.points?.length, "战报缺少战后查明");
assert.ok(defenderCounts.length > 0, "长期模拟没有产生有效守城战报");
assert.ok(adequatelyStaffedWars.length > 0, "长期模拟没有产生人员充足的守城场景");
assert.ok(adequatelyStaffedWars.every((item) => item.count >= 2), `持城不超过 6 座时仍出现单人守城：${JSON.stringify(adequatelyStaffedWars)}`);
assert.ok(multiDefenderRate >= 0.4, `多人守城占比过低：${(multiDefenderRate * 100).toFixed(1)}%`);
assert.ok(averageDefenders >= 1.5, `平均守军人数过低：${averageDefenders.toFixed(2)}`);
assert.ok(captureRate <= 0.75, `城池易主率过高：${(captureRate * 100).toFixed(1)}%`);
const selectedAttackReasons = (detailedWar.strategy?.attackers?.roster || [])
  .filter((member) => member.selected)
  .map((member) => member.reason);
const selectedDefenseReasons = (detailedWar.strategy?.defenders?.roster || [])
  .filter((member) => member.selected)
  .map((member) => member.reason);
assert.ok(selectedAttackReasons.length, "战报缺少入选攻城成员说明");
assert.ok(selectedDefenseReasons.length, "战报缺少入选守城成员说明");
assert.ok(selectedAttackReasons.every((reason) => reason.includes("轮换顺位") || reason.includes("手动军令")), "攻城入选理由没有反映实际轮换或手动军令");
assert.ok(selectedDefenseReasons.every((reason) => reason.includes("至少 1 名守军") || reason.includes("增援名额") || reason.includes("手动布防")), "守城入选理由没有说明保底覆盖、增援或手动布防");

assert.ok(finalFatigue.at20 < peopleCount * 0.2, `满疲劳人数仍过高：${finalFatigue.at20}/${peopleCount}`);
assert.ok(finalFatigue.at15Plus < peopleCount * 0.2, `高疲劳人数仍过高：${finalFatigue.at15Plus}/${peopleCount}`);
assert.ok(finalFatigue.below12 >= peopleCount * 0.25, `可出勤梯队人数不足：${finalFatigue.below12}/${peopleCount}`);
assert.ok(finalFatigue.average < 12, `平均疲劳仍过高：${finalFatigue.average}`);
assert.ok(finalFatigue.average >= 0.5, `平均疲劳过低，系统缺少累积感：${finalFatigue.average}`);
assert.ok(longRotationFatigue.below12 >= longRotation.people.length * 0.2, `长期轮换未形成可出勤战备组：${longRotationFatigue.below12}/${longRotation.people.length}`);

console.log(JSON.stringify({
  days,
  peopleCount,
  simulatedSects,
  finalFatigue,
  lastFiveDays: daily.slice(-5),
  highFatigueRotation: {
    days: 90,
    maximumConsecutiveDuty,
    maximumAllowedDuty,
    fixedSevenCityMaximumConsecutiveDuty: fixedMaximumConsecutive,
    finalFatigue: longRotationFatigue
  },
  battleStability: {
    occupiedWars: occupiedWarCount,
    defenderDistribution: Object.fromEntries([...new Set(defenderCounts)].sort((a, b) => a - b).map((count) => [count, defenderCounts.filter((value) => value === count).length])),
    averageDefenders: Number(averageDefenders.toFixed(2)),
    multiDefenderRate: Number(multiDefenderRate.toFixed(3)),
    captureRate: Number(captureRate.toFixed(3))
  },
  modeDeployment: Object.fromEntries([...modeDuties].map(([mode, duty]) => [mode, {
    attack: duty.attackIds.size,
    defense: duty.garrisonIds.size,
    rest: duty.restIds.size
  }]))
}, null, 2));
