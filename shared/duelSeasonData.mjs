export const duelSeasonLength = 60;
export const duelLadderDays = 52;
export const duelTournamentDays = 8;
export const duelTournamentBracketSize = 256;
export const duelSeasonMaxScore = 120;
export const duelWinScore = 2;
export const duelLossScore = -1;

export const duelRanks = [
  { id: "iron", name: "黑铁", min: 0, max: 14, color: "#5b6470", spiritReward: 30 },
  { id: "bronze", name: "青铜", min: 15, max: 29, color: "#a66a3d", spiritReward: 60 },
  { id: "silver", name: "白银", min: 30, max: 44, color: "#aeb7c2", spiritReward: 100 },
  { id: "gold", name: "黄金", min: 45, max: 59, color: "#d4a02f", spiritReward: 150 },
  { id: "platinum", name: "铂金", min: 60, max: 74, color: "#5fb8b0", spiritReward: 220 },
  { id: "diamond", name: "钻石", min: 75, max: 89, color: "#5a9fe8", spiritReward: 320 },
  { id: "master", name: "超凡大师", min: 90, max: 104, color: "#9b6ce8", spiritReward: 450 },
  { id: "challenger", name: "最强王者", min: 105, max: 120, color: "#dc5b37", spiritReward: 650 }
];

export function duelSeasonOfDay(day) {
  const safeDay = Math.max(1, Number(day) || 1);
  return Math.floor((safeDay - 1) / duelSeasonLength) + 1;
}

export function duelSeasonDay(day) {
  const safeDay = Math.max(1, Number(day) || 1);
  return ((safeDay - 1) % duelSeasonLength) + 1;
}

export function duelRankForScore(score) {
  const safeScore = Math.max(0, Math.min(duelSeasonMaxScore, Number(score) || 0));
  return duelRanks.find((rank) => safeScore >= rank.min && safeScore <= rank.max) || duelRanks[0];
}
