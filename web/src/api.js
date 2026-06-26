const fallbackApiBase = import.meta.env.VITE_API_FALLBACK || "http://127.0.0.1:8877";
let activeApiBase = "";
let apiBasePromise;

async function request(path, options = {}) {
  const base = await resolveApiBase();
  const response = await fetchJson(`${base}${path}`, options);
  if (response.ok) {
    activeApiBase = base;
    return response.data;
  }

  if (fallbackApiBase && shouldTryFallback(response)) {
    const fallback = await fetchJson(`${fallbackApiBase}${path}`, options);
    if (fallback.ok) {
      activeApiBase = fallbackApiBase;
      return fallback.data;
    }
    throw new Error(fallback.data?.error || response.data?.error || "请求失败");
  }

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

async function resolveApiBase() {
  if (activeApiBase) return activeApiBase;
  if (!apiBasePromise) {
    apiBasePromise = probeApiBase();
  }
  activeApiBase = await apiBasePromise;
  return activeApiBase;
}

async function probeApiBase() {
  if (fallbackApiBase) {
    const fallback = await fetchJson(`${fallbackApiBase}/api/state`);
    if (fallback.ok) return fallbackApiBase;
  }
  return "";
}

function shouldTryFallback(response) {
  return response.status === 0 || response.status === 404;
}

export function getState() {
  return request("/api/state");
}

export function postAction(path, body = {}) {
  return request(path, { method: "POST", body });
}
