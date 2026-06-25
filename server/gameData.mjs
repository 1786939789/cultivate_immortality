export const realmStages = ["炼气", "筑基", "结丹", "元婴", "化神", "炼虚", "合体", "大乘", "真仙"];

export const realmLevelNames = ["一层", "二层", "三层", "四层", "五层", "六层", "七层", "八层", "九层", "十层"];

export const realms = realmStages.flatMap((stage) => realmLevelNames.map((level) => `${stage}${level}`));

export const roots = [
  { key: "metal", name: "金灵根", effect: "attack", min: 0.05, max: 0.1, note: "攻击提高 5%-10%。" },
  { key: "wood", name: "木灵根", effect: "hp", min: 0.1, max: 0.2, note: "血量上限提高 10%-20%。" },
  { key: "water", name: "水灵根", effect: "xp", min: 0.4, max: 0.6, breakMultiplier: 1.1, note: "每日经验获取提高 40%-60%，突破率按倍率提高 10%。" },
  { key: "fire", name: "火灵根", effect: "divineSense", min: 0.1, max: 0.2, note: "神识提高 10%-20%。" },
  { key: "earth", name: "土灵根", effect: "defense", min: 0.05, max: 0.1, note: "防御提高 5%-10%。" },
  { key: "heaven", name: "天灵根", effect: "mana", min: 0.1, max: 0.2, note: "法力上限提高 10%-20%。" }
];

export const sects = ["赤霞谷", "玄剑楼", "百草堂"];
export const npcNames = ["陆青衡", "辛如霜", "赵玄策", "沈照夜", "顾南枝", "韩立言", "闻人渡", "白砚秋"];

export const dungeons = [
  { id: "mist", name: "雾隐药谷", min: 0, power: 42, reward: "草药、灵石、经验", text: "适合炼气修士试炼，有低阶妖兽与残缺药圃。" },
  { id: "mine", name: "沉星矿脉", min: 3, power: 82, reward: "灵石、炼器材料", text: "矿洞深处灵压混乱，偶有敌修埋伏。" },
  { id: "tomb", name: "古修洞府", min: 10, power: 150, reward: "功法残页、灵石", text: "阵法残破但杀机仍在，适合筑基后探索。" },
  { id: "rift", name: "黑风裂隙", min: 20, power: 260, reward: "稀有灵材、声望", text: "结丹修士也会受伤的危险秘境。" }
];

export const taskTemplates = {
  body: { label: "锻炼", xp: 18, hp: 8, mana: 0, spirit: 0, stat: "attack" },
  study: { label: "学习", xp: 20, hp: -2, mana: 4, spirit: 0, stat: "defense" },
  work: { label: "工作", xp: 22, hp: -4, mana: -3, spirit: 12, stat: "spirit" },
  craft: { label: "创作", xp: 19, hp: -2, mana: 5, spirit: 5, stat: "divineSense" },
  discipline: { label: "自律", xp: 16, hp: 0, mana: 8, spirit: 0, stat: "mana" }
};

