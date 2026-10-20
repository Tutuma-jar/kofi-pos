import { useEffect, useState } from 'react';
import type {
  DateRange,
  HistoryClient,
  HistorySnapshot,
} from '../api/contract.provisional';
import { sameRange } from '../api/dates';

type Command =
  | { kind: 'read'; range: DateRange | null }
  | { kind: 'page'; snapshot: HistorySnapshot; direction: 'next' | 'previous' };
type State = {
  phase: 'loading' | 'ready' | 'error';
  data: HistorySnapshot | null;
  currentDate: string | null;
  error: string | null;
};
export function useHistory(client: HistoryClient) {
  const [command, setCommand] = useState<Command>({
    kind: 'read',
    range: null,
  });
  const [state, setState] = useState<State>({
    phase: 'loading',
    data: null,
    currentDate: null,
    error: null,
  });
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const promise =
      command.kind === 'read'
        ? client.read(command.range, controller.signal)
        : client.page(command.snapshot, command.direction, controller.signal);
    void promise
      .then((data) => {
        if (active)
          setState({
            phase: 'ready',
            data,
            currentDate: data.currentDate,
            error: null,
          });
      })
      .catch((error: unknown) => {
        if (active)
          setState((previous) => ({
            ...previous,
            phase: 'error',
            error:
              error instanceof Error
                ? error.message
                : 'No pudimos consultar las ventas. Reintenta.',
          }));
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [client, command]);
  const run = (next: Command) => {
    setState((previous) => ({
      ...previous,
      phase: 'loading',
      error: null,
      data:
        next.kind === 'page' ||
        (next.range &&
          previous.data &&
          sameRange(next.range, previous.data.range))
          ? previous.data
          : null,
    }));
    setCommand(next);
  };
  return {
    ...state,
    read: (range: DateRange | null) => run({ kind: 'read', range }),
    refresh: () =>
      run({
        kind: 'read',
        range:
          state.data?.range ??
          (command.kind === 'read' ? command.range : command.snapshot.range),
      }),
    page: (direction: 'next' | 'previous') => {
      if (state.data) run({ kind: 'page', snapshot: state.data, direction });
    },
  };
}
