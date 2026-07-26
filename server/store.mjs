import { createHash, randomBytes, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import initSqlJs from "sql.js";
import { hashPassword, verifyPassword } from "./authSecurity.mjs";
import { clearProgressHistory, compactStateForStorage, createDefaultState, dateKey, ensureStateShape, getPublicState, minReplayDayFor, preserveProfilesForReset, settleIfNeeded } from "./gameLogic.mjs";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const dataDir = join(rootDir, "data");
const dbPath = process.env.GAME_DB_PATH || join(dataDir, "game.sqlite");
const battleDbPath = process.env.BATTLE_DB_PATH || join(dirname(dbPath), "battle.sqlite");
const wasmPath = join(rootDir, "node_modules", "sql.js", "dist", "sql-wasm.wasm");
const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;
const activeSaveSettingKey = "active_save_ids";
const legacyActiveSaveSettingKey = "active_save_id";
const managedSaveSettingKey = "managed_save_id";

mkdirSync(dataDir, { recursive: true });

let dbPromise;
let battleDbPromise;
let battleStoragePromise;
const stateCache = new Map();
const stateValidationCache = new Map();
const publicStateCache = new Map();
const deferredStateWrites = new Map();
let deferredPersistTimer = null;
let deferredPersistDb = null;
let deferredBattlePersistTimer = null;
let deferredBattlePersistDb = null;
let deferredPersistStartedAt = 0;
let deferredBattlePersistStartedAt = 0;
const deferredPersistIdleMs = 1200;
const deferredPersistMaxMs = 5000;
const authAttempts = new Map();

function sqliteAuthAttempt(action, context, username) {
  const key = `${action}\u0000${String(context?.ip || "unknown")}\u0000${String(username || "").toLocaleLowerCase("en-US")}`;
  const current = authAttempts.get(key) || { failures: 0, blockedUntil: 0 };
  if (current.blockedUntil > Date.now()) {
    const error = new Error(`尝试次数过多，请在 ${Math.ceil((current.blockedUntil - Date.now()) / 1000)} 秒后重试`);
    error.statusCode = 429;
    throw error;
  }
  return { key, current };
}

function recordSqliteAuthFailure(attempt) {
  const failures = attempt.current.failures + 1;
  const delayMinutes = failures >= 12 ? 30 : failures >= 9 ? 15 : failures >= 7 ? 5 : failures >= 5 ? 1 : 0;
  authAttempts.set(attempt.key, { failures, blockedUntil: delayMinutes ? Date.now() + delayMinutes * 60_000 : 0 });
}

async function openDb() {
  if (!dbPromise) {
    dbPromise = initSqlJs({ wasmBinary: readFileSync(wasmPath) }).then((SQL) => {
      const db = existsSync(dbPath)
        ? new SQL.Database(readFileSync(dbPath))
        : new SQL.Database();

      db.run(`
        CREATE TABLE IF NOT EXISTS saves (
          id TEXT PRIMARY KEY,
          state_json TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS auth_users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE COLLATE NOCASE,
          password_hash TEXT NOT NULL,
          password_salt TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          last_login_at TEXT
        );
      `);
      ensureAuthUserRoleColumn(db);
      db.run(`
        CREATE TABLE IF NOT EXISTS auth_registration_codes (
          code TEXT PRIMARY KEY,
          active INTEGER NOT NULL DEFAULT 1,
          max_uses INTEGER,
          used_count INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);
      db.run(`
        CREATE TABLE IF NOT EXISTS auth_sessions (
          token_hash TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          expires_at TEXT NOT NULL
        );
      `);
      db.run("CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions (user_id);");
      db.run(`
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);
      db.run("DROP TABLE IF EXISTS save_meta;");
      ensureActiveSaveSetting(db);
      persist(db);
      return db;
    });
  }
  return dbPromise;
}

async function openBattleDb() {
  if (!battleDbPromise) {
    battleDbPromise = initSqlJs({ wasmBinary: readFileSync(wasmPath) }).then((SQL) => {
      const db = existsSync(battleDbPath)
        ? new SQL.Database(readFileSync(battleDbPath))
        : new SQL.Database();
      ensureBattleReplaySchema(db);
      db.run("CREATE INDEX IF NOT EXISTS idx_battle_replays_save_day ON battle_replays (save_id, day);");
      persistBattleDb(db);
      return db;
    });
  }
  return battleDbPromise;
}

async function ensureBattleStorage(mainDb) {
  if (!battleStoragePromise) {
    battleStoragePromise = openBattleDb().then(async (battleDb) => {
      const legacyMigrated = await migrateLegacyBattleReplays(mainDb, battleDb);
      const referencesRecovered = recoverLegacyNpcBloodTrialReplays(mainDb, battleDb);
      if (legacyMigrated || referencesRecovered) persistBattleDb(battleDb);
      return battleDb;
    });
  }
  return battleStoragePromise;
}

function createBattleReplayTable(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS battle_replays (
      id TEXT NOT NULL,
      save_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      day INTEGER,
      match_id TEXT,
      replay_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (id, save_id)
    );
  `);
}

function ensureBattleReplaySchema(db) {
  const table = db.exec("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'battle_replays' LIMIT 1");
  if (!table.length || !table[0].values.length) {
    createBattleReplayTable(db);
    return false;
  }

  const columns = db.exec("PRAGMA table_info(battle_replays)");
  const primaryKey = columns.length
    ? columns[0].values
      .filter((row) => Number(row[5]) > 0)
      .sort((left, right) => Number(left[5]) - Number(right[5]))
      .map((row) => row[1])
    : [];
  if (primaryKey.length === 2 && primaryKey[0] === "id" && primaryKey[1] === "save_id") return false;

  db.run("ALTER TABLE battle_replays RENAME TO battle_replays_legacy");
  createBattleReplayTable(db);
  db.run(`
    INSERT INTO battle_replays (id, save_id, kind, day, match_id, replay_json, created_at, updated_at)
    SELECT id, save_id, kind, day, match_id, replay_json, created_at, updated_at
    FROM battle_replays_legacy
  `);
  db.run("DROP TABLE battle_replays_legacy");
  return true;
}

function recoverLegacyNpcBloodTrialReplays(mainDb, battleDb) {
  const saves = mainDb.exec("SELECT id, state_json FROM saves");
  if (!saves.length || !saves[0].values.length) return false;
  const sourceStatement = battleDb.prepare(`
    SELECT kind, day, match_id, replay_json, created_at, updated_at
    FROM battle_replays
    WHERE id = $id
    ORDER BY updated_at DESC
  `);
  const existingStatement = battleDb.prepare(`
    SELECT 1 FROM battle_replays WHERE id = $id AND save_id = $saveId LIMIT 1
  `);
  const insertStatement = battleDb.prepare(`
    INSERT INTO battle_replays (id, save_id, kind, day, match_id, replay_json, created_at, updated_at)
    VALUES ($id, $saveId, $kind, $day, $matchId, $replay, $createdAt, $updatedAt)
    ON CONFLICT(id, save_id) DO NOTHING
  `);
  const sourceRowsByReplayId = new Map();
  let changed = false;
  try {
    for (const [saveId, stateJson] of saves[0].values) {
      const replayReferences = npcBloodTrialReplayReferences(stateJson);
      for (const [replayId, reference] of replayReferences) {
        existingStatement.bind({ $id: replayId, $saveId: saveId });
        const exists = existingStatement.step();
        existingStatement.reset();
        if (exists) continue;

        if (!sourceRowsByReplayId.has(replayId)) {
          sourceStatement.bind({ $id: replayId });
          const rows = [];
          while (sourceStatement.step()) rows.push(sourceStatement.get());
          sourceStatement.reset();
          sourceRowsByReplayId.set(replayId, rows);
        }
        const matchingSources = sourceRowsByReplayId.get(replayId).filter((row) => {
          try {
            return bloodTrialReplayMatches(reference, JSON.parse(row[3]));
          } catch {
            return false;
          }
        });
        if (matchingSources.length !== 1) continue;
        const [kind, day, matchId, replay, createdAt, updatedAt] = matchingSources[0];
        insertStatement.run({
          $id: replayId,
          $saveId: saveId,
          $kind: kind || "battle",
          $day: day === null ? null : Number(day) || null,
          $matchId: matchId || "",
          $replay: replay,
          $createdAt: createdAt || new Date().toISOString(),
          $updatedAt: updatedAt || new Date().toISOString()
        });
        changed = changed || battleDb.getRowsModified() > 0;
      }
    }
  } finally {
    sourceStatement.free();
    existingStatement.free();
    insertStatement.free();
  }
  return changed;
}

function npcBloodTrialReplayReferences(stateJson) {
  const references = new Map();
  let state;
  try {
    state = JSON.parse(stateJson);
  } catch {
    return references;
  }
  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (/^blood-trial-\d+-\d+-npc-[a-z0-9-]+$/i.test(value.replayId || "")) {
      references.set(value.replayId, value);
    }
    Object.values(value).forEach(visit);
  };
  visit(state);
  return references;
}

function bloodTrialReplayMatches(reference, replay) {
  if (!reference || !replay || replay.left?.id !== reference.id) return false;
  if (reference.name && replay.left?.name !== reference.name) return false;
  const leftStartHp = Number(replay.left?.startHp ?? replay.left?.stats?.hp);
  const leftStartMana = Number(replay.left?.startMana ?? replay.left?.stats?.mana);
  const leftEndHp = Number(replay.left?.endHp);
  const leftEndMana = Number(replay.left?.endMana);
  const rightStartHp = Number(replay.right?.startHp ?? replay.right?.stats?.hp);
  const rightEndHp = Number(replay.right?.endHp);
  const output = Math.max(1, Math.floor(rightStartHp - rightEndHp));
  return leftStartHp === Number(reference.startHp)
    && leftStartMana === Number(reference.startMana)
    && leftEndHp === Number(reference.endHp)
    && leftEndMana === Number(reference.endMana)
    && output === Number(reference.output);
}

function persist(db) {
  flushDeferredStateWrites(db);
  writeFileSync(dbPath, Buffer.from(db.export()));
}

function writeStateRow(db, state, id, options = {}) {
  compactStateForStorage(state, { skipReplayCompaction: options.skipReplayExtraction });
  const statement = db.prepare(`
    INSERT INTO saves (id, state_json, updated_at)
    VALUES ($id, $state, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      state_json = excluded.state_json,
      updated_at = excluded.updated_at
  `);
  try {
    statement.run({ $id: id, $state: JSON.stringify(state) });
  } finally {
    statement.free();
  }
}

function flushDeferredStateWrites(db) {
  if (!deferredStateWrites.size) return;
  const pending = [...deferredStateWrites.entries()];
  deferredStateWrites.clear();
  for (const [id, entry] of pending) writeStateRow(db, entry.state, id, entry.options);
}

function ensureAuthUserRoleColumn(db) {
  const columns = db.exec("PRAGMA table_info(auth_users)");
  const hasRole = columns.length && columns[0].values.some((row) => row[1] === "role");
  if (!hasRole) db.run("ALTER TABLE auth_users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
}

function persistBattleDb(db) {
  writeFileSync(battleDbPath, Buffer.from(db.export()));
}

function migrateLegacyBattleReplays(mainDb, battleDb) {
  const tableResult = mainDb.exec("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'battle_replays' LIMIT 1");
  if (!tableResult.length || !tableResult[0].values.length) return false;

  const rows = mainDb.exec(`
    SELECT id, save_id, kind, day, match_id, replay_json, created_at, updated_at
    FROM battle_replays
  `);
  const values = rows.length ? rows[0].values : [];
  if (values.length) {
    const statement = battleDb.prepare(`
      INSERT INTO battle_replays (id, save_id, kind, day, match_id, replay_json, created_at, updated_at)
      VALUES ($id, $saveId, $kind, $day, $matchId, $replay, COALESCE($createdAt, datetime('now')), COALESCE($updatedAt, datetime('now')))
      ON CONFLICT(id, save_id) DO UPDATE SET
        kind = excluded.kind,
        day = excluded.day,
        match_id = excluded.match_id,
        replay_json = excluded.replay_json,
        updated_at = excluded.updated_at
    `);
    try {
      for (const [id, saveId, kind, day, matchId, replay, createdAt, updatedAt] of values) {
        statement.run({
          $id: id,
          $saveId: saveId,
          $kind: kind || "battle",
          $day: day === null ? null : Number(day) || null,
          $matchId: matchId || "",
          $replay: replay,
          $createdAt: createdAt || null,
          $updatedAt: updatedAt || null
        });
      }
    } finally {
      statement.free();
    }
    persistBattleDb(battleDb);
  }

  mainDb.run("DROP TABLE battle_replays");
  mainDb.run("VACUUM");
  persist(mainDb);
  return values.length > 0;
}

function schedulePersist(db) {
  deferredPersistDb = db;
  const now = Date.now();
  if (!deferredPersistStartedAt) deferredPersistStartedAt = now;
  clearTimeout(deferredPersistTimer);
  const delay = Math.max(0, Math.min(deferredPersistIdleMs, deferredPersistMaxMs - (now - deferredPersistStartedAt)));
  deferredPersistTimer = setTimeout(() => {
    deferredPersistTimer = null;
    deferredPersistStartedAt = 0;
    const targetDb = deferredPersistDb;
    deferredPersistDb = null;
    if (!targetDb) return;
    persist(targetDb);
  }, delay);
}

function scheduleBattlePersist(db) {
  deferredBattlePersistDb = db;
  const now = Date.now();
  if (!deferredBattlePersistStartedAt) deferredBattlePersistStartedAt = now;
  clearTimeout(deferredBattlePersistTimer);
  const delay = Math.max(0, Math.min(deferredPersistIdleMs, deferredPersistMaxMs - (now - deferredBattlePersistStartedAt)));
  deferredBattlePersistTimer = setTimeout(() => {
    deferredBattlePersistTimer = null;
    deferredBattlePersistStartedAt = 0;
    const targetDb = deferredBattlePersistDb;
    deferredBattlePersistDb = null;
    if (!targetDb) return;
    persistBattleDb(targetDb);
  }, delay);
}

function flushDeferredPersist() {
  if (deferredPersistTimer) {
    clearTimeout(deferredPersistTimer);
    deferredPersistTimer = null;
  }
  deferredPersistStartedAt = 0;
  if (!deferredPersistDb) return;
  const targetDb = deferredPersistDb;
  deferredPersistDb = null;
  persist(targetDb);
}

function flushDeferredBattlePersist() {
  if (deferredBattlePersistTimer) {
    clearTimeout(deferredBattlePersistTimer);
    deferredBattlePersistTimer = null;
  }
  deferredBattlePersistStartedAt = 0;
  if (!deferredBattlePersistDb) return;
  const targetDb = deferredBattlePersistDb;
  deferredBattlePersistDb = null;
  persistBattleDb(targetDb);
}

process.once("beforeExit", flushDeferredPersist);
process.once("beforeExit", flushDeferredBattlePersist);
process.once("SIGINT", () => {
  flushDeferredPersist();
  flushDeferredBattlePersist();
  process.exit(130);
});
process.once("SIGTERM", () => {
  flushDeferredPersist();
  flushDeferredBattlePersist();
  process.exit(143);
});

function normalizeUsername(value) {
  return String(value || "").trim();
}

function assertUsername(username) {
  if (username.length < 2 || username.length > 24) throw new Error("账号名需为 2-24 个字符");
  if (/[\s\x00-\x1f]/.test(username)) throw new Error("账号名不能包含空白或控制字符");
}

function assertPassword(password) {
  if (typeof password !== "string" || password.length < 6) throw new Error("密码至少需要 6 位");
  if (password.length > 72) throw new Error("密码最多 72 位");
}

function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("base64url");
}

function sessionExpiryDate() {
  return new Date(Date.now() + sessionMaxAgeSeconds * 1000).toISOString();
}

function publicUser(row) {
  if (!row) return null;
  const [id, username, createdAt, lastLoginAt, role = "user"] = row;
  return {
    id,
    username,
    saveId: id,
    createdAt,
    lastLoginAt: lastLoginAt || "",
    role,
    isAdmin: role === "admin"
  };
}

function readUserByName(db, username) {
  const result = db.exec(
    "SELECT id, username, password_hash, password_salt, created_at, last_login_at, role FROM auth_users WHERE username = $username COLLATE NOCASE LIMIT 1",
    { $username: username }
  );
  return result.length && result[0].values.length ? result[0].values[0] : null;
}

function userCount(db) {
  const result = db.exec("SELECT COUNT(*) FROM auth_users");
  return result.length ? Number(result[0].values[0][0] || 0) : 0;
}

function firstPlayerUserId(db) {
  const result = db.exec(`
    SELECT id
    FROM auth_users
    WHERE role IS NULL OR role <> 'admin'
    ORDER BY datetime(created_at) ASC, id ASC
    LIMIT 1
  `);
  return result.length && result[0].values.length ? result[0].values[0][0] : "";
}

function isPlayerUserId(db, id) {
  if (!id) return false;
  const result = db.exec(
    "SELECT 1 FROM auth_users WHERE id = $id AND (role IS NULL OR role <> 'admin') LIMIT 1",
    { $id: id }
  );
  return Boolean(result.length && result[0].values.length);
}

function appSetting(db, key) {
  const result = db.exec("SELECT value FROM app_settings WHERE key = $key LIMIT 1", { $key: key });
  return result.length && result[0].values.length ? String(result[0].values[0][0] || "") : "";
}

function setAppSetting(db, key, value) {
  db.run(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ($key, $value, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at
  `, { $key: key, $value: String(value || "") });
}

function parseActiveSaveIds(value) {
  const text = String(value || "").trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed.map((item) => String(item || "").trim()).filter(Boolean) : [];
  } catch {
    return [text].filter(Boolean);
  }
}

