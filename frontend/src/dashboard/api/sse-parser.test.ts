import { expect, test, vi } from 'vitest';
import { createSseParser } from './sse-parser';

test('byte-fragmented UTF-8, CRLF, comments, several events and unknown fields', () => {
  const sale = vi.fn();
  const activity = vi.fn();
  const parser = createSseParser(sale, activity);
  const bytes = new TextEncoder().encode(
    ': latido café\r\n\r\nevent: unknown\ndata: anything\n\nevent: sales-changed\r\ndata: {}\r\n\r\nevent: sales-changed\ndata: {}\n\n',
  );
  for (const byte of bytes) parser.push(Uint8Array.of(byte));
  expect(sale).toHaveBeenCalledTimes(2);
  expect(activity).toHaveBeenCalledTimes(bytes.length);
});
test('no partial-event publication; malformed and oversized frames rejected', () => {
  const sale = vi.fn();
  const parser = createSseParser(sale, () => {});
  parser.push(new TextEncoder().encode('event: sales-changed\ndata: {}\n'));
  expect(sale).not.toHaveBeenCalled();
  parser.push(new TextEncoder().encode('\n'));
  expect(sale).toHaveBeenCalledOnce();
  expect(() =>
    parser.push(
      new TextEncoder().encode(
        'event: sales-changed\ndata: {"increment":1}\n\n',
      ),
    ),
  ).toThrow();
  expect(() =>
    createSseParser(sale, () => {}).push(
      new TextEncoder().encode('x'.repeat(65_537)),
    ),
  ).toThrow();
});
