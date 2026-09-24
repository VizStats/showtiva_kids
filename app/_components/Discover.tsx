"use client";

// Discover: search, browsing and watching in one place.
//
// It opens full of things to watch rather than on an empty box, because a
// child who can't spell yet still wants to find something: episodes, the big
// movies, the short minis and the friends themselves, mixed together and
// shuffled each time so it never looks the same twice. Typing narrows the
// same mix.
//
// Tapping a card plays it right here, in a player set into the page, with
// "Up next" beside it: the rest of that show first, then shows like it. No
// page change, no full-screen takeover, and the way back to the cards is one
// tap.

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";

import { cx, tint } from "@/lib/cx";
import type { Character as CharacterData, CharacterId, Playable } from "@/lib/catalog-types";
import { parseFavourites, readFavouritesRaw, subscribeDevice, toggleFavourite } from "@/lib/device";
import { parseProgress, readRaw, resumeSeconds, saveProgress } from "@/lib/watch-progress";

import Character from "./Character";
import Face from "./Face";
import Icon from "./Icon";
import KidsPlayer from "./KidsPlayer";
import ShowArt, { seeded } from "./ShowArt";

interface DiscoverProps {
  characters: CharacterData[];
  library: Playable[];
  /** Favourites belong to a profile; a guest gets no heart. */
  profileId: string | null;
  onClose: () => void;
}

const TOPICS = ["Songs", "Bedtime", "Animals", "Ocean", "Science", "Dance", "Funny", "Numbers", "Movies"];
const PAGE = 24;

type Entry =
  | { kind: "play"; item: Playable }
  | { kind: "feature"; item: Playable }
  | { kind: "friend"; character: CharacterData };

const isFeature = (item: Playable) => item.format === "Movie" || item.format === "Special";
const artOf = (item: Playable) => ({ id: item.showId, host: item.host, cast: item.cast, motif: item.motif, tone: item.tone, art: item.art });

/* ----------------------------------------------------------- the mix -- */

/**
 * A shuffled mix of the whole library: a couple of episodes from every show
 * (so one long series cannot fill the page), the movies and specials as big
 * cards every so often, and a friend card now and then.
 */
function buildMix(library: Playable[], characters: CharacterData[], seed: string): Entry[] {
  const random = seeded(seed);
  const shuffle = <T,>(list: T[]) => {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };

  const byShow = new Map<string, Playable[]>();
  for (const item of library) {
    if (isFeature(item)) continue;
    byShow.set(item.showId, [...(byShow.get(item.showId) ?? []), item]);
  }
  const episodes = shuffle(
    [...byShow.values()].flatMap((list) => {
      const [first, ...rest] = list;
      return rest.length ? [first, rest[Math.floor(random() * rest.length)]] : [first];
    }),
  );
  const features = shuffle(library.filter(isFeature));
  const friends = shuffle(characters);

  const mix: Entry[] = [];
  let e = 0;
  let f = 0;
  let c = 0;
  for (let slot = 0; e < episodes.length || f < features.length; slot += 1) {
    if (slot % 9 === 2 && f < features.length) mix.push({ kind: "feature", item: features[f++] });
    else if (slot % 8 === 5 && c < friends.length) mix.push({ kind: "friend", character: friends[c++] });
    else if (e < episodes.length) mix.push({ kind: "play", item: episodes[e++] });
    else if (f < features.length) mix.push({ kind: "feature", item: features[f++] });
  }
  return mix;
}

/** Every word typed must appear somewhere in what the card is about. */
function matches(item: Playable, words: string[], characters: CharacterData[]): boolean {
  const host = characters.find((c) => c.id === item.host);
  const cast = item.cast.map((id) => characters.find((c) => c.id === id)?.name ?? "");
  const haystack = [item.title, item.showTitle, item.format, item.description, host?.name, host?.world, ...cast, ...item.tags]
    .join(" ")
    .toLowerCase();
  const plural = item.format === "Movie" ? " movies" : item.format === "Special" ? " specials movies" : "";
  return words.every((word) => (haystack + plural).includes(word.replace(/s$/, "")));
}

