import type { CSSProperties } from "react";

import { cx } from "@/lib/cx";
import type { Character as CharacterData } from "@/lib/catalog-types";

interface CharacterProps {
  character: Pick<CharacterData, "name" | "image" | "aspect">;
  /** Height of the artwork; width follows the character's own proportions. */
  className?: string;
  style?: CSSProperties;
  /** Mirror the pose, for variety on generated artwork. */
  flip?: boolean;
  /** Decorative when a name sits beside it. */
  decorative?: boolean;
  priority?: boolean;
}

/**
 * A character, full body, on a transparent ground.
 *
 * A plain <img> on purpose: the artwork is vector, so it is sharp at every
 * size without a responsive set, and one cached file serves every place the
 * character appears (cards, avatars, the player's scrubber).
 */
export default function Character({ character, className, style, flip, decorative, priority }: CharacterProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={character.image}
      alt={decorative ? "" : character.name}
      draggable={false}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={cx("block w-auto max-w-none select-none", className)}
      style={{ aspectRatio: character.aspect, ...(flip ? { transform: "scaleX(-1)" } : null), ...style }}
    />
  );
}
