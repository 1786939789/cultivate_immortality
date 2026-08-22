export const daoTrialCycleLength = 7;
export const daoTrialOfficialAttempts = 3;

export const daoTrialLawRarities = {
  silver: { id: "silver", label: "白银", order: 1, color: "#c7d0d4" },
  gold: { id: "gold", label: "黄金", order: 2, color: "#e7bd58" },
  diamond: { id: "diamond", label: "钻石", order: 3, color: "#8fe5e8" }
};

export const daoTrialLawRarityRates = [
  { maxFloor: 4, silver: 82, gold: 16, diamond: 2 },
  { maxFloor: 9, silver: 78, gold: 19, diamond: 3 },
  { maxFloor: 14, silver: 72, gold: 23, diamond: 5 },
  { maxFloor: Infinity, silver: 65, gold: 27, diamond: 8 }
];

export const daoTrialRoutes = [
  {
    id: "golden-pass",
    name: "金石关",
    subtitle: "重关叠嶂，以守御和反击破局",
    rootKey: "earth",
    accent: "gold",
    sealTags: ["guard", "vitality"],
    nodes: [
      { id: "gate", type: "battle", name: "叩关石傀", difficulty: 0.88, monster: "镇关石傀", rounds: 16 },
      { id: "echo", type: "event", name: "石壁回声", event: "wall-echo" },
      { id: "ridge", type: "battle", name: "断崖伏击", difficulty: 0.95, monster: "裂岩妖猿", rounds: 17 },
      { id: "spring", type: "rest", name: "金泉调息", event: "gold-spring" },
      { id: "warden", type: "battle", name: "玄甲守将", difficulty: 1.05, monster: "玄甲守将", elite: true, rounds: 18 },
      { id: "weight", type: "event", name: "问心石阶", event: "stone-weight" },
      { id: "heart", type: "battle", name: "不动心魔", difficulty: 1.16, monster: "不动心魔", boss: true, rounds: 20 }
    ]
  },
  {
    id: "wind-thunder-path",
    name: "风雷径",
    subtitle: "雷隙瞬息，以神识和法力抢得先机",
    rootKey: "thunder",
    accent: "cyan",
    opponentScale: 1,
    sealTags: ["focus", "tempo"],
    nodes: [
      { id: "cloud", type: "battle", name: "踏云试速", difficulty: 0.88, monster: "逐电风隼", rounds: 15 },
      { id: "fork", type: "event", name: "雷径分岔", event: "thunder-fork" },
      { id: "bridge", type: "battle", name: "悬桥惊雷", difficulty: 0.95, monster: "鸣雷兽", rounds: 16 },
      { id: "eye", type: "rest", name: "风眼调息", event: "wind-eye" },
      { id: "marshal", type: "battle", name: "雷部巡将", difficulty: 1.05, monster: "雷部巡将", elite: true, rounds: 17 },
      { id: "flash", type: "event", name: "一念电光", event: "flash-thought" },
      { id: "heart", type: "battle", name: "无相心魔", difficulty: 1.16, monster: "无相心魔", boss: true, rounds: 19 }
    ]
  },
  {
    id: "nether-marsh",
    name: "玄阴泽",
    subtitle: "幽瘴蚀骨，以持续伤害和取舍求生",
    rootKey: "water",
    accent: "violet",
    opponentScale: 1,
    sealTags: ["arcane", "risk"],
    nodes: [
      { id: "mist", type: "battle", name: "入泽迷雾", difficulty: 0.88, monster: "噬灵雾妖", rounds: 17 },
      { id: "lotus", type: "event", name: "黑莲三瓣", event: "black-lotus" },
      { id: "pool", type: "battle", name: "腐水暗袭", difficulty: 0.95, monster: "腐水阴蟒", rounds: 18 },
      { id: "isle", type: "rest", name: "枯木孤洲", event: "dead-isle" },
      { id: "witch", type: "battle", name: "沼泽巫主", difficulty: 1.05, monster: "沼泽巫主", elite: true, rounds: 19 },
      { id: "shadow", type: "event", name: "影中旧我", event: "marsh-shadow" },
      { id: "heart", type: "battle", name: "贪生心魔", difficulty: 1.16, monster: "贪生心魔", boss: true, rounds: 21 }
    ]
  }
];

// Each route keeps its seven tactical slots but draws one variant per slot every cycle.
export const daoTrialNodeVariants = {
  "golden-pass": [
    { id: "ore-echo", slot: 0, type: "battle", name: "矿脉石灵", difficulty: 0.9, monster: "矿脉石灵", rounds: 16 },
    { id: "old-ration", slot: 1, type: "event", name: "旧军粮册", event: "old-ration" },
    { id: "iron-rain", slot: 2, type: "battle", name: "铁雨断桥", difficulty: 0.97, monster: "铁雨傀儡", rounds: 17 },
    { id: "forge-rest", slot: 3, type: "rest", name: "炉心回温", event: "forge-rest" },
    { id: "earth-warlord", slot: 4, type: "battle", name: "地脉战将", difficulty: 1.07, monster: "地脉战将", elite: true, rounds: 18 },
    { id: "weighing-heart", slot: 5, type: "event", name: "衡石问心", event: "weighing-heart" },
    { id: "mountain-devourer", slot: 6, type: "battle", name: "吞山心魔", difficulty: 1.18, monster: "吞山心魔", boss: true, rounds: 20 }
  ],
  "wind-thunder-path": [
    { id: "storm-kite", slot: 0, type: "battle", name: "裂云雷鸢", difficulty: 0.9, monster: "裂云雷鸢", rounds: 15 },
    { id: "static-fork", slot: 1, type: "event", name: "静电分路", event: "static-fork" },
    { id: "thunder-chain", slot: 2, type: "battle", name: "雷链横空", difficulty: 0.97, monster: "雷链兽", rounds: 16 },
    { id: "cloud-rest", slot: 3, type: "rest", name: "云隙吐纳", event: "cloud-rest" },
    { id: "sky-marshal", slot: 4, type: "battle", name: "天隙巡使", difficulty: 1.07, monster: "天隙巡使", elite: true, rounds: 17 },
    { id: "thunder-memory", slot: 5, type: "event", name: "雷中旧忆", event: "thunder-memory" },
    { id: "silent-heaven", slot: 6, type: "battle", name: "寂天心魔", difficulty: 1.18, monster: "寂天心魔", boss: true, rounds: 19 }
  ],
  "nether-marsh": [
    { id: "mire-bone", slot: 0, type: "battle", name: "泥骨行者", difficulty: 0.9, monster: "泥骨行者", rounds: 17 },
    { id: "poison-lotus", slot: 1, type: "event", name: "毒莲换息", event: "poison-lotus" },
    { id: "black-water", slot: 2, type: "battle", name: "黑水伏流", difficulty: 0.97, monster: "黑水阴蛟", rounds: 18 },
    { id: "reed-rest", slot: 3, type: "rest", name: "芦洲避瘴", event: "reed-rest" },
    { id: "marsh-oracle", slot: 4, type: "battle", name: "泽国巫祝", difficulty: 1.07, monster: "泽国巫祝", elite: true, rounds: 19 },
    { id: "old-mask", slot: 5, type: "event", name: "旧面浮沼", event: "old-mask" },
    { id: "endless-hunger", slot: 6, type: "battle", name: "无尽饥魔", difficulty: 1.18, monster: "无尽饥魔", boss: true, rounds: 21 }
  ]
};

