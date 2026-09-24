import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="flex flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/characters/cog.svg" alt="" className="h-56 w-auto animate-sway" style={{ aspectRatio: 0.6668 }} />
        <h1 className="mt-6 font-display text-[clamp(2rem,5vw,3rem)] leading-tight font-medium">Hmm, that&apos;s not here.</h1>
        <p className="mt-3 max-w-[26rem] text-[1.05rem] text-ink-soft">
          Cog looked everywhere. This show might be for a different age, or it might have wandered off.
        </p>
        <Link
          href="/watch"
          className="mt-8 inline-flex h-14 items-center rounded-full bg-ink px-7 text-[1rem] font-semibold text-white transition-transform hover:-translate-y-0.5"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
