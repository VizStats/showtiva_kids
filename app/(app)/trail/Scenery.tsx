// The landscape under the trail: one island per friend, drawn as a flat,
// top-down adventure map. Bloop's meadow has ponds, Kai's island is a sandy
// road through the sea, Cog's hills turn a windmill, Nova's meadow sparkles
// at dusk, Zip's park has ramps, Coco's beach is lit by the moon, and the
// finale is a splash park.
//
// Everything is vector and seeded from the island, so the map is the same on
// every visit, sharp at any size, and costs no image downloads. Decorations
// are placed on a jittered grid and kept clear of the road, the stops and the
// island signs, so the scenery frames the path without crowding it.
//
// And it moves: islands melt into each other rather than meeting at an edge,
// water ripples and foams and laps at the shore, trees sway, boats rock,
// ponds ring, and clouds drift over the lot.

import type { CSSProperties } from "react";

import type { CharacterId, ResolvedChapter } from "@/lib/catalog-types";

import { seeded } from "@/app/_components/ShowArt";

export type Theme = "meadow" | "beach" | "hills" | "twilight" | "park" | "night" | "splash";

const THEME_BY_CHAPTER: Record<string, Theme> = {
  welcome: "meadow",
  beach: "beach",
  workshop: "hills",
  stage: "twilight",
  skatepark: "park",
  moonlight: "night",
  premiere: "splash",
};

const THEME_BY_HOST: Record<CharacterId, Theme> = {
  bloop: "meadow",
  kai: "beach",
  cog: "hills",
  nova: "twilight",
  zip: "park",
  coco: "night",
};

export function themeFor(chapter: ResolvedChapter): Theme {
  return THEME_BY_CHAPTER[chapter.id] ?? THEME_BY_HOST[chapter.host] ?? "meadow";
}

type Decor =
  | "tree"
  | "bush"
  | "flowers"
  | "pond"
  | "rock"
  | "windmill"
  | "palm"
  | "starfish"
  | "umbrella"
  | "wave"
  | "sparkle"
  | "note"
  | "ramp"
  | "cone"
  | "bubble"
  | "ring"
  | "boat";

type Where = "land" | "water" | "any";

interface Palette {
  /** Grass, or the sea for the water islands. */
  ground: string;
  /** Soft patches of a second shade, for texture. */
  patch?: string;
  /** Water islands: the land that follows the road. */
  land?: string;
  shore?: string;
  /** Flower colour. */
  bloom: string;
  decor: { type: Decor; where: Where; weight: number }[];
}

const PALETTES: Record<Theme, Palette> = {
  meadow: {
    ground: "#b5df8a",
    patch: "#a7d67b",
    bloom: "#ff8fb1",
    decor: [
      { type: "tree", where: "any", weight: 4 },
      { type: "bush", where: "any", weight: 3 },
      { type: "flowers", where: "any", weight: 3 },
      { type: "pond", where: "any", weight: 1 },
      { type: "rock", where: "any", weight: 1 },
    ],
  },
  hills: {
    ground: "#a6d884",
    patch: "#95cc72",
    bloom: "#ff9a3c",
    decor: [
      { type: "tree", where: "any", weight: 3 },
      { type: "windmill", where: "any", weight: 1 },
      { type: "flowers", where: "any", weight: 3 },
      { type: "bush", where: "any", weight: 2 },
      { type: "rock", where: "any", weight: 1 },
    ],
  },
  park: {
    ground: "#c4e577",
    patch: "#b3da66",
    bloom: "#ffffff",
    decor: [
      { type: "tree", where: "any", weight: 3 },
      { type: "ramp", where: "any", weight: 2 },
      { type: "cone", where: "any", weight: 2 },
      { type: "bush", where: "any", weight: 2 },
      { type: "flowers", where: "any", weight: 1 },
    ],
  },
  twilight: {
    ground: "#c3b6ee",
    patch: "#b2a4e6",
    bloom: "#ff8fd0",
    decor: [
      { type: "sparkle", where: "any", weight: 4 },
      { type: "note", where: "any", weight: 2 },
      { type: "bush", where: "any", weight: 2 },
      { type: "flowers", where: "any", weight: 2 },
    ],
  },
  beach: {
    ground: "#7fd0ea",
    land: "#f6e4b9",
    shore: "#ffffff",
    bloom: "#ff8fb1",
    decor: [
      { type: "palm", where: "land", weight: 3 },
      { type: "starfish", where: "land", weight: 2 },
      { type: "umbrella", where: "land", weight: 1 },
      { type: "wave", where: "water", weight: 3 },
      { type: "boat", where: "water", weight: 1 },
    ],
  },
  night: {
    ground: "#2e3977",
    land: "#dccba6",
    shore: "#6878c9",
    bloom: "#ffd6e6",
    decor: [
      { type: "sparkle", where: "water", weight: 4 },
      { type: "wave", where: "water", weight: 2 },
      { type: "palm", where: "land", weight: 2 },
      { type: "starfish", where: "land", weight: 1 },
    ],
  },
  splash: {
    ground: "#8fdbe6",
    land: "#eef7f4",
    shore: "#ffffff",
    bloom: "#ff8fb1",
    decor: [
      { type: "bubble", where: "water", weight: 4 },
      { type: "ring", where: "water", weight: 2 },
      { type: "wave", where: "water", weight: 1 },
      { type: "boat", where: "water", weight: 1 },
      { type: "palm", where: "land", weight: 1 },
      { type: "umbrella", where: "land", weight: 1 },
    ],
  },
};