export const daoTrialCycleAffixes = [
  { id: "ore-awakening", name: "古矿复苏", text: "守御类道印更容易出现，调息恢复提高 8%。", effects: { sealTag: "guard", restBonus: 0.08 } },
  { id: "thunder-tide", name: "雷潮倒灌", text: "敌方战力提高 6%，神识类道印效果提高 8%。", effects: { enemyPower: 0.06, sealTag: "focus" } },
  { id: "marsh-flood", name: "玄阴涨潮", text: "事件损耗提高 5%，治疗和恢复效果提高 12%。", effects: { eventLoss: 0.05, healing: 0.12 } },
  { id: "heart-echo", name: "心魔回响", text: "心魔关得分提高 20%，失败时额外损失少量灵石。", effects: { bossScore: 0.2, failureSpirit: 4 } },
  { id: "broken-sky", name: "天幕裂隙", text: "每次战斗法力上限提高 8%，但技能消耗提高 6%。", effects: { maxMana: 0.08, manaCost: 0.06 } },
  { id: "silent-bell", name: "无声古钟", text: "事件选择获得的悟机提高 1 点，战斗分数降低 5%。", effects: { insight: 1, scoreMultiplier: 0.95 } },
  { id: "jade-frost", name: "玉霜覆野", text: "血量上限提高 8%，普通攻击伤害降低 4%。", effects: { maxHp: 0.08, attack: -0.04 } },
  { id: "red-comet", name: "赤彗临空", text: "攻击提高 7%，敌方首回合更容易释放术法。", effects: { attack: 0.07, enemyPower: 0.03 } },
  { id: "returning-tide", name: "回潮旧路", text: "进入秘境时额外获得 1 点悟机，可多重观一次道印。", effects: { initialInsight: 1 } },
  { id: "empty-city", name: "空城夜行", text: "独行时血量提高 10%，同行支援效果降低 15%。", effects: { soloHp: 0.1, companionPenalty: 0.15 } },
  { id: "golden-scar", name: "金痕灼脉", text: "通过精英关额外获得 18 分，所有敌人战力提高 4%。", effects: { eliteScore: 0.18, enemyPower: 0.04 } },
  { id: "windless-day", name: "无风之日", text: "身法类道印不再享受路线偏好权重，但调息额外恢复法力。", effects: { noRouteBonus: "tempo", restMana: 0.12 } },
  { id: "deep-mist", name: "深雾封泽", text: "玄阴泽路线的首战难度降低，后续战斗逐关提高。", effects: { firstBattleEase: 0.08, scalingEnemy: 0.02 } },
  { id: "three-questions", name: "三问天门", text: "每完成一个事件节点，获得额外 10 分。", effects: { eventScore: 10 } },
  { id: "borrowed-fate", name: "借命一线", text: "挑战失败时，结算分数额外提高 30%，但仍不算通关。", effects: { failScore: 0.3 } },
  { id: "seasonal-dust", name: "四时尘息", text: "道印池每次选择至少包含一道当前路线偏好的道印。", effects: { sealTag: "vitality" } }
];

export const daoTrialEventOptions = {
  "wall-echo": [
    { id: "listen", label: "静听回声", hint: "恢复法力并获得 1 点悟机。", effects: { mana: 0.3, insight: 1 } },
    { id: "strike", label: "击壁寻源", hint: "损失少量血量，下一次道印可额外重观一次。", effects: { hp: -0.08, insight: 2 } },
    { id: "leave", label: "不为所动", hint: "小幅恢复血量，稳步前行。", effects: { hp: 0.12 } }
  ],
  "gold-spring": [
    { id: "heal", label: "引泉疗伤", hint: "恢复 35% 最大血量。", effects: { hp: 0.35 } },
    { id: "mana", label: "纳泉入脉", hint: "恢复 45% 最大法力。", effects: { mana: 0.45 } },
    { id: "temper", label: "淬炼筋骨", hint: "恢复较少，同时获得一次道印选择。", effects: { hp: 0.16, mana: 0.16, grantSeal: true } }
  ],
  "stone-weight": [
    { id: "carry", label: "负石登阶", hint: "承受损耗，获得 2 点悟机和一次道印选择。", effects: { hp: -0.12, insight: 2, grantSeal: true } },
    { id: "share", label: "与同行者分担", hint: "恢复少量法力；有同行者时效果提高。", effects: { mana: 0.25, companionBoost: true } },
    { id: "measure", label: "量力而行", hint: "恢复 15% 血量与法力。", effects: { hp: 0.15, mana: 0.15 } }
  ],
  "thunder-fork": [
    { id: "bright", label: "走明雷道", hint: "恢复法力，下一战更重神识。", effects: { mana: 0.25, tempSense: 0.08 } },
    { id: "dark", label: "走暗风道", hint: "损失少量血量，获得 2 点悟机。", effects: { hp: -0.08, insight: 2 } },
    { id: "center", label: "踏中线而行", hint: "均衡恢复血量与法力。", effects: { hp: 0.12, mana: 0.12 } }
  ],
  "wind-eye": [
    { id: "heal", label: "借风舒脉", hint: "恢复 28% 最大血量。", effects: { hp: 0.28 } },
    { id: "focus", label: "于风眼凝神", hint: "恢复 40% 法力，下一战神识提高。", effects: { mana: 0.4, tempSense: 0.06 } },
    { id: "seal", label: "捕捉风痕", hint: "获得一次道印选择。", effects: { grantSeal: true } }
  ],
  "flash-thought": [
    { id: "chase", label: "追逐电光", hint: "损失法力，获得一次道印选择。", effects: { mana: -0.18, grantSeal: true } },
    { id: "remember", label: "记下刹那", hint: "获得 2 点悟机。", effects: { insight: 2 } },
    { id: "release", label: "任其消散", hint: "恢复 18% 血量与法力。", effects: { hp: 0.18, mana: 0.18 } }
  ],
  "black-lotus": [
    { id: "red", label: "摘下赤瓣", hint: "恢复血量，但损失少量法力。", effects: { hp: 0.3, mana: -0.1 } },
    { id: "blue", label: "摘下蓝瓣", hint: "恢复法力，但损失少量血量。", effects: { hp: -0.08, mana: 0.4 } },
    { id: "black", label: "取走黑莲心", hint: "承受损耗，获得一次道印选择和悟机。", effects: { hp: -0.1, insight: 1, grantSeal: true } }
  ],
  "dead-isle": [
    { id: "fire", label: "燃火驱瘴", hint: "恢复 30% 血量。", effects: { hp: 0.3 } },
    { id: "meditate", label: "闭息调元", hint: "恢复 35% 法力和 10% 血量。", effects: { hp: 0.1, mana: 0.35 } },
    { id: "search", label: "搜寻遗物", hint: "获得 2 点悟机。", effects: { insight: 2 } }
  ],
  "marsh-shadow": [
    { id: "face", label: "直面旧影", hint: "损失少量血量，获得一次道印选择。", effects: { hp: -0.1, grantSeal: true } },
    { id: "question", label: "问它所惧", hint: "恢复法力并获得悟机。", effects: { mana: 0.2, insight: 1 } },
    { id: "pass", label: "与影擦肩", hint: "恢复 16% 血量与法力。", effects: { hp: 0.16, mana: 0.16 } }
  ],
  "old-ration": [
    { id: "share", label: "分给同行者", hint: "有同行者时恢复更多血量，否则获得 1 点悟机。", effects: { hp: 0.14, companionBoost: true, insight: 1 } },
    { id: "inspect", label: "查验军粮", hint: "获得 2 点悟机，但损失少量法力。", effects: { insight: 2, mana: -0.08 } },
    { id: "burn", label: "焚去旧册", hint: "恢复少量法力，避免旧因牵连。", effects: { mana: 0.2 } }
  ],
  "forge-rest": [
    { id: "temper", label: "入炉淬体", hint: "恢复血量，并让下一次道印更偏向守御。", effects: { hp: 0.24, insight: 1 } },
    { id: "cool", label: "借炉息火", hint: "恢复法力和少量血量。", effects: { hp: 0.1, mana: 0.28 } },
    { id: "search", label: "翻找炉渣", hint: "获得一次道印选择，但损失少量血量。", effects: { hp: -0.06, grantSeal: true } }
  ],
  "weighing-heart": [
    { id: "carry", label: "独负衡石", hint: "损失血量，获得 2 点悟机和一次道印选择。", effects: { hp: -0.12, insight: 2, grantSeal: true } },
    { id: "ask", label: "问石轻重", hint: "恢复法力并获得 1 点悟机。", effects: { mana: 0.24, insight: 1 } },
    { id: "leave", label: "放下此石", hint: "稳定恢复血量与法力。", effects: { hp: 0.14, mana: 0.14 } }
  ],
  "static-fork": [
    { id: "touch", label: "触碰静电", hint: "获得 2 点悟机，但损失少量法力。", effects: { insight: 2, mana: -0.1 } },
    { id: "follow", label: "跟随微光", hint: "恢复法力，下一场战斗获得少量神识。", effects: { mana: 0.26, tempSense: 0.05 } },
    { id: "avoid", label: "绕开雷痕", hint: "恢复少量血量，稳步前行。", effects: { hp: 0.16 } }
  ],
  "cloud-rest": [
    { id: "ride", label: "乘云调息", hint: "恢复 32% 法力。", effects: { mana: 0.32 } },
    { id: "watch", label: "观云识变", hint: "获得 2 点悟机，下一战神识提高。", effects: { insight: 2, tempSense: 0.06 } },
    { id: "anchor", label: "定住云根", hint: "恢复 22% 血量，避免风势侵蚀。", effects: { hp: 0.22 } }
  ],
  "thunder-memory": [
    { id: "remember", label: "接住旧忆", hint: "恢复法力并获得悟机。", effects: { mana: 0.2, insight: 1 } },
    { id: "break", label: "击碎旧忆", hint: "损失少量血量，获得一次道印选择。", effects: { hp: -0.08, grantSeal: true } },
    { id: "let-go", label: "任忆消散", hint: "恢复 18% 血量与法力。", effects: { hp: 0.18, mana: 0.18 } }
  ],
  "poison-lotus": [
    { id: "red", label: "取赤心", hint: "恢复血量，但损失少量法力。", effects: { hp: 0.28, mana: -0.1 } },
    { id: "black", label: "吞黑瓣", hint: "损失血量，获得一次道印选择和悟机。", effects: { hp: -0.1, insight: 1, grantSeal: true } },
    { id: "wait", label: "等莲自落", hint: "恢复法力，避免毒性深入。", effects: { mana: 0.32 } }
  ],
  "reed-rest": [
    { id: "dry", label: "借芦避瘴", hint: "恢复 26% 血量。", effects: { hp: 0.26 } },
    { id: "breathe", label: "闭息过洲", hint: "恢复 30% 法力，并获得 1 点悟机。", effects: { mana: 0.3, insight: 1 } },
    { id: "burn", label: "燃芦开路", hint: "恢复少量血量和法力，下一战敌方更容易受术法影响。", effects: { hp: 0.12, mana: 0.12, tempSense: 0.04 } }
  ],
  "old-mask": [
    { id: "wear", label: "戴上旧面", hint: "损失少量血量，获得一次道印选择。", effects: { hp: -0.08, grantSeal: true } },
    { id: "question", label: "问面中人", hint: "恢复法力并获得 2 点悟机。", effects: { mana: 0.2, insight: 2 } },
    { id: "bury", label: "埋入沼底", hint: "恢复 18% 血量与法力。", effects: { hp: 0.18, mana: 0.18 } }
  ]
};

