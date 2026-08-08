import { randomUUID } from "node:crypto";
import { dateKey, settleIfNeeded } from "./gameLogic.mjs";
import { assertBackgroundJobLease, claimBackgroundJob, cleanupCompletedBackgroundJobs, completeBackgroundJob, enqueueBackgroundJob, failBackgroundJob, releaseBackgroundJobWithoutPenalty } from "./mysqlBackgroundJobs.mjs";
import { activeSettlementSaveIds, mutateState, readState } from "./storage.mjs";

const dailySettlementJob = "daily_settlement";
const workerId = `worker-${process.pid}-${randomUUID()}`;
let workerTimer;
let workerRunning = false;

export async function enqueueDailySettlementJobs(targetDate = dateKey()) {
  const ids = await activeSettlementSaveIds();
  await cleanupCompletedBackgroundJobs();
  let queuedSaves = 0;
  for (const saveId of ids) {
    const state = await readState(saveId, { skipSettlementEnqueue: true });
    if (state.lastSettlementDate >= targetDate) continue;
    await enqueueBackgroundJob({ jobType: dailySettlementJob, saveId, targetKey: targetDate, reopenCompleted: true });
    queuedSaves += 1;
  }
  return { totalSaves: ids.length, queuedSaves, targetDate };
}

async function runDailySettlementJob(job) {
  let outcome;
  const result = await mutateState((state) => {
    if (state.lastSettlementDate >= job.target_key) {
      outcome = { settled: false, complete: true };
      return outcome;
    }
    settleIfNeeded(state, { maxDays: 1 });
    outcome = { settled: true, complete: state.lastSettlementDate >= job.target_key };
    return outcome;
  }, job.save_id, {
    resultOnly: true,
    skipAutomaticSettlement: true,
    trackPersistenceDomains: false,
    storageOptions: {
      skipReplayExtraction: true,
      beforeWrite: (connection) => assertBackgroundJobLease(connection, job.id, workerId),
      beforeCommit: (connection) => outcome.complete ? completeBackgroundJob(job.id, workerId, connection) : undefined
    }
  });
  if (!result.result.complete) {
    await releaseBackgroundJobWithoutPenalty(job.id, workerId, 10);
    return { released: true, settled: result.result.settled };
  }
  return { completed: true, settled: result.result.settled };
}

export async function runBackgroundWorkerOnce() {
  // Daily settlement may process a large NPC roster and persist many typed
  // rows. A 30-second lease can expire while the transaction is still valid,
  // causing a false "cancelled" result at commit time. Keep the lease long
  // enough for the batch and let the database lock/optimistic revision guard
  // provide correctness.
  const job = await claimBackgroundJob(workerId, Math.max(30_000, Number(process.env.BACKGROUND_JOB_LEASE_MS || 10 * 60_000)));
  if (!job) return null;
  try {
    if (job.job_type === dailySettlementJob) return await runDailySettlementJob(job);
    throw new Error(`Unsupported background job: ${job.job_type}`);
  } catch (error) {
    if (error?.code === "STATE_REVISION_CONFLICT") {
      await releaseBackgroundJobWithoutPenalty(job.id, workerId, 50);
      return { released: true, conflict: true };
    }
    if (error?.code === "BACKGROUND_JOB_LEASE_LOST") {
      // Another worker may have committed the same revision and completed the
      // job just before this worker reached its lease check. Treat that case
      // as successful instead of reporting a false cancellation.
      const settled = await readState(job.save_id, { skipSettlementEnqueue: true });
      if (settled?.lastSettlementDate >= job.target_key) return { completed: true, recovered: true };
      return { cancelled: true };
    }
    await failBackgroundJob(job, workerId, error);
    return { failed: true, error: error.message || String(error) };
  }
}

async function workerTick() {
  if (workerRunning) return;
  workerRunning = true;
  try {
    for (let count = 0; count < 20; count += 1) {
      if (!await runBackgroundWorkerOnce()) break;
      await new Promise((resolve) => setImmediate(resolve));
    }
  } finally {
    workerRunning = false;
  }
}

export function startBackgroundWorker(intervalMs = Number(process.env.BACKGROUND_JOB_POLL_MS || 1000)) {
  if (workerTimer) return;
  workerTimer = setInterval(() => void workerTick(), Math.max(100, intervalMs));
  workerTimer.unref?.();
  void workerTick();
}

export function stopBackgroundWorker() {
  clearInterval(workerTimer);
  workerTimer = null;
}
