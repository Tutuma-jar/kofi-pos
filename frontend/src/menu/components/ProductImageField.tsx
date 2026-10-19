import { useRef, useState } from 'react';
import { Button } from '../../shared/components/Button';
import styles from './Menu.module.css';
async function readProductImage(file: File): Promise<string> {
  if (file.size > 5242880) throw new Error('La imagen supera los 5 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ascii = new TextDecoder('latin1').decode(bytes);
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const png = bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10';
  const webp = ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP';
  if (
    (!jpeg && !png && !webp) ||
    (png && ascii.includes('acTL')) ||
    (webp && (ascii.includes('ANIM') || ascii.includes('ANMF')))
  )
    throw new Error('Usa JPEG, PNG o WebP sin animación.');
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });
  await new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      if (image.naturalWidth > 4096 || image.naturalHeight > 4096)
        reject(new Error('El máximo es 4.096 píxeles por lado.'));
      else resolve();
    };
    image.onerror = () =>
      reject(new Error('El contenido de la imagen no es válido.'));
    image.src = source;
  });
  return source;
}
export function ProductImageField({
  value,
  onChange,
  onBusy,
  onValidity,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  onBusy: (busy: boolean) => void;
  onValidity?: (valid: boolean) => void;
}) {
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  return (
    <div className={styles.imageField}>
      <label htmlFor="product-image">Imagen opcional</label>
      <p id="image-help">
        JPEG, PNG o WebP · hasta 5 MB · 4.096 px por lado · sin animación
      </p>
      {value && (
        <img
          className={styles.preview}
          src={value}
          alt="Vista previa del producto"
        />
      )}
      <input
        ref={fileInput}
        id="product-image"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={reading}
        aria-describedby="image-help image-error"
        aria-invalid={!!error}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          setReading(true);
          onBusy(true);
          setError('');
          void readProductImage(file)
            .then((image) => {
              onChange(image);
              onValidity?.(true);
            })
            .catch((reason: Error) => {
              setError(reason.message);
              onValidity?.(false);
            })
            .finally(() => {
              setReading(false);
              onBusy(false);
            });
        }}
      />
      {value && (
        <Button
          disabled={reading}
          onClick={() => {
            onChange(null);
            setError('');
            onValidity?.(true);
            if (fileInput.current) fileInput.current.value = '';
          }}
        >
          Quitar imagen
        </Button>
      )}
      {error && (
        <Button
          onClick={() => {
            if (fileInput.current) fileInput.current.value = '';
            setError('');
            onValidity?.(true);
          }}
        >
          Descartar archivo seleccionado
        </Button>
      )}
      <span id="image-error" role="status" className={styles.error}>
        {reading ? 'Comprobando imagen…' : error}
      </span>
    </div>
  );
}
