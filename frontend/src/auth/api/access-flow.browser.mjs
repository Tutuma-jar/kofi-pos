import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

// Integration harness only: fresh test accounts, a UUID database and own profiles.
const root = new URL('../../../../', import.meta.url);
const moduleAt = (path) => import(new URL(path, root).href);
const { connectDatabase } = await moduleAt(
  'backend/src/shared/database/connect-database.ts',
);
const { createApp } = await moduleAt('backend/src/app.ts');
const { hashPassword } = await moduleAt('backend/src/auth/password.ts');
const { ensureAccountIndexes } = await moduleAt(
  'backend/src/auth/account.model.ts',
);
const { ensureSessionIndexes } = await moduleAt(
  'backend/src/auth/session.model.ts',
);
const browserPath = process.argv[2];
assert.ok(browserPath, 'Browser executable required');
const databaseName = `kofi_browser_test_${randomUUID().replaceAll('-', '')}`;
const connection = await connectDatabase(
  'mongodb://127.0.0.1:27017/?replicaSet=rs0',
  databaseName,
);
let server,
  browser,
  socket,
  profile,
  exited = false;
let sequence = 0;
const pending = new Map();
const authorizations = new Map();
const report = {
  browser: browserPath,
  database: databaseName,
  checks: [],
  limits: [
    'Headless installed browser: native Duplicate menu and crash/session restore before 120 seconds not observed.',
    'Copied authorization test is a controlled clone, not the native Duplicate command.',
    'One reload check forces expiry only in the isolated database; offline/freeze also waits a real 121 seconds. Exact 120-second boundary is covered separately by server integration tests.',
  ],
};
async function until(operation, label, timeout = 12000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const result = await operation();
    if (result) return result;
    await delay(100);
  }
  throw new Error(`Timeout: ${label}`);
}
function call(method, params = {}, sessionId) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`CDP timeout: ${method}`));
    }, 10000);
    pending.set(id, { resolve, reject, timer });
    socket.send(
      JSON.stringify({
        id,
        method,
        params,
        ...(sessionId ? { sessionId } : {}),
      }),
    );
  });
}
async function evaluate(sessionId, expression) {
  const response = await call(
    'Runtime.evaluate',
    { expression, awaitPromise: true, returnByValue: true, userGesture: true },
    sessionId,
  );
  if (response.exceptionDetails)
    throw new Error('Browser evaluation failed (details redacted)');
  return response.result.value;
}
async function newPage(path) {
  const { targetId } = await call('Target.createTarget', {
    url: 'about:blank',
  });
  const { sessionId } = await call('Target.attachToTarget', {
    targetId,
    flatten: true,
  });
  await call('Page.enable', {}, sessionId);
  await call('Network.enable', {}, sessionId);
  await call(
    'Page.navigate',
    { url: `http://127.0.0.1:5173${path}` },
    sessionId,
  );
  return { targetId, sessionId };
}
async function heading(sessionId, text) {
  return until(async () => {
    try {
      return await evaluate(
        sessionId,
        `[...document.querySelectorAll('h1')].some(e=>e.textContent.trim()===${JSON.stringify(text)})`,
      );
    } catch {
      return false;
    }
  }, `heading ${text}`);
}
async function reload(sessionId, ignoreCache = false) {
  const before = await evaluate(
    sessionId,
    '(window.__testDocumentId ??= crypto.randomUUID())',
  );
  await call('Page.reload', { ignoreCache }, sessionId);
  await until(async () => {
    try {
      return (
        (await evaluate(
          sessionId,
          '(window.__testDocumentId ??= crypto.randomUUID())',
        )) !== before
      );
    } catch {
      return false;
    }
  }, 'new document after reload');
}
async function submit(sessionId, username, password) {
  await evaluate(
    sessionId,
    `(()=>{const form=document.querySelector('form');form.elements.namedItem('username').value=${JSON.stringify(username)};form.elements.namedItem('password').value=${JSON.stringify(password)};form.requestSubmit();return true})()`,
  );
}
function check(name, value) {
  assert.ok(value, name);
  report.checks.push({ name, passed: true });
}
try {
  await ensureAccountIndexes(connection.db);
  await ensureSessionIndexes(connection.db);
  const username = `browser-${randomUUID()}`;
  const password = randomBytes(24).toString('base64url');
  const account = await connection.db.collection('accounts').insertOne({
    username,
    passwordHash: await hashPassword(password),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const app = createApp({ db: connection.db });
  server = await new Promise((resolve, reject) => {
    const listening = app.listen(3000, '127.0.0.1', () => resolve(listening));
    listening.on('error', reject);
  });
  const frontend = await fetch('http://127.0.0.1:5173/login');
  assert.equal(frontend.status, 200, 'Frontend must be running');
  const temporaryRoot = join(tmpdir(), 'opencode');
  await mkdir(temporaryRoot, { recursive: true });
  profile = await mkdtemp(join(temporaryRoot, 'kofi-access-browser-'));
  browser = spawn(
    browserPath,
    [
      '--headless=new',
      '--remote-debugging-address=127.0.0.1',
      '--remote-debugging-port=0',
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-sync',
      'about:blank',
    ],
    { stdio: 'ignore', windowsHide: true },
  );
  browser.once('exit', () => {
    exited = true;
  });
  browser.once('error', () => {
    exited = true;
  });
  const port = await until(async () => {
    if (exited) throw new Error('Own browser exited');
    try {
      return (await readFile(join(profile, 'DevToolsActivePort'), 'utf8'))
        .trim()
        .split(/\r?\n/);
    } catch {
      return false;
    }
  }, 'debug port');
  socket = new WebSocket(`ws://127.0.0.1:${port[0]}${port[1]}`);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener(
      'error',
      () => reject(new Error('Debug socket failed')),
      { once: true },
    );
  });
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (
      message.method === 'Network.requestWillBeSent' &&
      message.params.request.url.includes('/api/sessions/')
    ) {
      const headers = message.params.request.headers;
      const auth = Object.entries(headers).find(
        ([key]) => key.toLowerCase() === 'authorization',
      )?.[1];
      const binding = Object.entries(headers).find(
        ([key]) => key.toLowerCase() === 'x-tab-authorization',
      )?.[1];
      if (auth && binding)
        authorizations.set(message.sessionId, {
          Authorization: auth,
          'X-Tab-Authorization': binding,
        });
    }
    const entry = pending.get(message.id);
    if (!entry) return;
    clearTimeout(entry.timer);
    pending.delete(message.id);
    if (message.error)
      entry.reject(new Error(`CDP error: ${message.error.code}`));
    else entry.resolve(message.result);
  });
  report.version = await call('Browser.getVersion');
  const a = await newPage('/dashboard');
  await heading(a.sessionId, 'Iniciar sesión');
  check(
    'Protected route requires login, with no demo controls',
    await evaluate(
      a.sessionId,
      `!document.body.textContent.includes('No ingreses contraseñas reales') && !document.body.textContent.includes('Escenarios de demostración')`,
    ),
  );
  await submit(a.sessionId, username, 'test-only-wrong-password');
  await until(
    () =>
      evaluate(
        a.sessionId,
        `document.querySelector('[role="alert"]')?.textContent.includes('Usuario o contraseña incorrectos')`,
      ),
    'incorrect credentials',
  );
  check(
    'Incorrect credentials rejected visibly without a session',
    (await connection.db.collection('sessions').countDocuments()) === 0,
  );
  await submit(a.sessionId, username, password);
  await heading(a.sessionId, 'Dashboard');
  check(
    'Real login reaches Dashboard and persists one session',
    (await connection.db
      .collection('sessions')
      .countDocuments({ accountId: account.insertedId })) === 1,
  );
  const initial = await connection.db
    .collection('sessions')
    .findOne({ accountId: account.insertedId });
  check(
    'Mongo stores verifiers, not raw bearer tokens',
    typeof initial.tokenHash === 'string' && !('sessionToken' in initial),
  );
  await until(
    async () => {
      const current = await connection.db
        .collection('sessions')
        .findOne({ _id: initial._id });
      return (
        current.lastPresenceAt.getTime() > initial.lastPresenceAt.getTime()
      );
    },
    'heartbeat with no input',
    38000,
  );
  check(
    'Presence arrives after 30-second schedule without operator input',
    true,
  );
  const oldAuth = authorizations.get(a.sessionId);
  assert.ok(oldAuth, 'Authenticated headers observed privately');
  await reload(a.sessionId);
  await heading(a.sessionId, 'Dashboard');
  check('Normal reload preserves real authorization', true);
  await reload(a.sessionId, true);
  await heading(a.sessionId, 'Dashboard');
  check('Hard reload preserves real authorization', true);
  const b = await newPage('/dashboard?independent');
  await heading(b.sessionId, 'Iniciar sesión');
  check('A fresh tab does not inherit authorization', true);
  await call(
    'Network.emulateNetworkConditions',
    { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 },
    b.sessionId,
  );
  await submit(b.sessionId, username, password);
  await until(
    () =>
      evaluate(
        b.sessionId,
        `document.querySelector('[role="alert"]')?.textContent.includes('No pudimos conectar')`,
      ),
    'connection failure',
  );
  check('Connection failure is shown without granting access', true);
  await call(
    'Network.emulateNetworkConditions',
    {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    },
    b.sessionId,
  );
  await submit(b.sessionId, username, password);
  await heading(b.sessionId, 'Dashboard');
  check(
    'Two independently authenticated tabs coexist',
    (await connection.db
      .collection('sessions')
      .countDocuments({ accountId: account.insertedId, revokedAt: null })) ===
      2,
  );
  const childUrl = `http://127.0.0.1:5173/dashboard?opener=${randomUUID()}`;
  await evaluate(
    a.sessionId,
    `window.open(${JSON.stringify(childUrl)},'_blank');true`,
  );
  const childInfo = await until(async () => {
    const { targetInfos } = await call('Target.getTargets');
    return targetInfos.find((t) => t.url === childUrl);
  }, 'opener child');
  const { sessionId: child } = await call('Target.attachToTarget', {
    targetId: childInfo.targetId,
    flatten: true,
  });
  await heading(child, 'Iniciar sesión');
  check('Opener storage copy does not authenticate the new page', true);
  const stored = await evaluate(
    a.sessionId,
    `Object.fromEntries(Object.entries(sessionStorage))`,
  );
  const clone = await newPage('/login?controlled-clone');
  await heading(clone.sessionId, 'Iniciar sesión');
  await evaluate(
    clone.sessionId,
    `(()=>{for(const [k,v]of Object.entries(${JSON.stringify(stored)}))sessionStorage.setItem(k,v);return true})()`,
  );
  await reload(clone.sessionId);
  await heading(clone.sessionId, 'Iniciar sesión');
  check(
    'Controlled clone cannot acquire authorization held by the original',
    true,
  );
  await heading(a.sessionId, 'Dashboard');
  await evaluate(
    a.sessionId,
    `document.querySelector('button[aria-label="Abrir navegación"]').click();true`,
  );
  await until(
    () =>
      evaluate(
        a.sessionId,
        `[...document.querySelectorAll('button')].some(e=>e.textContent.trim()==='Cerrar sesión')`,
      ),
    'logout button',
  );
  await evaluate(
    a.sessionId,
    `[...document.querySelectorAll('button')].find(e=>e.textContent.trim()==='Cerrar sesión').click();true`,
  );
  await heading(a.sessionId, 'Iniciar sesión');
  check(
    'Hamburger logout confirms revocation and returns to login',
    Boolean(
      (await connection.db.collection('sessions').findOne({ _id: initial._id }))
        .revokedAt,
    ),
  );
  const late = await fetch(
    'http://127.0.0.1:3000/api/sessions/current/presences',
    {
      method: 'POST',
      headers: { ...oldAuth, 'Content-Type': 'application/json' },
      body: '{}',
    },
  );
  check(
    'Late presence using revoked authorization is rejected',
    late.status === 401,
  );
  await reload(b.sessionId);
  await heading(b.sessionId, 'Dashboard');
  check('Closing one session leaves the other authorized', true);
  await submit(a.sessionId, username, password);
  await heading(a.sessionId, 'Dashboard');
  check('A new login succeeds after manual logout', true);
  const active = await connection.db.collection('sessions').findOne(
    {
      accountId: account.insertedId,
      _id: { $ne: initial._id },
      revokedAt: null,
    },
    { sort: { createdAt: -1 } },
  );
  await connection.db
    .collection('sessions')
    .updateOne(
      { _id: active._id },
      { $set: { expiresAt: new Date(Date.now() - 1) } },
    );
  await reload(a.sessionId);
  await heading(a.sessionId, 'Iniciar sesión');
  check('Reload does not recover a server-expired authorization', true);
  await submit(a.sessionId, username, password);
  await heading(a.sessionId, 'Dashboard');
  const frozenAuthorization = await evaluate(
    a.sessionId,
    `(()=>{const s=JSON.parse(sessionStorage.getItem('kofi.tab-authorization.v1'));return {Authorization:'Bearer '+s.token,'X-Tab-Authorization':s.binding}})()`,
  );
  const beforeFreeze = await fetch(
    'http://127.0.0.1:3000/api/sessions/current',
    { headers: frozenAuthorization },
  );
  assert.equal(
    beforeFreeze.status,
    200,
    'Authorization must be valid immediately before freeze',
  );
  await call(
    'Network.emulateNetworkConditions',
    { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 },
    a.sessionId,
  );
  await call('Page.setWebLifecycleState', { state: 'frozen' }, a.sessionId);
  await delay(121_000);
  const frozenGet = await fetch('http://127.0.0.1:3000/api/sessions/current', {
    headers: frozenAuthorization,
  });
  check(
    'Server rejects authorization after real 121-second absence during offline/freeze',
    frozenGet.status === 401,
  );
  await call(
    'Network.emulateNetworkConditions',
    {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    },
    a.sessionId,
  );
  await call('Page.setWebLifecycleState', { state: 'active' }, a.sessionId);
  await evaluate(a.sessionId, `window.dispatchEvent(new Event('resume'));true`);
  await heading(a.sessionId, 'Iniciar sesión');
  check('Resume after offline/freeze requires a new login', true);
  await call('Target.closeTarget', { targetId: b.targetId });
  check('Own authenticated tab can close without closing the browser', true);
  report.result =
    'observed integrated flows passed; native lifecycle limits remain';
} catch (error) {
  report.result = 'failed or incomplete';
  report.error = error.message;
  process.exitCode = 1;
} finally {
  if (socket?.readyState === WebSocket.OPEN && !exited) {
    try {
      await call('Browser.close');
    } catch {}
  }
  socket?.close();
  for (const entry of pending.values()) {
    clearTimeout(entry.timer);
    entry.reject(new Error('cleanup'));
  }
  pending.clear();
  if (browser && !exited) {
    await delay(500);
    if (!exited) browser.kill();
    await until(() => exited, 'own browser exits', 5000).catch(() => {});
  }
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  if (
    connection.db.databaseName !== databaseName ||
    !/^kofi_browser_test_[a-f0-9]{32}$/.test(databaseName)
  )
    throw new Error('Unsafe test database cleanup');
  await connection.db.dropDatabase();
  await connection.client.close();
  report.testDatabaseCleanup = 'removed exact generated UUID database';
  if (profile && exited) {
    await rm(profile, {
      recursive: true,
      force: true,
      maxRetries: 4,
      retryDelay: 200,
    });
    report.profileCleanup = 'removed own profile';
  }
  console.log(JSON.stringify(report, null, 2));
}
