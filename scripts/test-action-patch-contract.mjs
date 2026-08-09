import assert from "node:assert/strict";
import { ACTION_PATCH_VERSION as SERVER_VERSION, stateActionResponse } from "../server/actionResponseContract.mjs";
import { ACTION_PATCH_VERSION as CLIENT_VERSION, mergeActionPatch } from "../web/src/actionPatch.js";

assert.equal(SERVER_VERSION, 2);
assert.equal(CLIENT_VERSION, SERVER_VERSION);

const envelope = stateActionResponse({
  kind: "action.test",
  stateRevision: 8,
  result: { ok: true },
  publicState: {
    __scope: "lite",
    stateRevision: 8,
    player: { id: "player", xp: 12 },
    derived: { playerPower: 423, xpNeed: 120 },
    home: { playerPower: 423 },
    log: [{ id: "new", text: "done" }]
  }
});
assert.equal(envelope.patchVersion, 2);
assert.equal(envelope.patch.stateRevision, undefined);
assert.equal(envelope.patch.__scope, undefined);

const current = { player: { id: "player", name: "李昕纾", xp: 10 }, derived: { xpNeed: 100 }, home: { playerRank: 200 }, log: [{ id: "old" }], stateRevision: 7 };
const merged = mergeActionPatch(current, envelope, 7);
assert.equal(merged.applied, true);
assert.equal(merged.state.player.name, "李昕纾");
assert.equal(merged.state.player.xp, 12);
assert.equal(merged.state.derived.xpNeed, 120);
assert.equal(merged.state.derived.playerPower, 423);
assert.equal(merged.state.home.playerRank, 200);
assert.equal(merged.state.home.playerPower, 423);
assert.deepEqual(merged.state.log.map((item) => item.id), ["new", "old"]);

assert.equal(mergeActionPatch(merged.state, { ...envelope, stateRevision: 6 }, merged.highestRevision).reason, "stale-revision");
assert.equal(mergeActionPatch(merged.state, { ...envelope, patchVersion: 99 }, merged.highestRevision).reason, "future-version");
assert.equal(mergeActionPatch(current, { ...envelope, patchVersion: undefined }, 7).applied, true);

const replacement = mergeActionPatch(current, stateActionResponse({ kind: "action.reset", stateRevision: 9, publicState: { player: { id: "player", xp: 0 }, derived: {}, home: {} }, replace: true }), 8);
assert.equal(replacement.replace, true);
assert.equal(replacement.state.player.xp, 0);
assert.equal(replacement.state.stateRevision, 9);

console.log(JSON.stringify({ patchVersion: SERVER_VERSION, envelope: true, merge: true, staleGuard: true, legacyCompatibility: true, replace: true }));
