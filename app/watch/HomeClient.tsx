"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";

import { cx, tint } from "@/lib/cx";
import type { Character as CharacterData, CharacterId, ResolvedChapter, ShowLite } from "@/lib/catalog-types";
import type { Profile } from "@/lib/profiles";
import { useClock } from "@/lib/use-client";
import { fractionWatched, parseAll, readAllRaw, subscribeProgress } from "@/lib/watch-progress";

import Character from "../_components/Character";
import Face from "../_components/Face";
import Icon from "../_components/Icon";
import Row, { ROW_CARD } from "../_components/Row";
import ShowArt, { Trio } from "../_components/ShowArt";
import ShowCard from "../_components/ShowCard";
import TrailTeaser from "./TrailTeaser";

export interface HomeRow {
  id: string;
  title: string;
  host?: CharacterId;
  seeAll?: string;
  shows: ShowLite[];
}

interface HomeClientProps {
  characters: CharacterData[];
  featured: ShowLite[];
  rows: HomeRow[];
  shows: ShowLite[];
  /** Null when nobody has picked a profile yet: everything shows. */
  profile: Profile | null;
  trail: ResolvedChapter[];
  /** The profile's buddy, who guides the trail; Bloop for a guest. */
  buddy: CharacterData;
}

export default function HomeClient({ characters, featured, rows, shows, profile, trail, buddy }: HomeClientProps) {
  const byId = (id: CharacterId) => characters.find((c) => c.id === id);

  return (
    <main className="pb-16">
      {profile ? <Greeting profile={profile} buddy={byId(profile.character)} /> : <SetUpPrompt characters={characters} />}
      {featured.length > 0 && <Hero shows={featured} characters={characters} />}
      <TrailTeaser chapters={trail} buddy={buddy} profileId={profile?.id ?? "guest"} />
      <FriendsRail characters={characters} />
      <KeepWatching shows={shows} characters={characters} />
      {rows.map((row) => (
        <Row key={row.id} title={row.title} host={row.host ? byId(row.host) : undefined} seeAll={row.seeAll}>
          {row.shows.map((show) => (
            <ShowCard key={show.id} show={show} characters={characters} className={ROW_CARD} />
          ))}
        </Row>
      ))}
    </main>
  );
}

/* ------------------------------------------------------------ greeting -- */

function Greeting({ profile, buddy }: { profile: Profile; buddy?: CharacterData }) {
  // The hour decides the words, so it is read after mount: the server's
  // clock is not the child's.
  const now = useClock(60_000);
  const hour = now === null ? null : new Date(now).getHours();
  const hello = hour === null ? "Hi" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="mx-auto flex max-w-[1320px] items-end justify-between gap-4 px-6 pt-5 max-[640px]:px-4">
      <h1 className="font-display text-[clamp(1.6rem,3vw,2.2rem)] leading-tight font-medium">
        {hello}, <span style={buddy ? { color: buddy.deep } : undefined}>{profile.name}</span>!
      </h1>
    </div>
  );
}

/**
 * Shown instead of the greeting when no profile is picked. The catalog is
 * already open behind it; this only offers the age filter, it does not stand
 * in the way.
 */
