export const realmStages = ["练气", "筑基", "结丹", "元婴", "化神", "炼虚", "合体", "大乘", "真仙"];

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

export const rootCycle = ["metal", "wood", "earth", "water", "fire", "heaven"];

export const specialRoots = [
  { id: "thunder", name: "雷灵根", keys: ["metal", "wood", "earth"], note: "灵根仅由金、木、土组成时自动转换；克金灵根、木灵根、土灵根，不被其他灵根相克。属性仍按子灵根加成和多灵根衰减计算。" },
  { id: "wind", name: "风灵根", keys: ["water", "fire", "heaven"], note: "灵根仅由水、火、天组成时自动转换；克水灵根、火灵根、天灵根，不被其他灵根相克。属性仍按子灵根加成和多灵根衰减计算。" },
  { id: "hidden", name: "隐灵根", keys: ["metal", "wood", "water", "fire", "earth"], note: "灵根仅由金、木、水、火、土组成时自动转换；克金灵根、木灵根、水灵根、火灵根、土灵根。属性仍按子灵根加成和多灵根衰减计算。" }
];

export const spiritPearls = [
  { id: "metal", name: "金灵珠", rootKey: "metal", effects: [{ stat: "attack", label: "攻击", weight: 1 }] },
  { id: "wood", name: "木灵珠", rootKey: "wood", effects: [{ stat: "maxHp", label: "血量", weight: 1 }] },
  { id: "water", name: "水灵珠", rootKey: "water", effects: [{ stat: "xp", label: "修为获取", weight: 1 }] },
  { id: "fire", name: "火灵珠", rootKey: "fire", effects: [{ stat: "divineSense", label: "神识", weight: 1 }] },
  { id: "earth", name: "土灵珠", rootKey: "earth", effects: [{ stat: "defense", label: "防御", weight: 1 }] },
  { id: "heaven", name: "天灵珠", rootKey: "heaven", effects: [{ stat: "maxMana", label: "法力", weight: 1 }] },
  { id: "thunder", name: "雷灵珠", rootKey: "thunder", specialKeys: ["metal", "wood", "earth"], effects: [{ stat: "attack", label: "攻击", weight: 0.72 }, { stat: "defense", label: "防御", weight: 0.72 }] },
  { id: "wind", name: "风灵珠", rootKey: "wind", specialKeys: ["water", "fire", "heaven"], effects: [{ stat: "divineSense", label: "神识", weight: 0.72 }, { stat: "maxMana", label: "法力", weight: 0.72 }] },
  { id: "hidden", name: "隐灵珠", rootKey: "hidden", specialKeys: ["metal", "wood", "water", "fire", "earth"], effects: [
    { stat: "attack", label: "攻击", weight: 0.28 },
    { stat: "defense", label: "防御", weight: 0.28 },
    { stat: "maxHp", label: "血量", weight: 0.28 },
    { stat: "divineSense", label: "神识", weight: 0.28 },
    { stat: "maxMana", label: "法力", weight: 0.28 },
    { stat: "breakthrough", label: "突破", weight: 0.12 }
  ] }
];

export const rosterVersion = 5;

export { duelLossScore, duelRanks, duelSeasonLength, duelSeasonMaxScore, duelSeasonOfDay, duelSeasonDay, duelWinScore, duelRankForScore } from "../shared/duelSeasonData.mjs";

