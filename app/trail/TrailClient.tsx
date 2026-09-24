"use client";

// The trail: a board-game path through six islands, one per friend.
//
// Stops sit along a winding road instead of a row. Only the next one is open;
// watch it (most of it, not just the start) and the buddy the child picked
// walks along the road to the one after, which pops open. Every island ends
// in a treasure chest holding that island host's sticker, and the next island
// only opens once the chest has been opened, so the reward is always claimed.
//
// Geometry is computed in pixels from the column's measured width, because
// the buddy walks the road with CSS motion paths (offset-path), and those take
// real coordinates rather than percentages.

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { cx, tint } from "@/lib/cx";
import type { Character as CharacterData, ResolvedChapter, ResolvedStop } from "@/lib/catalog-types";
import { markStopDone, openChest, parseTrail, readTrailRaw, setTrailSeen, subscribeDevice } from "@/lib/device";
import { currentIndex, isComplete, trailItems, WATCHED_FRACTION, type TrailItem } from "@/lib/trail";
import { parseProgress, readRaw, resumeSeconds, saveProgress } from "@/lib/watch-progress";

import Burst from "../_components/Burst";
import Character from "../_components/Character";
import Chest from "../_components/Chest";
import Face from "../_components/Face";
import Icon from "../_components/Icon";
import KidsPlayer from "../_components/KidsPlayer";
import ShowArt from "../_components/ShowArt";

interface TrailClientProps {
  chapters: ResolvedChapter[];
  characters: CharacterData[];
  buddy: CharacterData;
  /** "guest" when nobody has picked a profile. */
  profileId: string;
  name: string | null;
}

/* ---------------------------------------------------------- geometry -- */

/** Side-to-side swing of the road, as a share of its full reach. */
const SWING = [0, -0.7, -1, -0.7, 0, 0.7, 1, 0.7];
const BANNER_TOP = 20;
const BANNER_H = 176;
const FIRST_STOP_GAP = 108;
const STEP = 136;
const NODE = 84;
const BIG_NODE = 100;
const CHEST = 96;
const BUDDY_H = 118;
/** Room between a stop and the buddy, where the pointer sits. */
const POINTER_GAP = 40;

interface Point {
  x: number;
  y: number;
}

interface Placed extends Point {
  size: number;
}

function layoutTrail(chapters: ResolvedChapter[], width: number) {
  const cx = width / 2;
  const reach = Math.min(124, width * 0.26);
  const nodes: Placed[] = [];
  const banners: { y: number }[] = [];
  const zones: { top: number; bottom: number }[] = [];
  let y = 0;
  let swing = 0;

  for (const chapter of chapters) {
    const top = y;
    banners.push({ y: y + BANNER_TOP });
    y += BANNER_TOP + BANNER_H + FIRST_STOP_GAP;

    const count = chapter.stops.length + 1;
    for (let i = 0; i < count; i += 1) {
      const stop = chapter.stops[i] as ResolvedStop | undefined;
      const size = !stop ? CHEST : stop.format === "Movie" || stop.format === "Special" ? BIG_NODE : NODE;
      nodes.push({ x: cx + reach * SWING[swing % SWING.length], y, size });
      swing += 1;
      y += STEP;
    }
    zones.push({ top, bottom: y - STEP + 100 });
    y += 44;
  }

  return { nodes, banners, zones, height: y + 24, cx };
}

