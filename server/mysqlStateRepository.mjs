import { compactStateForStorage } from "./gameLogic.mjs";
import { ensureMysqlSchema, mysqlPool, parseMysqlJson, withMysqlTransaction } from "./mysqlDb.mjs";
import { contentHash, decodeState, encodeState } from "./mysqlStateCodec.mjs";

async function existingHashes(connection, table, saveId, keyColumns) {
  const columns = [...keyColumns, "content_hash"].join(", ");
  const [rows] = await connection.query(`SELECT ${columns} FROM ${table} WHERE save_id = ?`, [saveId]);
  return new Map(rows.map((row) => [keyColumns.map((column) => row[column]).join("\u001f"), row.content_hash]));
}

async function deleteMissing(connection, table, saveId, keyColumns, incomingKeys) {
  const [rows] = await connection.query(`SELECT ${keyColumns.join(", ")} FROM ${table} WHERE save_id = ?`, [saveId]);
  const missing = rows.filter((row) => !incomingKeys.has(keyColumns.map((column) => row[column]).join("\u001f")));
  for (const row of missing) {
    const where = keyColumns.map((column) => `${column} = ?`).join(" AND ");
    await connection.query(`DELETE FROM ${table} WHERE save_id = ? AND ${where}`, [saveId, ...keyColumns.map((column) => row[column])]);
  }
}

async function syncHashedRows(connection, config) {
  const existing = await existingHashes(connection, config.table, config.saveId, config.keyColumns);
  const incomingKeys = new Set();
  for (const row of config.rows.values()) {
    const key = config.keyColumns.map((column) => config.keyValues(row)[column]).join("\u001f");
    incomingKeys.add(key);
    if (existing.get(key) === row.hash) continue;
    const values = config.values(row);
    await connection.query(config.upsertSql, [config.saveId, ...values]);
  }
  await deleteMissing(connection, config.table, config.saveId, config.keyColumns, incomingKeys);
}

async function syncSimpleRows(connection, table, saveId, keyColumn, rows, keyValue, values, upsertSql) {
  const keys = new Set();
  for (const row of rows.values()) {
    keys.add(String(keyValue(row)));
    await connection.query(upsertSql, [saveId, ...values(row)]);
  }
  const [existing] = await connection.query(`SELECT ${keyColumn} FROM ${table} WHERE save_id = ?`, [saveId]);
  for (const row of existing) {
    if (!keys.has(String(row[keyColumn]))) {
      await connection.query(`DELETE FROM ${table} WHERE save_id = ? AND ${keyColumn} = ?`, [saveId, row[keyColumn]]);
    }
  }
}

async function upsertPortraits(connection, portraits) {
  for (const portrait of portraits.values()) {
    await connection.query(`
      INSERT INTO portraits (portrait_id, content_type, image_data, source_url, byte_size)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE portrait_id = portrait_id
    `, [portrait.portraitId, portrait.contentType, portrait.imageData, portrait.sourceUrl, portrait.byteSize]);
  }
}