/* ------------------------------------------------------ the pieces -- */

function Piece({
  type,
  x,
  y,
  s,
  bloom,
  night,
  delay,
  moving,
}: {
  type: Decor;
  x: number;
  y: number;
  s: number;
  bloom: string;
  night: boolean;
  delay: number;
  /** Sways in the breeze (trees, palms, bushes). */
  moving: boolean;
}) {
  const t = `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(2)})`;
  switch (type) {
    case "tree":
      return (
        <g transform={t}>
          <ellipse cx="0" cy="16" rx="16" ry="5" fill="rgb(0 0 0 / 0.08)" />
          <g className={moving ? "animate-rustle" : undefined} style={moving ? { transformBox: "fill-box", transformOrigin: "50% 100%", animationDelay: `-${delay}s` } : undefined}>
            <rect x="-3" y="2" width="6" height="14" rx="3" fill="#a8784f" />
            <circle cx="0" cy="-6" r="18" fill="#62b451" />
            <circle cx="-5" cy="-11" r="10" fill="#79c665" />
          </g>
        </g>
      );
    case "bush":
      return (
        <g transform={t}>
          <g className={moving ? "animate-rustle" : undefined} style={moving ? { transformBox: "fill-box", transformOrigin: "50% 100%", animationDelay: `-${delay}s` } : undefined}>
            <circle cx="-9" cy="2" r="9" fill={night ? "#9d8ddb" : "#78c25f"} />
            <circle cx="8" cy="3" r="8" fill={night ? "#9d8ddb" : "#78c25f"} />
            <circle cx="0" cy="-4" r="10" fill={night ? "#ab9ce3" : "#86cc6c"} />
          </g>
        </g>
      );
    case "flowers":
      return (
        <g transform={t}>
          {[
            [-9, 2],
            [0, -6],
            [9, 3],
          ].map(([fx, fy], i) => (
            <g key={i} transform={`translate(${fx} ${fy})`}>
              {[0, 72, 144, 216, 288].map((a) => (
                <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 3.4} cy={Math.sin((a * Math.PI) / 180) * 3.4} r="2.6" fill={bloom} />
              ))}
              <circle r="2" fill="#ffd23f" />
            </g>
          ))}
        </g>
      );
    case "pond":
      return (
        <g transform={t}>
          <ellipse cx="0" cy="0" rx="40" ry="22" fill="#86cfe8" />
          <ellipse cx="-8" cy="-4" rx="22" ry="9" fill="#a9def0" />
          <ellipse
            cx="2"
            cy="2"
            rx="26"
            ry="13"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.85"
            strokeWidth="1.6"
            className="animate-ripple"
            style={{ transformBox: "fill-box", transformOrigin: "center", animationDelay: `-${delay}s` }}
          />
          <ellipse cx="18" cy="6" rx="6" ry="3" fill="#62b451" />
        </g>
      );
    case "rock":
      return (
        <g transform={t}>
          <path d="M-14 6 C-14 -6 -4 -10 4 -9 C13 -8 16 0 14 6 Z" fill="#d6d0c2" />
          <path d="M-6 -6 C-2 -8 3 -8 6 -6" stroke="#ebe7dd" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
      );
    case "windmill":
      return (
        <g transform={t}>
          <ellipse cx="0" cy="30" rx="18" ry="5" fill="rgb(0 0 0 / 0.08)" />
          <path d="M-9 30 L-5 -8 L5 -8 L9 30 Z" fill="#f3e7d2" />
          <rect x="-3" y="14" width="6" height="16" rx="2" fill="#c98b52" />
          <g className="animate-spin-slow [transform-box:fill-box] [transform-origin:center]">
            <g transform="translate(0 -10)">
              {[0, 90, 180, 270].map((a) => (
                <rect key={a} x="-3.5" y="-26" width="7" height="24" rx="3" fill="#ff8717" transform={`rotate(${a})`} />
              ))}
              <circle r="4" fill="#c25a00" />
            </g>
          </g>
        </g>
      );
    case "palm":
      return (
        <g transform={t}>
          <ellipse cx="4" cy="22" rx="16" ry="4" fill="rgb(0 0 0 / 0.08)" />
          <g className={moving ? "animate-rustle" : undefined} style={moving ? { transformBox: "fill-box", transformOrigin: "50% 100%", animationDelay: `-${delay}s` } : undefined}>
            <path d="M2 22 C 0 10, -2 2, 2 -10" stroke="#b98552" strokeWidth="5" strokeLinecap="round" fill="none" />
            {[-150, -100, -40, 10, 60].map((a) => (
              <path
                key={a}
                d="M0 0 C 8 -6, 18 -6, 24 0 C 16 -1, 8 0, 0 0 Z"
                fill={night ? "#3a8a6a" : "#3fae6b"}
                transform={`translate(2 -10) rotate(${a})`}
              />
            ))}
          </g>
        </g>
      );
    case "starfish":
      return (
        <path
          transform={`${t} rotate(${(x * 7) % 60})`}
          d="M0 -9 L2.6 -3 L9 -2.8 L4 1.4 L5.6 8 L0 4.4 L-5.6 8 L-4 1.4 L-9 -2.8 L-2.6 -3 Z"
          fill="#ff9a6b"
        />
      );
    case "umbrella":
      return (
        <g transform={t}>
          <ellipse cx="0" cy="14" rx="16" ry="4" fill="rgb(0 0 0 / 0.08)" />
          <path d="M0 -2 L0 14" stroke="#8a6a4a" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M-18 -2 A18 16 0 0 1 18 -2 Z" fill="#ff6b7a" />
          <path d="M-6 -2 A6 16 0 0 1 6 -2 Z" fill="#ffffff" />
        </g>
      );
    case "wave":
      return (
        <g transform={t}>
          <g className="animate-swell" style={{ animationDelay: `-${delay}s` }}>
            <path d="M-16 0 C -11 -6, -5 -6, 0 0 C 5 6, 11 6, 16 0" stroke="#ffffff" strokeOpacity={night ? 0.35 : 0.75} strokeWidth="3" strokeLinecap="round" fill="none" />
          </g>
        </g>
      );
    case "sparkle":
      return (
        <path
          transform={t}
          className="animate-pulse"
          style={{ animationDelay: `${delay}s` }}
          d="M0 -9 C 1 -3, 3 -1, 9 0 C 3 1, 1 3, 0 9 C -1 3, -3 1, -9 0 C -3 -1, -1 -3, 0 -9 Z"
          fill={night ? "#fff4c2" : "#ffffff"}
        />
      );
    case "note":
      return (
        <path
          transform={`${t} rotate(-10)`}
          d="M-2 8 a4 4 0 1 1 -3 -4 V-10 l12 -3 v14 a4 4 0 1 1 -3 -4 V-7 l-6 1.4 z"
          fill="#8a6fd6"
          fillOpacity="0.55"
        />
      );
    case "ramp":
      return (
        <g transform={t}>
          <rect x="-22" y="-14" width="44" height="28" rx="6" fill="#e9e5dc" />
          <path d="M-22 -14 H-12 C-12 4, -2 14, 22 14 V-14 Z" fill="#d8d3c7" opacity="0.8" />
          <rect x="-22" y="-14" width="44" height="3" rx="1.5" fill="#bdb6a7" />
        </g>
      );
    case "cone":
      return (
        <g transform={t}>
          <rect x="-8" y="6" width="16" height="4" rx="1.5" fill="#e0681a" />
          <path d="M-5 6 L0 -10 L5 6 Z" fill="#ff8a2a" />
          <path d="M-3.2 0 H3.2" stroke="#ffffff" strokeWidth="2" />
        </g>
      );
    case "bubble":
      return (
        <g transform={t} className="animate-float" style={{ animationDelay: `${delay}s` }}>
          <circle r="9" fill="rgb(255 255 255 / 0.25)" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="2" />
          <circle cx="-3" cy="-3" r="2" fill="#ffffff" />
        </g>
      );
    case "ring":
      return (
        <g transform={t}>
          <circle r="14" fill="none" stroke="#ff8fb1" strokeWidth="8" />
          <circle r="14" fill="none" stroke="#ffffff" strokeWidth="8" strokeDasharray="7 15" />
        </g>
      );
    case "boat":
      return (
        <g transform={t}>
          <g
            className="animate-rock-boat"
            style={{ transformBox: "fill-box", transformOrigin: "50% 85%", animationDelay: `-${delay}s` }}
          >
            <ellipse cx="0" cy="11" rx="22" ry="4" fill="#ffffff" fillOpacity="0.4" />
            <path d="M-18 2 H18 L12 10 H-12 Z" fill={night ? "#b8566a" : "#ff6b7a"} />
            <path d="M0 2 V-22" stroke="#8a6a4a" strokeWidth="2" strokeLinecap="round" />
            <path d="M1.5 -20 L14 0 H1.5 Z" fill="#ffffff" />
            <path d="M-1.5 -15 L-10 0 H-1.5 Z" fill="#ffd23f" />
          </g>
        </g>
      );
  }
}

