import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import {
  addTask,
  advanceDaoTrial,
  attemptBreakthrough,
  abandonDaoTrial,
  buyItem,
  changePlayerPortrait,
  createTaskDefinition,
  dailySettlement,
  deleteTaskCompletion,
  deleteTaskDefinition,
  getDuelReplay,
  getDuelReplayId,
  getDuelDayPage,
  getDaoTrialHistoryPage,
  getCultivatorPortrait,
  getPublicCultivatorDetail,
  getPublicReplay,
  assertReplayDayAllowed,
  replayDayFromId,
  rest,
  resolveEncounter,
  runDailyDuels,
  runDungeon,
  sectMission,
  sectWar,
  sellItem,
  startDaoTrial,
  toggleTaskDefinition,
  updateCultivatorProfile,
  updateEncounterFocus,
  updateGameSettings,
  updateTaskDefinition,
  updatePlayerSectPlan,
  updateSectProfile,
  upgradePlayerSkill,
  useItem
} from "./gameLogic.mjs";
import {
  clearSessionCookie,
  getAuthSession,
  loginUser,
  logoutSession,
  mutateState,
  publicState,
  readBattleReplay,
  readState,
  registerUser,
  resetState,
  sessionCookie
} from "./store.mjs";

const port = Number(process.env.PORT || 8787);
const rootDir = fileURLToPath(new URL("../", import.meta.url));
const distDir = join(rootDir, "dist");
const liteActionRoutes = new Set([
  "/api/tasks",
  "/api/tasks/delete",
  "/api/encounters/choose",
  "/api/encounters/focus",
  "/api/breakthrough",
  "/api/task-definitions",
  "/api/task-definitions/update",
  "/api/task-definitions/delete",
  "/api/task-definitions/toggle",
  "/api/player/portrait",
  "/api/admin/settings",
  "/api/skills/upgrade",
  "/api/rest",
  "/api/day/advance",
  "/api/sect/mission",
  "/api/sect/plan",
  "/api/duels/day",
  "/api/items/buy",
  "/api/items/use",
  "/api/items/sell"
]);

function sendJson(res, status, data, headers = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store, max-age=0",
    "pragma": "no-cache",
    "expires": "0",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
    "content-length": Buffer.byteLength(body),
    ...headers
  });
  res.end(body);
}

function sendImage(res, portrait) {
  if (!portrait) {
    sendJson(res, 404, { error: "头像不存在" });
    return;
  }
  if (portrait.url) {
    res.writeHead(302, {
      location: portrait.url,
      "cache-control": "public, max-age=31536000, immutable"
    });
    res.end();
    return;
  }
  res.writeHead(200, {
    "content-type": portrait.contentType || "image/webp",
    "cache-control": "private, max-age=31536000, immutable",
    "content-length": portrait.buffer.length
  });
  res.end(portrait.buffer);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("请求体过大"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) resolve({});
      else {
        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error("JSON 格式错误"));
        }
      }
    });
    req.on("error", reject);
  });
}

function parseCookies(header = "") {
  const cookies = {};
  for (const part of String(header || "").split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!key) continue;
    cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

function authTokenFromRequest(req) {
  return parseCookies(req.headers.cookie || "").csj_session || "";
}

async function handleAuthApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/auth/me") {
    const session = await getAuthSession(authTokenFromRequest(req));
    if (!session) {
      sendJson(res, 401, { user: null, error: "未登录" });
      return;
    }
    sendJson(res, 200, { user: session.user });
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  if (url.pathname === "/api/auth/register") {
    const result = await registerUser(await readJson(req));
    sendJson(res, 200, { user: result.user }, { "set-cookie": sessionCookie(result.session) });
    return;
  }

  if (url.pathname === "/api/auth/login") {
    const result = await loginUser(await readJson(req));
    sendJson(res, 200, { user: result.user }, { "set-cookie": sessionCookie(result.session) });
    return;
  }

  if (url.pathname === "/api/auth/logout") {
    await logoutSession(authTokenFromRequest(req));
    sendJson(res, 200, { ok: true }, { "set-cookie": clearSessionCookie() });
    return;
  }

  sendJson(res, 404, { error: "Not found" });
}

