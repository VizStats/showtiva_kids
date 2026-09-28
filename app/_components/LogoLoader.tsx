import { cx } from "@/lib/cx";

const DOTS = ["bg-teal", "bg-[#ffcc12]", "bg-berry"];

/**
 * The ShowTiva Kids logo, breathing, while a page is on its way. It waits a
 * beat before fading in, so a page that arrives quickly never flashes it.
 * `page` fills the screen; without it, it fills the space beside the sidebar.
 */
export default function LogoLoader({ page = false, className }: { page?: boolean; className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cx("grid place-items-center bg-canvas", page ? "min-h-dvh" : "min-h-[calc(100dvh-72px)]", className)}
    >
      <div className="flex animate-loader-in flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.svg" alt="" className="w-[clamp(140px,16vw,190px)] animate-breathe drop-shadow-[0_14px_24px_rgba(30,26,60,0.12)]" />
        <span className="mt-6 flex gap-2.5">
          {DOTS.map((colour, i) => (
            <span key={colour} className={cx("size-2.5 animate-dot rounded-full", colour)} style={{ animationDelay: `${i * 0.14}s` }} />
          ))}
        </span>
      </div>
    </div>
  );
}
