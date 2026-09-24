"use client";

import { useRef, type ReactNode } from "react";
import Link from "next/link";

import type { Character } from "@/lib/catalog-types";

import Face from "./Face";
import Icon from "./Icon";

interface RowProps {
  title: string;
  /** Wears this friend's face beside the heading. */
  host?: Character;
  seeAll?: string;
  children: ReactNode;
}

/**
 * A titled row that scrolls sideways. Swipe on touch; on a pointer there are
 * two round arrows. Cards snap so a row never rests on half a card.
 */
export default function Row({ title, host, seeAll, children }: RowProps) {
  const scroller = useRef<HTMLDivElement | null>(null);

  const page = (direction: 1 | -1) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.82, behavior: "smooth" });
  };

  return (
    <section className="mt-[clamp(2.25rem,4vw,3.25rem)]">
      <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-4 px-6 max-[640px]:px-4">
        <div className="flex min-w-0 items-center gap-3">
          {host && <Face character={host} className="size-9" />}
          <h2 className="truncate font-display text-[clamp(1.3rem,2vw,1.55rem)] leading-tight font-medium">{title}</h2>
          {seeAll && (
            <Link
              href={seeAll}
              className="ml-1 flex-none rounded-full px-3 py-1.5 text-[0.88rem] font-semibold text-ink-soft transition-colors hover:bg-mist hover:text-ink"
            >
              See all
            </Link>
          )}
        </div>
        <div className="flex gap-2 max-[768px]:hidden">
          {([-1, 1] as const).map((direction) => (
            <button
              key={direction}
              type="button"
              onClick={() => page(direction)}
              aria-label={direction < 0 ? `Scroll ${title} left` : `Scroll ${title} right`}
              className="grid size-10 cursor-pointer place-items-center rounded-full text-ink-soft transition-colors hover:bg-mist hover:text-ink"
            >
              <Icon name={direction < 0 ? "chevron-left" : "chevron-right"} className="size-5" />
            </button>
          ))}
        </div>
      </div>

      {/* The scroller spans the viewport so cards slide out past the page
          gutter instead of being cut at it; the padding keeps the first card
          on the gutter. */}
      <div
        ref={scroller}
        className="no-scrollbar mt-4 flex snap-x snap-mandatory scroll-px-[max(1.5rem,calc((100vw-1320px)/2+1.5rem))] gap-5 overflow-x-auto px-[max(1.5rem,calc((100vw-1320px)/2+1.5rem))] pt-2 pb-4 max-[640px]:scroll-px-4 max-[640px]:gap-4 max-[640px]:px-4"
      >
        {children}
      </div>
    </section>
  );
}

/** Width of a card in a row: about four across on a laptop, one and a bit on a phone. */
export const ROW_CARD = "w-[clamp(236px,24vw,300px)] flex-none snap-start";
