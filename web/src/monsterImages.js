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

export const monsterArchetypes = [
  { id: "hp", label: "血量高", shortLabel: "血厚", text: "气血厚重，能扛更久。" },
  { id: "sense", label: "神识高", shortLabel: "神识", text: "神识敏锐，更容易预判闪避。" },
  { id: "attack", label: "攻击高", shortLabel: "凶攻", text: "攻伐凶猛，正面伤害更高。" },
  { id: "balanced", label: "均衡型", shortLabel: "均衡", text: "五维平衡，没有明显短板。" }
];

const monsterArchetypeByName = Object.fromEntries(Object.keys(monsterImageNames).map((name, index) => [name, monsterArchetypes[index % monsterArchetypes.length]]));

export const monsterImageEntries = Object.entries(monsterImageNames).map(([name, file], index) => {
  const stage = Math.floor(index / 4);
  const archetype = monsterArchetypeByName[name] || monsterArchetypes[3];
  return {
    name,
    file,
    stage,
    stageName: monsterStageNames[stage] || `第${stage + 1}阶妖域`,
    archetype: archetype.id,
    archetypeLabel: archetype.label,
    archetypeShortLabel: archetype.shortLabel,
    archetypeText: archetype.text
  };
});

const monsterNames = Object.keys(monsterImageNames).sort((a, b) => b.length - a.length);

const monsterFallbackImages = [
  { pattern: /石|岩|矿|土/, file: "black-armored-giant-spirit.png" },
  { pattern: /雷|电/, file: "dark-magnetic-thunder-roc.png" },
  { pattern: /冰|霜|寒/, file: "dark-ice-scorpion-king.png" },
  { pattern: /火|焰|炎/, file: "red-fire-toad.webp" },
  { pattern: /水|潮|海/, file: "azure-water-ape.webp" },
  { pattern: /风|羽|云/, file: "iron-feather-hawk.webp" },
  { pattern: /木|毒|藤/, file: "greenwood-centipede.webp" },
  { pattern: /魔|阴|魂|煞|魇/, file: "void-nightmare-beast.png" }
];

export function baseMonsterName(name = "") {
  const text = String(name || "");
  return monsterNames.find((monsterName) => text.includes(monsterName)) || text.replace(/^.*?·/, "").replace(/王$/, "");
}

export function monsterArchetype(monster) {
  const name = baseMonsterName(typeof monster === "string" ? monster : monster?.name);
  return monsterArchetypeByName[name] || monsterArchetypes[3];
}

export function monsterImagePath(monster) {
  const name = baseMonsterName(typeof monster === "string" ? monster : monster?.name);
  const file = monsterImageNames[name];
  const hint = typeof monster === "string" ? monster : `${monster?.name || ""}${monster?.rootName || ""}${monster?.kind || ""}`;
  const fallbackFile = monsterFallbackImages.find((entry) => entry.pattern.test(hint))?.file;
  if (!file && !fallbackFile) return "";
  const imageFile = file || fallbackFile;
  const filename = /\.[a-z0-9]+$/i.test(imageFile) ? imageFile : `${imageFile}.webp`;
  return `/assets/monsters/${filename}`;
}