export const combatSkills = [
  { id: "azure_sword", name: "青元剑诀", cost: 14, cooldown: 2, type: "double", power: 0.82, text: "连续斩出两剑，每剑按 82% 攻击结算。" },
  { id: "thunder_pearl", name: "辟邪雷珠", cost: 18, cooldown: 3, type: "pierce", power: 1.18, pierce: 0.45, text: "雷光破罡，造成 118% 攻击伤害，并忽略目标 45% 防御。" },
  { id: "blood_escape", name: "血影遁", cost: 16, cooldown: 4, type: "dodge", duration: 1, text: "化作血影游走，闪避下一次受到的攻击。" },
  { id: "poison_flame", name: "玄阴毒焰", cost: 20, cooldown: 4, type: "dot", status: "poison", percent: 0.1, duration: 3, text: "使目标中毒 3 回合，每回合损失最大血量 10%。" },
  { id: "magnetic_light", name: "元磁神光", cost: 24, cooldown: 4, type: "stun", power: 0.65, duration: 1, text: "神光压制，造成 65% 攻击伤害，并令目标跳过下一次行动。" },
  { id: "golden_body", name: "金阙护体", cost: 18, cooldown: 4, type: "shield", reduce: 0.45, duration: 2, text: "护体金光持续 2 回合，受到伤害降低 45%。" },
  { id: "soul_hook", name: "摄魂铃", cost: 17, cooldown: 3, type: "manaBurn", power: 0.85, burn: 14, text: "摄魂扰息，造成 85% 攻击伤害，并削去目标 14 点法力。" },
  { id: "green_bamboo", name: "青竹蜂云剑", cost: 26, cooldown: 4, type: "multi", hits: 3, power: 0.58, text: "剑影分化三道，每道按 58% 攻击结算。" },
  { id: "spirit_armor", name: "灵犀甲术", cost: 15, cooldown: 3, type: "defenseBuff", amount: 8, duration: 3, text: "防御提高 8 点，持续 3 回合。" },
  { id: "bone_spike", name: "白骨穿心钉", cost: 22, cooldown: 4, type: "dot", status: "bleed", percent: 0.08, duration: 4, text: "钉入经脉，使目标流血 4 回合，每回合损失最大血量 8%。" },
  { id: "fire_crow", name: "火鸦术", cost: 16, cooldown: 2, type: "dotStrike", power: 0.9, status: "burn", percent: 0.06, duration: 3, text: "火鸦扑击造成 90% 攻击伤害，并灼烧 3 回合，每回合损失最大血量 6%。" },
  { id: "wood_recovery", name: "长春回灵诀", cost: 20, cooldown: 5, type: "heal", percent: 0.22, text: "回转生机，恢复自身最大血量 22%。" },
  { id: "ghost_step", name: "鬼影迷踪", cost: 19, cooldown: 4, type: "evasionBuff", chance: 0.35, duration: 2, text: "身法飘忽 2 回合，额外获得 35% 闪避机会。" },
  { id: "demon_cut", name: "煞魂斩", cost: 28, cooldown: 5, type: "execute", power: 1.15, threshold: 0.35, bonus: 0.55, text: "斩向破绽，基础 115% 攻击；目标血量低于 35% 时额外提高 55%。" },
  { id: "ice_seal", name: "寒髓封脉", cost: 21, cooldown: 4, type: "weaken", power: 0.72, amount: 7, duration: 3, text: "寒气封脉，造成 72% 攻击伤害，并使目标攻击降低 7 点，持续 3 回合。" },
  { id: "starfall", name: "星陨剑气", cost: 32, cooldown: 5, type: "heavy", power: 1.85, text: "凝聚星辉重击，造成 185% 攻击伤害。" },
  { id: "blood_drink", name: "血炼魔刃", cost: 23, cooldown: 4, type: "lifesteal", power: 1.12, leech: 0.45, text: "造成 112% 攻击伤害，并按伤害量 45% 恢复自身血量。" },
  { id: "mirror_water", name: "镜水反照", cost: 25, cooldown: 5, type: "reflect", reflect: 0.35, duration: 2, text: "镜水护身 2 回合，反弹所受伤害的 35%。" },
  { id: "wind_blade", name: "风雷翅斩", cost: 18, cooldown: 3, type: "speedStrike", power: 1.0, extraDodge: 0.18, duration: 1, text: "疾速突袭造成 100% 攻击伤害，并在 1 回合内额外提高 18% 闪避。" },
  { id: "five_element", name: "颠倒五行阵", cost: 30, cooldown: 5, type: "field", reduce: 0.25, amount: 6, duration: 3, text: "布下五行阵 3 回合，己方受伤降低 25%，目标防御降低 6 点。" }
];

export const itemCatalog = {
  focus: { name: "凝神散", price: 30, text: "神识 +2，法力 +12" },
  blood: { name: "养血丹", price: 35, text: "血量 +45" },
  insight: { name: "悟道茶", price: 60, text: "经验 +55" }
};
