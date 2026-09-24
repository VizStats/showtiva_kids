"use client";

// The grown-ups area. The one screen in the app that is allowed to look like
// settings: calm, dense, no characters bouncing. It opens behind the gate,
// and the gate holds for a few minutes so a parent changing three things is
// asked one sum, not three.

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { SHOWTIVA_URL, cx, tint } from "@/lib/cx";
import type { Character } from "@/lib/catalog-types";
import {
  clearDevice,
  closeGate,
  gateOpen,
  parseTimer,
  readGateRaw,
  readTimerRaw,
  setTimer,
  subscribeDevice,
} from "@/lib/device";
import { AGE_BANDS, EMPTY_PROFILES, writeProfiles, type AgeBandId, type ProfileState } from "@/lib/profiles";
import { useClock } from "@/lib/use-client";

import Face from "../_components/Face";
import Icon from "../_components/Icon";
import ParentGate from "../_components/ParentGate";

const TIMER_CHOICES = [null, 15, 30, 45, 60] as const;

export default function ParentsClient({ characters, state }: { characters: Character[]; state: ProfileState }) {
  const router = useRouter();
  const gateRaw = useSyncExternalStore(subscribeDevice, readGateRaw, () => "");
  // Checked against the viewer's clock; null on the server, which cannot know.
  const now = useClock(1000);
  const unlocked = now !== null && gateOpen(gateRaw, now);

  const timer = parseTimer(useSyncExternalStore(subscribeDevice, readTimerRaw, () => ""));
  const [confirmReset, setConfirmReset] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const buddy = (id: string) => characters.find((c) => c.id === id) ?? characters[0];

  const save = (next: ProfileState) => {
    writeProfiles(next);
    router.refresh();
  };

  if (now === null) return <main className="min-h-dvh" />;

  if (!unlocked) {
    return (
      <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-10">
        <div className="flex w-full flex-col items-center">
          <ParentGate inline reason="Open the grown-ups area" onPass={() => undefined} />
          <Link href="/watch" className="mt-6 text-[0.95rem] font-semibold text-ink-soft hover:text-ink">
            Back to ShowTiva Kids
          </Link>
        </div>
      </main>
    );
  }

  const minutesLeft = timer ? Math.max(0, Math.ceil((timer.endsAt - now) / 60_000)) : null;

  return (
    <main className="min-h-dvh bg-canvas pb-20">
      <header className="mx-auto flex max-w-[880px] items-center justify-between gap-4 px-6 pt-6 max-[640px]:px-4">
        <Link href="/watch" aria-label="ShowTiva Kids home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.svg" alt="ShowTiva Kids" className="h-10 w-auto" />
        </Link>
        <button
          type="button"
          onClick={() => {
            closeGate();
            router.push("/watch");
          }}
          className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-full bg-ink px-5 text-[0.95rem] font-semibold text-white"
        >
          <Icon name="lock" className="size-5" />
          Lock and go back
        </button>
      </header>

      <div className="mx-auto max-w-[880px] px-6 max-[640px]:px-4">
        <h1 className="mt-10 font-display text-[clamp(2.2rem,4.6vw,3rem)] leading-none font-medium">Grown-ups</h1>
        <p className="mt-3 text-[1.02rem] text-ink-soft">Everything here stays on this device. There is no account to sign in to.</p>

        {/* ---- profiles ---- */}
        <Panel title="Profiles" icon="profiles" note="Each profile only sees shows for its age.">
          {state.list.length === 0 ? (
            <p className="text-[0.98rem] text-ink-soft">No profiles yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {state.list.map((profile) => {
                const b = buddy(profile.character);
                return (
                  <li key={profile.id} className="flex flex-wrap items-center gap-4 py-4 first:pt-0 last:pb-0">
                    <span className="rounded-full bg-(--c) p-[3px]" style={tint(b)}>
                      <Face character={b} plain className="block size-12" />
                    </span>
                    <span className="min-w-[7rem] flex-1">
                      <span className="block font-display text-[1.25rem] leading-tight font-medium">{profile.name}</span>
                      <span className="text-[0.88rem] text-ink-soft">Buddy: {b.name}</span>
                    </span>
                    <div className="flex flex-wrap gap-1 rounded-full bg-mist p-1" role="radiogroup" aria-label={`Age for ${profile.name}`}>
                      {AGE_BANDS.map((band) => (
                        <button
                          key={band.id}
                          type="button"
                          role="radio"
                          aria-checked={profile.age === band.id}
                          onClick={() =>
                            save({
                              ...state,
                              list: state.list.map((p) => (p.id === profile.id ? { ...p, age: band.id as AgeBandId } : p)),
                            })
                          }
                          className={cx(
                            "h-10 cursor-pointer rounded-full px-4 text-[0.88rem] font-bold transition-colors",
                            profile.age === band.id ? "bg-paper text-ink shadow-soft" : "text-ink-soft hover:text-ink",
                          )}
                          title={band.range}
                        >
                          {band.label}
                        </button>
                      ))}
                    </div>
                    {removing === profile.id ? (
                      <span className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const list = state.list.filter((p) => p.id !== profile.id);
                            save({ active: state.active === profile.id ? null : state.active, list });
                            setRemoving(null);
                          }}
                          className="h-10 cursor-pointer rounded-full bg-berry px-4 text-[0.88rem] font-bold text-white"
                        >
                          Remove
                        </button>
                        <button type="button" onClick={() => setRemoving(null)} className="h-10 cursor-pointer rounded-full px-3 text-[0.88rem] font-bold text-ink-soft">
                          Keep
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setRemoving(profile.id)}
                        aria-label={`Remove ${profile.name}`}
                        className="grid size-10 cursor-pointer place-items-center rounded-full text-ink-faint transition-colors hover:bg-mist hover:text-berry"
                      >
                        <Icon name="trash" className="size-5" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <Link
            href="/profiles?add=1"
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-mist px-4 text-[0.92rem] font-bold text-ink transition-colors hover:bg-[#ebe3d6]"
          >
            <Icon name="plus" className="size-5" />
            Add a profile
          </Link>
        </Panel>

        {/* ---- screen time ---- */}
        <Panel
          title="Break timer"
          icon="timer"
          note="When it runs out, Coco calls a break and the app stays paused until a grown-up unlocks it."
        >
          <div className="flex flex-wrap gap-1 rounded-full bg-mist p-1" role="radiogroup" aria-label="Break timer">
            {TIMER_CHOICES.map((minutes) => {
              const current = minutes === null ? !timer : timer?.minutes === minutes;
              return (
                <button
                  key={String(minutes)}
                  type="button"
                  role="radio"
                  aria-checked={current}
                  onClick={() => setTimer(minutes)}
                  className={cx(
                    "h-11 min-w-[4.5rem] flex-1 cursor-pointer rounded-full px-4 text-[0.95rem] font-bold transition-colors",
                    current ? "bg-paper text-ink shadow-soft" : "text-ink-soft hover:text-ink",
                  )}
                >
                  {minutes === null ? "Off" : `${minutes} min`}
                </button>
              );
            })}
          </div>
          {timer && (
            <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.95rem] text-ink-soft">
              <span>
                {minutesLeft === 0 ? (
                  <strong className="text-ink">Break time now.</strong>
                ) : (
                  <>
                    Break in <strong className="text-ink">{minutesLeft} min</strong>.
                  </>
                )}
              </span>
              <button type="button" onClick={() => setTimer(timer.minutes)} className="cursor-pointer font-bold text-teal hover:underline">
                Start again
              </button>
            </p>
          )}
        </Panel>

        {/* ---- promises ---- */}
        <Panel title="What your child will never see" icon="shield">
          <ul className="grid gap-3 text-[0.98rem] text-ink-soft sm:grid-cols-2">
            {[
              "Adverts of any kind",
              "Chat, comments or messages",
              "Shows above their age setting",
              "Autoplay into another show",
              "Links out to the open web",
              "Anything we haven't watched first",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <span className="mt-0.5 grid size-6 flex-none place-items-center rounded-full bg-[#d8f6ee] text-[#0a7d6b]">
                  <Icon name="check" className="size-4" />
                </span>
                {line}
              </li>
            ))}
          </ul>
        </Panel>

        {/* ---- the grown-up app, and a clean slate ---- */}
        <Panel title="More" icon="sparkle">
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={SHOWTIVA_URL}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[0.92rem] font-bold text-white"
            >
              Go to ShowTiva
              <Icon name="chevron-right" className="size-4" />
            </a>
            {confirmReset ? (
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-[0.92rem] text-ink-soft">Remove every profile, favourite and setting?</span>
                <button
                  type="button"
                  onClick={() => {
                    clearDevice();
                    save(EMPTY_PROFILES);
                    router.push("/");
                  }}
                  className="h-11 cursor-pointer rounded-full bg-berry px-5 text-[0.92rem] font-bold text-white"
                >
                  Yes, reset
                </button>
                <button type="button" onClick={() => setConfirmReset(false)} className="h-11 cursor-pointer rounded-full px-4 text-[0.92rem] font-bold text-ink-soft">
                  Cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-[0.92rem] font-bold text-ink-soft ring-1 ring-line transition-colors hover:bg-mist hover:text-ink"
              >
                <Icon name="trash" className="size-5" />
                Reset this device
              </button>
            )}
          </div>
        </Panel>
      </div>
    </main>
  );
}

function Panel({ title, icon, note, children }: { title: string; icon: Parameters<typeof Icon>[0]["name"]; note?: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-panel bg-paper p-[clamp(1.25rem,3vw,2rem)] shadow-soft ring-1 ring-line">
      <div className="mb-5 flex items-start gap-3">
        <span className="grid size-11 flex-none place-items-center rounded-2xl bg-mist text-ink">
          <Icon name={icon} className="size-6" />
        </span>
        <div>
          <h2 className="font-display text-[1.4rem] leading-tight font-medium">{title}</h2>
          {note && <p className="mt-1 text-[0.92rem] text-ink-soft">{note}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
