import Link from "next/link";

import { cx, tint } from "@/lib/cx";
import type { Character as CharacterData } from "@/lib/catalog-types";

import Character from "./Character";

/**
 * One friend, in their colour, stepping out of the top of their card. The
 * character is the only decoration the card has; the type does the rest.
 */
export default function CrewCard({ character, className }: { character: CharacterData; className?: string }) {
  return (
    <Link
      href={`/friends/${character.id}`}
      style={tint(character)}
      className={cx(
        "group relative mt-[clamp(70px,9vw,110px)] flex flex-col rounded-panel bg-(--c-soft) px-6 pt-[clamp(150px,17vw,210px)] pb-6 transition-[transform,box-shadow] duration-300 ease-out-soft hover:-translate-y-1.5 hover:shadow-pop",
        className,
      )}
    >
      <span className="pointer-events-none absolute -top-[clamp(70px,9vw,110px)] left-1/2 -translate-x-1/2">
        <Character
          character={character}
          decorative
          className="h-[clamp(210px,25vw,300px)] origin-bottom transition-transform duration-500 ease-spring group-hover:-translate-y-2 group-hover:-rotate-3"
        />
      </span>

      <span className="font-display text-[1.9rem] leading-none font-medium text-(--c-deep)">{character.name}</span>
      <span className="mt-1.5 text-[0.95rem] font-semibold text-ink-soft">{character.role}</span>
      <span className="mt-4 flex items-center justify-between gap-3 border-t border-(--c)/20 pt-4">
        <span className="text-[0.9rem] leading-snug text-ink-soft">
          <strong className="block font-bold text-ink">{character.world}</strong>
          {character.worldLine}
        </span>
        <span className="grid size-11 flex-none place-items-center rounded-full bg-(--c) text-(--c-on) transition-transform duration-300 ease-spring group-hover:translate-x-1">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h13M13 6l6 6-6 6" />
          </svg>
        </span>
      </span>
    </Link>
  );
}
