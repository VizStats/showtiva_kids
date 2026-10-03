// How far each child has watched, remembered on this device.
//
// Same shape as the main ShowTiva app's watch progress, so both move to one
// API once accounts exist: one localStorage entry per child and show, holding
// the last thing played in it ("feature" for a movie, "s1e3" for an episode)
// and a position for each thing played. Kept per child, like their favourites
// and trail, so a sibling's half-watched episode is not someone else's
// "Resume".

export interface WatchPosition {
  /** Seconds in: where playback is. */
  t: number;
  /** Length in seconds. */
  d: number;
  /**
   * Seconds actually played, across every sitting. Skips and drags along the
   * scrubber add nothing, so this, not `t`, says whether something was watched.
   */
  w?: number;
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

/** "guest" when nobody has picked a profile. Profile ids never hold a colon. */
const storageKey = (profileId: string, showId: string) => `${PREFIX}${profileId}:${showId}`;

/** The raw stored string: a stable snapshot for useSyncExternalStore. */
export function readRaw(profileId: string, showId: string): string | null {
  try {
    return window.localStorage.getItem(storageKey(profileId, showId));
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

/**
 * Records where playback is, adding `played` (seconds actually played since
 * the last save) to the item's running total. Returns the saved position, or
 * null when nothing could be saved.
 */
export function saveProgress(
  profileId: string,
  showId: string,
  key: string,
  t: number,
  d: number,
  played = 0,
): WatchPosition | null {
  if (!Number.isFinite(t) || !Number.isFinite(d) || d <= 0) return null;
  try {
    const current = parseProgress(readRaw(profileId, showId)) ?? { last: key, items: {}, updatedAt: 0 };
    const before = current.items[key]?.w ?? 0;
    const position: WatchPosition = {
      t: Math.max(0, Math.min(t, d)),
      d,
      w: Math.min(d, before + (Number.isFinite(played) ? Math.max(0, played) : 0)),
    };
    const next: ShowProgress = {
      last: key,
      items: { ...current.items, [key]: position },
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(storageKey(profileId, showId), JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
    return position;
  } catch {
    // Storage full or blocked: progress simply is not remembered.
    return null;
  }
}

/** Every show this child has progress in, most recent first. */
export function readAllRaw(profileId: string): string {
  try {
    const prefix = `${PREFIX}${profileId}:`;
    const entries: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key?.startsWith(prefix)) entries.push(`${key.slice(prefix.length)}\u0000${window.localStorage.getItem(key)}`);
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
