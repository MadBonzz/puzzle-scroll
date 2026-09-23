export interface SessionClock {
  now(): number;
}

export function createMonotonicClock(
  wallNow: () => number = Date.now,
  monotonicNow: (() => number) | undefined = globalThis.performance?.now?.bind(globalThis.performance)
): SessionClock {
  const monotonic = monotonicNow;
  if (!monotonic) {
    let last = wallNow();
    return { now: () => (last = Math.max(last, wallNow())) };
  }
  const wallAnchor = wallNow();
  const monotonicAnchor = monotonic();
  let last = wallAnchor;
  return {
    now() {
      last = Math.max(last, wallAnchor + monotonic() - monotonicAnchor);
      return last;
    }
  };
}

export const foregroundSessionClock = createMonotonicClock();
