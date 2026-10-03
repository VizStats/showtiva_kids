"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";

import type { Character as CharacterData, Motif, Move } from "@/lib/catalog-types";
import { cx } from "@/lib/cx";
import { readVoiceOn, setVoiceOn } from "@/lib/device";
import type { Profile } from "@/lib/profiles";
import { canSpeak, hush, say, warmUp } from "@/lib/speak";

import Burst from "../_components/Burst";
import Character from "../_components/Character";
import Icon, { type IconName } from "../_components/Icon";
import { MotifGlyph } from "../_components/ShowArt";

const MOVE: Record<Move, string> = {
  wave: "animate-wave",
  jump: "animate-hop-twice",
  spin: "animate-twirl",
  dance: "animate-dance",
  think: "animate-think",
  lean: "animate-lean",
  nod: "animate-nod",
  wobble: "animate-wobble",
  dash: "animate-dash",
  sway: "animate-rock",
  breathe: "animate-inhale",
  cheer: "animate-cheer",
};

/** The loader holds at least this long, and at most the longer one while the voice wakes. */
const LOADING_MIN_MS = 1200;
const LOADING_MAX_MS = 3600;
/** How long to wait for the voice to start before carrying on without it. */
const VOICE_WAIT_MS = 3500;
/** The pause between one line and the next. */
const BETWEEN_MS = 650;

/**
 * What happens after "Select": not a page to read, a performance. A beat of
 * loading while the buddy gets ready, then they bound in and introduce
 * themselves out loud, one line at a time, each line with its own move: who
 * they are, what they love, what they will help with. The words fill a
 * speech bubble as they say them, and on the last line "Start journey" pops
 * up. Tap them and they jump.
 *
 * The voice is the device's own speech, a different one per friend (see
 * lib/speak.ts), never an online voice. It can be muted, and where a device
 * has no voice the bubble carries the lines alone at the same pace.
 */
