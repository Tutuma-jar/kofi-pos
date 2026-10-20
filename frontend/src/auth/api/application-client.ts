import { createRealAuthClient } from './real-auth-client';

export const applicationAuthClient = createRealAuthClient();

if (import.meta.hot) {
  import.meta.hot.dispose(() => applicationAuthClient.dispose());
}
