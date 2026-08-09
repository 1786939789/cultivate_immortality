import { buildCultivatorMetricSnapshotHistory, compactStateForStorage, powerOf } from "./gameLogic.mjs";
import { ensureMysqlSchema, mysqlPool, parseMysqlJson, withMysqlTransaction } from "./mysqlDb.mjs";
import { contentHash, decodeState, encodeState } from "./mysqlStateCodec.mjs";
import { normalizePersistenceDomains, persistenceDomains } from "./persistenceDomains.mjs";
import { syncCultivatorPearlsIfChanged, upsertCultivatorMetrics } from "./cultivatorIncrementalRepository.mjs";

function observedQuery(connection, observer) {
  if (typeof observer !== "function") return connection;
  return new Proxy(connection, {
    get(target, property) {
      if (property !== "query") return Reflect.get(target, property, target);
      return async (sql, parameters) => {
        observer(String(sql));
        return target.query(sql, parameters);
      };
    }
  });
}

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
  if (!config.preserveMissing) await deleteMissing(connection, config.table, config.saveId, config.keyColumns, incomingKeys);
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

async function syncTaskIncrementalTables(connection, state, saveId, domains) {
  if (domains.has(persistenceDomains.sections)) {
    const definitions = new Map((state.taskDefinitions || []).map((item) => [String(item.id), item]));
    for (const [id, item] of definitions) {
      const text = JSON.stringify(item);
      await connection.query(`INSERT INTO task_definitions_v2
        (save_id, task_id, category, enabled, definition_json, content_hash) VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE category=VALUES(category), enabled=VALUES(enabled), definition_json=VALUES(definition_json), content_hash=VALUES(content_hash)`,
      [saveId, id, item.category || "", item.enabled === false ? 0 : 1, text, contentHash(text)]);
    }
    await deleteMissing(connection, "task_definitions_v2", saveId, ["task_id"], new Set(definitions.keys()));

    const progress = new Map();
    for (const [day, entries] of Object.entries(state.taskProgress || {})) for (const [taskId, entry] of Object.entries(entries || {})) {
      const key = `${day}\u001f${taskId}`;
      progress.set(key, { day: Number(day), taskId, entry });
      await connection.query(`INSERT INTO task_progress_v2
        (save_id, day_no, task_id, completed_amount, awarded_multiplier) VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE completed_amount=VALUES(completed_amount), awarded_multiplier=VALUES(awarded_multiplier)`,
      [saveId, Number(day), taskId, Number(entry.amount || 0), Number(entry.awardedMultiplier || 0)]);
    }
    await deleteMissing(connection, "task_progress_v2", saveId, ["day_no", "task_id"], new Set(progress.keys()));

    const snapshots = new Map((state.taskMultiplierRecords || []).map((item) => [String(item.day), item]));
    for (const [day, item] of snapshots) {
      const text = JSON.stringify(item);
      await connection.query(`INSERT INTO task_multiplier_snapshots_v2
        (save_id, day_no, date_key, elixir_multiplier, sect_xp_multiplier, total_multiplier, snapshot_json, content_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE date_key=VALUES(date_key), elixir_multiplier=VALUES(elixir_multiplier),
        sect_xp_multiplier=VALUES(sect_xp_multiplier), total_multiplier=VALUES(total_multiplier), snapshot_json=VALUES(snapshot_json), content_hash=VALUES(content_hash)`,
      [saveId, Number(day), item.date || "", Number(item.elixirMultiplier || 1), Number(item.sectXpMultiplier || 1), Number(item.totalMultiplier || 1), text, contentHash(text)]);
    }
    await deleteMissing(connection, "task_multiplier_snapshots_v2", saveId, ["day_no"], new Set(snapshots.keys()));

    const completions = new Map((state.taskCompletions || []).filter((item) => item?.id).map((item) => [String(item.id), item]));
    for (const [id, item] of completions) {
      const text = JSON.stringify(item);
      await connection.query(`INSERT INTO task_completions_v2
        (save_id, completion_id, day_no, task_id, completed_amount, multiplier, xp, base_xp, spirit, completion_json, content_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE day_no=VALUES(day_no), task_id=VALUES(task_id),
        completed_amount=VALUES(completed_amount), multiplier=VALUES(multiplier), xp=VALUES(xp), base_xp=VALUES(base_xp), spirit=VALUES(spirit), completion_json=VALUES(completion_json), content_hash=VALUES(content_hash)`,
      [saveId, id, Number(item.day || state.day || 1), item.taskId || "", Number(item.completedAmount || 0), Number(item.multiplier || 0), Number(item.xp || 0), Number(item.baseXp || 0), Number(item.spirit || 0), text, contentHash(text)]);
    }
    await deleteMissing(connection, "task_completions_v2", saveId, ["completion_id"], new Set(completions.keys()));

    const logs = new Map((state.log || []).map((item, index) => [String(item.id || `log-${contentHash(JSON.stringify(item)).slice(0, 24)}-${index}`), item]));
    const logCount = logs.size;
    for (const [index, [id, item]] of [...logs.entries()].entries()) {
      const withId = { ...item, id };
      const text = JSON.stringify(withId);
      await connection.query(`INSERT INTO game_logs_v2
        (save_id, log_id, day_no, position_no, log_type, log_text, log_json, content_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE day_no=VALUES(day_no), position_no=VALUES(position_no), log_type=VALUES(log_type), log_text=VALUES(log_text), log_json=VALUES(log_json), content_hash=VALUES(content_hash)`,
      [saveId, id, Number(item.day || state.day || 1), logCount - index, item.type || "", item.text || "", text, contentHash(text)]);
    }
    await deleteMissing(connection, "game_logs_v2", saveId, ["log_id"], new Set(logs.keys()));
  }

  if (domains.has(persistenceDomains.cultivators)) {
    const records = new Map((state.player?.dailyRecords || []).map((item) => [String(item.day), item]));
    for (const [day, item] of records) {
      const text = JSON.stringify(item);
      await connection.query(`INSERT INTO task_daily_records_v2
        (save_id, cultivator_id, day_no, record_json, content_hash) VALUES (?, 'player', ?, ?, ?)
        ON DUPLICATE KEY UPDATE record_json=VALUES(record_json), content_hash=VALUES(content_hash)`,
      [saveId, Number(day), text, contentHash(text)]);
    }
    const keys = new Set([...records.keys()].map((day) => `player\u001f${day}`));
    await deleteMissing(connection, "task_daily_records_v2", saveId, ["cultivator_id", "day_no"], keys);
  }
}

