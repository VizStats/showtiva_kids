import Link from "next/link";

import { getCatalog } from "@/lib/catalog";
import { getProfiles } from "@/lib/session";

import CrewLineup from "./_components/CrewLineup";
import Icon from "./_components/Icon";
import Sky from "./_components/Sky";
import SiteFooter from "./_components/SiteFooter";

// Reads the catalog and the profiles cookie per request.
export const dynamic = "force-dynamic";

/**
 * The landing is a single screen: the sky, the logo, one line, the way in,
 * and the crew standing along the bottom, with the footer beneath. Sizes lean
 * on the viewport's height as well as its width, so a short laptop screen
 * still fits it all without scrolling.
 */
export default async function Landing() {
  const [{ characters }, { active }] = await Promise.all([getCatalog(), getProfiles()]);
  const start = active ? { label: `Continue as ${active.name}` } : { label: "Start watching" };

  return (
    <main className="flex min-h-svh flex-col overflow-x-clip">
      <section className="relative flex min-h-[560px] flex-1 flex-col bg-[linear-gradient(180deg,#cfeaff_0%,#e6f4ff_36%,#faf7f2_84%)]">
        <Sky />

        {/* No logo up here: the big one below is the page's first word. */}
        <header className="relative z-10 mx-auto flex w-full max-w-[1320px] items-center justify-end px-6 pt-4 max-[640px]:px-4">
          <nav className="flex items-center gap-2">
            <Link
              href="/parents"
              className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-[0.92rem] font-semibold text-ink transition-colors hover:bg-white/70 max-[640px]:hidden"
            >
              <Icon name="lock" className="size-[18px]" />
              For grown-ups
            </Link>
            <Link
              href="/watch"
              className="inline-flex h-11 items-center rounded-full bg-ink px-5 text-[0.92rem] font-semibold text-white transition-transform hover:-translate-y-px active:scale-[0.98]"
            >
              {active ? "Watch" : "Start"}
            </Link>
          </nav>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-[860px] flex-1 flex-col items-center justify-center px-6 py-[clamp(0.5rem,2vh,2rem)] text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo.svg"
            alt=""
            className="w-[clamp(200px,min(30vw,33vh),430px)] animate-logo-in drop-shadow-[0_18px_30px_rgba(30,26,60,0.12)]"
          />
          <h1 className="mt-[clamp(0.75rem,2.5vh,1.5rem)] animate-fade-up font-display text-[clamp(1.8rem,min(4.4vw,5.4vh),3.5rem)] leading-[1.02] font-medium tracking-[-0.01em] text-balance [animation-delay:0.25s]">
            Big fun. Safe screens.
          </h1>
          <p className="mt-3 max-w-[34rem] animate-fade-up text-[clamp(1rem,1.4vw,1.12rem)] leading-relaxed text-ink-soft text-pretty [animation-delay:0.35s]">
            Cartoons, songs and stories for kids 2 to 12, starring six friends from Tiva Island. Every show hand-picked, with
            grown-up controls built in.
          </p>
          <div className="mt-[clamp(1rem,3vh,1.75rem)] flex animate-fade-up flex-wrap items-center justify-center gap-3 [animation-delay:0.45s]">
            <Link
              href="/watch"
              className="group inline-flex h-14 items-center gap-3 rounded-full bg-ink pr-7 pl-2.5 text-[1.02rem] font-semibold text-white transition-transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <span className="grid size-10 place-items-center rounded-full bg-white text-ink transition-transform duration-300 ease-spring group-hover:scale-110">
                <Icon name="play" className="size-5 translate-x-px" />
              </span>
              {start.label}
            </Link>
            <Link
              href="/friends"
              className="inline-flex h-14 items-center rounded-full bg-white/80 px-7 text-[1.02rem] font-semibold text-ink ring-1 ring-line backdrop-blur transition-colors hover:bg-white"
            >
              Meet the crew
            </Link>
          </div>
        </div>

        {/* The ground the crew stands on, melting into the footer. */}
        <div className="relative z-10">
          <CrewLineup characters={characters} className="relative z-10 px-4 [--lineup-h:clamp(110px,min(21vw,26vh),290px)]" />
          <svg aria-hidden viewBox="0 0 1440 120" preserveAspectRatio="none" className="absolute bottom-0 left-0 h-[clamp(36px,5vw,80px)] w-full">
            <path d="M0 70C240 20 480 0 720 0s480 20 720 70v50H0z" className="fill-canvas" />
          </svg>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