const legacyDaoTrialSeals = [
  { id: "edge-intent", name: "青锋意", school: "攻伐", tags: ["tempo"], text: "攻击提高 10%。", effects: { attack: 0.1 } },
  { id: "star-edge", name: "星芒印", school: "攻伐", tags: ["tempo", "focus"], text: "攻击与神识各提高 6%。", effects: { attack: 0.06, divineSense: 0.06 } },
  { id: "breaking-edge", name: "破岳意", school: "攻伐", tags: ["risk"], text: "攻击提高 15%，防御降低 5%。", effects: { attack: 0.15, defense: -0.05 } },
  { id: "skill-tide", name: "术潮印", school: "攻伐", tags: ["arcane"], text: "技能伤害与持续效果提高 12%。", effects: { skillPower: 0.12 } },

  { id: "iron-wall", name: "铁壁印", school: "守御", tags: ["guard"], text: "防御提高 12%。", effects: { defense: 0.12 } },
  { id: "mountain-body", name: "山岳身", school: "守御", tags: ["guard", "vitality"], text: "血量提高 14%。", effects: { maxHp: 0.14 } },
  { id: "balanced-guard", name: "抱元印", school: "守御", tags: ["guard"], text: "防御与血量各提高 7%。", effects: { defense: 0.07, maxHp: 0.07 } },
  { id: "root-shelter", name: "逆五行", school: "守御", tags: ["guard", "arcane"], text: "灵根被克制时，惩罚降低一半。", effects: { rootResist: 0.5 } },

  { id: "deep-breath", name: "深息诀", school: "灵息", tags: ["focus"], text: "法力上限提高 15%。", effects: { maxMana: 0.15 } },
  { id: "clear-mind", name: "澄心印", school: "灵息", tags: ["focus"], text: "神识提高 12%。", effects: { divineSense: 0.12 } },
  { id: "mana-thread", name: "引灵丝", school: "灵息", tags: ["arcane"], text: "技能法力消耗降低 15%。", effects: { manaCost: -0.15 } },
  { id: "swift-cycle", name: "小周天", school: "灵息", tags: ["focus", "tempo"], text: "技能冷却减少 1 回合，最低仍为 1。", effects: { cooldown: -1 } },

  { id: "wind-step", name: "踏风印", school: "身法", tags: ["tempo"], text: "神识提高 8%，法力提高 6%。", effects: { divineSense: 0.08, maxMana: 0.06 } },
  { id: "first-light", name: "先觉印", school: "身法", tags: ["tempo", "focus"], text: "神识提高 15%，血量降低 4%。", effects: { divineSense: 0.15, maxHp: -0.04 } },
  { id: "cloud-armor", name: "云甲印", school: "身法", tags: ["tempo", "guard"], text: "神识和防御各提高 7%。", effects: { divineSense: 0.07, defense: 0.07 } },
  { id: "flowing-return", name: "流风回元", school: "身法", tags: ["tempo"], text: "每次战斗胜利后额外恢复 8% 血量。", effects: { postBattleHeal: 0.08 } },

  { id: "blood-price", name: "血炼印", school: "险道", tags: ["risk"], text: "攻击和技能效果提高 10%，血量降低 8%。", effects: { attack: 0.1, skillPower: 0.1, maxHp: -0.08 } },
  { id: "empty-vessel", name: "空灵体", school: "险道", tags: ["risk", "arcane"], text: "法力提高 22%，防御降低 7%。", effects: { maxMana: 0.22, defense: -0.07 } },
  { id: "unyielding", name: "不屈念", school: "险道", tags: ["risk", "vitality"], text: "血量低于一半时攻击提高 18%。", effects: { lowHpAttack: 0.18 } },
  { id: "poison-heart", name: "蚀心印", school: "险道", tags: ["risk", "arcane"], text: "持续伤害提高 20%，普通攻击降低 5%。", effects: { statusPower: 0.2, attack: -0.05 } },

  { id: "long-life", name: "长生息", school: "生机", tags: ["vitality"], text: "血量与法力各提高 9%。", effects: { maxHp: 0.09, maxMana: 0.09 } },
  { id: "spring-return", name: "回春印", school: "生机", tags: ["vitality"], text: "治疗类技能效果提高 25%。", effects: { healing: 0.25 } },
  { id: "after-battle", name: "战后调息", school: "生机", tags: ["vitality", "guard"], text: "每次战斗胜利后额外恢复 10% 法力。", effects: { postBattleMana: 0.1 } },
  { id: "companion-oath", name: "同心契", school: "生机", tags: ["vitality"], text: "同行者支援效果提高 50%；无同行者时血量提高 6%。", effects: { companion: 0.5, maxHpWithoutCompanion: 0.06 } },

  { id: "falling-star", name: "坠星锋", school: "攻伐", tags: ["tempo", "risk"], text: "攻击提高 8%，技能伤害提高 4%。", effects: { attack: 0.08, skillPower: 0.04 } },
  { id: "red-thread", name: "赤线诀", school: "攻伐", tags: ["risk"], text: "攻击提高 12%，血量上限降低 3%。", effects: { attack: 0.12, maxHp: -0.03 } },
  { id: "iron-roar", name: "铁吼印", school: "攻伐", tags: ["guard", "tempo"], text: "攻击与防御各提高 5%。", effects: { attack: 0.05, defense: 0.05 } },
  { id: "piercing-law", name: "穿云律", school: "攻伐", tags: ["focus", "arcane"], text: "技能效果提高 8%，神识提高 5%。", effects: { skillPower: 0.08, divineSense: 0.05 } },

  { id: "stone-vow", name: "磐石誓", school: "守御", tags: ["guard", "vitality"], text: "防御提高 9%。", effects: { defense: 0.09 } },
  { id: "earth-vein", name: "地脉息", school: "守御", tags: ["guard"], text: "血量与防御各提高 5%。", effects: { maxHp: 0.05, defense: 0.05 } },
  { id: "heavy-step", name: "重步印", school: "守御", tags: ["guard", "risk"], text: "防御提高 15%，神识降低 5%。", effects: { defense: 0.15, divineSense: -0.05 } },
  { id: "shelter-dawn", name: "朝垣印", school: "守御", tags: ["vitality", "focus"], text: "每次调息额外恢复 8% 血量。", effects: { restHp: 0.08 } },

  { id: "mist-mana", name: "雾行诀", school: "灵息", tags: ["arcane", "tempo"], text: "法力上限提高 10%，技能消耗降低 5%。", effects: { maxMana: 0.1, manaCost: -0.05 } },
  { id: "quiet-pulse", name: "静脉印", school: "灵息", tags: ["focus"], text: "神识提高 7%，每次事件额外获得少量法力。", effects: { divineSense: 0.07, eventMana: 0.06 } },
  { id: "returning-breath", name: "回息环", school: "灵息", tags: ["vitality", "focus"], text: "法力与血量各提高 6%。", effects: { maxMana: 0.06, maxHp: 0.06 } },
  { id: "spell-cicada", name: "蜕术蝉", school: "灵息", tags: ["arcane"], text: "技能效果提高 15%，普通攻击降低 4%。", effects: { skillPower: 0.15, attack: -0.04 } },

  { id: "afterimage-step", name: "残光步", school: "身法", tags: ["tempo", "focus"], text: "神识提高 10%。", effects: { divineSense: 0.1 } },
  { id: "reed-shadow", name: "芦影身", school: "身法", tags: ["tempo", "vitality"], text: "神识提高 6%，血量提高 8%。", effects: { divineSense: 0.06, maxHp: 0.08 } },
  { id: "wind-reserve", name: "蓄风印", school: "身法", tags: ["tempo"], text: "技能消耗降低 8%，神识提高 5%。", effects: { manaCost: -0.08, divineSense: 0.05 } },
  { id: "step-between", name: "步间界", school: "身法", tags: ["guard", "tempo"], text: "神识与防御各提高 5%，调息效果提高 8%。", effects: { divineSense: 0.05, defense: 0.05, restHp: 0.08 } },

  { id: "scarlet-hunger", name: "赤饥印", school: "险道", tags: ["risk", "tempo"], text: "血量低于一半时攻击与神识各提高 12%。", effects: { lowHpAttack: 0.12, lowHpSense: 0.12 } },
  { id: "venom-script", name: "毒经残章", school: "险道", tags: ["risk", "arcane"], text: "持续效果提高 24%，防御降低 4%。", effects: { statusPower: 0.24, defense: -0.04 } },
  { id: "borrowed-heart", name: "借心契", school: "险道", tags: ["risk", "vitality"], text: "同行者支援提高 25%，自身血量降低 5%。", effects: { companion: 0.25, maxHp: -0.05 } },
  { id: "last-light", name: "末光印", school: "险道", tags: ["risk"], text: "攻击提高 6%；挑战失败时结算分数额外提高 20%。", effects: { failScore: 0.2, attack: 0.06 } },

  { id: "warm-current", name: "暖流印", school: "生机", tags: ["vitality", "guard"], text: "调息和治疗效果提高 18%。", effects: { healing: 0.18, restHp: 0.08 } },
  { id: "shared-pulse", name: "同脉息", school: "生机", tags: ["vitality", "focus"], text: "有同行者时法力上限提高 12%，独行时悟机提高。", effects: { companionMana: 0.12, insightSolo: 1 } },
  { id: "green-return", name: "青回印", school: "生机", tags: ["vitality"], text: "每次战斗胜利后恢复 6% 血量与法力。", effects: { postBattleHeal: 0.06, postBattleMana: 0.06 } },
  { id: "life-knot", name: "生结印", school: "生机", tags: ["vitality", "guard"], text: "血量提高 10%，防御提高 4%，事件损耗降低。", effects: { maxHp: 0.1, defense: 0.04, eventLossResist: 0.15 } }
];

