import { createHash } from "node:crypto";
import { mysqlPool, parseMysqlJson, withMysqlTransaction } from "./mysqlDb.mjs";
import { upsertCultivatorMetrics } from "./cultivatorIncrementalRepository.mjs";
import { upsertBattleReplays } from "./mysqlStateRepository.mjs";

const json = (value) => JSON.stringify(value === undefined ? null : value);
const hash = (value) => createHash("sha256").update(typeof value === "string" ? value : json(value)).digest("hex");

export async function readActionInputs(saveId, sectionKeys = [], connection = mysqlPool, options = {}) {
  const [[save]] = await connection.query("SELECT * FROM game_saves WHERE save_id=? LIMIT 1", [saveId]);
  if (!save) return null;
  const [[player]] = await connection.query(`SELECT c.*, p.content_hash AS pearl_content_hash
    FROM cultivators c LEFT JOIN spirit_pearl_assets_v2 p
      ON p.save_id=c.save_id AND p.cultivator_id=c.cultivator_id
    WHERE c.save_id=? AND c.cultivator_id='player' LIMIT 1`, [saveId]);
  if (!player) return null;
  const [historyRows] = await connection.query(`SELECT history_type,position_no,record_json
    FROM cultivator_history WHERE save_id=? AND cultivator_id='player'
    ORDER BY history_type,position_no`, [saveId]);
  const playerJson = parseMysqlJson(player.cultivator_json, {}) || {};
  for (const row of historyRows) {
    playerJson[row.history_type] ??= [];
    playerJson[row.history_type].push(parseMysqlJson(row.record_json, {}));
  }
  player.cultivator_json = json(playerJson);
  const npcFilter = Array.isArray(options.npcIds) && options.npcIds.length
    ? ` AND cultivator_id IN (${options.npcIds.map(() => "?").join(",")})`
    : options.allNpcs ? " AND cultivator_kind='npc'" : " AND 1=0";
  const npcParams = options.allNpcs ? [saveId] : [saveId, ...(options.npcIds || [])];
  const [npcRows] = await connection.query(`SELECT * FROM cultivators WHERE save_id=?${npcFilter} ORDER BY position_no`, npcParams);
  const npcs = npcRows.map((row) => {
    const entity = parseMysqlJson(row.cultivator_json, {}) || {};
    const metric = (typed, legacy) => {
      const typedValue = Number(typed ?? 0);
      const legacyValue = Number(legacy ?? 0);
      return typedValue !== 0 || legacyValue === 0 ? typedValue : legacyValue;
    };
    Object.assign(entity, {
      id: entity.id || row.cultivator_id, name: row.name || entity.name || "", realm: Number(row.realm_no ?? entity.realm ?? 0),
      xp: Number(row.xp ?? entity.xp ?? 0), hp: Number(row.hp ?? entity.hp ?? 0), maxHp: Number(row.max_hp ?? entity.maxHp ?? 0),
      mana: Number(row.mana ?? entity.mana ?? 0), maxMana: Number(row.max_mana ?? entity.maxMana ?? 0), sect: row.sect_name || entity.sect || "",
      spirit: metric(row.spirit, entity.spirit), reputation: metric(row.reputation, entity.reputation), body: metric(row.body, entity.body),
      wisdom: metric(row.wisdom, entity.wisdom), attack: metric(row.attack, entity.attack), defense: metric(row.defense, entity.defense),
      divineSense: metric(row.divine_sense, entity.divineSense), chance: metric(row.chance, entity.chance), wealth: metric(row.wealth, entity.wealth), heartDemon: metric(row.heart_demon, entity.heartDemon)
    });
    return entity;
  });
  const [sectionRows] = await connection.query(`SELECT section_key,section_json FROM save_sections WHERE save_id=? AND section_key IN (${sectionKeys.map(() => "?").join(",") || "''"})`, [saveId, ...sectionKeys]);
  const sections = Object.fromEntries(sectionRows.map((row) => [row.section_key, parseMysqlJson(row.section_json, {})]));
  if (sectionKeys.includes("adminProfiles")) {
    const [profileRows] = await connection.query("SELECT profile_type,profile_key,profile_json FROM admin_profiles WHERE save_id=? AND profile_type='playerSect'", [saveId]);
    sections.adminProfiles = { playerSect: parseMysqlJson(profileRows[0]?.profile_json, "") };
  }
  const needsInventory = sectionKeys.includes("__equipment_inventory");
  // Most actions only need the player's equipped items. Dungeon loot also
  // needs the unowned pool to select/transfer drops, so it opts in explicitly.
  const equipmentSql = needsInventory
    ? "SELECT item_json FROM equipment_items WHERE save_id=? ORDER BY position_no"
    : "SELECT item_json FROM equipment_items WHERE save_id=? AND (owner_id='player' OR JSON_UNQUOTE(JSON_EXTRACT(item_json,'$.ownerId'))='player') ORDER BY position_no";
  const [equipmentRows] = await connection.query(equipmentSql, [saveId]);
  return { save, player, npcs, sections, equipment: equipmentRows.map((row) => parseMysqlJson(row.item_json, {})) };
}

