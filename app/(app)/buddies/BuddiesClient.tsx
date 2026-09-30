"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { Character as CharacterData, CharacterId, ShowLite } from "@/lib/catalog-types";
import { cx, tint } from "@/lib/cx";
import { readVoiceOn } from "@/lib/device";
import { writeProfiles, type Profile, type ProfileState } from "@/lib/profiles";
import { canSpeak, say, warmUp } from "@/lib/speak";

import Burst from "@/app/_components/Burst";
import Character from "@/app/_components/Character";
import Icon from "@/app/_components/Icon";
import { MotifGlyph } from "@/app/_components/ShowArt";
import ShowCard from "@/app/_components/ShowCard";

interface BuddiesProps {
  characters: CharacterData[];
  /** What the watching child may see, for each friend's shows. */
  shows: ShowLite[];
  state: ProfileState;
  kid: Profile | null;
  buddy: CharacterId | null;
}

/**
 * The crew: every buddy as a full-length portrait on their own colour, and a
 * search that knows what they love as well as their names ("surf" finds Kai).
 * Tap one and they step forward, fill the screen and start talking; tap them
 * again for more. From there a child can make them their buddy.
 */
export default function BuddiesClient({ characters, shows, state, kid, buddy }: BuddiesProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<CharacterId | null>(null);
  const woken = useRef(false);

  const q = query.trim().toLowerCase();
  const found = characters.filter((c) => !q || [c.name, c.role, c.world, c.worldLine, ...c.likes].some((text) => text.toLowerCase().includes(q)));
  const spotlight = characters.find((c) => c.id === open) ?? null;

  const choose = (id: CharacterId) => {
    if (!kid) return;
    writeProfiles({ ...state, list: state.list.map((p) => (p.id === kid.id ? { ...p, buddy: id } : p)) });
    router.refresh();
  };

  return (
    <main
      className="mx-auto max-w-[1180px] px-6 pt-24 pb-24 max-[640px]:px-4 max-[640px]:pt-20"
      onPointerDown={() => {
        // The first touch wakes the voices, so whoever is tapped answers at once.
        if (woken.current || !readVoiceOn() || !canSpeak()) return;
        woken.current = true;
        void warmUp(characters[0].voice);
      }}
    >
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <div>
          <h1 className="font-display text-[clamp(2.4rem,5vw,3.6rem)] leading-none font-medium">The crew</h1>
          <p className="mt-3 text-[1.05rem] text-ink-soft">Six friends from Tiva Island. Tap someone to say hello.</p>
        </div>
        <label className="relative flex h-12 w-full max-w-[360px] items-center">
          <span className="sr-only">Search the crew</span>
          <Icon name="search" className="pointer-events-none absolute left-4 size-5 text-ink-faint" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="A name, or something they love"
            className="h-full w-full rounded-xl border border-line bg-paper pr-11 pl-11 text-[0.98rem] font-medium text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-ink/40 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 grid size-8 cursor-pointer place-items-center rounded-lg text-ink-faint transition-colors hover:text-ink"
            >
              <Icon name="close" className="size-4" />
            </button>
          )}
        </label>
      </div>

      {found.length === 0 ? (
        <p className="mt-16 text-[1.05rem] text-ink-soft">
          Nobody matches &ldquo;{query.trim()}&rdquo;. Try a name, or something they love, like &ldquo;surfing&rdquo; or &ldquo;naps&rdquo;.
        </p>
      ) : (
        <ul className="mt-10 grid grid-cols-3 gap-5 max-[900px]:grid-cols-2 max-[640px]:mt-8 max-[640px]:gap-3">
          {found.map((character, i) => {
            const mine = character.id === buddy;
            return (
              <li key={character.id} className="animate-pop" style={{ animationDelay: `${i * 0.05}s` }}>
                <button
                  type="button"
                  onClick={() => setOpen(character.id)}
                  style={tint(character)}
                  className="group relative flex aspect-[4/5] w-full cursor-pointer flex-col overflow-hidden rounded-[1.75rem] bg-(--c-soft) text-left outline-offset-4 transition-transform duration-300 ease-out-soft hover:-translate-y-1 max-[640px]:aspect-[3/4] max-[640px]:rounded-[1.4rem]"
                >
                  {/* Their motif, big and faint, as the card's texture. */}
                  <MotifGlyph motif={character.motif} className="absolute -top-[8%] -right-[12%] size-[62%] rotate-12 text-(--c) opacity-15" />
                  <span className="relative z-10 block p-5 max-[640px]:p-4">
                    <span className="block font-display text-[clamp(1.5rem,2.6vw,2.1rem)] leading-none font-medium text-(--c-deep)">
                      {character.name}
                    </span>
                    <span className="mt-1.5 block text-[0.92rem] font-semibold text-ink-soft max-[640px]:text-[0.82rem]">{character.role}</span>
                  </span>
                  {mine && kid && (
                    <span className="absolute right-4 bottom-4 z-10 inline-flex items-center gap-1 rounded-full bg-(--c) py-1 pr-3 pl-2 text-[0.78rem] font-bold text-(--c-on) max-[640px]:right-3 max-[640px]:bottom-3">
                      <Icon name="check" className="size-3.5" />
                      {kid.name}&apos;s buddy
                    </span>
                  )}
                  <span className="absolute inset-x-0 bottom-0 flex h-[72%] items-end justify-center max-[640px]:h-[64%]">
                    <Character
                      character={character}
                      decorative
                      priority={i < 3}
                      className="h-full origin-bottom translate-y-[3%] transition-transform duration-500 ease-spring group-hover:-rotate-2 group-hover:scale-[1.04]"
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {spotlight && (
        <Spotlight
          key={spotlight.id}
          character={spotlight}
          characters={characters}
          shows={shows.filter((show) => show.host === spotlight.id)}
          kid={kid}
          isBuddy={spotlight.id === buddy}
          onChoose={() => choose(spotlight.id)}
          onClose={() => setOpen(null)}
        />
      )}
    </main>
  );
}

/**
 * One friend, up close: they fill the screen in their colour and start
 * talking. Tap them for another line. Their story, what they love, their
 * shows, and the button that makes them this child's buddy.
 */
function Spotlight({
  character,
  characters,
  shows,
  kid,
  isBuddy,
  onChoose,
  onClose,
}: {
  character: CharacterData;
  characters: CharacterData[];
  shows: ShowLite[];
  kid: Profile | null;
  isBuddy: boolean;
  onChoose: () => void;
  onClose: () => void;
}) {
  const [line, setLine] = useState({ text: character.quotes[0], n: 0 });
  const [speaking, setSpeaking] = useState(false);
  const [jumps, setJumps] = useState(0);
  const [chosen, setChosen] = useState(false);
  const [voiceOn] = useState(readVoiceOn);
  const stop = useRef<(() => void) | null>(null);
  const mine = isBuddy || chosen;

  const speak = (text: string) => {
    stop.current?.();
    if (!voiceOn || !canSpeak()) return;
    stop.current = say(text, character.voice, { onstart: () => setSpeaking(true), onend: () => setSpeaking(false) });
  };

  // They say hello as they step forward, and stop talking when they leave.
  useEffect(() => {
    if (voiceOn && canSpeak()) {
      stop.current = say(character.quotes[0], character.voice, { onstart: () => setSpeaking(true), onend: () => setSpeaking(false) });
    }
    return () => stop.current?.();
  }, [character, voiceOn]);

  // Escape closes; the page behind stays still.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const next = () => {
    const n = line.n + 1;
    const text = character.quotes[n % character.quotes.length];
    setLine({ text, n });
    setJumps((j) => j + 1);
    speak(text);
  };

  const choose = () => {
    setChosen(true);
    onChoose();
    const cheer = character.intro[character.intro.length - 1]?.say.replaceAll("{kid}", kid?.name ?? "") ?? character.quotes[0];
    setLine({ text: cheer, n: line.n });
    setJumps((j) => j + 1);
    speak(cheer);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={character.name}
      className="fixed inset-0 z-[70] animate-fade overflow-x-hidden overflow-y-auto"
      style={{ backgroundColor: `color-mix(in oklab, ${character.color} 80%, ${character.deep})`, color: character.onColor }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="fixed top-4 right-4 z-20 grid size-12 cursor-pointer place-items-center rounded-full bg-white/18 ring-1 ring-white/30 backdrop-blur-md transition-colors hover:bg-white/28 max-[640px]:top-3 max-[640px]:right-3"
      >
        <Icon name="close" className="size-5" />
      </button>

      <div className="mx-auto grid min-h-dvh max-w-[1180px] grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] items-center gap-x-12 gap-y-6 px-6 py-20 max-[860px]:min-h-0 max-[860px]:grid-cols-1 max-[860px]:pt-20 max-[860px]:pb-10">
        {/* The friend, talking. */}
        <div className="relative flex justify-center">
          {chosen && <Burst key="chosen" className="top-[40%] left-1/2 z-10" count={28} spread={300} />}
          <button
            type="button"
            onClick={next}
            aria-label={`${character.name}, tap to hear more`}
            className="relative h-[min(62vh,560px)] cursor-pointer max-[860px]:h-[min(40vh,360px)]"
          >
            <span aria-hidden className="absolute -bottom-2 left-1/2 h-[5%] w-[70%] -translate-x-1/2 rounded-full bg-black/20 blur-md" />
            <span key={jumps} className={cx("block h-full origin-bottom", jumps > 0 ? "animate-jump" : "animate-rise")}>
              <span className={cx("block h-full origin-bottom", speaking && "animate-talk")}>
                <Character character={character} decorative priority className="h-full animate-bob" />
              </span>
            </span>
          </button>
          <p
            key={line.n + line.text}
            aria-live="polite"
            className="absolute top-[2%] left-[64%] z-10 w-max max-w-[min(18rem,42vw)] animate-pop rounded-3xl bg-white px-5 py-3.5 font-display text-[clamp(1.1rem,1.6vw,1.35rem)] leading-snug font-medium text-ink shadow-lift before:absolute before:top-6 before:-left-2 before:size-4 before:rotate-45 before:rounded-sm before:bg-white max-[860px]:top-auto max-[860px]:bottom-[calc(100%+0.75rem)] max-[860px]:left-1/2 max-[860px]:max-w-[86vw] max-[860px]:-translate-x-1/2 max-[860px]:text-center max-[860px]:before:top-auto max-[860px]:before:-bottom-2 max-[860px]:before:left-1/2 max-[860px]:before:-ml-2"
          >
            {line.text}
          </p>
        </div>

        {/* Who they are. */}
        <div className="animate-fade-up [animation-delay:0.12s] max-[860px]:pt-4">
          <h2 className="font-display text-[clamp(3rem,7vw,5.5rem)] leading-[0.9] font-bold">{character.name}</h2>
          <p className="mt-3 text-[1.05rem] font-semibold opacity-85">
            {character.role} · {character.world}
          </p>
          <p className="mt-6 max-w-[34rem] text-[1.12rem] leading-relaxed">{character.bio}</p>
          <dl className="mt-6 grid max-w-[34rem] gap-2.5 text-[0.98rem]">
            <div className="flex gap-4">
              <dt className="w-16 flex-none font-semibold opacity-70">Loves</dt>
              <dd>{character.likes.join(", ")}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-16 flex-none font-semibold opacity-70">World</dt>
              <dd>{character.worldLine}</dd>
            </div>
          </dl>

          <div className="mt-8 max-[860px]:sticky max-[860px]:bottom-[max(1rem,env(safe-area-inset-bottom))] max-[860px]:z-10">
            {mine && kid ? (
              <p className="inline-flex h-14 items-center gap-2 rounded-full bg-white/18 px-5 font-display text-[1.2rem] font-medium ring-1 ring-white/30">
                <Icon name="check" className="size-5" />
                {kid.name}&apos;s buddy
              </p>
            ) : kid ? (
              <button
                type="button"
                onClick={choose}
                className="inline-flex h-16 cursor-pointer items-center gap-3 rounded-full bg-white pr-8 pl-3 font-display text-[1.35rem] font-bold shadow-[0_18px_40px_-14px_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-0.5 active:scale-[0.97]"
                style={{ color: character.deep }}
              >
                <span className="grid size-11 place-items-center rounded-full text-white" style={{ backgroundColor: character.deep }}>
                  <Icon name="check" className="size-5" />
                </span>
                Choose {character.name}
              </button>
            ) : (
              <Link
                href="/profiles"
                className="inline-flex h-14 items-center rounded-full bg-white px-6 font-semibold"
                style={{ color: character.deep }}
              >
                Pick who&apos;s watching first
              </Link>
            )}
          </div>
        </div>
      </div>

      {shows.length > 0 && (
        <section className="mx-auto max-w-[1180px] px-6 pb-16 max-[640px]:px-4">
          <h3 className="font-display text-[1.5rem] font-medium">Shows with {character.name}</h3>
          <ul className="no-scrollbar -mx-1 mt-4 flex gap-4 overflow-x-auto px-1 pb-2">
            {shows.map((show) => (
              <li key={show.id} className="w-[250px] flex-none rounded-[1.4rem] bg-paper p-2 text-ink">
                <ShowCard show={show} characters={characters} />
              </li>
            ))}
          </ul>
        </section>
      )}

    </div>
  );
}
