import { createRealAuthClient } from './real-auth-client';

export const demoClient = createRealAuthClient();

if (import.meta.hot) {
  import.meta.hot.dispose(() => demoClient.dispose());
}
