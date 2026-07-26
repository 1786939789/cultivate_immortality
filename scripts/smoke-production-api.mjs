const baseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:8787";
const username = process.env.ADMIN_USERNAME;
const password = process.env.ADMIN_PASSWORD;

if (!username || !password) throw new Error("ADMIN_USERNAME and ADMIN_PASSWORD are required");

const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ username, password })
});
if (!loginResponse.ok) throw new Error(`Login failed: ${loginResponse.status}`);
const login = await loginResponse.json();
const cookie = loginResponse.headers.get("set-cookie")?.split(";")[0] || "";
if (!cookie) throw new Error("Login did not return a session cookie");

const stateResponse = await fetch(`${baseUrl}/api/state?scope=home`, { headers: { cookie } });
if (!stateResponse.ok) throw new Error(`State request failed: ${stateResponse.status}`);
const state = await stateResponse.json();

let replayId = login.user?.role === "admin" ? "" : process.env.SMOKE_REPLAY_ID || "";
if (!replayId && login.user?.role !== "admin") {
  const [rows] = await mysqlPool.query("SELECT replay_id FROM battle_replays ORDER BY updated_at DESC LIMIT 1");
  replayId = rows[0]?.replay_id || "";
}
let replay = null;
if (replayId) {
  const replayResponse = await fetch(`${baseUrl}/api/battles/replay?id=${encodeURIComponent(replayId)}`, { headers: { cookie } });
  const replayBody = await replayResponse.json();
  if (!replayResponse.ok) throw new Error(`Replay request failed: ${replayResponse.status} ${replayBody.error || ""}`);
  replay = replayBody.replay;
}

const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
  method: "POST",
  headers: { "content-type": "application/json", cookie },
  body: "{}"
});
if (!logoutResponse.ok) throw new Error(`Logout failed: ${logoutResponse.status}`);

console.log(JSON.stringify({
  loginUser: login.user?.username || "",
  role: login.user?.role || "",
  stateDay: state.day,
  player: state.player?.name || "",
  replayId: replay?.replayId || "",
  replayEvents: replay?.events?.length || 0,
  logout: true
}));

await mysqlPool.end();
import { mysqlPool } from "../server/mysqlDb.mjs";
