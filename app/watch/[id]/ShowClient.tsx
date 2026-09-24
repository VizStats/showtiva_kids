"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { cx, tint } from "@/lib/cx";
import { isEpisodic, type Character as CharacterData, type Show, type ShowLite } from "@/lib/catalog-types";
import { parseFavourites, readFavouritesRaw, subscribeDevice, toggleFavourite } from "@/lib/device";
import {
  fractionWatched,
  parsePick,
  parseProgress,
  progressKey,
  readRaw,
  resumeSeconds,
  saveProgress,
  subscribeProgress,
} from "@/lib/watch-progress";

import Character from "../../_components/Character";
import Face from "../../_components/Face";
import Icon from "../../_components/Icon";
import KidsPlayer, { type PlayerItem } from "../../_components/KidsPlayer";
import Row, { ROW_CARD } from "../../_components/Row";
import ShowArt, { Trio } from "../../_components/ShowArt";
import ShowCard from "../../_components/ShowCard";

interface ShowClientProps {
  show: Show;
  characters: CharacterData[];
  sameHost: ShowLite[];
  related: ShowLite[];
  profileId: string | null;
  autoplay: boolean;
}

export default function ShowClient({ show, characters, sameHost, related, profileId, autoplay }: ShowClientProps) {
  const router = useRouter();
  const find = (id: string) => characters.find((c) => c.id === id);
  const host = find(show.host) ?? characters[0];
  const cast = [host, ...show.cast.map(find)].filter((c): c is CharacterData => Boolean(c));
  const episodic = isEpisodic(show);

  // Everything playable, in watching order.
  const items: PlayerItem[] = useMemo(
    () =>
      episodic
        ? show.seasons!.flatMap((season) =>
            season.episodes.map((episode) => ({
              key: progressKey({ season: season.number, episode: episode.number }),
              label: `S${season.number} · E${episode.number}`,
              title: episode.title,
              videoUrl: episode.videoUrl,
            })),
          )
        : [{ key: "feature", label: show.format, title: show.title, videoUrl: show.videoUrl ?? null }],
    [show, episodic],
  );

  /* -------------------------------------------------------- progress -- */

  const raw = useSyncExternalStore(subscribeProgress, () => readRaw(show.id), () => null);
  const progress = parseProgress(raw);

  // Where Play should go: the last thing played if it is unfinished,
  // otherwise the thing after it, otherwise the very start.
  const resume = useMemo(() => {
    const first = { key: items[0].key, at: 0, state: "start" as const };
    if (!progress || !parsePick(progress.last)) return first;
    const at = items.findIndex((item) => item.key === progress.last);
    if (at === -1) return first;
    const position = progress.items[progress.last];
    if (fractionWatched(position) < 1) {
      const seconds = resumeSeconds(position);
      return { key: items[at].key, at: seconds, state: seconds ? ("resume" as const) : ("start" as const) };
    }
    const next = items[at + 1];
    return next ? { key: next.key, at: 0, state: "next" as const } : first;
  }, [progress, items]);

  /* ---------------------------------------------------------- player -- */

  const [chosen, setChosen] = useState<{ key: string; at: number } | null>(null);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  // Play on the home banner lands here with ?play=1, and the theatre opens
  // straight away at wherever this device left off.
  const [arrivedToPlay, setArrivedToPlay] = useState(autoplay);
  const player = chosen ?? (arrivedToPlay ? { key: resume.key, at: resume.at } : null);

  const open = (key: string, at = 0) => setChosen({ key, at });
  const onProgress = useCallback((key: string, t: number, d: number) => saveProgress(show.id, key, t, d), [show.id]);
  const onClose = () => {
    setChosen(null);
    setNowPlaying(null);
    if (arrivedToPlay) {
      setArrivedToPlay(false);
      // Drop the flag, so a refresh does not open the theatre again.
      router.replace(`/watch/${show.id}`, { scroll: false });
    }
  };

  /* ------------------------------------------------------- favourites -- */

  const favRaw = useSyncExternalStore(subscribeDevice, () => readFavouritesRaw(profileId), () => "[]");
  const saved = parseFavourites(favRaw).includes(show.id);

  /* ---------------------------------------------------------- seasons -- */

  const [seasonNumber, setSeasonNumber] = useState(() => {
    const pick = parsePick(resume.key);
    return pick && pick !== "feature" ? pick.season : (show.seasons?.[0]?.number ?? 1);
  });
  const season = show.seasons?.find((s) => s.number === seasonNumber) ?? show.seasons?.[0];

  const playLabel =
    resume.state === "resume"
      ? `Resume ${labelFor(resume.key)}`.trim()
      : resume.state === "next"
        ? `Play ${labelFor(resume.key)}`.trim()
        : episodic
          ? "Play episode 1"
          : `Play ${show.format.toLowerCase()}`;

  return (
    <main className="pb-16">
      {/* ---- banner ---- */}
      <section className="mx-auto max-w-[1320px] px-6 pt-[clamp(3.5rem,6vw,5rem)] max-[640px]:px-4" style={tint(host)}>
        <div className="relative min-h-[clamp(420px,42vw,500px)] max-[800px]:min-h-0">
          <ShowArt show={show} characters={characters} bare tone="deep" className="absolute inset-0 rounded-stage max-[800px]:bottom-auto max-[800px]:h-[290px]" />

          {show.art === "crew" ? (
            <Trio
              show={show}
              characters={characters}
              seed={show.id}
              rise
              className="absolute right-[1%] bottom-0 h-[108%] w-[50%] [clip-path:inset(-50%_-50%_0_-50%)] max-[800px]:top-[-40px] max-[800px]:bottom-auto max-[800px]:h-[330px] max-[800px]:w-full"
            />
          ) : (
            <div
              aria-hidden
              className="pointer-events-none absolute right-[5%] bottom-0 h-[116%] [clip-path:inset(-50%_-50%_0_-50%)] max-[800px]:top-[-46px] max-[800px]:right-1/2 max-[800px]:bottom-auto max-[800px]:h-[336px] max-[800px]:translate-x-1/2"
            >
              <span className="block h-full animate-rise">
                <Character character={host} decorative priority className="h-full animate-bob [animation-delay:0.9s]" />
              </span>
            </div>
          )}

          <div className="relative z-10 flex w-[54%] flex-col justify-center py-[clamp(2rem,4vw,3rem)] pr-4 pl-[clamp(1.75rem,4.5vw,4rem)] text-(--c-on) max-[800px]:w-full max-[800px]:px-0 max-[800px]:pt-[320px] max-[800px]:pb-0 max-[800px]:text-ink">
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? router.back() : router.push("/watch"))}
              className="mb-5 inline-flex h-11 w-fit cursor-pointer items-center gap-1.5 rounded-full bg-white/20 pr-4 pl-2.5 text-[0.9rem] font-bold backdrop-blur transition-colors hover:bg-white/30 max-[800px]:absolute max-[800px]:top-4 max-[800px]:left-4 max-[800px]:text-(--c-on)"
            >
              <Icon name="back" className="size-5" />
              Back
            </button>

            <p className="text-[0.78rem] font-bold tracking-[0.12em] uppercase opacity-75 max-[800px]:text-(--c-deep) max-[800px]:opacity-100">
              {show.format} · Ages {show.ageMin}+ · {show.year}
            </p>
            <h1 className="mt-4 font-display text-[clamp(2.2rem,4.4vw,3.7rem)] leading-[0.98] font-medium text-balance">{show.title}</h1>
            <p className="mt-4 max-w-[32rem] text-[clamp(1rem,1.25vw,1.1rem)] leading-relaxed font-medium opacity-90 max-[800px]:text-ink-soft max-[800px]:opacity-100">
              {show.description}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => open(resume.key, resume.at)}
                className="group inline-flex h-14 cursor-pointer items-center gap-3 rounded-full bg-paper pr-7 pl-2 text-[1.02rem] font-bold text-ink transition-transform hover:-translate-y-0.5 active:scale-[0.98] max-[800px]:bg-ink max-[800px]:text-white"
              >
                <span className="grid size-10 place-items-center rounded-full bg-(--c) text-(--c-on) transition-transform duration-300 ease-spring group-hover:scale-110">
                  <Icon name="play" className="size-5 translate-x-px" />
                </span>
                {playLabel}
              </button>
              {profileId && (
                <button
                  type="button"
                  onClick={() => toggleFavourite(profileId, show.id)}
                  aria-pressed={saved}
                  aria-label={saved ? "Remove from favourites" : "Add to favourites"}
                  className={cx(
                    "grid size-14 cursor-pointer place-items-center rounded-full backdrop-blur transition-[background-color,transform] active:scale-90",
                    saved ? "bg-paper text-berry" : "bg-white/20 hover:bg-white/30 max-[800px]:bg-mist max-[800px]:text-ink",
                  )}
                >
                  <Icon name={saved ? "heart-filled" : "heart"} className={cx("size-7", saved && "animate-pop")} />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ---- who's in it ---- */}
      <section className="mx-auto mt-[clamp(2.5rem,4vw,3.5rem)] max-w-[1320px] px-6 max-[640px]:px-4">
        <h2 className="font-display text-[clamp(1.35rem,2.2vw,1.7rem)] font-medium">Who&apos;s in it</h2>
        <ul className="mt-4 flex flex-wrap gap-3">
          {cast.map((character) => (
            <li key={character.id}>
              <Link
                href={`/friends/${character.id}`}
                style={tint(character)}
                className="group flex items-center gap-3 rounded-full bg-(--c-soft) py-1.5 pr-5 pl-1.5 transition-transform hover:-translate-y-0.5"
              >
                <Face character={character} plain className="size-12 transition-transform duration-300 ease-spring group-hover:rotate-[-6deg]" />
                <span>
                  <span className="block font-display text-[1.1rem] leading-none font-medium text-(--c-deep)">{character.name}</span>
                  <span className="mt-0.5 block text-[0.8rem] font-semibold text-ink-soft">{character.role}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ---- episodes ---- */}
      {episodic && season && (
        <section className="mx-auto mt-[clamp(2.5rem,4vw,3.5rem)] max-w-[1320px] px-6 max-[640px]:px-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-display text-[clamp(1.35rem,2.2vw,1.7rem)] font-medium">Episodes</h2>
            {show.seasons!.length > 1 && (
              <div className="flex gap-1 rounded-full bg-mist p-1" role="tablist" aria-label="Seasons">
                {show.seasons!.map((s) => (
                  <button
                    key={s.number}
                    type="button"
                    role="tab"
                    aria-selected={s.number === season.number}
                    onClick={() => setSeasonNumber(s.number)}
                    className={cx(
                      "h-11 cursor-pointer rounded-full px-5 text-[0.95rem] font-bold transition-colors",
                      s.number === season.number ? "bg-paper text-ink" : "text-ink-soft hover:text-ink",
                    )}
                  >
                    Season {s.number}
                  </button>
                ))}
              </div>
            )}
          </div>

          <ol key={season.number} className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-x-5 gap-y-7">
            {season.episodes.map((episode, i) => {
              const key = progressKey({ season: season.number, episode: episode.number });
              const watched = fractionWatched(progress?.items[key]);
              const current = nowPlaying === key;
              return (
                <li key={key} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 0.04}s` }}>
                  <button
                    type="button"
                    onClick={() => open(key, resumeSeconds(progress?.items[key]))}
                    className="group block w-full cursor-pointer rounded-card text-left outline-offset-4"
                  >
                    <ShowArt
                      show={show}
                      characters={characters}
                      seed={key}
                      className="aspect-[16/10] rounded-card transition-transform duration-300 ease-out-soft group-hover:-translate-y-1 [&_[data-host]]:group-hover:-translate-y-[5%]"
                    >
                      <span className="absolute top-3 left-3 grid size-9 place-items-center rounded-full bg-paper font-display text-[1.05rem] font-medium text-ink">
                        {episode.number}
                      </span>
                      <span className="absolute right-3 bottom-3 rounded-full bg-ink/70 px-2.5 py-1 text-[0.78rem] font-bold text-white backdrop-blur">
                        {watched >= 1 ? "Watched" : episode.duration}
                      </span>
                      <span className="absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <span className="grid size-16 place-items-center rounded-full bg-paper/95 text-ink shadow-lift">
                          <Icon name="play" className="size-7 translate-x-0.5" />
                        </span>
                      </span>
                      {watched > 0 && (
                        <span className="absolute bottom-3 left-3 h-1.5 w-[calc(100%-6.5rem)] overflow-hidden rounded-full bg-black/25">
                          <span className="block h-full rounded-full bg-white" style={{ width: `${Math.max(6, watched * 100)}%` }} />
                        </span>
                      )}
                      {current && <span className="absolute inset-0 rounded-card ring-4 ring-paper ring-inset" />}
                    </ShowArt>
                    <span className="mt-3 block px-1 font-display text-[1.12rem] leading-tight font-medium">{episode.title}</span>
                    <span className="mt-1 line-clamp-2 block px-1 text-[0.9rem] leading-snug text-ink-soft">{episode.description}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {sameHost.length > 0 && (
        <Row title={`More with ${host.name}`} host={host} seeAll={`/friends/${host.id}`}>
          {sameHost.map((other) => (
            <ShowCard key={other.id} show={other} characters={characters} className={ROW_CARD} />
          ))}
        </Row>
      )}
      {related.length > 0 && (
        <Row title="You might also like">
          {related.map((other) => (
            <ShowCard key={other.id} show={other} characters={characters} className={ROW_CARD} />
          ))}
        </Row>
      )}

      {player && (
        <KidsPlayer
          // Keyed on where it starts: arriving to play, the saved position is
          // only known once the page is in the browser, and the theatre
          // restarts there rather than at the top.
          key={`${player.key}@${player.at}`}
          showId={show.id}
          showTitle={show.title}
          host={host}
          items={items}
          startKey={player.key}
          resumeAt={player.at}
          onClose={onClose}
          onProgress={onProgress}
          onItemChange={setNowPlaying}
        />
      )}
    </main>
  );
}

/** "s2e4" → "S2 E4"; a movie's key reads as nothing extra. */
function labelFor(key: string): string {
  const m = /^s(\d+)e(\d+)$/.exec(key);
  return m ? `S${m[1]} E${m[2]}` : "";
}
