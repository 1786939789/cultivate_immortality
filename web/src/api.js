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

export function getState() {
  return request("/api/state");
}

export function postAction(path, body = {}) {
  return request(path, { method: "POST", body });
}