/* ---------------------------------------------------------- placing -- */

export interface ZoneBox {
  top: number;
  bottom: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface IslandProps {
  index: number;
  chapter: ResolvedChapter;
  zone: ZoneBox;
  width: number;
  /** The whole road, in map coordinates. */
  roadD: string;
  /** Points along the road, for keeping decorations off it. */
  roadSamples: { x: number; y: number }[];
  /** Island signs and anything else the scenery must leave clear. */
  keepClear: Rect[];
  /** The island before this one, to know whether they meet at a coast. */
  previous?: ResolvedChapter;
  reached: boolean;
  compact: boolean;
}

/**
 * How far each island fades in over the one before it. No hard edge between
 * two adventures: the meadow melts into the sea, the sea into the hills.
 */
const BLEND = 220;
const BLEND_COMPACT = 150;

const isWater = (chapter: ResolvedChapter | undefined) => (chapter ? Boolean(PALETTES[themeFor(chapter)].land) : false);

export function Island({ index, chapter, previous, zone, width, roadD, roadSamples, keepClear, reached, compact }: IslandProps) {
  const theme = themeFor(chapter);
  const palette = PALETTES[theme];
  const water = Boolean(palette.land);
  const night = theme === "night" || theme === "twilight";
  const first = index === 0;
  const blend = compact ? BLEND_COMPACT : BLEND;
  // Each island reaches half a blend up into the one before and half a blend
  // down into the one after, so the fade always has ground under it.
  const top = zone.top - (first ? 0 : blend / 2);
  const height = zone.bottom + blend / 2 - top;
  const random = seeded(`island-${chapter.id}`);
  const id = `island-${chapter.id}`;
  // Where land meets sea, waves lap along the join.
  const coast = !first && water !== isWater(previous);

  // Wide enough that the sand has room for palms and starfish between the
  // road's clear lane and the water's edge.
  const landWidth = compact ? 360 : 540;
  const clearance = compact ? 112 : 160;

  const nearestRoad = (x: number, y: number) => {
    let best = Infinity;
    for (const p of roadSamples) {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < best) best = d;
    }
    return best;
  };
  const blocked = (x: number, y: number, pad: number) =>
    keepClear.some((r) => x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad);

