import { createContext, useContext, useSyncExternalStore } from 'react';
import type { AuthClient } from './api/contract.provisional';

export const AuthContext = createContext<AuthClient | null>(null);
export function useAuth() {
  const client = useContext(AuthContext);
  if (!client) throw new Error('Falta el proveedor de Acceso');
  const session = useSyncExternalStore(client.subscribe, client.getSnapshot);
  return { client, session };
}
