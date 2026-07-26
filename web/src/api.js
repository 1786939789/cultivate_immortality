async function request(path, options = {}) {
  const response = await fetchJson(path, options);
  if (response.ok) return response.data;
  throw new Error(response.data?.error || "请求失败");
}

async function fetchJson(path, options = {}) {
  try {
    const response = await fetch(path, {
      headers: { "content-type": "application/json" },
      cache: "no-store",
      credentials: "include",
      ...options,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    return { ok: false, status: 0, data: { error: error.message } };
  }
}

const stateCacheKey = "cultivate_immortality_state_v4";

export function getCachedState() {
  try {
    const raw = sessionStorage.getItem(stateCacheKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCachedState(state) {
  if (!state) return;
  try {
    sessionStorage.setItem(stateCacheKey, JSON.stringify(state));
  } catch {
    // Storage quotas should not block gameplay.
  }
}

export function clearCachedState() {
  try {
    sessionStorage.removeItem(stateCacheKey);
  } catch {
    // Ignore unavailable storage.
  }
}

export function getState(scope = "full", signal) {
  const params = new URLSearchParams();
  if (scope !== "full") params.set("scope", scope);
  params.set("_", String(Date.now()));
  const suffix = `?${params.toString()}`;
  return request(`/api/state${suffix}`, { signal });
}

export function getCurrentUser() {
  return request(`/api/auth/me?_=${Date.now()}`);
}

export function login(username, password) {
  return request("/api/auth/login", { method: "POST", body: { username, password } });
}

export function register(username, password, registrationCode) {
  return request("/api/auth/register", { method: "POST", body: { username, password, registrationCode } });
}

export function logout() {
  return request("/api/auth/logout", { method: "POST", body: {} });
}

export function getAdminAccounts() {
  return request(`/api/admin/accounts?_=${Date.now()}`);
}

export function setAdminActiveAccount(saveId, active = true, scope = "full") {
  return request("/api/admin/accounts/active", { method: "POST", body: { saveId, active, scope } });
}

export function setAdminManagedAccount(saveId, scope = "full") {
  return request("/api/admin/accounts/managed", { method: "POST", body: { saveId, scope } });
}

export function getCultivatorDetail(id) {
  const params = new URLSearchParams({ id, _: String(Date.now()) });
  return request(`/api/cultivators/detail?${params.toString()}`);
}

export function getDuelReplay(day, matchId) {
  const params = new URLSearchParams({ day: String(day), match: matchId });
  return request(`/api/duels/replay?${params.toString()}`);
}

export function getDuelDayPage(options = {}) {
  const params = new URLSearchParams({ _: String(Date.now()) });
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  return request(`/api/duels/day?${params.toString()}`);
}

export function getBattleReplay(replayId) {
  const params = new URLSearchParams({ id: replayId });
  return request(`/api/battles/replay?${params.toString()}`);
}

export function getDaoTrialHistory(options = {}) {
  const params = new URLSearchParams({ _: String(Date.now()) });
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  return request(`/api/dao-trial/history?${params.toString()}`);
}

export function postAction(path, body = {}, options = {}) {
  return request(path, { method: "POST", body: { ...body, ...options } });
}
