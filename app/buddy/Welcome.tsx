"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { Character as CharacterData } from "@/lib/catalog-types";
import type { Profile } from "@/lib/profiles";

import Burst from "../_components/Burst";
import Character from "../_components/Character";
import Icon from "../_components/Icon";
import KidAvatar from "../_components/KidAvatar";

type Phase = "loading" | "hello" | "meet";

/**
 * What happens after "Select": a beat of loading while the buddy gets ready,
 * a big hello ("You chose Kai!") with confetti, then a full-screen "meet your
 * buddy": the child and their friend side by side, who the friend is, what
 * they do and what they will help with, and the way onto the trail. The
 * hello moves on by itself; a tap skips it.
 */
export default function Welcome({ character, kid, onBack }: { character: CharacterData; kid: Profile; onBack: () => void }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [leaving, setLeaving] = useState(false);
  const light = character.onColor.toLowerCase() === "#ffffff";

  useEffect(() => {
    router.prefetch("/trail");
  }, [router]);

  useEffect(() => {
    if (phase === "meet") return;
    const timer = window.setTimeout(() => setPhase(phase === "loading" ? "hello" : "meet"), phase === "loading" ? 1500 : 2800);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const start = () => {
    setLeaving(true);
    router.push("/trail");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${character.name} is your buddy`}
      className="fixed inset-0 z-50 animate-fade overflow-x-hidden overflow-y-auto"
      style={{ backgroundColor: `color-mix(in oklab, ${character.color} 80%, ${character.deep})`, color: character.onColor }}
    >
      {/* The name, huge and faint, behind every phase. */}
      <p
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-[12%] text-center font-display text-[clamp(7rem,30vw,26rem)] leading-[0.8] font-bold tracking-[-0.03em] whitespace-nowrap"
        style={{ color: `color-mix(in srgb, ${character.onColor} ${phase === "meet" ? 14 : 24}%, transparent)` }}
      >
        {character.name.toUpperCase()}
      </p>

      {phase === "loading" && (
        <div role="status" className="relative grid h-dvh place-items-center">
          <div className="flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={light ? "/brand/logo-white.svg" : "/brand/logo.svg"} alt="" className="w-[clamp(150px,18vw,210px)] animate-breathe" />
            <span className="mt-6 flex gap-2.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="size-2.5 animate-dot rounded-full bg-current" style={{ animationDelay: `${i * 0.14}s` }} />
              ))}
            </span>
            <p className="mt-5 text-[1.02rem] font-semibold opacity-85">Getting {character.name} ready…</p>
          </div>
        </div>
      )}

      {phase === "hello" && (
        <button
          type="button"
          onClick={() => setPhase("meet")}
          aria-label="Continue"
          className="relative grid h-dvh w-full cursor-pointer place-items-center px-6 text-center"
        >
          <span className="flex flex-col items-center">
            <span className="relative">
              <Burst className="top-[38%] left-1/2" count={26} spread={280} />
              <span className="block animate-rise">
                <Character character={character} decorative priority className="h-[min(46vh,420px)] animate-bob" />
              </span>
              <span className="absolute top-[2%] left-[74%] w-max max-w-[14rem] animate-pop rounded-2xl rounded-bl-md bg-white px-4 py-2.5 text-left text-[1rem] leading-snug font-semibold text-ink shadow-lift [animation-delay:0.55s] max-[640px]:top-[-3.25rem] max-[640px]:left-1/2 max-[640px]:-translate-x-1/2 max-[640px]:rounded-bl-2xl">
                Hi {kid.name}! You chose me!
              </span>
            </span>
            <span className="mt-6 block animate-fade-up font-display text-[clamp(2.6rem,6.4vw,5rem)] leading-none font-bold [animation-delay:0.3s]">
              You chose {character.name}!
            </span>
            <span className="mt-3 block animate-fade-up text-[1.1rem] font-medium opacity-85 [animation-delay:0.45s]">{character.quotes[0]}</span>
          </span>
        </button>
      )}

      {phase === "meet" && (
        <div className="relative min-h-dvh">
          <header className="flex items-center justify-between px-[clamp(1.25rem,4vw,3rem)] pt-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={light ? "/brand/logo-white.svg" : "/brand/logo.svg"} alt="ShowTiva Kids" className="h-auto w-[clamp(96px,9vw,124px)]" />
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-full bg-white/18 pr-4 pl-3 text-[0.95rem] font-semibold ring-1 ring-white/30 backdrop-blur-md transition-colors hover:bg-white/28"
            >
              <Icon name="chevron-left" className="size-4" />
              Pick someone else
            </button>
          </header>

          <div className="mx-auto grid min-h-[calc(100dvh-6rem)] max-w-[1200px] grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] items-center gap-[clamp(1.5rem,4vw,4rem)] px-[clamp(1.25rem,5vw,4rem)] pt-[clamp(1rem,2vh,2rem)] pb-12 max-[860px]:min-h-0 max-[860px]:grid-cols-1">
            {/* The two of them, together. */}
            <div className="relative mx-auto flex w-full max-w-[460px] animate-fade-up flex-col items-center">
              <span className="relative">
                <Character character={character} decorative priority className="h-[min(56vh,520px)] animate-bob max-[860px]:h-[min(38vh,340px)]" />
                <span className="absolute -bottom-1 -left-[14%] animate-pop [animation-delay:0.25s]">
                  <KidAvatar profile={kid} className="size-[clamp(84px,9vw,120px)] shadow-lift ring-[6px] ring-white" />
                </span>
              </span>
            </div>

            {/* Who they are, what they do, what they will help with: a few words each. */}
            <div className="animate-fade-up [animation-delay:0.15s]">
              <p className="text-[0.85rem] font-semibold tracking-[0.2em] uppercase opacity-80">{kid.name}&apos;s buddy</p>
              <h1 className="mt-2 font-display text-[clamp(3rem,7vw,5.5rem)] leading-[0.9] font-bold">Meet {character.name}</h1>
              <p className="mt-4 max-w-[26rem] text-[clamp(1.1rem,1.6vw,1.3rem)] leading-snug font-medium opacity-90">{character.worldLine}.</p>

              <dl className="mt-8 grid max-w-[30rem] grid-cols-2 gap-3">
                <Fact label="Who">{character.role}</Fact>
                <Fact label="World">{character.world}</Fact>
              </dl>

              <h2 className="mt-8 text-[0.8rem] font-bold tracking-[0.18em] uppercase opacity-75">{character.name} will help you</h2>
              <ul className="mt-3 grid gap-3">
                {character.helps.map((help) => (
                  <li key={help} className="flex items-center gap-3 text-[1.08rem] leading-snug font-semibold">
                    <span className="grid size-7 flex-none place-items-center rounded-full bg-white" style={{ color: character.deep }}>
                      <Icon name="check" className="size-4" />
                    </span>
                    {help}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={start}
                disabled={leaving}
                className="mt-10 inline-flex h-16 cursor-pointer items-center justify-center gap-3 rounded-full bg-white pr-9 pl-3 font-display text-[1.4rem] font-bold shadow-[0_18px_40px_-14px_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-0.5 active:scale-[0.97] max-[860px]:sticky max-[860px]:bottom-[max(1rem,env(safe-area-inset-bottom))] max-[860px]:w-full"
                style={{ color: character.deep }}
              >
                <span className="grid size-11 place-items-center rounded-full text-white" style={{ backgroundColor: character.deep }}>
                  <Icon name="trail" className="size-5" />
                </span>
                Start journey
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/15 px-4 py-3 ring-1 ring-white/20">
      <dt className="text-[0.72rem] font-bold tracking-[0.18em] uppercase opacity-70">{label}</dt>
      <dd className="mt-1 font-display text-[1.25rem] leading-tight font-medium">{children}</dd>
    </div>
  );
}
