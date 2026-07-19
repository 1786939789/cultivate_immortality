export const duelSeasonLength = 60;
export const duelLadderDays = 52;
export const duelTournamentDays = 8;
export const duelTournamentBracketSize = 256;
export const duelWinScore = 2;
export const duelLossScore = -1;
// Derive the public ladder cap from its duration and advertised win score so
// rank bands cannot expose points beyond the season's published progression.
export const duelSeasonMaxScore = duelLadderDays * duelWinScore;

const duelRankDefinitions = [
  { id: "iron", name: "黑铁", color: "#5b6470", spiritReward: 30 },
  { id: "bronze", name: "青铜", color: "#a66a3d", spiritReward: 60 },
  { id: "silver", name: "白银", color: "#aeb7c2", spiritReward: 100 },
  { id: "gold", name: "黄金", color: "#d4a02f", spiritReward: 150 },
  { id: "platinum", name: "铂金", color: "#5fb8b0", spiritReward: 220 },
  { id: "diamond", name: "钻石", color: "#5a9fe8", spiritReward: 320 },
  { id: "master", name: "超凡大师", color: "#9b6ce8", spiritReward: 450 },
  { id: "challenger", name: "最强王者", color: "#dc5b37", spiritReward: 650 }
];

function buildDuelRanks(maxScore) {
  const safeMax = Math.max(0, Math.floor(Number(maxScore) || 0));
  let cursor = 0;
  return duelRankDefinitions.map((definition, index) => {
    const remainingRanks = duelRankDefinitions.length - index;
    const remainingScores = safeMax - cursor + 1;
    const size = index === duelRankDefinitions.length - 1
      ? remainingScores
      : Math.max(1, Math.floor(remainingScores / remainingRanks));
    const max = Math.min(safeMax, cursor + size - 1);
    const rank = { ...definition, min: cursor, max };
    cursor = max + 1;
    return rank;
  });
}

export const duelRanks = buildDuelRanks(duelSeasonMaxScore);

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
