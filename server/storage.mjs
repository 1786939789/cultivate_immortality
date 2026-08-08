const driver = String(process.env.STORAGE_DRIVER || "sqlite").trim().toLowerCase();

if (!new Set(["sqlite", "mysql"]).has(driver)) {
  throw new Error(`Unsupported STORAGE_DRIVER: ${driver}`);
}

const storage = await import(driver === "mysql" ? "./mysqlStore.mjs" : "./store.mjs");

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
export const resetState = storage.resetState;
export const publicState = storage.publicState;
