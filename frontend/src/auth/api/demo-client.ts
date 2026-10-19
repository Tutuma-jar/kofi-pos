import { createAuthClient } from './auth-client';

export const demoClient = createAuthClient();

if (import.meta.hot) {
  import.meta.hot.dispose(() => demoClient.dispose());
}
