import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { App } from './App';

afterEach(cleanup);

test('monta únicamente el contenido técnico de arranque', () => {
  render(<App />);

  expect(
    screen.getByRole('heading', { name: 'Base técnica de Kofi', level: 1 }),
  ).toBeDefined();
  expect(screen.queryAllByRole('button')).toHaveLength(0);
});
