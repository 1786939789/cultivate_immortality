async function request(path, options = {}) {
  const response = await fetchJson(path, options);
  if (response.ok) return response.data;
  throw new Error(response.data?.error || "请求失败");
}

async function fetchJson(path, options = {}) {
  try {
    const response = await fetch(path, {
      headers: { "content-type": "application/json" },
      ...options,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
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

export function getState(scope = "full") {
  const suffix = scope === "lite" ? "?scope=lite" : "";
  return request(`/api/state${suffix}`);
}

export function postAction(path, body = {}, options = {}) {
  return request(path, { method: "POST", body: { ...body, ...options } });
}