function activeSaveIdsFromSetting(db) {
  const current = parseActiveSaveIds(appSetting(db, activeSaveSettingKey));
  if (current.length) return current;
  return parseActiveSaveIds(appSetting(db, legacyActiveSaveSettingKey));
}

function setActiveSaveIds(db, ids) {
  const validIds = [...new Set((ids || []).filter((id) => isPlayerUserId(db, id)))];
  setAppSetting(db, activeSaveSettingKey, JSON.stringify(validIds));
  return validIds;
}

function ensureActiveSaveSetting(db) {
  const current = activeSaveIdsFromSetting(db).filter((id) => isPlayerUserId(db, id));
  if (current.length) return setActiveSaveIds(db, current);
  const fallback = firstPlayerUserId(db);
  return fallback ? setActiveSaveIds(db, [fallback]) : [];
}

function managedUserId(db) {
  const current = appSetting(db, managedSaveSettingKey);
  if (isPlayerUserId(db, current)) return current;
  const fallback = firstPlayerUserId(db) || "default";
  if (fallback !== "default") setAppSetting(db, managedSaveSettingKey, fallback);
  return fallback;
}

function activeSaveRows(db) {
  const activeIds = ensureActiveSaveSetting(db);
  const rows = [];
  for (const id of activeIds) {
    const result = db.exec(
      "SELECT id, state_json FROM saves WHERE id = $id ORDER BY id",
      { $id: id }
    );
    rows.push(...(result[0]?.values || []));
  }
  return rows;
}

