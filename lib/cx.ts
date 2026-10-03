import type { CSSProperties } from "react";

/** Joins class names, dropping falsy entries. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** The inline custom properties that paint a surface in a character's colours. */
export function tint(character: { color: string; soft: string; deep: string; onColor: string }): CSSProperties {
  return {
    "--c": character.color,
    "--c-soft": character.soft,
    "--c-deep": character.deep,
    "--c-on": character.onColor,
  } as CSSProperties;
}

/**
 * The main ShowTiva app: where grown-ups go, and where Kids links back to.
 * Unset, there are no links to it at all. There is deliberately no default:
 * the main site's preview still carries placeholder titles from other
 * studios, so it is linked only once someone sets this on purpose.
 */
export const SHOWTIVA_URL: string | null = process.env.NEXT_PUBLIC_SHOWTIVA_URL || null;
