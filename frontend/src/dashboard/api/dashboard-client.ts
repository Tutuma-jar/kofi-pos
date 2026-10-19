import type {
  DashboardClient,
  DashboardEvent,
  DashboardPeriod,
  DashboardPort,
  DashboardSnapshot,
  ReadResult,
} from './contract.provisional';
import { boliviaTime, clockLabel, periodLabel } from './presentation';

export function createDashboardClient(
  port: DashboardPort,
  onUnauthorized: () => void = () => {},
): DashboardClient {
  const listeners = new Set<() => void>();
  let generation = 0;
  let running = 0;
  let interval: ReturnType<typeof setInterval> | undefined;
  let unsubscribe: (() => void) | undefined;
  let lastSignal = port.now();
  let lastReconcile = port.now();
  let temporalKey = boliviaTime(port.now()).dayKey;
  let acceptedHour = boliviaTime(port.now()).hour;
  let handledExpiration = '';
  let rejectedExpiration = '';
  let state: DashboardSnapshot = {
    period: 'today',
    phase: 'loading',
    data: null,
    refreshing: false,
    stale: false,
    error: null,
    stream: 'connected',
    currentHour: acceptedHour,
    drawnThroughHour: acceptedHour,
    clockLabel: clockLabel(port.now()),
    dataLabel: '',
    demoDescription: port.description?.() ?? '',
  };
  function publish(patch: Partial<DashboardSnapshot>) {
    state = {
      ...state,
      ...patch,
      clockLabel: clockLabel(port.now()),
      demoDescription: port.description?.() ?? '',
    };
    listeners.forEach((listener) => listener());
  }
  function unauthorized() {
    generation++;
    publish({
      phase: 'unauthorized',
      data: null,
      refreshing: false,
      stale: false,
      error: null,
    });
    onUnauthorized();
  }
  async function read() {
    if (state.phase === 'unauthorized') return;
    const request = ++generation;
    const period = state.period;
    const day = boliviaTime(port.now()).dayKey;
    publish({
      phase: state.data ? 'ready' : 'loading',
      refreshing: !!state.data,
      error: null,
    });
    let result: ReadResult;
    try {
      result = await port.read(period);
    } catch {
      result = { kind: 'connection' as const };
    }
    // A 401 is global, even if this data request has been superseded.
    if (result.kind === 'error' && result.status === 401) {
      if (running) unauthorized();
      return;
    }
    if (!running || request !== generation || period !== state.period) return;
    if (result.kind === 'ok') {
      if (result.data.period !== period) {
        publish({
          phase: state.data ? 'ready' : 'error',
          refreshing: false,
          stale: !!state.data,
          error: 'INTERNAL_ERROR',
        });
        return;
      }
      const end = Date.parse(result.data.periodEndsAt);
      if (!Number.isFinite(end)) {
        publish({
          phase: state.data ? 'ready' : 'error',
          refreshing: false,
          stale: !!state.data,
          error: 'INTERNAL_ERROR',
        });
        return;
      }
      if (end <= port.now() || day !== boliviaTime(port.now()).dayKey) {
        // Never publish a request from a concluded day, including month reads.
        if (rejectedExpiration === result.data.periodEndsAt) {
          publish({
            phase: state.data ? 'ready' : 'error',
            refreshing: false,
            stale: !!state.data,
            error: 'INTERNAL_ERROR',
          });
          return;
        }
        rejectedExpiration = result.data.periodEndsAt;
        void read();
        return;
      }
      rejectedExpiration = '';
      acceptedHour = boliviaTime(port.now()).hour;
      publish({
        data: result.data,
        phase: 'ready',
        refreshing: false,
        stale: false,
        error: null,
        drawnThroughHour: acceptedHour,
        dataLabel: periodLabel(period, result.data.periodEndsAt),
      });
    } else {
      publish({
        phase: state.data ? 'ready' : 'error',
        refreshing: false,
        stale: !!state.data,
        error:
          result.kind === 'connection'
            ? 'connection'
            : result.body.error.code === 'VALIDATION_ERROR'
              ? 'VALIDATION_ERROR'
              : 'INTERNAL_ERROR',
      });
    }
  }
  function event(event: DashboardEvent) {
    if (state.phase === 'unauthorized') return;
    if (event.type === 'unauthorized') {
      unauthorized();
      return;
    }
    if (event.type === 'closed') {
      publish({ stream: 'reconnecting', stale: !!state.data });
      port.reconnect();
      void read();
    } else if (event.type === 'clock') {
      tick();
    } else {
      lastSignal = port.now();
      if (event.type === 'open') {
        publish({ stream: 'connected' });
        void read();
      } else if (event.type === 'sales-changed') void read();
    }
  }
  function tick() {
    if (state.phase === 'unauthorized') return;
    const now = port.now();
    const time = boliviaTime(now);
    const expired = !!state.data && Date.parse(state.data.periodEndsAt) <= now;
    const boundary =
      time.dayKey !== temporalKey ||
      (expired && state.data?.periodEndsAt !== handledExpiration);
    if (boundary && state.data) handledExpiration = state.data.periodEndsAt;
    const hourChanged = time.hour !== state.currentHour;
    temporalKey = time.dayKey;
    publish({
      currentHour: time.hour,
      drawnThroughHour:
        state.stale || expired || boundary ? acceptedHour : time.hour,
      ...(boundary ? { stale: !!state.data } : {}),
    });
    let shouldRead = boundary || hourChanged;
    if (now - lastReconcile >= 30_000 || now < lastReconcile) {
      lastReconcile = now;
      shouldRead = true;
    }
    if (now - lastSignal >= 60_000 && state.stream !== 'reconnecting') {
      publish({ stream: 'reconnecting', stale: !!state.data });
      port.reconnect();
      shouldRead = true;
    }
    if (shouldRead) void read();
  }
  return {
    getSnapshot: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    start() {
      running++;
      if (running === 1) {
        lastSignal = lastReconcile = port.now();
        temporalKey = boliviaTime(port.now()).dayKey;
        unsubscribe = port.subscribe(event);
        interval = setInterval(tick, 1000);
        void read();
      }
      return () => {
        running--;
        if (!running) {
          generation++;
          clearInterval(interval);
          unsubscribe?.();
        }
      };
    },
    selectPeriod(period: DashboardPeriod) {
      if (state.phase === 'unauthorized' || period === state.period) return;
      generation++;
      publish({
        period,
        data: null,
        dataLabel: '',
        phase: 'loading',
        refreshing: false,
        stale: false,
        error: null,
      });
      void read();
    },
    refresh: () => {
      void read();
    },
    reset() {
      if (state.phase === 'unauthorized') return;
      generation++;
      acceptedHour = boliviaTime(port.now()).hour;
      publish({
        data: null,
        phase: 'loading',
        refreshing: false,
        stale: false,
        error: null,
        drawnThroughHour: acceptedHour,
      });
      void read();
    },
  };
}
