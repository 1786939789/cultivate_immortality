// MySQL is the sole persistence backend. Keep this module as the stable
// application-facing storage boundary so API and worker imports stay simple.
const storage = await import("./mysqlStore.mjs");

export const getAdminAccounts = storage.getAdminAccounts;
export const setActiveAccount = storage.setActiveAccount;
export const setAdminManagedSaveId = storage.setAdminManagedSaveId;
export const deleteInactiveAccountData = storage.deleteInactiveAccountData;
export const sessionCookie = storage.sessionCookie;
export const clearSessionCookie = storage.clearSessionCookie;
export const getAuthSession = storage.getAuthSession;
export const registerUser = storage.registerUser;
export const loginUser = storage.loginUser;
export const getAdminManagedSaveId = storage.getAdminManagedSaveId;
export const logoutSession = storage.logoutSession;
export const readState = storage.readState;
export const invalidateStateCache = storage.invalidateStateCache;
export const activeSettlementSaveIds = storage.activeSettlementSaveIds;
export const settleAllStates = storage.settleAllStates;
export const writeState = storage.writeState;
export const readBattleReplay = storage.readBattleReplay;
export const mutateState = storage.mutateState;
export const completeTaskIncrementally = storage.completeTaskIncrementally;
export const deleteTaskIncrementally = storage.deleteTaskIncrementally;
export const readCultivatorDetailIncrementally = storage.readCultivatorDetailIncrementally;
export const readLiveRanking = storage.readLiveRanking;
export const runPlayerActionIncrementally = storage.runPlayerActionIncrementally;
export const runSettlementBatch = storage.runSettlementBatch;
export const runDailyDuelBatch = storage.runDailyDuelBatch;
export const readDungeonDayFromMysql = storage.readDungeonDayFromMysql;
export const readDungeonDayIndexFromMysql = storage.readDungeonDayIndexFromMysql;
export const resetState = storage.resetState;
export const publicState = storage.publicState;
export const readHomeProjection = storage.readHomeProjection;