async function writeEncodedState(rawConnection, state, saveId, options = {}) {
  const connection = observedQuery(rawConnection, options.queryObserver);
  const domains = normalizePersistenceDomains(options.domains);
  const encoded = encodeState(state, { domains: [...domains], cultivatorIds: options.cultivatorIds });
  const metadata = encoded.metadata;
  let revision;
  if (Number.isFinite(options.expectedRevision)) {
    const [result] = await connection.query(`
      UPDATE game_saves SET day_no = ?, rebirth_no = ?, calendar_start_date = ?, last_settlement_date = ?,
        state_version = ?, state_revision = state_revision + 1, updated_at = CURRENT_TIMESTAMP(3)
      WHERE save_id = ? AND state_revision = ?
    `, [metadata.day, metadata.rebirth, metadata.calendarStartDate, metadata.lastSettlementDate, metadata.stateVersion, saveId, options.expectedRevision]);
    if (!result.affectedRows) {
      const error = new Error("存档已被其他任务更新，请重试");
      error.code = "STATE_REVISION_CONFLICT";
      throw error;
    }
    revision = Number(options.expectedRevision) + 1;
  } else {
    await connection.query(`
      INSERT INTO game_saves (save_id, day_no, rebirth_no, calendar_start_date, last_settlement_date, state_version, state_revision)
      VALUES (?, ?, ?, ?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE
        day_no = VALUES(day_no), rebirth_no = VALUES(rebirth_no), calendar_start_date = VALUES(calendar_start_date),
        last_settlement_date = VALUES(last_settlement_date), state_version = VALUES(state_version),
        state_revision = state_revision + 1, updated_at = CURRENT_TIMESTAMP(3)
    `, [saveId, metadata.day, metadata.rebirth, metadata.calendarStartDate, metadata.lastSettlementDate, metadata.stateVersion]);
    const [revisionRows] = await connection.query("SELECT state_revision FROM game_saves WHERE save_id = ?", [saveId]);
    revision = Number(revisionRows[0]?.state_revision || 0);
  }

  if (domains.has(persistenceDomains.cultivators) || domains.has(persistenceDomains.adminProfiles)) {
    await upsertPortraits(connection, encoded.portraits);
  }

  if (domains.has(persistenceDomains.sections)) await syncHashedRows(connection, {
    table: "save_sections", saveId, rows: encoded.sections, keyColumns: ["section_key"],
    keyValues: (row) => ({ section_key: row.sectionKey }),
    values: (row) => [row.sectionKey, row.json, row.hash],
    upsertSql: `INSERT INTO save_sections (save_id, section_key, section_json, content_hash) VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE section_json = VALUES(section_json), content_hash = VALUES(content_hash), updated_at = CURRENT_TIMESTAMP(3)`
  });
  if (domains.has(persistenceDomains.cultivators)) await syncHashedRows(connection, {
    table: "cultivators", saveId, rows: encoded.cultivators, keyColumns: ["cultivator_id"], preserveMissing: Boolean(options.cultivatorIds),
    keyValues: (row) => ({ cultivator_id: row.cultivatorId }),
    values: (row) => {
      const entity = parseMysqlJson(row.json, {}) || {};
      return [row.cultivatorId, row.kind, row.position, row.name, row.realm, row.xp, row.hp, row.maxHp, row.mana, row.maxMana, row.sect, row.portraitId || null,
        Number(entity.spirit || 0), Number(entity.reputation || 0), Number(entity.body || 0), Number(entity.wisdom || 0), Number(entity.attack || 0), Number(entity.defense || 0),
        Number(entity.divineSense || 0), Number(entity.chance || 0), Number(entity.wealth || 0), Number(entity.heartDemon || 0), row.json, row.hash];
    },
    upsertSql: `INSERT INTO cultivators
      (save_id, cultivator_id, cultivator_kind, position_no, name, realm_no, xp, hp, max_hp, mana, max_mana, sect_name, portrait_id,
       spirit, reputation, body, wisdom, attack, defense, divine_sense, chance, wealth, heart_demon, cultivator_json, content_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE cultivator_kind=VALUES(cultivator_kind), position_no=VALUES(position_no), name=VALUES(name), realm_no=VALUES(realm_no), xp=VALUES(xp), hp=VALUES(hp), max_hp=VALUES(max_hp), mana=VALUES(mana), max_mana=VALUES(max_mana), sect_name=VALUES(sect_name), portrait_id=VALUES(portrait_id), metrics_revision=metrics_revision+1,
      spirit=VALUES(spirit), reputation=VALUES(reputation), body=VALUES(body), wisdom=VALUES(wisdom), attack=VALUES(attack), defense=VALUES(defense), divine_sense=VALUES(divine_sense), chance=VALUES(chance), wealth=VALUES(wealth), heart_demon=VALUES(heart_demon),
      cultivator_json=VALUES(cultivator_json), content_hash=VALUES(content_hash), updated_at=CURRENT_TIMESTAMP(3)`
  });
  if (domains.has(persistenceDomains.cultivators)) await syncHashedRows(connection, {
    table: "cultivator_history", saveId, rows: encoded.cultivatorHistory, preserveMissing: Boolean(options.cultivatorIds),
    keyColumns: ["cultivator_id", "history_type", "record_key"],
    keyValues: (row) => ({ cultivator_id: row.cultivatorId, history_type: row.historyType, record_key: row.recordKey }),
    values: (row) => [row.cultivatorId, row.historyType, row.recordKey, row.day, row.position, row.json, row.hash],
    upsertSql: `INSERT INTO cultivator_history
      (save_id, cultivator_id, history_type, record_key, day_no, position_no, record_json, content_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE day_no=VALUES(day_no), position_no=VALUES(position_no), record_json=VALUES(record_json), content_hash=VALUES(content_hash)`
  });
  if (domains.has(persistenceDomains.equipment)) await syncHashedRows(connection, {
    table: "equipment_items", saveId, rows: encoded.equipment, keyColumns: ["equipment_key"],
    keyValues: (row) => ({ equipment_key: row.equipmentKey }),
    values: (row) => [row.equipmentKey, row.position, row.ownerId, row.itemId, row.slot, row.json, row.hash],
    upsertSql: `INSERT INTO equipment_items
      (save_id, equipment_key, position_no, owner_id, item_id, slot_name, item_json, content_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE position_no=VALUES(position_no), owner_id=VALUES(owner_id), item_id=VALUES(item_id), slot_name=VALUES(slot_name), item_json=VALUES(item_json), content_hash=VALUES(content_hash)`
  });

  if (domains.has(persistenceDomains.duels)) await syncSimpleRows(connection, "duel_days", saveId, "day_no", encoded.duelDays,
    (row) => row.day,
    (row) => [row.day, row.date, row.createdAt],
    `INSERT INTO duel_days (save_id, day_no, date_key, created_at_text) VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE date_key=VALUES(date_key), created_at_text=VALUES(created_at_text)`);
  if (domains.has(persistenceDomains.duels)) await syncHashedRows(connection, {
    table: "duel_matches", saveId, rows: encoded.duelMatches, keyColumns: ["day_no", "match_id"],
    keyValues: (row) => ({ day_no: row.day, match_id: row.matchId }),
    values: (row) => [row.day, row.matchId, row.position, row.matchType, row.leftId, row.rightId, row.winnerId, row.loserId, row.replayId, row.json, row.hash],
    upsertSql: `INSERT INTO duel_matches
      (save_id, day_no, match_id, position_no, match_type, left_id, right_id, winner_id, loser_id, replay_id, match_json, content_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE position_no=VALUES(position_no), match_type=VALUES(match_type), left_id=VALUES(left_id), right_id=VALUES(right_id), winner_id=VALUES(winner_id), loser_id=VALUES(loser_id), replay_id=VALUES(replay_id), match_json=VALUES(match_json), content_hash=VALUES(content_hash)`
  });

  if (domains.has(persistenceDomains.dungeons)) await syncSimpleRows(connection, "dungeon_days", saveId, "day_no", encoded.dungeonDays,
    (row) => row.day,
    (row) => [row.day, row.date],
    `INSERT INTO dungeon_days (save_id, day_no, date_key) VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE date_key=VALUES(date_key)`);
  if (domains.has(persistenceDomains.dungeons)) await syncHashedRows(connection, {
    table: "dungeon_records", saveId, rows: encoded.dungeonRecords,
    keyColumns: ["day_no", "record_type", "record_key"],
    keyValues: (row) => ({ day_no: row.day, record_type: row.recordType, record_key: row.recordKey }),
    values: (row) => [row.day, row.recordType, row.recordKey, row.position, row.json, row.hash],
    upsertSql: `INSERT INTO dungeon_records
      (save_id, day_no, record_type, record_key, position_no, record_json, content_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE position_no=VALUES(position_no), record_json=VALUES(record_json), content_hash=VALUES(content_hash)`
  });
  if (domains.has(persistenceDomains.provinceWars)) await syncHashedRows(connection, {
    table: "province_wars", saveId, rows: encoded.provinceWars, keyColumns: ["war_id"],
    keyValues: (row) => ({ war_id: row.warId }),
    values: (row) => [row.warId, row.day, row.position, row.provinceId, row.attacker, row.defender, row.captured, row.json, row.hash],
    upsertSql: `INSERT INTO province_wars
      (save_id, war_id, day_no, position_no, province_id, attacker_name, defender_name, captured, war_json, content_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE day_no=VALUES(day_no), position_no=VALUES(position_no), province_id=VALUES(province_id), attacker_name=VALUES(attacker_name), defender_name=VALUES(defender_name), captured=VALUES(captured), war_json=VALUES(war_json), content_hash=VALUES(content_hash)`
  });
  if (domains.has(persistenceDomains.adminProfiles)) await syncHashedRows(connection, {
    table: "admin_profiles", saveId, rows: encoded.adminProfiles,
    keyColumns: ["profile_type", "profile_key"],
    keyValues: (row) => ({ profile_type: row.profileType, profile_key: row.profileKey }),
    values: (row) => [row.profileType, row.profileKey, row.position, row.portraitId || null, row.json, row.hash],
    upsertSql: `INSERT INTO admin_profiles
      (save_id, profile_type, profile_key, position_no, portrait_id, profile_json, content_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE position_no=VALUES(position_no), portrait_id=VALUES(portrait_id), profile_json=VALUES(profile_json), content_hash=VALUES(content_hash)`
  });
  await syncTaskIncrementalTables(connection, state, saveId, domains);
  if (domains.has(persistenceDomains.cultivators)) {
    const people = [state.player, ...(state.npcs || [])];
    const selectedIds = options.cultivatorIds ? new Set([...options.cultivatorIds].map(String)) : null;
    const selectedPeople = selectedIds ? people.filter((entity) => selectedIds.has(String(entity.id))) : people;
    const metricHistory = buildCultivatorMetricSnapshotHistory(state);
    for (const entity of selectedPeople) {
      // Settlement and duel batches frequently touch cultivator rows without
      // changing pearl assets. Compare the asset hash first so those batches
      // do not rewrite every pearl/fragment/history row.
      await syncCultivatorPearlsIfChanged(connection, saveId, entity);
      const snapshots = metricHistory.snapshotsById.get(entity.id) || [];
      const rating = snapshots.at(-1)?.rating || {};
      await upsertCultivatorMetrics(connection, { saveId, cultivatorId: entity.id, currentPower: powerOf(entity, state), currentCombatRating: rating.score || 500, combatScore: rating.score || 500, duelScore: Number(entity.duelSeason?.score || 0), duelWins: entity.duelWins, duelLosses: entity.duelLosses, dungeonClears: entity.dungeonClears, bestDungeonPower: entity.bestDungeonPower, syncCompatibility: false });
    }
    if (selectedPeople.length) {
      const ids = selectedPeople.map((entity) => String(entity.id));
      await connection.query(`UPDATE cultivators c
        JOIN cultivator_metrics_v2 m ON m.save_id=c.save_id AND m.cultivator_id=c.cultivator_id
        SET c.current_power=m.current_power, c.current_combat_rating=m.current_combat_rating, c.updated_at=CURRENT_TIMESTAMP(3)
        WHERE c.save_id=? AND c.cultivator_id IN (${ids.map(() => "?").join(",")})`, [saveId, ...ids]);
    }
    for (const entity of selectedPeople) {
      const snapshots = metricHistory.snapshotsById.get(entity.id) || [];
      const snapshotsToWrite = options.backfillMetricHistory
        ? snapshots
        : snapshots.filter((snapshot) => Number(snapshot.day) === Number(state.day));
      for (const snapshot of snapshotsToWrite) {
        const text = JSON.stringify({
          version: metricHistory.version,
          day: snapshot.day,
          power: snapshot.power,
          duel: snapshot.duel,
          combat: snapshot.combat,
          rating: snapshot.rating,
          meta: {
            windowDays: metricHistory.windowDays,
            windowStartDay: metricHistory.windowStartDay,
            windowEndDay: metricHistory.windowEndDay,
            minimumActiveDays: metricHistory.minimumActiveDays,
            weights: metricHistory.weights
          }
        });
        await connection.query(`INSERT INTO cultivator_rank_snapshots_v2(save_id,cultivator_id,day_no,power,power_rank,duel_score,duel_rank,combat_score,combat_rank,snapshot_json,content_hash)
          VALUES(?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE power=VALUES(power),power_rank=VALUES(power_rank),duel_score=VALUES(duel_score),duel_rank=VALUES(duel_rank),combat_score=VALUES(combat_score),combat_rank=VALUES(combat_rank),snapshot_json=VALUES(snapshot_json),content_hash=VALUES(content_hash)`,
        [saveId, entity.id, snapshot.day, snapshot.power?.value || 0, snapshot.power?.rank || 0, snapshot.duel?.value || 0, snapshot.duel?.rank || 0, snapshot.combat?.score ?? 500, snapshot.combat?.rank || 0, text, contentHash(text)]);
      }
    }
  }
  return revision;
}

