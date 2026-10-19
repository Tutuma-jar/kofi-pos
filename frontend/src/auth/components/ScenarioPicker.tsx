import { useSyncExternalStore } from 'react';
import { useAuth } from '../auth-context';
import type { Scenario } from '../api/contract.provisional';
import { scenarioLabels } from '../api/fixtures';
import styles from '../pages/Access.module.css';

export function ScenarioPicker() {
  const { client } = useAuth();
  const scenario = useSyncExternalStore(client.subscribe, client.getScenario);
  if (!import.meta.env.DEV) return null;
  return (
    <details className={styles.dev}>
      <summary>Escenarios de demostración</summary>
      <p>Solo datos simulados. No uses credenciales reales.</p>
      <label>
        Resultado simulado
        <select
          value={scenario}
          onChange={(event) => {
            const next = event.target.value as Scenario;
            client.setScenario(next);
          }}
        >
          {Object.entries(scenarioLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </details>
  );
}
