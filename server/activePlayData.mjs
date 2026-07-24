export const activePlayVersion = 1;

export const actionEconomy = {
  baseDaily: 1,
  taskThresholds: [100, 300, 500],
  carryLimit: 2,
  hardCap: 6
};

export const combatStances = [
  {
    id: "balanced",
    name: "守正",
    short: "攻守均衡",
    text: "不偏不倚，按战况选择功法。",
    modifiers: {}
  },
  {
    id: "assault",
    name: "强攻",
    short: "抢先压制",
    text: "攻击提高 14%，防御降低 10%，优先使用攻伐功法。",
    modifiers: { attack: 0.14, defense: -0.1, manaCost: 0.06 }
  },
  {
    id: "guard",
    name: "稳守",
    short: "护体反击",
    text: "防御提高 18%，攻击降低 8%，优先使用护体功法。",
    modifiers: { attack: -0.08, defense: 0.18, maxHp: 0.08 }
  },
  {
    id: "control",
    name: "控场",
    short: "后发制人",
    text: "神识提高 16%，优先使用控制与削弱功法。",
    modifiers: { divineSense: 0.16, attack: -0.04 }
  },
  {
    id: "spirit",
    name: "蓄灵",
    short: "灵力绵长",
    text: "法力上限提高 22%，技能消耗降低 10%，攻击降低 5%。",
    modifiers: { maxMana: 0.22, manaCost: -0.1, attack: -0.05 }
  }
];

export const battleCommands = [
  {
    id: "burst",
    name: "破釜",
    text: "两回合内攻击提高 24%，防御降低 12%。",
    npcText: "抓住破绽，以攻代守。"
  },
  {
    id: "bulwark",
    name: "固守",
    text: "获得持续两回合的 32% 伤害减免。",
    npcText: "稳住阵脚，等待反击。"
  },
  {
    id: "restore",
    name: "回元",
    text: "立即恢复 28% 最大法力，并使所有功法冷却缩短一回合。",
    npcText: "回转灵机，重整功法循环。"
  },
  {
    id: "focus",
    name: "破阵",
    text: "令对手防御降低 18%，持续两回合。",
    npcText: "识破阵眼，集中攻势。"
  }
];

export const sectFormations = [
  {
    id: "spearhead",
    name: "锋矢阵",
    text: "攻击提高 16%，防御降低 6%。",
    modifiers: { attack: 0.16, defense: -0.06 }
  },
  {
    id: "tortoise",
    name: "龟甲阵",
    text: "防御提高 18%，血量提高 10%，神识降低 5%。",
    modifiers: { defense: 0.18, maxHp: 0.1, divineSense: -0.05 }
  },
  {
    id: "five-elements",
    name: "五行轮转",
    text: "队伍基础灵根越丰富，神识与法力加成越高。",
    modifiers: { adaptive: true }
  }
];

export const expeditionRoutes = [
  {
    id: "green-ridge",
    name: "青岚古道",
    subtitle: "稳中求进",
    accent: "jade",
    text: "灵兽与古修遗迹交错，适合检验均衡构筑。",
    difficulty: 0.84,
    rewardBias: "spirit",
    nodes: [
      { id: "ridge-ambush", type: "battle", name: "竹海伏影", text: "林间妖影试探来客。" },
      { id: "ridge-choice", type: "event", name: "断碑岔路", text: "碑后灵泉与山巅剑痕只能择一。" },
      { id: "ridge-warden", type: "boss", name: "青岚守山猿", text: "守山灵猿拦住古道尽头。" }
    ]
  },
  {
    id: "ember-rift",
    name: "赤烬裂谷",
    subtitle: "以险换宝",
    accent: "vermilion",
    text: "地火旺盛，敌人攻势更烈，装备与功法残页更常出现。",
    difficulty: 0.94,
    rewardBias: "manual",
    nodes: [
      { id: "ember-raiders", type: "battle", name: "焦土劫修", text: "劫修借地火布下杀局。" },
      { id: "ember-choice", type: "event", name: "地火灵穴", text: "可引火淬体，也可收束灵焰换取物资。" },
      { id: "ember-lord", type: "boss", name: "焚岩赤蛟", text: "赤蛟盘踞裂谷灵脉。" }
    ]
  },
  {
    id: "moon-marsh",
    name: "玄月幽泽",
    subtitle: "控场试炼",
    accent: "moon",
    text: "迷雾削弱感知，善用控制、护体与回灵才能走远。",
    difficulty: 1.02,
    rewardBias: "dust",
    nodes: [
      { id: "marsh-wraith", type: "battle", name: "雾泽阴灵", text: "阴灵从水镜倒影中袭来。" },
      { id: "marsh-choice", type: "event", name: "月下残舟", text: "残舟中藏有旧宗遗物，也潜伏未知诅咒。" },
      { id: "marsh-matriarch", type: "boss", name: "玄水蛛母", text: "蛛丝封住幽泽归路。" }
    ]
  }
];

