import { useRef, useState } from 'react';
import { Button } from '../../shared/components/Button';
import { menuClient, MenuError, validateProduct } from '../api/menu-client';
import type {
  Category,
  Fields,
  Product,
  ProductInput,
} from '../api/menu-client';
import { ProductImageField } from './ProductImageField';
import styles from './Menu.module.css';
export function ProductForm({
  product,
  categories,
  draft,
  onDraft,
  onSaved,
  onCancel,
  onCategories,
  onConflict,
  onDirty,
  onBusy,
  conflictMessage = '',
}: {
  product?: Product;
  categories: Category[];
  draft?: ProductInput & { priceText?: string };
  onDraft: (input: ProductInput & { priceText?: string }) => void;
  onSaved: () => void;
  onCancel: () => void;
  onCategories: () => void;
  onConflict: (product: Product) => void;
  onDirty: (dirty: boolean) => void;
  onBusy?: (busy: boolean) => void;
  conflictMessage?: string;
}) {
  const initial = draft ??
    product ?? {
      name: '',
      description: '',
      priceTenths: 0,
      categoryId: '',
      image: null,
    };
  const [input, setInput] = useState<ProductInput>(initial);
  const [price, setPrice] = useState(
    draft?.priceText ??
      (initial.priceTenths
        ? `${Math.floor(initial.priceTenths / 10)}.${initial.priceTenths % 10}`
        : ''),
  );
  const [errors, setErrors] = useState<Fields>({});
  const [message, setMessage] = useState(conflictMessage);
  const [busy, setBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageInvalid, setImageInvalid] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const update = (next: ProductInput) => {
    setInput(next);
    onDirty(true);
  };
  const focusError = (fields: Fields) => {
    requestAnimationFrame(() =>
      form.current
        ?.querySelector<HTMLElement>(`[name="${Object.keys(fields)[0]}"]`)
        ?.focus(),
    );
  };
  const save = async () => {
    const tenths = /^\d+(?:[.,]\d)?$/.test(price.trim())
      ? Number(price.replace(',', '').replace('.', '')) *
        (/[.,]/.test(price) ? 1 : 10)
      : NaN;
    const next = { ...input, priceTenths: tenths };
    const fields = validateProduct(next);
    setErrors(fields);
    if (Object.keys(fields).length) {
      focusError(fields);
      return;
    }
    setBusy(true);
    onBusy?.(true);
    setMessage('');
    try {
      await menuClient.saveProduct(next, product);
      onDirty(false);
      onSaved();
    } catch (error) {
      if (error instanceof MenuError) {
        setMessage(error.message);
        setErrors(error.fields);
        focusError(error.fields);
        if (error.code === 'CONFLICT' && product) {
          try {
            const latest = await menuClient.getProduct(product.id);
            onDirty(false);
            onConflict(latest);
          } catch {
            setMessage(
              'No se pudo recuperar la versión actual. Cierra y vuelve a abrir el producto.',
            );
          }
        }
      } else setMessage('No pudimos guardar. Reintenta.');
    } finally {
      setBusy(false);
      onBusy?.(false);
    }
  };
  return (
    <form
      ref={form}
      className={styles.form}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!busy && !imageBusy && !imageInvalid) void save();
      }}
    >
      <div className={styles.formBody}>
        <fieldset disabled={busy || imageBusy}>
          <label htmlFor="product-name">Nombre</label>
          <input
            id="product-name"
            name="name"
            autoFocus
            value={input.name}
            aria-invalid={!!errors.name}
            aria-describedby="name-error"
            onChange={(e) => update({ ...input, name: e.target.value })}
          />
          <span id="name-error" className={styles.error}>
            {errors.name}
          </span>
          <label htmlFor="product-description">Descripción</label>
          <textarea
            id="product-description"
            name="description"
            rows={3}
            value={input.description}
            aria-invalid={!!errors.description}
            aria-describedby="description-error"
            onChange={(e) => update({ ...input, description: e.target.value })}
          />
          <span id="description-error" className={styles.error}>
            {errors.description}
          </span>
          <div className={styles.twoColumns}>
            <div>
              <label htmlFor="product-price">Precio (BOB)</label>
              <input
                id="product-price"
                name="price"
                inputMode="decimal"
                value={price}
                aria-invalid={!!errors.price}
                aria-describedby="price-error"
                onChange={(e) => {
                  setPrice(e.target.value);
                  onDirty(true);
                }}
              />
              <span id="price-error" className={styles.error}>
                {errors.price}
              </span>
            </div>
            <div>
              <label htmlFor="product-category">Categoría</label>
              <select
                id="product-category"
                name="categoryId"
                value={input.categoryId}
                aria-invalid={!!errors.categoryId}
                aria-describedby="category-error"
                onChange={(e) =>
                  update({ ...input, categoryId: e.target.value })
                }
              >
                <option value="">Seleccionar categoría</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <span id="category-error" className={styles.error}>
                {errors.categoryId}
              </span>
            </div>
          </div>
          <Button
            onClick={() => {
              onDraft({
                ...input,
                priceText: price,
                priceTenths: /^\d+([.,]\d)?$/.test(price)
                  ? Math.round(Number(price.replace(',', '.')) * 10)
                  : 0,
              });
              onCategories();
            }}
          >
            Administrar categorías
          </Button>
          <ProductImageField
            value={input.image}
            onChange={(image) => update({ ...input, image })}
            onBusy={(value) => {
              setImageBusy(value);
              onBusy?.(value);
            }}
            onValidity={(valid) => setImageInvalid(!valid)}
          />
        </fieldset>
        <p role="alert" className={styles.error}>
          {message}
        </p>
      </div>
      <footer className={styles.formFooter}>
        <Button disabled={busy || imageBusy} onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={busy || imageBusy || imageInvalid}
        >
          {busy ? 'Guardando…' : 'Guardar producto'}
        </Button>
      </footer>
    </form>
  );
}