export const sectRoster = [
  { region: "天南", name: "黄枫谷", members: ["韩立", "陈巧倩", "钟卫娘", "刘靖", "吴风", "李化元", "雷万鹤", "红拂", "令狐老祖", "马师伯"] },
  { region: "天南", name: "掩月宗", members: ["南宫婉", "霓裳仙子", "穹老怪", "燕如嫣", "燕家老祖", "宣乐", "掩月长老", "霜华仙子", "月华真人", "素心师太"] },
  { region: "天南", name: "灵兽山", members: ["涵云芝", "御灵子", "秦叶岭", "灵兽山主", "驭兽真人", "白鹤道人", "青鳞使", "黑虎上人", "百兽童子", "灵禽散人"] },
  { region: "天南", name: "清虚门", members: ["浮云子", "清虚散人", "明阳道人", "清虚门主", "青阳子", "玄清道人", "松纹真人", "白石散人", "观云师叔", "静虚道姑"] },
  { region: "天南", name: "化刀坞", members: ["封岳", "刀坞老祖", "化刀坞主", "铁刀上人", "赤刃真人", "断水刀客", "冷锋子", "银刀客", "血刃散人", "鸣刀童子"] },
  { region: "天南", name: "巨剑门", members: ["巨剑老祖", "铁罗", "剑眉修士", "巨剑门主", "玄剑真人", "重锋子", "裂岳剑修", "青虹剑客", "藏剑老人", "石剑道人"] },
  { region: "天南", name: "天阙堡", members: ["天阙堡主", "辛如音", "齐云霄", "云露侍者", "天阙长老", "阵符先生", "玉阙真人", "司阵童子", "白阙散人", "灵阙居士"] },
  { region: "天南", name: "鬼灵门", members: ["王蝉", "王天胜", "鬼灵老祖", "碎魂真人", "董萱儿", "鬼灵门主", "血侍", "阴罗使", "黑煞教主", "炼魂童子"] },
  { region: "天南", name: "合欢宗", members: ["合欢老魔", "田不缺", "云露老魔", "合欢宗主", "媚凝", "温夫人", "妙鹤仙子", "赤霞姬", "花影真人", "双修童子"] },
  { region: "天南", name: "落云宗", members: ["程天坤", "吕洛", "慕沛灵", "银月", "白凤峰主", "青竹真人", "落霞道人", "云梦仙子", "听松居士"] },
  { region: "乱星海", name: "星宫", members: ["凌玉灵", "天星双圣", "温青", "凌啸风", "星宫长老", "白璧真人", "星璇使", "观星道人", "银辉仙子", "镇海法王"] },
  { region: "乱星海", name: "妙音门", members: ["紫灵", "汪凝", "范静梅", "卓如婷", "妙音门主", "曲魂", "碧音仙子", "听潮女修", "玉箫道人", "海棠夫人"] },
  { region: "乱星海", name: "六连殿", members: ["六连殿主", "苗长老", "古长老", "许云", "六连执事", "海灯道人", "碧波客", "青蛟使", "离岛散人", "金霞掌柜"] },
  { region: "乱星海", name: "逆星盟", members: ["六道极圣", "万三姑", "蛮胡子", "青易居士", "温天仁", "逆星盟主", "乌丑", "黑袍法士", "赤火老怪", "玄骨传人"] },
  { region: "乱星海", name: "极阴岛", members: ["极阴祖师", "玄骨上人", "乌丑少主", "极阴门徒", "阴火道人", "骨焰真人", "白骨夫人", "噬魂子", "冥水散人", "寒魄童子"] },
  { region: "乱星海", name: "青阳门", members: ["青阳老魔", "青阳门主", "青阳使者", "火云道人", "赤阳子", "青火童子", "炎晶真人", "焚海客", "烈阳散人", "离火法士"] },
  { region: "大晋", name: "太一门", members: ["向之礼", "白老鬼", "太一门主", "玄一真人", "玉阳子", "太真道人", "清明居士", "太和散人", "云鹤真人", "太一执法"] },
  { region: "大晋", name: "天魔宗", members: ["乾老魔", "天魔宗主", "呼老魔", "魔焰门主", "阴芝马使", "黑风尊者", "血影魔君", "玄阴法王", "百损道人", "无相魔修"] },
  { region: "大晋", name: "万妖谷", members: ["车老妖", "万妖谷主", "银翅夜叉", "木魁", "圭灵", "啼魂兽", "毒圣门客", "青背妖修", "金蛟王", "白鹿妖君"] },
  { region: "大晋", name: "小极宫", members: ["小极宫主", "白瑶怡", "寒骊上人", "冰凤", "小极长老", "玄冰仙子", "寒月道人", "雪魄真人", "冰魄童子", "北冥散人"] }
];

export const sects = sectRoster.map((sect) => sect.name);
export const npcNames = sectRoster.flatMap((sect) => sect.members);

