export function replayStatMax(side, kind) {
  if (!side) return 1;
  const startKey = kind === "mana" ? "startMana" : "startHp";
  const endKey = kind === "mana" ? "endMana" : "endHp";
  const statKey = kind === "mana" ? "mana" : "hp";
  const maxKey = kind === "mana" ? "maxMana" : "maxHp";
  const battleMax = Number(side.stats?.[maxKey]) || 0;
  const legacyBaseMax = battleMax > 0 ? 0 : Number(side.baseStats?.[maxKey]) || 0;
  const legacyBaseCurrent = battleMax > 0 ? 0 : Number(side.baseStats?.[statKey]) || 0;
  return Math.max(
    1,
    battleMax,
    Number(side.stats?.[statKey]) || 0,
    legacyBaseMax,
    legacyBaseCurrent,
    Number(side[startKey]) || 0,
    Number(side[endKey]) || 0
  );
}
