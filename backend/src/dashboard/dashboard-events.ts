import type { Response } from 'express';
import type { Session } from '../auth/session.model.js';
import type {
  createSessionsService,
  SessionAuthorization,
} from '../auth/sessions.service.js';

type Subscriber = {
  sessionId: string;
  close: () => void;
  send: (frame: string) => Promise<void>;
};

/** Single-process invalidation only. Call publishPersistedSale AFTER durable commit.
 * No replay: reconnect + periodic reads recover notices lost on process failure.
 */
export function createDashboardEvents(
  sessions: Pick<ReturnType<typeof createSessionsService>, 'current'>,
  clock = () => new Date(),
  onClose?: () => void,
) {
  const subscribers = new Set<Subscriber>();
  let closed = false;
  const notify = async () => {
    await Promise.all(
      [...subscribers].map((subscriber) =>
        subscriber.send('event: sales-changed\ndata: {}\n\n'),
      ),
    );
  };
  return {
    subscribe(res: Response, auth: SessionAuthorization, session: Session) {
      if (closed) {
        res.end();
        return;
      }
      let deadline: ReturnType<typeof setTimeout>;
      let sending = false;
      let ended = false;
      const close = () => {
        if (ended) return;
        ended = true;
        subscribers.delete(subscriber);
        clearInterval(heartbeat);
        clearTimeout(deadline);
        res.off('close', close);
        res.end();
      };
      const schedule = (expiresAt: Date) => {
        clearTimeout(deadline);
        deadline = setTimeout(
          () => {
            void checkDeadline();
          },
          Math.max(1, expiresAt.getTime() - clock().getTime()),
        );
        deadline.unref();
      };
      const checkDeadline = async () => {
        try {
          const current = await sessions.current(auth);
          if (!ended) schedule(current.expiresAt);
        } catch {
          close();
        }
      };
      const subscriber: Subscriber = {
        sessionId: session._id.toHexString(),
        close,
        async send(frame) {
          // No per-client unbounded queue, including authorization checks.
          if (ended) return;
          if (sending || res.writableLength > 0) {
            close();
            return;
          }
          sending = true;
          try {
            const current = await sessions.current(auth);
            if (ended) return;
            schedule(current.expiresAt);
            if (!res.write(frame)) close();
          } catch {
            close();
          } finally {
            sending = false;
          }
        },
      };
      const heartbeat = setInterval(() => {
        void subscriber.send(': heartbeat\n\n');
      }, 25_000);
      heartbeat.unref();
      subscribers.add(subscriber);
      res.on('close', close);
      schedule(session.expiresAt);
    },
    publishPersistedSale: notify,
    // Separate simulated notices from the durable-write integration hook.
    publishSimulatedChange: notify,
    revoke(sessionId: string) {
      for (const subscriber of subscribers)
        if (subscriber.sessionId === sessionId) subscriber.close();
    },
    close() {
      closed = true;
      onClose?.();
      for (const subscriber of [...subscribers]) subscriber.close();
    },
    get size() {
      return subscribers.size;
    },
  };
}
