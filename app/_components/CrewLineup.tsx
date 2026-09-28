import { cx, tint } from "@/lib/cx";
import type { Character as CharacterData } from "@/lib/catalog-types";

import Character from "./Character";

/**
 * All six friends standing shoulder to shoulder, the way the brand art shows
 * them. They rise in one at a time, then each breathes on its own rhythm so
 * the line never moves in lockstep. Pointing at one makes it jump and shows
 * its name. Decoration only: they lead nowhere.
 */
export default function CrewLineup({
  characters,
  className,
  order = ["kai", "cog", "bloop", "coco", "nova", "zip"],
  startDelay = 0.35,
}: {
  characters: CharacterData[];
  className?: string;
  order?: string[];
  startDelay?: number;
}) {
  const line = order
    .map((id) => characters.find((character) => character.id === id))
    .filter((character): character is CharacterData => Boolean(character));

  return (
    <ul className={cx("flex items-end justify-center", className)} aria-hidden>
      {line.map((character, i) => (
        <li
          key={character.id}
          className="relative -mx-[1.2%] animate-rise first:ml-0 last:mr-0"
          style={{ animationDelay: `${startDelay + i * 0.09}s`, zIndex: i === 2 ? 3 : i === 3 ? 2 : 1 }}
        >
          <span className="group relative block" style={tint(character)}>
            <span
              className="pointer-events-none absolute -top-3 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full rounded-full bg-(--c) px-3.5 py-1.5 font-display text-[1rem] font-medium whitespace-nowrap text-(--c-on) shadow-pop group-hover:block group-hover:animate-bubble"
            >
              {character.name}
            </span>
            <span className="block animate-bob" style={{ animationDelay: `${i * 0.55}s` }}>
              <Character
                character={character}
                decorative
                priority
                className="h-[var(--lineup-h,clamp(120px,24vw,330px))] origin-bottom group-hover:animate-jump"
              />
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
