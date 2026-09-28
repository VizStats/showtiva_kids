"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Character, CharacterId } from "@/lib/catalog-types";
import { cx, tint } from "@/lib/cx";
import type { Profile } from "@/lib/profiles";

import Face from "./Face";
import Icon, { type IconName } from "./Icon";
import KidAvatar from "./KidAvatar";

interface SidebarProps {
  characters: Character[];
  active: Profile | null;
  buddy: CharacterId | null;
  onSearch: () => void;
  onFavourites: () => void;
}

const MAIN: { href: string; label: string; icon: IconName; match: (path: string) => boolean }[] = [
  { href: "/watch", label: "Home", icon: "home", match: (p) => p === "/watch" || p.startsWith("/watch/") },
  { href: "/trail", label: "The Trail", icon: "trail", match: (p) => p.startsWith("/trail") },
  { href: "/friends", label: "Friends", icon: "friends", match: (p) => p === "/friends" },
];

/**
 * The app's left-hand rail on wider screens, painted in the watching child's
 * buddy's colour: pick Kai and the whole rail turns sea-green. The logo, the
 * ways around, every friend's world with their face beside it, and at the
 * foot the child watching and their buddy.
 */
export default function Sidebar({ characters, active, buddy, onSearch, onFavourites }: SidebarProps) {
  const pathname = usePathname();
  const guide = characters.find((c) => c.id === (buddy ?? "bloop")) ?? characters[0];

  const item = "flex h-12 w-full items-center gap-3.5 rounded-2xl px-3.5 text-left text-[1.02rem] font-bold transition-colors";
  const idle = "text-white/80 hover:bg-white/10 hover:text-white";
  const here = "bg-white/18 text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.14)]";

  return (
    <aside
      style={tint(guide)}
      className="fixed inset-y-0 left-0 z-30 flex w-(--rail) flex-col overflow-hidden bg-(--c-deep) text-white max-[1023px]:hidden"
    >
      {/* Light pooling in two corners, in the buddy's brighter colour. */}
      <span aria-hidden className="pointer-events-none absolute -top-28 -right-32 size-72 rounded-full bg-(--c) opacity-70 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-32 -left-28 size-80 rounded-full bg-(--c) opacity-60 blur-3xl" />

      <div className="no-scrollbar relative flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pt-7 pb-5">
        <Link href="/watch" aria-label="ShowTiva Kids home" className="mx-auto mb-7 block flex-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-white.svg" alt="ShowTiva Kids" className="h-auto w-[124px]" />
        </Link>

        <nav className="grid gap-1" aria-label="Main">
          {MAIN.map((entry) => {
            const on = entry.match(pathname);
            return (
              <Link key={entry.href} href={entry.href} aria-current={on ? "page" : undefined} className={cx(item, on ? here : idle)}>
                <Icon name={entry.icon} className="size-[22px] flex-none" />
                {entry.label}
              </Link>
            );
          })}
          <button type="button" onClick={onSearch} className={cx(item, idle, "cursor-pointer")}>
            <Icon name="search" className="size-[22px] flex-none" />
            Search
          </button>
          <button type="button" onClick={onFavourites} className={cx(item, idle, "cursor-pointer")}>
            <Icon name="heart" className="size-[22px] flex-none" />
            My favourites
          </button>
        </nav>

        <div className="my-4 h-px flex-none bg-white/15" />
        <p className="px-3.5 pb-2 text-[0.72rem] font-bold tracking-[0.16em] text-white/60 uppercase">Worlds</p>
        <nav className="grid gap-0.5" aria-label="Worlds">
          {characters.map((character) => {
            const href = `/friends/${character.id}`;
            const on = pathname === href;
            return (
              <Link
                key={character.id}
                href={href}
                aria-current={on ? "page" : undefined}
                className={cx(item, "h-11 gap-3 px-2.5 text-[0.98rem]", on ? here : idle)}
              >
                <Face character={character} plain className="size-8 ring-2 ring-white/30" />
                {character.world}
              </Link>
            );
          })}
        </nav>

        <div className="my-4 h-px flex-none bg-white/15" />
        <Link href="/parents" className={cx(item, idle)}>
          <Icon name="lock" className="size-[22px] flex-none" />
          Grown-ups
        </Link>

        {/* The child watching and their buddy, at the foot of the rail. */}
        <div className="mt-auto flex-none pt-5">
          {active ? (
            <div className="rounded-[1.25rem] bg-white/12 p-1.5 ring-1 ring-white/15">
              <Link
                href="/profiles"
                title="Switch who's watching"
                className="flex items-center gap-3 rounded-2xl p-1.5 transition-colors hover:bg-white/10"
              >
                <KidAvatar profile={active} className="size-12 ring-2 ring-white/70" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.8rem] font-semibold text-white/70">Watching</span>
                  <span className="block truncate font-display text-[1.2rem] leading-tight font-medium">{active.name}</span>
                </span>
                <Icon name="profiles" className="mr-1.5 size-5 flex-none text-white/75" />
              </Link>
              <Link
                href="/buddy"
                title="Change buddy"
                className="group flex items-center gap-3 rounded-2xl p-1.5 transition-colors hover:bg-white/10"
              >
                <span className="grid w-12 flex-none place-items-center">
                  <Face
                    character={guide}
                    plain
                    className="size-10 ring-2 ring-white/60 transition-transform duration-300 ease-spring group-hover:scale-105"
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.8rem] font-semibold text-white/70">{buddy ? "Buddy" : "No buddy yet"}</span>
                  <span className="block truncate font-display text-[1.05rem] leading-tight font-medium">{buddy ? guide.name : "Choose one"}</span>
                </span>
                <span className="mr-0.5 grid size-8 flex-none place-items-center rounded-full bg-white text-(--c-deep) transition-transform group-hover:translate-x-0.5">
                  <Icon name="chevron-right" className="size-4" />
                </span>
              </Link>
            </div>
          ) : (
            <Link
              href="/profiles"
              className="flex items-center gap-3 rounded-[1.25rem] bg-white/12 p-3 ring-1 ring-white/15 transition-colors hover:bg-white/18"
            >
              <span className="grid size-12 flex-none place-items-center rounded-full bg-white/15">
                <Icon name="profiles" className="size-6" />
              </span>
              <span className="font-display text-[1.15rem] font-medium">Who&apos;s watching?</span>
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
