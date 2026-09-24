"use client";

// Browser-only values without an effect-then-setState round trip. Both read
// through useSyncExternalStore, which renders the server snapshot during
// hydration (so the markup matches) and the real value straight after.

import { useSyncExternalStore } from "react";

const noSubscribe = () => () => undefined;

/** False on the server and during hydration, true once in the browser. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
}

const clockSubscribers = new Map<number, (onChange: () => void) => () => void>();

function subscribeEvery(stepMs: number) {
  let subscribe = clockSubscribers.get(stepMs);
  if (!subscribe) {
    subscribe = (onChange) => {
      const id = window.setInterval(onChange, stepMs);
      return () => window.clearInterval(id);
    };
    clockSubscribers.set(stepMs, subscribe);
  }
  return subscribe;
}

/**
 * The time, rounded down to `stepMs` and refreshed that often; null on the
 * server, whose clock is not the viewer's. Rounding keeps the snapshot stable
 * between the reads React makes within one render.
 */
export function useClock(stepMs = 1000): number | null {
  return useSyncExternalStore(
    subscribeEvery(stepMs),
    () => Math.floor(Date.now() / stepMs) * stepMs,
    () => null,
  );
}
