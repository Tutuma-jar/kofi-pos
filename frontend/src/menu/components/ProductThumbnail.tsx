import { useState } from 'react';
import espresso from '../assets/espresso.jpg';
import cappuccino from '../assets/cappuccino.jpg';
import latte from '../assets/latte.jpg';
import croissant from '../assets/croissant.jpg';
import type { Product } from '../api/contract.provisional';
import styles from './Menu.module.css';

// Presentation only: references are never saved as the product's own image.
function referenceImage(name: string): string | null {
  const normalized = name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  if (/\bcroissant\b/.test(normalized)) return croissant;
  if (/\b(cappuccino|capuccino|capuchino)\b/.test(normalized))
    return cappuccino;
  if (/\blatte\b|\bcafe con leche\b/.test(normalized)) return latte;
  if (/\b(espresso|expreso|americano)\b/.test(normalized)) return espresso;
  return null;
}

export function ProductThumbnail({ product }: { product: Product }) {
  const source = product.image ?? referenceImage(product.name);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  if (source && source !== failedSource) {
    return (
      <img
        className={styles.thumbnail}
        src={source}
        alt={product.image ? '' : `Fotografía de referencia: ${product.name}`}
        title={product.image ? undefined : 'Fotografía de referencia'}
        loading="lazy"
        decoding="async"
        onError={() => setFailedSource(source)}
      />
    );
  }
  return (
    <span className={styles.placeholder} aria-label="Sin imagen">
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4"
          fill="none"
          stroke="currentColor"
        />
      </svg>
    </span>
  );
}