function SetUpPrompt({ characters }: { characters: CharacterData[] }) {
  const trio = ["kai", "bloop", "nova"]
    .map((id) => characters.find((c) => c.id === id))
    .filter((c): c is CharacterData => Boolean(c));

  return (
    <div className="mx-auto max-w-[1320px] px-6 pt-5 max-[640px]:px-4">
      <div className="flex items-center justify-between gap-4 rounded-panel bg-mist py-3 pr-3 pl-4 max-[640px]:gap-3 max-[640px]:py-2.5 max-[640px]:pl-3">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex flex-none -space-x-3 max-[400px]:hidden">
            {trio.map((character) => (
              <Face key={character.id} character={character} plain className="size-11 ring-3 ring-mist" />
            ))}
          </span>
          <p className="min-w-0 text-[0.98rem] leading-snug text-ink-soft">
            <strong className="block font-display text-[1.15rem] font-medium text-ink">Who&apos;s watching?</strong>
            <span className="max-[640px]:hidden">Set up a profile so we only show shows made for their age.</span>
          </p>
        </div>
        <Link
          href="/profiles"
          className="inline-flex h-12 flex-none items-center rounded-full bg-ink px-5 text-[0.95rem] font-semibold text-white transition-transform hover:-translate-y-px max-[640px]:h-10 max-[640px]:px-4 max-[640px]:text-[0.88rem]"
        >
          <span className="max-[640px]:hidden">Set up a profile</span>
          <span className="hidden max-[640px]:inline">Set up</span>
        </Link>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- hero -- */

const HERO_MS = 8000;

function Hero({ shows, characters }: { shows: ShowLite[]; characters: CharacterData[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const show = shows[index];
  const host = characters.find((c) => c.id === show.host) ?? characters[0];
  const timer = useRef<number | null>(null);
  const touchX = useRef<number | null>(null);

  const step = (direction: 1 | -1) => setIndex((i) => (i + direction + shows.length) % shows.length);

  useEffect(() => {
    if (paused || shows.length < 2) return;
    timer.current = window.setTimeout(() => setIndex((i) => (i + 1) % shows.length), HERO_MS);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [index, paused, shows.length]);

  const crew = show.art === "crew";

  return (
    <section
      className="mx-auto max-w-[1320px] px-6 pt-[clamp(3.5rem,6vw,5.5rem)] max-[640px]:px-4"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      // A swipe across the banner moves it on, the way a phone expects.
      onTouchStart={(event) => {
        touchX.current = event.touches[0].clientX;
      }}
      onTouchEnd={(event) => {
        if (touchX.current === null) return;
        const dx = event.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
      }}
      aria-roledescription="carousel"
      aria-label="Featured shows"
    >
      <div className="relative h-[clamp(360px,40vw,470px)] max-[700px]:h-[540px]" style={tint(host)}>
        {/* Every slide's ground is mounted, and they cross-fade. */}
        {shows.map((s, i) => (
          <div
            key={s.id}
            aria-hidden={i !== index}
            className={cx(
              "absolute inset-0 transition-opacity duration-700 ease-out-soft",
              i === index ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            <ShowArt show={s} characters={characters} bare tone="deep" className="h-full rounded-stage" />
          </div>
        ))}

        {/* The characters stand in front of the card and break out of its
            top edge. Keyed on the show so they rise in fresh each time. */}
        {crew ? (
          <Trio
            key={show.id}
            show={show}
            characters={characters}
            seed={show.id}
            rise
            className="absolute right-[1%] bottom-0 h-[112%] w-[54%] [clip-path:inset(-50%_-50%_0_-50%)] max-[700px]:top-[-34px] max-[700px]:right-0 max-[700px]:bottom-auto max-[700px]:h-[54%] max-[700px]:w-full"
          />
        ) : (
          <div
            key={show.id}
            aria-hidden
            className="pointer-events-none absolute right-[6%] bottom-0 flex h-[118%] items-end [clip-path:inset(-50%_-50%_0_-50%)] max-[700px]:top-[-44px] max-[700px]:right-1/2 max-[700px]:bottom-auto max-[700px]:h-[58%] max-[700px]:translate-x-1/2"
          >
            <span className="h-full animate-rise">
              <Character character={host} decorative priority className="h-full animate-bob [animation-delay:0.9s]" />
            </span>
          </div>
        )}

        {/* The words. */}
        <div
          className={cx(
            "absolute inset-y-0 left-0 flex flex-col justify-center pl-[clamp(1.75rem,4.5vw,4rem)] text-(--c-on)",
            crew ? "w-[46%]" : "w-[54%]",
            "max-[700px]:inset-x-0 max-[700px]:top-auto max-[700px]:bottom-0 max-[700px]:w-full max-[700px]:justify-end max-[700px]:px-5 max-[700px]:pb-6",
          )}
        >
          <div key={show.id} className="animate-fade-up">
            <p className="text-[0.78rem] font-bold tracking-[0.12em] uppercase opacity-75">
              {show.format} · Ages {show.ageMin}+
            </p>
            <h2 className="mt-3 font-display text-[clamp(2.2rem,4.6vw,3.8rem)] leading-[0.98] font-medium text-balance">
              {show.title}
            </h2>
            <p className="mt-3 max-w-[26rem] text-[clamp(1rem,1.3vw,1.1rem)] leading-relaxed font-medium opacity-85">{show.logline}</p>
          </div>
          <div className="mt-7 flex items-center gap-3 max-[700px]:mt-5">
            <Link
              href={`/watch/${show.id}?play=1`}
              className="group inline-flex h-14 items-center gap-3 rounded-full bg-paper pr-7 pl-2 text-[1.02rem] font-bold text-ink transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <span className="grid size-10 place-items-center rounded-full bg-(--c) text-(--c-on) transition-transform duration-300 ease-spring group-hover:scale-110">
                <Icon name="play" className="size-5 translate-x-px" />
              </span>
              Play
            </Link>
            <Link
              href={`/watch/${show.id}`}
              className="inline-flex h-14 items-center rounded-full px-6 text-[1rem] font-bold ring-2 ring-current/30 transition-colors hover:bg-white/15"
            >
              More
            </Link>
          </div>
        </div>

        {/* Which slide, as small pills along the bottom edge. */}
        <div className="absolute bottom-6 left-[clamp(1.75rem,4.5vw,4rem)] flex gap-1.5 max-[700px]:hidden">
          {shows.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show ${s.title}`}
              aria-current={i === index}
              className={cx(
                "h-2.5 cursor-pointer rounded-full transition-[width,background-color] duration-500",
                i === index ? "w-8 bg-white" : "w-2.5 bg-white/45 hover:bg-white/70",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------- friends rail -- */

function FriendsRail({ characters }: { characters: CharacterData[] }) {
  return (
    <section className="mt-[clamp(2.5rem,4vw,3.5rem)]">
      <div className="mx-auto max-w-[1320px] px-6 max-[640px]:px-4">
        <h2 className="font-display text-[clamp(1.3rem,2vw,1.55rem)] leading-tight font-medium">Pick a friend</h2>
      </div>
      <ul className="no-scrollbar mx-auto flex max-w-[1320px] snap-x scroll-px-6 gap-[clamp(1rem,3vw,2.5rem)] overflow-x-auto px-6 pt-4 pb-2 max-[640px]:scroll-px-4 max-[640px]:px-4">
        {characters.map((character, i) => (
          <li key={character.id} className="flex-none snap-start">
            <Link href={`/friends/${character.id}`} style={tint(character)} className="group flex w-[116px] flex-col items-center rounded-3xl outline-offset-4">
              {/* The circle clips the character's feet but not its head, so
                  it looks like it is climbing out. */}
              <span className="relative block size-[108px] pt-[48px]">
                <span className="absolute inset-x-0 bottom-0 block size-[108px] rounded-full bg-(--c-soft) transition-colors duration-300 group-hover:bg-(--c)/30" />
                <span className="absolute inset-x-0 bottom-0 block h-[156px] [clip-path:inset(-10%_0_0_0_round_0_0_999px_999px)]">
                  <span className="block h-full animate-bob" style={{ animationDelay: `${i * 0.4}s` }}>
                    <Character
                      character={character}
                      decorative
                      className="mx-auto h-[150px] translate-y-[18px] origin-bottom transition-transform duration-500 ease-spring group-hover:translate-y-[6px] group-hover:-rotate-3"
                    />
                  </span>
                </span>
              </span>
              <span className="mt-3 font-display text-[1.1rem] leading-none font-medium">{character.name}</span>
              <span className="mt-1 text-[0.8rem] font-semibold text-ink-faint">{character.world}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* -------------------------------------------------------- keep watching -- */

function KeepWatching({ shows, characters }: { shows: ShowLite[]; characters: CharacterData[] }) {
  const raw = useSyncExternalStore(subscribeProgress, readAllRaw, () => "");
  const entries = parseAll(raw)
    .map(({ showId, progress }) => {
      const show = shows.find((s) => s.id === showId);
      if (!show) return null;
      const position = progress.items[progress.last];
      const fraction = fractionWatched(position);
      const finished = fraction >= 1;
      // A finished episode points at the next one; a finished film drops out.
      let note = "Continue";
      if (progress.last !== "feature") {
        const at = show.order.indexOf(progress.last);
        const key = finished ? show.order[at + 1] : progress.last;
        if (!key) return null;
        const m = /^s(\d+)e(\d+)$/.exec(key);
        note = m ? `${finished ? "Up next" : "Continue"} · S${m[1]} E${m[2]}` : note;
      } else if (finished) {
        return null;
      }
      return { show, fraction: finished ? 0 : fraction, note };
    })
    .filter((entry): entry is { show: ShowLite; fraction: number; note: string } => entry !== null)
    .slice(0, 10);

  if (!entries.length) return null;

  return (
    <Row title="Keep watching">
      {entries.map(({ show, fraction, note }) => (
        <ShowCard key={show.id} show={show} characters={characters} progress={fraction} note={note} className={ROW_CARD} />
      ))}
    </Row>
  );
}
