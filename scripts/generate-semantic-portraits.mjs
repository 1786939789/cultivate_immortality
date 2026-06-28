import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { npcGenders, sectRoster } from "../server/gameData.mjs";

const outDir = "web/public/portraits/generated-ai";
const knownPortraits = {
  "韩立": "/portraits/generated/han-li.png",
  "南宫婉": "/portraits/verified/%E5%8D%97%E5%AE%AB%E5%A9%89.jpg",
  "紫灵": "/portraits/verified/%E7%B4%AB%E7%81%B5.jpg",
  "银月": "/portraits/verified/%E9%93%B6%E6%9C%88.jpg"
};

const sectPalettes = [
  ["#134e4a", "#0f766e", "#f4d477"],
  ["#1e3a8a", "#64748b", "#f97316"],
  ["#365314", "#65a30d", "#fde68a"],
  ["#164e63", "#0891b2", "#e0f2fe"],
  ["#7f1d1d", "#dc2626", "#fbbf24"],
  ["#312e81", "#4f46e5", "#dbeafe"],
  ["#713f12", "#b45309", "#fef3c7"],
  ["#111827", "#7f1d1d", "#fca5a5"],
  ["#831843", "#db2777", "#fbcfe8"],
  ["#14532d", "#16a34a", "#dcfce7"],
  ["#0f172a", "#475569", "#e2e8f0"],
  ["#581c87", "#9333ea", "#f5d0fe"],
  ["#0c4a6e", "#0284c7", "#bae6fd"],
  ["#312e81", "#7c2d12", "#fed7aa"],
  ["#1f2937", "#57534e", "#e7e5e4"],
  ["#7c2d12", "#ea580c", "#fed7aa"],
  ["#166534", "#84cc16", "#fef08a"],
  ["#3b0764", "#6d28d9", "#c4b5fd"],
  ["#064e3b", "#0f766e", "#a7f3d0"],
  ["#075985", "#38bdf8", "#f0f9ff"]
];

mkdirSync(outDir, { recursive: true });

function hash(text) {
  let value = 2166136261;
  for (const char of text) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619) >>> 0;
  }
  return value;
}

function pick(list, seed, offset = 0) {
  return list[(seed + offset) % list.length];
}

function roleFor(name) {
  if (/(兽|妖|蛟|夜叉|魁|鹿)/.test(name)) return "beast";
  if (/(魔|鬼|煞|阴|骨|魂|血|尸|魑)/.test(name)) return "demonic";
  if (/(剑|刀|锋|刃)/.test(name)) return "martial";
  if (/(仙子|夫人|女修|道姑|姬|姑|婉|嫣|灵|凝|梅|婷|霞|凤|音|怡|芝|倩|娘)/.test(name)) return "female";
  if (/(童子|少主)/.test(name)) return "young";
  if (/(老祖|老魔|上人|长老|法王|师伯|师叔|老鬼)/.test(name)) return "elder";
  return "cultivator";
}

function escapeXml(text) {
  return String(text).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&apos;"
  }[char]));
}

