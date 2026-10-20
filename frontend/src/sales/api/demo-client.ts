import type { AuthClient } from '../../auth/api/contract.provisional';
import { assertRequestSize, calculateAmounts } from './amounts';
import { catalogFixture } from './fixtures';
import { createOperationReferences } from './operation-references';
import {
  SalesError,
  type Line,
  type Quote,
  type Review,
  type Outcome,
  type SalesClient,
  type Scenario,
} from './contract.provisional';

/** In-memory fake service, with no fetch, persistence of sales, or dashboard events.
 * HMAC, durable atomic reconciliation and cross-process idempotency need backend.
 */
export function createDemoSalesClient(options: {
  auth: Pick<AuthClient, 'getSnapshot'>;
  storage: Storage;
  scenario?: () => Scenario;
  delay?: number;
}): SalesClient {
  const references = createOperationReferences(options.storage);
  const operations = new Map<string, { body?: string; outcome: Outcome }>();
  const evidences = new Map<string, string>();
  let changed = false;
  let changedProductId: string | null = null;
  const scenario = () => options.scenario?.() ?? 'normal';
  const authorize = () => {
    if (options.auth.getSnapshot().status !== 'authenticated')
      throw new SalesError(
        'unauthorized',
        'Inicia sesión para comprobar esta operación.',
      );
  };
  const wait = async () => {
    authorize();
    await new Promise((resolve) => setTimeout(resolve, options.delay ?? 350));
    authorize();
  };
  const currentQuote = (lines: Line[], race = false): Quote => {
    if (!lines.length)
      throw new SalesError(
        'validation',
        'Agrega productos para preparar una venta',
      );
    assertRequestSize(lines);
    const next = structuredClone(lines);
    changedProductId ??= next[0]!.product.id;
    const target = next.find((line) => line.product.id === changedProductId);
    if (
      target &&
      (scenario() === 'price-change' ||
        (scenario() === 'review-race' && (changed || race)))
    )
      target.product.priceTenths =
        (catalogFixture.products.find((p) => p.id === target.product.id)
          ?.priceTenths ?? target.product.priceTenths) + 20;
    if (target && scenario() === 'unavailable') target.product.active = false;
    const changes = next.flatMap((line, index) => {
      const previous = lines[index]!.product;
      return line.product.priceTenths !== previous.priceTenths ||
        line.product.name !== previous.name ||
        !line.product.active
        ? [
            {
              productId: line.product.id,
              name: line.product.name,
              previousName: previous.name,
              previousTenths: previous.priceTenths,
              currentTenths: line.product.priceTenths,
              unavailable: !line.product.active,
            },
          ]
        : [];
    });
    return {
      lines: next,
      changes,
      totalTenths: calculateAmounts(next.filter((line) => line.product.active))
        .totalTenths,
    };
  };
  return {
    ...references,
    async catalog() {
      await wait();
      if (scenario() === 'catalog-error')
        throw new SalesError(
          'connection',
          'No pudimos consultar los productos.',
        );
      const catalog = structuredClone(catalogFixture);
      catalog.products =
        scenario() === 'empty' ? [] : catalog.products.filter((p) => p.active);
      catalog.categories = catalog.categories.filter((c) =>
        catalog.products.some((p) => p.categoryId === c.id),
      );
      return catalog;
    },
    async quote(lines) {
      await wait();
      if (scenario() === 'review-connection')
        throw new SalesError(
          'connection',
          'No pudimos comprobar el catálogo. No cobres todavía; reintenta la revisión.',
        );
      return currentQuote(lines);
    },
    async confirmReview(operationId, quote) {
      await wait();
      if (scenario() === 'review-connection')
        throw new SalesError(
          'connection',
          'No pudimos confirmar la revisión. No cobres todavía; vuelve a intentarlo.',
        );
      // Re-read at confirmation: use original fixture prices as the service truth.
      const original = quote.lines.map((line) => ({
        ...line,
        product: {
          ...line.product,
          priceTenths:
            catalogFixture.products.find((p) => p.id === line.product.id)
              ?.priceTenths ?? line.product.priceTenths,
        },
      }));
      const latest = currentQuote(original, true);
      if (scenario() === 'review-race') changed = true;
      if (
        latest.lines.some(
          (line, index) =>
            !line.product.active ||
            line.product.priceTenths !==
              quote.lines[index]!.product.priceTenths ||
            line.product.name !== quote.lines[index]!.product.name,
        )
      ) {
        latest.changes = latest.lines.flatMap((line, index) => {
          const old = quote.lines[index]!.product;
          return line.product.priceTenths !== old.priceTenths ||
            !line.product.active
            ? [
                {
                  productId: line.product.id,
                  name: line.product.name,
                  previousName: old.name,
                  previousTenths: old.priceTenths,
                  currentTenths: line.product.priceTenths,
                  unavailable: !line.product.active,
                },
              ]
            : [];
        });
        return latest;
      }
      if (latest.lines.some((line) => !line.product.active)) return latest;
      const review: Review = {
        ...latest,
        operationId,
        evidence: crypto.randomUUID(),
      };
      evidences.set(review.evidence, JSON.stringify(review));
      return review;
    },
    async register(review, method) {
      await wait();
      const body = JSON.stringify({ review, method });
      const previous = operations.get(review.operationId);
      if (previous) {
        if (previous.body && previous.body !== body)
          return {
            kind: 'not-registered',
            message: 'El contenido no coincide con la identidad enviada.',
          };
        if (previous.outcome.kind !== 'uncertain') return previous.outcome;
      }
      let invalid =
        scenario() === 'validation' ||
        !['cash', 'qr'].includes(method) ||
        evidences.get(review.evidence) !== JSON.stringify(review);
      try {
        assertRequestSize({ review, method });
        calculateAmounts(review.lines);
      } catch {
        invalid = true;
      }
      if (invalid) {
        const outcome: Outcome = {
          kind: 'not-registered',
          message: 'El servicio simulado rechazó los datos de la operación.',
        };
        operations.set(review.operationId, { body, outcome });
        return outcome;
      }
      if (scenario() === 'connection' || scenario() === 'lost-unsaved') {
        operations.set(review.operationId, {
          body,
          outcome: { kind: 'uncertain' },
        });
        return { kind: 'uncertain' };
      }
      const outcome: Outcome = {
        kind: 'registered',
        receipt: {
          operationId: review.operationId,
          totalTenths: review.totalTenths,
          method,
          confirmedAt: new Date().toISOString(),
        },
      };
      operations.set(review.operationId, { body, outcome });
      return scenario() === 'lost-saved' ? { kind: 'uncertain' } : outcome;
    },
    async check(operationId) {
      await wait();
      if (scenario() === 'connection')
        throw new SalesError(
          'connection',
          'Sin conexión. El resultado continúa incierto.',
        );
      return operations.get(operationId)?.outcome ?? { kind: 'uncertain' };
    },
    async reconcile(operationId) {
      await wait();
      if (scenario() === 'connection')
        throw new SalesError(
          'connection',
          'Sin conexión. No se pudo conciliar; no inicies otra venta.',
        );
      const previous = operations.get(operationId);
      if (previous && previous.outcome.kind !== 'uncertain')
        return previous.outcome;
      const outcome: Outcome = {
        kind: 'not-registered',
        message:
          'La simulación cerró esta identidad sin registrar una venta. Un envío tardío se rechazará mientras siga activa esta simulación.',
      };
      operations.set(operationId, { ...previous, outcome });
      return outcome;
    },
  };
}