const explicitGenders = {
  韩立: "male",
  陈巧倩: "female",
  钟卫娘: "female",
  刘靖: "male",
  吴风: "male",
  李化元: "male",
  雷万鹤: "male",
  红拂: "female",
  令狐老祖: "male",
  马师伯: "male",
  南宫婉: "female",
  霓裳仙子: "female",
  穹老怪: "male",
  燕如嫣: "female",
  燕家老祖: "male",
  宣乐: "male",
  涵云芝: "female",
  御灵子: "male",
  秦叶岭: "male",
  封岳: "male",
  辛如音: "female",
  齐云霄: "male",
  王蝉: "male",
  王天胜: "male",
  董萱儿: "female",
  合欢老魔: "male",
  田不缺: "male",
  云露老魔: "male",
  媚凝: "female",
  温夫人: "female",
  程天坤: "male",
  吕洛: "male",
  慕沛灵: "female",
  银月: "female",
  凌玉灵: "female",
  天星双圣: "unknown",
  温青: "female",
  凌啸风: "male",
  紫灵: "female",
  汪凝: "female",
  范静梅: "female",
  卓如婷: "female",
  曲魂: "male",
  六道极圣: "male",
  万三姑: "female",
  蛮胡子: "male",
  青易居士: "male",
  温天仁: "male",
  乌丑: "male",
  极阴祖师: "male",
  玄骨上人: "male",
  乌丑少主: "male",
  青阳老魔: "male",
  向之礼: "male",
  白老鬼: "male",
  乾老魔: "male",
  呼老魔: "male",
  车老妖: "male",
  银翅夜叉: "male",
  木魁: "male",
  圭灵: "female",
  啼魂兽: "unknown",
  白瑶怡: "female",
  寒骊上人: "male",
  冰凤: "female"
};

function inferGender(name) {
  if (explicitGenders[name]) return explicitGenders[name];
  if (/(仙子|夫人|女修|道姑|姬|姑|师太|瑶|婉|嫣|灵|凝|梅|婷|霞|凤|音|沛)/.test(name)) return "female";
  if (/(老祖|老魔|上人|真人|道人|居士|法王|门主|堡主|谷主|殿主|宗主|长老|使者|法士|客|君|子|童子|少主|散人|修士|师叔|师伯|尊者)/.test(name)) return "male";
  return "male";
}

export const npcGenders = Object.fromEntries(npcNames.map((name) => [name, inferGender(name)]));

export const provinceVersion = 4;

export const provinces = [
  { id: "xinjiang", name: "新疆", rank: 23, type: "dust", dustYield: 5, x: 12, y: 26 },
  { id: "tibet", name: "西藏", rank: 31, type: "breakthrough", x: 20, y: 58 },
  { id: "qinghai", name: "青海", rank: 30, type: "spirit", x: 31, y: 45 },
  { id: "gansu", name: "甘肃", rank: 27, type: "spirit", x: 38, y: 38 },
  { id: "ningxia", name: "宁夏", rank: 29, type: "xp", x: 47, y: 35 },
  { id: "inner_mongolia", name: "内蒙古", rank: 21, type: "breakthrough", x: 54, y: 22 },
  { id: "heilongjiang", name: "黑龙江", rank: 25, type: "dust", dustYield: 3, x: 82, y: 13 },
  { id: "jilin", name: "吉林", rank: 26, type: "xp", x: 80, y: 22 },
  { id: "liaoning", name: "辽宁", rank: 17, type: "spirit", x: 76, y: 31 },
  { id: "beijing", name: "北京", rank: 12, type: "breakthrough", x: 66, y: 35 },
  { id: "tianjin", name: "天津", rank: 24, type: "dust", dustYield: 4, x: 69, y: 38 },
  { id: "hebei", name: "河北", rank: 13, type: "xp", x: 64, y: 41 },
  { id: "shanxi", name: "山西", rank: 20, type: "spirit", x: 58, y: 42 },
  { id: "shaanxi", name: "陕西", rank: 14, type: "breakthrough", x: 52, y: 48 },
  { id: "henan", name: "河南", rank: 6, type: "spirit", x: 61, y: 50 },
  { id: "shandong", name: "山东", rank: 3, type: "xp", x: 70, y: 47 },
  { id: "jiangsu", name: "江苏", rank: 2, type: "xp", x: 73, y: 56 },
  { id: "shanghai", name: "上海", rank: 9, type: "breakthrough", x: 78, y: 60 },
  { id: "anhui", name: "安徽", rank: 11, type: "spirit", x: 68, y: 59 },
  { id: "hubei", name: "湖北", rank: 7, type: "xp", x: 59, y: 60 },
  { id: "chongqing", name: "重庆", rank: 16, type: "breakthrough", x: 50, y: 62 },
  { id: "sichuan", name: "四川", rank: 5, type: "spirit", x: 43, y: 63 },
  { id: "guizhou", name: "贵州", rank: 22, type: "dust", dustYield: 6, x: 50, y: 74 },
  { id: "yunnan", name: "云南", rank: 18, type: "xp", x: 42, y: 82 },
  { id: "hunan", name: "湖南", rank: 10, type: "breakthrough", x: 59, y: 70 },
  { id: "jiangxi", name: "江西", rank: 15, type: "dust", dustYield: 7, x: 67, y: 70 },
  { id: "zhejiang", name: "浙江", rank: 4, type: "breakthrough", x: 75, y: 66 },
  { id: "fujian", name: "福建", rank: 8, type: "spirit", x: 72, y: 78 },
  { id: "taiwan", name: "台湾", rank: 6, type: "breakthrough", x: 82, y: 82 },
  { id: "guangxi", name: "广西", rank: 19, type: "xp", x: 56, y: 83 },
  { id: "guangdong", name: "广东", rank: 1, type: "spirit", x: 66, y: 84 },
  { id: "hongkong", name: "香港", rank: 10, type: "dust", dustYield: 9, x: 70, y: 88 },
  { id: "macau", name: "澳门", rank: 18, type: "spirit", x: 66, y: 89 },
  { id: "hainan", name: "海南", rank: 28, type: "breakthrough", x: 61, y: 94 }
];