/** What to watch after this: the rest of the show, then its nearest neighbours. */
function upNext(current: Playable, library: Playable[]): Playable[] {
  const sameShow = library.filter((p) => p.showId === current.showId);
  const at = sameShow.findIndex((p) => p.id === current.id);
  const rest = sameShow.slice(at + 1, at + 4);

  const cast = new Set<CharacterId>([current.host, ...current.cast]);
  const tags = new Set(current.tags);
  const seen = new Set<string>([current.showId]);
  const others: { item: Playable; score: number }[] = [];
  for (const item of library) {
    if (seen.has(item.showId)) continue;
    seen.add(item.showId);
    let score = item.host === current.host ? 3 : 0;
    if (cast.has(item.host)) score += 2;
    score += item.cast.filter((id) => cast.has(id)).length * 0.5;
    score += item.tags.filter((tag) => tags.has(tag)).length;
    others.push({ item, score });
  }
  others.sort((a, b) => b.score - a.score);
  return [...rest, ...others.slice(0, 10).map((o) => o.item)];
}

/* --------------------------------------------------------- component -- */

export default function Discover({ characters, library, profileId, onClose }: DiscoverProps) {
  const [query, setQuery] = useState("");
  const [count, setCount] = useState(PAGE);
  const [watching, setWatching] = useState<{ item: Playable; session: number } | null>(null);
  const [nowKey, setNowKey] = useState<string | null>(null);
  // A new shuffle every time Discover opens. Only ever rendered in the
  // browser (it opens on a tap), so the random seed cannot mismatch.
  const [seed] = useState(() => String(Math.random()));
  const scroller = useRef<HTMLDivElement | null>(null);

  const find = (id: string) => characters.find((c) => c.id === id) ?? characters[0];
  const mix = useMemo(() => buildMix(library, characters, seed), [library, characters, seed]);

  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const results = useMemo(() => {
    if (!words.length) return [];
    return library
      .filter((item) => matches(item, words, characters))
      .sort((a, b) => Number(isFeature(b)) - Number(isFeature(a)))
      .slice(0, 60);
    // `words` is derived from `query`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, library, characters]);
  const friendHits = words.length
    ? characters.filter((c) => words.some((w) => c.name.toLowerCase().startsWith(w) || c.world.toLowerCase().includes(w)))
    : [];

  const play = (item: Playable) => {
    setWatching((w) => ({ item, session: (w?.session ?? 0) + 1 }));
    setNowKey(null);
    scroller.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  // The item on screen follows the player when it moves on to the next episode.
  const current = watching
    ? (library.find((p) => p.showId === watching.item.showId && p.key === (nowKey ?? watching.item.key)) ?? watching.item)
    : null;

  return (
    <div className="fixed inset-0 z-[60] flex animate-fade flex-col bg-canvas" role="dialog" aria-modal="true" aria-label="Discover">
      {/* ---- search bar ---- */}
      <div className="border-b border-line bg-canvas/90 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1320px] items-center gap-3 px-6 py-4 max-[640px]:px-4">
          {watching && (
            <button
              type="button"
              onClick={() => setWatching(null)}
              aria-label="Back to results"
              className="grid size-14 flex-none cursor-pointer place-items-center rounded-full bg-paper text-ink shadow-soft ring-1 ring-line transition-transform hover:scale-105 max-[640px]:size-12"
            >
              <Icon name="back" className="size-6" />
            </button>
          )}
          <label className="flex h-14 min-w-0 flex-1 items-center gap-3 rounded-full bg-paper px-5 shadow-soft ring-2 ring-line focus-within:ring-ink max-[640px]:h-12 max-[640px]:px-4">
            <Icon name="search" className="size-6 flex-none text-ink-soft" />
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setCount(PAGE);
                if (watching) setWatching(null);
              }}
              placeholder="Search shows, friends and songs"
              className="h-full min-w-0 flex-1 bg-transparent font-display text-[1.25rem] font-medium outline-none placeholder:text-ink-faint"
              aria-label="Search"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear"
                className="grid size-9 cursor-pointer place-items-center rounded-full bg-mist text-ink-soft"
              >
                <Icon name="close" className="size-4" />
              </button>
            )}
          </label>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-14 flex-none cursor-pointer place-items-center rounded-full px-5 text-[1rem] font-semibold text-ink-soft transition-colors hover:bg-mist hover:text-ink max-[640px]:size-12 max-[640px]:bg-paper max-[640px]:px-0 max-[640px]:shadow-soft max-[640px]:ring-1 max-[640px]:ring-line"
          >
            <span className="max-[640px]:hidden">Close</span>
            <Icon name="close" className="hidden size-5 max-[640px]:block" />
          </button>
        </div>
      </div>

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1320px] px-6 pt-6 pb-20 max-[640px]:px-4">
          {current && watching ? (
            <WatchView
              key={watching.session}
              current={current}
              opened={watching.item}
              library={library}
              characters={characters}
              profileId={profileId}
              onPlay={play}
              onItemChange={setNowKey}
              onBack={() => setWatching(null)}
            />
          ) : words.length === 0 ? (
            <>
              <div className="flex flex-wrap items-center gap-2.5">
                {characters.map((character) => (
                  <button
                    key={character.id}
                    type="button"
                    onClick={() => setQuery(character.name)}
                    style={tint(character)}
                    className="flex cursor-pointer items-center gap-2 rounded-full bg-(--c-soft) py-1 pr-4 pl-1 transition-transform hover:-translate-y-0.5"
                  >
                    <Face character={character} plain className="size-9" />
                    <span className="font-display text-[1.02rem] font-medium text-(--c-deep)">{character.name}</span>
                  </button>
                ))}
                <span className="mx-1 h-7 w-px bg-line max-[640px]:hidden" />
                {TOPICS.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => setQuery(topic)}
                    className="h-11 cursor-pointer rounded-full bg-paper px-4 text-[0.95rem] font-semibold shadow-soft ring-1 ring-line transition-transform hover:-translate-y-0.5"
                  >
                    {topic}
                  </button>
                ))}
              </div>

              <h2 className="mt-8 font-display text-[clamp(1.5rem,2.6vw,2rem)] font-medium">Discover</h2>
              <Grid>
                {mix.slice(0, count).map((entry) =>
                  entry.kind === "friend" ? (
                    <FriendCard
                      key={`friend-${entry.character.id}`}
                      character={entry.character}
                      count={library.filter((p) => p.host === entry.character.id).length}
                      onPick={() => setQuery(entry.character.name)}
                    />
                  ) : entry.kind === "feature" ? (
                    <FeatureCard key={entry.item.id} item={entry.item} characters={characters} onPlay={play} />
                  ) : (
                    <PlayCard key={entry.item.id} item={entry.item} characters={characters} onPlay={play} />
                  ),
                )}
              </Grid>
              {count < mix.length && (
                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setCount((n) => n + PAGE)}
                    className="h-14 cursor-pointer rounded-full bg-ink px-8 text-[1rem] font-semibold text-white transition-transform hover:-translate-y-0.5"
                  >
                    Show me more
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {friendHits.length > 0 && (
                <div className="mb-6 flex flex-wrap gap-3">
                  {friendHits.map((character) => (
                    <span
                      key={character.id}
                      style={tint(character)}
                      className="flex items-center gap-3 rounded-full bg-(--c-soft) py-1.5 pr-5 pl-1.5"
                    >
                      <Face character={character} plain className="size-11" />
                      <span className="font-display text-[1.1rem] font-medium text-(--c-deep)">
                        {character.name}&apos;s {character.world}
                      </span>
                    </span>
                  ))}
                </div>
              )}
              {results.length ? (
                <>
                  <p className="text-[0.95rem] font-semibold text-ink-soft">
                    {results.length} {results.length === 1 ? "thing" : "things"} to watch for &ldquo;{query.trim()}&rdquo;
                  </p>
                  <Grid>
                    {results.map((item) =>
                      isFeature(item) ? (
                        <FeatureCard key={item.id} item={item} characters={characters} onPlay={play} />
                      ) : (
                        <PlayCard key={item.id} item={item} characters={characters} onPlay={play} />
                      ),
                    )}
                  </Grid>
                </>
              ) : (
                <div className="flex flex-col items-center py-12 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={find("cog").image} alt="" className="h-40 w-auto animate-sway" style={{ aspectRatio: find("cog").aspect }} />
                  <p className="mt-5 font-display text-[1.45rem] font-medium">Hmm, nothing called &ldquo;{query.trim()}&rdquo; yet.</p>
                  <p className="mt-2 max-w-[22rem] text-[0.98rem] text-ink-soft">Try a friend&apos;s name, or a word like songs or animals.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- cards -- */

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 grid grid-flow-dense grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-x-5 gap-y-7 max-[560px]:grid-cols-1">
      {children}
    </div>
  );
}

function PlayCard({ item, characters, onPlay }: { item: Playable; characters: CharacterData[]; onPlay: (item: Playable) => void }) {
  const host = characters.find((c) => c.id === item.host) ?? characters[0];
  const mini = item.format === "Minis";
  return (
    <button
      type="button"
      onClick={() => onPlay(item)}
      className="group block w-full animate-fade-up cursor-pointer rounded-card text-left outline-offset-4 [content-visibility:auto]"
    >
      <ShowArt
        show={artOf(item)}
        characters={characters}
        seed={item.key}
        className="aspect-[16/10] rounded-card transition-transform duration-300 ease-out-soft group-hover:-translate-y-1 [&_[data-host]]:group-hover:-translate-y-[5%]"
      >
        <span className="absolute right-3 bottom-3 rounded-full bg-ink/60 px-2 py-0.5 text-[0.75rem] font-bold text-white backdrop-blur">
          {item.duration}
        </span>
        <span className="absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <span className="grid size-14 place-items-center rounded-full bg-paper/95 text-ink shadow-lift">
            <Icon name="play" className="size-6 translate-x-0.5" />
          </span>
        </span>
      </ShowArt>
      <span className="mt-3 flex items-start gap-2.5 px-1">
        <Face character={host} className="mt-0.5 size-8 flex-none" />
        <span className="min-w-0">
          <span className="block truncate font-display text-[1.08rem] leading-tight font-medium">{item.title}</span>
          <span className="mt-0.5 block truncate text-[0.85rem] font-medium text-ink-faint">
            {item.showTitle} · {mini ? "Mini" : item.label.replace(" · ", " ")}
          </span>
        </span>
      </span>
    </button>
  );
}

/** Movies and specials: a big card, two columns by two rows, title on the art. */
function FeatureCard({ item, characters, onPlay }: { item: Playable; characters: CharacterData[]; onPlay: (item: Playable) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPlay(item)}
      className="group col-span-2 row-span-2 block min-h-[340px] w-full animate-fade-up cursor-pointer rounded-panel text-left outline-offset-4 max-[560px]:col-span-1 max-[560px]:row-span-1 max-[560px]:min-h-[300px]"
    >
      <ShowArt
        show={artOf(item)}
        characters={characters}
        tone="deep"
        className="h-full min-h-[inherit] rounded-panel transition-transform duration-300 ease-out-soft group-hover:-translate-y-1 [&_[data-host]]:group-hover:-translate-y-[4%]"
      >
        <span className="absolute top-6 left-6 max-w-[58%] text-(--c-on)">
          <span className="flex items-center gap-1.5 text-[0.75rem] font-bold tracking-[0.12em] uppercase opacity-80">
            <Icon name="film" className="size-4" />
            {item.format} · {item.duration}
          </span>
          <span className="mt-2 block font-display text-[clamp(1.5rem,2.6vw,2.2rem)] leading-[1.02] font-medium text-balance">
            {item.title}
          </span>
        </span>
        <span className="absolute bottom-6 left-6">
          <span className="inline-flex h-12 items-center gap-2.5 rounded-full bg-paper pr-6 pl-1.5 text-[0.98rem] font-bold text-ink transition-transform group-hover:translate-x-0.5">
            <span className="grid size-9 place-items-center rounded-full bg-(--c) text-(--c-on)">
              <Icon name="play" className="size-4 translate-x-px" />
            </span>
            Watch now
          </span>
        </span>
      </ShowArt>
    </button>
  );
}

