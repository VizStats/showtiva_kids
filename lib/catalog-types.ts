// Pure type definitions for the catalog store (data/catalog.json).
//
// Free of imports so server and client components can both use them. All
// filesystem access lives in catalog.ts, which is server-only.

export const CHARACTER_IDS = ["bloop", "kai", "cog", "nova", "zip", "coco"] as const;
export type CharacterId = (typeof CHARACTER_IDS)[number];

/** The pattern drawn behind a character on generated artwork. */
export const MOTIFS = [
  "drops",
  "cones",
  "hearts",
  "waves",
  "leaves",
  "gears",
  "bulbs",
  "flowers",
  "notes",
  "stars",
  "bolts",
  "moons",
  "bubbles",
] as const;
export type Motif = (typeof MOTIFS)[number];

/**
 * Where the face sits inside the character artwork, so any circle can show
 * just the face (avatars, the player's scrubber, row headings) without a
 * second image file. `x` and `size` are percentages of the artwork's width,
 * `y` of its height; the crop is a square `size` wide.
 */
export interface FaceCrop {
  x: number;
  y: number;
  size: number;
}

/** One of the six friends. Each also hosts a "world" of shows. */
export interface Character {
  id: CharacterId;
  name: string;
  /** Two or three words: "The brave one". */
  role: string;
  /** The world this character hosts, e.g. "Adventures". */
  world: string;
  /** One line about the world, shown under its name. */
  worldLine: string;
  /** First person, the way the character would say it. */
  bio: string;
  likes: string[];
  /** Said in a speech bubble when the character is tapped. */
  quotes: string[];
  /** Signature colour, its pale tint and its deep shade. */
  color: string;
  soft: string;
  deep: string;
  /** Text colour that reads on `color`. */
  onColor: string;
  image: string;
  /** Width over height of the artwork, so crops can be computed. */
  aspect: number;
  face: FaceCrop;
  motif: Motif;
}

export interface Episode {
  /** 1-based, unique within its season. */
  number: number;
  title: string;
  /** As shown, e.g. "11m". */
  duration: string;
  description: string;
  /** A playable .mp4/.webm; null plays the stand-in footage. */
  videoUrl: string | null;
}

export interface Season {
  number: number;
  episodes: Episode[];
}

export const FORMATS = ["Series", "Minis", "Movie", "Special"] as const;
export type Format = (typeof FORMATS)[number];

export interface Show {
  id: string;
  title: string;
  /** The character whose world the show belongs to; sets its colour. */
  host: CharacterId;
  /** Everyone else who appears, in billing order. */
  cast: CharacterId[];
  /** Youngest age the show is made for. Profiles hide anything above theirs. */
  ageMin: number;
  format: Format;
  year: string;
  /** One line, for cards and the banner. */
  logline: string;
  description: string;
  tags: string[];
  /** Overrides the host's motif on this show's artwork. */
  motif?: Motif;
  /** Shade of the host's colour behind the artwork. */
  tone?: "main" | "soft" | "deep";
  /** "crew" lines all six friends up instead of featuring the host. */
  art?: "crew";
  /** Movies and specials: running time, e.g. "1h 14m". */
  runtime?: string;
  /** Movies and specials: the file to play; null plays the stand-in. */
  videoUrl?: string | null;
  /** Series and minis. Its presence is what makes a show episodic. */
  seasons?: Season[];
}

export interface Row {
  id: string;
  title: string;
  showIds: string[];
}

/** One stop on the trail: an episode ("s1e3") or a movie ("feature"). */
export interface TrailStopRef {
  show: string;
  item: string;
}

/** An island on the trail, hosted by one friend, ending in a treasure chest. */
export interface TrailChapter {
  id: string;
  title: string;
  host: CharacterId;
  blurb: string;
  stops: TrailStopRef[];
}

/** Shape of data/catalog.json. */
export interface Catalog {
  version: number;
  updatedAt: string | null;
  characters: Character[];
  featuredIds: string[];
  rows: Row[];
  shows: Record<string, Show>;
  trail: TrailChapter[];
}

/** A trail stop with everything the trail page needs to draw and play it. */
export interface ResolvedStop {
  /** "showId/s1e3": unique on the trail, and what progress is stored under. */
  id: string;
  showId: string;
  showTitle: string;
  /** Progress key inside the show: "s1e3" or "feature". */
  key: string;
  /** "S1 · E3", or the format for a movie. */
  label: string;
  title: string;
  duration: string;
  host: CharacterId;
  cast: CharacterId[];
  ageMin: number;
  format: Format;
  motif?: Motif;
  tone?: Show["tone"];
  art?: Show["art"];
  videoUrl: string | null;
  /** The episode's own description, or the movie's. */
  description: string;
  /** The show's tags, for search. */
  tags: string[];
}

/** Anything that can be played: an episode, or a movie or special. */
export type Playable = ResolvedStop;

export interface ResolvedChapter extends Omit<TrailChapter, "stops"> {
  stops: ResolvedStop[];
}

/** True for a show with episodes rather than a single feature. */
export function isEpisodic(show: Show): show is Show & { seasons: Season[] } {
  return Array.isArray(show.seasons) && show.seasons.length > 0;
}

export function episodeCount(show: Show): number {
  return (show.seasons ?? []).reduce((total, season) => total + season.episodes.length, 0);
}

/** "Series · 12 episodes", "Movie · 1h 14m". */
export function formatLine(show: Show): string {
  if (isEpisodic(show)) {
    const count = episodeCount(show);
    return `${show.format} · ${count} ${count === 1 ? "episode" : "episodes"}`;
  }
  return show.runtime ? `${show.format} · ${show.runtime}` : show.format;
}

/**
 * What a card, row or search result needs to know about a show: everything
 * but the episode list, plus the counts the episode list would give. Keeps
 * the payload sent to the browser small on pages that list many shows.
 */
export type ShowLite = Omit<Show, "seasons" | "description"> & {
  meta: string;
  episodes: number;
  /** Season and episode numbers in watching order, for "continue" labels. */
  order: string[];
};

export function toLite(show: Show): ShowLite {
  const { seasons, description: _description, ...rest } = show;
  void _description;
  return {
    ...rest,
    meta: formatLine(show),
    episodes: episodeCount(show),
    order: (seasons ?? []).flatMap((season) => season.episodes.map((episode) => `s${season.number}e${episode.number}`)),
  };
}
