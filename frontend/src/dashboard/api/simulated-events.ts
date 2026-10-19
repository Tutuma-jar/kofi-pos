import type { DashboardEvent } from './contract.provisional';

/** In-memory invalidation emitter, not EventSource or a network connection. */
export function createSimulatedEvents() {
  const listeners = new Set<(event: DashboardEvent) => void>();
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let connected = true;
  let silent = false;
  const emit = (event: DashboardEvent) =>
    listeners.forEach((listener) => listener(event));
  return {
    subscribe(listener: (event: DashboardEvent) => void) {
      listeners.add(listener);
      if (!heartbeat)
        heartbeat = setInterval(() => {
          if (connected && !silent) emit({ type: 'heartbeat' });
        }, 25_000);
      return () => {
        listeners.delete(listener);
        if (!listeners.size) {
          clearInterval(heartbeat);
          heartbeat = undefined;
        }
      };
    },
    emit,
    changed() {
      if (connected) emit({ type: 'sales-changed', data: {} });
    },
    disconnect() {
      connected = false;
      emit({ type: 'closed' });
    },
    reconnect() {
      if (!connected) return;
      silent = false;
      emit({ type: 'open' });
    },
    restore() {
      connected = true;
      silent = false;
      emit({ type: 'open' });
    },
    silence() {
      silent = true;
    },
    reset() {
      connected = true;
      silent = false;
    },
  };
}
