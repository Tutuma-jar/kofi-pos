import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '../../auth/auth-context';
import { calculateAmounts, assertRequestSize } from '../api/amounts';
import {
  type Line,
  type Outcome,
  type SalesClient,
  type Scenario,
} from '../api/contract.provisional';
import { createSalesSource } from '../api/sales-client';
import {
  initialSalesState,
  salesReducer,
  SalesContext,
  type SalesContextValue,
} from './sales-context';

export function SalesProvider({
  children,
  client: supplied,
}: {
  children: ReactNode;
  client?: SalesClient;
}) {
  const { client: auth, session } = useAuth();
  const [state, dispatch] = useReducer(salesReducer, initialSalesState);
  const [scenario, setScenarioValue] = useState<Scenario>('normal');
  const stateRef = useRef(state);
  const epoch = useRef(0);
  const locked = useRef(false);
  const source = useMemo(() => createSalesSource(auth), [auth]);
  const api = supplied ?? source.client;
  const patch = useCallback((value: Partial<typeof state>) => {
    stateRef.current = { ...stateRef.current, ...value };
    dispatch({ type: 'patch', value });
  }, []);
  const reset = useCallback(() => {
    epoch.current += 1;
    locked.current = false;
    stateRef.current = { ...initialSalesState };
    dispatch({ type: 'reset' });
  }, []);
  useEffect(() => {
    if (session.status === 'anonymous' || session.status === 'connection-error')
      reset();
  }, [session.status, reset]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (stateRef.current.lines.length || stateRef.current.operationId) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);
  const run = useCallback(
    async (
      action: (current: () => boolean) => Promise<void>,
      uncertainOnError = false,
    ) => {
      if (locked.current || auth.getSnapshot().status !== 'authenticated')
        return;
      locked.current = true;
      const generation = epoch.current;
      const current = () =>
        generation === epoch.current &&
        auth.getSnapshot().status === 'authenticated';
      patch({ busy: true, message: '' });
      try {
        await action(current);
      } catch (error) {
        if (current())
          patch({
            message:
              error instanceof Error
                ? error.message
                : 'No pudimos conectar. Reintenta la misma operación.',
            ...(uncertainOnError ? { phase: 'uncertain' as const } : {}),
          });
      } finally {
        if (generation === epoch.current) {
          locked.current = false;
          patch({ busy: false });
        }
      }
    },
    [auth, patch],
  );
  const apply = (result: Outcome, id: string) => {
    if (result.kind === 'registered')
      patch({
        phase: 'success',
        lines: [],
        quote: null,
        review: null,
        method: null,
        receipt: result.receipt,
        terminalId: id,
        operationId: null,
      });
    else if (result.kind === 'not-registered')
      patch({
        phase: stateRef.current.lines.length ? 'editing' : 'closed',
        quote: null,
        review: null,
        method: null,
        operationId: null,
        terminalId: id,
        message: `La venta no quedó registrada. El dinero ya se recibió: revisa de nuevo antes de registrarla. ${result.message}`,
      });
    else
      patch({
        phase: 'uncertain',
        operationId: id,
        message:
          'Estamos comprobando si la venta se registró. No vuelvas a cobrar ni inicies otra operación para sustituirla.',
      });
  };
  const open = useCallback(async () => {
    await run(async (current) => {
      // Pending references take priority over any new selection.
      const pending = api.references();
      const existing = stateRef.current.operationId;
      if (pending.length && !stateRef.current.terminalId) {
        const id = existing ?? pending[0]!;
        patch({ phase: 'uncertain', operationId: id });
        const outcome = await api.check(id);
        if (!current()) return;
        // Same application of terminal states, without restoring a draft on reload.
        if (outcome.kind === 'registered')
          patch({
            phase: 'success',
            lines: [],
            review: null,
            quote: null,
            receipt: outcome.receipt,
            operationId: null,
            terminalId: id,
          });
        else if (outcome.kind === 'not-registered')
          patch({
            phase: stateRef.current.lines.length ? 'editing' : 'closed',
            review: null,
            quote: null,
            operationId: null,
            terminalId: id,
            message:
              'La venta no quedó registrada. El dinero puede haberse recibido: revisa de nuevo antes de registrarla.',
          });
        else
          patch({
            message:
              'Estamos comprobando si la venta se registró. La referencia no recupera el pedido ni la revisión.',
          });
      }
      patch({ catalogStatus: 'loading' });
      try {
        const catalog = await api.catalog();
        if (current()) patch({ catalog, catalogStatus: 'ready' });
      } catch (error) {
        if (current())
          patch({
            catalogStatus: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'No pudimos consultar los productos.',
          });
      }
    });
  }, [api, patch, run]);
  const canEdit = () =>
    !locked.current &&
    !['uncertain', 'success', 'closed'].includes(stateRef.current.phase);
  const updateLines = (lines: Line[]) => {
    if (!canEdit()) return false;
    try {
      calculateAmounts(lines);
      assertRequestSize(lines);
      patch({
        lines,
        phase: 'editing',
        review: null,
        quote: null,
        method: null,
        operationId: null,
        message: '',
      });
      return true;
    } catch (error) {
      patch({
        message: error instanceof Error ? error.message : 'Cantidad inválida.',
      });
      return false;
    }
  };
  const seen = useCallback(() => {
    const id = stateRef.current.terminalId;
    if (!id) return;
    try {
      api.acknowledge(id);
      patch({ terminalId: null });
    } catch (error) {
      patch({
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo retirar la referencia local.',
      });
    }
  }, [api, patch]);
  const value: SalesContextValue = {
    state,
    scenario,
    open,
    setScenario(next) {
      if (locked.current) return;
      source.setScenario(next);
      setScenarioValue(next);
      // Changing a fault scenario never discards or replaces an uncertain operation.
      if (stateRef.current.phase === 'editing') void open();
    },
    add(product) {
      if (!canEdit() || !product.active) return;
      const previous = stateRef.current.lines.find(
        (line) => line.product.id === product.id,
      );
      const lines = previous
        ? stateRef.current.lines.map((line) =>
            line === previous ? { ...line, quantity: line.quantity + 1 } : line,
          )
        : [...stateRef.current.lines, { product, quantity: 1 }];
      updateLines(lines);
    },
    quantity(id, text) {
      if (
        !/^\d+$/.test(text) ||
        !Number.isSafeInteger(Number(text)) ||
        Number(text) < 1
      ) {
        patch({
          message:
            'Cantidad inválida. Se restauró la última cantidad válida; usa Quitar para retirar el producto.',
        });
        return false;
      }
      return updateLines(
        stateRef.current.lines.map((line) =>
          line.product.id === id ? { ...line, quantity: Number(text) } : line,
        ),
      );
    },
    remove(id) {
      updateLines(
        stateRef.current.lines.filter((line) => line.product.id !== id),
      );
    },
    edit() {
      if (canEdit())
        patch({
          phase: 'editing',
          quote: null,
          review: null,
          method: null,
          operationId: null,
          message: '',
        });
    },
    async review() {
      if (!stateRef.current.lines.length || !canEdit()) return;
      // Another tab may have left an opaque reference while this screen was open.
      // Resolve it before creating a replacement operation, never bypass it.
      try {
        if (api.references().length) {
          await open();
          return;
        }
      } catch (error) {
        patch({
          message:
            error instanceof Error
              ? error.message
              : 'No se pudieron leer las referencias de recuperación.',
        });
        return;
      }
      await run(async (current) => {
        const quote = await api.quote(stateRef.current.lines);
        if (current())
          patch({
            quote,
            phase: 'reviewing',
            review: null,
            method: null,
            operationId: null,
            catalog: stateRef.current.catalog
              ? {
                  ...stateRef.current.catalog,
                  products: stateRef.current.catalog.products.map((product) =>
                    quote.lines.some(
                      (line) =>
                        line.product.id === product.id && !line.product.active,
                    )
                      ? { ...product, active: false }
                      : product,
                  ),
                }
              : null,
          });
      });
    },
    async confirmReview() {
      if (
        stateRef.current.phase !== 'reviewing' ||
        !stateRef.current.quote ||
        stateRef.current.quote.lines.some((line) => !line.product.active)
      )
        return;
      await run(async (current) => {
        const result = await api.confirmReview(
          crypto.randomUUID(),
          stateRef.current.quote!,
        );
        if (!current()) return;
        if ('evidence' in result)
          patch({
            lines: result.lines,
            review: result,
            quote: result,
            phase: 'payment',
            operationId: result.operationId,
          });
        else
          patch({
            quote: result,
            message:
              'El catálogo cambió al confirmar. Revisa las diferencias y confirma nuevamente.',
          });
      });
    },
    chooseMethod(method) {
      if (!locked.current && stateRef.current.phase === 'payment')
        patch({ method });
    },
    async register() {
      const { review, method, phase } = stateRef.current;
      if (locked.current || !review || !method || phase !== 'payment') return;
      // Persist BEFORE dispatch; a storage failure is a known non-send, not uncertainty.
      try {
        api.remember(review.operationId);
      } catch (error) {
        patch({
          message:
            error instanceof Error
              ? error.message
              : 'No se pudo guardar la referencia.',
        });
        return;
      }
      await run(async (current) => {
        const result = await api.register(review, method);
        if (current()) apply(result, review.operationId);
      }, true);
    },
    async retry() {
      const { review, method, phase } = stateRef.current;
      if (!review || !method || phase !== 'uncertain') return;
      await run(async (current) => {
        const result = await api.register(review, method);
        if (current()) apply(result, review.operationId);
      }, true);
    },
    async recover(reconcile = false) {
      const id = stateRef.current.operationId;
      if (!id || stateRef.current.phase !== 'uncertain') return;
      await run(async (current) => {
        const result = await (reconcile ? api.reconcile(id) : api.check(id));
        if (current()) apply(result, id);
      }, true);
    },
    async newSale() {
      if (!['success', 'closed'].includes(stateRef.current.phase)) return;
      seen();
      if (stateRef.current.terminalId) return;
      reset();
      await open();
    },
    beforeLogout() {
      const current = stateRef.current;
      let sent = current.phase === 'uncertain';
      try {
        sent ||=
          !!current.operationId &&
          api.references().includes(current.operationId);
      } catch {
        /* Storage failure must not assert that a sent operation is safe. */ sent ||=
          current.busy && !!current.method;
      }
      const text = sent
        ? 'Se descartará la selección. Se conservará solo la referencia para comprobar el registro después de iniciar sesión. ¿Cerrar sesión?'
        : current.review && current.phase === 'payment'
          ? 'Se descartará una revisión confirmada sin registrar. El dinero puede haberse recibido ya. ¿Cerrar sesión de todos modos?'
          : current.lines.length
            ? 'Se descartará la venta en curso, sin recuperación. ¿Cerrar sesión?'
            : '';
      if (text && !window.confirm(text)) return false;
      reset();
      return true;
    },
    seen,
  };
  return <SalesContext value={value}>{children}</SalesContext>;
}
