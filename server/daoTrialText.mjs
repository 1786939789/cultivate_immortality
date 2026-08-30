const effectLabels = {
  attack: "攻击", defense: "防御", maxHp: "气血上限", maxMana: "法力上限", divineSense: "神识",
  skillPower: "技能效果", statusPower: "持续效果", manaCost: "技能消耗", cooldown: "技能冷却",
  lowHpAttack: "低血攻击", lowHpSense: "低血神识", postBattleHeal: "胜后气血恢复", postBattleMana: "胜后法力恢复",
  rootResist: "灵根克制抗性", eventLossResist: "事件损耗抗性", eventMana: "事件法力恢复", restHp: "调息气血恢复",
  healing: "治疗效果", missingHpHeal: "缺失气血恢复", scoreRisk: "风险得分", failScore: "失败得分", highManaSense: "高法力神识", lowManaCost: "低法力耗损",
  companion: "同行支援", companionMana: "同行法力", companionPower: "同行威能", companionSkillPower: "同行技能", companionFrequency: "同行间隔", companionCopy: "同行复制", maxHpWithoutCompanion: "独行气血",
  attackEchoEvery: "攻击余波间隔", attackEchoPower: "攻击余波", openingSkillPower: "首技增幅", nextBattleAttack: "下战攻击", freeSkillEvery: "免费施法间隔", skillEchoChance: "术法余波概率", skillEchoPower: "术法余波", noHitShield: "无伤护盾", reflectCharge: "反震", lethalGuard: "致命护持", overhealShield: "溢疗护盾", healCountBoost: "连续治疗增幅", dotStack: "持续伤害叠层", insightSolo: "独行悟机"
};

export function formatTrialEffects(effects = {}) {
  return Object.entries(effects).map(([key, value]) => {
    const label = effectLabels[key] || key;
    if (typeof value === "boolean") {
      if (!value) return "";
      if (key === "lethalGuard") return "首次受到致命伤时保留1点气血";
      return label;
    }
    if (key === "insightSolo") return `独行时额外获得 ${Math.max(0, Math.floor(Number(value) || 0))} 点悟机`;
    if (key === "freeSkillEvery") return `每${Math.max(1, Math.floor(Math.abs(Number(value)) || 1))}次施法免费一次`;
    if (key === "attackEchoEvery") return `每${Math.max(1, Math.floor(Math.abs(Number(value)) || 1))}次普通攻击追加一次余波`;
    if (key === "companionFrequency") {
      const rounds = Math.abs(Math.floor(Number(value) || 0));
      if (!rounds) return "同行支援间隔不变";
      return `同行支援间隔${Number(value) < 0 ? "缩短" : "延长"} ${rounds} 回合`;
    }
    if (key === "cooldown") return `${label}${Number(value) < 0 ? "减少" : "增加"} ${Math.abs(Math.floor(Number(value) || 0))} 回合`;
    const percent = Math.round(Math.abs(Number(value) || 0) * 100);
    return `${label}${Number(value) >= 0 ? "提高" : "降低"} ${percent}%`;
  }).filter(Boolean).join("；") + "。";
}
