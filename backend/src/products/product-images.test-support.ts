import { crc32, deflateSync } from 'node:zlib';

/** Minimal, structurally valid image files generated for tests only. */

function u32be(value: number) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0);
  return buffer;
}
function u32le(value: number) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

export function pngChunk(type: string, data: Buffer = Buffer.alloc(0)) {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  return Buffer.concat([u32be(data.length), body, u32be(crc32(body))]);
}

export function png(
  options: { width?: number; height?: number; before?: Buffer[] } = {},
) {
  const { width = 1, height = 1, before = [] } = options;
  const header = Buffer.concat([
    u32be(width),
    u32be(height),
    Buffer.from([8, 2, 0, 0, 0]),
  ]);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    ...before,
    pngChunk('IDAT', deflateSync(Buffer.from([0, 200, 120, 40]))),
    pngChunk('IEND'),
  ]);
}

// Valid PNG of an exact byte length, padded with a private ancillary chunk.
export function pngOfSize(total: number) {
  const base = png().length;
  const padding = total - base - 12;
  if (padding < 0) throw new Error('Size below the minimal PNG');
  return png({ before: [pngChunk('prVt', Buffer.alloc(padding, 7))] });
}

export const apng = () =>
  png({ before: [pngChunk('acTL', Buffer.concat([u32be(1), u32be(0)]))] });

export function jpeg(options: { width?: number; height?: number } = {}) {
  const { width = 1, height = 1 } = options;
  const size = Buffer.alloc(4);
  size.writeUInt16BE(height, 0);
  size.writeUInt16BE(width, 2);
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    Buffer.from([0xff, 0xe0, 0x00, 0x10]),
    Buffer.from('JFIF\0', 'latin1'),
    Buffer.from([1, 1, 0, 0, 1, 0, 1, 0, 0]),
    Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08]),
    size,
    Buffer.from([3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]),
    Buffer.from([0xff, 0xda, 0x00, 0x0c, 3, 1, 0, 2, 0x11, 3, 0x11, 0, 0x3f]),
    Buffer.from([0x00, 0x12, 0x34]),
    Buffer.from([0xff, 0xd9]),
  ]);
}

function riffChunk(type: string, data: Buffer) {
  return Buffer.concat([
    Buffer.from(type, 'latin1'),
    u32le(data.length),
    data,
    data.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0),
  ]);
}
function riff(chunks: Buffer[]) {
  const body = Buffer.concat([Buffer.from('WEBP', 'latin1'), ...chunks]);
  return Buffer.concat([
    Buffer.from('RIFF', 'latin1'),
    u32le(body.length),
    body,
  ]);
}
function vp8l(width: number, height: number) {
  return Buffer.concat([
    Buffer.from([0x2f]),
    u32le((width - 1) | ((height - 1) << 14)),
    Buffer.from([0, 0, 0]),
  ]);
}

export function webpLossless(
  options: { width?: number; height?: number } = {},
) {
  const { width = 1, height = 1 } = options;
  return riff([riffChunk('VP8L', vp8l(width, height))]);
}

export function webpLossy(options: { width?: number; height?: number } = {}) {
  const { width = 1, height = 1 } = options;
  const data = Buffer.alloc(14);
  data.set([0x50, 0x00, 0x00, 0x9d, 0x01, 0x2a]);
  data.writeUInt16LE(width, 6);
  data.writeUInt16LE(height, 8);
  return riff([riffChunk('VP8 ', data)]);
}

function vp8x(flags: number, width: number, height: number) {
  const data = Buffer.alloc(10);
  data[0] = flags;
  data.writeUIntLE(width - 1, 4, 3);
  data.writeUIntLE(height - 1, 7, 3);
  return riffChunk('VP8X', data);
}

export const webpExtended = (width = 2, height = 2) =>
  riff([vp8x(0, width, height), riffChunk('VP8L', vp8l(width, height))]);

export const webpAnimated = () =>
  riff([
    vp8x(0x02, 1, 1),
    riffChunk('ANIM', Buffer.alloc(6)),
    riffChunk('ANMF', Buffer.concat([Buffer.alloc(16), vp8l(1, 1)])),
  ]);

export const gif = () =>
  Buffer.concat([
    Buffer.from('GIF89a', 'latin1'),
    Buffer.from([1, 0, 1, 0, 0, 0, 0, 0x3b]),
  ]);

export const svg = () =>
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>',
  );
