import { Decimal128 } from 'mongodb';
import { expect, test } from 'vitest';
import { safeDashboardInteger } from './dashboard.service.js';

test.each(['0', '1', '101', String(Number.MAX_SAFE_INTEGER)])(
  'exact conversion %s',
  (input) => {
    expect(safeDashboardInteger(Decimal128.fromString(input))).toBe(
      Number(input),
    );
  },
);
test.each(['9007199254740992', '-1', '0.1', 'NaN', 'Infinity'])(
  'rejects unsafe or noninteger %s',
  (input) => {
    expect(() => safeDashboardInteger(Decimal128.fromString(input))).toThrow();
  },
);
