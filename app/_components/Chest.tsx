import { cx } from "@/lib/cx";

export type ChestState = "locked" | "ready" | "open";

/**
 * A treasure chest, drawn rather than imported so it can open. Wood and gold
 * while it is waiting, grey while it is out of reach, lid thrown back once
 * it has been opened.
 */
export default function Chest({ state, className }: { state: ChestState; className?: string }) {
  const locked = state === "locked";
  const wood = locked ? "#d9d1c3" : "#d17a2e";
  const woodDark = locked ? "#bfb6a6" : "#9a4f17";
  const gold = locked ? "#e7e1d6" : "#ffc933";
  const goldDark = locked ? "#cfc7b8" : "#e09a00";

  return (
    <svg viewBox="0 0 96 84" className={cx("overflow-visible", className)} aria-hidden>
      {/* shadow */}
      <ellipse cx="48" cy="79" rx="36" ry="5" fill="rgb(30 26 60 / 0.12)" />

      {state === "open" ? (
        <>
          {/* the light inside */}
          <path d="M16 40h64l-6-14H22z" fill="#fff4c7" />
          {/* lid thrown back */}
          <path d="M18 26c0-16 10-22 30-22s30 6 30 22z" fill={wood} />
          <path d="M18 26c0-16 10-22 30-22s30 6 30 22" fill="none" stroke={woodDark} strokeWidth="3" />
          <rect x="42" y="4" width="12" height="22" rx="2" fill={gold} />
        </>
      ) : (
        <>
          {/* closed lid */}
          <path d="M12 40c0-18 14-26 36-26s36 8 36 26z" fill={wood} />
          <path d="M12 40c0-18 14-26 36-26s36 8 36 26" fill="none" stroke={woodDark} strokeWidth="3" />
          <rect x="42" y="14" width="12" height="26" rx="2" fill={gold} />
        </>
      )}

      {/* body */}
      <rect x="12" y="38" width="72" height="36" rx="6" fill={wood} stroke={woodDark} strokeWidth="3" />
      <rect x="12" y="38" width="72" height="8" rx="3" fill={woodDark} opacity="0.35" />
      <rect x="42" y="38" width="12" height="36" fill={gold} />
      {/* lock plate */}
      <rect x="39" y="44" width="18" height="16" rx="4" fill={gold} stroke={goldDark} strokeWidth="2.5" />
      <circle cx="48" cy="51" r="2.6" fill={goldDark} />
      <path d="M48 52v4" stroke={goldDark} strokeWidth="2.5" strokeLinecap="round" />
      {/* corner studs */}
      {[18, 78].map((x) => (
        <circle key={x} cx={x} cy="68" r="2.6" fill={gold} />
      ))}
    </svg>
  );
}
