import type { CSSProperties, ReactNode } from "react";

import { cx, tint } from "@/lib/cx";
import type { Character as CharacterData, CharacterId, Motif, Show } from "@/lib/catalog-types";

/**
 * Artwork for a show, drawn from the characters themselves.
 *
 * There are no posters yet, and stock photography would betray the brand in
 * one frame, so every card is composed: the host's colour as a flat ground and
 * the host standing large in front of one soft circle. Everything is seeded
 * from the show and episode, so a card looks the same every visit while no two
 * cards share a layout. When real key art exists, this component is the one
 * thing to swap.
 */

export type ArtShow = Pick<Show, "id" | "host" | "cast" | "motif" | "tone" | "art">;

interface ShowArtProps {
  show: ArtShow;
  characters: CharacterData[];
  /** Varies the layout per episode: "s1e3". */
  seed?: string;
  className?: string;
  style?: CSSProperties;
  /** Leave the characters out, for a layout that places them itself. */
  bare?: boolean;
  tone?: Show["tone"];
  children?: ReactNode;
}

/* ------------------------------------------------------------ seeding -- */

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A small deterministic random stream (mulberry32). */
export function seeded(seed: string) {
  let a = hash(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------- motifs -- */

function gearPath(): string {
  const teeth = 8;
  const points: string[] = [];
  for (let i = 0; i < teeth * 2; i += 1) {
    const r = i % 2 === 0 ? 11 : 8.4;
    const a0 = (i / (teeth * 2)) * Math.PI * 2 - 0.12;
    const a1 = ((i + 1) / (teeth * 2)) * Math.PI * 2 - 0.12;
    points.push(`${(12 + r * Math.cos(a0)).toFixed(2)},${(12 + r * Math.sin(a0)).toFixed(2)}`);
    points.push(`${(12 + r * Math.cos(a1)).toFixed(2)},${(12 + r * Math.sin(a1)).toFixed(2)}`);
  }
  return `M${points.join("L")}Z M12 8.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7z`;
}

const SHAPES: Record<Motif, string> = {
  drops: "M12 2.5c3.2 4.6 6.3 8 6.3 11.6a6.3 6.3 0 0 1-12.6 0C5.7 10.5 8.8 7.1 12 2.5z",
  cones: "M6.5 10.2a5.5 5.5 0 0 1 11 0zM7.2 11.4h9.6L12 22z",
  hearts: "M12 20.5s-8.5-5-8.5-11.2A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 8.5 2.7c0 6.2-8.5 11.2-8.5 11.2z",
  waves: "M1 15c2.8 0 3.9-4.5 6.7-4.5S11.6 15 14.4 15s3.9-4.5 6.7-4.5c1 0 1.9.5 1.9.5v3.5c-.6-.3-1.2-.5-1.9-.5-2.8 0-3.9 4.5-6.7 4.5s-3.9-4.5-6.7-4.5S3.8 18.5 1 18.5z",
  leaves: "M4 20C4 11 10.5 4.2 20.5 3.5 20 13.5 13.2 20 4 20zM4 20l7.5-7.5",
  gears: gearPath(),
  bulbs: "M12 2.5a6.3 6.3 0 0 0-3.7 11.4v2.4h7.4v-2.4A6.3 6.3 0 0 0 12 2.5zM9 18h6v1.6A1.9 1.9 0 0 1 13.1 21.5h-2.2A1.9 1.9 0 0 1 9 19.6z",
  flowers:
    "M12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6zM12 2.5a3.4 3.4 0 0 1 3.1 4.8A3.4 3.4 0 1 1 18.8 13a3.4 3.4 0 1 1-4.5 5.4A3.4 3.4 0 1 1 9.7 18.4 3.4 3.4 0 1 1 5.2 13a3.4 3.4 0 1 1 3.7-5.7A3.4 3.4 0 0 1 12 2.5z",
  notes: "M9 18.3a2.7 2.7 0 1 1-2.1-2.6V5.2l12-2.2v12.8a2.7 2.7 0 1 1-2.1-2.6V6.6L9 8z",
  stars: "M12 2.3l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.2l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z",
  bolts: "M13.8 1.8 4.6 13.6h6.2L9.3 22.2l10.1-12.7h-6.4z",
  moons: "M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1z",
  bubbles: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zm-3.2 3.8a2.2 2.2 0 1 1 0 4.4 2.2 2.2 0 0 1 0-4.4z",
};

export function MotifLayer({ motif, seed, onSoft }: { motif: Motif; seed: string; onSoft: boolean }) {
  const random = seeded(`${seed}:motif`);
  const cols = 6;
  const rows = 4;
  const items: { x: number; y: number; s: number; r: number; o: number }[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (random() < 0.28) continue;
      items.push({
        x: (col + 0.15 + random() * 0.7) * (160 / cols) - 7,
        y: (row + 0.1 + random() * 0.8) * (100 / rows) - 7,
        s: 0.42 + random() * 0.34,
        r: -35 + random() * 70,
        o: 0.1 + random() * 0.14,
      });
    }
  }

  return (
    <svg
      aria-hidden
      viewBox="0 0 160 100"
      preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ color: onSoft ? "var(--c)" : "#ffffff" }}
    >
      {items.map((item, i) => (
        <path
          key={i}
          d={SHAPES[motif]}
          fill="currentColor"
          fillRule="evenodd"
          fillOpacity={onSoft ? item.o + 0.1 : item.o}
          stroke={motif === "leaves" ? "currentColor" : undefined}
          strokeOpacity={item.o}
          strokeWidth={motif === "leaves" ? 1.4 : undefined}
          transform={`translate(${item.x.toFixed(1)} ${item.y.toFixed(1)}) rotate(${item.r.toFixed(0)} 12 12) scale(${item.s.toFixed(2)})`}
        />
      ))}
    </svg>
  );
}

