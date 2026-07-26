import { createHash, randomBytes, randomUUID } from "node:crypto";
import { clearProgressHistory, createDefaultState, dateKey, ensureStateShape, getPublicState, minReplayDayFor, preserveProfilesForReset, settleIfNeeded } from "./gameLogic.mjs";
import { hashAuthAttemptKey, hashPassword, hashRegistrationCode, verifyPassword } from "./authSecurity.mjs";
import { ensureMysqlSchema, mysqlPool, parseMysqlJson, withMysqlTransaction } from "./mysqlDb.mjs";
import { loadStateFromMysql, pruneBattleReplays, readReplayFromMysql, saveStateWithConnection, upsertBattleReplays } from "./mysqlStateRepository.mjs";

const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;
const activeSaveSettingKey = "active_save_ids";
const legacyActiveSaveSettingKey = "active_save_id";
const managedSaveSettingKey = "managed_save_id";

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

function publicStateWithRevision(state, options = {}) {
  return { ...getPublicState(state, options), stateRevision: Number(state.__stateRevision || 0) };
}

async function bootstrapMysqlStore() {
  if (!bootstrapPromise) bootstrapPromise = (async () => {
    await ensureMysqlSchema();
    await mysqlPool.query(`
      UPDATE auth_registration_codes
      SET code_hash = SHA2(code, 256), code = CONCAT('legacy-', LEFT(SHA2(code, 256), 56))
      WHERE code_hash IS NULL
    `);
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
  if (!rows.length) return null;
  const value = rows[0].setting_value;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") && !trimmed.startsWith("{") && !trimmed.startsWith('"')) return value;
  return parseMysqlJson(value, value);
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
  const players = await playerUserIds();
  const current = String(await readSetting(managedSaveSettingKey) || "");
  if (players.includes(current)) return current;
  const fallback = players[0] || "default";
  if (fallback !== "default") {
    await withMysqlTransaction((connection) => writeSetting(connection, managedSaveSettingKey, fallback));
  }
  return fallback;
}

async function writeStateInternal(state, id, options = {}) {
  const pending = Array.isArray(state.__pendingBattleReplays) ? [...state.__pendingBattleReplays] : [];
  const persistedState = structuredClone(state);
  delete persistedState.__pendingBattleReplays;
  const revision = await withMysqlTransaction(async (connection) => {
    const nextRevision = await saveStateWithConnection(connection, persistedState, id, options);
    await upsertBattleReplays(connection, id, pending);
    await pruneBattleReplays(connection, id, minReplayDayFor(persistedState.day || 1));
    if (typeof options.beforeCommit === "function") await options.beforeCommit(connection);
    return nextRevision;
  });
  persistedState.__stateRevision = revision;
  stateCache.set(id, persistedState);
  stateValidationCache.set(id, dateKey());
  publicStateCache.delete(id);
  return persistedState;
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
    managedSaveId: await managedUserId(),
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

export async function setAdminManagedSaveId(saveId) {
  await bootstrapMysqlStore();
  const id = String(saveId || "").trim();
  const players = new Set(await playerUserIds());
  if (!players.has(id)) throw new Error("只能管理普通用户存档");
  await withMysqlTransaction((connection) => writeSetting(connection, managedSaveSettingKey, id));
  await readState(id);
  return getAdminAccounts();
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

function authBlockedMessage(blockedUntil) {
  const seconds = Math.max(1, Math.ceil((Date.parse(parseMysqlDate(blockedUntil)) - Date.now()) / 1000));
  return `尝试次数过多，请在 ${seconds} 秒后重试`;
}

function authRateLimitError(blockedUntil) {
  const error = new Error(authBlockedMessage(blockedUntil));
  error.statusCode = 429;
  return error;
}

async function authAttempt(action, context, username) {
  const key = hashAuthAttemptKey(action, String(context?.ip || "unknown"), normalizedUsername(username));
  const [rows] = await mysqlPool.query("SELECT failure_count, blocked_until FROM auth_attempts WHERE attempt_key = ?", [key]);
  const row = rows[0];
  if (row?.blocked_until && Date.parse(parseMysqlDate(row.blocked_until)) > Date.now()) throw authRateLimitError(row.blocked_until);
  return { key, failures: Number(row?.failure_count || 0) };
}

async function recordAuthFailure(attempt, action) {
  const failures = attempt.failures + 1;
  const delayMinutes = failures >= 12 ? 30 : failures >= 9 ? 15 : failures >= 7 ? 5 : failures >= 5 ? 1 : 0;
  const blockedUntil = delayMinutes ? mysqlDate(new Date(Date.now() + delayMinutes * 60_000)) : null;
  await mysqlPool.query(`
    INSERT INTO auth_attempts (attempt_key, action_name, failure_count, blocked_until)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE failure_count = VALUES(failure_count), blocked_until = VALUES(blocked_until), updated_at = CURRENT_TIMESTAMP(3)
  `, [attempt.key, action, failures, blockedUntil]);
}

async function clearAuthAttempt(attempt) {
  await mysqlPool.query("DELETE FROM auth_attempts WHERE attempt_key = ?", [attempt.key]);
}

export async function registerUser({ username, password, registrationCode }, context = {}) {
  await bootstrapMysqlStore();
  const cleanUsername = normalizeUsername(username);
  assertUsername(cleanUsername);
  assertPassword(password);
  const code = String(registrationCode || "").trim();
  if (!code) throw new Error("请输入注册码");
  const attempt = await authAttempt("register", context, cleanUsername);
  const id = `user-${randomUUID()}`;
  const { hash, salt } = await hashPassword(password);
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionMaxAgeSeconds * 1000);
  await withMysqlTransaction(async (connection) => {
    const [codes] = await connection.query("SELECT code, active, max_uses, used_count FROM auth_registration_codes WHERE code_hash = ? FOR UPDATE", [hashRegistrationCode(code)]);
    if (!codes.length) throw new Error("注册码无效");
    const registration = codes[0];
    if (!Number(registration.active)) throw new Error("注册码已停用");
    if (registration.max_uses !== null && Number(registration.used_count) >= Number(registration.max_uses)) throw new Error("注册码已用尽");
    const [duplicates] = await connection.query("SELECT 1 FROM auth_users WHERE username_normalized = ? LIMIT 1", [normalizedUsername(cleanUsername)]);
    if (duplicates.length) throw new Error("账号名已存在");
    await connection.query(`INSERT INTO auth_users
      (id, username, username_normalized, password_hash, password_salt, role, last_login_at)
      VALUES (?, ?, ?, ?, ?, 'user', CURRENT_TIMESTAMP(3))`, [id, cleanUsername, normalizedUsername(cleanUsername), hash, salt]);
    await connection.query("UPDATE auth_registration_codes SET used_count = used_count + 1 WHERE code = ?", [registration.code]);
    await connection.query("INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)", [hashSessionToken(token), id, mysqlDate(expiresAt)]);
  }).catch(async (error) => {
    await recordAuthFailure(attempt, "register");
    throw error;
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
  await clearAuthAttempt(attempt);
  return { user: { id, username: cleanUsername, saveId: id, createdAt: now, lastLoginAt: now, role: "user", isAdmin: false }, session: { token, expiresAt: expiresAt.toISOString(), maxAge: sessionMaxAgeSeconds } };
}

export async function loginUser({ username, password }, context = {}) {
  await bootstrapMysqlStore();
  const cleanUsername = normalizeUsername(username);
  assertUsername(cleanUsername);
  assertPassword(password);
  const attempt = await authAttempt("login", context, cleanUsername);
  const [rows] = await mysqlPool.query("SELECT * FROM auth_users WHERE username_normalized = ? LIMIT 1", [normalizedUsername(cleanUsername)]);
  const row = rows[0];
  if (!row || !await verifyPassword(password, row.password_salt, row.password_hash)) {
    await recordAuthFailure(attempt, "login");
    throw new Error("账号或密码错误");
  }
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionMaxAgeSeconds * 1000);
  await withMysqlTransaction(async (connection) => {
    await connection.query("UPDATE auth_users SET last_login_at = CURRENT_TIMESTAMP(3) WHERE id = ?", [row.id]);
    await connection.query("INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)", [hashSessionToken(token), row.id, mysqlDate(expiresAt)]);
  });
  await readState(row.role === "admin" ? await managedUserId() : row.id);
  await clearAuthAttempt(attempt);
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
    const draft = structuredClone(cached);
    const changed = ensureStateShape(draft);
    const settled = settleIfNeeded(draft, options);
    if (changed || settled) return await writeState(draft, id);
    else stateValidationCache.set(id, dateKey());
    return cached;
  }
  let state = await loadStateFromMysql(id);
  if (!state) {
    state = createDefaultState();
    await writeState(state, id);
    return state;
  }
  const draft = structuredClone(state);
  const changed = ensureStateShape(draft);
  const settled = settleIfNeeded(draft, options);
  if (changed || settled) return await writeState(draft, id);
  stateCache.set(id, state);
  stateValidationCache.set(id, dateKey());
  return state;
}

export async function settleAllStates() {
  await bootstrapMysqlStore();
  const ids = await ensureActiveSaveIds();
  let settledSaves = 0;
  const failures = [];
  for (const id of ids) {
    try {
      let state = await readState(id);
      const beforeDay = state.day;
      const beforeDate = state.lastSettlementDate;
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
    const source = stateCache.get(id) || await loadStateFromMysql(id) || createDefaultState();
    const draft = structuredClone(source);
    ensureStateShape(draft);
    settleIfNeeded(draft);
    const result = mutator(draft);
    let state;
    try {
      state = await writeStateInternal(draft, id, options.storageOptions);
    } catch (error) {
      publicStateCache.delete(id);
      throw error;
    }
    if (options.resultOnly) return { result };
    const nextState = publicStateWithRevision(state, options.publicOptions);
    return result === undefined ? nextState : { state: nextState, result };
  });
}

export async function testMutationRollback(id = "default") {
  const before = await loadStateFromMysql(id);
  const beforeRevision = Number(before?.__stateRevision || 0);
  const beforeDay = Number(before?.day || 0);
  let failed = false;
  try {
    await mutateState((state) => {
      state.day = beforeDay + 999;
    }, id, { storageOptions: { beforeCommit: () => { throw new Error("intentional rollback test"); } } });
  } catch (error) {
    failed = error.message === "intentional rollback test";
  }
  const after = await loadStateFromMysql(id);
  const cached = stateCache.get(id);
  return {
    failed,
    databaseUnchanged: Number(after?.day || 0) === beforeDay && Number(after?.__stateRevision || 0) === beforeRevision,
    cacheUnchanged: !cached || (Number(cached.day || 0) === beforeDay && Number(cached.__stateRevision || 0) === beforeRevision)
  };
}

export async function resetState(id = "default", options = {}) {
  return withSaveLock(id, async () => {
    const previousState = stateCache.get(id) || await loadStateFromMysql(id);
    const state = preserveProfilesForReset(clearProgressHistory(createDefaultState()), previousState);
    const revision = await withMysqlTransaction(async (connection) => {
      const [rows] = await connection.query("SELECT state_revision FROM game_saves WHERE save_id = ? FOR UPDATE", [id]);
      const previousRevision = Number(rows[0]?.state_revision || previousState?.__stateRevision || 0);
      await connection.query("DELETE FROM game_saves WHERE save_id = ?", [id]);
      await saveStateWithConnection(connection, state, id);
      await connection.query("UPDATE game_saves SET state_revision = ? WHERE save_id = ?", [previousRevision + 1, id]);
      return previousRevision + 1;
    });
    state.__stateRevision = revision;
    stateCache.set(id, state);
    stateValidationCache.set(id, dateKey());
    publicStateCache.delete(id);
    return publicStateWithRevision(state, options.publicOptions);
  });
}

export async function publicState(id = "default", options = {}) {
  const scope = ["home", "lite"].includes(options.scope) ? options.scope : "full";
  const cached = publicStateCache.get(id);
  if (cached?.date === dateKey() && cached?.[scope]) return cached[scope];
  const state = await readState(id);
  const nextState = publicStateWithRevision(state, options);
  publicStateCache.set(id, { ...(cached?.date === dateKey() ? cached : {}), date: dateKey(), [scope]: nextState });
  return nextState;
}
