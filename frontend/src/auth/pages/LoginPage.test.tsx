import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, expect, test } from 'vitest';
import { createAuthClient } from '../api/auth-client';
import type { AuthClient, SessionState } from '../api/contract.provisional';
import { AuthContext } from '../auth-context';
import { LoginPage } from './LoginPage';

const clients: AuthClient[] = [];
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.dispose());
});

function mount(initial: SessionState = { status: 'anonymous' }) {
  const client = createAuthClient({ initial });
  clients.push(client);
  render(
    <MemoryRouter>
      <AuthContext value={client}>
        <LoginPage />
      </AuthContext>
    </MemoryRouter>,
  );
}

test('portada presenta la marca y acceso directo sin registro ni pasos adicionales', () => {
  mount();
  expect(screen.getByRole('heading', { name: /Tu cafetería/ })).toBeTruthy();
  const access = screen.getByRole('region', { name: 'Iniciar sesión' });
  expect(within(access).getByLabelText('Usuario')).toBeTruthy();
  expect(within(access).getByLabelText('Contraseña')).toBeTruthy();
  expect(
    within(access).getByRole('button', { name: 'Iniciar sesión' }),
  ).toBeTruthy();
  const skip = screen.getByRole('link', { name: 'Ir al acceso' });
  expect(skip.getAttribute('href')).toBe('#login-heading');
  expect(document.activeElement).toBe(
    screen.getByRole('heading', { name: 'Iniciar sesión' }),
  );
  expect(screen.queryByRole('link', { name: /registr|recuper/i })).toBeNull();
});

test('fotografía local tiene dimensiones y crédito separado de la acción de entrar', () => {
  mount();
  const image = screen.getByRole('img', { name: /cafetería de Montreal/ });
  expect(image.getAttribute('src')).toContain('coffee-montreal.jpg');
  expect(image.getAttribute('width')).toBe('1920');
  expect(image.getAttribute('height')).toBe('1280');
  const credit = screen.getByRole('link', { name: /Luke Chesser · CC0/ });
  expect(credit.getAttribute('href')).toContain('commons.wikimedia.org');
  expect(credit.getAttribute('rel')).toContain('noreferrer');
  expect(credit.closest('form')).toBeNull();
  expect(
    screen
      .getByRole('button', { name: 'Iniciar sesión' })
      .compareDocumentPosition(credit) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).not.toBe(0);
});

test('comprobación inicial no expone portada ni formulario prematuramente', () => {
  mount({ status: 'checking' });
  expect(screen.getByRole('status').textContent).toContain(
    'Comprobando sesión',
  );
  expect(screen.queryByRole('img')).toBeNull();
  expect(screen.queryByLabelText('Contraseña')).toBeNull();
});