const daoTrialSealSchoolDefinitions = [
  { id: "attack", school: "攻伐", tags: ["attack", "tempo"], roots: ["裂岳", "追星", "鸣锋", "断潮", "惊鸿", "燃刃", "逐日", "破军"] },
  { id: "guard", school: "守御", tags: ["guard", "vitality"], roots: ["镇山", "玄甲", "磐心", "止戈", "承岳", "护元", "定海", "不动"] },
  { id: "focus", school: "灵息", tags: ["focus", "arcane"], roots: ["纳海", "观星", "澄神", "回澜", "抱月", "听雷", "归元", "灵台"] },
  { id: "tempo", school: "身法", tags: ["tempo", "focus"], roots: ["掠影", "乘风", "踏月", "逐电", "流云", "无迹", "回雪", "游龙"] },
  { id: "risk", school: "险道", tags: ["risk", "attack"], roots: ["燃命", "饮血", "蚀骨", "孤注", "逆脉", "焚心", "绝境", "夺寿"] },
  { id: "vitality", school: "生机", tags: ["vitality", "guard"], roots: ["回春", "青木", "长息", "润脉", "生莲", "复苏", "养元", "不息"] },
  { id: "element", school: "五行", tags: ["arcane", "element"], roots: ["金生", "木荣", "水衍", "火明", "土镇", "雷转", "冰凝", "风化"] },
  { id: "bond", school: "同契", tags: ["companion", "vitality"], roots: ["并肩", "照影", "合鸣", "守望", "同尘", "共济", "双曜", "一心"] }
];