/** A smooth road through the points: each leg an S-curve with vertical ends. */
function road(points: Point[]): string {
  if (points.length === 0) return "";
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const mid = (a.y + b.y) / 2;
    d += ` C ${a.x.toFixed(1)} ${mid.toFixed(1)} ${b.x.toFixed(1)} ${mid.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  }
  return d;
}

/** Where the buddy stands for a stop: beside it, on the side with more room. */
function standFor(node: Placed, cx: number, buddyWidth: number): Point & { side: 1 | -1 } {
  const side: 1 | -1 = node.x <= cx + 1 ? 1 : -1;
  return { x: node.x + side * (node.size / 2 + POINTER_GAP + buddyWidth / 2), y: node.y + node.size / 2 - 2, side };
}

/* ------------------------------------------------------ width reading -- */

function useWidth() {
  const ref = useRef<HTMLDivElement | null>(null);
  const subscribe = useCallback((onChange: () => void) => {
    const el = ref.current;
    if (!el) return () => undefined;
    const observer = new ResizeObserver(onChange);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const width = useSyncExternalStore(
    subscribe,
    () => ref.current?.clientWidth ?? 0,
    () => 0,
  );
  return [ref, width] as const;
}

/* ---------------------------------------------------------- component -- */

export default function TrailClient({ chapters, characters, buddy, profileId, name }: TrailClientProps) {
  const find = (id: string) => characters.find((c) => c.id === id) ?? characters[0];
  const items = useMemo(() => trailItems(chapters), [chapters]);
  const progress = parseTrail(useSyncExternalStore(subscribeDevice, () => readTrailRaw(profileId), () => ""));
  const current = currentIndex(items, chapters, progress);
  const allDone = current >= items.length;

  const [ref, width] = useWidth();
  const geo = useMemo(() => (width ? layoutTrail(chapters, width) : null), [chapters, width]);

  const [selected, setSelected] = useState<number | null>(null);
  const [playing, setPlaying] = useState<{ stop: ResolvedStop; at: number } | null>(null);
  const [reward, setReward] = useState<number | null>(null);
  const [say, setSay] = useState<{ text: string; n: number } | null>(null);
  const [shake, setShake] = useState<{ index: number; n: number } | null>(null);
  const [arrived, setArrived] = useState(false);

  // The buddy waits while a show or a prize is on screen, then walks.
  const target = Math.min(current, items.length - 1);
  const quiet = playing === null && reward === null;
  const from = Math.min(progress.seen, target);
  const at = quiet ? target : from;
  const walking = from < at;

  const nodeRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const walkMs = Math.min(3600, 1100 * (at - from) + 500);

  // The buddy has reached the stop: remember where it stands. Normally the
  // walk's animationend does this; the timer is the backstop for a browser
  // that never delivers it (a tab in the background can hold animations).
  useEffect(() => {
    if (!walking) return;
    const id = window.setTimeout(() => {
      setTrailSeen(profileId, at);
      setArrived(true);
    }, walkMs + 400);
    return () => window.clearTimeout(id);
  }, [walking, walkMs, profileId, at]);

  // Bring the waiting stop into view on arrival, and follow the buddy.
  useEffect(() => {
    if (!geo) return;
    nodeRefs.current[at]?.scrollIntoView({ block: "center", behavior: walking ? "smooth" : "auto" });
  }, [geo, at, walking]);

  // Speech bubbles fade back to the buddy's standing advice.
  useEffect(() => {
    if (!say) return;
    const id = window.setTimeout(() => setSay(null), 3800);
    return () => window.clearTimeout(id);
  }, [say]);

  const talk = (text: string) => setSay((s) => ({ text, n: (s?.n ?? 0) + 1 }));

  const doneStops = chapters.reduce((n, c) => n + c.stops.filter((s) => progress.done.includes(s.id)).length, 0);
  const totalStops = chapters.reduce((n, c) => n + c.stops.length, 0);
  const stickers = chapters.filter((c) => progress.chests.includes(c.id)).length;
  const currentChapter = items[Math.min(current, items.length - 1)]?.chapter ?? 0;

  const nextItem = items[current];
  const advice = walking
    ? "Here we go!"
    : say
      ? say.text
      : allDone
        ? `You finished the whole trail${name ? `, ${name}` : ""}! You're a ShowTiva superstar!`
        : arrived
          ? nextItem?.kind === "chest"
            ? "We made it! A treasure chest! Tap it to open your prize."
            : `Woohoo! "${nextItem?.kind === "stop" ? nextItem.stop.title : ""}" is open. Tap it!`
          : nextItem?.kind === "chest"
            ? "A treasure chest! Tap it to open your prize."
            : current === 0
              ? `Hi${name ? ` ${name}` : ""}! I'm ${buddy.name}. Tap the glowing stop and let's watch!`
              : `This way! Tap "${nextItem?.kind === "stop" ? nextItem.stop.title : ""}" to watch it next.`;

  /* ------------------------------------------------------------ taps -- */

  const tapItem = (index: number) => {
    const item = items[index];
    if (index > current) {
      setShake((s) => ({ index, n: (s?.n ?? 0) + 1 }));
      const waiting = items[current];
      talk(
        waiting?.kind === "stop"
          ? `That one's locked! Watch "${waiting.stop.title}" first.`
          : "That one's locked! Open the treasure chest first.",
      );
      return;
    }
    if (item.kind === "chest") {
      if (isComplete(item, chapters, progress)) {
        talk(`You already opened this one. ${find(chapters[item.chapter].host).name}'s sticker is yours!`);
        return;
      }
      openChest(profileId, chapters[item.chapter].id);
      setReward(item.chapter);
      return;
    }
    setSelected(selected === index ? null : index);
  };

  const play = (stop: ResolvedStop) => {
    const saved = parseProgress(readRaw(stop.showId));
    setSelected(null);
    setArrived(false);
    setPlaying({ stop, at: resumeSeconds(saved?.items[stop.key]) });
  };

  /* ----------------------------------------------------------- render -- */

  const buddyWidth = BUDDY_H * buddy.aspect;
  const stands = geo ? geo.nodes.map((node) => standFor(node, geo.cx, buddyWidth)) : [];
  const here = stands[at];

  return (
    <main className="mx-auto grid max-w-[1180px] grid-cols-[320px_minmax(0,560px)] items-start justify-center gap-[clamp(2rem,5vw,4.5rem)] px-6 pt-6 pb-24 max-[960px]:grid-cols-1 max-[960px]:gap-6 max-[640px]:px-4">
      {/* ---- the scoreboard ---- */}
      <aside className="sticky top-24 flex flex-col gap-4 max-[960px]:static" style={tint(buddy)}>
        <div className="rounded-panel bg-paper p-6 ring-1 ring-line">
          <div className="flex items-center gap-4">
            <span className="rounded-full bg-(--c) p-[4px]">
              <Face character={buddy} plain className="block size-14" />
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-[1.7rem] leading-tight font-medium">{name ? `${name}'s Trail` : "The Trail"}</h1>
              <p className="text-[0.92rem] font-semibold text-ink-soft">Guided by {buddy.name}</p>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-2 divide-x divide-line">
            <div className="pr-4">
              <dd className="flex items-center gap-1.5 font-display text-[1.7rem] leading-none font-medium">
                <Icon name="star" className="size-6 text-[#ffb800]" />
                {doneStops}
              </dd>
              <dt className="mt-1.5 text-[0.8rem] font-semibold text-ink-faint">of {totalStops} stars</dt>
            </div>
            <div className="pl-4">
              <dd className="font-display text-[1.7rem] leading-none font-medium">
                {Math.min(currentChapter + 1, chapters.length)}
                <span className="text-[1rem] text-ink-faint"> / {chapters.length}</span>
              </dd>
              <dt className="mt-1.5 text-[0.8rem] font-semibold text-ink-faint">island</dt>
            </div>
          </dl>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-mist">
            <span
              className="block h-full rounded-full bg-(--c) transition-[width] duration-700 ease-out-soft"
              style={{ width: `${totalStops ? (doneStops / totalStops) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="rounded-panel bg-paper p-6 ring-1 ring-line">
          <p className="flex items-center justify-between text-[0.78rem] font-bold tracking-[0.12em] text-ink-faint uppercase">
            Sticker book
            <span className="tracking-normal text-ink-soft normal-case">
              {stickers} of {chapters.length}
            </span>
          </p>
          <ul className="mt-4 grid grid-cols-4 gap-3">
            {chapters.map((chapter) => {
              const got = progress.chests.includes(chapter.id);
              const host = find(chapter.host);
              return (
                <li key={chapter.id} title={got ? `${host.name}'s sticker` : "Not yet"}>
                  <span
                    className={cx(
                      "grid aspect-square place-items-center rounded-full p-[3px] transition-[filter,opacity] duration-500",
                      got ? "bg-(--c)" : "border-2 border-dashed border-ink/15 opacity-50 grayscale",
                    )}
                    style={tint(host)}
                  >
                    <Face character={host} plain className="block size-full" />
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      {/* ---- the trail itself ---- */}
      <div ref={ref} className="relative" style={{ height: geo?.height ?? 900 }}>
        {geo && (
          <>
            {/* Islands behind everything. */}
            {geo.zones.map((zone, ci) => {
              const host = find(chapters[ci].host);
              const reached = items.findIndex((item) => item.chapter === ci) <= current;
              return (
                <div
                  key={chapters[ci].id}
                  aria-hidden
                  className={cx("absolute inset-x-0 rounded-stage transition-colors duration-700", reached ? "bg-(--c-soft)" : "bg-mist")}
                  style={{ ...tint(host), top: zone.top, height: zone.bottom - zone.top }}
                >
                </div>
              );
            })}

            {/* The road: all of it dashed, the part already walked solid. */}
            <svg className="pointer-events-none absolute inset-0 overflow-visible" width={width} height={geo.height} aria-hidden>
              <path d={road(geo.nodes)} fill="none" stroke="#ffffff" strokeWidth="22" strokeLinecap="round" />
              <path d={road(geo.nodes)} fill="none" stroke="rgb(30 26 60 / 0.13)" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 14" />
              {at > 0 && (
                <path
                  d={road(geo.nodes.slice(0, at + 1))}
                  fill="none"
                  stroke={buddy.color}
                  strokeOpacity="0.55"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
              )}
            </svg>

            {/* Island banners, with each host stepping out of theirs. */}
            {geo.banners.map((banner, ci) => {
              const chapter = chapters[ci];
              const host = find(chapter.host);
              const firstItem = items.findIndex((item) => item.chapter === ci);
              const reached = firstItem <= current;
              const done = chapter.stops.filter((s) => progress.done.includes(s.id)).length;
              return (
                <section
                  key={chapter.id}
                  className="absolute inset-x-3 z-10"
                  style={{ ...tint(host), top: banner.y, height: BANNER_H }}
                  aria-label={`Island ${ci + 1}: ${chapter.title}`}
                >
                  <div
                    className={cx(
                      "relative h-full overflow-hidden rounded-panel p-5 pr-[38%] transition-colors duration-700",
                      reached ? "bg-(--c) text-(--c-on)" : "bg-[#e7e1d6] text-ink-faint",
                    )}
                  >
                    <p className="relative text-[0.72rem] font-bold tracking-[0.14em] uppercase opacity-75">
                      {reached ? `Island ${ci + 1}` : `Island ${ci + 1} · locked`}
                    </p>
                    <h2 className="relative mt-1 font-display text-[clamp(1.35rem,3.6vw,1.75rem)] leading-[1.05] font-medium text-balance">
                      {chapter.title}
                    </h2>
                    <p className="relative mt-1.5 line-clamp-2 text-[0.9rem] leading-snug font-medium opacity-90">{chapter.blurb}</p>
                    <p className="relative mt-3 flex gap-1" aria-label={`${done} of ${chapter.stops.length} stars`}>
                      {chapter.stops.map((stop) => (
                        <Icon
                          key={stop.id}
                          name="star"
                          className={cx("size-5", progress.done.includes(stop.id) ? "text-[#ffd23f]" : reached ? "text-white/30" : "text-ink/10")}
                        />
                      ))}
                    </p>
                  </div>
                  <span
                    className={cx(
                      "pointer-events-none absolute right-2 bottom-0 h-[118%] transition-[filter,opacity] duration-700",
                      !reached && "opacity-45 grayscale",
                    )}
                  >
                    <Character character={host} decorative className="h-full" />
                  </span>
                </section>
              );
            })}

            {/* The stops. */}
            {items.map((item, index) => {
              const node = geo.nodes[index];
              const state = index < current ? "done" : index === current ? "current" : "locked";
              const shaking = shake?.index === index;
              if (item.kind === "chest") {
                const chestState = isComplete(item, chapters, progress) ? "open" : index === current ? "ready" : "locked";
                return (
                  <button
                    key={item.id}
                    ref={(el) => {
                      nodeRefs.current[index] = el;
                    }}
                    type="button"
                    onClick={() => tapItem(index)}
                    aria-label={chestState === "open" ? "Opened treasure chest" : chestState === "ready" ? "Open the treasure chest" : "Locked treasure chest"}
                    className="absolute z-20 cursor-pointer rounded-3xl outline-offset-4"
                    style={{ left: node.x - node.size / 2, top: node.y - node.size / 2, width: node.size, height: node.size }}
                  >
                    {chestState === "ready" && (
                      <span className="absolute inset-[-10%] animate-spin-slow rounded-full bg-[conic-gradient(from_0deg,#ffd23f55_0deg_20deg,transparent_20deg_40deg,#ffd23f55_40deg_60deg,transparent_60deg_80deg,#ffd23f55_80deg_100deg,transparent_100deg_120deg,#ffd23f55_120deg_140deg,transparent_140deg_160deg,#ffd23f55_160deg_180deg,transparent_180deg_200deg,#ffd23f55_200deg_220deg,transparent_220deg_240deg,#ffd23f55_240deg_260deg,transparent_260deg_280deg,#ffd23f55_280deg_300deg,transparent_300deg_320deg,#ffd23f55_320deg_340deg,transparent_340deg_360deg)]" />
                    )}
                    <span
                      key={shaking ? `shake-${shake.n}` : "still"}
                      className={cx(
                        "relative block size-full origin-bottom",
                        chestState === "ready" && "animate-wiggle",
                        shaking && "animate-shake",
                      )}
                    >
                      <Chest state={chestState} className="size-full" />
                    </span>
                    {chestState === "open" && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 animate-pop">
                        <Face character={find(chapters[item.chapter].host)} className="block size-11 face-ring" />
                      </span>
                    )}
                  </button>
                );
              }

              const stop = item.stop;
              const host = find(stop.host);
              const movie = stop.format === "Movie" || stop.format === "Special";
              return (
                <div key={item.id}>
                  {state === "current" && !walking && (
                    <span
                      className="pointer-events-none absolute z-20 -translate-x-1/2 animate-float rounded-full bg-ink px-3 py-1 text-[0.72rem] font-extrabold tracking-[0.08em] whitespace-nowrap text-white uppercase"
                      style={{ left: node.x, top: node.y - node.size / 2 - 36 }}
                    >
                      {movie ? "Movie time" : "Up next"}
                    </span>
                  )}
                  <button
                    ref={(el) => {
                      nodeRefs.current[index] = el;
                    }}
                    type="button"
                    onClick={() => tapItem(index)}
                    aria-label={`${stop.title}, ${stop.showTitle}. ${state === "done" ? "Watched." : state === "current" ? "Up next." : "Locked."}`}
                    className="group absolute z-20 cursor-pointer rounded-full outline-offset-4"
                    style={{ ...tint(host), left: node.x - node.size / 2, top: node.y - node.size / 2, width: node.size, height: node.size }}
                  >
                    {state === "current" && <span className="absolute inset-0 animate-ring rounded-full bg-(--c)" />}
                    <span
                      key={shaking ? `shake-${shake.n}` : index === at && arrived ? "arrived" : "still"}
                      className={cx(
                        "absolute inset-0 block",
                        shaking && "animate-shake",
                        index === at && arrived && "animate-pop",
                      )}
                    >
                      {/* A coin with depth: the deep shade below, the face on top. */}
                      <span className={cx("absolute inset-0 rounded-full", state === "locked" ? "bg-[#d6cdbd]" : "bg-(--c-deep)")} />
                      <span
                        className={cx(
                          "absolute inset-x-0 top-0 bottom-[7px] grid place-items-center overflow-hidden rounded-full transition-transform duration-150 group-active:translate-y-[5px]",
                          state === "locked" ? "bg-[#ece6dc] text-[#aaa194]" : "bg-(--c)",
                        )}
                      >
                        {state === "locked" ? (
                          <Icon name="lock" className="size-8" />
                        ) : (
                          <Face character={host} plain className="block size-[74%] ring-2 ring-white/70" />
                        )}
                      </span>
                      {state === "done" && (
                        <span className="absolute -top-1 -right-1 grid size-8 place-items-center rounded-full bg-[#ffc933] text-white ring-3 ring-paper">
                          <Icon name="star" className="size-[18px]" />
                        </span>
                      )}
                      {state === "current" && (
                        <span className="absolute -right-1 -bottom-1 grid size-9 place-items-center rounded-full bg-paper text-(--c-deep) shadow-soft">
                          <Icon name="play" className="size-5 translate-x-px" />
                        </span>
                      )}
                      {movie && state !== "locked" && (
                        <span className="absolute -top-2 -left-2 grid size-8 place-items-center rounded-full bg-ink text-white ring-3 ring-paper">
                          <Icon name="film" className="size-[18px]" />
                        </span>
                      )}
                    </span>
                  </button>
                  {state !== "locked" && (
                    <span
                      className={cx(
                        "pointer-events-none absolute z-20 w-[150px] -translate-x-1/2 text-center text-[0.8rem] leading-tight font-bold",
                        state === "current" ? "text-ink" : "text-ink-soft",
                      )}
                      style={{ left: node.x, top: node.y + node.size / 2 + 8 }}
                    >
                      {stop.title}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Confetti where a stop was just finished. */}
            {walking && geo.nodes[from] && (
              <span className="pointer-events-none absolute z-30" style={{ left: geo.nodes[from].x, top: geo.nodes[from].y }}>
                <Burst key={`burst-at-${from}`} spread={110} />
              </span>
            )}

            {/* The pointer: the buddy's arrow at the waiting stop. */}
            {!walking && !allDone && here && (
              <span
                className="pointer-events-none absolute z-20 grid size-8 -translate-x-1/2 -translate-y-1/2 animate-nudge place-items-center rounded-full bg-paper text-(--c-deep) shadow-soft"
                style={
                  {
                    ...tint(buddy),
                    left: geo.nodes[at].x + here.side * (geo.nodes[at].size / 2 + POINTER_GAP / 2),
                    top: geo.nodes[at].y,
                    "--nudge": `${-here.side * 5}px`,
                  } as React.CSSProperties
                }
              >
                <Icon name={here.side === 1 ? "chevron-left" : "chevron-right"} className="size-5" />
              </span>
            )}

            {/* The buddy. Walks the road with offset-path; stands still otherwise. */}
            {here && (
              <div
                key={walking ? `walk-${from}-${at}` : `still-${at}`}
                className={cx("pointer-events-none absolute top-0 left-0 z-30", walking && "animate-walk")}
                style={
                  {
                    offsetPath: `path('${walking ? road(stands.slice(from, at + 1)) : `M ${here.x} ${here.y - 0.5} L ${here.x} ${here.y}`}')`,
                    offsetRotate: "0deg",
                    offsetAnchor: "50% 100%",
                    offsetDistance: "100%",
                    "--walk-ms": `${walkMs}ms`,
                  } as React.CSSProperties
                }
                onAnimationEnd={(event) => {
                  if (event.target !== event.currentTarget) return;
                  setTrailSeen(profileId, at);
                  setArrived(true);
                }}
              >
                <div className="relative" style={tint(buddy)}>
                  <p
                    key={`${advice}-${say?.n ?? 0}`}
                    role="status"
                    className={cx(
                      "absolute bottom-[calc(100%+10px)] w-max max-w-[210px] animate-pop rounded-2xl bg-paper px-3.5 py-2.5 text-[0.88rem] leading-snug font-bold text-ink shadow-lift",
                      here.x > geo.cx ? "right-[-6px]" : "left-[-6px]",
                    )}
                  >
                    {advice}
                    <span
                      className={cx(
                        "absolute -bottom-1.5 size-3 rotate-45 bg-paper",
                        here.x > geo.cx ? "right-6" : "left-6",
                      )}
                    />
                  </p>
                  <div className={walking ? "animate-hop" : "animate-bob"}>
                    <Character
                      character={buddy}
                      decorative
                      priority
                      className="drop-shadow-[0_6px_6px_rgba(30,26,60,0.18)]"
                      style={{ height: BUDDY_H, transform: here.side === 1 ? "scaleX(-1)" : undefined }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* A stop's card, when tapped. */}
            {selected !== null && items[selected]?.kind === "stop" && (
              <StopCard
                item={items[selected] as Extract<TrailItem, { kind: "stop" }>}
                node={geo.nodes[selected]}
                width={width}
                characters={characters}
                watched={selected < current}
                onPlay={play}
                onClose={() => setSelected(null)}
              />
            )}
          </>
        )}
      </div>

      {playing && (
        <KidsPlayer
          key={playing.stop.id}
          showId={playing.stop.showId}
          showTitle={playing.stop.showTitle}
          host={find(playing.stop.host)}
          items={[{ key: playing.stop.key, label: playing.stop.label, title: playing.stop.title, videoUrl: playing.stop.videoUrl }]}
          startKey={playing.stop.key}
          resumeAt={playing.at}
          onProgress={(key, t, d) => {
            saveProgress(playing.stop.showId, key, t, d);
            if (d > 0 && t / d >= WATCHED_FRACTION) markStopDone(profileId, playing.stop.id);
          }}
          onFinished={() => {
            markStopDone(profileId, playing.stop.id);
            setPlaying(null);
          }}
          onClose={() => setPlaying(null)}
        />
      )}

      {reward !== null && (
        <Reward
          chapter={chapters[reward]}
          host={find(chapters[reward].host)}
          last={reward === chapters.length - 1}
          stickers={stickers}
          total={chapters.length}
          onClose={() => {
            setReward(null);
            setArrived(false);
          }}
        />
      )}
    </main>
  );
}

/* ----------------------------------------------------------- stop card -- */

function StopCard({
  item,
  node,
  width,
  characters,
  watched,
  onPlay,
  onClose,
}: {
  item: Extract<TrailItem, { kind: "stop" }>;
  node: Placed;
  width: number;
  characters: CharacterData[];
  watched: boolean;
  onPlay: (stop: ResolvedStop) => void;
  onClose: () => void;
}) {
  const stop = item.stop;
  const host = characters.find((c) => c.id === stop.host) ?? characters[0];
  const cardWidth = Math.min(300, width - 16);
  const left = Math.max(8, Math.min(width - cardWidth - 8, node.x - cardWidth / 2));

  return (
    <>
      <button type="button" aria-label="Close" className="fixed inset-0 z-[35] cursor-default" onClick={onClose} />
      <div
        role="dialog"
        aria-label={stop.title}
        className="absolute z-40 animate-pop rounded-panel bg-paper p-3 shadow-lift"
        style={{ ...tint(host), left, top: node.y + node.size / 2 + 14, width: cardWidth }}
      >
        <ShowArt
          show={{ id: stop.showId, host: stop.host, cast: stop.cast, motif: stop.motif, tone: stop.tone, art: stop.art }}
          characters={characters}
          seed={stop.key}
          className="aspect-[16/9] rounded-2xl"
        />
        <div className="px-1.5 pt-3 pb-1">
          <p className="text-[0.75rem] font-extrabold tracking-[0.08em] text-(--c-deep) uppercase">{stop.showTitle}</p>
          <p className="mt-0.5 font-display text-[1.3rem] leading-tight font-medium">{stop.title}</p>
          <p className="mt-1 text-[0.85rem] font-semibold text-ink-soft">
            {stop.label} · {stop.duration}
          </p>
          <button
            type="button"
            onClick={() => onPlay(stop)}
            className="mt-3 inline-flex h-13 w-full cursor-pointer items-center justify-center gap-2.5 rounded-full bg-(--c) text-[1.02rem] font-bold text-(--c-on) transition-transform active:scale-[0.98]"
          >
            <Icon name={watched ? "replay" : "play"} className="size-5" />
            {watched ? "Watch again" : "Play"}
          </button>
        </div>
      </div>
    </>
  );
}

/* -------------------------------------------------------------- reward -- */

function Reward({
  chapter,
  host,
  last,
  stickers,
  total,
  onClose,
}: {
  chapter: ResolvedChapter;
  host: CharacterData;
  last: boolean;
  stickers: number;
  total: number;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[75] grid animate-fade place-items-center bg-ink/55 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="reward-title">
      <div
        className="relative w-full max-w-[420px] animate-sheet overflow-hidden rounded-stage bg-(--c) px-7 pt-8 pb-7 text-center text-(--c-on) shadow-lift"
        style={tint(host)}
      >
        {/* Sun rays turning slowly behind the prize. */}
        <span
          aria-hidden
          className="pointer-events-none absolute top-[28%] left-1/2 aspect-square w-[160%] -translate-x-1/2 -translate-y-1/2 animate-spin-slow rounded-full bg-[repeating-conic-gradient(from_0deg,rgba(255,255,255,0.16)_0deg_10deg,transparent_10deg_20deg)]"
        />
        <span className="absolute top-[30%] left-1/2">
          <Burst spread={160} count={24} />
        </span>

        <p className="relative text-[0.8rem] font-extrabold tracking-[0.16em] uppercase opacity-85">
          {last ? "Trail complete!" : "Island complete!"}
        </p>
        <div className="relative mx-auto mt-4 w-fit animate-pop [animation-delay:0.15s]">
          <span className="block rounded-full bg-paper p-2 shadow-lift">
            <Face character={host} className="block size-36" />
          </span>
          <span className="absolute -right-2 -bottom-1 grid size-12 place-items-center rounded-full bg-[#ffc933] text-white ring-4 ring-(--c)">
            <Icon name="star" className="size-7" />
          </span>
        </div>
        <h2 id="reward-title" className="relative mt-5 font-display text-[1.9rem] leading-tight font-medium">
          You got {host.name}&apos;s sticker!
        </h2>
        <p className="relative mt-2 text-[1rem] font-medium opacity-90">
          {last
            ? "You watched your way across the whole of Tiva Island. Superstar!"
            : `${chapter.title} is done. ${stickers} of ${total} stickers collected.`}
        </p>
        <button
          type="button"
          autoFocus
          onClick={onClose}
          className="relative mt-7 inline-flex h-14 w-full cursor-pointer items-center justify-center rounded-full bg-paper text-[1.05rem] font-bold text-ink shadow-lift transition-transform active:scale-[0.98]"
        >
          {last ? "Hooray!" : "Keep going!"}
        </button>
      </div>
    </div>
  );
}