export const dungeons = [
  { id: "blood_trial", name: "血色禁地", min: 0, power: 48, reward: "每日单人洞窟、灵石、装备", text: "每人每日自动闯入禁地洞窟，越往深处妖兽境界越高，奖励越厚。" },
  { id: "void_hall", name: "虚天殿", min: 0, power: 120, reward: "宗门协作、灵石平分、装备归输出者", text: "全宗门合力挑战守殿妖王：宗门最高修士不高于五层时生成本境界十层，高于五层时生成下一大境界一层，最高封顶真仙。" },
  { id: "star_sea", name: "乱星海猎妖", min: 0, power: 86, reward: "全员贡献、声望、稀有装备", text: "乱星海妖潮每日涌动，所有修士按贡献分润灵石，并争夺高阶装备。" }
];

export const taskTemplates = {
  body: { label: "锻炼" },
  study: { label: "学习" },
  work: { label: "工作" },
  craft: { label: "创作" },
  discipline: { label: "自律" }
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

export { equipmentCatalog, equipmentSlots, equipmentTiers } from "../shared/equipmentData.mjs";

export const itemCatalog = {
  huanglong_dan: {
    name: "黄龙丹",
    category: "xp",
    categoryName: "修为丹",
    basePrice: 80,
    effect: { type: "xpMultiplier", multiplier: 1.5, days: 1 },
    limit: { type: "daily", max: 1, days: 1 },
    text: "现实任务修为收益 x1.5，持续 1 天。"
  },
  jinsui_wan: {
    name: "金髓丸",
    category: "xp",
    categoryName: "修为丹",
    basePrice: 180,
    effect: { type: "xpMultiplier", multiplier: 2, days: 1 },
    limit: { type: "daily", max: 1, days: 1 },
    text: "现实任务修为收益 x2，持续 1 天。"
  },
  juling_dan: {
    name: "聚灵丹",
    category: "xp",
    categoryName: "修为丹",
    basePrice: 220,
    effect: { type: "xpMultiplier", multiplier: 1.5, days: 3 },
    limit: { type: "cycle", max: 1, days: 3 },
    text: "现实任务修为收益 x1.5，持续 3 天。"
  },
  heqi_dan: {
    name: "合气丹",
    category: "xp",
    categoryName: "修为丹",
    basePrice: 520,
    effect: { type: "xpMultiplier", multiplier: 2, days: 3 },
    limit: { type: "cycle", max: 1, days: 3 },
    text: "现实任务修为收益 x2，持续 3 天。"
  },
  shenling_dan: {
    name: "参灵丹",
    category: "xp",
    categoryName: "修为丹",
    basePrice: 600,
    effect: { type: "xpMultiplier", multiplier: 1.5, days: 7 },
    limit: { type: "cycle", max: 1, days: 7 },
    text: "现实任务修为收益 x1.5，持续 7 天。"
  },
  jiuqiao_juyuan_dan: {
    name: "九窍聚元丹",
    category: "xp",
    categoryName: "修为丹",
    basePrice: 1380,
    effect: { type: "xpMultiplier", multiplier: 2, days: 7 },
    limit: { type: "cycle", max: 1, days: 7 },
    text: "现实任务修为收益 x2，持续 7 天。"
  },
  humai_dan: {
    name: "护脉丹",
    category: "breakthrough",
    categoryName: "破境丹",
    basePrice: 130,
    effect: { type: "breakthroughBonus", bonus: 0.04 },
    limit: { type: "daily", max: 2, days: 1 },
    text: "下次突破成功率 +4%，可叠加，突破后失效。"
  },
  ningyuan_dan: {
    name: "凝元丹",
    category: "breakthrough",
    categoryName: "破境丹",
    basePrice: 320,
    effect: { type: "breakthroughBonus", bonus: 0.08 },
    limit: { type: "daily", max: 1, days: 1 },
    text: "下次突破成功率 +8%，可叠加，突破后失效。"
  },
  zhuji_dan: {
    name: "筑基丹",
    category: "breakthrough",
    categoryName: "破境丹",
    basePrice: 760,
    effect: { type: "breakthroughBonus", bonus: 0.12 },
    limit: { type: "realm", max: 1, days: 0 },
    text: "下次突破成功率 +12%，可叠加，本境界限购 1 枚。"
  },
  jiangchen_dan: {
    name: "降尘丹",
    category: "breakthrough",
    categoryName: "破境丹",
    basePrice: 1480,
    effect: { type: "breakthroughBonus", bonus: 0.16 },
    limit: { type: "realm", max: 1, days: 0 },
    text: "下次突破成功率 +16%，可叠加，本境界限购 1 枚。"
  },
  huiyuan_xumai_dan: {
    name: "回元续脉丹",
    category: "attempt",
    categoryName: "续脉丹",
    basePrice: 1200,
    effect: { type: "breakthroughAttempts", amount: 1 },
    limit: { type: "daily", max: 1, days: 1 },
    text: "今日额外突破次数 +1。"
  },
  xuanyuan_butian_dan: {
    name: "玄元补天丹",
    category: "attempt",
    categoryName: "续脉丹",
    basePrice: 3200,
    effect: { type: "breakthroughAttempts", amount: 2 },
    limit: { type: "cycle", max: 1, days: 7 },
    text: "今日额外突破次数 +2。"
  },
  qingyuan_jianwan: {
    name: "青元剑丸",
    category: "permanent",
    categoryName: "淬体丹",
    basePrice: 360,
    priceStep: 120,
    effect: { type: "permanentStat", stat: "attack", amount: 2 },
    limit: { type: "permanent", max: 100, days: 0 },
    text: "永久攻击 +2。"
  },
  xuanjia_dan: {
    name: "玄甲丹",
    category: "permanent",
    categoryName: "淬体丹",
    basePrice: 360,
    priceStep: 120,
    effect: { type: "permanentStat", stat: "defense", amount: 2 },
    limit: { type: "permanent", max: 100, days: 0 },
    text: "永久防御 +2。"
  },
  jingang_cuiti_dan: {
    name: "金刚淬体丹",
    category: "permanent",
    categoryName: "淬体丹",
    basePrice: 320,
    priceStep: 100,
    effect: { type: "permanentStat", stat: "maxHp", amount: 10 },
    limit: { type: "permanent", max: 100, days: 0 },
    text: "永久气血上限 +10。"
  },
  yanghun_dan: {
    name: "养魂丹",
    category: "permanent",
    categoryName: "淬体丹",
    basePrice: 520,
    priceStep: 180,
    effect: { type: "permanentStat", stat: "divineSense", amount: 2 },
    limit: { type: "permanent", max: 100, days: 0 },
    text: "永久神识 +2。"
  },
  zhenyuan_dan: {
    name: "真元丹",
    category: "permanent",
    categoryName: "淬体丹",
    basePrice: 520,
    priceStep: 180,
    effect: { type: "permanentStat", stat: "maxMana", amount: 10 },
    limit: { type: "permanent", max: 100, days: 0 },
    text: "永久法力上限 +10。"
  }
};
