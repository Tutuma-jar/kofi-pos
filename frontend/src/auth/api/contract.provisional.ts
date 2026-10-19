/**
 * Supuestos provisionales de UI; no endpoints, DTO reales ni seguridad aprobados.
 * Login: el escenario decide el resultado con datos de demostración, nunca
 * credenciales reales. No hay autenticación ni autorización reales.
 * Presencia cada 30 s y finalización a los 120 s se simulan en auth/api/;
 * el reloj del cliente no tiene autoridad sobre una sesión de servidor.
 * Recarga/nueva/duplicada/restaurada son fixtures de ciclo de pestaña:
 * una recarga REAL todavía pierde la sesión simulada en memoria.
 * Cierre confirmado, error conocido y resultado incierto son distintos;
 * suspender la interacción local no equivale a revocar la sesión.
 * HTTP usa transporte inyectado; un 401 notifica a auth sin definir
 * almacenamiento, token ni mecanismo de vinculación de autorización.
 */
export type SessionState =
  | { status: 'checking' }
  | { status: 'anonymous'; reason?: 'required' | 'expired' | 'closed' }
  | { status: 'authenticated'; label: string }
  | { status: 'closing'; label: string }
  | { status: 'close-error'; label: string; uncertain: boolean };
export type LoginInput = { username: string; password: string };
export type LoginResult =
  'accepted' | 'incorrect' | 'connection' | 'superseded';
export type Scenario =
  'normal' | 'incorrect' | 'connection' | 'close-failed' | 'close-uncertain';
export type TabLifecycle = 'reload' | 'new' | 'duplicated' | 'restored';
export type AuthClient = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => SessionState;
  login: (input: LoginInput) => Promise<LoginResult>;
  logout: () => Promise<void>;
  expire: () => void;
  unauthorized: () => void;
  setScenario: (scenario: Scenario) => void;
  getScenario: () => Scenario;
  setPresenceDelivery: (delivered: boolean) => void;
  dispose: () => void;
};
export type AuthClientOptions = {
  initial?: SessionState;
  delay?: number;
  presenceDelivered?: boolean;
  onPresence?: () => void;
};
export type HttpResult<T> =
  | { kind: 'ok'; data: T }
  | { kind: 'unauthorized' }
  | { kind: 'connection' }
  | { kind: 'error'; status: number };
export type HttpTransport = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;
