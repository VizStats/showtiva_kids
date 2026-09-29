"use client";

// The trail: a full-screen adventure map through seven islands, one per
// friend (see Scenery.tsx for the land itself).
//
// Stops sit along a road that winds from side to side across the whole map.
// Only the next one is open; watch it (most of it, not just the start) and
// the buddy the child picked walks along the road to the one after, which
// pops open. Every island ends in a treasure chest holding that island host's
// sticker, and the next island only opens once the chest has been opened, so
// the reward is always claimed.
//
// Geometry is computed in pixels from the map's measured width, because the
// buddy walks the road with CSS motion paths (offset-path), and those take
// real coordinates rather than percentages.

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { cx, tint } from "@/lib/cx";
import type { Character as CharacterData, ResolvedChapter, ResolvedStop } from "@/lib/catalog-types";
import {
  markStopDone,
  openChest,
  parseFavourites,
  parseTrail,
  readFavouritesRaw,
  readTrailRaw,
  setTrailSeen,
  subscribeDevice,
  toggleFavourite,
  type TrailProgress,
} from "@/lib/device";
import { currentIndex, isComplete, trailItems, WATCHED_FRACTION, type TrailItem } from "@/lib/trail";
import { parseProgress, readRaw, resumeSeconds, saveProgress } from "@/lib/watch-progress";

import Burst from "@/app/_components/Burst";
import Character from "@/app/_components/Character";
import Chest from "@/app/_components/Chest";
import Face from "@/app/_components/Face";
import Icon from "@/app/_components/Icon";
import KidsPlayer from "@/app/_components/KidsPlayer";
import ShowArt from "@/app/_components/ShowArt";
import { Clouds, Island, type Rect } from "./Scenery";

interface TrailClientProps {
  chapters: ResolvedChapter[];
  characters: CharacterData[];
  buddy: CharacterData;
  /** "guest" when nobody has picked a profile. */
  profileId: string;
  name: string | null;
}

/* ---------------------------------------------------------- geometry -- */

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

interface Sign extends Rect {
  /** Which side of the map the sign stands on: across from the road. */
  side: "left" | "right";
}

/**
 * How far the road swings for the i-th stop, from -1 (far left) to 1 (far
 * right). A full swing every six stops or so, so the road is always on its
 * way across the map and never runs straight down, with a slower second
 * wave varying how wide each swing goes.
 */
function sway(i: number): number {
  return Math.sin(i * 1.04 + 0.4) * (0.82 + 0.18 * Math.sin(i * 0.37 + 1.1));
}

/** Catmull-Rom through the points, as cubic Bézier legs: a road with no kinks. */
function legs(points: Point[]): [Point, Point, Point, Point][] {
  const out: [Point, Point, Point, Point][] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    out.push([
      p1,
      { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
      p2,
    ]);
  }
  return out;
}

function road(points: Point[]): string {
  if (points.length === 0) return "";
  const f = (n: number) => n.toFixed(1);
  let d = `M ${f(points[0].x)} ${f(points[0].y)}`;
  for (const [, c1, c2, p] of legs(points)) d += ` C ${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(p.x)} ${f(p.y)}`;
  return d;
}

/** Points along the road, for keeping scenery off it. */
function sampleRoad(points: Point[], perLeg = 10): Point[] {
  const out: Point[] = [];
  for (const [a, b, c, d] of legs(points)) {
    for (let k = 0; k < perLeg; k += 1) {
      const t = k / perLeg;
      const u = 1 - t;
      out.push({
        x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
        y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y,
      });
    }
  }
  if (points.length) out.push(points[points.length - 1]);
  return out;
}

