import { createHash } from "node:crypto";
import { parseMysqlJson } from "./mysqlDb.mjs";
import { normalizePersistenceDomains, persistenceDomains } from "./persistenceDomains.mjs";

const metadataKeys = new Set(["day", "rebirth", "calendarStartDate", "lastSettlementDate"]);
const extractedKeys = new Set(["player", "npcs", "equipment", "duelDays", "dungeonDays", "provinceWars", "adminProfiles"]);
const historyFields = ["dailyRecords", "breakthroughs", "skillUpgrades", "duelHistory", "dungeonHistory"];

function json(value) {
  return JSON.stringify(value === undefined ? null : value);
}

export function contentHash(value) {
  return createHash("sha256").update(typeof value === "string" ? value : json(value)).digest("hex");
}

function rowKey(position, hint, value) {
  const cleanHint = String(hint || "").replace(/[^A-Za-z0-9_.:-]/g, "-").slice(0, 80);
  return `${position}:${cleanHint || contentHash(value).slice(0, 24)}`;
}

function historyRecordKey(hint, value) {
  const cleanHint = String(hint || "record").replace(/[^A-Za-z0-9_.:-]/g, "-").slice(0, 100);
  return `${cleanHint}:${contentHash(value).slice(0, 32)}`;
}

function addJsonRow(map, key, row, value) {
  const text = json(value);
  map.set(key, { ...row, json: text, hash: contentHash(text) });
}

function extractPortrait(value, portraits) {
  const text = String(value || "").trim();
  if (!text) return "";
  const portraitId = contentHash(text);
  if (portraits.has(portraitId)) return portraitId;
  const match = text.match(/^data:([^;,]+);base64,(.+)$/s);
  if (match) {
    const imageData = Buffer.from(match[2], "base64");
    portraits.set(portraitId, {
      portraitId,
      contentType: match[1],
      imageData,
      sourceUrl: null,
      byteSize: imageData.length
    });
  } else {
    portraits.set(portraitId, {
      portraitId,
      contentType: null,
      imageData: null,
      sourceUrl: text,
      byteSize: Buffer.byteLength(text)
    });
  }
  return portraitId;
}

function portraitValue(portrait) {
  if (!portrait) return "";
  if (portrait.sourceUrl) return portrait.sourceUrl;
  if (!portrait.imageData) return "";
  return `data:${portrait.contentType || "image/webp"};base64,${Buffer.from(portrait.imageData).toString("base64")}`;
}

function compactCultivator(entity, portraits) {
  const current = structuredClone(entity || {});
  const portraitId = extractPortrait(current.portraitUrl, portraits);
  delete current.portraitUrl;
  const histories = {};
  for (const field of historyFields) {
    histories[field] = Array.isArray(current[field]) ? current[field] : [];
    delete current[field];
  }
  if (current.spiritPearls && typeof current.spiritPearls === "object") {
    histories.spiritPearlHistory = Array.isArray(current.spiritPearls.history) ? current.spiritPearls.history : [];
    current.spiritPearls = { ...current.spiritPearls };
    delete current.spiritPearls.history;
  }
  return { current, histories, portraitId };
}

function encodeCultivator(encoded, entity, kind, position) {
  const cultivatorId = String(entity?.id || (kind === "player" ? "player" : `npc-${position + 1}`));
  const { current, histories, portraitId } = compactCultivator(entity, encoded.portraits);
  addJsonRow(encoded.cultivators, cultivatorId, {
    cultivatorId,
    kind,
    position,
    name: String(entity?.name || ""),
    realm: Number(entity?.realm || 0),
    xp: Number(entity?.xp || 0),
    hp: Number(entity?.hp || 0),
    maxHp: Number(entity?.maxHp || 0),
    mana: Number(entity?.mana || 0),
    maxMana: Number(entity?.maxMana || 0),
    sect: String(entity?.sect || ""),
    portraitId
  }, current);
  const cultivatorRow = encoded.cultivators.get(cultivatorId);
  cultivatorRow.hash = contentHash(`${portraitId}\u0000${cultivatorRow.json}`);

  for (const [historyType, records] of Object.entries(histories)) {
    const duplicateCounts = new Map();
    records.forEach((record, historyPosition) => {
      const hint = record?.id || record?.replayId || record?.day || record?.date || record?.time || "record";
      const baseKey = historyRecordKey(hint, record);
      const duplicateIndex = duplicateCounts.get(baseKey) || 0;
      duplicateCounts.set(baseKey, duplicateIndex + 1);
      const recordKey = duplicateIndex ? `${baseKey}:${duplicateIndex}` : baseKey;
      const key = `${cultivatorId}|${historyType}|${recordKey}`;
      addJsonRow(encoded.cultivatorHistory, key, {
        cultivatorId,
        historyType,
        recordKey,
        day: Number(record?.day || 0) || null,
        position: historyPosition
      }, record);
    });
  }
}