function listPlayerAccounts(db) {
  const result = db.exec(`
    SELECT
      u.id,
      u.username,
      u.role,
      u.created_at,
      u.last_login_at,
      s.updated_at,
      length(s.state_json)
    FROM auth_users u
    LEFT JOIN saves s ON s.id = u.id
    WHERE u.role IS NULL OR u.role <> 'admin'
    ORDER BY datetime(u.created_at) ASC, u.id ASC
  `);
  return (result[0]?.values || []).map(([id, username, role, createdAt, lastLoginAt, saveUpdatedAt, saveBytes]) => ({
    id,
    username,
    role: role || "player",
    createdAt,
    lastLoginAt: lastLoginAt || "",
    saveId: id,
    saveUpdatedAt: saveUpdatedAt || "",
    saveBytes: Number(saveBytes || 0),
    hasSave: Boolean(saveUpdatedAt)
  }));
}

function publicActiveAccountState(db) {
  const activeSaveIds = ensureActiveSaveSetting(db);
  const activeSet = new Set(activeSaveIds);
  const accounts = listPlayerAccounts(db);
  return {
    activeSaveIds,
    managedSaveId: managedUserId(db),
    accounts: accounts.map((account) => ({
      ...account,
      active: activeSet.has(account.id)
    }))
  };
}

