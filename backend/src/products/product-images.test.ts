import { expect, test } from 'vitest';
import { checkImage, IMAGE_MAX_BYTES } from './product-images.js';
import {
  apng,
  gif,
  jpeg,
  png,
  pngChunk,
  pngOfSize,
  svg,
  webpAnimated,
  webpExtended,
  webpLossless,
  webpLossy,
} from './product-images.test-support.js';

test.each([
  ['PNG', png({ width: 3, height: 2 }), 'png', 3, 2],
  ['JPEG', jpeg({ width: 640, height: 480 }), 'jpeg', 640, 480],
  ['WebP lossless', webpLossless({ width: 5, height: 7 }), 'webp', 5, 7],
  ['WebP lossy', webpLossy({ width: 9, height: 4 }), 'webp', 9, 4],
  ['WebP extended (still)', webpExtended(2, 3), 'webp', 2, 3],
])('CA-05/CA-07 accepts %s by real content', (_n, bytes, format, w, h) => {
  expect(checkImage(bytes)).toEqual({ ok: true, format, width: w, height: h });
});

test.each([
  ['PNG', (side: number) => png({ width: side, height: 1 })],
  ['PNG height', (side: number) => png({ width: 1, height: side })],
  ['JPEG', (side: number) => jpeg({ width: side, height: 1 })],
  ['WebP', (side: number) => webpLossless({ width: 1, height: side })],
  ['WebP lossy', (side: number) => webpLossy({ width: side, height: 1 })],
  ['WebP extended', (side: number) => webpExtended(side, 1)],
])('CA-07 %s: 4096 px per side accepted, 4097 rejected', (_n, build) => {
  expect(checkImage(build(4096)).ok).toBe(true);
  expect(checkImage(build(4097))).toEqual({ ok: false, code: 'OUT_OF_RANGE' });
});

test('CA-07 dimensions of zero are not an image', () => {
  expect(checkImage(png({ width: 0, height: 1 })).ok).toBe(false);
  expect(checkImage(jpeg({ width: 0, height: 1 })).ok).toBe(false);
});

test.each([
  ['SVG', svg()],
  ['GIF', gif()],
  ['APNG (animated PNG)', apng()],
  ['animated WebP', webpAnimated()],
  ['plain text', Buffer.from('not an image')],
  ['PNG signature only', png().subarray(0, 8)],
  ['truncated PNG', png().subarray(0, png().length - 5)],
  ['truncated JPEG', jpeg().subarray(0, 30)],
  ['JPEG without EOI', jpeg().subarray(0, jpeg().length - 2)],
  ['truncated WebP', webpLossless().subarray(0, 20)],
])('CA-07 rejects %s as INVALID_FORMAT', (_name, bytes) => {
  expect(checkImage(bytes)).toEqual({ ok: false, code: 'INVALID_FORMAT' });
});

test('CA-07 PNG with a corrupted CRC or data after IEND is rejected', () => {
  const corrupted = Buffer.from(png());
  corrupted[29] = corrupted[29]! ^ 0xff; // IHDR CRC
  expect(checkImage(corrupted).ok).toBe(false);
  expect(
    checkImage(Buffer.concat([png(), pngChunk('tEXt', Buffer.from('x'))])).ok,
  ).toBe(false);
});

test('CA-07 a WebP whose RIFF size does not match the file is rejected', () => {
  const bytes = Buffer.from(webpLossless());
  bytes.writeUInt32LE(bytes.readUInt32LE(4) + 2, 4);
  expect(checkImage(bytes).ok).toBe(false);
});

test('CA-07 empty content is a missing image', () => {
  expect(checkImage(Buffer.alloc(0))).toEqual({ ok: false, code: 'REQUIRED' });
});

test('CA-07 size limit is 5 MB of 1.048.576 bytes', () => {
  expect(IMAGE_MAX_BYTES).toBe(5_242_880);
  const exact = pngOfSize(IMAGE_MAX_BYTES);
  expect(exact.length).toBe(5_242_880);
  expect(checkImage(exact).ok).toBe(true);
});

test('CA-07 the content decides, not a forged name or declared type', () => {
  // A JPEG renamed to .png or declared image/png is still detected as JPEG.
  expect(checkImage(jpeg())).toMatchObject({ ok: true, format: 'jpeg' });
  // An SVG wrapped with a PNG-looking prefix is still rejected.
  expect(checkImage(Buffer.concat([png().subarray(0, 8), svg()])).ok).toBe(
    false,
  );
});