function encodeDungeons(encoded, records) {
  (records || []).forEach((dayRecord, dayPosition) => {
    const day = Number(dayRecord?.day || dayPosition + 1);
    encoded.dungeonDays.set(String(day), { day, date: String(dayRecord?.date || "") });
    const groups = [
      ["bloodTrial", dayRecord?.bloodTrial ? [dayRecord.bloodTrial] : []],
      ["solo", dayRecord?.solo || []],
      ["sect", dayRecord?.sects || []],
      ["public", dayRecord?.public ? [dayRecord.public] : []],
      ["voidHallSpiritPools", dayRecord?.voidHallSpiritPools ? [dayRecord.voidHallSpiritPools] : []]
    ];
    for (const [recordType, values] of groups) {
      values.forEach((value, position) => {
        const hint = value?.id || value?.name || value?.sect || value?.type || recordType;
        const recordKey = rowKey(position, hint, value);
        addJsonRow(encoded.dungeonRecords, `${day}|${recordType}|${recordKey}`, {
          day,
          recordType,
          recordKey,
          position
        }, value);
      });
    }
  });
}

function encodeAdminProfiles(encoded, adminProfiles = {}) {
  const groups = [
    ["cultivator", adminProfiles.cultivators || {}],
    ["sect", adminProfiles.sects || {}]
  ];
  for (const [profileType, profiles] of groups) {
    Object.entries(profiles).forEach(([profileKey, profile], position) => {
      const current = structuredClone(profile || {});
      const portraitId = extractPortrait(current.portraitUrl, encoded.portraits);
      delete current.portraitUrl;
      addJsonRow(encoded.adminProfiles, `${profileType}|${profileKey}`, {
        profileType,
        profileKey,
        position,
        portraitId
      }, current);
      const profileRow = encoded.adminProfiles.get(`${profileType}|${profileKey}`);
      profileRow.hash = contentHash(`${portraitId}\u0000${profileRow.json}`);
    });
  }
  for (const [profileType, value] of [["sectNameMap", adminProfiles.sectNameMap || {}], ["playerSect", adminProfiles.playerSect || ""]]) {
    addJsonRow(encoded.adminProfiles, `${profileType}|_`, {
      profileType,
      profileKey: "_",
      position: 0,
      portraitId: ""
    }, value);
  }
}

