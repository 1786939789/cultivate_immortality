import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mysqlPool } from "../server/mysqlDb.mjs";
import { loadStateFromMysql, saveStateToMysql } from "../server/mysqlStateRepository.mjs";

const baseUrl = process.env.SMOKE_BASE_URL || "http://127.0.0.1:8787";
const [[source]] = await mysqlPool.query(`
  SELECT s.save_id FROM game_saves s
  JOIN auth_users u ON u.id = s.save_id
  WHERE u.role <> 'admin'
  ORDER BY s.updated_at DESC LIMIT 1
`);
if (!source) throw new Error("No player save is available for the smoke test");

const testId = `smoke-player-${randomUUID()}`;
const token = randomBytes(32).toString("base64url");
const tokenHash = createHash("sha256").update(token).digest("base64url");
const cookie = `csj_session=${token}`;

try {
  const original = await loadStateFromMysql(source.save_id);
  await mysqlPool.query(`
    INSERT INTO auth_users
      (id, username, username_normalized, password_hash, password_salt, role)
    VALUES (?, ?, ?, ?, ?, 'user')
  `, [testId, testId, testId, "smoke", "smoke"]);
  await saveStateToMysql(structuredClone(original), testId);
  await mysqlPool.query(`
    INSERT INTO auth_sessions (token_hash, user_id, expires_at)
    VALUES (?, ?, DATE_ADD(CURRENT_TIMESTAMP(3), INTERVAL 10 MINUTE))
  `, [tokenHash, testId]);

  const [replays] = await mysqlPool.query(`
    SELECT replay_id, replay_kind, day_no, match_id, replay_json, content_hash, created_at, updated_at
    FROM battle_replays WHERE save_id = ? ORDER BY updated_at DESC LIMIT 1
  `, [source.save_id]);
  if (replays.length) {
    const replay = replays[0];
    await mysqlPool.query(`
      INSERT INTO battle_replays
        (save_id, replay_id, replay_kind, day_no, match_id, replay_json, content_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [testId, replay.replay_id, replay.replay_kind, replay.day_no, replay.match_id, replay.replay_json, replay.content_hash, replay.created_at, replay.updated_at]);
  }

  const stateResponse = await fetch(`${baseUrl}/api/state?scope=home`, { headers: { cookie } });
  const state = await stateResponse.json();
  if (!stateResponse.ok) throw new Error(`State request failed: ${stateResponse.status} ${state.error || ""}`);

  const detailId = state.player?.id || "player";
  const requestDetail = async (id, scope) => {
    const startedAt = performance.now();
    const suffix = scope === "full" ? "" : `&scope=${scope}`;
    const response = await fetch(`${baseUrl}/api/cultivators/detail?id=${encodeURIComponent(id)}${suffix}`, { headers: { cookie } });
    const text = await response.text();
    const body = JSON.parse(text);
    if (!response.ok) throw new Error(`${scope} detail request failed: ${response.status} ${body.error || ""}`);
    return { body, bytes: Buffer.byteLength(text), durationMs: Number((performance.now() - startedAt).toFixed(1)) };
  };
  const summaryDetail = await requestDetail(detailId, "summary");
  const historyDetail = await requestDetail(detailId, "history");
  const fullDetail = await requestDetail(detailId, "full");
  if (summaryDetail.body.__scope !== "summary") throw new Error("Summary detail scope marker is missing");
  if (historyDetail.body.__scope !== "history") throw new Error("History detail scope marker is missing");
  if ("dailyRecords" in summaryDetail.body.person || "history" in summaryDetail.body.spiritPearls) {
    throw new Error("Summary detail unexpectedly includes historical records");
  }
  if (!Array.isArray(historyDetail.body.person?.dailyRecords) || !Array.isArray(historyDetail.body.spiritPearls?.history)) {
    throw new Error("History detail is missing historical records");
  }
  if ("equippedItems" in historyDetail.body || "pearls" in historyDetail.body.spiritPearls) {
    throw new Error("History detail unexpectedly duplicates summary assets");
  }
  if (summaryDetail.body.person.name !== fullDetail.body.person.name
    || summaryDetail.body.equippedItems.length !== fullDetail.body.equippedItems.length
    || summaryDetail.body.spiritPearls.pearls.length !== fullDetail.body.spiritPearls.pearls.length
    || historyDetail.body.person.dailyRecords.length !== fullDetail.body.person.dailyRecords.length
    || historyDetail.body.person.duelHistory.length !== fullDetail.body.person.duelHistory.length
    || historyDetail.body.person.dungeonHistory.length !== fullDetail.body.person.dungeonHistory.length
    || historyDetail.body.spiritPearls.history.length !== fullDetail.body.spiritPearls.history.length) {
    throw new Error("Split detail responses do not match the full detail contract");
  }

  const npcId = original.npcs?.[0]?.id;
  if (!npcId) throw new Error("No NPC is available for the split detail smoke test");
  const npcSummaryDetail = await requestDetail(npcId, "summary");
  const npcHistoryDetail = await requestDetail(npcId, "history");
  const npcFullDetail = await requestDetail(npcId, "full");
  if (npcSummaryDetail.body.__scope !== "summary"
    || npcHistoryDetail.body.__scope !== "history"
    || "dailyRecords" in npcSummaryDetail.body.person
    || "history" in npcSummaryDetail.body.spiritPearls
    || "equippedItems" in npcHistoryDetail.body
    || "pearls" in npcHistoryDetail.body.spiritPearls
    || npcSummaryDetail.body.spiritPearls.pearls.length !== npcFullDetail.body.spiritPearls.pearls.length
    || npcHistoryDetail.body.person.dailyRecords.length !== npcFullDetail.body.person.dailyRecords.length
    || npcHistoryDetail.body.person.duelHistory.length !== npcFullDetail.body.person.duelHistory.length
    || npcHistoryDetail.body.person.dungeonHistory.length !== npcFullDetail.body.person.dungeonHistory.length
    || npcHistoryDetail.body.spiritPearls.history.length !== npcFullDetail.body.spiritPearls.history.length) {
    throw new Error("NPC split detail responses do not match the full detail contract");
  }

  let replay = null;
  if (replays.length) {
    const replayResponse = await fetch(`${baseUrl}/api/battles/replay?id=${encodeURIComponent(replays[0].replay_id)}`, { headers: { cookie } });
    const body = await replayResponse.json();
    if (!replayResponse.ok) throw new Error(`Replay request failed: ${replayResponse.status} ${body.error || ""}`);
    replay = body.replay;
  }

  const restResponse = await fetch(`${baseUrl}/api/rest`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ scope: "lite" })
  });
  const rest = await restResponse.json();
  if (!restResponse.ok) throw new Error(`Rest action failed: ${restResponse.status} ${rest.error || ""}`);

  const restored = await loadStateFromMysql(testId);
  console.log(JSON.stringify({
    stateDay: state.day,
    player: state.player?.name || "",
    replayId: replay?.replayId || "",
    replayEvents: replay?.events?.length || 0,
    restPersisted: Boolean(restored),
    cultivators: restored ? 1 + (restored.npcs?.length || 0) : 0,
    detail: {
      summary: { bytes: summaryDetail.bytes, durationMs: summaryDetail.durationMs },
      history: { bytes: historyDetail.bytes, durationMs: historyDetail.durationMs },
      full: { bytes: fullDetail.bytes, durationMs: fullDetail.durationMs }
    },
    npcDetail: {
      summary: { bytes: npcSummaryDetail.bytes, durationMs: npcSummaryDetail.durationMs },
      history: { bytes: npcHistoryDetail.bytes, durationMs: npcHistoryDetail.durationMs },
      full: { bytes: npcFullDetail.bytes, durationMs: npcFullDetail.durationMs }
    }
  }));
} finally {
  await mysqlPool.query("DELETE FROM auth_users WHERE id = ?", [testId]);
  await mysqlPool.query("DELETE FROM game_saves WHERE save_id = ?", [testId]);
  await mysqlPool.end();
}
