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
  onConflict: (
    product: Product,
    draft: ProductInput & { priceText: string },
  ) => void;
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
  const [message, setMessage] = useState('');
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
            // Keep local edits, but adopt remote changes to untouched fields.
            // In particular, never try uploading an obsolete image object URL.
            const recovered = {
              name: input.name === product.name ? latest.name : input.name,
              description:
                input.description === product.description
                  ? latest.description
                  : input.description,
              categoryId:
                input.categoryId === product.categoryId
                  ? latest.categoryId
                  : input.categoryId,
              image: input.image === product.image ? latest.image : input.image,
              priceTenths:
                next.priceTenths === product.priceTenths
                  ? latest.priceTenths
                  : next.priceTenths,
              priceText:
                next.priceTenths === product.priceTenths
                  ? (latest.priceTenths / 10).toFixed(1)
                  : price,
            };
            onDraft(recovered);
            onConflict(latest, recovered);
          } catch {
            setMessage(
              'No se pudo consultar la versión actual. Tus cambios siguen aquí. Reintenta guardar para volver a consultarla.',
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
        {conflictMessage && product && (
          <section className={styles.conflict} aria-labelledby="conflict-title">
            <h3 id="conflict-title">El producto cambió en otra sesión</h3>
            <p role="alert">
              Conservamos tus cambios. Compara la versión actual antes de
              guardar; guardar tus cambios reemplazará los valores actuales.
            </p>
            <dl>
              <dt>Nombre actual</dt>
              <dd>{product.name}</dd>
              <dt>Descripción actual</dt>
              <dd>{product.description || 'Sin descripción'}</dd>
              <dt>Precio actual</dt>
              <dd>BOB {(product.priceTenths / 10).toFixed(1)}</dd>
              <dt>Categoría actual</dt>
              <dd>
                {categories.find(
                  (category) => category.id === product.categoryId,
                )?.name ?? 'Categoría no disponible'}
              </dd>
              <dt>Imagen actual</dt>
              <dd>
                {product.image ? (
                  <img
                    className={styles.preview}
                    src={product.image}
                    alt="Imagen de la versión actual"
                  />
                ) : (
                  'Sin imagen propia'
                )}
              </dd>
            </dl>
            <p>Tus valores se mantienen en los campos de abajo.</p>
            <Button
              disabled={busy || imageBusy}
              onClick={() => {
                if (
                  !window.confirm(
                    '¿Descartar tus cambios y usar la versión actual?',
                  )
                )
                  return;
                setInput(product);
                setPrice((product.priceTenths / 10).toFixed(1));
                setErrors({});
                onDraft({
                  ...product,
                  priceText: (product.priceTenths / 10).toFixed(1),
                });
                onDirty(false);
              }}
            >
              Usar versión actual
            </Button>
          </section>
        )}
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
                aria-describedby="price-help price-error"
                onChange={(e) => {
                  setPrice(e.target.value);
                  onDirty(true);
                }}
              />
              <small id="price-help">
                Por ejemplo: 22 o 22,5. Hasta un decimal.
              </small>
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
          {busy
            ? 'Guardando…'
            : conflictMessage
              ? 'Guardar mis cambios'
              : 'Guardar producto'}
        </Button>
      </footer>
    </form>
  );
}