export function encodeState(state, options = {}) {
  const domains = normalizePersistenceDomains(options.domains);
  const cultivatorIds = options.cultivatorIds ? new Set([...options.cultivatorIds].map(String)) : null;
  const encoded = {
    metadata: {
      day: Number(state.day || 1),
      rebirth: Number(state.rebirth || 1),
      calendarStartDate: String(state.calendarStartDate || ""),
      lastSettlementDate: String(state.lastSettlementDate || ""),
      stateVersion: Number(state.storageCompactionVersion || 1)
    },
    sections: new Map(),
    portraits: new Map(),
    cultivators: new Map(),
    cultivatorHistory: new Map(),
    equipment: new Map(),
    duelDays: new Map(),
    duelMatches: new Map(),
    dungeonDays: new Map(),
    dungeonRecords: new Map(),
    provinceWars: new Map(),
    adminProfiles: new Map()
  };

  if (domains.has(persistenceDomains.sections)) {
    for (const [key, value] of Object.entries(state)) {
      if (metadataKeys.has(key) || extractedKeys.has(key) || key.startsWith("__")) continue;
      addJsonRow(encoded.sections, key, { sectionKey: key }, value);
    }
  }

  if (domains.has(persistenceDomains.cultivators)) {
    if (!cultivatorIds || cultivatorIds.has("player")) encodeCultivator(encoded, state.player || {}, "player", 0);
    (state.npcs || []).forEach((npc, position) => {
      if (!cultivatorIds || cultivatorIds.has(String(npc.id))) encodeCultivator(encoded, npc, "npc", position);
    });
  }

  if (domains.has(persistenceDomains.equipment)) (state.equipment || []).forEach((item, position) => {
    const equipmentKey = rowKey(position, item?.instanceId || item?.id || item?.itemId || "equipment", item);
    addJsonRow(encoded.equipment, equipmentKey, {
      equipmentKey,
      position,
      ownerId: String(item?.ownerId || item?.owner?.id || ""),
      itemId: String(item?.itemId || item?.id || ""),
      slot: String(item?.slot || "")
    }, item);
  });

  if (domains.has(persistenceDomains.duels)) (state.duelDays || []).forEach((dayRecord, dayPosition) => {
    const day = Number(dayRecord?.day || dayPosition + 1);
    encoded.duelDays.set(String(day), {
      day,
      date: String(dayRecord?.date || ""),
      createdAt: String(dayRecord?.createdAt || "")
    });
    (dayRecord?.matches || []).forEach((match, position) => {
      const matchId = rowKey(position, match?.id || match?.matchId || "match", match);
      addJsonRow(encoded.duelMatches, `${day}|${matchId}`, {
        day,
        matchId,
        position,
        matchType: String(match?.type || ""),
        leftId: String(match?.left?.id || ""),
        rightId: String(match?.right?.id || ""),
        winnerId: String(match?.winner?.id || ""),
        loserId: String(match?.loser?.id || ""),
        replayId: String(match?.replayId || match?.replay?.replayId || "")
      }, match);
    });
  });

  if (domains.has(persistenceDomains.dungeons)) encodeDungeons(encoded, state.dungeonDays || []);

  if (domains.has(persistenceDomains.provinceWars)) (state.provinceWars || []).forEach((war, position) => {
    const warId = rowKey(position, war?.id || war?.provinceId || "war", war);
    addJsonRow(encoded.provinceWars, warId, {
      warId,
      day: Number(war?.day || 0) || null,
      position,
      provinceId: String(war?.provinceId || ""),
      attacker: String(war?.attacker || ""),
      defender: String(war?.defender || ""),
      captured: war?.captured ? 1 : 0
    }, war);
  });

  if (domains.has(persistenceDomains.adminProfiles)) encodeAdminProfiles(encoded, state.adminProfiles || {});
  return encoded;
}

function mapPortraits(rows) {
  return new Map(rows.map((row) => [row.portrait_id, {
    contentType: row.content_type,
    imageData: row.image_data,
    sourceUrl: row.source_url
  }]));
}

function decodeCultivators(cultivatorRows, historyRows, portraitRows) {
  const portraits = mapPortraits(portraitRows);
  const histories = new Map();
  for (const row of historyRows) {
    const key = `${row.cultivator_id}|${row.history_type}`;
    const list = histories.get(key) || [];
    list.push({ position: Number(row.position_no), value: parseMysqlJson(row.record_json, {}) });
    histories.set(key, list);
  }
  let player = null;
  const npcs = [];
  for (const row of cultivatorRows) {
    const entity = parseMysqlJson(row.cultivator_json, {}) || {};
    const hasTypedMetrics = Number(row.metrics_revision || 0) > 0;
    Object.assign(entity, {
      id: entity.id || row.cultivator_id,
      name: row.name || entity.name || "",
      realm: Number(row.realm_no ?? entity.realm ?? 0),
      xp: Number(row.xp ?? entity.xp ?? 0),
      hp: Number(row.hp ?? entity.hp ?? 0),
      maxHp: Number(row.max_hp ?? entity.maxHp ?? 0),
      mana: Number(row.mana ?? entity.mana ?? 0),
      maxMana: Number(row.max_mana ?? entity.maxMana ?? 0),
      sect: row.sect_name || entity.sect || "",
      spirit: Number(hasTypedMetrics ? row.spirit : entity.spirit ?? 0),
      reputation: Number(hasTypedMetrics ? row.reputation : entity.reputation ?? 0),
      body: Number(hasTypedMetrics ? row.body : entity.body ?? 0),
      wisdom: Number(hasTypedMetrics ? row.wisdom : entity.wisdom ?? 0),
      attack: Number(hasTypedMetrics ? row.attack : entity.attack ?? 0),
      defense: Number(hasTypedMetrics ? row.defense : entity.defense ?? 0),
      divineSense: Number(hasTypedMetrics ? row.divine_sense : entity.divineSense ?? 0),
      chance: Number(hasTypedMetrics ? row.chance : entity.chance ?? 0),
      wealth: Number(hasTypedMetrics ? row.wealth : entity.wealth ?? 0),
      heartDemon: Number(hasTypedMetrics ? row.heart_demon : entity.heartDemon ?? 0)
    });
    entity.portraitUrl = portraitValue(portraits.get(row.portrait_id));
    for (const field of historyFields) {
      entity[field] = (histories.get(`${row.cultivator_id}|${field}`) || [])
        .sort((left, right) => left.position - right.position)
        .map((item) => item.value);
    }
    if (entity.spiritPearls && typeof entity.spiritPearls === "object") {
      entity.spiritPearls.history = (histories.get(`${row.cultivator_id}|spiritPearlHistory`) || [])
        .sort((left, right) => left.position - right.position)
        .map((item) => item.value);
    }
    if (row.cultivator_kind === "player") player = entity;
    else npcs.push({ position: Number(row.position_no), entity });
  }
  return { player: player || {}, npcs: npcs.sort((a, b) => a.position - b.position).map((item) => item.entity) };
}

