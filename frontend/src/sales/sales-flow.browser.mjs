/** Essential real-browser checks. Requires the already available Playwright and
 * a Vite dev server on 5173. Auth is stubbed at the module boundary; every HTTP
 * /api call is intercepted. Does not use credentials, backend or MongoDB.
 * node frontend/src/sales/sales-flow.browser.mjs
 */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const output = path.resolve('.impeccable/review/sales');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
const apiRequests = [];
try {
  const context = await browser.newContext();
  await context.route('**/src/auth/api/application-client.ts*', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `import { createAuthClient } from '/src/auth/api/auth-client.ts'; export const applicationAuthClient = createAuthClient({ initial: { status: 'authenticated', label: 'Demostración visual' }, delay: 0 });`,
    }),
  );
  await context.route('http://127.0.0.1:5173/api/**', (route) => {
    apiRequests.push(route.request().url());
    return route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        error: {
          code: 'DEMO_ONLY',
          message: 'No backend during sales UI verification',
        },
      }),
    });
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  const button = (name) => page.getByRole('button', { name, exact: true });
  const scenario = async (value) => {
    await page.getByLabel('Escenario simulado').selectOption(value);
    await button('Agregar Espresso').waitFor();
    await page.waitForFunction(
      () =>
        !document
          .querySelector('[aria-label="Pedido en curso"]')
          .getAttribute('aria-busy')
          ?.includes('true'),
    );
  };
  const checkViewport = async (width, height, navOpen = false) => {
    await page.setViewportSize({ width, height });
    const measurements = await page.evaluate(() => {
      const total = document
        .querySelector('[aria-label="Pedido en curso"] footer')
        .getBoundingClientRect();
      const catalog = document.querySelector(
        '[aria-label="Productos disponibles"]',
      );
      const order = document.querySelector('[aria-label="Detalle del pedido"]');
      return {
        width: innerWidth,
        height: innerHeight,
        documentHeight: document.documentElement.scrollHeight,
        documentWidth: document.documentElement.scrollWidth,
        bottom: total.bottom,
        catalogScroll: getComputedStyle(catalog).overflowY,
        orderScroll: getComputedStyle(order).overflowY,
      };
    });
    assert(measurements.documentWidth <= width, JSON.stringify(measurements));
    if (width >= 1280) {
      assert(
        measurements.documentHeight <= height,
        JSON.stringify(measurements),
      );
      assert(measurements.bottom <= height, JSON.stringify(measurements));
      assert.equal(measurements.catalogScroll, 'auto');
      assert.equal(measurements.orderScroll, 'auto');
    }
    await page.screenshot({
      path: path.join(output, `${width}-${height}${navOpen ? '-nav' : ''}.png`),
      fullPage: true,
    });
    console.log(
      'Viewport OK',
      width,
      height,
      navOpen ? 'navigation open' : '',
      measurements,
    );
  };
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('http://127.0.0.1:5173/sales');
  await button('Agregar Espresso').waitFor();
  await page.evaluate(() => document.fonts.ready);
  for (const name of [
    'Espresso',
    'Café con leche',
    'Cappuccino',
    'Croissant de mantequilla',
    'Limonada',
    'Café frío',
  ])
    await button(`Agregar ${name}`).click();
  await checkViewport(1280, 720);
  await checkViewport(1366, 768);
  await button('Abrir navegación').click();
  await checkViewport(1280, 720, true);
  await checkViewport(1366, 768, true);
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
  await button('Abrir navegación').click();
  await page
    .getByRole('link', { name: 'Gestión de ventas', exact: true })
    .click();
  assert.equal(await page.getByLabel('Cantidad de Espresso').inputValue(), '1');
  await page.getByLabel('Cantidad de Espresso').fill('0');
  await page.getByLabel('Cantidad de Espresso').press('Tab');
  assert.equal(await page.getByLabel('Cantidad de Espresso').inputValue(), '1');
  await button('Ver descripción de Espresso').focus();
  await page.keyboard.press('Enter');
  await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Escape');
  assert.equal(
    await button('Ver descripción de Espresso').evaluate(
      (element) => element === document.activeElement,
    ),
    true,
  );
  await button('Revisar antes de cobrar').click();
  await button('Confirmar total para cobrar').click();
  await page.getByLabel('QR', { exact: true }).check();
  await checkViewport(1280, 720);
  await checkViewport(1366, 768);
  await page.getByLabel('Escenario simulado').selectOption('lost-saved');
  await button('Registrar venta ya pagada').dblclick();
  await page
    .getByRole('heading', { name: 'Resultado por comprobar' })
    .waitFor();
  assert.equal(await button('Agregar Espresso').isDisabled(), true);
  const references = await page.evaluate(() =>
    Object.entries(localStorage).filter(([key]) =>
      key.startsWith('kofi:sales:demo:pending:'),
    ),
  );
  assert.equal(references.length, 1);
  assert.match(references[0][1], /^[0-9a-f-]{36}$/);
  await button('Comprobar resultado').click();
  await page
    .getByRole('heading', { name: 'Venta simulada confirmada' })
    .waitFor();
  await button('Nueva venta').click();
  await scenario('unavailable');
  await button('Agregar Espresso').click();
  await button('Revisar antes de cobrar').click();
  await button('Retirar Espresso').waitFor();
  assert.equal(await button('Confirmar total para cobrar').isDisabled(), true);
  await button('Retirar Espresso').click();
  assert.equal(await button('Revisar antes de cobrar').isDisabled(), true);
  await scenario('lost-unsaved');
  await button('Agregar Espresso').click();
  await button('Revisar antes de cobrar').click();
  await button('Confirmar total para cobrar').click();
  await page.getByLabel('Efectivo', { exact: true }).check();
  await button('Registrar venta ya pagada').click();
  await page
    .getByRole('heading', { name: 'Resultado por comprobar' })
    .waitFor();
  page.on('dialog', (dialog) => dialog.accept());
  await page.reload();
  await page
    .getByRole('heading', { name: 'Resultado por comprobar' })
    .waitFor();
  assert.equal(await page.getByLabel('Cantidad de Espresso').count(), 0);
  assert.equal(await button('Nueva venta').count(), 0);
  await button('Conciliar operación').click();
  await page
    .getByRole('heading', { name: 'Operación no registrada' })
    .waitFor();
  await button('Nueva venta').click();
  await scenario('normal');
  await checkViewport(390, 844);
  await button('Abrir navegación').click();
  await page.getByRole('dialog', { name: 'Navegación' }).waitFor();
  await page.keyboard.press('Escape');
  assert.equal(
    await button('Abrir navegación').evaluate(
      (element) => element === document.activeElement,
    ),
    true,
  );
  assert.deepEqual(errors, []);
  assert(
    apiRequests.every((url) => !/sales|orders/.test(url)),
    'Sales must never call live endpoints',
  );
  console.log(
    'PASS: sales browser flow, keyboard, reload recovery, scroll and both laptop viewports; all API calls intercepted.',
  );
} finally {
  await browser.close();
}