async function writeEncodedState(connection, state, saveId) {
  const encoded = encodeState(state);
  const metadata = encoded.metadata;
  await connection.query(`
    INSERT INTO game_saves (save_id, day_no, rebirth_no, calendar_start_date, last_settlement_date, state_version)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      day_no = VALUES(day_no),
      rebirth_no = VALUES(rebirth_no),
      calendar_start_date = VALUES(calendar_start_date),
      last_settlement_date = VALUES(last_settlement_date),
      state_version = VALUES(state_version),
      updated_at = CURRENT_TIMESTAMP(3)
  `, [saveId, metadata.day, metadata.rebirth, metadata.calendarStartDate, metadata.lastSettlementDate, metadata.stateVersion]);

  await upsertPortraits(connection, encoded.portraits);

  await syncHashedRows(connection, {
    table: "save_sections", saveId, rows: encoded.sections, keyColumns: ["section_key"],
    keyValues: (row) => ({ section_key: row.sectionKey }),
    values: (row) => [row.sectionKey, row.json, row.hash],
    upsertSql: `INSERT INTO save_sections (save_id, section_key, section_json, content_hash) VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE section_json = VALUES(section_json), content_hash = VALUES(content_hash), updated_at = CURRENT_TIMESTAMP(3)`
  });
  await syncHashedRows(connection, {
    table: "cultivators", saveId, rows: encoded.cultivators, keyColumns: ["cultivator_id"],
    keyValues: (row) => ({ cultivator_id: row.cultivatorId }),
    values: (row) => [row.cultivatorId, row.kind, row.position, row.name, row.realm, row.xp, row.hp, row.maxHp, row.mana, row.maxMana, row.sect, row.portraitId || null, row.json, row.hash],
    upsertSql: `INSERT INTO cultivators
      (save_id, cultivator_id, cultivator_kind, position_no, name, realm_no, xp, hp, max_hp, mana, max_mana, sect_name, portrait_id, cultivator_json, content_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE cultivator_kind=VALUES(cultivator_kind), position_no=VALUES(position_no), name=VALUES(name), realm_no=VALUES(realm_no), xp=VALUES(xp), hp=VALUES(hp), max_hp=VALUES(max_hp), mana=VALUES(mana), max_mana=VALUES(max_mana), sect_name=VALUES(sect_name), portrait_id=VALUES(portrait_id), cultivator_json=VALUES(cultivator_json), content_hash=VALUES(content_hash), updated_at=CURRENT_TIMESTAMP(3)`
  });
  await syncHashedRows(connection, {
    table: "cultivator_history", saveId, rows: encoded.cultivatorHistory,
    keyColumns: ["cultivator_id", "history_type", "record_key"],
    keyValues: (row) => ({ cultivator_id: row.cultivatorId, history_type: row.historyType, record_key: row.recordKey }),
    values: (row) => [row.cultivatorId, row.historyType, row.recordKey, row.day, row.position, row.json, row.hash],
    upsertSql: `INSERT INTO cultivator_history
      (save_id, cultivator_id, history_type, record_key, day_no, position_no, record_json, content_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE day_no=VALUES(day_no), position_no=VALUES(position_no), record_json=VALUES(record_json), content_hash=VALUES(content_hash)`
  });
  await syncHashedRows(connection, {
    table: "equipment_items", saveId, rows: encoded.equipment, keyColumns: ["equipment_key"],
    keyValues: (row) => ({ equipment_key: row.equipmentKey }),
    values: (row) => [row.equipmentKey, row.position, row.ownerId, row.itemId, row.slot, row.json, row.hash],
    upsertSql: `INSERT INTO equipment_items
      (save_id, equipment_key, position_no, owner_id, item_id, slot_name, item_json, content_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE position_no=VALUES(position_no), owner_id=VALUES(owner_id), item_id=VALUES(item_id), slot_name=VALUES(slot_name), item_json=VALUES(item_json), content_hash=VALUES(content_hash)`
  });

  await syncSimpleRows(connection, "duel_days", saveId, "day_no", encoded.duelDays,
    (row) => row.day,
    (row) => [row.day, row.date, row.createdAt],
    `INSERT INTO duel_days (save_id, day_no, date_key, created_at_text) VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE date_key=VALUES(date_key), created_at_text=VALUES(created_at_text)`);
  await syncHashedRows(connection, {
    table: "duel_matches", saveId, rows: encoded.duelMatches, keyColumns: ["day_no", "match_id"],
    keyValues: (row) => ({ day_no: row.day, match_id: row.matchId }),
    values: (row) => [row.day, row.matchId, row.position, row.matchType, row.leftId, row.rightId, row.winnerId, row.loserId, row.replayId, row.json, row.hash],
    upsertSql: `INSERT INTO duel_matches
      (save_id, day_no, match_id, position_no, match_type, left_id, right_id, winner_id, loser_id, replay_id, match_json, content_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE position_no=VALUES(position_no), match_type=VALUES(match_type), left_id=VALUES(left_id), right_id=VALUES(right_id), winner_id=VALUES(winner_id), loser_id=VALUES(loser_id), replay_id=VALUES(replay_id), match_json=VALUES(match_json), content_hash=VALUES(content_hash)`
  });

  await syncSimpleRows(connection, "dungeon_days", saveId, "day_no", encoded.dungeonDays,
    (row) => row.day,
    (row) => [row.day, row.date],
    `INSERT INTO dungeon_days (save_id, day_no, date_key) VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE date_key=VALUES(date_key)`);
  await syncHashedRows(connection, {
    table: "dungeon_records", saveId, rows: encoded.dungeonRecords,
    keyColumns: ["day_no", "record_type", "record_key"],
    keyValues: (row) => ({ day_no: row.day, record_type: row.recordType, record_key: row.recordKey }),
    values: (row) => [row.day, row.recordType, row.recordKey, row.position, row.json, row.hash],
    upsertSql: `INSERT INTO dungeon_records
      (save_id, day_no, record_type, record_key, position_no, record_json, content_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE position_no=VALUES(position_no), record_json=VALUES(record_json), content_hash=VALUES(content_hash)`
  });
  await syncHashedRows(connection, {
    table: "province_wars", saveId, rows: encoded.provinceWars, keyColumns: ["war_id"],
    keyValues: (row) => ({ war_id: row.warId }),
    values: (row) => [row.warId, row.day, row.position, row.provinceId, row.attacker, row.defender, row.captured, row.json, row.hash],
    upsertSql: `INSERT INTO province_wars
      (save_id, war_id, day_no, position_no, province_id, attacker_name, defender_name, captured, war_json, content_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE day_no=VALUES(day_no), position_no=VALUES(position_no), province_id=VALUES(province_id), attacker_name=VALUES(attacker_name), defender_name=VALUES(defender_name), captured=VALUES(captured), war_json=VALUES(war_json), content_hash=VALUES(content_hash)`
  });
  await syncHashedRows(connection, {
    table: "admin_profiles", saveId, rows: encoded.adminProfiles,
    keyColumns: ["profile_type", "profile_key"],
    keyValues: (row) => ({ profile_type: row.profileType, profile_key: row.profileKey }),
    values: (row) => [row.profileType, row.profileKey, row.position, row.portraitId || null, row.json, row.hash],
    upsertSql: `INSERT INTO admin_profiles
      (save_id, profile_type, profile_key, position_no, portrait_id, profile_json, content_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE position_no=VALUES(position_no), portrait_id=VALUES(portrait_id), profile_json=VALUES(profile_json), content_hash=VALUES(content_hash)`
  });
}

