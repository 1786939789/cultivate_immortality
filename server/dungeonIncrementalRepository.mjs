import { ensureMysqlSchema, mysqlPool } from "./mysqlDb.mjs";
import { decodeDungeonDay } from "./mysqlStateCodec.mjs";

// Dedicated read surface for the dungeon page. The underlying queries are
// intentionally scoped to one save/day and never load the complete world.
function queryWithObserver(observer) {
  return async (sql, params) => {
    observer?.(String(sql).replace(/\s+/g, " ").trim());
    return mysqlPool.query(sql, params);
  };
}

export async function readDungeonDayFromMysql(saveId, dayNo, options = {}) {
  await ensureMysqlSchema();
  const query = queryWithObserver(options.queryObserver);
  const day = Math.max(1, Number(dayNo) || 1);
  const [[save]] = await query("SELECT day_no, state_revision FROM game_saves WHERE save_id=? LIMIT 1", [saveId]);
  if (!save) return null;
  const [[dayRow]] = await query("SELECT day_no, date_key FROM dungeon_days WHERE save_id=? AND day_no=? LIMIT 1", [saveId, day]);
  if (!dayRow) return { day, date: "", record: null, currentDay: Number(save.day_no || 1), stateRevision: Number(save.state_revision || 0) };
  const [rows] = await query(`SELECT day_no, record_type, record_key, position_no, record_json FROM dungeon_records WHERE save_id=? AND day_no=? ORDER BY record_type, position_no, record_key`, [saveId, day]);
  const record = decodeDungeonDay(dayRow, rows);
  const ids = new Set();
  const refs = new Map();
  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) { for (const item of value) visit(item); return; }
    if (value.id && /^npc-|^player$/.test(String(value.id))) {
      const id = String(value.id);
      ids.add(id);
      refs.set(id, { ...(refs.get(id) || {}), ...value, id });
    }
    for (const child of Object.values(value)) visit(child);
  };
  visit(record);
  let portraits = {};
  if (ids.size) {
    const placeholders = [...ids].map(() => "?").join(",");
    const [people] = await query(`SELECT cultivator_id, name, cultivator_kind, realm_no, sect_name, portrait_id, JSON_UNQUOTE(JSON_EXTRACT(cultivator_json, '$.gender')) AS gender FROM cultivators WHERE save_id=? AND cultivator_id IN (${placeholders})`, [saveId, ...ids]);
    portraits = Object.fromEntries(people.map((person) => {
      const id = String(person.cultivator_id);
      const snapshot = refs.get(id) || {};
      return [id, {
        ...snapshot,
        id,
        kind: person.cultivator_kind || (id === "player" ? "player" : "npc"),
        name: person.name || snapshot.name || "",
        gender: person.gender || snapshot.gender,
        sect: person.sect_name || snapshot.sect || "",
        realm: Number(person.realm_no ?? snapshot.realm ?? 0),
        portraitUrl: person.portrait_id ? `/api/cultivators/portrait?id=${encodeURIComponent(id)}&v=0` : ""
      }];
    }));
  }
  return { day, date: dayRow.date_key || "", record, portraits, currentDay: Number(save.day_no || 1), stateRevision: Number(save.state_revision || 0) };
}

export async function readDungeonDayIndexFromMysql(saveId, limit = 10, options = {}) {
  await ensureMysqlSchema();
  const query = queryWithObserver(options.queryObserver);
  const [[save]] = await query("SELECT day_no, state_revision FROM game_saves WHERE save_id=? LIMIT 1", [saveId]);
  if (!save) return null;
  const safeLimit = Math.min(60, Math.max(1, Number(limit) || 10));
  const [rows] = await query(`SELECT day_no, date_key FROM dungeon_days WHERE save_id=? ORDER BY day_no DESC LIMIT ?`, [saveId, safeLimit]);
  return { currentDay: Number(save.day_no || 1), stateRevision: Number(save.state_revision || 0), items: rows.map((row) => ({ day: Number(row.day_no), date: row.date_key || "", hasRecord: true })) };
}
