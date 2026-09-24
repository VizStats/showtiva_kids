import Link from "next/link";

import { cx } from "@/lib/cx";
import type { Character, ShowLite } from "@/lib/catalog-types";

import ShowArt from "./ShowArt";

interface ShowCardProps {
  show: ShowLite;
  characters: Character[];
  className?: string;
  /** 0 to 1: how much has been watched, drawn along the foot of the art. */
  progress?: number;
  /** Replaces the meta line, e.g. "Continue S1 E3". */
  note?: string;
}

/**
 * A show in a row or grid. The art is the button; the title sits under it in
 * plain type so it stays readable at any size. On hover the host hops.
 */
export default function ShowCard({ show, characters, className, progress, note }: ShowCardProps) {
  return (
    <Link
      href={`/watch/${show.id}`}
      className={cx("group block rounded-card outline-offset-4", className)}
      aria-label={`${show.title}. ${note ?? show.meta}. Ages ${show.ageMin} and up.`}
    >
      <ShowArt
        show={show}
        characters={characters}
        className="aspect-[16/10] rounded-card transition-transform duration-300 ease-out-soft group-hover:-translate-y-1 group-active:scale-[0.98] [&_[data-host]]:group-hover:-translate-y-[5%]"
      >
        {progress !== undefined && progress > 0 && (
          <span className="absolute inset-x-3 bottom-3 h-1.5 overflow-hidden rounded-full bg-black/20">
            <span className="block h-full rounded-full bg-white" style={{ width: `${Math.max(6, progress * 100)}%` }} />
          </span>
        )}
      </ShowArt>
      <span className="mt-3 block truncate px-0.5 font-display text-[1.08rem] leading-tight font-medium text-ink">{show.title}</span>
      <span className="mt-0.5 block truncate px-0.5 text-[0.85rem] font-medium text-ink-faint">
        {note ?? `${show.meta} · ${show.ageMin}+`}
      </span>
    </Link>
  );
}