export async function saveStateToMysql(state, saveId, options = {}) {
  compactStateForStorage(state, { skipReplayCompaction: options.skipReplayExtraction });
  return withMysqlTransaction((connection) => writeEncodedState(connection, state, saveId));
}

export async function saveStateWithConnection(connection, state, saveId, options = {}) {
  compactStateForStorage(state, { skipReplayCompaction: options.skipReplayExtraction });
  return writeEncodedState(connection, state, saveId);
}

export async function loadStateFromMysql(saveId) {
  await ensureMysqlSchema();
  const [saveRows] = await mysqlPool.query("SELECT * FROM game_saves WHERE save_id = ? LIMIT 1", [saveId]);
  if (!saveRows.length) return null;
  const queries = [
    ["sections", "SELECT * FROM save_sections WHERE save_id = ? ORDER BY section_key"],
    ["cultivators", "SELECT * FROM cultivators WHERE save_id = ? ORDER BY cultivator_kind = 'player' DESC, position_no"],
    ["cultivatorHistory", "SELECT * FROM cultivator_history WHERE save_id = ? ORDER BY cultivator_id, history_type, position_no"],
    ["equipment", "SELECT * FROM equipment_items WHERE save_id = ? ORDER BY position_no"],
    ["duelDays", "SELECT * FROM duel_days WHERE save_id = ? ORDER BY day_no DESC"],
    ["duelMatches", "SELECT * FROM duel_matches WHERE save_id = ? ORDER BY day_no DESC, position_no"],
    ["dungeonDays", "SELECT * FROM dungeon_days WHERE save_id = ? ORDER BY day_no DESC"],
    ["dungeonRecords", "SELECT * FROM dungeon_records WHERE save_id = ? ORDER BY day_no DESC, record_type, position_no"],
    ["provinceWars", "SELECT * FROM province_wars WHERE save_id = ? ORDER BY position_no"],
    ["adminProfiles", "SELECT * FROM admin_profiles WHERE save_id = ? ORDER BY profile_type, position_no"],
    ["portraits", `SELECT DISTINCT p.* FROM portraits p
      JOIN (SELECT portrait_id FROM cultivators WHERE save_id = ? AND portrait_id IS NOT NULL
            UNION SELECT portrait_id FROM admin_profiles WHERE save_id = ? AND portrait_id IS NOT NULL) refs
      ON refs.portrait_id = p.portrait_id`]
  ];
  const loaded = { save: saveRows[0] };
  await Promise.all(queries.map(async ([key, sql]) => {
    const parameters = key === "portraits" ? [saveId, saveId] : [saveId];
    const [rows] = await mysqlPool.query(sql, parameters);
    loaded[key] = rows;
  }));
  return decodeState(loaded);
}

export async function upsertBattleReplays(connection, saveId, pending = []) {
  for (const item of pending) {
    if (!item?.id || !item?.replay) continue;
    const replayJson = JSON.stringify(item.replay);
    await connection.query(`
      INSERT INTO battle_replays (save_id, replay_id, replay_kind, day_no, match_id, replay_json, content_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE replay_kind=VALUES(replay_kind), day_no=VALUES(day_no), match_id=VALUES(match_id), replay_json=VALUES(replay_json), content_hash=VALUES(content_hash), updated_at=CURRENT_TIMESTAMP(3)
    `, [saveId, item.id, item.kind || item.replay.kind || "battle", Number(item.day || item.replay.day || 0) || null, item.matchId || "", replayJson, contentHash(replayJson)]);
  }
}

export async function pruneBattleReplays(connection, saveId, minDay) {
  await connection.query("DELETE FROM battle_replays WHERE save_id = ? AND day_no IS NOT NULL AND day_no < ?", [saveId, minDay]);
}

export async function readReplayFromMysql(saveId, replayId) {
  await ensureMysqlSchema();
  const [rows] = await mysqlPool.query(`
    SELECT replay_json, day_no, replay_kind FROM battle_replays
    WHERE save_id = ? AND replay_id = ? LIMIT 1
  `, [saveId, replayId]);
  if (!rows.length) return null;
  const replay = parseMysqlJson(rows[0].replay_json, {}) || {};
  replay.replayId = replayId;
  replay.day ||= Number(rows[0].day_no || 0) || undefined;
  replay.kind ||= rows[0].replay_kind;
  return replay;
}