export async function writeActionIncremental(connection, { saveId, inputs, state, changedSections, logEntry, expectedRevision }) {
  const [revisionResult] = await connection.query(`UPDATE game_saves SET state_revision=state_revision+1,updated_at=CURRENT_TIMESTAMP(3) WHERE save_id=? AND state_revision=?`, [saveId, expectedRevision]);
  if (!revisionResult.affectedRows) { const error = new Error("存档已被其他操作更新，请刷新后重试"); error.code = "STATE_REVISION_CONFLICT"; throw error; }
  const original = parseMysqlJson(inputs.player.cultivator_json, {}) || {};
  const merged = { ...original, ...state.player, id: original.id || "player" };
  const text = json(merged);
  await connection.query(`UPDATE cultivators SET xp=?,spirit=?,realm_no=?,hp=?,max_hp=?,mana=?,max_mana=?,sect_name=?,reputation=?,body=?,wisdom=?,attack=?,defense=?,divine_sense=?,chance=?,wealth=?,heart_demon=?,cultivator_json=?,content_hash=?,metrics_revision=metrics_revision+1,updated_at=CURRENT_TIMESTAMP(3) WHERE save_id=? AND cultivator_id='player'`, [merged.xp||0,merged.spirit||0,merged.realm||0,merged.hp||0,merged.maxHp||0,merged.mana||0,merged.maxMana||0,merged.sect||inputs.player.sect_name||"",merged.reputation||0,merged.body||0,merged.wisdom||0,merged.attack||0,merged.defense||0,merged.divineSense||0,merged.chance||0,merged.wealth||0,merged.heartDemon||0,text,hash(text),saveId]);
  for (const [key, value] of Object.entries(changedSections || {})) { const valueText = json(value); await connection.query(`INSERT INTO save_sections(save_id,section_key,section_json,content_hash) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE section_json=VALUES(section_json),content_hash=VALUES(content_hash)`, [saveId,key,valueText,hash(valueText)]); }
  if (logEntry) {
    const logText = json(logEntry);
    const [[nextLogPosition]] = await connection.query("SELECT COALESCE(MAX(position_no), 0) + 1 AS next_position FROM game_logs_v2 WHERE save_id=?", [saveId]);
    await connection.query(`INSERT INTO game_logs_v2(save_id,log_id,day_no,position_no,log_type,log_text,log_json,content_hash) VALUES(?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE day_no=VALUES(day_no),log_type=VALUES(log_type),log_text=VALUES(log_text),log_json=VALUES(log_json),content_hash=VALUES(content_hash)`, [saveId,logEntry.id,Number(state.day||inputs.save.day_no),Number(nextLogPosition.next_position||0),logEntry.type||"",logEntry.text||"",logText,hash(logText)]);
  }
  if (Array.isArray(state.__pendingBattleReplays) && state.__pendingBattleReplays.length) {
    await upsertBattleReplays(connection, saveId, state.__pendingBattleReplays);
  }
  const historyFields = ["dailyRecords", "breakthroughs", "skillUpgrades", "duelHistory", "dungeonHistory"];
  for (const field of historyFields) {
    for (const [position, record] of (state.player?.[field] || []).entries()) {
      const recordText = json(record);
      const recordKey = String(record.id || `${field}-${record.day || 0}-${hash(recordText).slice(0, 32)}`);
      await connection.query(`INSERT INTO cultivator_history(save_id,cultivator_id,history_type,record_key,day_no,position_no,record_json,content_hash) VALUES(?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE position_no=VALUES(position_no),day_no=VALUES(day_no),record_json=VALUES(record_json),content_hash=VALUES(content_hash)`, [saveId,"player",field,recordKey,Number(record.day || state.day || 1),position,recordText,hash(recordText)]);
    }
  }
  // None of the actions handled by this repository mutates pearl assets.
  // Pearl commands use their dedicated tables and repository, so a normal
  // player action must not rewrite pearl rows or history.
  await upsertCultivatorMetrics(connection, { saveId, cultivatorId: "player", currentPower: Number(state.__currentPower||0), currentCombatRating: Number(state.__currentCombatRating||500), combatScore: Number(state.__currentCombatRating||500), duelScore: Number(state.player.duelSeason?.score||0), duelWins: state.player.duelWins, duelLosses: state.player.duelLosses, dungeonClears: state.player.dungeonClears, bestDungeonPower: state.player.bestDungeonPower });
  return Number(expectedRevision) + 1;
}

export const withActionTransaction = withMysqlTransaction;