const daoTrialSealForms = ["印", "诀", "环", "契"];
const roundedSealEffect = (value) => Math.round(value * 1000) / 1000;

function generatedSealEffects(schoolId, index) {
  const variant = index % 8;
  const rank = Math.floor(index / 8);
  const up = rank * 0.01;
  const profiles = {
    attack: [
      { attack: 0.07 + up },
      { attack: 0.04 + up / 2, skillPower: 0.05 + up },
      { skillPower: 0.08 + up },
      { attack: 0.1 + up, maxHp: -0.03 },
      { attack: 0.04 + up / 2, statusPower: 0.1 + up },
      { lowHpAttack: 0.12 + up, lowHpSense: 0.05 + up / 2 },
      { attack: 0.04 + up / 2, postBattleMana: 0.04 + up / 2 },
      { attack: 0.04 + up / 2, defense: 0.04 + up / 2 }
    ],
    guard: [
      { defense: 0.08 + up },
      { maxHp: 0.09 + up },
      { defense: 0.05 + up / 2, maxHp: 0.05 + up / 2 },
      { defense: 0.12 + up, divineSense: -0.03 },
      { rootResist: 0.18 + up * 2, defense: 0.03 + up / 2 },
      { lowHpAttack: 0.05 + up / 2, defense: 0.07 + up },
      { postBattleHeal: 0.04 + up / 2, defense: 0.03 + up / 2 },
      { eventLossResist: 0.1 + up, maxHp: 0.05 + up / 2 }
    ],
    focus: [
      { maxMana: 0.1 + up },
      { divineSense: 0.08 + up },
      { manaCost: -0.07 - up / 2, maxMana: 0.04 + up / 2 },
      { skillPower: 0.08 + up, attack: -0.02 },
      { cooldown: -1, maxMana: 0.03 + up / 2 },
      { highManaSense: 0.08 + up, lowManaCost: -0.06 - up / 2 },
      { postBattleMana: 0.06 + up / 2, divineSense: 0.03 + up / 2 },
      { eventMana: 0.05 + up / 2, maxMana: 0.05 + up / 2 }
    ],
    tempo: [
      { divineSense: 0.08 + up },
      { divineSense: 0.05 + up / 2, attack: 0.04 + up / 2 },
      { divineSense: 0.05 + up / 2, maxMana: 0.06 + up / 2 },
      { divineSense: 0.11 + up, maxHp: -0.03 },
      { cooldown: -1, divineSense: 0.03 + up / 2 },
      { lowHpSense: 0.12 + up, lowHpAttack: 0.04 + up / 2 },
      { postBattleHeal: 0.04 + up / 2, postBattleMana: 0.04 + up / 2 },
      { divineSense: 0.04 + up / 2, defense: 0.04 + up / 2 }
    ],
    risk: [
      { lowHpAttack: 0.13 + up, lowHpSense: 0.06 + up / 2 },
      { attack: 0.1 + up, maxHp: -0.05 },
      { skillPower: 0.12 + up, defense: -0.04 },
      { statusPower: 0.16 + up, maxMana: -0.04 },
      { maxMana: 0.16 + up, defense: -0.05 },
      { attack: 0.06 + up / 2, scoreRisk: 0.05 + up / 2 },
      { failScore: 0.1 + up, attack: 0.04 + up / 2 },
      { lowHpAttack: 0.1 + up, postBattleHeal: 0.03 + up / 2 }
    ],
    vitality: [
      { maxHp: 0.09 + up },
      { healing: 0.14 + up * 2 },
      { postBattleHeal: 0.06 + up / 2 },
      { postBattleMana: 0.06 + up / 2 },
      { maxHp: 0.05 + up / 2, maxMana: 0.05 + up / 2 },
      { missingHpHeal: 0.08 + up },
      { restHp: 0.06 + up / 2, eventMana: 0.04 + up / 2 },
      { maxHp: 0.05 + up / 2, defense: 0.04 + up / 2 }
    ],
    element: [
      { rootResist: 0.18 + up * 2 },
      { statusPower: 0.11 + up },
      { skillPower: 0.07 + up, divineSense: 0.03 + up / 2 },
      { attack: 0.05 + up / 2, rootResist: 0.1 + up },
      { defense: 0.05 + up / 2, rootResist: 0.1 + up },
      { statusPower: 0.1 + up, maxMana: 0.05 + up / 2 },
      { rootResist: 0.14 + up, postBattleMana: 0.04 + up / 2 },
      { attack: 0.03 + up / 2, defense: 0.03 + up / 2, divineSense: 0.03 + up / 2 }
    ],
    bond: [
      { companion: 0.16 + up, maxHpWithoutCompanion: 0.05 + up / 2 },
      { companionMana: 0.08 + up, maxMana: 0.03 + up / 2 },
      { companion: 0.1 + up, attack: 0.03 + up / 2 },
      { companion: 0.1 + up, defense: 0.03 + up / 2 },
      { companion: 0.1 + up, divineSense: 0.03 + up / 2 },
      { companion: 0.12 + up, postBattleHeal: 0.03 + up / 2 },
      { maxHpWithoutCompanion: 0.08 + up, attack: 0.03 + up / 2 },
      { companionMana: 0.06 + up / 2, maxHpWithoutCompanion: 0.06 + up / 2 }
    ]
  };
  return Object.fromEntries(Object.entries(profiles[schoolId][variant]).map(([key, value]) => [key, roundedSealEffect(value)]));
}

const daoTrialSealEffectLabels = {
  attack: "攻击", defense: "防御", maxHp: "气血上限", maxMana: "法力上限", divineSense: "神识",
  skillPower: "技能效果", statusPower: "持续效果", manaCost: "技能消耗", cooldown: "技能冷却",
  lowHpAttack: "低血攻击", lowHpSense: "低血神识", postBattleHeal: "胜后气血恢复", postBattleMana: "胜后法力恢复",
  rootResist: "灵根克制抗性", eventLossResist: "事件损耗抗性", eventMana: "事件法力恢复", restHp: "调息气血恢复",
  healing: "治疗效果", missingHpHeal: "缺失气血恢复", scoreRisk: "风险得分", failScore: "失败得分",
  companion: "同行支援", companionMana: "同行法力", maxHpWithoutCompanion: "独行气血"
};

function generatedSealText(effects) {
  return Object.entries(effects).map(([key, value]) => {
    const label = daoTrialSealEffectLabels[key] || key;
    if (key === "cooldown") return `${label}减少 ${Math.abs(value)} 回合`;
    const percent = Math.round(Math.abs(value) * 100);
    return `${label}${value >= 0 ? "提高" : "降低"} ${percent}%`;
  }).join("；") + "。";
}

