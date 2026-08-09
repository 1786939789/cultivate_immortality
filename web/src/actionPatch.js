export const ACTION_PATCH_VERSION = 2;

export function mergeActionPatch(current, response, highestRevision = -1) {
  const patch = response?.patch;
  if (!patch) return { applied: false, reason: "missing-patch", state: current, highestRevision };
  const revision = Number(response.stateRevision);
  if (Number.isFinite(revision) && revision < highestRevision) return { applied: false, reason: "stale-revision", state: current, highestRevision };
  const version = Number(response.patchVersion || 1);
  if (version > ACTION_PATCH_VERSION) return { applied: false, reason: "future-version", state: current, highestRevision };
  const nextRevision = Number.isFinite(revision) ? Math.max(highestRevision, revision) : highestRevision;
  if (patch.replace) {
    const { replace: _replace, ...replacement } = patch;
    return { applied: true, replace: true, state: { ...replacement, stateRevision: revision }, highestRevision: nextRevision };
  }
  if (!current) return { applied: false, reason: "missing-state", state: current, highestRevision };
  const next = { ...current };
  for (const key of ["player", "sect", "derived", "home"]) if (patch[key] !== undefined) next[key] = { ...(current[key] || {}), ...(patch[key] || {}) };
  if (patch.derived?.combatRating && next.derived?.combatRatings?.entries) {
    const rating = patch.derived.combatRating;
    next.derived.combatRatings = {
      ...next.derived.combatRatings,
      entries: next.derived.combatRatings.entries.map((entry) => entry.id === rating.id ? { ...entry, ...rating } : entry)
    };
  }
  for (const key of [
    "bag", "shop", "playerSectPlan", "encounters", "relationships", "provinces", "provinceVersion",
    "daoTrial", "taskProgress", "equipmentTransfers", "dungeonDays", "duelDays", "provinceWars",
    "logDays", "gameSettings", "spiritPearls", "dailyRootFortune", "calendarStartDate",
    "lastSettlementDate", "day"
  ]) if (patch[key] !== undefined) next[key] = patch[key];
  if (patch.completion) {
    next.tasks = [patch.completion, ...(current.tasks || []).filter((item) => item.id !== patch.completion.id)].slice(0, 16);
    next.taskCompletions = [patch.completion, ...(current.taskCompletions || []).filter((item) => item.id !== patch.completion.id)];
  } else {
    if (patch.tasks !== undefined) next.tasks = patch.tasks;
    if (patch.taskCompletions !== undefined) next.taskCompletions = patch.taskCompletions;
  }
  if (patch.deletedCompletionId) {
    next.tasks = (next.tasks || []).filter((item) => item.id !== patch.deletedCompletionId);
    next.taskCompletions = (next.taskCompletions || []).filter((item) => item.id !== patch.deletedCompletionId);
  }
  if (patch.log) next.log = [...patch.log, ...(current.log || []).filter((old) => !patch.log.some((entry) => entry.id && entry.id === old.id))].slice(0, 80);
  if (Number.isFinite(revision)) next.stateRevision = revision;
  return { applied: true, replace: false, state: next, highestRevision: nextRevision };
}
