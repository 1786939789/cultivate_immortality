export const realms = [
  "炼气一层", "炼气二层", "炼气三层", "炼气四层", "炼气五层", "炼气六层", "炼气七层", "炼气八层", "炼气九层",
  "筑基初期", "筑基中期", "筑基后期", "结丹初期", "结丹中期", "结丹后期", "元婴初期", "元婴中期", "元婴后期", "化神初期"
];

export const roots = [
  { name: "五行杂灵根", speed: 0.92, breakBonus: 0.02, note: "根基厚，成长慢但稳定。" },
  { name: "木火双灵根", speed: 1.08, breakBonus: 0.04, note: "炼丹与恢复更顺。" },
  { name: "金水双灵根", speed: 1.04, breakBonus: 0.05, note: "斗法锋利，心境清明。" },
  { name: "异雷灵根", speed: 1.16, breakBonus: -0.02, note: "进境快，突破凶险。" },
  { name: "天灵根", speed: 1.28, breakBonus: 0.08, note: "天资惊人，易招强敌。" }
];

export const talents = [
  { name: "稳心", mind: 14, attack: 0, note: "突破失败惩罚降低。" },
  { name: "苦修", mind: 4, attack: 2, note: "现实任务修为增加。" },
  { name: "斗法直觉", mind: 0, attack: 8, note: "PK 和副本更强。" },
  { name: "灵机一动", mind: 8, attack: 3, note: "每日随机事件更好。" }
];

export const sects = ["赤霞谷", "玄剑楼", "百草堂"];
export const npcNames = ["陆青衡", "辛如霜", "赵玄策", "沈照夜", "顾南枝", "韩立言", "闻人渡", "白砚秋"];

export const dungeons = [
  { id: "mist", name: "雾隐药谷", min: 0, power: 42, reward: "草药、灵石、修为", text: "适合炼气修士试炼，有低阶妖兽与残缺药圃。" },
  { id: "mine", name: "沉星矿脉", min: 3, power: 82, reward: "灵石、炼器材料", text: "矿洞深处灵压混乱，偶有敌修埋伏。" },
  { id: "tomb", name: "古修洞府", min: 8, power: 150, reward: "功法残页、悟性", text: "阵法残破但杀机仍在，适合筑基后探索。" },
  { id: "rift", name: "黑风裂隙", min: 12, power: 260, reward: "稀有机缘、声望", text: "结丹修士也会受伤的危险秘境。" }
];

export const taskTemplates = {
  body: { label: "锻炼", xp: 18, hp: 8, mind: -2, spirit: 0, stat: "body" },
  study: { label: "学习", xp: 20, hp: -2, mind: 7, spirit: 0, stat: "wisdom" },
  work: { label: "工作", xp: 22, hp: -4, mind: -3, spirit: 12, stat: "wealth" },
  craft: { label: "创作", xp: 19, hp: -2, mind: 5, spirit: 5, stat: "chance" },
  discipline: { label: "自律", xp: 16, hp: 0, mind: 10, spirit: 0, stat: "mind" }
};

export const itemCatalog = {
  focus: { name: "清心散", price: 30, text: "心境 +22，心魔 -8" },
  blood: { name: "养血丹", price: 35, text: "气血 +45" },
  insight: { name: "悟道茶", price: 60, text: "修为 +55，悟性 +2" }
};
