/**
 * TASK-005 / US-001: isolated browser experiment, NOT an authorization mechanism.
 * Run explicitly with Node 24 and an installed Chrome/Edge executable as argv[2].
 * No dependencies, app imports, real credentials, database, or external HTTP.
 * Headless observations do NOT cover native Duplicate/Restore or prove tab identity.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

// Serialized into an otherwise empty experimental page, never into the POS.
function browserFixture() {
  const storageKey = 'kofi-experiment-marker';
  const memoryMarker = crypto.randomUUID();
  const initialStoredMarker = sessionStorage.getItem(storageKey);
  const messages = [];
  const channel = new BroadcastChannel('kofi-tab-experiment');
  channel.onmessage = ({ data }) => messages.push(data);
  let releaseLock;
  window.experiment = {
    snapshot: () => ({
      memoryMarker,
      initialStoredMarker,
      storedMarker: sessionStorage.getItem(storageKey),
      navigationType: performance.getEntriesByType('navigation')[0]?.type,
      hasOpener: window.opener !== null,
    }),
    store: (marker) => sessionStorage.setItem(storageKey, marker),
    messages: () => messages.slice(),
    send: (marker) => channel.postMessage({ kind: 'public-probe', marker }),
    acquire: (name) =>
      new Promise((resolve, reject) => {
        navigator.locks
          .request(name, { ifAvailable: true }, async (lock) => {
            if (!lock) {
              resolve(false);
              return;
            }
            await new Promise((release) => {
              releaseLock = release;
              resolve(true);
            });
          })
          .catch(reject);
      }),
    release: () => {
      releaseLock?.();
      releaseLock = undefined;
    },
  };
}

const executable = process.argv[2];
assert.ok(
  executable && isAbsolute(executable),
  'Provide an absolute browser executable path',
);
assert.equal(
  process.argv.length,
  3,
  'Only the executable argument is accepted',
);
const report = {
  task: 'TASK-005 / US-001',
  experimental: true,
  mode: 'installed browser, headless=new, fresh isolated profile',
  executable,
  startedAt: new Date().toISOString(),
  checks: [],
  notObserved: [
    'Native tab duplication (window.open and CDP createTarget are NOT Duplicate)',
    'Original tab frozen/discarded during duplication or ownership transfer',
    'Close/reopen, window restore, browser restart/session restore before 120 seconds',
    'BFCache entry/return and lifecycle ownership',
    'Real authentication, server expiry at 120 seconds, heartbeat at 30 seconds',
    'Bearer + X-Tab-Authorization transport or any final identity mechanism',
  ],
};
let profile;
let browser;
let socket;
let server;
let browserExited = false;
let browserStderr = '';
let nextId = 0;
const pending = new Map();
const deadline = Date.now() + 45_000;

async function until(operation, label) {
  const end = Math.min(deadline, Date.now() + 10_000);
  while (Date.now() < end) {
    const result = await operation();
    if (result) return result;
    await delay(50);
  }
  throw new Error(`Timeout: ${label}`);
}

function call(method, params = {}, sessionId) {
  // Cleanup still needs Browser.close after the experiment deadline.
  if (method !== 'Browser.close' && Date.now() >= deadline) {
    return Promise.reject(
      new Error('Experiment deadline exceeded (45 seconds)'),
    );
  }
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`CDP timeout: ${method}`));
    }, 5000);
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
    {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    },
    sessionId,
  );
  assert.ok(
    !response.exceptionDetails,
    JSON.stringify(response.exceptionDetails),
  );
  return response.result.value;
}

async function attach(targetId) {
  const { sessionId } = await call('Target.attachToTarget', {
    targetId,
    flatten: true,
  });
  await call('Page.enable', {}, sessionId);
  await until(
    () => evaluate(sessionId, 'Boolean(window.experiment)'),
    'fixture ready',
  );
  return sessionId;
}

function check(name, observation, predicate) {
  report.checks.push({ name, observation, passed: Boolean(predicate) });
  assert.ok(predicate, name);
}

async function run() {
  // Parent must already exist. Only this mkdtemp-created child is ever removed.
  profile = await mkdtemp(
    join(
      homedir(),
      'AppData',
      'Local',
      'Temp',
      'opencode',
      'kofi-tab-experiment-',
    ),
  );
  server = createServer((request, response) => {
    if (!request.url?.startsWith('/experiment?')) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy':
        "default-src 'none'; script-src 'unsafe-inline'; connect-src 'none'",
    });
    response.end(
      `<!doctype html><meta charset="utf-8"><title>EXPERIMENT ONLY</title><script>(${browserFixture.toString()})()</script>`,
    );
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const url = `http://127.0.0.1:${server.address().port}/experiment?case=`;
  browser = spawn(
    executable,
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
    { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true },
  );
  let spawnError;
  browser.once('error', (error) => {
    spawnError = error;
  });
  browser.once('exit', () => {
    browserExited = true;
  });
  browser.stderr.on('data', (chunk) => {
    browserStderr = (browserStderr + chunk.toString()).slice(-4000);
  });
  const portFile = await until(async () => {
    if (spawnError) throw spawnError;
    if (browserExited)
      throw new Error('Browser exited before CDP became ready');
    try {
      const lines = (
        await readFile(join(profile, 'DevToolsActivePort'), 'utf8')
      )
        .trim()
        .split(/\r?\n/);
      return /^\d+$/.test(lines[0]) &&
        lines[1]?.startsWith('/devtools/browser/')
        ? lines
        : false;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      return false;
    }
  }, 'DevToolsActivePort');
  socket = new WebSocket(`ws://127.0.0.1:${portFile[0]}${portFile[1]}`);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('CDP socket open timeout')),
      5000,
    );
    socket.addEventListener(
      'open',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
    socket.addEventListener(
      'error',
      () => {
        clearTimeout(timer);
        reject(new Error('CDP socket error'));
      },
      { once: true },
    );
  });
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    const entry = pending.get(message.id);
    if (!entry) return;
    clearTimeout(entry.timer);
    pending.delete(message.id);
    if (message.error) entry.reject(new Error(JSON.stringify(message.error)));
    else entry.resolve(message.result);
  });
  report.browserVersion = await call('Browser.getVersion');
  const { targetId: originalId } = await call('Target.createTarget', {
    url: `${url}original`,
  });
  const original = await attach(originalId);
  const first = await evaluate(original, 'experiment.snapshot()');
  check('Fresh page has no stored marker', first, first.storedMarker === null);
  const markerA = `synthetic-A-${randomUUID()}`;
  await evaluate(original, `experiment.store(${JSON.stringify(markerA)})`);
  let before = await evaluate(original, 'experiment.snapshot()');
  for (const ignoreCache of [false, true]) {
    await call('Page.reload', { ignoreCache }, original);
    const after = await until(async () => {
      try {
        const value = await evaluate(original, 'window.experiment?.snapshot()');
        return value && value.memoryMarker !== before.memoryMarker
          ? value
          : false;
      } catch (error) {
        // Only navigation's transient destruction is retryable, not failed assertions.
        if (
          /Execution context was destroyed|Cannot find context/.test(
            error.message,
          )
        )
          return false;
        throw error;
      }
    }, 'new document after reload');
    check(
      `Reload ignoreCache=${ignoreCache}: memory lost, storage retained, type reload`,
      after,
      after.memoryMarker !== before.memoryMarker &&
        after.storedMarker === markerA &&
        after.navigationType === 'reload',
    );
    before = after;
  }
  const { targetId: independentId } = await call('Target.createTarget', {
    url: `${url}independent`,
  });
  const independent = await attach(independentId);
  const independentInitial = await evaluate(
    independent,
    'experiment.snapshot()',
  );
  check(
    'CDP-created independent page does not inherit storage',
    independentInitial,
    independentInitial.storedMarker === null && !independentInitial.hasOpener,
  );
  const markerB = `synthetic-B-${randomUUID()}`;
  await evaluate(independent, `experiment.store(${JSON.stringify(markerB)})`);
  await evaluate(
    original,
    `window.open(${JSON.stringify(`${url}opener-child`)}, '_blank'); true`,
  );
  const childTarget = await until(async () => {
    const { targetInfos } = await call('Target.getTargets');
    return targetInfos.find((target) => target.url === `${url}opener-child`);
  }, 'window.open target');
  const child = await attach(childTarget.targetId);
  const childSnapshot = await evaluate(child, 'experiment.snapshot()');
  check(
    'window.open child copies opener sessionStorage, not memory (NOT native duplication)',
    childSnapshot,
    childSnapshot.hasOpener &&
      childSnapshot.initialStoredMarker === markerA &&
      childSnapshot.memoryMarker !== before.memoryMarker,
  );
  await evaluate(child, 'experiment.store("synthetic-child-only")');
  const originalAfterChild = await evaluate(original, 'experiment.snapshot()');
  check(
    'Copied storage is not shared live',
    originalAfterChild,
    originalAfterChild.storedMarker === markerA,
  );
  const lockName = `public-lock-${randomUUID()}`;
  const acquiredOriginal = await evaluate(
    original,
    `experiment.acquire(${JSON.stringify(lockName)})`,
  );
  const acquiredIndependent = await evaluate(
    independent,
    `experiment.acquire(${JSON.stringify(lockName)})`,
  );
  check(
    'Web Lock excludes another independent page of same origin',
    { acquiredOriginal, acquiredIndependent },
    acquiredOriginal === true && acquiredIndependent === false,
  );
  await evaluate(original, 'experiment.release()');
  const acquiredAfterRelease = await until(
    () =>
      evaluate(independent, `experiment.acquire(${JSON.stringify(lockName)})`),
    'released lock available',
  );
  check(
    'Different page can acquire released lock: possession is not identity',
    { acquiredAfterRelease },
    acquiredAfterRelease === true,
  );
  await evaluate(independent, 'experiment.release()');
  const publicProbe = `public-message-${randomUUID()}`;
  await evaluate(original, `experiment.send(${JSON.stringify(publicProbe)})`);
  const received = await until(async () => {
    const messages = await evaluate(independent, 'experiment.messages()');
    return messages.find((message) => message.marker === publicProbe);
  }, 'BroadcastChannel public probe');
  check(
    'BroadcastChannel reaches independently initialized same-origin page',
    received,
    received.kind === 'public-probe',
  );
  const finalA = await evaluate(original, 'experiment.snapshot()');
  const finalB = await evaluate(independent, 'experiment.snapshot()');
  check(
    'Two synthetic states coexist in same profile (NOT authenticated sessions)',
    { finalA, finalB },
    finalA.storedMarker === markerA &&
      finalB.storedMarker === markerB &&
      finalA.memoryMarker !== finalB.memoryMarker,
  );
}

async function cleanup() {
  // Browser.close addresses only the CDP browser launched with our unique profile.
  if (socket?.readyState === WebSocket.OPEN && !browserExited) {
    try {
      await call('Browser.close');
    } catch {
      /* It may close before replying. */
    }
  }
  socket?.close();
  for (const entry of pending.values()) {
    clearTimeout(entry.timer);
    entry.reject(new Error('Experiment cleanup'));
  }
  pending.clear();
  if (browser && !browserExited) {
    for (let count = 0; count < 20 && !browserExited; count++) await delay(100);
    if (!browserExited && browser.pid) browser.kill(); // Only our direct child, never taskkill/name matching.
    for (let count = 0; count < 20 && !browserExited; count++) await delay(100);
  }
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  if (profile && (!browser || browserExited || !browser.pid)) {
    try {
      await rm(profile, {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: 200,
      });
      report.profileCleanup = 'removed own temporary profile';
    } catch {
      report.profileCleanup = `Could not remove own temporary profile: ${profile}`;
      process.exitCode = 1;
    }
  } else if (profile) {
    report.profileCleanup = `Own browser did not exit; profile retained: ${profile}`;
    process.exitCode = 1;
  }
}

try {
  await run();
  report.result = 'primitive observations passed; tab identity NOT validated';
} catch (error) {
  report.result = 'experiment failed or incomplete';
  report.error = error.message;
  report.browserStderr = browserStderr;
  process.exitCode = 1;
} finally {
  await cleanup();
  report.finishedAt = new Date().toISOString();
  console.log(JSON.stringify(report, null, 2));
}
