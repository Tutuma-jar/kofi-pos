import type { AuthClient } from '../../auth/api/contract.provisional';
import type { Scenario } from './contract.provisional';
import { createDemoSalesClient } from './demo-client';

/** Explicit demo composition. Future adapter reuses auth.request (authorized HTTP).
 * There is intentionally no invented endpoint, network call or real-API fallback.
 */
export function createSalesSource(auth: AuthClient) {
  let scenario: Scenario = 'normal';
  return {
    client: createDemoSalesClient({
      auth,
      storage: window.localStorage,
      scenario: () => scenario,
    }),
    setScenario(value: Scenario) {
      scenario = value;
    },
  };
}