export function decodeDungeons(dayRows, recordRows) {
  const recordsByDay = new Map();
  for (const row of recordRows) {
    const day = Number(row.day_no);
    const groups = recordsByDay.get(day) || new Map();
    const list = groups.get(row.record_type) || [];
    list.push({ position: Number(row.position_no), value: parseMysqlJson(row.record_json, null) });
    groups.set(row.record_type, list);
    recordsByDay.set(day, groups);
  }
  return dayRows.map((row) => {
    const day = Number(row.day_no);
    const groups = recordsByDay.get(day) || new Map();
    const values = (type) => (groups.get(type) || []).sort((a, b) => a.position - b.position).map((item) => item.value);
    return {
      day,
      date: row.date_key || "",
      bloodTrial: values("bloodTrial")[0] || null,
      solo: values("solo"),
      sects: values("sect"),
      voidHallSpiritPools: values("voidHallSpiritPools")[0] || [],
      public: values("public")[0] || null
    };
  });
}

export function decodeDungeonDay(dayRow, recordRows = []) {
  if (!dayRow) return null;
  return decodeDungeons([dayRow], recordRows)[0] || null;
}

function decodeAdminProfiles(rows, portraitRows) {
  const portraits = mapPortraits(portraitRows);
  const result = { cultivators: {}, sects: {}, sectNameMap: {}, playerSect: "" };
  for (const row of rows) {
    const value = parseMysqlJson(row.profile_json, null);
    if (row.profile_type === "cultivator" || row.profile_type === "sect") {
      const profile = value || {};
      profile.portraitUrl = portraitValue(portraits.get(row.portrait_id));
      result[row.profile_type === "cultivator" ? "cultivators" : "sects"][row.profile_key] = profile;
    } else if (row.profile_type === "sectNameMap") result.sectNameMap = value || {};
    else if (row.profile_type === "playerSect") result.playerSect = value || "";
  }
  return result;
}

export function decodeState(rows) {
  const state = {
    day: Number(rows.save.day_no || 1),
    rebirth: Number(rows.save.rebirth_no || 1),
    calendarStartDate: rows.save.calendar_start_date || "",
    lastSettlementDate: rows.save.last_settlement_date || ""
  };
  for (const row of rows.sections) state[row.section_key] = parseMysqlJson(row.section_json, null);
  Object.assign(state, decodeCultivators(rows.cultivators, rows.cultivatorHistory, rows.portraits));
  state.equipment = rows.equipment
    .sort((a, b) => Number(a.position_no) - Number(b.position_no))
    .map((row) => parseMysqlJson(row.item_json, {}));

  const matchesByDay = new Map();
  for (const row of rows.duelMatches) {
    const day = Number(row.day_no);
    const list = matchesByDay.get(day) || [];
    list.push({ position: Number(row.position_no), value: parseMysqlJson(row.match_json, {}) });
    matchesByDay.set(day, list);
  }
  state.duelDays = rows.duelDays.map((row) => ({
    day: Number(row.day_no),
    date: row.date_key || "",
    createdAt: row.created_at_text || "",
    matches: (matchesByDay.get(Number(row.day_no)) || []).sort((a, b) => a.position - b.position).map((item) => item.value)
  }));
  state.dungeonDays = decodeDungeons(rows.dungeonDays, rows.dungeonRecords);
  state.provinceWars = rows.provinceWars
    .sort((a, b) => Number(a.position_no) - Number(b.position_no))
    .map((row) => parseMysqlJson(row.war_json, {}));
  state.adminProfiles = decodeAdminProfiles(rows.adminProfiles, rows.portraits);
  return state;
}
