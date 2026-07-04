import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';

const input = 'tmp/asset-work/root-icons-sheet.png';
const outDir = 'web/public/assets/cultivation-system/root-icons';
mkdirSync(outDir, { recursive: true });
const names = ['metal','wood','water','fire','earth','heaven','thunder','wind','hidden'];
const data = readFileSync(input);
const sig = data.subarray(0, 8);
const pngSig = Buffer.from([137,80,78,71,13,10,26,10]);
if (!sig.equals(pngSig)) throw new Error('Not a PNG');
let pos = 8;
let width = 0;
let height = 0;
let colorType = 0;
let bitDepth = 0;
const idat = [];
while (pos < data.length) {
  const len = data.readUInt32BE(pos); pos += 4;
  const type = data.subarray(pos, pos + 4).toString('ascii'); pos += 4;
  const chunk = data.subarray(pos, pos + len); pos += len;
  pos += 4;
  if (type === 'IHDR') {
    width = chunk.readUInt32BE(0);
    height = chunk.readUInt32BE(4);
    bitDepth = chunk[8];
    colorType = chunk[9];
  } else if (type === 'IDAT') {
    idat.push(chunk);
  } else if (type === 'IEND') break;
}
if (bitDepth !== 8 || ![2, 6].includes(colorType)) throw new Error(`Unsupported PNG ${bitDepth}/${colorType}`);
const sourceBpp = colorType === 6 ? 4 : 3;
const bpp = 4;
const stride = width * sourceBpp;
const raw = inflateSync(Buffer.concat(idat));
const rgba = Buffer.alloc(width * height * bpp);
let inPos = 0;
let prev = Buffer.alloc(stride);
for (let y = 0; y < height; y += 1) {
  const filter = raw[inPos++];
  const row = Buffer.from(raw.subarray(inPos, inPos + stride));
  inPos += stride;
  for (let x = 0; x < stride; x += 1) {
    const left = x >= sourceBpp ? row[x - sourceBpp] : 0;
    const up = prev[x];
      const upLeft = x >= sourceBpp ? prev[x - sourceBpp] : 0;
    let val = row[x];
    if (filter === 1) val = (val + left) & 255;
    else if (filter === 2) val = (val + up) & 255;
    else if (filter === 3) val = (val + Math.floor((left + up) / 2)) & 255;
    else if (filter === 4) {
      const p = left + up - upLeft;
      const pa = Math.abs(p - left);
      const pb = Math.abs(p - up);
      const pc = Math.abs(p - upLeft);
      val = (val + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft)) & 255;
    } else if (filter !== 0) throw new Error(`Unsupported filter ${filter}`);
    row[x] = val;
  }
  for (let x = 0; x < width; x += 1) {
    const src = x * sourceBpp;
    const dst = (y * width + x) * bpp;
    rgba[dst] = row[src];
    rgba[dst + 1] = row[src + 1];
    rgba[dst + 2] = row[src + 2];
    rgba[dst + 3] = sourceBpp === 4 ? row[src + 3] : 255;
  }
  prev = row;
}
function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}
function chunk(type, payload) {
  const typeBuf = Buffer.from(type, 'ascii');
  const out = Buffer.alloc(12 + payload.length);
  out.writeUInt32BE(payload.length, 0);
  typeBuf.copy(out, 4);
  payload.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([typeBuf, payload])), 8 + payload.length);
  return out;
}
function writePng(path, w, h, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const scan = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y += 1) {
    const rowStart = y * (w * 4 + 1);
    scan[rowStart] = 0;
    pixels.copy(scan, rowStart + 1, y * w * 4, (y + 1) * w * 4);
  }
  writeFileSync(path, Buffer.concat([pngSig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(scan, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
}
const cellW = Math.floor(width / 3);
const cellH = Math.floor(height / 3);
for (let i = 0; i < names.length; i += 1) {
  const col = i % 3;
  const row = Math.floor(i / 3);
  const padX = Math.floor(cellW * 0.06);
  const padY = Math.floor(cellH * 0.06);
  const sx = col * cellW + padX;
  const sy = row * cellH + padY;
  const sw = cellW - padX * 2;
  const sh = cellH - padY * 2;
  const size = Math.min(sw, sh);
  const ox = sx + Math.floor((sw - size) / 2);
  const oy = sy + Math.floor((sh - size) / 2);
  const pix = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    const from = ((oy + y) * width + ox) * 4;
    rgba.copy(pix, y * size * 4, from, from + size * 4);
  }
  writePng(`${outDir}/${names[i]}.png`, size, size, pix);
}
console.log(`cropped ${names.length} icons from ${width}x${height}`);
