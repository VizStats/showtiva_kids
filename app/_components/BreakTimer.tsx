"use client";

// The break timer's other half: when the time a grown-up set runs out, the
// whole app gives way to a friendly "time for a break" screen until a
// grown-up unlocks it. Mounted once in the root layout so it covers every
// page, including the player, whose video it pauses.
//
// Not shown on the landing page (a parent reading about the app should not be
// locked out of reading about it) or in the grown-ups area itself.

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

import { parseTimer, readTimerRaw, setTimer, subscribeDevice } from "@/lib/device";
import { useClock } from "@/lib/use-client";

import Icon from "./Icon";
import ParentGate from "./ParentGate";

const COCO = { name: "Coco", image: "/characters/coco.svg", aspect: 0.5485 };

export default function BreakTimer() {
  const pathname = usePathname();
  const timer = parseTimer(useSyncExternalStore(subscribeDevice, readTimerRaw, () => ""));
  const now = useClock(1000);
  const [gate, setGate] = useState(false);

  const exempt = pathname === "/" || pathname.startsWith("/parents");
  const due = !!timer && now !== null && now >= timer.endsAt && !exempt;

  useEffect(() => {
    if (!due) return;
    for (const video of document.querySelectorAll("video")) video.pause();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [due]);

  if (!due || !timer) return null;

  return (
    <div className="fixed inset-0 z-[90] grid animate-fade place-items-center overflow-hidden bg-[#2a2350] p-6 text-white">
      {/* A night sky: a few soft stars, nothing that moves fast. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {[
          [12, 18, 3],
          [26, 72, 2],
          [44, 12, 2],
          [70, 22, 3],
          [84, 64, 2],
          [92, 14, 2],
          [60, 80, 2],
          [8, 58, 2],
        ].map(([x, y, r], i) => (
          <span
            key={i}
            className="absolute animate-pulse rounded-full bg-white/70"
            style={{ left: `${x}%`, top: `${y}%`, width: r * 2, height: r * 2, animationDelay: `${i * 0.4}s` }}
          />
        ))}
      </div>

      <div className="relative flex max-w-[520px] flex-col items-center text-center">
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={COCO.image} alt="Coco, yawning" className="h-[38vh] max-h-[340px] min-h-[200px] w-auto animate-sway" style={{ aspectRatio: COCO.aspect }} />
          {["Z", "z", "z"].map((letter, i) => (
            <span
              key={i}
              aria-hidden
              className="absolute top-[6%] right-[-6%] animate-zzz font-display text-[2rem] font-medium text-white/80"
              style={{ animationDelay: `${i * 0.9}s` }}
            >
              {letter}
            </span>
          ))}
        </div>

        <h1 className="mt-6 font-display text-[clamp(2rem,5vw,3rem)] leading-[1.05] font-medium">Time for a break!</h1>
        <p className="mt-3 text-[1.05rem] leading-relaxed text-white/75">
          That&apos;s all the screen time for now. Stretch, get a drink of water, or go and find a grown-up. The crew will be
          right here when you come back.
        </p>

        <button
          type="button"
          onClick={() => setGate(true)}
          className="mt-8 inline-flex h-12 cursor-pointer items-center gap-2 rounded-full bg-white/12 px-6 text-[0.95rem] font-semibold text-white ring-1 ring-white/25 transition-colors hover:bg-white/20"
        >
          <Icon name="lock" className="size-5" />
          Grown-ups: unlock
        </button>
      </div>

      {gate && (
        <GrownUpChoice
          minutes={timer.minutes}
          onDone={() => setGate(false)}
        />
      )}
    </div>
  );
}

function GrownUpChoice({ minutes, onDone }: { minutes: number; onDone: () => void }) {
  const [passed, setPassed] = useState(false);

  if (!passed) {
    return <ParentGate reason="Unlock ShowTiva Kids" onPass={() => setPassed(true)} onCancel={onDone} />;
  }

  return (
    <div className="fixed inset-0 z-[95] grid animate-fade place-items-center bg-ink/50 p-4 text-ink backdrop-blur-md">
      <div className="w-full max-w-[380px] animate-sheet rounded-panel bg-paper p-7 text-center shadow-lift">
        <h2 className="font-display text-[1.45rem] font-medium">How about now?</h2>
        <p className="mt-2 text-[0.95rem] text-ink-soft">Choose what happens next. You can change this any time in the grown-ups area.</p>
        <div className="mt-6 grid gap-2.5">
          {[15, minutes].filter((m, i, all) => all.indexOf(m) === i).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setTimer(m);
                onDone();
              }}
              className="h-13 cursor-pointer rounded-2xl bg-ink px-5 text-[0.98rem] font-semibold text-white transition-transform active:scale-[0.98]"
            >
              {m} more minutes
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setTimer(null);
              onDone();
            }}
            className="h-13 cursor-pointer rounded-2xl bg-mist px-5 text-[0.98rem] font-semibold text-ink transition-colors hover:bg-[#ebe3d6]"
          >
            Turn the timer off
          </button>
        </div>
      </div>
    </div>
  );
}
