// Small client-side stores kept on this device: favourites per profile, the
// break timer, and whether a grown-up has recently passed the gate.
//
// Each exposes a raw string snapshot for useSyncExternalStore, so an
// unchanged value never re-renders, plus a subscribe that hears this tab's
// writes (a custom event) and other tabs' (the storage event).

const EVENT = "stk-device";

function read(storage: "local" | "session", key: string): string | null {
  try {
    return (storage === "local" ? window.localStorage : window.sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

function write(storage: "local" | "session", key: string, value: string | null): void {
  try {
    const store = storage === "local" ? window.localStorage : window.sessionStorage;
    if (value === null) store.removeItem(key);
    else store.setItem(key, value);
  } catch {
    // Blocked storage: the setting simply is not remembered.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeDevice(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/* ------------------------------------------------------------ favourites -- */

const favKey = (profileId: string) => `stk-favs:${profileId}`;

export function readFavouritesRaw(profileId: string | null): string {
  return (profileId && read("local", favKey(profileId))) || "[]";
}

export function parseFavourites(raw: string): string[] {
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

/** Adds or removes a show; newest favourite first. */
export function toggleFavourite(profileId: string, showId: string): void {
  const current = parseFavourites(readFavouritesRaw(profileId));
  const next = current.includes(showId) ? current.filter((id) => id !== showId) : [showId, ...current];
  write("local", favKey(profileId), JSON.stringify(next));
}

/* ----------------------------------------------------------- break timer -- */

const TIMER_KEY = "stk-timer";

export interface BreakTimer {
  /** What the grown-up chose, in minutes. */
  minutes: number;
  /** When the break starts, epoch milliseconds. */
  endsAt: number;
}

export function readTimerRaw(): string {
  return read("local", TIMER_KEY) ?? "";
}

export function parseTimer(raw: string): BreakTimer | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as BreakTimer;
    return Number.isFinite(value?.minutes) && Number.isFinite(value?.endsAt) ? value : null;
  } catch {
    return null;
  }
}

/** Starts a fresh countdown of `minutes`, or turns the timer off with null. */
export function setTimer(minutes: number | null): void {
  write("local", TIMER_KEY, minutes ? JSON.stringify({ minutes, endsAt: Date.now() + minutes * 60_000 }) : null);
}

/* --------------------------------------------------------------- trail -- */

/**
 * One child's progress along the trail. Kept per profile, so two children
 * sharing a tablet each walk their own path.
 */
export interface TrailProgress {
  /** Stop ids ("showId/s1e3") watched to the end from the trail. */
  done: string[];
  /** Chapter ids whose treasure chest has been opened. */
  chests: string[];
  /** The trail item the buddy was last standing at, so it can walk on from there. */
  seen: number;
}

const trailKey = (profileId: string) => `stk-trail:${profileId}`;

export function readTrailRaw(profileId: string): string {
  return read("local", trailKey(profileId)) ?? "";
}

export function parseTrail(raw: string): TrailProgress {
  try {
    const value = JSON.parse(raw) as Partial<TrailProgress>;
    return {
      done: Array.isArray(value.done) ? value.done.filter((v): v is string => typeof v === "string") : [],
      chests: Array.isArray(value.chests) ? value.chests.filter((v): v is string => typeof v === "string") : [],
      seen: Number.isInteger(value.seen) && (value.seen as number) >= 0 ? (value.seen as number) : 0,
    };
  } catch {
    return { done: [], chests: [], seen: 0 };
  }
}

function updateTrail(profileId: string, change: (current: TrailProgress) => TrailProgress): void {
  write("local", trailKey(profileId), JSON.stringify(change(parseTrail(readTrailRaw(profileId)))));
}

export function markStopDone(profileId: string, stopId: string): void {
  updateTrail(profileId, (t) => (t.done.includes(stopId) ? t : { ...t, done: [...t.done, stopId] }));
}

export function openChest(profileId: string, chapterId: string): void {
  updateTrail(profileId, (t) => (t.chests.includes(chapterId) ? t : { ...t, chests: [...t.chests, chapterId] }));
}

export function setTrailSeen(profileId: string, seen: number): void {
  updateTrail(profileId, (t) => (t.seen === seen ? t : { ...t, seen }));
}

/* ----------------------------------------------------------- grown-ups -- */

const GATE_KEY = "stk-gate";
/** A passed gate holds for a few minutes, so a grown-up changing several
 *  settings is not asked a sum between each one. */
const GATE_HOLD_MS = 5 * 60_000;

export function readGateRaw(): string {
  return read("session", GATE_KEY) ?? "";
}

export function gateOpen(raw: string, now = Date.now()): boolean {
  const until = Number(raw);
  return Number.isFinite(until) && until > now;
}

export function openGate(): void {
  write("session", GATE_KEY, String(Date.now() + GATE_HOLD_MS));
}

export function closeGate(): void {
  write("session", GATE_KEY, null);
}

/* --------------------------------------------------------------- reset -- */

/** Forgets everything this app stored on the device except the profiles
 *  cookie, which the caller clears. */
export function clearDevice(): void {
  try {
    for (const store of [window.localStorage, window.sessionStorage]) {
      for (const key of Object.keys(store)) if (key.startsWith("stk-")) store.removeItem(key);
    }
  } catch {
    // Nothing to clear.
  }
  window.dispatchEvent(new Event(EVENT));
  window.dispatchEvent(new Event("stk-progress"));
}