export async function saveStateToMysql(state, saveId, options = {}) {
  compactStateForStorage(state, { skipReplayCompaction: options.skipReplayExtraction });
  return withMysqlTransaction((connection) => writeEncodedState(connection, state, saveId, options));
}

export async function saveStateWithConnection(connection, state, saveId, options = {}) {
  if (!options.compacted) compactStateForStorage(state, { skipReplayCompaction: options.skipReplayExtraction });
  return writeEncodedState(connection, state, saveId, options);
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
  const state = decodeState(loaded);
  const [taskDefinitions, taskProgress, taskSnapshots, taskCompletions, dailyRecords, logs] = await Promise.all([
    mysqlPool.query("SELECT definition_json FROM task_definitions_v2 WHERE save_id = ? ORDER BY updated_at, task_id", [saveId]),
    mysqlPool.query("SELECT day_no, task_id, completed_amount, awarded_multiplier FROM task_progress_v2 WHERE save_id = ?", [saveId]),
    mysqlPool.query("SELECT snapshot_json FROM task_multiplier_snapshots_v2 WHERE save_id = ? ORDER BY day_no DESC", [saveId]),
    mysqlPool.query("SELECT completion_json FROM task_completions_v2 WHERE save_id = ? ORDER BY created_at DESC, completion_id DESC", [saveId]),
    mysqlPool.query("SELECT record_json FROM task_daily_records_v2 WHERE save_id = ? AND cultivator_id = 'player' ORDER BY day_no DESC", [saveId]),
    mysqlPool.query("SELECT log_json FROM game_logs_v2 WHERE save_id = ? ORDER BY position_no DESC, created_at DESC, log_id DESC LIMIT 80", [saveId])
  ]);
  if (taskDefinitions[0].length) state.taskDefinitions = taskDefinitions[0].map((row) => parseMysqlJson(row.definition_json, {}));
  if (taskProgress[0].length) {
    state.taskProgress = {};
    for (const row of taskProgress[0]) {
      state.taskProgress[row.day_no] ??= {};
      state.taskProgress[row.day_no][row.task_id] = { amount: Number(row.completed_amount), awardedMultiplier: Number(row.awarded_multiplier) };
    }
  }
  if (taskSnapshots[0].length) state.taskMultiplierRecords = taskSnapshots[0].map((row) => parseMysqlJson(row.snapshot_json, {}));
  if (taskCompletions[0].length) {
    state.taskCompletions = taskCompletions[0].map((row) => parseMysqlJson(row.completion_json, {}));
    state.tasks = state.taskCompletions.slice(0, 16);
  }
  if (dailyRecords[0].length) state.player.dailyRecords = dailyRecords[0].map((row) => parseMysqlJson(row.record_json, {}));
  if (logs[0].length) state.log = logs[0].map((row) => parseMysqlJson(row.log_json, {}));
  state.__stateRevision = Number(saveRows[0].state_revision || 0);
  return state;
}

