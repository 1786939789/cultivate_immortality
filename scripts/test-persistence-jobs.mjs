import { randomUUID } from "node:crypto";
import { runBackgroundWorkerOnce } from "../server/backgroundWorker.mjs";
import { dateKey } from "../server/gameLogic.mjs";
import { cleanupCompletedBackgroundJobs, enqueueBackgroundJob } from "../server/mysqlBackgroundJobs.mjs";
import { mysqlPool } from "../server/mysqlDb.mjs";
import { loadStateFromMysql, saveStateToMysql } from "../server/mysqlStateRepository.mjs";
import { mutateState, readState, setActiveAccount } from "../server/mysqlStore.mjs";
import { changedPersistenceDomains, trackPersistenceDomains } from "../server/persistenceDomains.mjs";
import { cleanupFixture, cleanupFixtures, createFixture } from "./mysql-test-fixture.mjs";

function previousDate(date) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() - 1);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

await cleanupFixtures();
const fixture = await createFixture({ prefix: "persistence-job-test-" });
const saveId = fixture.saveId;
let inactiveFixture = null;
let inactiveSaveId = "";
const fixtureJobAvailableAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

function progress(step) {
  console.log(`[persistence-jobs] ${step}`);
}

try {
  inactiveFixture = await createFixture({ prefix: "persistence-inactive-", sourceSaveId: fixture.sourceSaveId });
  inactiveSaveId = inactiveFixture.saveId;
  progress("copy source save");
  const sourceState = await loadStateFromMysql(fixture.sourceSaveId);

  progress("track mutation domains");
  const baseline = await loadStateFromMysql(saveId);
  const trackingDraft = structuredClone(baseline);
  const tracking = trackPersistenceDomains(trackingDraft);
  tracking.state.gameSettings.persistenceTrackingProbe = true;
  tracking.state.player.xp += 1;
  tracking.state.lastSettlementDate = previousDate(dateKey());
  const trackedDomains = [...tracking.domains].sort();
  if (JSON.stringify(trackedDomains) !== JSON.stringify(["cultivators", "sections"])) {
    throw new Error(`领域追踪错误: ${JSON.stringify(trackedDomains)}`);
  }

  progress("verify isolated domain write");
  const sectionDraft = structuredClone(baseline);
  sectionDraft.gameSettings = { ...(sectionDraft.gameSettings || {}), persistenceProbe: randomUUID() };
  const domains = changedPersistenceDomains(baseline, sectionDraft);
  if (JSON.stringify(domains) !== JSON.stringify(["sections"])) throw new Error(`领域检测错误: ${JSON.stringify(domains)}`);
  const queries = [];
  await saveStateToMysql(sectionDraft, saveId, {
    domains,
    expectedRevision: baseline.__stateRevision,
    queryObserver: (sql) => queries.push(sql.replace(/\s+/g, " ").trim())
  });
  const forbiddenTables = ["cultivators", "cultivator_history", "equipment_items", "duel_days", "duel_matches", "dungeon_days", "dungeon_records", "province_wars", "admin_profiles"];
  if (!queries.some((sql) => /save_sections/.test(sql))) throw new Error("领域写入未访问 save_sections");
  if (queries.some((sql) => forbiddenTables.some((table) => new RegExp(`\\b${table}\\b`).test(sql)))) {
    throw new Error(`领域写入访问了无关表: ${JSON.stringify(queries)}`);
  }

  progress("verify optimistic conflict");
  const concurrentBase = await loadStateFromMysql(saveId);
  const firstDraft = structuredClone(concurrentBase);
  firstDraft.gameSettings.persistenceProbe = `first-${randomUUID()}`;
  const secondDraft = structuredClone(concurrentBase);
  secondDraft.gameSettings.persistenceProbe = `second-${randomUUID()}`;
  await saveStateToMysql(firstDraft, saveId, { domains: ["sections"], expectedRevision: concurrentBase.__stateRevision });
  let conflictDetected = false;
  try {
    await saveStateToMysql(secondDraft, saveId, { domains: ["sections"], expectedRevision: concurrentBase.__stateRevision });
  } catch (error) {
    conflictDetected = error.code === "STATE_REVISION_CONFLICT";
  }
  if (!conflictDetected) throw new Error("并发写入未触发修订号冲突");

  progress("verify settlement enqueue and execution");
  const beforeSettlement = await loadStateFromMysql(saveId);
  const settlementDraft = structuredClone(beforeSettlement);
  settlementDraft.lastSettlementDate = previousDate(dateKey());
  await saveStateToMysql(settlementDraft, saveId, { domains: [], expectedRevision: beforeSettlement.__stateRevision });
  await setActiveAccount(saveId, true, { settlementJobAvailableAt: fixtureJobAvailableAt });
  await mysqlPool.query("DELETE FROM background_jobs WHERE job_type = 'daily_settlement' AND save_id = ?", [saveId]);
  const queuedState = await loadStateFromMysql(saveId);
  const readWithoutEnqueue = await readState(saveId, { skipSettlementEnqueue: true });
  const [skippedJobs] = await mysqlPool.query("SELECT status FROM background_jobs WHERE job_type = 'daily_settlement' AND save_id = ? AND target_key = ?", [saveId, dateKey()]);
  if (skippedJobs.length) throw new Error("跳过结算入队的读取仍创建了任务");
  const readBeforeJob = await readState(saveId, { settlementJobAvailableAt: fixtureJobAvailableAt });
  if (readBeforeJob.lastSettlementDate !== queuedState.lastSettlementDate || readBeforeJob.day !== queuedState.day) {
    throw new Error("读取存档时不应同步执行每日结算");
  }
  if (readWithoutEnqueue.lastSettlementDate !== queuedState.lastSettlementDate) throw new Error("跳过入队的读取改变了存档");
  const [queuedJobs] = await mysqlPool.query("SELECT id, status, attempts FROM background_jobs WHERE job_type = 'daily_settlement' AND save_id = ? AND target_key = ?", [saveId, dateKey()]);
  if (queuedJobs[0]?.status !== "pending" || Number(queuedJobs[0]?.attempts) !== 0) throw new Error("读取落后存档未正确入队");

  await saveStateToMysql(structuredClone(queuedState), inactiveSaveId);
  await readState(inactiveSaveId);
  const [inactiveJobs] = await mysqlPool.query("SELECT id FROM background_jobs WHERE job_type = 'daily_settlement' AND save_id = ?", [inactiveSaveId]);
  if (inactiveJobs.length) throw new Error("非活跃账户读档后仍创建了每日结算任务");
  const jobResult = await runBackgroundWorkerOnce({ jobId: queuedJobs[0].id, ignoreAvailability: true });
  const settledState = await loadStateFromMysql(saveId);
  if (!jobResult?.completed || settledState.lastSettlementDate !== dateKey() || settledState.day !== queuedState.day + 1) {
    const [[jobAfter]] = await mysqlPool.query("SELECT status,locked_by,locked_until,attempts,last_error FROM background_jobs WHERE id=?", [queuedJobs[0].id]);
    throw new Error(`每日结算任务错误: ${JSON.stringify({ jobResult, jobAfter, beforeDay: queuedState.day, afterDay: settledState.day, date: settledState.lastSettlementDate })}`);
  }

  progress("verify completed job reopen");
  await mutateState((state) => {
    state.lastSettlementDate = previousDate(dateKey());
  }, saveId, { skipAutomaticSettlement: true, resultOnly: true });
  await enqueueBackgroundJob({ jobType: "daily_settlement", saveId, targetKey: dateKey(), reopenCompleted: true, availableAt: fixtureJobAvailableAt });
  const [reopenedJobs] = await mysqlPool.query("SELECT id, status, attempts, completed_at FROM background_jobs WHERE job_type = 'daily_settlement' AND save_id = ? AND target_key = ?", [saveId, dateKey()]);
  if (reopenedJobs[0]?.status !== "pending" || Number(reopenedJobs[0]?.attempts) !== 0 || reopenedJobs[0]?.completed_at) {
    throw new Error(`已完成任务未正确重开: ${JSON.stringify(reopenedJobs[0])}`);
  }
  const reopenedResult = await runBackgroundWorkerOnce({ jobId: reopenedJobs[0].id, ignoreAvailability: true });
  if (!reopenedResult?.completed || (await loadStateFromMysql(saveId)).lastSettlementDate !== dateKey()) {
    throw new Error(`重开的每日结算任务执行错误: ${JSON.stringify(reopenedResult)}`);
  }

  progress("verify completed job cleanup");
  const cleanupTarget = `cleanup-${randomUUID()}`;
  await enqueueBackgroundJob({ jobType: "cleanup_test_job", saveId, targetKey: cleanupTarget });
  await mysqlPool.query(`UPDATE background_jobs SET status = 'completed', completed_at = DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 100 DAY)
    WHERE job_type = 'cleanup_test_job' AND save_id = ? AND target_key = ?`, [saveId, cleanupTarget]);
  const cleanedJobs = await cleanupCompletedBackgroundJobs(90);
  const [cleanupRows] = await mysqlPool.query("SELECT id FROM background_jobs WHERE job_type = 'cleanup_test_job' AND save_id = ? AND target_key = ?", [saveId, cleanupTarget]);
  if (cleanedJobs < 1 || cleanupRows.length) throw new Error("完成任务清理未按保留期执行");

  progress("verify retry and lease recovery");
  const failedTarget = randomUUID();
  await enqueueBackgroundJob({ jobType: "unsupported_test_job", saveId, targetKey: failedTarget, maxAttempts: 3, availableAt: fixtureJobAvailableAt });
  const [[failedJob]] = await mysqlPool.query("SELECT id FROM background_jobs WHERE job_type='unsupported_test_job' AND save_id=? AND target_key=?", [saveId, failedTarget]);
  const failedResult = await runBackgroundWorkerOnce({ jobId: failedJob.id, ignoreAvailability: true });
  const [failedJobs] = await mysqlPool.query("SELECT status, attempts, last_error FROM background_jobs WHERE job_type = 'unsupported_test_job' AND save_id = ?", [saveId]);
  if (!failedResult?.failed || failedJobs[0]?.status !== "pending" || Number(failedJobs[0]?.attempts) !== 1 || !failedJobs[0]?.last_error) {
    throw new Error(`任务重试状态错误: ${JSON.stringify({ failedResult, job: failedJobs[0] })}`);
  }
  await mysqlPool.query("DELETE FROM background_jobs WHERE job_type = 'unsupported_test_job' AND save_id = ?", [saveId]);

  const leaseTarget = `lease-${randomUUID()}`;
  await enqueueBackgroundJob({ jobType: "unsupported_test_job", saveId, targetKey: leaseTarget, maxAttempts: 1, availableAt: fixtureJobAvailableAt });
  await mysqlPool.query(`
    UPDATE background_jobs SET status = 'running', locked_by = 'dead-worker', locked_until = DATE_SUB(CURRENT_TIMESTAMP(3), INTERVAL 1 SECOND)
    WHERE job_type = 'unsupported_test_job' AND save_id = ? AND target_key = ?
  `, [saveId, leaseTarget]);
  const [[leaseJob]] = await mysqlPool.query("SELECT id FROM background_jobs WHERE job_type='unsupported_test_job' AND save_id=? AND target_key=?", [saveId, leaseTarget]);
  const leaseResult = await runBackgroundWorkerOnce({ jobId: leaseJob.id });
  const [leaseJobs] = await mysqlPool.query("SELECT status, attempts FROM background_jobs WHERE job_type = 'unsupported_test_job' AND save_id = ? AND target_key = ?", [saveId, leaseTarget]);
  if (!leaseResult?.failed || leaseJobs[0]?.status !== "failed" || Number(leaseJobs[0]?.attempts) !== 1) {
    throw new Error(`过期租约恢复或最大重试错误: ${JSON.stringify({ leaseResult, job: leaseJobs[0] })}`);
  }

  console.log(JSON.stringify({
    domainWriteIsolated: true,
    domainMutationTracked: true,
    revisionConflictDetected: true,
    settlementJobCompleted: true,
    settlementEnqueueSkipped: true,
    inactiveSaveNotQueued: true,
    completedJobReopened: true,
    completedJobCleanup: true,
    failedJobRetried: true,
    expiredLeaseRecovered: true,
    maxAttemptsEnforced: true,
    observedQueries: queries.length
  }));
} finally {
  try {
    await setActiveAccount(saveId, false);
  } catch {
    // The account may not exist if setup failed before insertion.
  }
  await cleanupFixture(saveId);
  if (inactiveSaveId) await cleanupFixture(inactiveSaveId);
  await mysqlPool.end();
}
