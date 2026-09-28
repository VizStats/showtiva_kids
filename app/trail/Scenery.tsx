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

import type { CharacterId, ResolvedChapter } from "@/lib/catalog-types";

import { seeded } from "../_components/ShowArt";

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
  | "ring";

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
      { type: "palm", where: "land", weight: 1 },
      { type: "umbrella", where: "land", weight: 1 },
    ],
  },
};

/* ------------------------------------------------------ the pieces -- */

function Piece({ type, x, y, s, bloom, night, delay }: { type: Decor; x: number; y: number; s: number; bloom: string; night: boolean; delay: number }) {
  const t = `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(2)})`;
  switch (type) {
    case "tree":
      return (
        <g transform={t}>
          <ellipse cx="0" cy="16" rx="16" ry="5" fill="rgb(0 0 0 / 0.08)" />
          <rect x="-3" y="2" width="6" height="14" rx="3" fill="#a8784f" />
          <circle cx="0" cy="-6" r="18" fill="#62b451" />
          <circle cx="-5" cy="-11" r="10" fill="#79c665" />
        </g>
      );
    case "bush":
      return (
        <g transform={t}>
          <circle cx="-9" cy="2" r="9" fill={night ? "#9d8ddb" : "#78c25f"} />
          <circle cx="8" cy="3" r="8" fill={night ? "#9d8ddb" : "#78c25f"} />
          <circle cx="0" cy="-4" r="10" fill={night ? "#ab9ce3" : "#86cc6c"} />
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
        <g transform={t} className="animate-float" style={{ animationDelay: `${delay}s` }}>
          <path d="M-16 0 C -11 -6, -5 -6, 0 0 C 5 6, 11 6, 16 0" stroke="#ffffff" strokeOpacity={night ? 0.35 : 0.7} strokeWidth="3" strokeLinecap="round" fill="none" />
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
  reached: boolean;
  compact: boolean;
}

/** How far the top of each island reaches into the one above, as a soft wave. */
export const SHORE = 44;

export function Island({ index, chapter, zone, width, roadD, roadSamples, keepClear, reached, compact }: IslandProps) {
  const theme = themeFor(chapter);
  const palette = PALETTES[theme];
  const water = Boolean(palette.land);
  const night = theme === "night" || theme === "twilight";
  const top = zone.top - (index === 0 ? 0 : SHORE);
  const height = zone.bottom - top;
  const random = seeded(`island-${chapter.id}`);

  // The top edge: a gentle wave, so islands meet like coastlines, not boxes.
  const wave = index === 0 ? 0 : SHORE;
  const crest = 14;
  const steps = Math.max(4, Math.round(width / 220));
  let edge = `M 0 ${wave}`;
  for (let i = 0; i < steps; i += 1) {
    const x0 = (i / steps) * width;
    const x1 = ((i + 1) / steps) * width;
    const lift = (i % 2 === 0 ? -1 : 1) * crest * (0.6 + random() * 0.4);
    edge += ` Q ${((x0 + x1) / 2).toFixed(1)} ${(wave + lift).toFixed(1)} ${x1.toFixed(1)} ${wave}`;
  }
  const outline = `${edge} L ${width} ${height} L 0 ${height} Z`;
  const clip = `island-clip-${chapter.id}`;

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
  const pieces: { type: Decor; x: number; y: number; s: number; delay: number }[] = [];
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
      pieces.push({ type, x, y: y - top, s: (compact ? 0.85 : 1.05) + random() * 0.45, delay: random() * 3 });
    }
  }

  // Soft patches of a second shade give the grass some ground to it.
  const patches = palette.patch
    ? Array.from({ length: Math.round((width * height) / 90000) + 3 }, () => ({
        x: random() * width,
        y: SHORE + random() * (height - SHORE),
        rx: 70 + random() * 140,
        ry: 40 + random() * 70,
      }))
    : [];

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 transition-[filter] duration-700"
      style={{ top, height, filter: reached ? undefined : "saturate(0.6) brightness(1.02)" }}
    >
      <svg width={width} height={height} className="block overflow-hidden">
        <defs>
          <clipPath id={clip}>
            <path d={outline} />
          </clipPath>
        </defs>
        <path d={outline} fill={palette.ground} />
        <g clipPath={`url(#${clip})`}>
          {patches.map((p, i) => (
            <ellipse key={i} cx={p.x} cy={p.y} rx={p.rx} ry={p.ry} fill={palette.patch} />
          ))}
          {water && (
            <g transform={`translate(0 ${-top})`}>
              <path d={roadD} fill="none" stroke={palette.shore} strokeOpacity="0.55" strokeWidth={landWidth + 22} strokeLinecap="round" strokeLinejoin="round" />
              <path d={roadD} fill="none" stroke={palette.land} strokeWidth={landWidth} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          )}
          {theme === "night" && (
            <g transform={`translate(${width - (compact ? 60 : 140)} ${SHORE + 90})`}>
              <circle r={compact ? 26 : 38} fill="#fff4c2" />
              <circle cx={compact ? 11 : 16} cy={compact ? -7 : -10} r={compact ? 23 : 34} fill={palette.ground} />
            </g>
          )}
          {pieces.map((p, i) => (
            <Piece key={i} type={p.type} x={p.x} y={p.y} s={p.s} bloom={palette.bloom} night={night} delay={p.delay} />
          ))}
        </g>
      </svg>
      {/* Islands not reached yet sit under a light mist: still colourful
          enough to want to get there. */}
      {!reached && <div className="absolute inset-0 bg-white/15" />}
    </div>
  );
}
