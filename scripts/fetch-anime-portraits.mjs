import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { sectRoster } from "../server/gameData.mjs";

const outDir = "web/public/portraits/verified";
const fallbackDir = "/portraits";
const sourceManifestPath = join(outDir, "sources.json");
const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36";
const maxPerPerson = Number(process.env.PORTRAIT_LIMIT || 200);
const minBytes = 8_000;

const names = sectRoster.flatMap((sect) => sect.members).slice(0, maxPerPerson);
mkdirSync(outDir, { recursive: true });

const existingSources = existsSync(sourceManifestPath)
  ? JSON.parse(readFileSync(sourceManifestPath, "utf8"))
  : {};

const verifiedPortraits = {
  // Only hand-verified images from pages that identify the character/show belong here.
  // Do not add generic image-search results; wrong portraits are worse than a stylized fallback.
  "南宫婉": {
    url: "https://p4.itc.cn/q_70/images01/20230707/c3594adc79254fbeb2a148fece05270d.jpeg",
    page: "https://www.sohu.com/picture/695563616",
    note: "《凡人修仙传》南宫婉角色海报"
  },
  "紫灵": {
    url: "https://p3-sdbk2-media.byteimg.com/tos-cn-i-xv4ileqgde/161e9abc98374dd1928a42f461f2b132~tplv-xv4ileqgde-resize-w%3A360.image",
    page: "https://www.baike.com/wikiid/1867419186300492107",
    note: "紫灵仙子百科角色图"
  }
};

function safeName(name) {
  return encodeURIComponent(name);
}

function fallbackPath(name) {
  return `${fallbackDir}/${safeName(name)}.svg`;
}

function extFromContentType(type, url) {
  const normalized = String(type || "").toLowerCase();
  if (normalized.includes("png")) return ".png";
  if (normalized.includes("webp")) return ".webp";
  if (normalized.includes("jpeg") || normalized.includes("jpg")) return ".jpg";
  const ext = extname(new URL(url).pathname).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : ".jpg";
}

async function downloadVerified(name, entry) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(entry.url, {
      headers: { "user-agent": userAgent, "referer": entry.page },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) throw new Error(`not image: ${contentType}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < minBytes) throw new Error(`too small: ${bytes.length}`);
    const ext = extFromContentType(contentType, entry.url);
    const filePath = join(outDir, `${safeName(name)}${ext}`);
    writeFileSync(filePath, bytes);
    return {
      filePath,
      publicPath: `/portraits/verified/${safeName(name)}${ext}`,
      bytes: bytes.length,
      source: entry.url,
      page: entry.page,
      note: entry.note
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPortrait(name) {
  const entry = verifiedPortraits[name];
  if (!entry) return null;
  return downloadVerified(name, entry);
}

const portraitEntries = [];
const sources = { ...existingSources };
let downloaded = 0;
let fallback = 0;

for (const name of names) {
  const result = await fetchPortrait(name);
  if (result) {
    downloaded += 1;
    sources[name] = {
      path: result.publicPath,
      source: result.source,
      page: result.page,
      note: result.note,
      bytes: result.bytes
    };
    portraitEntries.push([name, result.publicPath]);
    console.log(`OK ${name} ${result.publicPath}`);
  } else {
    fallback += 1;
    const existing = sources[name]?.path;
    portraitEntries.push([name, existing || fallbackPath(name)]);
    console.log(`FALLBACK ${name}`);
  }
}

writeFileSync(sourceManifestPath, JSON.stringify(sources, null, 2), "utf8");

const lines = [
  "const portraitMap = {",
  ...portraitEntries.map(([name, path]) => `  ${JSON.stringify(name)}: ${JSON.stringify(path)},`),
  "};",
  "",
  "export function portraitFor(person) {",
  "  if (!person?.name) return \"\";",
  "  return portraitMap[person.name] || \"\";",
  "}",
  "",
  "export function portraitMapEntries() {",
  "  return Object.entries(portraitMap);",
  "}",
  ""
];

writeFileSync("web/src/portraits.js", lines.join("\n"), "utf8");
console.log(`done downloaded=${downloaded} fallback=${fallback}`);
