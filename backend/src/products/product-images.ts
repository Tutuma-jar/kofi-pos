import { crc32 } from 'node:zlib';
import type { ImageFormat } from './products.model.js';

/**
 * Structural validation of uploaded images by real content (US-006
 * restrictions). The declared MIME type, extension or name are never used.
 * Pixels are not decoded: no image library is installed. Headers, chunk
 * boundaries, PNG CRCs and start/end markers are checked instead.
 */
export const IMAGE_MAX_BYTES = 5_242_880; // 5 MB of 1.048.576 bytes.
export const IMAGE_MAX_SIDE = 4096;

export type ImageInfo = { format: ImageFormat; width: number; height: number };
export type ImageCheck =
  | ({ ok: true } & ImageInfo)
  | { ok: false; code: 'REQUIRED' | 'INVALID_FORMAT' | 'OUT_OF_RANGE' };

export const imageContentTypes: Record<ImageFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export function checkImage(bytes: Uint8Array): ImageCheck {
  if (bytes.length === 0) return { ok: false, code: 'REQUIRED' };
  const info = detectImage(
    Buffer.from(bytes.buffer, bytes.byteOffset, bytes.length),
  );
  if (!info) return { ok: false, code: 'INVALID_FORMAT' };
  if (
    info.width < 1 ||
    info.height < 1 ||
    info.width > IMAGE_MAX_SIDE ||
    info.height > IMAGE_MAX_SIDE
  )
    return { ok: false, code: 'OUT_OF_RANGE' };
  return { ok: true, ...info };
}

export function detectImage(bytes: Buffer): ImageInfo | null {
  return inspectPng(bytes) ?? inspectJpeg(bytes) ?? inspectWebp(bytes);
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function inspectPng(bytes: Buffer): ImageInfo | null {
  if (
    bytes.length < 8 ||
    PNG_SIGNATURE.some((value, index) => bytes[index] !== value)
  )
    return null;
  let offset = 8;
  let header: ImageInfo | null = null;
  let hasData = false;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (length > 0x7fffffff || end > bytes.length) return null;
    const type = bytes.toString('latin1', offset + 4, offset + 8);
    if (!/^[A-Za-z]{4}$/.test(type)) return null;
    const stored = bytes.readUInt32BE(offset + 8 + length);
    if (crc32(bytes.subarray(offset + 4, offset + 8 + length)) !== stored)
      return null;
    if (!header) {
      if (type !== 'IHDR' || length !== 13) return null;
      header = {
        format: 'png',
        width: bytes.readUInt32BE(offset + 8),
        height: bytes.readUInt32BE(offset + 12),
      };
    } else if (type === 'IHDR') return null;
    // APNG is an animated format.
    if (type === 'acTL' || type === 'fcTL' || type === 'fdAT') return null;
    if (type === 'IDAT') hasData = true;
    if (type === 'IEND')
      return length === 0 && end === bytes.length && hasData ? header : null;
    offset = end;
  }
  return null;
}

function inspectJpeg(bytes: Buffer): ImageInfo | null {
  if (
    bytes.length < 4 ||
    bytes[0] !== 0xff ||
    bytes[1] !== 0xd8 ||
    bytes[2] !== 0xff
  )
    return null;
  let offset = 2;
  let frame: ImageInfo | null = null;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    let marker = bytes[offset + 1]!;
    while (marker === 0xff && offset + 2 < bytes.length) {
      offset++;
      marker = bytes[offset + 1]!;
    }
    // Standalone markers have no length.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x00) return null;
    if (offset + 4 > bytes.length) return null;
    const length = bytes.readUInt16BE(offset + 2);
    if (length < 2 || offset + 2 + length > bytes.length) return null;
    if (marker === 0xda) {
      // Entropy-coded data follows; the image must end with EOI after it.
      const scanStart = offset + 2 + length;
      return frame &&
        bytes.length >= scanStart + 2 &&
        bytes.lastIndexOf(Buffer.from([0xff, 0xd9])) >= scanStart
        ? frame
        : null;
    }
    const isFrame =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (isFrame) {
      if (frame || length < 8) return null;
      const height = bytes.readUInt16BE(offset + 5);
      const width = bytes.readUInt16BE(offset + 7);
      // A zero height is defined later by DNL; not supported.
      if (width === 0 || height === 0) return null;
      frame = { format: 'jpeg', width, height };
    }
    offset += 2 + length;
  }
  return null;
}

function webpBitstream(
  type: string,
  data: Buffer,
): { width: number; height: number } | null {
  if (type === 'VP8 ') {
    // Key frame (bit 0 = 0) and start code 9D 01 2A.
    if (
      data.length < 10 ||
      (data[0]! & 0x01) !== 0 ||
      data[3] !== 0x9d ||
      data[4] !== 0x01 ||
      data[5] !== 0x2a
    )
      return null;
    return {
      width: data.readUInt16LE(6) & 0x3fff,
      height: data.readUInt16LE(8) & 0x3fff,
    };
  }
  if (type === 'VP8L') {
    if (data.length < 5 || data[0] !== 0x2f) return null;
    const bits = data.readUInt32LE(1);
    // Version bits (29-31) must be zero.
    if (bits >>> 29 !== 0) return null;
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >>> 14) & 0x3fff) + 1,
    };
  }
  return null;
}

function inspectWebp(bytes: Buffer): ImageInfo | null {
  if (
    bytes.length < 20 ||
    bytes.toString('latin1', 0, 4) !== 'RIFF' ||
    bytes.toString('latin1', 8, 12) !== 'WEBP' ||
    bytes.readUInt32LE(4) + 8 !== bytes.length
  )
    return null;
  let offset = 12;
  let canvas: { width: number; height: number } | null = null;
  let image: { width: number; height: number } | null = null;
  let first = true;
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) return null;
    const type = bytes.toString('latin1', offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    const dataEnd = offset + 8 + size;
    const next = dataEnd + (size % 2);
    if (dataEnd > bytes.length || next > bytes.length) return null;
    const data = bytes.subarray(offset + 8, dataEnd);
    if (type === 'ANIM' || type === 'ANMF') return null;
    if (first) {
      first = false;
      if (type === 'VP8X') {
        if (data.length < 10) return null;
        // Animation flag.
        if ((data[0]! & 0x02) !== 0) return null;
        canvas = {
          width: data.readUIntLE(4, 3) + 1,
          height: data.readUIntLE(7, 3) + 1,
        };
      } else {
        image = webpBitstream(type, data);
        if (!image) return null;
      }
    } else if (type === 'VP8 ' || type === 'VP8L') {
      if (image) return null;
      image = webpBitstream(type, data);
      if (!image) return null;
    }
    offset = next;
  }
  if (!image) return null;
  return { format: 'webp', ...(canvas ?? image) };
}
