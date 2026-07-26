import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { clearProgressHistory, createDefaultState, dateKey, ensureStateShape, getPublicState, minReplayDayFor, preserveProfilesForReset, settleIfNeeded } from "./gameLogic.mjs";
import { ensureMysqlSchema, mysqlPool, parseMysqlJson, withMysqlTransaction } from "./mysqlDb.mjs";
import { loadStateFromMysql, pruneBattleReplays, readReplayFromMysql, saveStateWithConnection, upsertBattleReplays } from "./mysqlStateRepository.mjs";

const defaultRegistrationCode = "Rushac";
const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;
const bootstrapAdminUsername = process.env.ADMIN_USERNAME || "admin";
const bootstrapAdminPassword = process.env.ADMIN_PASSWORD || "Admin@24";
const activeSaveSettingKey = "active_save_ids";
const legacyActiveSaveSettingKey = "active_save_id";

const stateCache = new Map();
const stateValidationCache = new Map();
const publicStateCache = new Map();
const saveLocks = new Map();
let bootstrapPromise;

function mysqlDate(value = new Date()) {
  return new Date(value).toISOString().slice(0, 23).replace("T", " ");
}

function parseMysqlDate(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  return new Date(`${text.replace(" ", "T")}Z`).toISOString();
}

function normalizeUsername(value) {
  return String(value || "").trim();
}

function normalizedUsername(value) {
  return normalizeUsername(value).toLocaleLowerCase("en-US");
}

function assertUsername(username) {
  if (username.length < 2 || username.length > 24) throw new Error("账号名需为 2-24 个字符");
  if (/[\s\x00-\x1f]/.test(username)) throw new Error("账号名不能包含空白或控制字符");
}

function assertPassword(password) {
  if (typeof password !== "string" || password.length < 6) throw new Error("密码至少需要 6 位");
  if (password.length > 72) throw new Error("密码最多 72 位");
}

function hashPassword(password, salt = randomBytes(16).toString("base64url")) {
  const hash = scryptSync(password, salt, 64).toString("base64url");
  return { hash, salt };
}

function verifyPassword(password, salt, expectedHash) {
  const actual = Buffer.from(hashPassword(password, salt).hash, "base64url");
  const expected = Buffer.from(expectedHash, "base64url");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("base64url");
}

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    saveId: row.id,
    createdAt: parseMysqlDate(row.created_at),
    lastLoginAt: parseMysqlDate(row.last_login_at),
    role: row.role || "user",
    isAdmin: row.role === "admin"
  };
}

async function bootstrapMysqlStore() {
  if (!bootstrapPromise) bootstrapPromise = (async () => {
    await ensureMysqlSchema();
    const { hash, salt } = hashPassword(bootstrapAdminPassword);
    await withMysqlTransaction(async (connection) => {
      await connection.query(`
        INSERT INTO auth_registration_codes (code, active, max_uses, used_count)
        VALUES (?, 1, NULL, 0)
        ON DUPLICATE KEY UPDATE code = code
      `, [defaultRegistrationCode]);
      const [admins] = await connection.query("SELECT id FROM auth_users WHERE role = 'admin' ORDER BY created_at LIMIT 1");
      if (admins.length) {
        await connection.query(`
          UPDATE auth_users
          SET username = ?, username_normalized = ?, password_hash = ?, password_salt = ?, role = 'admin'
          WHERE id = ?
        `, [bootstrapAdminUsername, normalizedUsername(bootstrapAdminUsername), hash, salt, admins[0].id]);
      } else {
        await connection.query(`
          INSERT INTO auth_users (id, username, username_normalized, password_hash, password_salt, role)
          VALUES (?, ?, ?, ?, ?, 'admin')
        `, [`user-${randomUUID()}`, bootstrapAdminUsername, normalizedUsername(bootstrapAdminUsername), hash, salt]);
      }
    });
  })().catch((error) => {
    bootstrapPromise = null;
    throw error;
  });
  return bootstrapPromise;
}

async function withSaveLock(saveId, callback) {
  const previous = saveLocks.get(saveId) || Promise.resolve();
  let release;
  const current = new Promise((resolve) => { release = resolve; });
  saveLocks.set(saveId, current);
  await previous;
  try {
    return await callback();
  } finally {
    release();
    if (saveLocks.get(saveId) === current) saveLocks.delete(saveId);
  }
}

async function readSetting(key) {
  await bootstrapMysqlStore();
  const [rows] = await mysqlPool.query("SELECT setting_value FROM app_settings WHERE setting_key = ? LIMIT 1", [key]);
  return rows.length ? parseMysqlJson(rows[0].setting_value, null) : null;
}