// Batch projection: settlement/duel jobs do not need the complete detail
// archive. Keep the live roster and active sections, but fetch only recent
// history/day records; incremental writers preserve older rows in MySQL.
export async function loadBatchStateFromMysql(saveId, options = {}) {
  await ensureMysqlSchema();
  const [[save]] = await mysqlPool.query("SELECT * FROM game_saves WHERE save_id=? LIMIT 1", [saveId]);
  if (!save) return null;
  const day = Number(save.day_no || 1);
  const historyDays = Math.max(14, Number(options.historyDays || 21));
  const [sections, cultivators, history, equipment, duelDays, duelMatches, dungeonDays, dungeonRecords, provinceWars, adminProfiles, portraits] = await Promise.all([
    mysqlPool.query("SELECT * FROM save_sections WHERE save_id=? ORDER BY section_key", [saveId]),
    mysqlPool.query("SELECT * FROM cultivators WHERE save_id=? ORDER BY cultivator_kind='player' DESC,position_no", [saveId]),
    mysqlPool.query("SELECT * FROM cultivator_history WHERE save_id=? AND (day_no IS NULL OR day_no>=?) ORDER BY cultivator_id,history_type,position_no", [saveId, Math.max(0, day - historyDays)]),
    mysqlPool.query("SELECT * FROM equipment_items WHERE save_id=? ORDER BY position_no", [saveId]),
    mysqlPool.query("SELECT * FROM duel_days WHERE save_id=? AND day_no>=? ORDER BY day_no DESC", [saveId, Math.max(0, day - 16)]),
    mysqlPool.query("SELECT * FROM duel_matches WHERE save_id=? AND day_no>=? ORDER BY day_no DESC,position_no", [saveId, Math.max(0, day - 16)]),
    mysqlPool.query("SELECT * FROM dungeon_days WHERE save_id=? AND day_no>=? ORDER BY day_no DESC", [saveId, Math.max(0, day - 16)]),
    mysqlPool.query("SELECT * FROM dungeon_records WHERE save_id=? AND day_no>=? ORDER BY day_no DESC,record_type,position_no", [saveId, Math.max(0, day - 16)]),
    mysqlPool.query("SELECT * FROM province_wars WHERE save_id=? AND (day_no IS NULL OR day_no>=?) ORDER BY position_no", [saveId, Math.max(0, day - 32)]),
    mysqlPool.query("SELECT * FROM admin_profiles WHERE save_id=? AND profile_type IN ('sectNameMap','playerSect','sect') ORDER BY profile_type,position_no", [saveId]),
    mysqlPool.query(`SELECT DISTINCT p.* FROM portraits p JOIN (SELECT portrait_id FROM cultivators WHERE save_id=? AND portrait_id IS NOT NULL UNION SELECT portrait_id FROM admin_profiles WHERE save_id=? AND portrait_id IS NOT NULL) refs ON refs.portrait_id=p.portrait_id`, [saveId, saveId])
  ]);
  const state = decodeState({ save, sections: sections[0], cultivators: cultivators[0], cultivatorHistory: history[0], equipment: equipment[0], duelDays: duelDays[0], duelMatches: duelMatches[0], dungeonDays: dungeonDays[0], dungeonRecords: dungeonRecords[0], provinceWars: provinceWars[0], adminProfiles: adminProfiles[0], portraits: portraits[0] });
  state.__stateRevision = Number(save.state_revision || 0);
  return state;
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
