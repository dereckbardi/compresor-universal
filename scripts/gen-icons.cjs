// Generate PWA icons as simple PNGs without dependencies
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// Minimal PNG encoder (truecolor RGBA)
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function makePng(size) {
  // Solid dark background with a blue rounded-ish square
  const bg = [15, 23, 42];    // slate-900
  const accent = [59, 130, 246]; // blue-500
  const white = [255, 255, 255];

  const raw = Buffer.alloc(size * (size * 4 + 1));
  let offset = 0;
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0; // filter none
    for (let x = 0; x < size; x++) {
      // Draw a circle in the center
      const cx = size / 2, cy = size / 2, r = size * 0.35;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist <= r) {
        raw[offset++] = accent[0]; raw[offset++] = accent[1]; raw[offset++] = accent[2]; raw[offset++] = 255;
      } else {
        raw[offset++] = bg[0]; raw[offset++] = bg[1]; raw[offset++] = bg[2]; raw[offset++] = 255;
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const idat = zlib.deflateSync(raw);

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const dir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "icon-192.png"), makePng(192));
fs.writeFileSync(path.join(dir, "icon-512.png"), makePng(512));
console.log("Icons created");