function FriendCard({ character, count, onPick }: { character: CharacterData; count: number; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      style={tint(character)}
      className="group relative flex aspect-[16/10] w-full animate-fade-up cursor-pointer flex-col justify-end overflow-hidden rounded-card bg-(--c-soft) p-5 text-left outline-offset-4 transition-transform duration-300 ease-out-soft hover:-translate-y-1 max-[560px]:aspect-[16/9]"
    >
      <span className="pointer-events-none absolute right-2 bottom-[-12%] h-[112%]">
        <Character
          character={character}
          decorative
          className="h-full origin-bottom transition-transform duration-500 ease-spring group-hover:-translate-y-2 group-hover:-rotate-3"
        />
      </span>
      <span className="relative text-[0.75rem] font-extrabold tracking-[0.12em] text-(--c-deep) uppercase">{character.world}</span>
      <span className="relative mt-1 font-display text-[1.45rem] leading-tight font-medium text-(--c-deep)">
        Watch with {character.name}
      </span>
      <span className="relative mt-1 text-[0.88rem] font-semibold text-ink-soft">{count} things to watch</span>
    </button>
  );
}

/* --------------------------------------------------------- watch view -- */

function WatchView({
  current,
  opened,
  library,
  characters,
  profileId,
  onPlay,
  onItemChange,
  onBack,
}: {
  current: Playable;
  /** What was tapped: the player opens on it and keeps its episode list. */
  opened: Playable;
  library: Playable[];
  characters: CharacterData[];
  profileId: string | null;
  onPlay: (item: Playable) => void;
  onItemChange: (key: string) => void;
  onBack: () => void;
}) {
  const find = (id: string) => characters.find((c) => c.id === id) ?? characters[0];
  const host = find(current.host);
  const people = [current.host, ...current.cast].map(find);

  // The player is handed the whole show, so it can carry on to the next
  // episode by itself; the page follows along through onItemChange.
  const [episodes] = useState(() => library.filter((p) => p.showId === opened.showId));
  const [resumeAt] = useState(() => resumeSeconds(parseProgress(readRaw(opened.showId))?.items[opened.key]));
  const recommendations = useMemo(() => upNext(current, library), [current, library]);

  const favRaw = useSyncExternalStore(subscribeDevice, () => readFavouritesRaw(profileId), () => "[]");
  const saved = parseFavourites(favRaw).includes(current.showId);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(300px,380px)] items-start gap-8 max-[1024px]:grid-cols-1">
      <section style={tint(host)}>
        <KidsPlayer
          inline
          showId={opened.showId}
          showTitle={opened.showTitle}
          host={find(opened.host)}
          items={episodes.map((p) => ({ key: p.key, label: p.label, title: p.title, videoUrl: p.videoUrl }))}
          startKey={opened.key}
          resumeAt={resumeAt}
          onProgress={(key, t, d) => saveProgress(opened.showId, key, t, d)}
          onItemChange={onItemChange}
          onClose={onBack}
        />

        <div className="mt-5 px-1">
          <p className="text-[0.8rem] font-extrabold tracking-[0.1em] text-(--c-deep) uppercase">
            {current.showTitle} · {current.label} · {current.duration}
          </p>
          <h2 className="mt-1 font-display text-[clamp(1.6rem,3vw,2.3rem)] leading-tight font-medium">{current.title}</h2>
          <p className="mt-2 max-w-[46rem] text-[1.02rem] leading-relaxed text-ink-soft">{current.description}</p>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {people.map((character, i) => (
              <span
                key={`${character.id}-${i}`}
                style={tint(character)}
                className="flex items-center gap-2 rounded-full bg-(--c-soft) py-1 pr-4 pl-1"
              >
                <Face character={character} plain className="size-9" />
                <span className="font-display text-[1rem] font-medium text-(--c-deep)">{character.name}</span>
              </span>
            ))}
            <span className="flex-1" />
            {profileId && (
              <button
                type="button"
                onClick={() => toggleFavourite(profileId, current.showId)}
                aria-pressed={saved}
                className={cx(
                  "inline-flex h-12 cursor-pointer items-center gap-2 rounded-full px-5 text-[0.95rem] font-bold transition-colors",
                  saved ? "bg-[#ffe3ec] text-berry" : "bg-paper text-ink shadow-soft ring-1 ring-line hover:bg-mist",
                )}
              >
                <Icon name={saved ? "heart-filled" : "heart"} className="size-5" />
                {saved ? "In favourites" : "Favourite"}
              </button>
            )}
            <Link
              href={`/watch/${current.showId}`}
              className="inline-flex h-12 items-center gap-1.5 rounded-full bg-paper px-5 text-[0.95rem] font-bold text-ink shadow-soft ring-1 ring-line transition-colors hover:bg-mist"
            >
              All episodes
              <Icon name="chevron-right" className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <aside className="rounded-panel bg-paper p-4 ring-1 ring-line">
        <h3 className="px-2 pt-1 font-display text-[1.35rem] font-medium">Up next</h3>
        <ul className="mt-3 flex flex-col gap-1">
          {recommendations.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onPlay(item)}
                className="group grid w-full cursor-pointer grid-cols-[148px_minmax(0,1fr)] items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-mist max-[400px]:grid-cols-[120px_minmax(0,1fr)]"
              >
                <ShowArt show={artOf(item)} characters={characters} seed={item.key} className="aspect-[16/10] rounded-xl">
                  <span className="absolute right-1.5 bottom-1.5 rounded-full bg-ink/75 px-2 py-0.5 text-[0.7rem] font-bold text-white">
                    {item.duration}
                  </span>
                </ShowArt>
                <span className="min-w-0">
                  <span className="line-clamp-2 font-display text-[1rem] leading-tight font-medium">{item.title}</span>
                  <span className="mt-1 block truncate text-[0.82rem] font-medium text-ink-soft">
                    {item.showId === current.showId ? item.label : item.showTitle}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
