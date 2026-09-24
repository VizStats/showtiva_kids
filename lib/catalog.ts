// Server-only access to the catalog store (data/catalog.json).
//
// Reads are wrapped in React's request-scoped `cache()`, so a page that asks
// for characters, shows and rows reads the file once, and an edit to the file
// shows up on the next request without a rebuild.
import "server-only";

import { cache } from "react";

import {
  CHARACTER_IDS,
  FORMATS,
  MOTIFS,
  isEpisodic,
  type Catalog,
  type Character,
  type CharacterId,
  type Playable,
  type ResolvedChapter,
  type ResolvedStop,
  type Show,
} from "./catalog-types";
import { StoreError, readJson } from "./store";

const FILE = "catalog.json";

function fail(message: string): never {
  throw new StoreError(FILE, message);
}

const isString = (value: unknown): value is string => typeof value === "string" && value.length > 0;
const isCharacterId = (value: unknown): value is CharacterId =>
  CHARACTER_IDS.includes(value as CharacterId);

/**
 * Narrow the parsed JSON to `Catalog`, naming the offending path on failure.
 * JSON.parse returns `any`, so without this a bad edit would first surface as
 * `undefined` somewhere deep inside a component.
 */
function assertCatalog(value: unknown): Catalog {
  if (typeof value !== "object" || value === null) fail("expected a top-level object");
  const c = value as Record<string, unknown>;

  if (!Array.isArray(c.characters)) fail("characters must be an array");
  for (const [i, entry] of c.characters.entries()) {
    const ch = entry as Record<string, unknown>;
    if (!isCharacterId(ch?.id)) fail(`characters[${i}].id must be one of ${CHARACTER_IDS.join(", ")}`);
    for (const field of ["name", "role", "world", "worldLine", "bio", "color", "soft", "deep", "onColor", "image"]) {
      if (!isString(ch[field])) fail(`characters[${i}].${field} must be a non-empty string`);
    }
    if (typeof ch.aspect !== "number" || ch.aspect <= 0) fail(`characters[${i}].aspect must be a positive number`);
    if (!MOTIFS.includes(ch.motif as never)) fail(`characters[${i}].motif is not a known motif`);
    const face = ch.face as Record<string, unknown> | undefined;
    if (!face || ["x", "y", "size"].some((k) => typeof face[k] !== "number")) {
      fail(`characters[${i}].face needs numeric x, y and size`);
    }
    for (const field of ["likes", "quotes"]) {
      if (!Array.isArray(ch[field]) || !(ch[field] as unknown[]).every(isString)) {
        fail(`characters[${i}].${field} must be an array of strings`);
      }
    }
  }

  if (typeof c.shows !== "object" || c.shows === null) fail("shows must be an object keyed by id");
  for (const [id, entry] of Object.entries(c.shows as Record<string, unknown>)) {
    const s = entry as Record<string, unknown>;
    if (s?.id !== id) fail(`shows.${id}.id must equal its key`);
    for (const field of ["title", "year", "logline", "description"]) {
      if (!isString(s[field])) fail(`shows.${id}.${field} must be a non-empty string`);
    }
    if (!isCharacterId(s.host)) fail(`shows.${id}.host must be a character id`);
    if (!Array.isArray(s.cast) || !s.cast.every(isCharacterId)) fail(`shows.${id}.cast must be character ids`);
    if (!Number.isInteger(s.ageMin)) fail(`shows.${id}.ageMin must be a whole number`);
    if (!FORMATS.includes(s.format as never)) fail(`shows.${id}.format must be one of ${FORMATS.join(", ")}`);
    if (!Array.isArray(s.tags) || !s.tags.every(isString)) fail(`shows.${id}.tags must be strings`);
    if (s.motif !== undefined && !MOTIFS.includes(s.motif as never)) fail(`shows.${id}.motif is not a known motif`);
    if (s.seasons !== undefined) {
      if (!Array.isArray(s.seasons)) fail(`shows.${id}.seasons must be an array`);
      for (const [j, season] of (s.seasons as Record<string, unknown>[]).entries()) {
        if (!Number.isInteger(season.number)) fail(`shows.${id}.seasons[${j}].number must be a whole number`);
        if (!Array.isArray(season.episodes) || season.episodes.length === 0) {
          fail(`shows.${id}.seasons[${j}].episodes must be a non-empty array`);
        }
        for (const [k, ep] of (season.episodes as Record<string, unknown>[]).entries()) {
          if (!Number.isInteger(ep.number) || !isString(ep.title) || !isString(ep.duration)) {
            fail(`shows.${id}.seasons[${j}].episodes[${k}] needs a number, title and duration`);
          }
        }
      }
    }
  }

  const shows = c.shows as Record<string, unknown>;
  const known = (showId: unknown) => typeof showId === "string" && Object.hasOwn(shows, showId);

  if (!Array.isArray(c.trail)) fail("trail must be an array");
  for (const [i, entry] of (c.trail as Record<string, unknown>[]).entries()) {
    for (const field of ["id", "title", "blurb"]) {
      if (!isString(entry[field])) fail(`trail[${i}].${field} must be a non-empty string`);
    }
    if (!isCharacterId(entry.host)) fail(`trail[${i}].host must be a character id`);
    if (!Array.isArray(entry.stops) || entry.stops.length === 0) fail(`trail[${i}].stops must be a non-empty array`);
    for (const [j, stop] of (entry.stops as Record<string, unknown>[]).entries()) {
      if (!known(stop.show)) fail(`trail[${i}].stops[${j}].show must reference a show`);
      if (!findItem(shows[stop.show as string] as Show, stop.item)) {
        fail(`trail[${i}].stops[${j}].item "${String(stop.item)}" is not in ${String(stop.show)}`);
      }
    }
  }
  if (!Array.isArray(c.featuredIds) || !c.featuredIds.every(known)) fail("featuredIds must reference shows");
  if (!Array.isArray(c.rows)) fail("rows must be an array");
  for (const [i, row] of (c.rows as Record<string, unknown>[]).entries()) {
    if (!isString(row.id) || !isString(row.title)) fail(`rows[${i}] needs an id and a title`);
    if (!Array.isArray(row.showIds) || !row.showIds.every(known)) fail(`rows[${i}].showIds must reference shows`);
  }

  return value as Catalog;
}