function personSvg({ name, sect, index, sectIndex }) {
  const seed = hash(`${sect.name}:${name}:${index}`);
  const [base, mid, accent] = sectPalettes[sectIndex % sectPalettes.length];
  const gender = npcGenders[name] || "male";
  const role = roleFor(name);
  const isFemale = gender === "female" || role === "female";
  const isBeast = role === "beast";
  const isDemonic = role === "demonic";
  const isElder = role === "elder";
  const skin = pick(["#f8dcc2", "#f2c7a5", "#e8b789", "#f6d7bd", "#d9a77f"], seed);
  const hair = isDemonic
    ? pick(["#111827", "#1f1b2e", "#3b0a12", "#4c0519"], seed)
    : pick(["#111827", "#1f2937", "#27272a", "#3f3f46", "#111111"], seed);
  const eye = isDemonic ? "#ef4444" : pick(["#111827", "#1e3a8a", "#14532d", "#4338ca", "#7c2d12"], seed);
  const robe = isDemonic ? pick(["#450a0a", "#581c87", "#1f2937"], seed) : mid;
  const robe2 = pick(["#f8fafc", "#fef3c7", "#e0f2fe", "#ecfccb", "#fee2e2"], seed);
  const aura = isDemonic ? "#ef4444" : accent;
  const weapon = role === "martial" ? (name.includes("刀") || name.includes("刃") ? "blade" : "sword") : "";
  const brow = isElder ? "M48 75c8-7 18-7 27 0M54 91c6 4 14 4 20 0" : "M50 75c7-3 14-3 21 0M57 91c5 3 11 3 16 0";
  const hairShape = isFemale
    ? "M33 83c-7-30 6-56 31-59 25 3 38 29 31 59-9-16-17-25-31-26-14 1-22 10-31 26Z"
    : "M35 69c3-28 17-44 29-45 14 1 28 17 31 45-13-9-24-13-31-13s-18 4-29 13Z";
  const faceShape = isElder
    ? "M42 61c3-21 14-33 22-33s19 12 22 33c2 20-7 45-22 45S40 81 42 61Z"
    : "M41 62c4-21 15-32 23-32s19 11 23 32c1 20-8 43-23 43S40 82 41 62Z";
  const beastFace = `
<path d="M35 73c2-25 14-42 29-42s27 17 29 42c1 22-11 39-29 39S34 95 35 73Z" fill="${skin}"/>
<path d="M35 45 23 21l26 15M93 45l12-24-26 15" fill="${hair}"/>
<path d="M42 59c11-12 33-13 45 0-5-24-15-35-23-35S47 35 42 59Z" fill="${hair}"/>
<ellipse cx="53" cy="76" rx="4" ry="5" fill="${eye}"/>
<ellipse cx="75" cy="76" rx="4" ry="5" fill="${eye}"/>
<path d="M59 88c4 3 6 3 10 0M50 99c8 7 20 7 28 0" fill="none" stroke="#3f1f16" stroke-width="4" stroke-linecap="round"/>
`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="${escapeXml(name)} portrait">
<defs>
  <linearGradient id="bg" x1="18" y1="10" x2="112" y2="118" gradientUnits="userSpaceOnUse">
    <stop stop-color="${base}"/>
    <stop offset=".62" stop-color="${mid}"/>
    <stop offset="1" stop-color="#111827"/>
  </linearGradient>
  <radialGradient id="halo" cx="38" cy="26" r="75" gradientUnits="userSpaceOnUse">
    <stop stop-color="${aura}" stop-opacity=".72"/>
    <stop offset="1" stop-color="${aura}" stop-opacity="0"/>
  </radialGradient>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur stdDeviation="1.2"/>
  </filter>
</defs>
<rect width="128" height="128" rx="22" fill="url(#bg)"/>
<circle cx="37" cy="30" r="58" fill="url(#halo)"/>
<path d="M16 107c18-15 36-18 53-10 16 8 31 4 45-11v42H16Z" fill="#020617" opacity=".32"/>
<path d="M22 99c10-12 25-19 42-19s32 7 42 19l8 29H14l8-29Z" fill="${robe}"/>
<path d="M43 88c7 12 14 18 21 18s14-6 21-18l11 40H32l11-40Z" fill="${robe2}" opacity=".9"/>
${weapon === "sword" ? `<path d="M102 17 41 112" stroke="#dbeafe" stroke-width="5" stroke-linecap="round"/><path d="M97 15l8-8 1 12Z" fill="${accent}"/>` : ""}
${weapon === "blade" ? `<path d="M99 18c-20 33-39 63-58 94 8-2 15-7 21-16 17-26 31-48 45-73Z" fill="#e5e7eb" opacity=".9"/><path d="M92 28 39 111" stroke="${accent}" stroke-width="3"/>` : ""}
${isBeast ? beastFace : `
<path d="${hairShape}" fill="${hair}"/>
<path d="${faceShape}" fill="${skin}"/>
<path d="M39 58c9-11 18-17 25-17s16 6 25 17c-11-4-19-6-25-6s-14 2-25 6Z" fill="${hair}" opacity=".95"/>
${isFemale ? `<path d="M33 70c-4 21-1 39 8 54M95 70c4 21 1 39-8 54" stroke="${hair}" stroke-width="9" stroke-linecap="round"/>` : ""}
${isElder ? `<path d="M50 104c8 9 20 9 28 0 0 12-5 20-14 20s-14-8-14-20Z" fill="#f8fafc" opacity=".85"/>` : ""}
<ellipse cx="53" cy="76" rx="3.6" ry="4.5" fill="${eye}"/>
<ellipse cx="75" cy="76" rx="3.6" ry="4.5" fill="${eye}"/>
<path d="${brow}" fill="none" stroke="#3f1f16" stroke-width="3.6" stroke-linecap="round" opacity=".82"/>
`}
<path d="M29 30c10-7 20-10 35-10s25 3 35 10" stroke="${accent}" stroke-width="3" stroke-linecap="round" opacity=".72"/>
<circle cx="96" cy="32" r="8" fill="${accent}" opacity=".85"/>
<circle cx="31" cy="34" r="4" fill="#fefce8" opacity=".72"/>
<path d="M22 25c8 3 16 3 24 0" stroke="#fefce8" stroke-width="2" opacity=".35"/>
<path d="M83 113c7-5 12-12 15-21" stroke="${accent}" stroke-width="4" stroke-linecap="round" opacity=".8"/>
<path d="M30 116c8-7 13-14 16-22" stroke="#f8fafc" stroke-width="3" stroke-linecap="round" opacity=".5"/>
<rect x="2" y="2" width="124" height="124" rx="20" fill="none" stroke="#fff7ed" stroke-opacity=".3" stroke-width="2"/>
</svg>`;
}

const entries = [];
let index = 0;

entries.push(["无名散修", "/portraits/generated-ai/player.svg"]);
writeFileSync(join(outDir, "player.svg"), personSvg({
  name: "无名散修",
  sect: { name: "云麓盟", region: "主角" },
  index: 0,
  sectIndex: 0
}), "utf8");

for (const [sectIndex, sect] of sectRoster.entries()) {
  for (const name of sect.members) {
    if (knownPortraits[name]) {
      entries.push([name, knownPortraits[name]]);
      index += 1;
      continue;
    }

    const filename = `npc-${String(index + 1).padStart(3, "0")}.svg`;
    writeFileSync(join(outDir, filename), personSvg({ name, sect, index, sectIndex }), "utf8");
    entries.push([name, `/portraits/generated-ai/${filename}`]);
    index += 1;
  }
}

const lines = [
  "const portraitMap = {",
  ...entries.map(([name, path]) => `  ${JSON.stringify(name)}: ${JSON.stringify(path)},`),
  "};",
  "",
  "export function portraitFor(person) {",
  "  if (!person?.name) return \"\";",
  "  return portraitMap[person.name] || \"\";",
  "}",
  ""
];

writeFileSync("web/src/portraits.js", lines.join("\n"), "utf8");
console.log(`generated ${entries.length} semantic portraits`);