async function writeSetting(connection, key, value) {
  await connection.query(`
    INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?)
    ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP(3)
  `, [key, JSON.stringify(value)]);
}

async function playerUserIds(connection = mysqlPool) {
  const [rows] = await connection.query("SELECT id FROM auth_users WHERE role <> 'admin' ORDER BY created_at, id");
  return rows.map((row) => row.id);
}

async function activeSaveIds() {
  const current = await readSetting(activeSaveSettingKey);
  if (Array.isArray(current) && current.length) return current.map(String);
  const legacy = await readSetting(legacyActiveSaveSettingKey);
  if (Array.isArray(legacy)) return legacy.map(String);
  if (legacy) return [String(legacy)];
  return [];
}

async function ensureActiveSaveIds() {
  const players = await playerUserIds();
  const playerSet = new Set(players);
  const current = (await activeSaveIds()).filter((id) => playerSet.has(id));
  const next = current.length ? current : players.slice(0, 1);
  if (JSON.stringify(next) !== JSON.stringify(current)) {
    await withMysqlTransaction((connection) => writeSetting(connection, activeSaveSettingKey, next));
  }
  return next;
}

async function managedUserId() {
  return (await ensureActiveSaveIds())[0] || (await playerUserIds())[0] || "default";
}

async function writeStateInternal(state, id, options = {}) {
  const pending = Array.isArray(state.__pendingBattleReplays) ? [...state.__pendingBattleReplays] : [];
  delete state.__pendingBattleReplays;
  await withMysqlTransaction(async (connection) => {
    await saveStateWithConnection(connection, state, id, options);
    await upsertBattleReplays(connection, id, pending);
    await pruneBattleReplays(connection, id, minReplayDayFor(state.day || 1));
  });
  stateCache.set(id, state);
  stateValidationCache.set(id, dateKey());
  publicStateCache.delete(id);
}

export async function getAdminAccounts() {
  await bootstrapMysqlStore();
  const activeIds = await ensureActiveSaveIds();
  const activeSet = new Set(activeIds);
  const [rows] = await mysqlPool.query(`
    SELECT u.id, u.username, u.role, u.created_at, u.last_login_at, s.updated_at,
      COALESCE((SELECT SUM(OCTET_LENGTH(section_json)) FROM save_sections ss WHERE ss.save_id = u.id), 0)
      + COALESCE((SELECT SUM(OCTET_LENGTH(cultivator_json)) FROM cultivators c WHERE c.save_id = u.id), 0)
      + COALESCE((SELECT SUM(OCTET_LENGTH(record_json)) FROM cultivator_history h WHERE h.save_id = u.id), 0) AS save_bytes
    FROM auth_users u
    LEFT JOIN game_saves s ON s.save_id = u.id
    WHERE u.role <> 'admin'
    ORDER BY u.created_at, u.id
  `);
  return {
    activeSaveIds: activeIds,
    managedSaveId: activeIds[0] || "",
    accounts: rows.map((row) => ({
      id: row.id,
      username: row.username,
      role: row.role || "player",
      createdAt: parseMysqlDate(row.created_at),
      lastLoginAt: parseMysqlDate(row.last_login_at),
      saveId: row.id,
      saveUpdatedAt: parseMysqlDate(row.updated_at),
      saveBytes: Number(row.save_bytes || 0),
      hasSave: Boolean(row.updated_at),
      active: activeSet.has(row.id)
    }))
  };
}

export async function setActiveAccount(saveId, active = true) {
  await bootstrapMysqlStore();
  const id = String(saveId || "").trim();
  const players = new Set(await playerUserIds());
  if (!players.has(id)) throw new Error("只能选择普通用户作为活跃账户");
  const current = new Set(await ensureActiveSaveIds());
  if (active) current.add(id);
  else current.delete(id);
  await withMysqlTransaction((connection) => writeSetting(connection, activeSaveSettingKey, [...current]));
  stateValidationCache.delete(id);
  publicStateCache.clear();
  if (active) await readState(id);
  return getAdminAccounts();
}

