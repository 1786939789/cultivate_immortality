export const daoTrialCycleLength = 7;
export const daoTrialOfficialAttempts = 3;

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

export const daoTrialSeals = [
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

export const daoTrialSealSynergies = [
  { id: "iron-mountain", name: "铁山成壁", seals: ["iron-wall", "mountain-body"], text: "血量与防御额外提高 5%。", effects: { maxHp: 0.05, defense: 0.05 } },
  { id: "wind-star", name: "风星同轨", seals: ["star-edge", "wind-step"], text: "神识额外提高 8%。", effects: { divineSense: 0.08 } },
  { id: "blood-return", name: "血火回生", seals: ["blood-price", "spring-return"], text: "攻击提高 5%，治疗效果提高 10%。", effects: { attack: 0.05, healing: 0.1 } },
  { id: "quiet-cycle", name: "静息周天", seals: ["clear-mind", "swift-cycle"], text: "技能消耗降低 8%。", effects: { manaCost: -0.08 } },
  { id: "same-heart", name: "同心长生", seals: ["companion-oath", "shared-pulse"], text: "同行者支援效果额外提高 20%。", effects: { companion: 0.2 } },
  { id: "poison-cloud", name: "蚀云成势", seals: ["poison-heart", "venom-script"], text: "持续效果额外提高 12%。", effects: { statusPower: 0.12 } }
];

export const daoTrialSealMap = Object.fromEntries(daoTrialSeals.map((seal) => [seal.id, seal]));
export const daoTrialRouteMap = Object.fromEntries(daoTrialRoutes.map((route) => [route.id, route]));
