import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import {
  addTask,
  attemptBreakthrough,
  buyItem,
  dailySettlement,
  duel,
  rest,
  runDungeon,
  sectMission,
  sectWar,
  useItem
} from "./gameLogic.mjs";
import { mutateState, publicState, resetState } from "./store.mjs";

const port = Number(process.env.PORT || 8787);
const rootDir = fileURLToPath(new URL("../", import.meta.url));
const distDir = join(rootDir, "dist");

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body)
  });
  res.end(body);
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

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/state") {
    sendJson(res, 200, await publicState());
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/reset") {
    sendJson(res, 200, await resetState());
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  const body = await readJson(req);
  const routes = {
    "/api/tasks": (state) => addTask(state, body),
    "/api/breakthrough": (state) => attemptBreakthrough(state),
    "/api/rest": (state) => rest(state),
    "/api/day/advance": (state) => dailySettlement(state, { manual: true }),
    "/api/dungeons/run": (state) => runDungeon(state, body.id),
    "/api/sect/mission": (state) => sectMission(state),
    "/api/sect/war": (state) => sectWar(state),
    "/api/duel": (state) => duel(state, body.index),
    "/api/items/buy": (state) => buyItem(state, body.kind),
    "/api/items/use": (state) => useItem(state, body.kind)
  };

  const mutator = routes[url.pathname];
  if (!mutator) {
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  sendJson(res, 200, await mutateState(mutator));
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
