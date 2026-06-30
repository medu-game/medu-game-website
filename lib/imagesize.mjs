// imagesize.mjs — read intrinsic pixel dimensions of an image file with zero
// dependencies, so the build can emit correct og:image:width/height per page.
// Supports the formats used as OG images on this site: PNG, JPEG, WebP.
import { readFileSync } from 'node:fs';

export function imageSize(path) {
  const b = readFileSync(path);

  // PNG — IHDR width/height are big-endian uint32 at byte 16/20.
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  }

  // JPEG — walk the marker segments to the first Start-Of-Frame (SOFn).
  if (b[0] === 0xff && b[1] === 0xd8) {
    let o = 2;
    while (o < b.length) {
      if (b[o] !== 0xff) { o++; continue; }
      let marker = b[o + 1];
      while (marker === 0xff) { o++; marker = b[o + 1]; }   // skip fill bytes
      // standalone markers without a length payload
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) { o += 2; continue; }
      // SOF0..SOF15, excluding DHT(c4)/JPG(c8)/DAC(cc)
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: b.readUInt16BE(o + 5), width: b.readUInt16BE(o + 7) };
      }
      o += 2 + b.readUInt16BE(o + 2);   // skip this segment (length is big-endian)
    }
    throw new Error(`JPEG without SOF marker: ${path}`);
  }

  // WebP — RIFF container; three sub-formats carry the dimensions differently.
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const fmt = b.toString('ascii', 12, 16);
    if (fmt === 'VP8 ') {
      return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
    }
    if (fmt === 'VP8L') {
      const n = b.readUInt32LE(21);
      return { width: (n & 0x3fff) + 1, height: ((n >> 14) & 0x3fff) + 1 };
    }
    if (fmt === 'VP8X') {
      const width = 1 + (b[24] | (b[25] << 8) | (b[26] << 16));
      const height = 1 + (b[27] | (b[28] << 8) | (b[29] << 16));
      return { width, height };
    }
  }

  throw new Error(`Unsupported image format: ${path}`);
}
