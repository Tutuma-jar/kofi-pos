import type { Scenario } from './contract.provisional';

export const scenarioLabels: Record<Scenario, string> = {
  normal: 'Acceso y cierre correctos',
  incorrect: 'Credenciales incorrectas',
  connection: 'Error de conexión al entrar',
  'close-failed': 'Cierre rechazado',
  'close-uncertain': 'Cierre sin confirmación',
};
export const fixtureDelay = 650;
export const fixtureSessionLabel = 'Cuenta compartida';
