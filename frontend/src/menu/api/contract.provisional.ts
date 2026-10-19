/** Contrato provisional de UI para US-006–009. Sin endpoints ni persistencia.
 * IDs/versiones opacos en integración futura; aquí versiones numéricas en memoria.
 * Imágenes: data URL temporal validada por el simulador; no define almacenamiento.
 * El conteo por grafemas es provisional y debe acordarse con backend.
 * Errores y validación son simulados, no sustituyen validación autoritativa.
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
