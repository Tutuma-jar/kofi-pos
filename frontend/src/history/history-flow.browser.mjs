/** Verificación del módulo simulado, sin backend, credenciales ni MongoDB.
 * Requiere Vite en 5173 y el Playwright ya disponible en el entorno.
 * node frontend/src/history/history-flow.browser.mjs
 */
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const output = path.resolve('.impeccable/review/history');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
const network = [];
try {
  const context = await browser.newContext({
    timezoneId: 'Asia/Tokyo',
    reducedMotion: 'reduce',
  });
  await context.route('**/src/auth/api/application-client.ts*', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `import { createAuthClient } from '/src/auth/api/auth-client.ts'; export const applicationAuthClient = createAuthClient({ initial: { status: 'authenticated', label: 'Revisión visual' }, delay: 0 });`,
    }),
  );
  await context.route('http://127.0.0.1:5173/api/**', (route) => {
    network.push({
      method: route.request().method(),
      url: route.request().url(),
    });
    return route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: '{"error":{"code":"DEMO_ONLY","message":"No backend in UI verification"}}',
    });
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  const button = (name) => page.getByRole('button', { name, exact: true });
  const listing = page.getByRole('region', {
    name: 'Listado de ventas',
    exact: true,
  });
  const reports = page.getByRole('region', {
    name: 'Reporte del período',
    exact: true,
  });
  const settle = async () => {
    await page.waitForFunction(
      () =>
        !document.querySelector('[aria-busy="true"]') &&
        !document.body.textContent.includes('Cargando historial y reportes…'),
    );
  };
  const capture = async (width, height, suffix = '') => {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      return document.fonts.ready;
    });
    const measurements = await page.evaluate(() => {
      const filters = document
        .querySelector('[aria-label="Filtrar por fechas"]')
        .getBoundingClientRect();
      const list = document.querySelector('[aria-label="Listado de ventas"]');
      return {
        width: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        filterBottom: filters.bottom,
        tableOverflow: list ? getComputedStyle(list).overflowY : null,
        bodyBackground: getComputedStyle(document.documentElement)
          .backgroundColor,
        headingFont: getComputedStyle(document.querySelector('h1')).fontFamily,
      };
    });
    assert(measurements.documentWidth <= width, JSON.stringify(measurements));
    assert(measurements.filterBottom < height, JSON.stringify(measurements));
    assert.equal(measurements.bodyBackground, 'rgb(246, 243, 237)');
    assert.match(measurements.headingFont, /Fraunces/);
    if (measurements.tableOverflow)
      assert.equal(measurements.tableOverflow, 'auto');
    // Chromium fullPage puede cambiar temporalmente las media queries al capturar
    // una barra lateral. Su estado se comprueba en el viewport real, sin emulación.
    if (suffix === '-nav')
      assert.equal(
        await page.getByRole('navigation', { name: 'Principal' }).isVisible(),
        true,
      );
    await page.screenshot({
      path: path.join(output, `${width}-${height}${suffix}.png`),
      fullPage: suffix !== '-nav',
    });
    console.log('Viewport OK', width, height, suffix, measurements);
  };
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('http://127.0.0.1:5173/history');
  await listing.waitFor();
  await settle();
  assert.equal(await listing.getByRole('row').count(), 51);
  const serverToday = await page
    .getByLabel('Hasta', { exact: true })
    .getAttribute('max');
  assert.equal(
    await page.getByLabel('Hasta', { exact: true }).inputValue(),
    serverToday,
  );
  assert.equal(
    await reports
      .getByRole('rowheader', { name: /Espresso de la casa/ })
      .count(),
    1,
  );
  await capture(1280, 720);
  await capture(1366, 768);
  await button('Abrir navegación').click();
  await capture(1280, 720, '-nav');
  await capture(1366, 768, '-nav');
  await button('Cerrar navegación').click();

  // Activación mediante teclado, foco modal atrapado y restaurado.
  const trigger = listing.getByRole('button', { name: /^Ver detalle/ }).first();
  await trigger.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+Tab');
  const focusOutline = await trigger.evaluate(
    (element) => getComputedStyle(element).outlineStyle,
  );
  assert.notEqual(focusOutline, 'none');
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Detalle de la venta' });
  await dialog.getByText('Total registrado', { exact: true }).waitFor();
  assert.equal(
    await dialog
      .getByRole('rowheader', { name: 'Espresso', exact: true })
      .count(),
    1,
  );
  assert.equal(
    await dialog.getByText('Espresso de la casa', { exact: true }).count(),
    0,
  );
  assert.equal(
    await dialog
      .getByRole('rowheader', { name: 'Café frío original', exact: true })
      .count(),
    1,
  );
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.screenshot({ path: path.join(output, 'detail-1280-720.png') });
  await button('Cerrar detalle').focus();
  await page.keyboard.press('Shift+Tab');
  assert.equal(
    await dialog.evaluate((element) =>
      element.contains(document.activeElement),
    ),
    true,
  );
  await page.keyboard.press('Tab');
  assert.equal(
    await button('Cerrar detalle').evaluate(
      (element) => element === document.activeElement,
    ),
    true,
  );
  await page.keyboard.press('Escape');
  assert.equal(
    await trigger.evaluate((element) => element === document.activeElement),
    true,
  );

  await button('Siguiente').click();
  await page.getByText('Página 2', { exact: false }).waitFor();
  await settle();
  assert.equal(await listing.getByRole('row').count(), 14);
  await button('Actualizar').click();
  await page.getByText('Página 1', { exact: false }).waitFor();
  await settle();
  assert.equal(await listing.getByRole('row').count(), 51);

  // Escenarios públicos de demostración; los reintentos se recuperan con la fuente.
  await page.getByText('Datos de demostración', { exact: true }).click();
  const scenario = page.getByLabel('Escenario simulado');
  await scenario.selectOption('query-error');
  await page.getByRole('alert').waitFor();
  assert.equal(
    await page.getByText('No actualizado', { exact: true }).count(),
    2,
  );
  assert.equal(await listing.getByRole('row').count(), 51);
  assert.equal(
    await page
      .getByText('No se registraron ventas en este rango', { exact: true })
      .count(),
    0,
  );
  await page.screenshot({
    path: path.join(output, 'query-error-1280-720.png'),
    fullPage: true,
  });
  await scenario.selectOption('normal');
  await settle();
  await listing.waitFor();
  await scenario.selectOption('report-error');
  await reports.getByRole('alert').waitFor();
  assert.equal(await listing.getByRole('row').count(), 51);
  await scenario.selectOption('detail-error');
  await settle();
  await listing
    .getByRole('button', { name: /^Ver detalle/ })
    .first()
    .click();
  await dialog.getByRole('alert').waitFor();
  assert.equal(await dialog.getByRole('table').count(), 0);
  await button('Cerrar detalle').click();
  await scenario.selectOption('not-found');
  await settle();
  await listing
    .getByRole('button', { name: /^Ver detalle/ })
    .first()
    .click();
  await dialog.getByText(/No se encontró la venta/).waitFor();
  await page.keyboard.press('Escape');
  await scenario.selectOption('empty');
  await settle();
  assert.equal(
    await page
      .getByText('No se registraron ventas en este rango', { exact: true })
      .count(),
    2,
  );
  assert.equal(
    await page.getByText('Ticket promedio', { exact: true }).count(),
    0,
  );
  await page.screenshot({
    path: path.join(output, 'empty-1280-720.png'),
    fullPage: true,
  });
  await scenario.selectOption('normal');
  await settle();

  // Una consulta rápida reemplaza la lenta; no reaplica su respuesta antigua.
  await scenario.selectOption('slow');
  await button('Últimos 7 días').click();
  await button('Este mes').click();
  await settle();
  assert.match(
    await reports.textContent(),
    new RegExp(`01/${serverToday.slice(5, 7)}/${serverToday.slice(0, 4)}`),
  );
  await scenario.selectOption('normal');
  await settle();
  await page.getByLabel('Desde', { exact: true }).fill('2020-01-01');
  await page.getByRole('alert').waitFor();
  assert.equal(await listing.count(), 0);
  assert.equal(await button('Consultar rango').isDisabled(), true);
  await page.getByLabel('Hasta', { exact: true }).fill('2020-01-01');
  await button('Consultar rango').click();
  await settle();
  assert.equal(
    await page
      .getByText('No se registraron ventas en este rango', { exact: true })
      .count(),
    2,
  );

  // Navegación compartida y adaptación estrecha sin tocar estilos de otros módulos.
  await button('Abrir navegación').click();
  await page
    .getByRole('link', { name: 'Gestión de ventas', exact: true })
    .click();
  await page
    .getByRole('heading', { name: 'Gestión de ventas', exact: true })
    .waitFor();
  await button('Abrir navegación').click();
  await page
    .getByRole('link', { name: 'Historial y reportes', exact: true })
    .click();
  await listing.waitFor();
  await settle();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({
    path: path.join(output, '390-844.png'),
    fullPage: true,
  });
  await button('Abrir navegación').click();
  const navigation = page.getByRole('dialog', {
    name: 'Navegación',
    exact: true,
  });
  await navigation.waitFor();
  await page.keyboard.press('Escape');
  assert.equal(
    await button('Abrir navegación').evaluate(
      (element) => element === document.activeElement,
    ),
    true,
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(network, []);

  // Ruta protegida con una sesión anónima; el transporte sigue aislado.
  const anonymous = await browser.newContext();
  await anonymous.route('**/src/auth/api/application-client.ts*', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `import { createAuthClient } from '/src/auth/api/auth-client.ts'; export const applicationAuthClient = createAuthClient({ initial: { status: 'anonymous' }, delay: 0 });`,
    }),
  );
  const locked = await anonymous.newPage();
  await locked.goto('http://127.0.0.1:5173/history');
  await locked.waitForURL('**/login');
  assert.equal(
    await locked
      .getByRole('heading', { name: 'Historial y reportes', exact: true })
      .count(),
    0,
  );
  console.log(
    'OK Chromium: viewports, teclado, foco/diálogo, fechas con zona Tokio, paginación, concurrencia, errores/vacíos, navegación y protección. Cero llamadas API reales.',
  );
} finally {
  await browser.close();
}