export async function deleteInactiveAccountData(activeIds) {
  await bootstrapMysqlStore();
  const validPlayers = new Set(await playerUserIds());
  const keep = new Set((Array.isArray(activeIds) ? activeIds : await ensureActiveSaveIds()).filter((id) => validPlayers.has(id)));
  if (!keep.size) throw new Error("缺少有效的活跃账户");
  const [rows] = await mysqlPool.query("SELECT save_id FROM game_saves ORDER BY save_id");
  const deletedSaveIds = rows.map((row) => row.save_id).filter((id) => !keep.has(id));
  let deletedReplays = 0;
  await withMysqlTransaction(async (connection) => {
    for (const id of deletedSaveIds) {
      const [replayResult] = await connection.query("DELETE FROM battle_replays WHERE save_id = ?", [id]);
      deletedReplays += replayResult.affectedRows;
      await connection.query("DELETE FROM game_saves WHERE save_id = ?", [id]);
    }
    await writeSetting(connection, activeSaveSettingKey, [...keep]);
  });
  for (const id of deletedSaveIds) {
    stateCache.delete(id);
    stateValidationCache.delete(id);
  }
  publicStateCache.clear();
  return { activeSaveIds: [...keep], deletedSaves: deletedSaveIds.length, deletedSummaries: 0, deletedReplays, deletedSaveIds };
}

export function sessionCookie(session) {
  return [`csj_session=${session.token}`, "HttpOnly", "SameSite=Lax", "Path=/", `Max-Age=${session.maxAge}`].join("; ");
}

export function clearSessionCookie() {
  return "csj_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0";
}

export async function getAuthSession(token) {
  await bootstrapMysqlStore();
  const text = String(token || "").trim();
  if (!text) return null;
  const [rows] = await mysqlPool.query(`
    SELECT u.*, s.expires_at FROM auth_sessions s
    JOIN auth_users u ON u.id = s.user_id
    WHERE s.token_hash = ? LIMIT 1
  `, [hashSessionToken(text)]);
  if (!rows.length) return null;
  const expiresAt = parseMysqlDate(rows[0].expires_at);
  if (!expiresAt || Date.parse(expiresAt) <= Date.now()) {
    await logoutSession(text);
    return null;
  }
  return { user: publicUser(rows[0]), expiresAt };
}

export async function registerUser({ username, password, registrationCode }) {
  await bootstrapMysqlStore();
  const cleanUsername = normalizeUsername(username);
  assertUsername(cleanUsername);
  assertPassword(password);
  const code = String(registrationCode || "").trim();
  if (!code) throw new Error("请输入注册码");
  const id = `user-${randomUUID()}`;
  const { hash, salt } = hashPassword(password);
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionMaxAgeSeconds * 1000);
  await withMysqlTransaction(async (connection) => {
    const [codes] = await connection.query("SELECT active, max_uses, used_count FROM auth_registration_codes WHERE code = ? FOR UPDATE", [code]);
    if (!codes.length) throw new Error("注册码无效");
    const registration = codes[0];
    if (!Number(registration.active)) throw new Error("注册码已停用");
    if (registration.max_uses !== null && Number(registration.used_count) >= Number(registration.max_uses)) throw new Error("注册码已用尽");
    const [duplicates] = await connection.query("SELECT 1 FROM auth_users WHERE username_normalized = ? LIMIT 1", [normalizedUsername(cleanUsername)]);
    if (duplicates.length) throw new Error("账号名已存在");
    await connection.query(`INSERT INTO auth_users
      (id, username, username_normalized, password_hash, password_salt, role, last_login_at)
      VALUES (?, ?, ?, ?, ?, 'user', CURRENT_TIMESTAMP(3))`, [id, cleanUsername, normalizedUsername(cleanUsername), hash, salt]);
    await connection.query("UPDATE auth_registration_codes SET used_count = used_count + 1 WHERE code = ?", [code]);
    await connection.query("INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)", [hashSessionToken(token), id, mysqlDate(expiresAt)]);
  });
  try {
    const players = await playerUserIds();
    if (players.length === 1) {
      const defaultState = await loadStateFromMysql("default");
      await writeState(defaultState ? structuredClone(defaultState) : createDefaultState(), id);
    } else await readState(id);
  } catch (error) {
    await mysqlPool.query("DELETE FROM auth_users WHERE id = ?", [id]);
    throw error;
  }
  const now = new Date().toISOString();
  return { user: { id, username: cleanUsername, saveId: id, createdAt: now, lastLoginAt: now, role: "user", isAdmin: false }, session: { token, expiresAt: expiresAt.toISOString(), maxAge: sessionMaxAgeSeconds } };
}

