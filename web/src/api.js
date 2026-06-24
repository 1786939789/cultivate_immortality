async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "请求失败");
  return data;
}

export function getState() {
  return request("/api/state");
}

export function postAction(path, body = {}) {
  return request(path, { method: "POST", body });
}
