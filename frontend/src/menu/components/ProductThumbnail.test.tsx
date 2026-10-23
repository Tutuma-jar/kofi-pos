import { afterEach, expect, test } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { catalogFixture } from '../api/fixtures';
import { ProductThumbnail } from './ProductThumbnail';

afterEach(cleanup);
const product = catalogFixture.products[0]!;

test.each([
  'Espresso',
  'Café americano',
  'CAPUCHINO',
  'Café con leche',
  'Latte',
  'Croissant de mantequilla',
])('offers a bundled reference for %s', (name) => {
  render(<ProductThumbnail product={{ ...product, name }} />);
  expect(screen.getByRole('img').getAttribute('src')).toMatch(/\.jpg/);
});

test('unknown products keep the neutral placeholder', () => {
  render(<ProductThumbnail product={{ ...product, name: 'Té verde' }} />);
  expect(screen.getByLabelText('Sin imagen')).toBeTruthy();
});

test('labels reference photos without modifying the product', () => {
  render(<ProductThumbnail product={product} />);
  expect(screen.getByRole('img').getAttribute('alt')).toContain(
    'Fotografía de referencia',
  );
  expect(product.image).toBeNull();
  expect(screen.getByText('Referencia')).toBeTruthy();
});

test('own images take priority and failed images show a neutral placeholder', () => {
  const { container, rerender } = render(
    <ProductThumbnail product={{ ...product, image: 'blob:own-photo' }} />,
  );
  const image = container.querySelector('img')!;
  expect(image.getAttribute('src')).toBe('blob:own-photo');
  expect(image.getAttribute('alt')).toBe('');
  expect(screen.queryByText('Referencia')).toBeNull();
  fireEvent.error(image);
  expect(screen.getByLabelText('Sin imagen')).toBeTruthy();
  rerender(
    <ProductThumbnail product={{ ...product, image: 'blob:new-photo' }} />,
  );
  expect(container.querySelector('img')?.getAttribute('src')).toBe(
    'blob:new-photo',
  );
});