  const pick = (where: Where) => {
    const options = palette.decor.filter((d) => d.where === where || d.where === "any");
    const total = options.reduce((n, d) => n + d.weight, 0);
    let roll = random() * total;
    for (const option of options) {
      roll -= option.weight;
      if (roll <= 0) return option.type;
    }
    return options[options.length - 1]?.type;
  };

  // A jittered grid over the island; each cell may hold one piece.
  const cell = compact ? 96 : 128;
  const pieces: { type: Decor; x: number; y: number; s: number; delay: number; moving: boolean }[] = [];
  for (let gy = zone.top + cell * 0.4; gy < zone.bottom - 20; gy += cell) {
    for (let gx = cell * 0.3; gx < width; gx += cell) {
      const x = gx + (random() - 0.5) * cell * 0.8;
      const y = gy + (random() - 0.5) * cell * 0.8;
      const skip = random() < 0.28;
      if (skip || blocked(x, y, 36)) continue;
      const d = nearestRoad(x, y);
      if (d < clearance) continue;
      let where: Where = "any";
      if (water) {
        if (d < landWidth / 2 - 26) where = "land";
        else if (d > landWidth / 2 + 34) where = "water";
        else continue;
      }
      const type = pick(where);
      if (!type) continue;
      pieces.push({
        type,
        x,
        y: y - top,
        s: (compact ? 0.85 : 1.05) + random() * 0.45,
        delay: random() * 4,
        // Most of the trees move in the breeze; a few stand still, so the
        // map breathes rather than wobbles.
        moving: random() < 0.7,
      });
    }
  }

