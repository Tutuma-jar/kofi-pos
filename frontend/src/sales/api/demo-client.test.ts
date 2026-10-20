import { beforeEach, describe, expect, it } from 'vitest';
import { createDemoSalesClient } from './demo-client';
import { catalogFixture } from './fixtures';
import type { Review, Scenario } from './contract.provisional';
import { createOperationReferences } from './operation-references';

beforeEach(() => localStorage.clear());
function setup(initial: Scenario = 'normal') {
  let scenario = initial;
  let authenticated = true;
  const client = createDemoSalesClient({
    auth: {
      getSnapshot: () =>
        authenticated
          ? { status: 'authenticated', label: 'Prueba' }
          : { status: 'anonymous' },
    },
    storage: localStorage,
    delay: 0,
    scenario: () => scenario,
  });
  const lines = [{ product: { ...catalogFixture.products[0]! }, quantity: 2 }];
  const review = async () => {
    const quote = await client.quote(lines);
    return (await client.confirmReview(crypto.randomUUID(), quote)) as Review;
  };
  return {
    client,
    lines,
    review,
    scenario: (value: Scenario) => {
      scenario = value;
    },
    logout: () => {
      authenticated = false;
    },
  };
}
describe('Servicio aislado de demostración', () => {
  it('oculta inactivos y categorías sin activos, sin escribir referencias al seleccionar', async () => {
    const { client } = setup();
    const catalog = await client.catalog();
    expect(catalog.products.every((p) => p.active)).toBe(true);
    expect(catalog.categories.map((c) => c.id)).not.toContain('empty');
    expect(catalog.categories.map((c) => c.id)).not.toContain('inactive');
    expect(localStorage.length).toBe(0);
  });
  it('comunica precio anterior/vigente, fija solo al confirmar y no acumula cambios', async () => {
    const { client, lines } = setup('price-change');
    const quote = await client.quote(lines);
    expect(quote.changes[0]).toMatchObject({
      previousTenths: 100,
      currentTenths: 120,
    });
    expect(lines[0]!.product.priceTenths).toBe(100);
    const fixed = await client.confirmReview(crypto.randomUUID(), quote);
    expect(fixed).toHaveProperty('evidence');
    expect((await client.quote(fixed.lines)).totalTenths).toBe(240);
  });
  it('detecta desactivación y carrera entre lectura y confirmación', async () => {
    const demo = setup('unavailable');
    const quote = await demo.client.quote(demo.lines);
    expect(quote.totalTenths).toBe(0);
    expect(
      await demo.client.confirmReview(crypto.randomUUID(), quote),
    ).not.toHaveProperty('evidence');
    demo.scenario('review-race');
    const read = await demo.client.quote(demo.lines);
    const conflict = await demo.client.confirmReview(crypto.randomUUID(), read);
    expect(conflict).not.toHaveProperty('evidence');
    expect(
      await demo.client.confirmReview(crypto.randomUUID(), conflict),
    ).toHaveProperty('evidence');
  });
  it.each(['cash', 'qr'] as const)(
    'registra %s exactamente una vez incluso con doble envío',
    async (method) => {
      const demo = setup();
      const fixed = await demo.review();
      const [a, b] = await Promise.all([
        demo.client.register(fixed, method),
        demo.client.register(fixed, method),
      ]);
      expect(a.kind).toBe('registered');
      expect(a).toEqual(b);
      expect(await demo.client.check(fixed.operationId)).toEqual(a);
      demo.scenario('unavailable');
      expect(await demo.client.register(fixed, method)).toEqual(a);
    },
  );
  it('respuesta perdida guardada se comprueba sin otra venta', async () => {
    const demo = setup('lost-saved');
    const fixed = await demo.review();
    expect((await demo.client.register(fixed, 'cash')).kind).toBe('uncertain');
    const result = await demo.client.check(fixed.operationId);
    expect(result.kind).toBe('registered');
    expect(await demo.client.register(fixed, 'cash')).toEqual(result);
  });
  it('no existe no es fracaso; conciliar cierra la identidad ante envío tardío', async () => {
    const demo = setup('lost-unsaved');
    const fixed = await demo.review();
    expect((await demo.client.check(fixed.operationId)).kind).toBe('uncertain');
    await demo.client.register(fixed, 'qr');
    expect((await demo.client.check(fixed.operationId)).kind).toBe('uncertain');
    expect((await demo.client.reconcile(fixed.operationId)).kind).toBe(
      'not-registered',
    );
    demo.scenario('normal');
    expect((await demo.client.register(fixed, 'qr')).kind).toBe(
      'not-registered',
    );
  });
  it('rechazo definitivo cierra identidad y no acepta evidencia alterada', async () => {
    const demo = setup('validation');
    const fixed = await demo.review();
    expect((await demo.client.register(fixed, 'cash')).kind).toBe(
      'not-registered',
    );
    demo.scenario('normal');
    expect((await demo.client.register(fixed, 'cash')).kind).toBe(
      'not-registered',
    );
    const fresh = await demo.review();
    fresh.totalTenths = 1;
    expect((await demo.client.register(fresh, 'cash')).kind).toBe(
      'not-registered',
    );
  });
  it('guarda solo UUID antes del envío y no concede autorización ni recupera borrador', async () => {
    const demo = setup();
    const fixed = await demo.review();
    demo.client.remember(fixed.operationId);
    expect(localStorage.length).toBe(1);
    expect(localStorage.getItem(localStorage.key(0)!)).toBe(fixed.operationId);
    const restarted = setup();
    expect(restarted.client.references()).toEqual([fixed.operationId]);
    expect((await restarted.client.check(fixed.operationId)).kind).toBe(
      'uncertain',
    );
    demo.logout();
    await expect(demo.client.check(fixed.operationId)).rejects.toMatchObject({
      code: 'unauthorized',
    });
    demo.client.acknowledge(fixed.operationId);
    expect(localStorage.length).toBe(0);
  });
  it('fallo de almacenamiento impide conservar referencia', () => {
    const storage = {
      setItem() {
        throw new Error('blocked');
      },
    } as unknown as Storage;
    expect(() =>
      createOperationReferences(storage).remember(crypto.randomUUID()),
    ).toThrow(/No se pudo conservar/);
  });
});
