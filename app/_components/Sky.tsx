import { cx } from "@/lib/cx";

/**
 * Soft clouds drifting across a daytime sky. Pure decoration: two copies of
 * each strip sit side by side and slide half their width, so the loop has no
 * seam. Slow enough to feel like weather, not like something to watch.
 */
export default function Sky({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cx("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="absolute top-[9%] left-0 flex w-[200%] animate-drift-slow opacity-90">
        <CloudStrip />
        <CloudStrip />
      </div>
      <div className="absolute top-[30%] left-0 flex w-[200%] animate-drift opacity-60 [animation-direction:reverse] max-[700px]:top-[24%]">
        <CloudStrip small />
        <CloudStrip small />
      </div>
    </div>
  );
}

function CloudStrip({ small }: { small?: boolean }) {
  const clouds = small
    ? [
        [6, 0.5],
        [38, 0.42],
        [71, 0.55],
      ]
    : [
        [2, 1],
        [30, 0.72],
        [55, 0.9],
        [82, 0.66],
      ];
  return (
    <div className="relative h-[140px] w-1/2">
      {clouds.map(([left, scale], i) => (
        <Cloud key={i} style={{ left: `${left}%`, transform: `scale(${scale})`, transformOrigin: "left top" }} />
      ))}
    </div>
  );
}

function Cloud({ style }: { style: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 220 90" className="absolute top-0 w-[220px]" style={style}>
      <path
        d="M34 78c-17 0-28-10-28-23s11-23 27-23c3-17 18-28 36-28 14 0 26 7 32 18 5-3 11-5 18-5 18 0 32 12 34 28h4c17 0 30 11 30 25s-11 8-28 8z"
        fill="#ffffff"
      />
    </svg>
  );
}