  // Soft patches of a second shade give the grass some ground to it.
  const patches = palette.patch
    ? Array.from({ length: Math.round((width * height) / 90000) + 3 }, () => ({
        x: random() * width,
        y: random() * height,
        rx: 70 + random() * 140,
        ry: 40 + random() * 70,
      }))
    : [];

  // A wavy line right across the island, for the lapping shoreline.
  const shoreLine = (y: number, amplitude: number, length: number) => {
    let d = `M -40 ${y}`;
    for (let x = -40; x < width + 40; x += length) {
      d += ` q ${length / 4} ${-amplitude} ${length / 2} 0 t ${length / 2} 0`;
    }
    return d;
  };

  const fade = first ? undefined : `linear-gradient(to bottom, transparent, #000 ${blend}px)`;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 transition-[filter] duration-1000"
      style={{
        top,
        height,
        maskImage: fade,
        WebkitMaskImage: fade,
        filter: reached ? "saturate(1)" : "saturate(0.65)",
        // Islands scrolled far off screen skip painting (and their animation) entirely.
        contentVisibility: "auto",
        containIntrinsicSize: `auto ${height}px`,
      }}
    >
      <svg width={width} height={height} className="block overflow-hidden">
        {water && (
          <defs>
            {/* Ripples drifting across the open water. */}
            <pattern id={`${id}-ripples`} width="160" height="96" patternUnits="userSpaceOnUse">
              <g fill="none" stroke="#ffffff" strokeOpacity={night ? 0.2 : 0.4} strokeWidth="2.4" strokeLinecap="round">
                <path d="M14 22 q9 -7 18 0 t18 0" />
                <path d="M92 58 q8 -6 16 0 t16 0" />
                <path d="M46 84 q7 -5 14 0" />
              </g>
              <animateTransform attributeName="patternTransform" type="translate" from="0 0" to="160 0" dur="16s" repeatCount="indefinite" />
            </pattern>
          </defs>
        )}
        <rect width={width} height={height} fill={palette.ground} />
        {patches.map((p, i) => (
          <ellipse key={i} cx={p.x} cy={p.y} rx={p.rx} ry={p.ry} fill={palette.patch} />
        ))}
        {water && <rect width={width} height={height} fill={`url(#${id}-ripples)`} />}
        {coast && (
          <g fill="none" stroke="#ffffff" strokeLinecap="round">
            <path d={shoreLine(blend * 0.52, 7, 90)} strokeOpacity="0.75" strokeWidth="3" strokeDasharray="46 22" className="animate-lap" />
            <path
              d={shoreLine(blend * 0.7, 5, 70)}
              strokeOpacity="0.45"
              strokeWidth="2.5"
              strokeDasharray="30 30"
              className="animate-lap"
              style={{ animationDuration: "9s", animationDirection: "reverse" }}
            />
          </g>
        )}
        {water && (
          <g transform={`translate(0 ${-top})`}>
            {/* Surf washing up the sand and back, then the wet sand, then the sand. */}
            <path
              d={roadD}
              fill="none"
              stroke="#ffffff"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-wash"
              style={
                {
                  "--wash-from": `${landWidth + 18}px`,
                  "--wash-to": `${landWidth + 52}px`,
                  "--wash-strength": night ? 0.35 : 0.7,
                } as CSSProperties
              }
            />
            <path d={roadD} fill="none" stroke={palette.shore} strokeOpacity="0.55" strokeWidth={landWidth + 22} strokeLinecap="round" strokeLinejoin="round" />
            <path d={roadD} fill="none" stroke={palette.land} strokeWidth={landWidth} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}
        {theme === "night" && (
          <g transform={`translate(${width - (compact ? 60 : 140)} ${(first ? 0 : blend / 2) + 90})`}>
            <circle r={compact ? 44 : 64} fill="#fff4c2" fillOpacity="0.18" className="animate-glow" style={{ transformBox: "fill-box", transformOrigin: "center" }} />
            <circle r={compact ? 26 : 38} fill="#fff4c2" />
            <circle cx={compact ? 11 : 16} cy={compact ? -7 : -10} r={compact ? 23 : 34} fill={palette.ground} />
            {/* Its light on the water, shimmering. */}
            {[0, 1, 2, 3].map((i) => (
              <rect
                key={i}
                x={-(18 - i * 3)}
                y={(compact ? 40 : 56) + i * 14}
                width={2 * (18 - i * 3)}
                height="3"
                rx="1.5"
                fill="#fff4c2"
                fillOpacity={0.5 - i * 0.1}
                className="animate-pulse"
                style={{ animationDelay: `${i * 0.35}s` }}
              />
            ))}
          </g>
        )}
        {pieces.map((p, i) => (
          <Piece key={i} type={p.type} x={p.x} y={p.y} s={p.s} bloom={palette.bloom} night={night} delay={p.delay} moving={p.moving} />
        ))}
      </svg>
      {/* Islands not reached yet sit under a light mist, still colourful
          enough to want to get there. It lifts slowly when the buddy arrives. */}
      <div className={`absolute inset-0 bg-white/20 transition-opacity duration-1000 ${reached ? "opacity-0" : "opacity-100"}`} />
    </div>
  );
}

