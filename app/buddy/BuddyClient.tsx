"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";

import type { Character as CharacterData } from "@/lib/catalog-types";
import { cx } from "@/lib/cx";
import { readVoiceOn } from "@/lib/device";
import { writeProfiles, type Profile, type ProfileState } from "@/lib/profiles";
import { canSpeak, hush, say, warmUp, warmVoices } from "@/lib/speak";

import Character from "../_components/Character";
import Icon from "../_components/Icon";
import KidAvatar from "../_components/KidAvatar";
import Welcome from "./Welcome";

/**
 * "Choose your buddy", as a stage. One friend stands big in the middle on
 * their own colour, their name written huge behind them; the friends either
 * side wait small, and the arrows (or a swipe, or the arrow keys) bring the
 * next one in. Tap the big one and they jump and say something. "Select"
 * makes them this child's buddy, and Welcome takes it from there: a hello,
 * then "meet your buddy", then onto the trail.
 */
export default function BuddyClient({ characters, state, kid }: { characters: CharacterData[]; state: ProfileState; kid: Profile }) {
  const count = characters.length;
  const [index, setIndex] = useState(() => Math.max(0, characters.findIndex((c) => c.id === kid.buddy)));
  const [jumps, setJumps] = useState(0);
  const [said, setSaid] = useState<{ text: string; n: number } | null>(null);
  const [going, setGoing] = useState(false);
  const touchX = useRef<number | null>(null);
  const woken = useRef(false);

  const character = characters[index];
  const light = character.onColor.toLowerCase() === "#ffffff";

  const move = (step: number) => {
    if (going) return;
    setIndex((i) => (i + step + count) % count);
    setSaid(null);
    hush();
  };

  const poke = () => {
    const n = (said?.n ?? -1) + 1;
    const text = character.quotes[n % character.quotes.length];
    setJumps((j) => j + 1);
    setSaid({ text, n });
    if (readVoiceOn() && canSpeak()) say(text, character.voice);
  };

  const select = () => {
    if (going) return;
    setGoing(true);
    setJumps((n) => n + 1);
    writeProfiles({ ...state, list: state.list.map((p) => (p.id === kid.id ? { ...p, buddy: character.id } : p)) });
  };

  // Voices load lazily in some browsers; ask early. Stop talking on the way out.
  useEffect(() => {
    warmVoices();
    return hush;
  }, []);

  // Arrow keys move, Enter selects.
  const keys = useRef({ move, select });
  useEffect(() => {
    keys.current = { move, select };
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") keys.current.move(-1);
      else if (event.key === "ArrowRight") keys.current.move(1);
      else if (event.key === "Enter" && !(event.target instanceof HTMLButtonElement)) keys.current.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const arrow =
    "absolute top-[44%] z-30 grid size-[clamp(3rem,5vw,4rem)] -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-white/18 ring-1 ring-white/35 backdrop-blur-md transition-[background-color,scale] hover:bg-white/30 active:scale-90";

  return (
    <main
      className="relative h-dvh min-h-[560px] overflow-hidden transition-[background-color] duration-700 ease-out-soft select-none"
      style={{ backgroundColor: `color-mix(in oklab, ${character.color} 80%, ${character.deep})`, color: character.onColor }}
      onPointerDown={() => {
        // The first touch wakes the voices, so a tapped friend answers at once.
        if (woken.current || !readVoiceOn() || !canSpeak()) return;
        woken.current = true;
        void warmUp(character.voice);
      }}
      onTouchStart={(event) => {
        touchX.current = event.touches[0].clientX;
      }}
      onTouchEnd={(event) => {
        if (touchX.current === null) return;
        const dx = event.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 40) move(dx < 0 ? 1 : -1);
      }}
    >
      {/* The name, huge, behind everything. */}
      <p
        key={character.id}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[12%] animate-fade-up text-center font-display text-[clamp(7rem,30vw,26rem)] leading-[0.8] font-bold tracking-[-0.03em] whitespace-nowrap"
        style={{ color: `color-mix(in srgb, ${character.onColor} 30%, transparent)` }}
      >
        {character.name.toUpperCase()}
      </p>

      <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-[clamp(1.25rem,4vw,3rem)] pt-5">
        <Link href="/" aria-label="ShowTiva Kids home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={light ? "/brand/logo-white.svg" : "/brand/logo.svg"} alt="ShowTiva Kids" className="h-auto w-[clamp(96px,9vw,124px)]" />
        </Link>
        <Link
          href="/profiles"
          title="Switch who's watching"
          className="flex items-center gap-2.5 rounded-full bg-white/18 py-1 pr-4 pl-1 ring-1 ring-white/30 backdrop-blur-md transition-colors hover:bg-white/28"
        >
          <KidAvatar profile={kid} className="size-9" />
          <span className="font-display text-[1.05rem] font-medium">{kid.name}</span>
        </Link>
      </header>

      <h1 className="sr-only">Choose your buddy</h1>

      {/* The stage: every friend is here, placed by how far they are from the middle. */}
      <div className="absolute inset-x-0 top-0 bottom-[clamp(6.75rem,14vh,8.5rem)] [--big:min(calc(100dvh-15.5rem),600px,115vw)] [--side:34vw] max-[900px]:bottom-[10.25rem] max-[900px]:[--big:min(calc(100dvh-18rem),600px,115vw)] max-[640px]:[--side:41vw]">
        {characters.map((friend, i) => {
          const offset = ((i - index + count + Math.floor(count / 2)) % count) - Math.floor(count / 2);
          const centre = offset === 0;
          return (
            <button
              key={friend.id}
              type="button"
              tabIndex={Math.abs(offset) > 1 ? -1 : 0}
              aria-hidden={Math.abs(offset) > 1}
              aria-label={centre ? `${friend.name}, tap to say hi` : `Show ${friend.name}`}
              onClick={() => (centre ? poke() : move(offset))}
              className="absolute bottom-0 left-1/2 h-(--big) origin-bottom cursor-pointer transition-[transform,opacity] duration-700 ease-spring"
              style={slot(offset)}
            >
              {/* A soft shadow to stand on. */}
              <span aria-hidden className="absolute -bottom-2 left-1/2 h-[5%] w-[70%] -translate-x-1/2 rounded-full bg-black/20 blur-md" />
              <span key={centre ? jumps : 0} className={cx("block h-full origin-bottom", centre && jumps > 0 && "animate-jump")}>
                <Character character={friend} decorative priority className={cx("h-full", centre && "animate-bob")} />
              </span>

              {centre && said && (
                <span
                  key={said.n}
                  className="absolute top-[3%] left-[80%] w-max max-w-[15rem] animate-pop rounded-2xl rounded-bl-md bg-white px-4 py-2.5 text-left text-[0.98rem] leading-snug font-semibold text-ink shadow-lift max-[640px]:top-[-2.5rem] max-[640px]:left-1/2 max-[640px]:max-w-[80vw] max-[640px]:-translate-x-1/2 max-[640px]:rounded-bl-2xl"
                >
                  {said.text}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button type="button" onClick={() => move(-1)} aria-label="Previous friend" className={cx(arrow, "left-[clamp(0.75rem,3vw,2.5rem)]")}>
        <Icon name="chevron-left" className="size-[45%]" />
      </button>
      <button type="button" onClick={() => move(1)} aria-label="Next friend" className={cx(arrow, "right-[clamp(0.75rem,3vw,2.5rem)]")}>
        <Icon name="chevron-right" className="size-[45%]" />
      </button>

      {/* Who this is, low on the left. */}
      <div
        key={`about-${character.id}`}
        className="absolute bottom-[clamp(7rem,18vh,10.5rem)] left-[clamp(1.5rem,8vw,7rem)] z-20 max-w-[17rem] animate-fade-up max-[900px]:hidden"
      >
        <p className="text-[0.85rem] font-semibold tracking-[0.2em] uppercase opacity-80">{character.role}</p>
        <p className="mt-2 font-display text-[clamp(2rem,3vw,2.6rem)] leading-none font-bold uppercase">{character.world}</p>
        <p className="mt-2 text-[0.95rem] leading-snug opacity-80">{character.worldLine}</p>
      </div>

      {/* Where we are in the line-up, low on the right. */}
      <div className="absolute right-[clamp(1.5rem,8vw,7rem)] bottom-[clamp(7rem,18vh,10.5rem)] z-20 text-right max-[900px]:hidden">
        <p className="font-display text-[2.6rem] leading-none font-bold tabular-nums">
          {String(index + 1).padStart(2, "0")}
          <span className="text-[1.2rem] opacity-60"> / {String(count).padStart(2, "0")}</span>
        </p>
        <Dots count={count} index={index} className="mt-3 justify-end" />
      </div>

      {/* The big bold choice, under the big friend. */}
      <div className="absolute inset-x-0 bottom-0 z-30 flex flex-col items-center pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <p className="mb-1 text-[0.95rem] font-semibold opacity-85 min-[901px]:hidden">
          {character.name} · {character.role}
        </p>
        <Dots count={count} index={index} className="mb-3 min-[901px]:hidden" />
        <button
          type="button"
          onClick={select}
          disabled={going}
          className="inline-flex h-16 min-w-[15rem] cursor-pointer items-center justify-center gap-3 rounded-full bg-white px-10 font-display text-[1.4rem] font-bold shadow-[0_18px_40px_-14px_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-0.5 active:scale-[0.97]"
          style={{ color: character.deep }}
        >
          <Icon name="check" className="size-6" />
          Select {character.name}
        </button>
      </div>

      {going && <Welcome character={character} kid={kid} onBack={() => setGoing(false)} />}
    </main>
  );
}

/**
 * Where a friend stands for their distance from the middle: the one in the
 * middle full size; one either side small and raised a little, like they are
 * further back; the rest waiting off stage, invisible.
 */
function slot(offset: number): CSSProperties {
  const side = Math.sign(offset);
  const away = Math.abs(offset);
  if (away === 0) return { transform: "translateX(-50%)", opacity: 1, zIndex: 20 };
  if (away === 1) return { transform: `translateX(calc(-50% + ${side} * var(--side))) translateY(-30%) scale(0.36)`, opacity: 1, zIndex: 10 };
  return { transform: `translateX(calc(-50% + ${side} * 1.6 * var(--side))) translateY(-30%) scale(0.2)`, opacity: 0, zIndex: 0, pointerEvents: "none" };
}

function Dots({ count, index, className }: { count: number; index: number; className?: string }) {
  return (
    <span aria-hidden className={cx("flex gap-1.5", className)}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={cx("h-1.5 rounded-full bg-current transition-all duration-300", i === index ? "w-6" : "w-1.5 opacity-40")} />
      ))}
    </span>
  );
}
