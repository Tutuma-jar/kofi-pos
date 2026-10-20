import { applicationAuthClient } from '../../auth/api/application-client';
import { createRealMenuClient } from './real-menu-client';
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
// TASK-016: the real API replaces the simulated source; no fixture fallback.
export const menuClient = createRealMenuClient(applicationAuthClient);
export const formatPrice = (tenths: number) =>
  `BOB ${Math.floor(tenths / 10)}.${tenths % 10}`;
