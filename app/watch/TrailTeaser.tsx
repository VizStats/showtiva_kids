"use client";

// The way onto the trail from Home: the buddy, the next stop, and the
// current island drawn small as a row of coins, so a child can see at a
// glance how close the next treasure chest is.

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";

import { cx, tint } from "@/lib/cx";
import type { Character as CharacterData, ResolvedChapter } from "@/lib/catalog-types";
import { parseTrail, readTrailRaw, subscribeDevice } from "@/lib/device";
import { currentIndex, trailItems } from "@/lib/trail";

import Character from "../_components/Character";
import Chest from "../_components/Chest";
import Icon from "../_components/Icon";

interface TrailTeaserProps {
  chapters: ResolvedChapter[];
  buddy: CharacterData;
  profileId: string;
}

export default function TrailTeaser({ chapters, buddy, profileId }: TrailTeaserProps) {
  const items = useMemo(() => trailItems(chapters), [chapters]);
  const progress = parseTrail(useSyncExternalStore(subscribeDevice, () => readTrailRaw(profileId), () => ""));
  if (!items.length) return null;

  const current = currentIndex(items, chapters, progress);
  const allDone = current >= items.length;
  const item = items[Math.min(current, items.length - 1)];
  const chapter = chapters[item.chapter];
  const islandItems = items.filter((i) => i.chapter === item.chapter);
  const stars = progress.done.length;

  const headline = allDone
    ? "You finished the whole trail!"
    : item.kind === "chest"
      ? "A treasure chest is waiting!"
      : current === 0
        ? `Start your adventure with ${buddy.name}`
        : `Next stop: ${item.stop.title}`;

  return (
    <section className="mx-auto mt-[clamp(2.5rem,4vw,3.5rem)] max-w-[1320px] px-6 max-[640px]:px-4">
      <Link
        href="/trail"
        style={tint(buddy)}
        className="group relative mt-12 flex items-center gap-6 rounded-stage bg-(--c-soft) py-6 pr-6 pl-[clamp(150px,16vw,200px)] transition-transform duration-300 ease-out-soft hover:-translate-y-0.5 max-[760px]:flex-col max-[760px]:items-start max-[760px]:pt-[150px] max-[760px]:pl-6"
      >
        <span className="pointer-events-none absolute bottom-0 left-4 h-[calc(100%+56px)] max-h-[230px] max-[760px]:top-[-48px] max-[760px]:bottom-auto max-[760px]:h-[190px]">
          <span className="block h-full animate-bob">
            <Character character={buddy} decorative className="h-full origin-bottom transition-transform duration-500 ease-spring group-hover:-rotate-3" />
          </span>
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[0.75rem] font-bold tracking-[0.14em] text-(--c-deep) uppercase">
            <Icon name="trail" className="size-4" />
            Your trail · {chapter.title}
          </p>
          <p className="mt-1.5 font-display text-[clamp(1.4rem,2.6vw,1.9rem)] leading-tight font-medium text-balance">{headline}</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-[0.95rem] font-semibold text-ink-soft">
            <Icon name="star" className="size-5 text-[#ffb800]" />
            {stars} {stars === 1 ? "star" : "stars"} collected
          </p>
        </div>

        {/* This island, drawn small. */}
        <ol className="flex flex-none items-center" aria-label={`${chapter.title} progress`}>
          {islandItems.map((i, n) => {
            const index = items.indexOf(i);
            const state = index < current ? "done" : index === current ? "current" : "locked";
            return (
              <li key={i.id} className="flex items-center">
                {n > 0 && (
                  <span className={cx("h-1 w-4 rounded-full max-[400px]:w-2", state === "locked" ? "bg-ink/10" : "bg-(--c)")} />
                )}
                {i.kind === "chest" ? (
                  <Chest state={state === "done" ? "open" : state === "current" ? "ready" : "locked"} className="size-11" />
                ) : (
                  <span
                    className={cx(
                      "relative grid size-9 place-items-center rounded-full",
                      state === "done" && "bg-(--c) text-white",
                      state === "current" && "bg-paper text-(--c-deep) ring-4 ring-(--c)",
                      state === "locked" && "bg-[#ece6dc] text-[#aaa194]",
                    )}
                  >
                    <Icon name={state === "done" ? "star" : state === "current" ? "play" : "lock"} className="size-4" />
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        <span className="inline-flex h-13 flex-none items-center gap-2 rounded-full bg-ink px-6 text-[1rem] font-bold text-white transition-transform group-hover:translate-x-0.5 max-[760px]:w-full max-[760px]:justify-center">
          {allDone ? "See my trail" : current === 0 ? "Let's go" : "Keep going"}
          <Icon name="chevron-right" className="size-5" />
        </span>
      </Link>
    </section>
  );
}
