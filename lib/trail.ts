// The trail as a sequence: every stop, then a chest at the end of each island.
// Shared by the trail page and the home page's "continue your trail" card, so
// both agree on where the child is.

import type { ResolvedChapter, ResolvedStop } from "./catalog-types";
import type { TrailProgress } from "./device";
import type { WatchPosition } from "./watch-progress";

export type TrailItem =
  | { kind: "stop"; id: string; chapter: number; stop: ResolvedStop }
  | { kind: "chest"; id: string; chapter: number };

/** How much of a stop counts as watched: most of it, not the credits. */
export const WATCHED_FRACTION = 0.9;

/**
 * Whether a stop has earned its star: most of it actually played, over one
 * sitting or several. Where playback stands does not count, so dragging the
 * scrubber to the end earns nothing.
 */
export function watchedEnough(position: WatchPosition | null | undefined): boolean {
  return !!position && position.d > 0 && (position.w ?? 0) >= position.d * WATCHED_FRACTION;
}

export function trailItems(chapters: ResolvedChapter[]): TrailItem[] {
  return chapters.flatMap((chapter, index): TrailItem[] => [
    ...chapter.stops.map((stop) => ({ kind: "stop" as const, id: stop.id, chapter: index, stop })),
    { kind: "chest" as const, id: `chest:${chapter.id}`, chapter: index },
  ]);
}

export function isComplete(item: TrailItem, chapters: ResolvedChapter[], progress: TrailProgress): boolean {
  return item.kind === "stop" ? progress.done.includes(item.id) : progress.chests.includes(chapters[item.chapter].id);
}

/** The first thing not yet done: the stop that is unlocked and waiting. */
export function currentIndex(items: TrailItem[], chapters: ResolvedChapter[], progress: TrailProgress): number {
  const index = items.findIndex((item) => !isComplete(item, chapters, progress));
  return index === -1 ? items.length : index;
}
