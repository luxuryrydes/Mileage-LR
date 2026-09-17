const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPng(width, height, r, g, b) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 2; // Color type: 2 (Truecolor RGB)
  ihdrData[10] = 0; // Compression
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Scanlines: each row has 1 filter byte (0) + width * 3 bytes (RGB)
  const rowSize = 1 + width * 3;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: none
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 3;
      // Gradient from (2, 132, 199) to (13, 148, 136)
      const ratio = (x + y) / (width + height);
      const pr = Math.round(r * (1 - ratio * 0.2));
      const pg = Math.round(g * (1 + ratio * 0.1));
      const pb = Math.round(b * (1 - ratio * 0.3));
      rawData[pixelOffset] = Math.min(255, Math.max(0, pr));
      rawData[pixelOffset + 1] = Math.min(255, Math.max(0, pg));
      rawData[pixelOffset + 2] = Math.min(255, Math.max(0, pb));
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(12 + length);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + length));
  chunk.writeUInt32BE(crc >>> 0, 8 + length);
  return chunk;
}

// Standard CRC32
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 192x192 PWA Icon
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, 2, 132, 199));
// 512x512 PWA Icon
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, 2, 132, 199));
// Maskable 512x512 Icon
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, 2, 132, 199));
// 180x180 Apple Touch Icon
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, 2, 132, 199));

console.log('Generated PWA and Apple Touch PNG icons successfully in public/');