async function handleApi(req, res, url) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type"
    });
    res.end();
    return;
  }

  if (url.pathname.startsWith("/api/auth/")) {
    await handleAuthApi(req, res, url);
    return;
  }

  const session = await getAuthSession(authTokenFromRequest(req));
  if (!session) {
    sendJson(res, 401, { error: "请先登录" });
    return;
  }
  if (url.pathname.startsWith("/api/admin/") && !session.user.isAdmin) {
    sendJson(res, 403, { error: "仅管理员可访问后台" });
    return;
  }
  if (session.user.isAdmin && !url.pathname.startsWith("/api/admin/") && ![
    "/api/state",
    "/api/cultivators/detail",
    "/api/cultivators/portrait",
    "/api/day/advance",
    "/api/reset"
  ].includes(url.pathname)) {
    sendJson(res, 403, { error: "管理员账号仅可进行后台管理" });
    return;
  }
  const saveId = session.user.saveId;

  if (req.method === "GET" && url.pathname === "/api/state") {
    const requestedScope = url.searchParams.get("scope");
    const scope = ["home", "lite"].includes(requestedScope) ? requestedScope : "full";
    sendJson(res, 200, await publicState(saveId, { scope }));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/cultivators/detail") {
    const id = url.searchParams.get("id");
    if (!id) throw new Error("缺少人物 ID");
    const state = await readState(saveId);
    sendJson(res, 200, getPublicCultivatorDetail(state, id));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/dao-trial/history") {
    const state = await readState(saveId);
    sendJson(res, 200, getDaoTrialHistoryPage(state, {
      offset: url.searchParams.get("offset"),
      limit: url.searchParams.get("limit"),
      routeId: url.searchParams.get("routeId"),
      cycle: url.searchParams.get("cycle")
    }));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/cultivators/portrait") {
    const id = url.searchParams.get("id");
    if (!id) throw new Error("缺少人物 ID");
    const state = await readState(saveId);
    sendImage(res, getCultivatorPortrait(state, id));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/duels/replay") {
    const replayId = url.searchParams.get("id");
    if (replayId) {
      const state = await readState(saveId);
      const replay = await readBattleReplay(replayId, saveId);
      assertReplayDayAllowed(state, replay.day || replayDayFromId(replayId));
      sendJson(res, 200, { replay: getPublicReplay(replay, state) });
      return;
    }
    const day = url.searchParams.get("day");
    const match = url.searchParams.get("match");
    const state = await readState(saveId);
    const existingReplayId = getDuelReplayId(state, day, match);
    if (existingReplayId) {
      const replay = await readBattleReplay(existingReplayId, saveId);
      assertReplayDayAllowed(state, replay.day || Number(day));
      sendJson(res, 200, { replay: getPublicReplay(replay, state) });
      return;
    }
    sendJson(res, 200, { replay: getDuelReplay(state, day, match) });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/duels/day") {
    const state = await readState(saveId);
    sendJson(res, 200, getDuelDayPage(state, {
      day: url.searchParams.get("day"),
      page: url.searchParams.get("page"),
      pageSize: url.searchParams.get("pageSize"),
      search: url.searchParams.get("search")
    }));
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/battles/replay") {
    const replayId = url.searchParams.get("id");
    if (!replayId) throw new Error("缺少战斗回放 ID");
    const state = await readState(saveId);
    const replay = await readBattleReplay(replayId, saveId);
    assertReplayDayAllowed(state, replay.day || replayDayFromId(replayId));
    sendJson(res, 200, { replay: getPublicReplay(replay, state) });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/reset") {
    const body = await readJson(req);
    const scope = body.scope === "lite" ? "lite" : "full";
    sendJson(res, 200, await resetState(saveId, { publicOptions: { scope } }));
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const body = await readJson(req);
  const routes = {
    "/api/tasks": (state) => addTask(state, body),
    "/api/tasks/delete": (state) => deleteTaskCompletion(state, body),
    "/api/encounters/choose": (state) => resolveEncounter(state, body),
    "/api/encounters/focus": (state) => updateEncounterFocus(state, body),
    "/api/breakthrough": (state) => attemptBreakthrough(state),
    "/api/task-definitions": (state) => createTaskDefinition(state, body),
    "/api/task-definitions/update": (state) => updateTaskDefinition(state, body),
    "/api/task-definitions/delete": (state) => deleteTaskDefinition(state, body),
    "/api/task-definitions/toggle": (state) => toggleTaskDefinition(state, body),
    "/api/player/portrait": (state) => changePlayerPortrait(state, body),
    "/api/skills/upgrade": (state) => upgradePlayerSkill(state),
    "/api/rest": (state) => rest(state),
    "/api/day/advance": (state) => dailySettlement(state, { manual: true }),
    "/api/dungeons/run": (state) => runDungeon(state, body.id),
    "/api/dao-trial/start": (state) => startDaoTrial(state, body),
    "/api/dao-trial/advance": (state) => advanceDaoTrial(state, body),
    "/api/dao-trial/abandon": (state) => abandonDaoTrial(state),
    "/api/sect/mission": (state) => sectMission(state),
    "/api/sect/war": (state) => sectWar(state),
    "/api/sect/plan": (state) => updatePlayerSectPlan(state, body),
    "/api/duels/day": (state) => runDailyDuels(state),
    "/api/items/buy": (state) => buyItem(state, body.kind),
    "/api/items/use": (state) => useItem(state, body.kind),
    "/api/items/sell": (state) => sellItem(state, body.kind),
    "/api/admin/cultivator": (state) => updateCultivatorProfile(state, body),
    "/api/admin/sect": (state) => updateSectProfile(state, body),
    "/api/admin/settings": (state) => updateGameSettings(state, body)
  };

  const mutator = routes[url.pathname];
  if (!mutator) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  const requestedScope = body.scope === "lite" || body.scope === "full" ? body.scope : "";
  const scope = requestedScope || (liteActionRoutes.has(url.pathname) ? "lite" : "full");
  const storageOptions = ["/api/day/advance", "/api/duels/day"].includes(url.pathname)
    ? { skipReplayExtraction: true, deferPersist: true }
    : undefined;
  const resultOnly = url.pathname === "/api/duels/day";
  sendJson(res, 200, await mutateState(mutator, saveId, { publicOptions: { scope }, storageOptions, resultOnly }));
}

async function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  const filePath = normalize(join(distDir, pathname));

  if (!filePath.startsWith(distDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const data = await readFile(filePath);
    const contentType = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".svg": "image/svg+xml"
    }[extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "content-type": contentType });
    res.end(data);
  } catch {
    try {
      const data = await readFile(join(distDir, "index.html"));
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Build the frontend with npm run build, or use npm run dev.");
    }
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  try {
    if (url.pathname.startsWith("/api/")) await handleApi(req, res, url);
    else await serveStatic(req, res, url);
  } catch (error) {
    sendJson(res, 400, { error: error.message || "请求失败" });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`API server: http://127.0.0.1:${port}`);
});