const expandedDaoTrialSeals = daoTrialSealSchoolDefinitions.flatMap((definition) => {
  const existingCount = legacyDaoTrialSeals.filter((seal) => seal.school === definition.school).length;
  return Array.from({ length: 32 - existingCount }, (_, offset) => {
    const index = existingCount + offset;
    const root = definition.roots[Math.floor(index / 4)];
    const form = daoTrialSealForms[index % daoTrialSealForms.length];
    const effects = generatedSealEffects(definition.id, index);
    return {
      id: `expanded-${definition.id}-${String(index + 1).padStart(2, "0")}`,
      name: `${root}${form}`,
      school: definition.school,
      family: root,
      form,
      tags: [...new Set([...definition.tags, index % 3 === 0 ? "vitality" : index % 3 === 1 ? "focus" : "tempo"])],
      text: generatedSealText(effects),
      effects
    };
  });
});

export const daoTrialSeals = [...legacyDaoTrialSeals, ...expandedDaoTrialSeals];

const sealResonanceDefinitions = {
  "攻伐": [{ attack: 0.03 }, { attack: 0.04, skillPower: 0.05 }, { attack: 0.05, postBattleMana: 0.05 }],
  "守御": [{ defense: 0.03 }, { defense: 0.04, maxHp: 0.05 }, { defense: 0.05, rootResist: 0.12 }],
  "灵息": [{ maxMana: 0.04 }, { divineSense: 0.04, manaCost: -0.04 }, { skillPower: 0.06, postBattleMana: 0.05 }],
  "身法": [{ divineSense: 0.03 }, { divineSense: 0.04, cooldown: -1 }, { attack: 0.04, postBattleHeal: 0.05 }],
  "险道": [{ lowHpAttack: 0.05 }, { skillPower: 0.06, scoreRisk: 0.04 }, { lowHpAttack: 0.08, lowHpSense: 0.08 }],
  "生机": [{ maxHp: 0.04 }, { healing: 0.08, postBattleHeal: 0.04 }, { missingHpHeal: 0.08, postBattleMana: 0.05 }],
  "五行": [{ rootResist: 0.1 }, { statusPower: 0.06, skillPower: 0.04 }, { rootResist: 0.15, divineSense: 0.05 }],
  "同契": [{ companion: 0.08, maxHpWithoutCompanion: 0.03 }, { companion: 0.12, companionMana: 0.05 }, { companion: 0.16, maxHpWithoutCompanion: 0.08 }]
};

export const daoTrialSealSchoolResonances = Object.entries(sealResonanceDefinitions).flatMap(([school, stages]) => (
  [2, 4, 6].map((threshold, index) => ({
    id: `school-${daoTrialSealSchoolDefinitions.find((entry) => entry.school === school)?.id}-${threshold}`,
    name: `${school}${["初鸣", "成势", "圆满"][index]}`,
    school,
    threshold,
    text: `持有 ${threshold} 枚${school}道印，${generatedSealText(stages[index]).replace(/。$/, "")}。`,
    effects: stages[index]
  }))
));

export const daoTrialSealSynergies = [
  { id: "iron-mountain", name: "铁山成壁", seals: ["iron-wall", "mountain-body"], text: "血量与防御额外提高 5%。", effects: { maxHp: 0.05, defense: 0.05 } },
  { id: "wind-star", name: "风星同轨", seals: ["star-edge", "wind-step"], text: "神识额外提高 8%。", effects: { divineSense: 0.08 } },
  { id: "blood-return", name: "血火回生", seals: ["blood-price", "spring-return"], text: "攻击提高 5%，治疗效果提高 10%。", effects: { attack: 0.05, healing: 0.1 } },
  { id: "quiet-cycle", name: "静息周天", seals: ["clear-mind", "swift-cycle"], text: "技能消耗降低 8%。", effects: { manaCost: -0.08 } },
  { id: "same-heart", name: "同心长生", seals: ["companion-oath", "shared-pulse"], text: "同行者支援效果额外提高 20%。", effects: { companion: 0.2 } },
  { id: "poison-cloud", name: "蚀云成势", seals: ["poison-heart", "venom-script"], text: "持续效果额外提高 12%。", effects: { statusPower: 0.12 } }
];

// Mechanic-oriented augments. The battle engine consumes these through the
// stable trigger/effect fields instead of embedding law-specific branches.
const legacyDaoTrialLaws = [
  { id: "triple-edge", name: "剑鸣三叠", school: "攻伐连锁", rarity: "silver", tags: ["tempo", "attack"], trigger: "onAttackCount", text: "每三次普通攻击追加一次余波。", effects: { attackEchoEvery: 3, attackEchoPower: 0.45 } },
  { id: "opening-break", name: "破势追击", school: "攻伐连锁", rarity: "silver", tags: ["tempo", "risk"], trigger: "battleStart", text: "敌方气血高于 80% 时，首次技能伤害提高 24%。", effects: { openingSkillPower: 0.24 } },
  { id: "execution-return", name: "斩意回流", school: "攻伐连锁", rarity: "gold", tags: ["attack", "tempo"], trigger: "afterBattle", text: "击败敌人后，下一场战斗攻击提高 12%。", effects: { nextBattleAttack: 0.12 } },
  { id: "mana-loop", name: "灵潮回环", school: "技能循环", rarity: "silver", tags: ["focus", "arcane"], trigger: "onSkillCount", text: "每第三次施法减少一次法力消耗。", effects: { freeSkillEvery: 3 } },
  { id: "spell-echo", name: "术后余音", school: "技能循环", rarity: "gold", tags: ["arcane", "tempo"], trigger: "afterSkill", text: "技能命中后有概率追加 35% 技能余波。", effects: { skillEchoChance: 0.35, skillEchoPower: 0.35 } },
  { id: "clear-mind-law", name: "澄心观法", school: "技能循环", rarity: "silver", tags: ["focus", "vitality"], trigger: "roundStart", text: "法力高于 70% 时神识提高，低于 30% 时技能消耗降低。", effects: { highManaSense: 0.12, lowManaCost: -0.12 } },
  { id: "iron-rebound", name: "铁壁反震", school: "守御反击", rarity: "silver", tags: ["guard", "risk"], trigger: "onTakeDamage", text: "受到攻击后积累反击值。", effects: { reflectCharge: 0.18 } },
  { id: "steady-heart", name: "守中不乱", school: "守御反击", rarity: "silver", tags: ["guard", "focus"], trigger: "roundStart", text: "上一回合未受伤时获得短暂减伤。", effects: { noHitShield: 0.12 } },
  { id: "unyielding-law", name: "不退之志", school: "守御反击", rarity: "diamond", tags: ["guard", "vitality"], trigger: "onLethal", text: "首次受到致命伤害时保留 1 点气血。", effects: { lethalGuard: true } },
  { id: "overheal-shield", name: "春风化雨", school: "生机转化", rarity: "silver", tags: ["vitality", "guard"], trigger: "onHeal", text: "溢出治疗转化为护盾。", effects: { overhealShield: 0.7 } },
  { id: "breath-loop", name: "回息成环", school: "生机转化", rarity: "silver", tags: ["vitality", "tempo"], trigger: "afterBattle", text: "战斗胜利后按缺失气血恢复。", effects: { missingHpHeal: 0.16 } },
  { id: "endless-life", name: "生生不绝", school: "生机转化", rarity: "gold", tags: ["vitality", "focus"], trigger: "onHealCount", text: "连续两次治疗后提高下一次治疗效果。", effects: { healCountBoost: 0.2 } },
  { id: "blood-asking", name: "血炼问道", school: "风险流派", rarity: "silver", tags: ["risk", "attack"], trigger: "onLowHp", text: "气血低于 50% 时提高攻击和神识。", effects: { lowHpAttack: 0.14, lowHpSense: 0.14 } },
  { id: "borrowed-life-law", name: "借命一线", school: "风险流派", rarity: "gold", tags: ["risk", "arcane"], trigger: "runStart", text: "降低最大气血，换取战斗分和技能效果。", effects: { maxHp: -0.08, skillPower: 0.12, scoreRisk: 0.12 } },
  { id: "poison-formation", name: "毒经成势", school: "风险流派", rarity: "silver", tags: ["risk", "arcane"], trigger: "onStatus", text: "持续伤害命中后叠加下一次持续伤害。", effects: { statusPower: 0.2, dotStack: 0.08 } },
  { id: "same-heart-law", name: "同心共鸣", school: "同行共鸣", rarity: "gold", tags: ["vitality", "companion"], trigger: "onCompanionAssist", text: "同行支援间隔缩短，并强化下一次玩家技能。", effects: { companionFrequency: -1, companionPower: 0.2 } },
  { id: "twin-array", name: "双生战阵", school: "同行共鸣", rarity: "silver", tags: ["tempo", "companion"], trigger: "onCompanionAssist", text: "同行出手后强化玩家下一次技能。", effects: { companionSkillPower: 0.16 } },
  { id: "mirror-friend", name: "以友为镜", school: "同行共鸣", rarity: "gold", tags: ["focus", "companion"], trigger: "onCompanionSkill", text: "同行使用主动支援时复制部分玩家当前增益。", effects: { companionCopy: 0.35 } }
];

