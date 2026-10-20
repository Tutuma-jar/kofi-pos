/** Contrato de UI para US-006–009. IDs opacos (hex de 24) y `version` entera.
 * TASK-016 (contrato aprobado): `GET/POST /api/products`, `GET /api/products/:id`,
 * `POST /api/product-images` (binario) y `GET /api/product-images/:id`.
 * Imágenes: al guardar, data URL local de la imagen nueva; al leer, object URL
 * de la imagen protegida descargada con autorización, o `null` (marcador neutro).
 * Conteo acordado con backend (TASK-020): grafemas tras trim(), igual en ambos lados.
 * La validación del navegador no sustituye la validación autoritativa del backend.
 */
export type Category = { id: string; version: number; name: string };
export type Product = {
  id: string;
  version: number;
  name: string;
  description: string;
  priceTenths: number;
  categoryId: string;
  image: string | null;
  active: boolean;
};
export type ProductInput = Omit<Product, 'id' | 'version' | 'active'>;
export type Catalog = { products: Product[]; categories: Category[] };
export type Fields = Record<string, string>;
export type Scenario =
  | 'normal'
  | 'empty'
  | 'no-categories'
  | 'connection'
  | 'slow'
  | 'save-error'
  | 'conflict'
  | 'image-error';
export class MenuError extends Error {
  constructor(
    public code:
      | 'VALIDATION_ERROR'
      | 'CONFLICT'
      | 'CATEGORY_NOT_EMPTY'
      | 'CONNECTION_ERROR'
      | 'IMAGE_ERROR',
    message: string,
    public fields: Fields = {},
  ) {
    super(message);
  }
}
export interface MenuClient {
  list(): Promise<Catalog>;
  getProduct(id: string): Promise<Product>;
  saveProduct(input: ProductInput, current?: Product): Promise<Product>;
  setActive(product: Product): Promise<void>;
  saveCategory(name: string, current?: Category): Promise<void>;
  deleteCategory(category: Category): Promise<void>;
  setScenario(scenario: Scenario): void;
}