/* ---------------------------------------------------------- component -- */

/**
 * The ground behind a show: one flat colour from its host, in one of three
 * strengths. Pale and mid tints for cards, the full colour for banners.
 * No gradients, no pattern: the character is the picture.
 */
export function artBackground(tone: Show["tone"] = "main"): string {
  if (tone === "soft") return "var(--c-soft)";
  if (tone === "deep") return "var(--c)";
  return "color-mix(in oklab, var(--c) 30%, var(--c-soft))";
}

export default function ShowArt({ show, characters, seed, className, style, bare, tone, children }: ShowArtProps) {
  const find = (id: CharacterId) => characters.find((c) => c.id === id);
  const host = find(show.host) ?? characters[0];
  const effectiveTone = tone ?? show.tone ?? "main";
  const key = seed ? `${show.id}:${seed}` : show.id;
  const random = seeded(key);

  // Variety from the seed alone: which side the host stands on, which way
  // they face, where the circle sits behind them. Enough that a row of one
  // friend's shows never looks like the same card twice.
  const mirror = random() < 0.42;
  const flip = random() < 0.35;
  const tilt = (random() - 0.5) * 5;
  const drift = random() * 10;

  return (
    <div
      // `relative` unless the caller positions it: two position utilities on
      // one element resolve by stylesheet order, and `relative` would win.
      className={cx("isolate overflow-hidden", !/\babsolute\b/.test(className ?? "") && "relative", className)}
      style={{ ...tint(host), background: artBackground(effectiveTone), ...style }}
    >
      {/* One soft circle for the character to stand in front of. A bare
          ground (a banner placing its own characters) goes without. */}
      {!bare && (
      <span
        aria-hidden
        className="pointer-events-none absolute aspect-square w-[62%] rounded-full"
        style={{
          [mirror ? "left" : "right"]: `${2 + drift}%`,
          bottom: "-34%",
          background: effectiveTone === "deep" ? "rgb(255 255 255 / 0.16)" : "rgb(255 255 255 / 0.55)",
        }}
      />
      )}

      {!bare && show.art === "crew" && (
        <Trio show={show} characters={characters} seed={key} className="absolute inset-x-0 bottom-[-18%] h-[112%]" />
      )}

      {!bare && show.art !== "crew" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={host.image}
          alt=""
          loading="lazy"
          decoding="async"
          data-host
          className="pointer-events-none absolute bottom-[-20%] h-[114%] w-auto max-w-none origin-bottom transition-transform duration-500 ease-spring"
          style={{
            aspectRatio: host.aspect,
            [mirror ? "left" : "right"]: `${7 + drift}%`,
            transform: `rotate(${tilt.toFixed(1)}deg) scaleX(${flip ? -1 : 1})`,
          }}
        />
      )}

      {children}
    </div>
  );
}

/**
 * The ensemble shot, for shows that star the whole crew: the host in front,
 * two friends a step behind on either side. Six in a row reads as a crowd at
 * card size, and three already says "friends". Which two flank the host is
 * seeded, so each ensemble show and episode gets its own pair.
 */
export function Trio({
  show,
  characters,
  seed,
  className,
  rise,
}: {
  show: ArtShow;
  characters: CharacterData[];
  seed: string;
  className?: string;
  /** Stagger the three in with the rise animation. */
  rise?: boolean;
}) {
  const random = seeded(`${seed}:trio`);
  const pool = [...show.cast];
  const takeOne = () => pool.splice(Math.floor(random() * pool.length), 1)[0];
  const left = pool.length ? takeOne() : undefined;
  const right = pool.length ? takeOne() : undefined;
  const find = (id?: CharacterId) => (id ? characters.find((c) => c.id === id) : undefined);

  const slots = [
    { character: find(left), height: "74%", z: 1, turn: -5, delay: 0.08 },
    { character: find(show.host), height: "100%", z: 3, turn: 0, delay: 0 },
    { character: find(right), height: "74%", z: 2, turn: 5, delay: 0.14 },
  ];

  return (
    <div className={cx("pointer-events-none flex items-end justify-center", className)}>
      {slots.map(({ character, height, z, turn, delay }, i) =>
        character ? (
          <span
            key={`${character.id}-${i}`}
            className={cx("relative -mx-[3.5%] flex h-full items-end", rise && "animate-rise")}
            style={{ zIndex: z, height, animationDelay: rise ? `${delay}s` : undefined }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={character.image}
              alt=""
              decoding="async"
              data-host={i === 1 ? true : undefined}
              className="h-full w-auto max-w-none origin-bottom transition-transform duration-500 ease-spring"
              style={{ aspectRatio: character.aspect, transform: `rotate(${turn}deg) scaleX(${i === 2 ? -1 : 1})` }}
            />
          </span>
        ) : null,
      )}
    </div>
  );
}