const expandedDaoTrialLaws = [
  { id: "edge-pressure", name: "锋压如山", school: "攻伐连锁", rarity: "silver", tags: ["attack", "guard"], trigger: "battleStart", text: "攻击提高 7%。", effects: { attack: 0.07 } },
  { id: "relentless-step", name: "连步追魂", school: "攻伐连锁", rarity: "silver", tags: ["attack", "tempo"], trigger: "roundStart", text: "攻击与神识各提高 5%。", effects: { attack: 0.05, divineSense: 0.05 } },
  { id: "armor-sunder-law", name: "摧甲锋意", school: "攻伐连锁", rarity: "silver", tags: ["attack", "arcane"], trigger: "onSkill", text: "技能效果提高 9%。", effects: { skillPower: 0.09 } },
  { id: "hundred-blades", name: "百刃同鸣", school: "攻伐连锁", rarity: "gold", tags: ["attack", "tempo"], trigger: "onAttackCount", text: "每两次普通攻击追加 30% 攻击余波。", effects: { attackEchoEvery: 2, attackEchoPower: 0.3 } },
  { id: "sword-domain", name: "万剑归宗", school: "攻伐连锁", rarity: "diamond", tags: ["attack", "tempo"], trigger: "afterBattle", text: "攻击和技能效果提高 12%，胜利后下一战攻击再提高 12%。", effects: { attack: 0.12, skillPower: 0.12, nextBattleAttack: 0.12 } },

  { id: "deep-channel", name: "灵海深流", school: "技能循环", rarity: "silver", tags: ["focus", "arcane"], trigger: "runStart", text: "法力上限提高 12%。", effects: { maxMana: 0.12 } },
  { id: "quick-incantation", name: "疾咒无滞", school: "技能循环", rarity: "silver", tags: ["focus", "tempo"], trigger: "onSkill", text: "技能冷却减少 1 回合。", effects: { cooldown: -1 } },
  { id: "spirit-reserve", name: "藏灵归窍", school: "技能循环", rarity: "silver", tags: ["focus", "vitality"], trigger: "afterBattle", text: "战斗胜利后恢复 9% 法力。", effects: { postBattleMana: 0.09 } },
  { id: "arcane-overflow", name: "术海迭浪", school: "技能循环", rarity: "gold", tags: ["arcane", "tempo"], trigger: "afterSkill", text: "技能命中后有 28% 概率追加 45% 余波。", effects: { skillEchoChance: 0.28, skillEchoPower: 0.45 } },
  { id: "boundless-casting", name: "周天无尽", school: "技能循环", rarity: "diamond", tags: ["focus", "arcane"], trigger: "onSkillCount", text: "每第二次施法不消耗法力，并有概率追加术法余波。", effects: { freeSkillEvery: 2, skillEchoChance: 0.22, skillEchoPower: 0.3 } },

  { id: "stone-skin-law", name: "玄岩法身", school: "守御反击", rarity: "silver", tags: ["guard", "vitality"], trigger: "runStart", text: "防御提高 9%。", effects: { defense: 0.09 } },
  { id: "vitality-guard-law", name: "厚土载生", school: "守御反击", rarity: "silver", tags: ["guard", "vitality"], trigger: "runStart", text: "气血上限提高 11%。", effects: { maxHp: 0.11 } },
  { id: "root-ward-law", name: "五行护命", school: "守御反击", rarity: "silver", tags: ["guard", "element"], trigger: "battleStart", text: "灵根克制惩罚降低 30%。", effects: { rootResist: 0.3 } },
  { id: "rebound-domain", name: "反照玄域", school: "守御反击", rarity: "gold", tags: ["guard", "risk"], trigger: "onTakeDamage", text: "受到攻击后反震 26% 伤害。", effects: { reflectCharge: 0.26 } },
  { id: "tranquil-fortress", name: "寂然天垒", school: "守御反击", rarity: "gold", tags: ["guard", "focus"], trigger: "roundStart", text: "防御提高 7%，上一回合未受伤时获得更强减伤。", effects: { defense: 0.07, noHitShield: 0.18 } },

  { id: "healing-current-law", name: "青流润脉", school: "生机转化", rarity: "silver", tags: ["vitality", "focus"], trigger: "onHeal", text: "治疗效果提高 18%。", effects: { healing: 0.18 } },
  { id: "victory-breath", name: "胜后纳息", school: "生机转化", rarity: "silver", tags: ["vitality", "tempo"], trigger: "afterBattle", text: "战斗胜利后恢复 8% 气血。", effects: { postBattleHeal: 0.08 } },
  { id: "balanced-life-law", name: "水木相济", school: "生机转化", rarity: "silver", tags: ["vitality", "arcane"], trigger: "runStart", text: "气血和法力上限各提高 7%。", effects: { maxHp: 0.07, maxMana: 0.07 } },
  { id: "overflowing-spring", name: "灵泉覆体", school: "生机转化", rarity: "gold", tags: ["vitality", "guard"], trigger: "onHeal", text: "治疗提高 10%，溢出治疗的 90% 转为护盾。", effects: { healing: 0.1, overhealShield: 0.9 } },
  { id: "immortal-spring", name: "枯木逢春", school: "生机转化", rarity: "diamond", tags: ["vitality", "guard"], trigger: "onLethal", text: "首次致命伤保留生机，胜后按缺失气血恢复并强化治疗。", effects: { lethalGuard: true, missingHpHeal: 0.2, healing: 0.2 } },

  { id: "blood-sense-law", name: "血照灵台", school: "风险流派", rarity: "silver", tags: ["risk", "focus"], trigger: "onLowHp", text: "低血时攻击提高 12%、神识提高 9%。", effects: { lowHpAttack: 0.12, lowHpSense: 0.09 } },
  { id: "venom-heart-law", name: "蚀心毒意", school: "风险流派", rarity: "silver", tags: ["risk", "arcane"], trigger: "onStatus", text: "持续效果提高 16%。", effects: { statusPower: 0.16 } },
  { id: "empty-blood-law", name: "空血藏灵", school: "风险流派", rarity: "silver", tags: ["risk", "focus"], trigger: "runStart", text: "法力提高 14%，防御降低 4%。", effects: { maxMana: 0.14, defense: -0.04 } },
  { id: "razor-fate", name: "刃上问命", school: "风险流派", rarity: "gold", tags: ["risk", "attack"], trigger: "runStart", text: "攻击提高 13%、风险得分提高，气血上限降低 6%。", effects: { attack: 0.13, scoreRisk: 0.08, maxHp: -0.06 } },
  { id: "life-wager", name: "向死而生", school: "风险流派", rarity: "diamond", tags: ["risk", "attack"], trigger: "onLethal", text: "攻击和技能效果提高 18%，降低气血上限，并可抵挡一次致命伤。", effects: { attack: 0.18, skillPower: 0.18, maxHp: -0.12, lethalGuard: true } },

  { id: "shared-breath-law", name: "同息相扶", school: "同行共鸣", rarity: "silver", tags: ["companion", "vitality"], trigger: "runStart", text: "同行支援提高 12%；独行时气血提高 5%。", effects: { companion: 0.12, maxHpWithoutCompanion: 0.05 } },
  { id: "shared-mana-law", name: "灵脉共流", school: "同行共鸣", rarity: "silver", tags: ["companion", "focus"], trigger: "runStart", text: "有同行者时法力提高 10%；独行时气血提高 4%。", effects: { companionMana: 0.1, maxHpWithoutCompanion: 0.04 } },
  { id: "shared-edge-law", name: "并锋同行", school: "同行共鸣", rarity: "silver", tags: ["companion", "attack"], trigger: "onCompanionAssist", text: "攻击提高 6%，同行支援提高 8%。", effects: { attack: 0.06, companion: 0.08 } },
  { id: "shared-guard-law", name: "共守心门", school: "同行共鸣", rarity: "silver", tags: ["companion", "guard"], trigger: "onCompanionAssist", text: "防御提高 6%，同行支援提高 8%。", effects: { defense: 0.06, companion: 0.08 } },
  { id: "twin-stars-law", name: "两仪同心", school: "同行共鸣", rarity: "diamond", tags: ["companion", "focus"], trigger: "onCompanionAssist", text: "同行出手更频繁、支援更强并复制部分增益；独行时提高气血。", effects: { companionFrequency: -1, companionPower: 0.3, companionCopy: 0.25, maxHpWithoutCompanion: 0.08 } },

  { id: "metal-cycle-law", name: "金行肃杀", school: "五行衍化", rarity: "silver", tags: ["element", "attack"], trigger: "battleStart", text: "攻击提高 6%，灵根克制抗性提高 10%。", effects: { attack: 0.06, rootResist: 0.1 } },
  { id: "wood-cycle-law", name: "木行滋荣", school: "五行衍化", rarity: "silver", tags: ["element", "vitality"], trigger: "afterBattle", text: "气血提高 6%，胜后恢复 5% 气血。", effects: { maxHp: 0.06, postBattleHeal: 0.05 } },
  { id: "water-cycle-law", name: "水行归藏", school: "五行衍化", rarity: "silver", tags: ["element", "focus"], trigger: "afterBattle", text: "法力提高 7%，胜后恢复 5% 法力。", effects: { maxMana: 0.07, postBattleMana: 0.05 } },
  { id: "fire-cycle-law", name: "火行燎原", school: "五行衍化", rarity: "silver", tags: ["element", "arcane"], trigger: "onStatus", text: "技能和持续效果各提高 7%。", effects: { skillPower: 0.07, statusPower: 0.07 } },
  { id: "earth-cycle-law", name: "土行镇守", school: "五行衍化", rarity: "silver", tags: ["element", "guard"], trigger: "battleStart", text: "防御提高 7%，灵根克制抗性提高 12%。", effects: { defense: 0.07, rootResist: 0.12 } },
  { id: "element-harmony-law", name: "五气朝元", school: "五行衍化", rarity: "gold", tags: ["element", "vitality"], trigger: "runStart", text: "攻防神识各提高 6%，灵根克制抗性提高 20%。", effects: { attack: 0.06, defense: 0.06, divineSense: 0.06, rootResist: 0.2 } },
  { id: "element-reversal-law", name: "逆转五行", school: "五行衍化", rarity: "gold", tags: ["element", "arcane"], trigger: "battleStart", text: "大幅削弱灵根克制，并提高技能与持续效果。", effects: { rootResist: 0.45, skillPower: 0.1, statusPower: 0.1 } },
  { id: "element-domain-law", name: "五行轮转", school: "五行衍化", rarity: "diamond", tags: ["element", "arcane"], trigger: "battleStart", text: "灵根克制惩罚降低 70%，技能、持续效果和神识提高 15%。", effects: { rootResist: 0.7, skillPower: 0.15, statusPower: 0.15, divineSense: 0.15 } },

  { id: "rest-fate-law", name: "静处逢生", school: "命数经营", rarity: "silver", tags: ["fate", "vitality"], trigger: "onRest", text: "调息恢复提高 10%。", effects: { restHp: 0.1 } },
  { id: "event-fate-law", name: "遇事藏灵", school: "命数经营", rarity: "silver", tags: ["fate", "focus"], trigger: "onEvent", text: "事件中的法力恢复提高 9%。", effects: { eventMana: 0.09 } },
  { id: "safe-fate-law", name: "趋吉避凶", school: "命数经营", rarity: "silver", tags: ["fate", "guard"], trigger: "onEvent", text: "事件损耗降低 20%。", effects: { eventLossResist: 0.2 } },
  { id: "victory-fate-law", name: "胜机回转", school: "命数经营", rarity: "silver", tags: ["fate", "tempo"], trigger: "afterBattle", text: "胜利后恢复 5% 气血与法力。", effects: { postBattleHeal: 0.05, postBattleMana: 0.05 } },
  { id: "score-fate-law", name: "险中求果", school: "命数经营", rarity: "silver", tags: ["fate", "risk"], trigger: "runStart", text: "风险得分提高 7%。", effects: { scoreRisk: 0.07 } },
  { id: "fortune-current-law", name: "福祸相倚", school: "命数经营", rarity: "gold", tags: ["fate", "risk"], trigger: "runStart", text: "风险与失败得分提高，并获得少量攻防。", effects: { scoreRisk: 0.1, failScore: 0.12, attack: 0.05, defense: 0.05 } },
  { id: "fate-reserve-law", name: "留一线天机", school: "命数经营", rarity: "gold", tags: ["fate", "vitality"], trigger: "afterBattle", text: "胜利后恢复 8% 气血与法力，事件损耗降低。", effects: { postBattleHeal: 0.08, postBattleMana: 0.08, eventLossResist: 0.15 } },
  { id: "rewrite-fate-law", name: "改命一掷", school: "命数经营", rarity: "diamond", tags: ["fate", "risk"], trigger: "runStart", text: "攻防神识提高 8%，胜后恢复气血法力，并提高风险得分。", effects: { attack: 0.08, defense: 0.08, divineSense: 0.08, postBattleHeal: 0.08, postBattleMana: 0.08, scoreRisk: 0.08 } }
];

export const daoTrialLaws = [...legacyDaoTrialLaws, ...expandedDaoTrialLaws];

export const daoTrialLawMap = Object.fromEntries(daoTrialLaws.map((law) => [law.id, law]));

export const daoTrialSealMap = Object.fromEntries(daoTrialSeals.map((seal) => [seal.id, seal]));
export const daoTrialRouteMap = Object.fromEntries(daoTrialRoutes.map((route) => [route.id, route]));