export const getCatalog = cache(async (): Promise<Catalog> => readJson(FILE, assertCatalog));

interface FoundItem {
  title: string;
  duration: string;
  videoUrl: string | null;
  label: string;
  description: string;
}

/** The episode (or the movie itself) an item key names, if the show has it. */
function findItem(show: Show, item: unknown): FoundItem | null {
  if (typeof item !== "string") return null;
  if (item === "feature") {
    return isEpisodic(show)
      ? null
      : {
          title: show.title,
          duration: show.runtime ?? "",
          videoUrl: show.videoUrl ?? null,
          label: show.format,
          description: show.description,
        };
  }
  const m = /^s(\d+)e(\d+)$/.exec(item);
  if (!m) return null;
  const season = show.seasons?.find((s) => s.number === Number(m[1]));
  const episode = season?.episodes.find((e) => e.number === Number(m[2]));
  return episode
    ? {
        title: episode.title,
        duration: episode.duration,
        videoUrl: episode.videoUrl,
        label: `S${m[1]} · E${m[2]}`,
        description: episode.description,
      }
    : null;
}

function toPlayable(show: Show, key: string, item: FoundItem): Playable {
  return {
    id: `${show.id}/${key}`,
    showId: show.id,
    showTitle: show.title,
    key,
    label: item.label,
    title: item.title,
    duration: item.duration,
    host: show.host,
    cast: show.cast,
    ageMin: show.ageMin,
    format: show.format,
    motif: show.motif,
    tone: show.tone,
    art: show.art,
    videoUrl: item.videoUrl,
    description: item.description,
    tags: show.tags,
  };
}

/**
 * Everything this viewer may play, one entry per episode and per movie, in
 * catalog order. What Discover searches, and where it finds "up next".
 */
export function libraryFor(catalog: Catalog, maxAge: number): Playable[] {
  return showsFor(catalog, maxAge).flatMap((show): Playable[] => {
    if (!isEpisodic(show)) {
      const item = findItem(show, "feature");
      return item ? [toPlayable(show, "feature", item)] : [];
    }
    return show.seasons.flatMap((season) =>
      season.episodes.map((episode) => {
        const key = `s${season.number}e${episode.number}`;
        return toPlayable(show, key, findItem(show, key)!);
      }),
    );
  });
}

/**
 * The trail as this viewer sees it: stops above their age are left out, and
 * an island with nothing left on it is left out with them, so a younger
 * child's trail is shorter rather than full of locks they can never open.
 */
export function trailFor(catalog: Catalog, maxAge: number): ResolvedChapter[] {
  return catalog.trail
    .map((chapter) => ({
      ...chapter,
      stops: chapter.stops.flatMap((ref): ResolvedStop[] => {
        const show = lookupShow(catalog, ref.show);
        const item = show && findItem(show, ref.item);
        if (!show || !item || show.ageMin > maxAge) return [];
        return [toPlayable(show, ref.item, item)];
      }),
    }))
    .filter((chapter) => chapter.stops.length > 0);
}

/** Own-property lookup, so ids like "constructor" are a 404 and not a crash. */
export function lookupShow(catalog: Catalog, id: string): Show | undefined {
  return Object.hasOwn(catalog.shows, id) ? catalog.shows[id] : undefined;
}

export function lookupCharacter(catalog: Catalog, id: string): Character | undefined {
  return catalog.characters.find((character) => character.id === id);
}

/** Every show a viewer of this age may see, in catalog order. */
export function showsFor(catalog: Catalog, maxAge: number): Show[] {
  return Object.values(catalog.shows).filter((show) => show.ageMin <= maxAge);
}

/**
 * Shows that share the most with this one: the same host first, then shared
 * cast and tags. Deterministic, so the list does not reshuffle per request.
 */
export function relatedShows(catalog: Catalog, show: Show, maxAge: number, count = 10): Show[] {
  const tags = new Set(show.tags);
  const cast = new Set([show.host, ...show.cast]);

  return showsFor(catalog, maxAge)
    .filter((other) => other.id !== show.id)
    .map((other) => {
      let score = other.host === show.host ? 4 : 0;
      if (cast.has(other.host)) score += 2;
      score += other.cast.filter((id) => cast.has(id)).length * 0.5;
      score += other.tags.filter((tag) => tags.has(tag)).length;
      return { other, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map(({ other }) => other);
}