export async function getAdminAccounts() {
  const db = await openDb();
  return publicActiveAccountState(db);
}

export async function setActiveAccount(saveId, active = true) {
  const db = await openDb();
  const id = String(saveId || "").trim();
  if (!isPlayerUserId(db, id)) throw new Error("只能选择普通用户作为活跃账户");
  const current = new Set(ensureActiveSaveSetting(db));
  if (active) current.add(id);
  else current.delete(id);
  setActiveSaveIds(db, [...current]);
  stateValidationCache.delete(id);
  publicStateCache.clear();
  persist(db);
  if (active) await readState(id);
  return publicActiveAccountState(db);
}

export async function activeSettlementSaveIds() {
  const db = await openDb();
  return ensureActiveSaveSetting(db);
}

export async function setAdminManagedSaveId(saveId) {
  const db = await openDb();
  const id = String(saveId || "").trim();
  if (!isPlayerUserId(db, id)) throw new Error("只能管理普通用户存档");
  setAppSetting(db, managedSaveSettingKey, id);
  persist(db);
  await readState(id);
  return publicActiveAccountState(db);
}

export async function deleteInactiveAccountData(activeSaveIds) {
  const db = await openDb();
  const battleDb = await ensureBattleStorage(db);
  const activeIds = Array.isArray(activeSaveIds) ? activeSaveIds : ensureActiveSaveSetting(db);
  const activeSet = new Set(activeIds.filter((id) => isPlayerUserId(db, id)));
  if (!activeSet.size) throw new Error("缺少有效的活跃账户");

  const inactiveSaveRows = db.exec("SELECT id FROM saves ORDER BY id");
  const inactiveSaveIds = inactiveSaveRows[0]?.values.map((row) => row[0]) || [];
  let deletedSaves = 0;
  let deletedSummaries = 0;
  let deletedReplays = 0;

  for (const id of inactiveSaveIds.filter((item) => !activeSet.has(item))) {
    const saveStatement = db.prepare("DELETE FROM saves WHERE id = $id");
    saveStatement.run({ $id: id });
    deletedSaves += db.getRowsModified();
    saveStatement.free();

    const summaryStatement = db.prepare("DELETE FROM history_monthly_summaries WHERE save_id = $id");
    summaryStatement.run({ $id: id });
    deletedSummaries += db.getRowsModified();
    summaryStatement.free();

    const replayStatement = battleDb.prepare("DELETE FROM battle_replays WHERE save_id = $id");
    replayStatement.run({ $id: id });
    deletedReplays += battleDb.getRowsModified();
    replayStatement.free();

    stateCache.delete(id);
    stateValidationCache.delete(id);
  }

  publicStateCache.clear();
  persist(db);
  persistBattleDb(battleDb);
  return { activeSaveIds: [...activeSet], deletedSaves, deletedSummaries, deletedReplays, deletedSaveIds: inactiveSaveIds.filter((item) => !activeSet.has(item)) };
}