export const expeditionEventOptions = {
  "ridge-choice": [
    { id: "spring", label: "饮下灵泉", hint: "恢复气血与法力", effects: { heal: 0.28, mana: 0.28 } },
    { id: "sword", label: "参悟剑痕", hint: "承受损耗，获得临时攻击", effects: { hpCost: 0.12, runAttack: 0.16 } },
    { id: "supplies", label: "搜集灵材", hint: "获得宗门物资", effects: { supplies: 14 } }
  ],
  "ember-choice": [
    { id: "temper", label: "引火淬体", hint: "损失气血，强化本轮攻防", effects: { hpCost: 0.18, runAttack: 0.12, runDefense: 0.12 } },
    { id: "bottle", label: "收取灵焰", hint: "获得灵石与灵尘", effects: { spirit: 22, dust: 8 } },
    { id: "rest", label: "封穴调息", hint: "安全恢复气血与法力", effects: { heal: 0.35, mana: 0.42 } }
  ],
  "marsh-choice": [
    { id: "relic", label: "登舟取遗物", hint: "高风险获得更多战利品", effects: { hpCost: 0.2, bonusRewards: 1 } },
    { id: "ward", label: "布下避邪阵", hint: "本轮防御与神识提高", effects: { runDefense: 0.18, runSense: 0.14 } },
    { id: "leave", label: "绕开残舟", hint: "恢复气血，稳妥前进", effects: { heal: 0.32 } }
  ]
};

export const sectOperations = [
  {
    id: "patrol",
    name: "山门巡查",
    text: "清理山门周边隐患，风险较低，稳定获得物资与声望。",
    difficulty: 0.82,
    cost: 1,
    reward: { supplies: 20, reputation: 5, spirit: 12 }
  },
  {
    id: "hunt",
    name: "清剿妖患",
    text: "追踪侵扰灵田的妖群，风险适中，更容易获得灵尘。",
    difficulty: 1,
    cost: 1,
    reward: { supplies: 14, reputation: 7, spirit: 16, dust: 10 }
  },
  {
    id: "border",
    name: "边境试探",
    text: "与敌宗巡队交锋，风险较高，可获得战略情报与大量声望。",
    difficulty: 1.16,
    cost: 1,
    reward: { supplies: 10, reputation: 12, spirit: 24, intel: 1 }
  }
];

const movementSkillTypes = new Set(["dodge", "evasionBuff", "speedStrike"]);
const supportSkillTypes = new Set(["shield", "defenseBuff", "heal", "reflect", "field"]);
const controlSkillTypes = new Set(["stun", "manaBurn", "weaken", "dot", "dotStrike"]);

export function combatSkillRole(skill = {}) {
  if (movementSkillTypes.has(skill.type)) return "movement";
  if (supportSkillTypes.has(skill.type)) return "support";
  if (controlSkillTypes.has(skill.type)) return "control";
  return "offense";
}
