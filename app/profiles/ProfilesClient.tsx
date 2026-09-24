"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { cx, tint } from "@/lib/cx";
import { gateOpen, readGateRaw } from "@/lib/device";
import type { Character as CharacterData } from "@/lib/catalog-types";
import { MAX_PROFILES, writeProfiles, type ProfileState } from "@/lib/profiles";

import Face from "../_components/Face";
import Icon from "../_components/Icon";
import ParentGate from "../_components/ParentGate";
import AddProfile from "./AddProfile";

interface ProfilesClientProps {
  characters: CharacterData[];
  state: ProfileState;
  startAdding: boolean;
}

/**
 * "Who's watching?" Each profile is its buddy's face in a ring of the
 * buddy's colour, big enough for a four-year-old's thumb. Choosing one writes
 * the cookie and goes to the catalog; adding one is a grown-up's job, so it
 * sits behind the gate.
 */
export default function ProfilesClient({ characters, state, startAdding }: ProfilesClientProps) {
  const router = useRouter();
  // Arriving from "Add a profile" in the grown-ups area opens straight onto
  // the gate, which lets itself through when it was passed a moment ago.
  const [stage, setStage] = useState<"idle" | "gate" | "add">(startAdding ? "gate" : "idle");
  const [leaving, setLeaving] = useState<string | null>(null);

  const startAdd = () => setStage(gateOpen(readGateRaw()) ? "add" : "gate");

  const byId = (id: string) => characters.find((c) => c.id === id) ?? characters[0];
  const empty = state.list.length === 0;

  const choose = (id: string) => {
    setLeaving(id);
    writeProfiles({ ...state, active: id });
    // A beat for the chosen face to bounce before the page changes.
    window.setTimeout(() => router.push("/watch"), 260);
  };

  return (
    // overflow-clip, not hidden: a hidden box is still a scroll container,
    // and focusing the name field inside the dialog scrolled the whole page
    // up inside it, with no scrollbar to bring it back.
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
        {empty ? (
          <>
            <div className="flex items-end justify-center">
              {["kai", "bloop", "nova"].map((id, i) => (
                <span key={id} className="-mx-3 animate-rise" style={{ animationDelay: `${0.1 + i * 0.1}s` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={byId(id).image}
                    alt=""
                    className={cx("w-auto animate-bob", i === 1 ? "h-[200px]" : "h-[160px]")}
                    style={{ aspectRatio: byId(id).aspect, animationDelay: `${i * 0.5}s` }}
                  />
                </span>
              ))}
            </div>
            <h1 className="mt-6 font-display text-[clamp(2.2rem,5vw,3.4rem)] leading-[1.02] font-medium text-balance">
              Let&apos;s make your first profile
            </h1>
            <p className="mt-4 max-w-[30rem] text-[1.05rem] leading-relaxed text-ink-soft">
              A grown-up picks a name and an age, and your child picks a buddy from the crew. It takes less than a minute.
            </p>
            <button
              type="button"
              onClick={startAdd}
              className="mt-8 inline-flex h-14 cursor-pointer items-center gap-2.5 rounded-full bg-ink px-7 text-[1.02rem] font-semibold text-white transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <Icon name="plus" className="size-5" />
              Set up a profile
            </button>
          </>
        ) : (
          <>
            <h1 className="animate-fade-up font-display text-[clamp(2.4rem,5.4vw,3.8rem)] leading-none font-medium">
              Who&apos;s watching?
            </h1>

            <ul className="mt-[clamp(2.5rem,6vh,4rem)] flex flex-wrap items-start justify-center gap-x-[clamp(1.25rem,3.5vw,2.75rem)] gap-y-8">
              {state.list.map((profile, i) => {
                const buddy = byId(profile.character);
                return (
                  <li key={profile.id} className="animate-pop" style={{ animationDelay: `${0.08 + i * 0.07}s` }}>
                    <button
                      type="button"
                      onClick={() => choose(profile.id)}
                      style={tint(buddy)}
                      className="group flex cursor-pointer flex-col items-center gap-4 rounded-[2rem] outline-offset-8"
                    >
                      <span
                        className={cx(
                          "relative block rounded-full bg-(--c) p-[6px] shadow-pop transition-transform duration-300 ease-spring group-hover:-translate-y-1.5 group-hover:scale-[1.04] group-active:scale-95",
                          leaving === profile.id && "animate-jump",
                        )}
                      >
                        <Face character={buddy} plain className="block size-[clamp(112px,15vw,152px)]" />
                      </span>
                      <span className="font-display text-[1.35rem] leading-none font-medium">{profile.name}</span>
                    </button>
                  </li>
                );
              })}

              {state.list.length < MAX_PROFILES && (
                <li className="animate-pop" style={{ animationDelay: `${0.08 + state.list.length * 0.07}s` }}>
                  <button
                    type="button"
                    onClick={startAdd}
                    className="group flex cursor-pointer flex-col items-center gap-4 rounded-[2rem] outline-offset-8"
                  >
                    <span className="grid size-[calc(clamp(112px,15vw,152px)+12px)] place-items-center rounded-full border-[3px] border-dashed border-ink/20 text-ink-soft transition-[border-color,color,transform] duration-300 ease-spring group-hover:-translate-y-1.5 group-hover:border-ink/40 group-hover:text-ink">
                      <Icon name="plus" className="size-10" />
                    </span>
                    <span className="font-display text-[1.35rem] leading-none font-medium text-ink-soft group-hover:text-ink">
                      Add
                    </span>
                  </button>
                </li>
              )}
            </ul>
          </>
        )}
      </section>

      {stage === "gate" && (
        <ParentGate reason="Set up a new profile" onPass={() => setStage("add")} onCancel={() => setStage("idle")} />
      )}
      {stage === "add" && (
        <AddProfile
          characters={characters}
          state={state}
          onClose={() => setStage("idle")}
          onSaved={() => {
            setStage("idle");
            router.push("/watch");
          }}
        />
      )}
    </main>
  );
}