function assertRegistrationCode(db, code) {
  const text = String(code || "").trim();
  if (!text) throw new Error("请输入注册码");
  const result = db.exec(
    "SELECT active, max_uses, used_count FROM auth_registration_codes WHERE code = $code LIMIT 1",
    { $code: text }
  );
  if (!result.length || !result[0].values.length) throw new Error("注册码无效");
  const [active, maxUses, usedCount] = result[0].values[0];
  if (!Number(active)) throw new Error("注册码已停用");
  if (maxUses !== null && Number(usedCount || 0) >= Number(maxUses)) throw new Error("注册码已用尽");
  return text;
}

function incrementRegistrationCodeUse(db, code) {
  const statement = db.prepare("UPDATE auth_registration_codes SET used_count = used_count + 1 WHERE code = $code");
  try {
    statement.run({ $code: code });
  } finally {
    statement.free();
  }
}

function createSession(db, userId) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const expiresAt = sessionExpiryDate();
  const statement = db.prepare(`
    INSERT INTO auth_sessions (token_hash, user_id, expires_at)
    VALUES ($tokenHash, $userId, $expiresAt)
  `);
  try {
    statement.run({ $tokenHash: tokenHash, $userId: userId, $expiresAt: expiresAt });
  } finally {
    statement.free();
  }
  return { token, expiresAt, maxAge: sessionMaxAgeSeconds };
}

