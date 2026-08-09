import { ensureMysqlSchema, mysqlPool, withMysqlTransaction } from "./mysqlDb.mjs";

function mysqlDate(value = new Date()) {
  return new Date(value).toISOString().slice(0, 23).replace("T", " ");
}

export async function cleanupCompletedBackgroundJobs(retentionDays = 90) {
  await ensureMysqlSchema();
  const cutoff = mysqlDate(new Date(Date.now() - Math.max(1, retentionDays) * 24 * 60 * 60 * 1000));
  const [result] = await mysqlPool.query("DELETE FROM background_jobs WHERE status = 'completed' AND completed_at < ?", [cutoff]);
  return Number(result.affectedRows || 0);
}

export async function enqueueBackgroundJob({ jobType, saveId, targetKey, maxAttempts = 8, reopenCompleted = false, availableAt = null }) {
  await ensureMysqlSchema();
  const reopen = reopenCompleted ? 1 : 0;
  const available = availableAt ? mysqlDate(availableAt) : mysqlDate();
  await mysqlPool.query(`
    INSERT INTO background_jobs (job_type, save_id, target_key, max_attempts, available_at)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      max_attempts = VALUES(max_attempts),
      attempts = IF(status IN ('failed','cancelled') OR (? = 1 AND status = 'completed'), 0, attempts),
      available_at = IF(status IN ('failed','cancelled') OR (? = 1 AND status = 'completed'), VALUES(available_at), available_at),
      last_error = IF(status IN ('failed','cancelled') OR (? = 1 AND status = 'completed'), NULL, last_error),
      completed_at = IF(? = 1 AND status = 'completed', NULL, completed_at),
      locked_by = IF(status IN ('failed','cancelled') OR (? = 1 AND status = 'completed'), NULL, locked_by),
      locked_until = IF(status IN ('failed','cancelled') OR (? = 1 AND status = 'completed'), NULL, locked_until),
      status = IF(status IN ('failed','cancelled') OR (? = 1 AND status = 'completed'), 'pending', status)
  `, [jobType, saveId, targetKey, maxAttempts, available, reopen, reopen, reopen, reopen, reopen, reopen, reopen]);
}

export async function claimBackgroundJob(workerId, leaseMs = 30_000, options = {}) {
  const jobId = Number.isFinite(Number(options.jobId)) ? Number(options.jobId) : null;
  const ignoreAvailability = options.ignoreAvailability ? 1 : 0;
  return withMysqlTransaction(async (connection) => {
    const [rows] = await connection.query(`
      SELECT * FROM background_jobs
      WHERE (? IS NULL OR id = ?)
        AND ((status = 'pending' AND (? = 1 OR available_at <= CURRENT_TIMESTAMP(3)))
          OR (status = 'running' AND locked_until < CURRENT_TIMESTAMP(3)))
      ORDER BY available_at, id
      LIMIT 1 FOR UPDATE SKIP LOCKED
    `, [jobId, jobId, ignoreAvailability]);
    if (!rows.length) return null;
    const job = rows[0];
    const lockedUntil = mysqlDate(new Date(Date.now() + leaseMs));
    await connection.query(`
      UPDATE background_jobs
      SET status = 'running', attempts = attempts + 1, locked_by = ?, locked_until = ?, last_error = NULL
      WHERE id = ?
    `, [workerId, lockedUntil, job.id]);
    return { ...job, attempts: Number(job.attempts || 0) + 1, locked_by: workerId, locked_until: lockedUntil };
  });
}

export async function completeBackgroundJob(jobId, workerId, connection = mysqlPool) {
  await connection.query(`
    UPDATE background_jobs
    SET status = 'completed', completed_at = CURRENT_TIMESTAMP(3), locked_by = NULL, locked_until = NULL
    WHERE id = ? AND locked_by = ?
  `, [jobId, workerId]);
}

export async function releaseBackgroundJobWithoutPenalty(jobId, workerId, delayMs = 100) {
  await mysqlPool.query(`
    UPDATE background_jobs
    SET status = 'pending', available_at = ?, attempts = GREATEST(0, attempts - 1), locked_by = NULL, locked_until = NULL
    WHERE id = ? AND locked_by = ?
  `, [mysqlDate(new Date(Date.now() + delayMs)), jobId, workerId]);
}

export async function failBackgroundJob(job, workerId, error) {
  const exhausted = Number(job.attempts || 0) >= Number(job.max_attempts || 8);
  const delayMs = Math.min(15 * 60_000, 1000 * (2 ** Math.max(0, Number(job.attempts || 1) - 1)));
  await mysqlPool.query(`
    UPDATE background_jobs
    SET status = ?, available_at = ?, last_error = ?, locked_by = NULL, locked_until = NULL
    WHERE id = ? AND locked_by = ?
  `, [exhausted ? "failed" : "pending", mysqlDate(new Date(Date.now() + delayMs)), String(error?.stack || error?.message || error).slice(0, 6000), job.id, workerId]);
  return exhausted;
}

export async function assertBackgroundJobLease(connection, jobId, workerId) {
  const [rows] = await connection.query(`
    SELECT status, locked_by FROM background_jobs WHERE id = ? FOR UPDATE
  `, [jobId]);
  if (rows[0]?.status !== "running" || rows[0]?.locked_by !== workerId) {
    const error = new Error("后台任务已取消或租约已转移");
    error.code = "BACKGROUND_JOB_LEASE_LOST";
    error.lease = {
      expectedWorkerId: workerId,
      status: rows[0]?.status || "missing",
      lockedBy: rows[0]?.locked_by || null
    };
    throw error;
  }
}

export async function cancelPendingJobs(jobType, saveId, connection = mysqlPool) {
  await connection.query(`
    UPDATE background_jobs SET status = 'cancelled', locked_by = NULL, locked_until = NULL
    WHERE job_type = ? AND save_id = ? AND status IN ('pending','running')
  `, [jobType, saveId]);
}

export async function backgroundJobStats(jobType) {
  const [rows] = await mysqlPool.query(`
    SELECT status, COUNT(*) AS count FROM background_jobs
    WHERE (? IS NULL OR job_type = ?) GROUP BY status
  `, [jobType || null, jobType || null]);
  return Object.fromEntries(rows.map((row) => [row.status, Number(row.count || 0)]));
}
