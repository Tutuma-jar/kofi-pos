import { createDemoClient } from './demo-client';
export { MenuError } from './contract.provisional';
export type {
  Category,
  Product,
  ProductInput,
  Catalog,
  Fields,
  MenuClient,
  Scenario,
} from './contract.provisional';
export { validateProduct, visibleLength } from './demo-client';
export const menuClient = createDemoClient();
export const formatPrice = (tenths: number) =>
  `BOB ${Math.floor(tenths / 10)}.${tenths % 10}`;
