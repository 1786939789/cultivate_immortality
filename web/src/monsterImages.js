export const monsterImageNames = {
  "赤火蟾": "red-fire-toad",
  "碧水猿": "azure-water-ape",
  "金背妖狼": "golden-backed-demon-wolf",
  "青木蜈蚣": "greenwood-centipede",
  "黑煞虎": "black-fiend-tiger",
  "铁羽鹰": "iron-feather-hawk",
  "紫纹妖蟒": "purple-marked-serpent",
  "岩甲犀": "rock-armored-rhino",
  "血玉蜈蚣": "blood-jade-centipede",
  "玄冰蝎王": "dark-ice-scorpion-king.png",
  "金瞳妖狐": "golden-eyed-demon-fox.png",
  "青鳞蛟": "green-scaled-flood-dragon.png",
  "玄阴魔蛛": "dark-yin-demon-spider.png",
  "银甲夜叉": "silver-armored-yaksha.png",
  "天目妖鹏": "heaven-eyed-demon-roc.png",
  "尸魈王": "corpse-mountain-spirit-king.png",
  "六翼霜蚣": "six-winged-frost-centipede.png",
  "裂魂古猿": "soul-rending-ancient-ape.png",
  "青冥蛟王": "azure-underworld-flood-dragon-king.png",
  "噬金虫母": "gold-devouring-insect-matriarch.png",
  "虚空魇兽": "void-nightmare-beast.png",
  "玄磁雷鹏": "dark-magnetic-thunder-roc.png",
  "万毒蜃蛇": "myriad-poison-mirage-serpent.png",
  "荒火麟兽": "wasteland-fire-qilin-beast.png",
  "九首妖蛟": "nine-headed-demon-flood-dragon.png",
  "太阴魔凰": "great-yin-demon-phoenix.png",
  "玄甲巨灵": "black-armored-giant-spirit.png",
  "血海修罗": "blood-sea-asura.png",
  "真灵鲲鹏影": "true-spirit-kunpeng-shadow.png",
  "五色孔雀王": "five-colored-peacock-king.png",
  "罗睺古兽": "rahu-ancient-beast.png",
  "玄天魔龙": "dark-heaven-demon-dragon.png",
  "域外天魔": "extraterritorial-heavenly-demon.png",
  "真仙傀儡": "true-immortal-puppet.png",
  "古魔圣祖影": "ancient-demon-ancestor-shadow.png",
  "天罚雷兽": "heaven-punishment-thunder-beast.png"
};

export const monsterStageNames = ["血色外谷", "石殿甬道", "熔岩石窟", "玄冰洞府", "坠魔裂谷", "虚天残境", "乱星海深渊", "昆吾灵山", "真灵天门"];

export const monsterImageEntries = Object.entries(monsterImageNames).map(([name, file], index) => {
  const stage = Math.floor(index / 4);
  return {
    name,
    file,
    stage,
    stageName: monsterStageNames[stage] || `第${stage + 1}阶妖域`
  };
});

const monsterNames = Object.keys(monsterImageNames).sort((a, b) => b.length - a.length);

export function baseMonsterName(name = "") {
  const text = String(name || "");
  return monsterNames.find((monsterName) => text.includes(monsterName)) || text.replace(/^.*?·/, "").replace(/王$/, "");
}

export function monsterImagePath(monster) {
  const name = baseMonsterName(typeof monster === "string" ? monster : monster?.name);
  const file = monsterImageNames[name];
  if (!file) return "";
  const filename = /\.[a-z0-9]+$/i.test(file) ? file : `${file}.webp`;
  return `/assets/monsters/${filename}`;
}