function touchUserLogin(db, userId) {
  const statement = db.prepare("UPDATE auth_users SET last_login_at = datetime('now') WHERE id = $id");
  try {
    statement.run({ $id: userId });
  } finally {
    statement.free();
  }
}

export function sessionCookie(session) {
  return [
    `csj_session=${session.token}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${session.maxAge}`
  ].join("; ");
}

export function clearSessionCookie() {
  return "csj_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0";
}

export async function getAuthSession(token) {
  const text = String(token || "").trim();
  if (!text) return null;
  const db = await openDb();
  const tokenHash = hashSessionToken(text);
  const result = db.exec(`
    SELECT u.id, u.username, u.created_at, u.last_login_at, u.role, s.expires_at
    FROM auth_sessions s
    JOIN auth_users u ON u.id = s.user_id
    WHERE s.token_hash = $tokenHash
    LIMIT 1
  `, { $tokenHash: tokenHash });
  if (!result.length || !result[0].values.length) return null;
  const row = result[0].values[0];
  const expiresAt = row[5] || "";
  if (!expiresAt || Date.parse(expiresAt) <= Date.now()) {
    await logoutSession(text);
    return null;
  }
  return { user: publicUser(row.slice(0, 5)), expiresAt };
}

export async function registerUser({ username, password, registrationCode }, context = {}) {
  const db = await openDb();
  const cleanUsername = normalizeUsername(username);
  assertUsername(cleanUsername);
  assertPassword(password);
  const attempt = sqliteAuthAttempt("register", context, cleanUsername);
  let code;
  try {
    code = assertRegistrationCode(db, registrationCode);
    if (readUserByName(db, cleanUsername)) throw new Error("账号名已存在");
  } catch (error) {
    recordSqliteAuthFailure(attempt);
    throw error;
  }

  const isFirstUser = userCount(db) === 0;
  const id = `user-${randomUUID()}`;
  const { hash, salt } = await hashPassword(password);
  const statement = db.prepare(`
    INSERT INTO auth_users (id, username, password_hash, password_salt, last_login_at)
    VALUES ($id, $username, $passwordHash, $passwordSalt, datetime('now'))
  `);
  try {
    statement.run({
      $id: id,
      $username: cleanUsername,
      $passwordHash: hash,
      $passwordSalt: salt
    });
  } finally {
    statement.free();
  }
  incrementRegistrationCodeUse(db, code);
  const session = createSession(db, id);
  persist(db);

  if (isFirstUser) {
    const defaultState = await readState("default");
    await writeState(JSON.parse(JSON.stringify(defaultState)), id);
  } else {
    await readState(id);
  }
  authAttempts.delete(attempt.key);

  return {
    user: { id, username: cleanUsername, saveId: id, createdAt: new Date().toISOString(), lastLoginAt: new Date().toISOString(), role: "user", isAdmin: false },
    session
  };
}

export async function loginUser({ username, password }, context = {}) {
  const db = await openDb();
  const cleanUsername = normalizeUsername(username);
  assertUsername(cleanUsername);
  assertPassword(password);
  const attempt = sqliteAuthAttempt("login", context, cleanUsername);
  const row = readUserByName(db, cleanUsername);
  if (!row || !await verifyPassword(password, row[3], row[2])) {
    recordSqliteAuthFailure(attempt);
    throw new Error("账号或密码错误");
  }
  touchUserLogin(db, row[0]);
  const session = createSession(db, row[0]);
  persist(db);
  await readState(row[6] === "admin" ? managedUserId(db) : row[0]);
  authAttempts.delete(attempt.key);
  return {
    user: { ...publicUser([row[0], row[1], row[4], new Date().toISOString(), row[6]]) },
    session
  };
}

export async function getAdminManagedSaveId() {
  const db = await openDb();
  return managedUserId(db);
}

export async function logoutSession(token) {
  const text = String(token || "").trim();
  if (!text) return;
  const db = await openDb();
  const statement = db.prepare("DELETE FROM auth_sessions WHERE token_hash = $tokenHash");
  try {
    statement.run({ $tokenHash: hashSessionToken(text) });
  } finally {
    statement.free();
  }
  persist(db);
}