export async function loginUser({ username, password }) {
  await bootstrapMysqlStore();
  const cleanUsername = normalizeUsername(username);
  assertUsername(cleanUsername);
  assertPassword(password);
  const [rows] = await mysqlPool.query("SELECT * FROM auth_users WHERE username_normalized = ? LIMIT 1", [normalizedUsername(cleanUsername)]);
  const row = rows[0];
  if (!row || !verifyPassword(password, row.password_salt, row.password_hash)) throw new Error("账号或密码错误");
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionMaxAgeSeconds * 1000);
  await withMysqlTransaction(async (connection) => {
    await connection.query("UPDATE auth_users SET last_login_at = CURRENT_TIMESTAMP(3) WHERE id = ?", [row.id]);
    await connection.query("INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)", [hashSessionToken(token), row.id, mysqlDate(expiresAt)]);
  });
  await readState(row.role === "admin" ? await managedUserId() : row.id);
  return { user: { ...publicUser({ ...row, last_login_at: mysqlDate() }) }, session: { token, expiresAt: expiresAt.toISOString(), maxAge: sessionMaxAgeSeconds } };
}

export async function getAdminManagedSaveId() {
  await bootstrapMysqlStore();
  return managedUserId();
}

export async function logoutSession(token) {
  await bootstrapMysqlStore();
  const text = String(token || "").trim();
  if (!text) return;
  await mysqlPool.query("DELETE FROM auth_sessions WHERE token_hash = ?", [hashSessionToken(text)]);
}

export async function readState(id = "default", options = {}) {
  await bootstrapMysqlStore();
  const cached = stateCache.get(id);
  if (cached) {
    if (stateValidationCache.get(id) === dateKey()) return cached;
    const changed = ensureStateShape(cached);
    const settled = settleIfNeeded(cached, options);
    if (changed || settled) await writeState(cached, id);
    else stateValidationCache.set(id, dateKey());
    return cached;
  }
  let state = await loadStateFromMysql(id);
  if (!state) {
    state = createDefaultState();
    await writeState(state, id);
    return state;
  }
  stateCache.set(id, state);
  const changed = ensureStateShape(state);
  const settled = settleIfNeeded(state, options);
  if (changed || settled) await writeState(state, id);
  else stateValidationCache.set(id, dateKey());
  return state;
}

export async function settleAllStates() {
  await bootstrapMysqlStore();
  const ids = await ensureActiveSaveIds();
  let settledSaves = 0;
  const failures = [];
  for (const id of ids) {
    try {
      const state = await readState(id);
      const beforeDay = state.day;
      const beforeDate = state.lastSettlementDate;
      do {
        stateValidationCache.delete(id);
        await readState(id, { maxDays: 1 });
        stateValidationCache.delete(id);
        if (state.lastSettlementDate < dateKey()) await new Promise((resolve) => setImmediate(resolve));
      } while (state.lastSettlementDate < dateKey());
      if (state.day !== beforeDay || state.lastSettlementDate !== beforeDate) settledSaves += 1;
    } catch (error) {
      failures.push({ id, error: error.message || String(error) });
    }
  }
  return { totalSaves: ids.length, settledSaves, failures };
}

export async function writeState(state, id = "default", options = {}) {
  await bootstrapMysqlStore();
  return withSaveLock(id, () => writeStateInternal(state, id, options));
}

export async function readBattleReplay(replayId, id = "default") {
  const replay = await readReplayFromMysql(id, replayId);
  if (!replay) throw new Error("未找到该场切磋回放");
  return replay;
}

export async function mutateState(mutator, id = "default", options = {}) {
  return withSaveLock(id, async () => {
    let state = stateCache.get(id) || await loadStateFromMysql(id);
    if (!state) state = createDefaultState();
    stateCache.set(id, state);
    ensureStateShape(state);
    settleIfNeeded(state);
    const result = mutator(state);
    await writeStateInternal(state, id, options.storageOptions);
    if (options.resultOnly) return { result };
    const nextState = getPublicState(state, options.publicOptions);
    return result === undefined ? nextState : { state: nextState, result };
  });
}

export async function resetState(id = "default", options = {}) {
  return withSaveLock(id, async () => {
    const previousState = stateCache.get(id) || await loadStateFromMysql(id);
    const state = preserveProfilesForReset(clearProgressHistory(createDefaultState()), previousState);
    await withMysqlTransaction(async (connection) => {
      await connection.query("DELETE FROM game_saves WHERE save_id = ?", [id]);
      await saveStateWithConnection(connection, state, id);
    });
    stateCache.set(id, state);
    stateValidationCache.set(id, dateKey());
    publicStateCache.delete(id);
    return getPublicState(state, options.publicOptions);
  });
}

export async function publicState(id = "default", options = {}) {
  const scope = ["home", "lite"].includes(options.scope) ? options.scope : "full";
  const cached = publicStateCache.get(id);
  if (cached?.date === dateKey() && cached?.[scope]) return cached[scope];
  const state = await readState(id);
  const nextState = getPublicState(state, options);
  publicStateCache.set(id, { ...(cached?.date === dateKey() ? cached : {}), date: dateKey(), [scope]: nextState });
  return nextState;
}
