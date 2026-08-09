import { performance } from "node:perf_hooks";
import { mysqlPool, withMysqlTransaction } from "../server/mysqlDb.mjs";
import { loadStateFromMysql, saveStateWithConnection } from "../server/mysqlStateRepository.mjs";
import { runPlayerActionIncremental } from "../server/playerActionCommand.mjs";
import { generateDailyEncounter } from "../server/gameLogic.mjs";
import { encounterDefinitionMap } from "../server/encounterData.mjs";
import { runDailyDuelBatch, runSettlementBatch } from "../server/mysqlStore.mjs";
import { cleanupFixture, createFixture } from "./mysql-test-fixture.mjs";

const fixture = await createFixture({ prefix: "verify-new-", cleanTransientRuns: true });
const saveId = fixture.saveId;
const report = { actions: {}, duelBatch: null, settlementBatch: null, passed: false };
try {
  const sourceState = await loadStateFromMysql(fixture.sourceSaveId);
  const npcId = sourceState.npcs[0]?.id;
  const [[npcBefore]] = await mysqlPool.query("SELECT content_hash,metrics_revision,updated_at FROM cultivators WHERE save_id=? AND cultivator_id=?", [saveId, npcId]);
  const actions = [
    ["portrait", { count: 5, variant: 2 }],
    ["encounterFocus", { npcId, focused: true }],
    ["daoStart", { routeId: "golden-pass" }]
  ];
  for (const [action, payload] of actions) {
    const started = performance.now();
    const response = await runPlayerActionIncremental(saveId, action, payload);
    report.actions[action] = { ms: Number((performance.now() - started).toFixed(2)), revision: response.stateRevision, kind: response.kind };
  }
  // Exercise a legal encounter choice in the isolated copy. If the source
  // save has no pending event, deterministically advance the encounter clock
  // until one is generated, without changing the source save.
  let encounterState = await loadStateFromMysql(saveId);
  encounterState.encounters ??= { pending: [], history: [], focusedNpcIds: [], nextGenerationDay: encounterState.day, lastGenerationDay: encounterState.day - 1 };
  encounterState.encounters.nextGenerationDay = encounterState.day;
  encounterState.encounters.lastGenerationDay = encounterState.day - 1;
  const generated = generateDailyEncounter(encounterState);
  if (generated) {
    await withMysqlTransaction((connection) => saveStateWithConnection(connection, encounterState, saveId));
    const choiceId = encounterDefinitionMap[generated.definitionId]?.choices?.[0]?.id || undefined;
    if (choiceId) {
      const encounterResponse = await runPlayerActionIncremental(saveId, "encounterChoose", { eventId: generated.id, choiceId });
      report.actions.encounterChoose = { revision: encounterResponse.stateRevision, resolved: true };
    }
  }
  const [[npcAfterActions]] = await mysqlPool.query("SELECT content_hash,metrics_revision FROM cultivators WHERE save_id=? AND cultivator_id=?", [saveId, npcId]);
  report.npcUnrelatedToPlayerActionsStable = npcBefore?.content_hash === npcAfterActions?.content_hash && Number(npcBefore?.metrics_revision || 0) === Number(npcAfterActions?.metrics_revision || 0);
  const afterActions = await loadStateFromMysql(saveId);
  report.daoRunPersisted = Boolean(afterActions.daoTrial?.activeRun);
  const duelStarted = performance.now();
  const duel = await runDailyDuelBatch(saveId);
  const duelRepeat = await runDailyDuelBatch(saveId);
  let matchCount = Number(duel.matchCount || 0);
  if (duel.idempotent || duelRepeat.idempotent) {
    const [[row]] = await mysqlPool.query("SELECT match_count FROM duel_batch_runs_v2 WHERE save_id=? AND day_no=?", [saveId, Number(duel.day || duelRepeat.day)]);
    matchCount = Number(row?.match_count || 0);
  }
  report.duelBatch = { ms: Number((performance.now() - duelStarted).toFixed(2)), matchCount, idempotent: duelRepeat.idempotent === true || duel.idempotent === true };
  const settlementStarted = performance.now();
  const settlement = await runSettlementBatch(saveId, { manual: true });
  const targetDay = afterDay(sourceState) + 1;
  report.settlementBatch = { ms: Number((performance.now() - settlementStarted).toFixed(2)), revision: settlement.stateRevision, targetDay };
  const after = await loadStateFromMysql(saveId);
  report.npcCountPreserved = after.npcs.length === sourceState.npcs.length;
  report.portraitPersisted = Number(after.player.portraitVariant) === 2;
  report.focusPersisted = after.encounters?.focusedNpcIds?.includes(npcId) === true;
  report.passed = report.npcCountPreserved && report.daoRunPersisted && report.portraitPersisted && report.focusPersisted && report.npcUnrelatedToPlayerActionsStable && report.duelBatch.matchCount >= 0 && after.day === sourceState.day + 1;
  console.log(JSON.stringify(report));
} finally {
  await cleanupFixture(saveId);
  await mysqlPool.end();
}

function afterDay(state) { return Number(state?.day || 0); }
