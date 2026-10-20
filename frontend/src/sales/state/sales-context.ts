import { createContext, useContext } from 'react';
import type {
  Catalog,
  Line,
  Outcome,
  PaymentMethod,
  Product,
  Quote,
  Receipt,
  Review,
  Scenario,
} from '../api/contract.provisional';

export type SalesState = {
  lines: Line[];
  catalog: Catalog | null;
  catalogStatus: 'loading' | 'ready' | 'error';
  phase:
    'editing' | 'reviewing' | 'payment' | 'uncertain' | 'success' | 'closed';
  quote: Quote | null;
  review: Review | null;
  method: PaymentMethod | null;
  operationId: string | null;
  receipt: Receipt | null;
  busy: boolean;
  message: string;
  terminalId: string | null;
};
export const initialSalesState: SalesState = {
  lines: [],
  catalog: null,
  catalogStatus: 'loading',
  phase: 'editing',
  quote: null,
  review: null,
  method: null,
  operationId: null,
  receipt: null,
  busy: false,
  message: '',
  terminalId: null,
};
export function salesReducer(
  state: SalesState,
  action: { type: 'patch'; value: Partial<SalesState> } | { type: 'reset' },
): SalesState {
  return action.type === 'reset'
    ? { ...initialSalesState }
    : { ...state, ...action.value };
}
export type SalesContextValue = {
  state: SalesState;
  scenario: Scenario;
  setScenario: (value: Scenario) => void;
  open: () => Promise<void>;
  add: (product: Product) => void;
  quantity: (id: string, value: string) => boolean;
  remove: (id: string) => void;
  edit: () => void;
  review: () => Promise<void>;
  confirmReview: () => Promise<void>;
  chooseMethod: (value: PaymentMethod) => void;
  register: () => Promise<void>;
  recover: (reconcile?: boolean) => Promise<void>;
  retry: () => Promise<void>;
  newSale: () => Promise<void>;
  beforeLogout: () => boolean;
  seen: () => void;
};
export type { Outcome };
export const SalesContext = createContext<SalesContextValue | null>(null);
export function useSales() {
  const value = useContext(SalesContext);
  if (!value) throw new Error('Falta el proveedor de Ventas');
  return value;
}
