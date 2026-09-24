import { cx } from "@/lib/cx";

const COLORS = ["#1d8cf8", "#14b39a", "#ff8717", "#9048dc", "#ffcc12", "#f25a8e"];

/**
 * A one-shot burst of confetti from its centre: stars, dots and little bars
 * in the crew's six colours. Deterministic, so it looks the same each time,
 * and cheap: a handful of spans on one keyframe. Re-mount it (a new key) to
 * fire it again.
 */
export default function Burst({ className, count = 18, spread = 120 }: { className?: string; count?: number; spread?: number }) {
  return (
    <span aria-hidden className={cx("pointer-events-none absolute size-0", className)}>
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + (i % 3) * 0.35;
        const distance = spread * (0.55 + ((i * 37) % 45) / 100);
        const shape = i % 3;
        return (
          <span
            key={i}
            className={cx(
              "absolute block animate-burst",
              shape === 0 && "size-2.5 rounded-full",
              shape === 1 && "h-1.5 w-3.5 rounded-full",
              shape === 2 && "size-3.5",
            )}
            style={
              {
                background: shape === 2 ? undefined : COLORS[i % COLORS.length],
                color: COLORS[i % COLORS.length],
                "--dx": `${Math.cos(angle) * distance}px`,
                "--dy": `${Math.sin(angle) * distance - 20}px`,
                "--rot": `${(i % 2 ? 1 : -1) * (90 + i * 23)}deg`,
                animationDelay: `${(i % 4) * 0.03}s`,
              } as React.CSSProperties
            }
          >
            {shape === 2 && (
              <svg viewBox="0 0 24 24" className="size-full" fill="currentColor">
                <path d="M12 2.8l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.3l-5.7 3 1.1-6.3-4.6-4.5 6.4-.9z" />
              </svg>
            )}
          </span>
        );
      })}
    </span>
  );
}