export async function readState(id = "default", options = {}) {
  const cached = stateCache.get(id);
  if (cached) {
    if (stateValidationCache.get(id) === dateKey()) return cached;
    const storageChanged = Number(cached.storageCompactionVersion || 0) < 1;
    const shapeChanged = ensureStateShape(cached);
    const settled = settleIfNeeded(cached, options);
    if (shapeChanged || settled || storageChanged) await writeState(cached, id, { vacuum: storageChanged });
    else stateValidationCache.set(id, dateKey());
    return cached;
  }

  const db = await openDb();
  const battleDb = await ensureBattleStorage(db);
  const result = db.exec("SELECT state_json FROM saves WHERE id = $id", { $id: id });

  if (!result.length || !result[0].values.length) {
    const state = createDefaultState();
    await writeState(state, id);
    return state;
  }

  const state = JSON.parse(result[0].values[0][0]);
  stateCache.set(id, state);
  const needsReplayMigration = Number(state.storageCompactionVersion || 0) < 1;
  const replaysMigrated = needsReplayMigration ? extractBattleReplays(battleDb, state, id) : false;
  if (replaysMigrated) persistBattleDb(battleDb);
  const shapeChanged = ensureStateShape(state);
  const settled = settleIfNeeded(state, options);
  if (shapeChanged || settled || replaysMigrated) await writeState(state, id, { vacuum: needsReplayMigration });
  else stateValidationCache.set(id, dateKey());
  return state;
}

export async function settleAllStates() {
  const db = await openDb();
  const rows = activeSaveRows(db);
  let settledSaves = 0;
  const failures = [];

  for (const [id, stateJson] of rows) {
    try {
      const beforeState = stateCache.get(id) || JSON.parse(stateJson);
      const beforeDay = beforeState.day;
      const beforeDate = beforeState.lastSettlementDate;
      let state;
      do {
        stateValidationCache.delete(id);
        state = await readState(id, { maxDays: 1 });
        stateValidationCache.delete(id);
        if (state.lastSettlementDate < dateKey()) await new Promise((resolve) => setImmediate(resolve));
      } while (state.lastSettlementDate < dateKey());
      if (state.day !== beforeDay || state.lastSettlementDate !== beforeDate) settledSaves += 1;
    } catch (error) {
      failures.push({ id, error: error.message || String(error) });
    }
    await new Promise((resolve) => setImmediate(resolve));
  }

  return { totalSaves: rows.length, settledSaves, failures };
}

export async function writeState(state, id = "default", options = {}) {
  const db = await openDb();
  const battleDb = await ensureBattleStorage(db);
  const replaysWritten = writePendingBattleReplays(battleDb, state, id);
  const replaysPruned = pruneBattleReplays(battleDb, state, id);
  state.__stateRevision = Math.max(0, Number(state.__stateRevision || 0)) + 1;
  stateCache.set(id, state);
  stateValidationCache.set(id, dateKey());
  publicStateCache.delete(id);
  if (options.deferStateWrite) {
    deferredStateWrites.set(id, { state, options });
    schedulePersist(db);
  } else {
    deferredStateWrites.delete(id);
    writeStateRow(db, state, id, options);
    if (options.vacuum) db.run("VACUUM");
    if (options.deferPersist) schedulePersist(db);
    else persist(db);
  }
  if (replaysWritten || replaysPruned) {
    if (options.deferPersist) scheduleBattlePersist(battleDb);
    else persistBattleDb(battleDb);
  }
}

function pruneBattleReplays(db, state, saveId) {
  const minDay = minReplayDayFor(state.day || 1);
  const statement = db.prepare("DELETE FROM battle_replays WHERE save_id = $saveId AND day IS NOT NULL AND day < $minDay");
  try {
    statement.run({ $saveId: saveId, $minDay: minDay });
    return db.getRowsModified() > 0;
  } finally {
    statement.free();
  }
}

function writePendingBattleReplays(db, state, saveId) {
  const pending = Array.isArray(state.__pendingBattleReplays) ? state.__pendingBattleReplays : [];
  if (!pending.length) return false;
  const uniquePending = [...new Map(pending
    .filter((item) => item?.id && item.replay)
    .map((item) => [item.id, item])).values()];
  const statement = db.prepare(`
    INSERT INTO battle_replays (id, save_id, kind, day, match_id, replay_json, updated_at)
    VALUES ($id, $saveId, $kind, $day, $matchId, $replay, datetime('now'))
    ON CONFLICT(id, save_id) DO UPDATE SET
      replay_json = excluded.replay_json,
      updated_at = excluded.updated_at
  `);
  try {
    for (const item of uniquePending) {
      statement.run({
        $id: item.id,
        $saveId: saveId,
        $kind: item.kind || item.replay.kind || "battle",
        $day: Number(item.day || item.replay.day || 0) || null,
        $matchId: item.matchId || "",
        $replay: JSON.stringify(item.replay)
      });
    }
  } finally {
    statement.free();
    delete state.__pendingBattleReplays;
  }
  return true;
}