export default function Welcome({ character, kid, onBack }: { character: CharacterData; kid: Profile; onBack: () => void }) {
  const router = useRouter();
  const script = character.intro.map((beat) => ({ ...beat, say: beat.say.replaceAll("{kid}", kid.name) }));
  const last = script.length - 1;

  const [ready, setReady] = useState(false);
  const [beat, setBeat] = useState(0);
  const [shown, setShown] = useState(0);
  const [run, setRun] = useState(0);
  const [pokes, setPokes] = useState(0);
  const [voiceOn, setVoice] = useState(readVoiceOn);
  const [speaking, setSpeaking] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const line = script[beat];
  const text = line.say;
  // They bounce while the words fill in and for as long as the voice goes on.
  const talking = ready && (shown < text.length || (speaking && voiceOn));
  // Whole words at a time, so a half-said word never shows.
  const wordEnd = text.indexOf(" ", shown);
  const said = shown === 0 ? "" : text.slice(0, wordEnd === -1 ? text.length : wordEnd);
  const light = character.onColor.toLowerCase() === "#ffffff";
  const voiceStyle = character.voice;
  const { rate } = voiceStyle;

  // A beat of loading while the buddy gets ready. Some voices take a moment
  // to wake the first time, so the loader also waits (up to a point) for a
  // silent word in their voice, and the first real line starts on time.
  useEffect(() => {
    router.prefetch("/trail");
    const began = Date.now();
    let settled = false;
    let hold: number | undefined;
    const finish = () => {
      if (settled) return;
      settled = true;
      hold = window.setTimeout(() => setReady(true), Math.max(0, LOADING_MIN_MS - (Date.now() - began)));
    };
    const cap = window.setTimeout(finish, LOADING_MAX_MS);
    if (voiceOn && canSpeak()) void warmUp(voiceStyle).then(finish);
    else finish();
    return () => {
      settled = true;
      window.clearTimeout(cap);
      window.clearTimeout(hold);
    };
    // The loader runs once, when the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // One line: say it, fill the bubble from the moment the voice starts, then
  // on to the next once both are done.
  useEffect(() => {
    if (!ready) return;
    const charMs = 70 / rate;
    let revealed = false;
    let spoken = !voiceOn || !canSpeak();
    let next: number | undefined;
    let reveal: number | undefined;
    let revealEnd: number | undefined;

    const advance = () => {
      if (!revealed || !spoken || next !== undefined || beat >= last) return;
      next = window.setTimeout(() => {
        setShown(0);
        setBeat(beat + 1);
      }, BETWEEN_MS);
    };

    const startReveal = () => {
      if (reveal !== undefined) return;
      reveal = window.setInterval(() => setShown((n) => Math.min(text.length, n + 1)), charMs);
      revealEnd = window.setTimeout(() => {
        revealed = true;
        window.clearInterval(reveal);
        setShown(text.length);
        advance();
      }, text.length * charMs + 150);
    };

    let stop: (() => void) | null = null;
    let silent: number | undefined;
    let safety: number | undefined;
    if (spoken) {
      startReveal();
    } else {
      stop = say(text, voiceStyle, {
        onstart: () => {
          setSpeaking(true);
          startReveal();
        },
        onend: () => {
          setSpeaking(false);
          spoken = true;
          startReveal();
          advance();
        },
      });
      // A device with no voice to speak with never starts: carry on at the
      // bubble's pace rather than wait.
      silent = window.setTimeout(() => {
        if (reveal !== undefined) return;
        spoken = true;
        startReveal();
      }, VOICE_WAIT_MS);
      // In case the speech starts but never reports back.
      safety = window.setTimeout(
        () => {
          spoken = true;
          advance();
        },
        (text.length * 110) / rate + VOICE_WAIT_MS + 2000,
      );
    }

    return () => {
      window.clearInterval(reveal);
      window.clearTimeout(revealEnd);
      window.clearTimeout(safety);
      window.clearTimeout(silent);
      if (next !== undefined) window.clearTimeout(next);
      stop?.();
    };
  }, [ready, beat, run, voiceOn, text, voiceStyle, rate, last]);

  const toggleVoice = () => {
    setVoiceOn(!voiceOn);
    setVoice(!voiceOn);
  };

  const replay = () => {
    setRun((n) => n + 1);
    setBeat(0);
    setShown(0);
  };

  const skip = () => {
    setBeat(last);
    setShown(0);
  };

  const start = () => {
    setLeaving(true);
    hush();
    router.push("/trail");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${character.name} says hello`}
      className="fixed inset-0 z-50 animate-fade overflow-hidden select-none"
      style={{ backgroundColor: `color-mix(in oklab, ${character.color} 80%, ${character.deep})`, color: character.onColor }}
    >
      {!ready ? (
        <div role="status" aria-label="Loading" className="grid h-dvh place-items-center">
          <div className="flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={light ? "/brand/logo-white.svg" : "/brand/logo.svg"} alt="" className="w-[clamp(150px,18vw,210px)] animate-breathe" />
            <span className="mt-6 flex gap-2.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-2.5 animate-dot rounded-full bg-current" style={{ animationDelay: `${i * 0.14}s` }} />
              ))}
            </span>
          </div>
        </div>
      ) : (
        <>
          {/* A soft light on the stage, breathing. */}
          <span
            aria-hidden
            className="pointer-events-none absolute top-[14%] left-1/2 aspect-square w-[min(92vw,820px)] -translate-x-1/2 animate-glow rounded-full"
            style={{ background: "radial-gradient(circle, rgb(255 255 255 / 0.32), transparent 62%)" }}
          />

          <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-[clamp(1rem,4vw,3rem)] pt-5">
            <Round label="Pick someone else" icon="chevron-left" onClick={onBack} />
            <div className="flex gap-2.5">
              <Round label={voiceOn ? "Sound off" : "Sound on"} icon={voiceOn ? "volume" : "mute"} onClick={toggleVoice} />
              <Round label="Again" icon="replay" onClick={replay} />
              {beat < last && <Round label="Skip" icon="next" onClick={skip} />}
            </div>
          </header>

          {/* The stage. */}
          <div className="absolute inset-x-0 top-[16%] bottom-[clamp(7.5rem,17vh,10rem)] flex items-end justify-center max-[640px]:top-[30%]">
            <div className="relative h-[min(100%,560px)]">
              {line.fx === "confetti" && <Burst key={`confetti-${run}-${beat}`} className="top-[34%] left-1/2 z-10" count={30} spread={320} />}
              {line.fx === "motif" && <Float key={`motif-${run}-${beat}`} motif={character.motif} />}

              <button
                type="button"
                aria-label={`${character.name}, tap to say hi`}
                onClick={() => setPokes((n) => n + 1)}
                className="relative block h-full cursor-pointer"
              >
                <span aria-hidden className="absolute -bottom-2 left-1/2 h-[5%] w-[70%] -translate-x-1/2 rounded-full bg-black/20 blur-md" />
                <span key={`enter-${run}`} className="block h-full origin-bottom animate-enter">
                  <span key={`move-${run}-${beat}`} className={cx("block h-full origin-bottom", MOVE[line.move])}>
                    <span key={`poke-${pokes}`} className={cx("block h-full origin-bottom", pokes > 0 && "animate-jump")}>
                      <span className={cx("block h-full origin-bottom", talking && "animate-talk")}>
                        <Character character={character} decorative priority className="h-full animate-bob" />
                      </span>
                    </span>
                  </span>
                </span>
              </button>

              {/* What they are saying, growing word by word as they say it. */}
              {said && (
                <p
                  key={`say-${run}-${beat}`}
                  aria-hidden
                  className="absolute top-[3%] left-[80%] z-20 w-max max-w-[min(20rem,40vw)] animate-pop rounded-3xl bg-white px-5 py-3.5 font-display text-[clamp(1.15rem,1.7vw,1.45rem)] leading-snug font-medium text-ink shadow-lift before:absolute before:top-6 before:-left-2 before:size-4 before:rotate-45 before:rounded-sm before:bg-white max-[640px]:top-auto max-[640px]:bottom-[calc(100%+1rem)] max-[640px]:left-1/2 max-[640px]:max-w-[86vw] max-[640px]:-translate-x-1/2 max-[640px]:text-center max-[640px]:before:top-auto max-[640px]:before:-bottom-2 max-[640px]:before:left-1/2 max-[640px]:before:-ml-2"
                >
                  {said}
                </p>
              )}
            </div>
          </div>
          <p className="sr-only" aria-live="polite">
            {text}
          </p>

          {/* Where we are in the hello; at the end, the way onto the trail. */}
          <div className="absolute inset-x-0 bottom-0 z-20 flex h-[clamp(7.5rem,17vh,10rem)] items-center justify-center pb-[env(safe-area-inset-bottom)]">
            {beat === last ? (
              <button
                type="button"
                onClick={start}
                disabled={leaving}
                className="inline-flex h-16 animate-pop cursor-pointer items-center justify-center gap-3 rounded-full bg-white pr-9 pl-3 font-display text-[1.4rem] font-bold shadow-[0_18px_40px_-14px_rgba(0,0,0,0.45)] transition-transform [animation-delay:0.4s] hover:-translate-y-0.5 active:scale-[0.97]"
                style={{ color: character.deep }}
              >
                <span className="grid size-11 place-items-center rounded-full text-white" style={{ backgroundColor: character.deep }}>
                  <Icon name="trail" className="size-5" />
                </span>
                Start journey
              </button>
            ) : (
              <span aria-hidden className="flex gap-1.5">
                {script.map((_, i) => (
                  <span key={i} className={cx("h-2 rounded-full bg-current transition-all duration-300", i === beat ? "w-7" : "w-2 opacity-40")} />
                ))}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** A round glass button with just an icon; the label is for screen readers and tooltips. */
function Round({ label, icon, onClick }: { label: string; icon: IconName; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-12 cursor-pointer place-items-center rounded-full bg-white/18 ring-1 ring-white/30 backdrop-blur-md transition-[background-color,scale] hover:bg-white/28 active:scale-90"
    >
      <Icon name={icon} className="size-5" />
    </button>
  );
}

/** Their motif, a dozen of it, floating up and away from them. */
function Float({ motif }: { motif: Motif }) {
  return (
    <span aria-hidden className="pointer-events-none absolute top-[42%] left-1/2 z-10 size-0">
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        return (
          <span
            key={i}
            className="absolute -translate-1/2 animate-float-away"
            style={
              {
                "--dx": `${Math.cos(angle) * (170 + (i % 3) * 60)}px`,
                "--dy": `${Math.sin(angle) * 120 - 150 - (i % 4) * 30}px`,
                "--rot": `${(i % 2 ? 1 : -1) * (40 + i * 12)}deg`,
                animationDelay: `${(i % 6) * 0.08}s`,
              } as CSSProperties
            }
          >
            <MotifGlyph motif={motif} className="size-[clamp(26px,3vw,40px)] opacity-85" />
          </span>
        );
      })}
    </span>
  );
}
