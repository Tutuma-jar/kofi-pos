import type {
  AuthClient,
  AuthClientOptions,
  LoginResult,
  Scenario,
  SessionState,
  TabLifecycle,
} from './contract.provisional';
import { fixtureDelay, fixtureSessionLabel } from './fixtures';

/** Explicit test/demo factory. Production uses createRealAuthClient instead. */
export function createAuthClient(options: AuthClientOptions = {}): AuthClient {
  let state: SessionState = options.initial ?? { status: 'checking' };
  let scenario: Scenario = 'normal';
  let revision = 0;
  let lastPresence = Date.now();
  let presenceDelivered = options.presenceDelivered ?? true;
  const listeners = new Set<() => void>();
  const jobs = new Map<ReturnType<typeof setTimeout>, () => void>();
  let presence: ReturnType<typeof setInterval> | undefined;
  let expiry: ReturnType<typeof setInterval> | undefined;
  const publish = (next: SessionState) => {
    state = next;
    listeners.forEach((listener) => listener());
  };
  const stopPresence = () => {
    clearInterval(presence);
    clearInterval(expiry);
  };
  const finish = (reason: 'expired' | 'closed' | 'required') => {
    revision++;
    stopPresence();
    publish({ status: 'anonymous', reason });
  };
  const wait = () =>
    new Promise<void>((resolve) => {
      const id = setTimeout(() => {
        jobs.delete(id);
        resolve();
      }, options.delay ?? fixtureDelay);
      jobs.set(id, resolve);
    });
  const startPresence = () => {
    stopPresence();
    lastPresence = Date.now();
    // Horarios de la política aprobada, simulados; no contacto con servidor.
    expiry = setInterval(() => {
      if (Date.now() - lastPresence >= 120_000) finish('expired');
    }, 1000);
    presence = setInterval(() => {
      if (Date.now() - lastPresence >= 120_000) finish('expired');
      else if (state.status === 'authenticated' && presenceDelivered) {
        lastPresence = Date.now();
        options.onPresence?.();
      }
    }, 30_000);
  };
  if (state.status === 'checking') {
    const initialRevision = revision;
    const id = setTimeout(() => {
      jobs.delete(id);
      if (revision === initialRevision) publish({ status: 'anonymous' });
    }, 180);
    jobs.set(id, () => {});
  } else if (state.status === 'authenticated') startPresence();
  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => state,
    async login(input): Promise<LoginResult> {
      const current = ++revision;
      const selected = scenario;
      await wait();
      if (current !== revision) return 'superseded';
      // No credenciales reales ni una contraseña mágica: el escenario decide.
      if (!input.username || !input.password || selected === 'incorrect')
        return 'incorrect';
      if (selected === 'connection') return 'connection';
      publish({ status: 'authenticated', label: fixtureSessionLabel });
      startPresence();
      return 'accepted';
    },
    async logout() {
      if (state.status !== 'authenticated' && state.status !== 'close-error')
        return;
      const current = ++revision;
      const selected = scenario;
      clearInterval(presence);
      publish({ status: 'closing', label: fixtureSessionLabel });
      await wait();
      if (current !== revision) return;
      if (selected === 'close-failed' || selected === 'close-uncertain') {
        publish({
          status: 'close-error',
          label: fixtureSessionLabel,
          uncertain: selected === 'close-uncertain',
        });
      } else finish('closed');
    },
    expire: () => finish('expired'),
    unauthorized: () => finish('required'),
    setScenario(next) {
      scenario = next;
      listeners.forEach((listener) => listener());
    },
    getScenario: () => scenario,
    setPresenceDelivery(delivered) {
      presenceDelivered = delivered;
    },
    dispose() {
      revision++;
      stopPresence();
      jobs.forEach((resolve, id) => {
        clearTimeout(id);
        resolve();
      });
      jobs.clear();
      listeners.clear();
    },
  };
}

/** El ciclo se selecciona como fixture; no detecta ni vincula pestañas reales. */
export function lifecycleFixture(
  lifecycle: TabLifecycle,
  previous: SessionState,
): SessionState {
  return lifecycle === 'reload' && previous.status === 'authenticated'
    ? previous
    : { status: 'anonymous', reason: 'required' };
}