function extractBattleReplays(db, state, saveId) {
  let changed = false;
  const statement = db.prepare(`
    INSERT INTO battle_replays (id, save_id, kind, day, match_id, replay_json, updated_at)
    VALUES ($id, $saveId, $kind, $day, $matchId, $replay, datetime('now'))
    ON CONFLICT(id, save_id) DO UPDATE SET
      replay_json = excluded.replay_json,
      updated_at = excluded.updated_at
  `);
  try {
    const visit = (value, context = {}) => {
      if (!value || typeof value !== "object") return;
      if (Array.isArray(value)) {
        value.forEach((item, index) => visit(item, { ...context, path: `${context.path || ""}[${index}]` }));
        return;
      }

      const replay = value.replay;
      if (replay && typeof replay === "object") {
        const replayId = value.replayId || replay.replayId || randomUUID();
        preserveReplaySummary(value, replay);
        statement.run({
          $id: replayId,
          $saveId: saveId,
          $kind: replay.kind || context.kind || "battle",
          $day: Number(context.day || value.day || 0) || null,
          $matchId: context.matchId || value.id || "",
          $replay: JSON.stringify(replay)
        });
        value.replayId = replayId;
        value.replay = null;
        changed = true;
      }

      const nextContext = {
        ...context,
        day: value.day ?? context.day,
        matchId: value.matchId || value.id || context.matchId,
        kind: value.type || value.kind || context.kind
      };
      for (const [key, child] of Object.entries(value)) {
        if (key === "replay") continue;
        visit(child, { ...nextContext, path: context.path ? `${context.path}.${key}` : key });
      }
    };

    visit(state);
  } finally {
    statement.free();
  }
  return changed;
}

function preserveReplaySummary(record, replay) {
  if (!record || !replay || typeof record !== "object") return;
  if (!record.winner && replay.winner) {
    record.winner = replay.winner === "left" ? replay.left : replay.right;
  }
  if (!record.loser && replay.winner) {
    record.loser = replay.winner === "left" ? replay.right : replay.left;
  }
  if (!record.foughtAt && replay.foughtAt) record.foughtAt = replay.foughtAt;
  if (!record.result && replay.result) record.result = replay.result;
}

export async function readBattleReplay(replayId, id = "default") {
  const mainDb = await openDb();
  const db = await ensureBattleStorage(mainDb);
  const result = db.exec(
    "SELECT replay_json, day, kind FROM battle_replays WHERE id = $id AND save_id = $saveId LIMIT 1",
    { $id: replayId, $saveId: id }
  );
  if (!result.length || !result[0].values.length) throw new Error("未找到该场切磋回放");
  const [replayJson, day, kind] = result[0].values[0];
  const replay = JSON.parse(replayJson);
  replay.replayId = replayId;
  replay.day = replay.day || Number(day || 0) || undefined;
  replay.kind = replay.kind || kind;
  return replay;
}

export async function mutateState(mutator, id = "default", options = {}) {
  const source = await readState(id);
  const state = structuredClone(source);
  const result = mutator(state);
  await writeState(state, id, options.storageOptions);
  if (options.resultOnly) return { result };
  const publicState = { ...getPublicState(state, options.publicOptions), stateRevision: Number(state.__stateRevision || 0) };
  return result === undefined ? publicState : { state: publicState, result };
}

export async function resetState(id = "default", options = {}) {
  let previousState = null;
  try {
    previousState = await readState(id);
  } catch {
    previousState = null;
  }

  const db = await openDb();
  const battleDb = await ensureBattleStorage(db);
  deferredStateWrites.delete(id);
  const statement = db.prepare("DELETE FROM saves WHERE id = $id");
  statement.run({ $id: id });
  statement.free();
  const replayStatement = battleDb.prepare("DELETE FROM battle_replays WHERE save_id = $id");
  replayStatement.run({ $id: id });
  const replayRowsDeleted = battleDb.getRowsModified() > 0;
  replayStatement.free();
  stateCache.delete(id);
  stateValidationCache.delete(id);
  publicStateCache.delete(id);
  persist(db);
  if (replayRowsDeleted) persistBattleDb(battleDb);

  const state = preserveProfilesForReset(clearProgressHistory(createDefaultState()), previousState);
  state.__stateRevision = Number(previousState?.__stateRevision || 0);
  await writeState(state, id);
  return { ...getPublicState(state, options.publicOptions), stateRevision: Number(state.__stateRevision || 0) };
}

export async function publicState(id = "default", options = {}) {
  const scope = ["home", "lite"].includes(options.scope) ? options.scope : "full";
  const cached = publicStateCache.get(id);
  if (cached?.date === dateKey() && cached?.[scope]) return cached[scope];
  const state = await readState(id);
  const nextState = { ...getPublicState(state, options), stateRevision: Number(state.__stateRevision || 0) };
  const nextCache = { ...(cached?.date === dateKey() ? cached : {}), date: dateKey(), [scope]: nextState };
  publicStateCache.set(id, nextCache);
  return nextState;
}
