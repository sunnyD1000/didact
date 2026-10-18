import { useCallback, useEffect } from "react";

declare global {
  interface Window {
    didact: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
      on: (
        channel: string,
        listener: (...args: unknown[]) => void
      ) => () => void;
      IPC: Record<string, string>;
    };
  }
}

export function useIpc() {
  const invoke = useCallback(
    <T = unknown>(channel: string, ...args: unknown[]): Promise<T> =>
      window.didact.invoke(channel, ...args) as Promise<T>,
    []
  );

  const on = useCallback(
    (channel: string, listener: (...args: unknown[]) => void) =>
      window.didact.on(channel, listener),
    []
  );

  return { invoke, on };
}

/** Subscribe to a push event from main, clean up on unmount. */
export function useIpcListener(
  channel: string,
  listener: (...args: unknown[]) => void
) {
  useEffect(() => {
    const off = window.didact.on(channel, listener);
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);
}
