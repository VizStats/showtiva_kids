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
 * four-year-old's thumb. Choosing one writes the cookie and goes to the
 * catalog. Adding a child is a grown-up's job, so "Add" goes to the add-kids
 * page, which sits behind the grown-up check.
 */
export default function ProfilesClient({ state }: { state: ProfileState }) {
  const router = useRouter();
  const now = useClock(60_000);
  const [leaving, setLeaving] = useState<string | null>(null);

  const choose = (id: string) => {
    setLeaving(id);
    writeProfiles({ ...state, active: id });
    // A beat for the chosen face to bounce before the page changes.
    window.setTimeout(() => router.push("/watch"), 260);
  };

  return (
    <main className="relative flex min-h-dvh flex-col overflow-clip bg-canvas">
      {/* Big soft colour fields in the corners, borrowed from the crew. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <span className="absolute -top-[18vmax] -left-[12vmax] size-[46vmax] rounded-full bg-[#e2f0ff] opacity-80" />
        <span className="absolute -right-[14vmax] -bottom-[20vmax] size-[50vmax] rounded-full bg-[#ffe3ec] opacity-70" />
        <span className="absolute top-[18%] -right-[8vmax] size-[18vmax] rounded-full bg-[#fff4c7] opacity-80" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 pt-5 max-[640px]:px-4">
        <Link href="/" aria-label="ShowTiva Kids home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.svg" alt="ShowTiva Kids" className="h-10 w-auto" />
        </Link>
        <Link
          href="/parents"
          className="inline-flex h-11 items-center gap-2 rounded-full bg-paper/80 px-4 text-[0.9rem] font-semibold text-ink ring-1 ring-line backdrop-blur transition-colors hover:bg-paper"
        >
          <Icon name="lock" className="size-[18px]" />
          Grown-ups
        </Link>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-[1100px] flex-1 flex-col items-center justify-center px-6 pt-8 pb-16 text-center max-[640px]:px-4">
        <h1 className="animate-fade-up font-display text-[clamp(2.4rem,5.4vw,3.8rem)] leading-none font-medium">Who&apos;s watching?</h1>

        <ul className="mt-[clamp(2.5rem,6vh,4rem)] flex flex-wrap items-start justify-center gap-x-[clamp(1.25rem,3.5vw,2.75rem)] gap-y-8">
          {state.list.map((profile, i) => (
            <li key={profile.id} className="animate-pop" style={{ animationDelay: `${0.08 + i * 0.07}s` }}>
              <button
                type="button"
                onClick={() => choose(profile.id)}
                className="group flex cursor-pointer flex-col items-center gap-3 rounded-[2rem] outline-offset-8"
              >
                <span
                  className={cx(
                    "block rounded-full bg-paper p-[5px] shadow-pop transition-transform duration-300 ease-spring group-hover:-translate-y-1.5 group-hover:scale-[1.04] group-active:scale-95",
                    leaving === profile.id && "animate-jump",
                  )}
                >
                  <KidAvatar profile={profile} className="size-[clamp(112px,15vw,152px)]" />
                </span>
                <span className="font-display text-[1.35rem] leading-none font-medium">{profile.name}</span>
                <span className="-mt-1 text-[0.85rem] font-semibold text-ink-faint">
                  {profile.birth && now !== null ? `${ageFromBirth(profile.birth, new Date(now))} years old` : ageBand(profile.age).label}
                </span>
              </button>
            </li>
          ))}

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
      </section>
    </main>
  );
}
