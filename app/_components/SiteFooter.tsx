import Link from "next/link";

import { SHOWTIVA_URL } from "@/lib/cx";

/** Quiet by design: the footer is for grown-ups, so it keeps to the edges. */
export default function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-4 border-t border-line px-6 py-8 text-[0.88rem] text-ink-soft max-[640px]:px-4">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.svg" alt="ShowTiva Kids" className="h-8 w-auto" />
        <span>© {year} ShowTiva</span>
      </div>
      <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <Link href="/friends" className="hover:text-ink">
          The crew
        </Link>
        <Link href="/parents" className="hover:text-ink">
          Grown-ups
        </Link>
        <a href={`${SHOWTIVA_URL}/privacy`} className="hover:text-ink">
          Privacy
        </a>
        <a href={`${SHOWTIVA_URL}/terms`} className="hover:text-ink">
          Terms
        </a>
        <a href={SHOWTIVA_URL} className="hover:text-ink">
          ShowTiva
        </a>
      </nav>
    </footer>
  );
}
