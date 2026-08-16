export function replayStatMax(side, kind) {
  if (!side) return 1;
  const startKey = kind === "mana" ? "startMana" : "startHp";
  const endKey = kind === "mana" ? "endMana" : "endHp";
  const statKey = kind === "mana" ? "mana" : "hp";
  const maxKey = kind === "mana" ? "maxMana" : "maxHp";
  return Math.max(
    1,
    Number(side.stats?.[maxKey]) || 0,
    Number(side.stats?.[statKey]) || 0,
    Number(side.baseStats?.[maxKey]) || 0,
    Number(side.baseStats?.[statKey]) || 0,
    Number(side[startKey]) || 0,
    Number(side[endKey]) || 0
  );
}
