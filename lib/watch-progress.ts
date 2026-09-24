// How far someone has watched, remembered on this device.
//
// Same shape as the main ShowTiva app's watch progress, so both move to one
// API unchanged once accounts exist: one localStorage entry per show, holding
// the last thing played in it ("feature" for a movie, "s1e3" for an episode)
// and a position for each thing played.

export interface WatchPosition {
  /** Seconds watched. */
  t: number;
  /** Length in seconds. */
  d: number;
}

export interface ShowProgress {
  last: string;
  items: Record<string, WatchPosition>;
  updatedAt: number;
}

export type Pick = "feature" | { season: number; episode: number };

const PREFIX = "stk-progress:";
const EVENT = "stk-progress";

/** Near the end counts as finished: the next visit starts over. */
export const FINISHED_WITHIN_SECONDS = 15;

export function progressKey(pick: Pick): string {
  return pick === "feature" ? "feature" : `s${pick.season}e${pick.episode}`;
}

export function parsePick(key: string): Pick | null {
  if (key === "feature") return "feature";
  const m = /^s(\d+)e(\d+)$/.exec(key);
  return m ? { season: Number(m[1]), episode: Number(m[2]) } : null;
}

/** The raw stored string: a stable snapshot for useSyncExternalStore. */
export function readRaw(showId: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + showId);
  } catch {
    return null;
  }
}

export function parseProgress(raw: string | null): ShowProgress | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as ShowProgress;
    return value && typeof value.last === "string" && value.items ? value : null;
  } catch {
    return null;
  }
}

export function saveProgress(showId: string, key: string, t: number, d: number): void {
  if (!Number.isFinite(t) || !Number.isFinite(d) || d <= 0) return;
  try {
    const current = parseProgress(readRaw(showId)) ?? { last: key, items: {}, updatedAt: 0 };
    const next: ShowProgress = {
      last: key,
      items: { ...current.items, [key]: { t: Math.max(0, Math.min(t, d)), d } },
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(PREFIX + showId, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  } catch {
    // Storage full or blocked: progress simply is not remembered.
  }
}

/** Every show with progress on this device, most recent first. */
export function readAllRaw(): string {
  try {
    const entries: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(PREFIX)) entries.push(`${key.slice(PREFIX.length)}\u0000${window.localStorage.getItem(key)}`);
    }
    return entries.sort().join("\u0001");
  } catch {
    return "";
  }
}

export function parseAll(raw: string): { showId: string; progress: ShowProgress }[] {
  if (!raw) return [];
  return raw
    .split("\u0001")
    .map((entry) => {
      const [showId, value] = entry.split("\u0000");
      const progress = parseProgress(value ?? null);
      return progress ? { showId, progress } : null;
    })
    .filter((entry): entry is { showId: string; progress: ShowProgress } => entry !== null)
    .sort((a, b) => b.progress.updatedAt - a.progress.updatedAt);
}

/** Fires on this tab's saves and on other tabs' (the storage event). */
export function subscribeProgress(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** 0 to 1, or 0 for nothing watched. Finished counts as 1. */
export function fractionWatched(position: WatchPosition | undefined): number {
  if (!position || position.d <= 0) return 0;
  if (position.d - position.t <= FINISHED_WITHIN_SECONDS) return 1;
  return Math.min(1, position.t / position.d);
}

/** Where to resume from, or 0 to start over. */
export function resumeSeconds(position: WatchPosition | undefined): number {
  if (!position || position.t < 5 || position.d - position.t <= FINISHED_WITHIN_SECONDS) return 0;
  return position.t;
}
