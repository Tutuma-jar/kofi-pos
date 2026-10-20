/** US-010–013. UI assumptions, NOT approved HTTP routes/DTOs.
 * Replace sales-client.ts with an adapter using AuthClient.request when approved.
 * All money and service validation below are simulated, never authoritative.
 */
export type Product = {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  priceTenths: number;
  image: string | null;
  active: boolean;
};
export type Catalog = {
  products: Product[];
  categories: { id: string; name: string }[];
};
export type Line = { product: Product; quantity: number };
export type Quote = {
  lines: Line[];
  totalTenths: number;
  changes: {
    productId: string;
    name: string;
    previousName: string;
    previousTenths: number;
    currentTenths: number;
    unavailable: boolean;
  }[];
};
export type Review = Quote & { operationId: string; evidence: string };
export type PaymentMethod = 'cash' | 'qr';
export type Receipt = {
  operationId: string;
  totalTenths: number;
  method: PaymentMethod;
  confirmedAt: string;
};
export type Outcome =
  | { kind: 'registered'; receipt: Receipt }
  | { kind: 'uncertain' }
  | { kind: 'not-registered'; message: string };
export type Scenario =
  | 'normal'
  | 'empty'
  | 'catalog-error'
  | 'price-change'
  | 'unavailable'
  | 'review-race'
  | 'review-connection'
  | 'validation'
  | 'lost-saved'
  | 'lost-unsaved'
  | 'connection';
export class SalesError extends Error {
  constructor(
    public code: 'validation' | 'connection' | 'unauthorized' | 'storage',
    message: string,
  ) {
    super(message);
  }
}
export type SalesClient = {
  catalog: () => Promise<Catalog>;
  quote: (lines: Line[]) => Promise<Quote>;
  confirmReview: (operationId: string, quote: Quote) => Promise<Review | Quote>;
  register: (review: Review, method: PaymentMethod) => Promise<Outcome>;
  check: (operationId: string) => Promise<Outcome>;
  reconcile: (operationId: string) => Promise<Outcome>;
  references: () => string[];
  remember: (operationId: string) => void;
  acknowledge: (operationId: string) => void;
};