function layoutTrail(chapters: ResolvedChapter[], width: number) {
  const compact = width < 700;
  const cx = width / 2;
  const reach = compact ? width * 0.29 : Math.min(width * 0.31, 420);
  // Enough between stops that one stop's name never meets the next one's
  // "Up next" tag.
  const step = compact ? 154 : 164;
  const signH = compact ? 148 : 156;
  const signW = compact ? Math.min(width - 32, 440) : Math.min(460, width * 0.34);
  const margin = Math.max(24, width * 0.05);

  const nodes: Placed[] = [];
  const signs: Sign[] = [];
  const tops: number[] = [];
  // The first sign starts below the floating scoreboard, which on narrower
  // screens sits under the floating buttons rather than between them.
  let y = width < 1024 ? (compact ? 144 : 152) : 124;
  let i = 0;

  chapters.forEach((chapter, ci) => {
    tops.push(ci === 0 ? 0 : y - (compact ? 56 : 70));

    // The sign stands across from where the road runs as it passes.
    const firstX = cx + reach * sway(i);
    const firstY = y + signH + (compact ? 96 : 88);
    const prev = nodes[nodes.length - 1];
    const middle = y + signH / 2;
    const roadX = prev ? prev.x + (firstX - prev.x) * ((middle - prev.y) / (firstY - prev.y)) : firstX;
    const onLeft = roadX > cx;
    const x = compact ? (width - signW) / 2 : onLeft ? margin : width - signW - margin;
    signs.push({ x, y, w: signW, h: signH, side: onLeft ? "left" : "right" });

    y = firstY;
    const count = chapter.stops.length + 1;
    for (let k = 0; k < count; k += 1) {
      const stop = chapter.stops[k] as ResolvedStop | undefined;
      const size = !stop ? CHEST : stop.format === "Movie" || stop.format === "Special" ? BIG_NODE : NODE;
      nodes.push({ x: cx + reach * sway(i), y, size });
      i += 1;
      y += step;
    }
    y += compact ? 72 : 92;
  });

  const height = y + 40;
  const zones = tops.map((top, k) => ({ top, bottom: tops[k + 1] ?? height }));
  return { nodes, signs, zones, height, cx, compact, roadD: road(nodes), samples: sampleRoad(nodes) };
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
  const [book, setBook] = useState(false);

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
  const firstOf = (ci: number) => items.findIndex((item) => item.chapter === ci);

  return (
    <main className="relative">
      {/* ---- the scoreboard, floating over the map ---- */}
      <div className="pointer-events-none sticky top-4 z-40 -mb-[64px] flex justify-center px-3 max-[1023px]:top-[4.5rem] max-[640px]:top-16">
        <div
          className="pointer-events-auto flex max-w-full items-center gap-3 rounded-full bg-paper/92 py-1.5 pr-1.5 pl-1.5 shadow-lift backdrop-blur-xl max-[420px]:gap-2"
          style={tint(buddy)}
        >
          <span className="flex-none rounded-full bg-(--c) p-[3px]">
            <Face character={buddy} plain className="block size-10" />
          </span>
          <span className="min-w-0 pr-1">
            <span className="block truncate font-display text-[1.05rem] leading-tight font-medium">
              {name ? `${name}'s Trail` : "The Trail"}
            </span>
            <span className="block truncate text-[0.78rem] font-semibold text-ink-faint max-[420px]:hidden">
              Island {Math.min(currentChapter + 1, chapters.length)} · {chapters[currentChapter]?.title}
            </span>
          </span>
          <span className="h-8 w-px flex-none bg-line" />
          <span className="flex flex-none items-center gap-1 font-display text-[1.1rem] font-medium" aria-label={`${doneStops} of ${totalStops} stars`}>
            <Icon name="star" className="size-5 text-[#ffb800]" />
            {doneStops}
            <span className="text-[0.85rem] text-ink-faint">/{totalStops}</span>
          </span>
          <button
            type="button"
            onClick={() => setBook(true)}
            className="flex h-11 flex-none cursor-pointer items-center gap-2 rounded-full bg-mist pr-3.5 pl-1.5 transition-colors hover:bg-[#e9e2d6]"
            aria-label={`Sticker book, ${stickers} of ${chapters.length}`}
          >
            <span className="flex -space-x-2.5">
              {chapters.slice(0, 3).map((chapter) => {
                const host = find(chapter.host);
                const got = progress.chests.includes(chapter.id);
                return (
                  <Face
                    key={chapter.id}
                    character={host}
                    plain
                    className={cx("size-8 ring-2 ring-mist", !got && "opacity-45 grayscale")}
                  />
                );
              })}
            </span>
            <span className="text-[0.85rem] font-bold">
              {stickers}/{chapters.length}
            </span>
          </button>
        </div>
      </div>

      {/* ---- the map ---- */}
      <div ref={ref} className="relative w-full overflow-hidden" style={{ height: geo?.height ?? 1200 }}>
        {geo && (
          <>
            {/* The islands, one per friend. */}
            {geo.zones.map((zone, ci) => (
              <Island
                key={chapters[ci].id}
                index={ci}
                chapter={chapters[ci]}
                previous={chapters[ci - 1]}
                zone={zone}
                width={width}
                roadD={geo.roadD}
                roadSamples={geo.samples}
                keepClear={geo.signs}
                reached={firstOf(ci) <= current}
                compact={geo.compact}
              />
            ))}

            {/* One sky over every island. */}
            <Clouds width={width} height={geo.height} compact={geo.compact} />

            {/* The road: a sandy path, the stretch already walked marked in the buddy's colour. */}
            <svg className="pointer-events-none absolute inset-0" width={width} height={geo.height} aria-hidden>
              <path d={geo.roadD} fill="none" stroke="#e2c894" strokeWidth={geo.compact ? 40 : 50} strokeLinecap="round" strokeLinejoin="round" />
              <path d={geo.roadD} fill="none" stroke="#f8ecd1" strokeWidth={geo.compact ? 32 : 40} strokeLinecap="round" strokeLinejoin="round" />
              <path d={geo.roadD} fill="none" stroke="#e2c894" strokeWidth="4" strokeLinecap="round" strokeDasharray="0.1 16" />
              {at > 0 && (
                <path
                  d={road(geo.nodes.slice(0, at + 1))}
                  fill="none"
                  stroke={buddy.color}
                  strokeOpacity="0.5"
                  strokeWidth="9"
                  strokeLinecap="round"
                />
              )}
            </svg>

            {/* Island signs, each host stepping out of theirs. */}
            {geo.signs.map((sign, ci) => {
              const chapter = chapters[ci];
              const host = find(chapter.host);
              const reached = firstOf(ci) <= current;
              const done = chapter.stops.filter((s) => progress.done.includes(s.id)).length;
              return (
                <section
                  key={chapter.id}
                  className="absolute z-10"
                  style={{ ...tint(host), left: sign.x, top: sign.y, width: sign.w, height: sign.h }}
                  aria-label={`Island ${ci + 1}: ${chapter.title}`}
                >
                  <div
                    className={cx(
                      "relative h-full overflow-hidden rounded-panel p-5 pr-[38%] shadow-pop transition-colors duration-700",
                      reached ? "bg-(--c) text-(--c-on)" : "bg-paper/85 text-ink-faint backdrop-blur",
                    )}
                  >
                    <p className="flex items-center gap-1.5 text-[0.72rem] font-bold tracking-[0.14em] uppercase opacity-75">
                      {!reached && <Icon name="lock" className="size-3.5" />}
                      Island {ci + 1}
                    </p>
                    <h2 className="mt-1 font-display text-[clamp(1.3rem,3.4vw,1.7rem)] leading-[1.05] font-medium text-balance">
                      {chapter.title}
                    </h2>
                    <p className="mt-1.5 line-clamp-2 text-[0.88rem] leading-snug font-medium opacity-90">{chapter.blurb}</p>
                    <p className="mt-2.5 flex gap-1" aria-label={`${done} of ${chapter.stops.length} stars`}>
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
                      "pointer-events-none absolute right-2 bottom-0 h-[122%] transition-[filter,opacity] duration-700",
                      !reached && "opacity-50 grayscale",
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
                        "pointer-events-none absolute z-20 flex w-[150px] -translate-x-1/2 flex-col items-center text-center text-[0.8rem] leading-tight font-bold",
                        state === "current" ? "text-ink" : "text-ink-soft",
                      )}
                      style={{ left: node.x, top: node.y + node.size / 2 + 8 }}
                    >
                      {/* The waiting stop is marked under itself, never above, so the
                          tag cannot land on the name of the stop before it. */}
                      {state === "current" && !walking && (
                        <span className="mb-1 animate-float rounded-full bg-ink px-2.5 py-0.5 text-[0.66rem] font-extrabold tracking-[0.08em] whitespace-nowrap text-white uppercase">
                          {movie ? "Movie time" : "Up next"}
                        </span>
                      )}
                      <span className="rounded-full bg-paper/80 px-2 py-0.5 backdrop-blur-sm">{stop.title}</span>
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
                profileId={profileId}
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

      {book && <StickerBook chapters={chapters} characters={characters} progress={progress} onClose={() => setBook(false)} />}
    </main>
  );
}

/* ----------------------------------------------------------- stop card -- */

function StopCard({
  item,
  node,
  width,
  characters,
  profileId,
  watched,
  onPlay,
  onClose,
}: {
  item: Extract<TrailItem, { kind: "stop" }>;
  node: Placed;
  width: number;
  characters: CharacterData[];
  /** Whose favourites the heart saves to; "guest" before anyone is picked, when there is no heart. */
  profileId: string;
  watched: boolean;
  onPlay: (stop: ResolvedStop) => void;
  onClose: () => void;
}) {
  const stop = item.stop;
  const host = characters.find((c) => c.id === stop.host) ?? characters[0];
  const cardWidth = Math.min(300, width - 16);
  const favourites = parseFavourites(useSyncExternalStore(subscribeDevice, () => readFavouritesRaw(profileId), () => "[]"));
  const loved = favourites.includes(stop.showId);
  const canLove = profileId !== "guest";
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
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => onPlay(stop)}
              className="inline-flex h-13 flex-1 cursor-pointer items-center justify-center gap-2.5 rounded-full bg-(--c) text-[1.02rem] font-bold text-(--c-on) transition-transform active:scale-[0.98]"
            >
              <Icon name={watched ? "replay" : "play"} className="size-5" />
              {watched ? "Watch again" : "Play"}
            </button>
            {canLove && (
              <button
                type="button"
                onClick={() => toggleFavourite(profileId, stop.showId)}
                aria-pressed={loved}
                aria-label={loved ? `Remove ${stop.showTitle} from favourites` : `Add ${stop.showTitle} to favourites`}
                className="grid size-13 flex-none cursor-pointer place-items-center rounded-full bg-mist transition-transform active:scale-90"
              >
                <Icon name={loved ? "heart-filled" : "heart"} className={cx("size-6", loved ? "text-berry" : "text-ink-soft")} />
              </button>
            )}
          </div>
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

/* -------------------------------------------------------- sticker book -- */

function StickerBook({
  chapters,
  characters,
  progress,
  onClose,
}: {
  chapters: ResolvedChapter[];
  characters: CharacterData[];
  progress: TrailProgress;
  onClose: () => void;
}) {
  const got = chapters.filter((c) => progress.chests.includes(c.id)).length;
  return (
    <div className="fixed inset-0 z-[75] grid animate-fade place-items-center bg-ink/45 p-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="book-title">
      <button type="button" aria-label="Close" className="absolute inset-0 cursor-default" onClick={onClose} />
      <div className="relative w-full max-w-[520px] animate-sheet rounded-stage bg-paper p-7 shadow-lift max-[480px]:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="book-title" className="font-display text-[1.7rem] leading-tight font-medium">
              Sticker book
            </h2>
            <p className="mt-1 text-[0.95rem] text-ink-soft">
              {got} of {chapters.length} collected. Finish an island to open its chest.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-11 flex-none cursor-pointer place-items-center rounded-full text-ink-soft transition-colors hover:bg-mist hover:text-ink"
          >
            <Icon name="close" className="size-5" />
          </button>
        </div>
        <ul className="mt-6 grid grid-cols-4 gap-x-3 gap-y-5 max-[420px]:grid-cols-3">
          {chapters.map((chapter) => {
            const host = characters.find((c) => c.id === chapter.host) ?? characters[0];
            const have = progress.chests.includes(chapter.id);
            return (
              <li key={chapter.id} className="flex flex-col items-center text-center" style={tint(host)}>
                <span
                  className={cx(
                    "grid aspect-square w-full max-w-[92px] place-items-center rounded-full p-[4px]",
                    have ? "bg-(--c)" : "border-2 border-dashed border-ink/15",
                  )}
                >
                  <Face character={host} plain className={cx("block size-full", !have && "opacity-35 grayscale")} />
                </span>
                <span className={cx("mt-2 text-[0.78rem] leading-tight font-bold", have ? "text-ink" : "text-ink-faint")}>
                  {chapter.title}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
