import path from "node:path";
import { ensureMysqlSchema, mysqlPool, withMysqlTransaction } from "../server/mysqlDb.mjs";
import { contentHash } from "../server/mysqlStateCodec.mjs";
import { saveStateWithConnection } from "../server/mysqlStateRepository.mjs";
import { openSqliteFile, projectRoot, sqliteRows } from "./sqlite-data.mjs";

if (process.env.MIGRATION_CONFIRM !== "replace-mysql") {
  throw new Error("Set MIGRATION_CONFIRM=replace-mysql to replace the target MySQL data from SQLite");
}

const rootDir = projectRoot();
const gamePath = process.env.GAME_DB_PATH || path.join(rootDir, "data", "game.sqlite");
const battlePath = process.env.BATTLE_DB_PATH || path.join(rootDir, "data", "battle.sqlite");

function mysqlJson(value) {
  const text = String(value ?? "");
  try {
    return JSON.stringify(JSON.parse(text));
  } catch {
    return JSON.stringify(text);
  }
}

function mysqlDate(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const parsed = Date.parse(text.includes("T") ? text : `${text.replace(" ", "T")}Z`);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(0, 23).replace("T", " ") : text.slice(0, 23).replace("T", " ").replace("Z", "");
}

async function clearMysql(connection) {
  const tables = [
    "history_monthly_summaries", "battle_replays", "admin_profiles", "province_wars",
    "dungeon_records", "dungeon_days", "duel_matches", "duel_days", "equipment_items",
    "cultivator_history", "cultivators", "save_sections", "game_saves", "portraits",
    "auth_sessions", "auth_registration_codes", "app_settings", "auth_users"
  ];
  for (const table of tables) await connection.query(`DELETE FROM ${table}`);
}

async function importCoreTables(connection, gameDb) {
  for (const row of sqliteRows(gameDb, "SELECT id, username, password_hash, password_salt, role, created_at, last_login_at FROM auth_users")) {
    await connection.query(`INSERT INTO auth_users
      (id, username, username_normalized, password_hash, password_salt, role, created_at, last_login_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [row.id, row.username, String(row.username).toLocaleLowerCase("en-US"), row.password_hash, row.password_salt, row.role || "user", mysqlDate(row.created_at), mysqlDate(row.last_login_at)]);
  }
  for (const row of sqliteRows(gameDb, "SELECT code, active, max_uses, used_count, created_at FROM auth_registration_codes")) {
    await connection.query(`INSERT INTO auth_registration_codes (code, active, max_uses, used_count, created_at)
      VALUES (?, ?, ?, ?, ?)`, [row.code, row.active, row.max_uses, row.used_count, mysqlDate(row.created_at)]);
  }
  for (const row of sqliteRows(gameDb, "SELECT token_hash, user_id, created_at, expires_at FROM auth_sessions")) {
    await connection.query(`INSERT INTO auth_sessions (token_hash, user_id, created_at, expires_at)
      VALUES (?, ?, ?, ?)`, [row.token_hash, row.user_id, mysqlDate(row.created_at), mysqlDate(row.expires_at)]);
  }
  for (const row of sqliteRows(gameDb, "SELECT key, value FROM app_settings")) {
    await connection.query("INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)", [row.key, mysqlJson(row.value)]);
  }
}

async function importSaves(connection, gameDb) {
  const saves = sqliteRows(gameDb, "SELECT id, state_json FROM saves ORDER BY id");
  for (const row of saves) {
    const state = JSON.parse(row.state_json);
    await saveStateWithConnection(connection, state, row.id);
    console.log(`[migration] save ${row.id}: ${row.state_json.length} JSON characters`);
  }
  return saves.length;
}

async function importSummaries(connection, gameDb) {
  const hasTable = sqliteRows(gameDb, "SELECT name FROM sqlite_master WHERE type='table' AND name='history_monthly_summaries'").length > 0;
  if (!hasTable) return 0;
  const rows = sqliteRows(gameDb, "SELECT save_id, scope, owner_id, month, record_count, first_day, last_day, summary_json, updated_at FROM history_monthly_summaries");
  for (const row of rows) {
    await connection.query(`INSERT INTO history_monthly_summaries
      (save_id, scope_name, owner_id, month_key, record_count, first_day, last_day, summary_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [row.save_id, row.scope, row.owner_id, row.month, row.record_count, row.first_day, row.last_day, row.summary_json, mysqlDate(row.updated_at)]);
  }
  return rows.length;
}

async function importReplays(connection, battleDb) {
  const rows = sqliteRows(battleDb, "SELECT id, save_id, kind, day, match_id, replay_json, created_at, updated_at FROM battle_replays ORDER BY save_id, id");
  let imported = 0;
  for (const row of rows) {
    await connection.query(`INSERT INTO battle_replays
      (save_id, replay_id, replay_kind, day_no, match_id, replay_json, content_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [row.save_id, row.id, row.kind || "battle", row.day, row.match_id || "", row.replay_json, contentHash(row.replay_json), mysqlDate(row.created_at), mysqlDate(row.updated_at)]);
    imported += 1;
    if (imported % 1000 === 0) console.log(`[migration] battle replays: ${imported}/${rows.length}`);
  }
  return imported;
}

await ensureMysqlSchema();
const gameDb = await openSqliteFile(gamePath);
const battleDb = await openSqliteFile(battlePath);
try {
  const result = await withMysqlTransaction(async (connection) => {
    await clearMysql(connection);
    await importCoreTables(connection, gameDb);
    const saves = await importSaves(connection, gameDb);
    const summaries = await importSummaries(connection, gameDb);
    const replays = await importReplays(connection, battleDb);
    return { saves, summaries, replays };
  });
  console.log(`[migration] complete: ${JSON.stringify(result)}`);
} finally {
  gameDb.close();
  battleDb.close();
  await mysqlPool.end();
}