/**
 * Clouds drifting over the whole map, each with its shadow on the ground:
 * one sky across every island, so the map moves as one place.
 */
export function Clouds({ width, height, compact }: { width: number; height: number; compact: boolean }) {
  const random = seeded("clouds");
  const count = Math.max(3, Math.round(height / (compact ? 640 : 780)));
  const clouds = Array.from({ length: count }, (_, i) => ({
    top: (i + 0.25 + random() * 0.5) * (height / count),
    scale: (compact ? 0.7 : 1) * (0.8 + random() * 0.5),
    duration: 80 + random() * 60,
    delay: -random() * 140,
  }));

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {clouds.map((cloud, i) => (
        <div
          key={i}
          className="absolute left-0 animate-cloud"
          style={
            {
              top: cloud.top,
              animationDuration: `${cloud.duration}s`,
              animationDelay: `${cloud.delay}s`,
              "--from": `${-320 * cloud.scale}px`,
              "--to": `${width + 40}px`,
            } as CSSProperties
          }
        >
          <svg width={280 * cloud.scale} height={170 * cloud.scale} viewBox="0 0 280 170">
            <ellipse cx="170" cy="150" rx="92" ry="16" fill="rgb(30 26 60 / 0.07)" />
            <g fill="#ffffff" fillOpacity="0.88">
              <circle cx="90" cy="70" r="40" />
              <circle cx="140" cy="52" r="52" />
              <circle cx="194" cy="74" r="38" />
              <rect x="60" y="70" width="170" height="40" rx="20" />
            </g>
          </svg>
        </div>
      ))}
    </div>
  );
}
