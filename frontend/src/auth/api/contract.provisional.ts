/** UI compatibility contract, shared by explicit fixtures and real-auth-client.
 * Real HTTP DTOs are exported by real-auth-client. The production instance never
 * falls back to fixtures. Tab ownership is best effort, not cryptographic identity.
 */
export type SessionState =
  | { status: 'checking' }
  | { status: 'connection-error' }
  | { status: 'anonymous'; reason?: 'required' | 'expired' | 'closed' }
  | { status: 'authenticated'; label: string }
  | { status: 'closing'; label: string }
  | { status: 'close-error'; label: string; uncertain: boolean };
export type LoginInput = { username: string; password: string };
export type LoginResult =
  'accepted' | 'incorrect' | 'rate-limited' | 'connection' | 'superseded';
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
  | { kind: 'unauthorized'; code?: string; details?: unknown }
  | { kind: 'connection' }
  | { kind: 'error'; status: number; code?: string; details?: unknown };
export type HttpTransport = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;
