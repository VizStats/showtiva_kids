"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { cx } from "@/lib/cx";
import { MAX_PROFILES, ageBand, ageFromBirth, writeProfiles, type ProfileState } from "@/lib/profiles";
import { useClock } from "@/lib/use-client";

import Icon from "../_components/Icon";
import KidAvatar from "../_components/KidAvatar";

/**
 * "Who's watching?" Each child is their own photo, big enough for a
 * four-year-old's thumb. Tapping one picks them; "Continue" under the row goes
 * on to choosing their buddy. Two steps rather than one, so a stray tap on a
 * sibling's face does not open the app as the wrong child.
 */
export default function ProfilesClient({ state }: { state: ProfileState }) {
  const router = useRouter();
  const now = useClock(60_000);
  // Whoever watched last, or the only child, is already picked.
  const [picked, setPicked] = useState<string | null>(
    () => state.active ?? (state.list.length === 1 ? state.list[0].id : null),
  );
  const [bounce, setBounce] = useState<{ id: string; n: number } | null>(null);
  const [going, setGoing] = useState(false);

  const pick = (id: string) => {
    setPicked(id);
    setBounce((b) => ({ id, n: (b?.n ?? 0) + 1 }));
  };

  const watch = () => {
    if (!picked) return;
    setGoing(true);
    writeProfiles({ ...state, active: picked });
    router.push("/buddy");
  };

  return (
    <main className="relative flex min-h-dvh flex-col overflow-clip bg-canvas">
      {/* Big soft colour fields in the corners, borrowed from the crew. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <span className="absolute -top-[18vmax] -left-[12vmax] size-[46vmax] rounded-full bg-[#e2f0ff] opacity-80" />
        <span className="absolute -right-[14vmax] -bottom-[20vmax] size-[50vmax] rounded-full bg-[#ffe3ec] opacity-70" />
        <span className="absolute top-[18%] -right-[8vmax] size-[18vmax] rounded-full bg-[#fff4c7] opacity-80" />
      </div>

      <header className="relative z-10 flex items-center px-6 pt-5 max-[640px]:px-4">
        <Link href="/" aria-label="ShowTiva Kids home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.svg" alt="ShowTiva Kids" className="h-10 w-auto" />
        </Link>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-[1100px] flex-1 flex-col items-center justify-center px-6 pt-8 pb-16 text-center max-[640px]:px-4">
        <h1 className="animate-fade-up font-display text-[clamp(2.4rem,5.4vw,3.8rem)] leading-none font-medium">Who&apos;s watching?</h1>

        <ul
          className="mt-[clamp(2.5rem,6vh,4rem)] flex flex-wrap items-start justify-center gap-x-[clamp(1.25rem,3.5vw,2.75rem)] gap-y-8"
          role="radiogroup"
          aria-label="Who's watching"
        >
          {state.list.map((profile, i) => {
            const selected = picked === profile.id;
            return (
              <li key={profile.id} className="animate-pop" style={{ animationDelay: `${0.08 + i * 0.07}s` }}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={profile.name}
                  onClick={() => pick(profile.id)}
                  onDoubleClick={watch}
                  className="group flex cursor-pointer flex-col items-center gap-3 rounded-[2rem] outline-offset-8"
                >
                  <span
                    key={bounce?.id === profile.id ? bounce.n : 0}
                    className={cx(
                      "relative block rounded-full p-[5px] transition-[transform,background-color] duration-300 ease-spring group-hover:-translate-y-1.5 group-active:scale-95",
                      selected ? "bg-ink" : "bg-paper shadow-pop",
                      bounce?.id === profile.id && "animate-jump",
                    )}
                  >
                    <KidAvatar profile={profile} className="size-[clamp(112px,15vw,152px)] ring-4 ring-canvas" />
                    {selected && (
                      <span className="absolute -right-0.5 bottom-1 grid size-10 animate-pop place-items-center rounded-full bg-ink text-white ring-4 ring-canvas">
                        <Icon name="check" className="size-5" />
                      </span>
                    )}
                  </span>
                  <span className={cx("font-display text-[1.35rem] leading-none font-medium", !selected && picked && "text-ink-soft")}>
                    {profile.name}
                  </span>
                  <span className="-mt-1 text-[0.85rem] font-semibold text-ink-faint">
                    {profile.birth && now !== null ? `${ageFromBirth(profile.birth, new Date(now))} years old` : ageBand(profile.age).label}
                  </span>
                </button>
              </li>
            );
          })}

          {state.list.length < MAX_PROFILES && (
            <li className="animate-pop" style={{ animationDelay: `${0.08 + state.list.length * 0.07}s` }}>
              <Link href="/profiles/new" className="group flex flex-col items-center gap-3 rounded-[2rem] outline-offset-8">
                <span className="grid size-[calc(clamp(112px,15vw,152px)+10px)] place-items-center rounded-full border-[3px] border-dashed border-ink/20 text-ink-soft transition-[border-color,color,transform] duration-300 ease-spring group-hover:-translate-y-1.5 group-hover:border-ink/40 group-hover:text-ink">
                  <Icon name="plus" className="size-10" />
                </span>
                <span className="font-display text-[1.35rem] leading-none font-medium text-ink-soft group-hover:text-ink">Add a child</span>
              </Link>
            </li>
          )}
        </ul>

        {/* The way in, under everyone, the same shape as the landing's. */}
        <button
          type="button"
          onClick={watch}
          disabled={!picked || going}
          className="group mt-[clamp(2.5rem,6vh,3.5rem)] inline-flex h-14 cursor-pointer items-center gap-3 rounded-full bg-ink pr-7 pl-2.5 text-[1.02rem] font-semibold text-white transition-[transform,background-color,color] hover:-translate-y-0.5 active:scale-[0.98] disabled:cursor-default disabled:bg-mist disabled:text-ink-faint disabled:hover:translate-y-0"
        >
          <span className="grid size-10 place-items-center rounded-full bg-white text-ink transition-transform duration-300 ease-spring group-hover:scale-110 group-disabled:scale-100">
            <Icon name="play" className="size-5 translate-x-px" />
          </span>
          Continue
        </button>
        <p className="mt-3 h-5 text-[0.9rem] font-semibold text-ink-faint" aria-live="polite">
          {picked ? "" : "Tap your picture first"}
        </p>
      </section>
    </main>
  );
}
