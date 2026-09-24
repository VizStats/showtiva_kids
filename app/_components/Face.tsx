import { cx, tint } from "@/lib/cx";
import type { Character } from "@/lib/catalog-types";

interface FaceProps {
  character: Character;
  /** Sizing and ring classes; the face fills whatever box this sets. */
  className?: string;
  /** Plain white behind the face instead of the character's tint. */
  plain?: boolean;
  decorative?: boolean;
}

/**
 * Just the face, in a circle: the same artwork file as the full character,
 * cropped with CSS using the face box stored for each character. No second
 * image to keep in step, and the browser reuses the one it already decoded.
 */
export default function Face({ character, className, plain, decorative = true }: FaceProps) {
  const { x, y, size } = character.face;
  // The image is scaled so the face square fills the circle, then shifted so
  // the square's corner sits at the circle's corner. Widths are in circle
  // widths; the vertical shift converts the height percentage through the
  // artwork's aspect ratio.
  const width = 100 / (size / 100);
  const left = -(x / size) * 100;
  const top = -((y / 100) * (width / character.aspect));

  return (
    <span
      className={cx(
        "relative inline-block shrink-0 overflow-hidden rounded-full",
        plain ? "bg-paper" : "bg-(--c-soft)",
        className,
      )}
      style={tint(character)}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : character.name}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={character.image}
        alt=""
        draggable={false}
        decoding="async"
        className="absolute max-w-none select-none"
        style={{ width: `${width}%`, left: `${left}%`, top: `${top}%` }}
      />
    </span>
  );
}
