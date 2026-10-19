import type {
  DashboardClient,
  DashboardPeriod,
  DemoScenario,
  ReadResult,
} from './contract.provisional';
import { createDashboardClient } from './dashboard-client';
import {
  BASE_TIME,
  fixture,
  inactiveCatalogFixture,
  scenarioLabels,
} from './fixtures';
import type { FixtureMode } from './fixtures';
import { createSimulatedEvents } from './simulated-events';
import { money } from './presentation';

export function createDemoDashboardClient(
  onUnauthorized: () => void = () => {},
): DashboardClient {
  let anchor = BASE_TIME;
  let realAnchor = Date.now();
  const now = () => anchor + Date.now() - realAnchor;
  const events = createSimulatedEvents();
  let mode: FixtureMode = 'normal';
  let updated = false;
  let renamed = false;
  let failure: 'network' | 400 | 401 | 500 | null = null;
  let delay = 350;
  let description = 'Datos simulados';
  const queue: { delay: number; failure?: 500 }[] = [];
  const read = async (period: DashboardPeriod): Promise<ReadResult> => {
    const planned = queue.shift();
    const rejected = planned?.failure ?? failure;
    const data = fixture(period, now(), { mode, updated, renamed });
    await new Promise<void>((resolve) =>
      setTimeout(resolve, planned?.delay ?? delay),
    );
    if (rejected === 'network') return { kind: 'connection' };
    if (rejected)
      return {
        kind: 'error',
        status: rejected,
        body: {
          error: {
            code:
              rejected === 401
                ? 'UNAUTHORIZED'
                : rejected === 400
                  ? 'VALIDATION_ERROR'
                  : 'INTERNAL_ERROR',
            message: 'Diagnóstico simulado; no mostrar en la interfaz.',
          },
        },
      };
    return { kind: 'ok', data };
  };
  const client = createDashboardClient(
    {
      read,
      now,
      subscribe: events.subscribe,
      reconnect: events.reconnect,
      description: () => description,
    },
    onUnauthorized,
  );
  function setTime(value: number) {
    anchor = value;
    realAnchor = Date.now();
    events.emit({ type: 'clock' });
  }
  function run(scenario: DemoScenario) {
    description = scenarioLabels[scenario];
    switch (scenario) {
      case 'normal':
        mode = 'normal';
        updated = renamed = false;
        failure = null;
        delay = 350;
        queue.length = 0;
        events.reset();
        anchor = BASE_TIME;
        realAnchor = Date.now();
        client.reset();
        events.emit({ type: 'open' });
        return;
      case 'slow':
        failure = null;
        delay = 1500;
        client.reset();
        return;
      case 'empty':
      case 'many':
      case 'large':
      case 'decimal':
      case 'zero':
        mode = scenario;
        failure = null;
        client.reset();
        return;
      case 'sale':
        updated = true;
        events.changed();
        return;
      case 'repeat':
        events.changed();
        events.changed();
        return;
      case 'burst':
        for (let i = 0; i < 8; i++) events.changed();
        return;
      case 'missed':
        updated = true;
        return;
      case 'rename':
        renamed = true;
        return; // Catalog changes have no own event.
      case 'inactive':
        description = `Americano desactivado; precio actual simulado ${money(inactiveCatalogFixture.currentPriceTenths)}. Historial intacto.`;
        return; // Neither activity nor the catalog price rewrite historical data.
      case 'initial-error':
        failure = 500;
        client.reset();
        return;
      case 'refresh-error':
        failure = 500;
        client.refresh();
        return;
      case 'network':
        failure = 'network';
        client.refresh();
        return;
      case 'validation':
        failure = 400;
        client.refresh();
        return;
      case 'recover':
        failure = null;
        delay = 350;
        client.refresh();
        return;
      case 'disconnect':
        events.disconnect();
        return;
      case 'reconnect':
        events.restore();
        return;
      case 'silence':
        events.silence();
        return;
      case 'hour':
        setTime(now() + 3_600_000);
        return;
      case 'midnight':
        setTime(Date.parse('2026-10-20T03:59:58.000Z'));
        return;
      case 'month-end':
        setTime(Date.parse('2026-11-01T03:59:58.000Z'));
        return;
      case 'race': {
        failure = null;
        const initial = client.getSnapshot().period;
        const other = initial === 'today' ? 'month' : 'today';
        queue.push({ delay: 1500 }, { delay: 900 }, { delay: 150 });
        client.refresh();
        client.selectPeriod(other);
        client.selectPeriod(initial);
        return;
      }
      case 'late-failure':
        failure = null;
        queue.push({ delay: 1500 }, { delay: 150, failure: 500 });
        client.refresh();
        client.refresh();
        return;
      case 'unauthorized-read':
        failure = 401;
        client.refresh();
        return;
      case 'unauthorized-stream':
        events.emit({ type: 'unauthorized' });
        return;
    }
  }
  return { ...client, demo: { run } };
}
