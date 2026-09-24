"use client";

// The frame around every in-app page: the top bar, the phone's bottom tab
// bar, search, favourites and the profile switcher.
//
// The navigation is deliberately short. A child needs "home", "my friends",
// "find something" and "my favourites", each a picture before it is a word.
// Everything a child should not change lives behind the grown-ups padlock.

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { cx, tint } from "@/lib/cx";
import type { Character, Playable, ShowLite } from "@/lib/catalog-types";
import {
  parseFavourites,
  parseTimer,
  readFavouritesRaw,
  readTimerRaw,
  subscribeDevice,
} from "@/lib/device";
import { writeProfiles, type Profile, type ProfileState } from "@/lib/profiles";
import { useClock } from "@/lib/use-client";

import Discover from "./Discover";
import Face from "./Face";
import Icon, { type IconName } from "./Icon";
import ShowCard from "./ShowCard";

export interface ChromeProps {
  characters: Character[];
  /** Everything this profile may watch, for search and favourites. */
  shows: ShowLite[];
  /** Every episode and movie this profile may play, for Discover. */
  library: Playable[];
  profiles: ProfileState;
  active: Profile | null;
}

export default function KidsChrome({ characters, shows, library, profiles, active, children }: ChromeProps & { children: ReactNode }) {
  const [panel, setPanel] = useState<"search" | "favourites" | null>(null);

  // Lock the page behind an open panel, and close it on Escape.
  useEffect(() => {
    if (!panel) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setPanel(null);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [panel]);

  return (
    <div className="min-h-dvh pb-[calc(72px+env(safe-area-inset-bottom))] min-[769px]:pb-0">
      <TopBar
        characters={characters}
        profiles={profiles}
        active={active}
        onSearch={() => setPanel("search")}
        onFavourites={() => setPanel("favourites")}
      />
      {children}
      <MobileNav onSearch={() => setPanel("search")} onFavourites={() => setPanel("favourites")} />

      {panel === "search" && (
        <Discover characters={characters} library={library} profileId={active?.id ?? null} onClose={() => setPanel(null)} />
      )}
      {panel === "favourites" && (
        <FavouritesPanel characters={characters} shows={shows} active={active} onClose={() => setPanel(null)} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------- top bar -- */

const NAV: { href: string; label: string; icon: IconName; match: (path: string) => boolean }[] = [
  { href: "/watch", label: "Home", icon: "home", match: (p) => p === "/watch" || p.startsWith("/watch/") },
  { href: "/trail", label: "Trail", icon: "trail", match: (p) => p.startsWith("/trail") },
  { href: "/friends", label: "Friends", icon: "friends", match: (p) => p.startsWith("/friends") },
];

function TopBar({
  characters,
  profiles,
  active,
  onSearch,
  onFavourites,
}: {
  characters: Character[];
  profiles: ProfileState;
  active: Profile | null;
  onSearch: () => void;
  onFavourites: () => void;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-canvas/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1320px] items-center justify-between gap-4 px-6 max-[640px]:h-16 max-[640px]:px-4">
        <div className="flex items-center gap-8">
          <Link href="/watch" aria-label="ShowTiva Kids home" className="flex-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.svg" alt="ShowTiva Kids" className="h-10 w-auto max-[640px]:h-9" />
          </Link>

          <nav className="flex items-center gap-1 max-[768px]:hidden">
            {NAV.map((item) => {
              const current = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  className={cx(
                    "inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-[0.95rem] font-semibold transition-colors",
                    current ? "bg-mist text-ink" : "text-ink-soft hover:text-ink",
                  )}
                >
                  <Icon name={item.icon} className="size-5" />
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={onSearch}
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full px-3.5 text-[0.95rem] font-semibold text-ink-soft transition-colors hover:text-ink"
            >
              <Icon name="search" className="size-5" />
              Search
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <TimerChip />
          <button
            type="button"
            onClick={onFavourites}
            aria-label="My favourites"
            className="grid size-11 cursor-pointer place-items-center rounded-full text-ink-soft transition-colors hover:bg-mist hover:text-ink max-[768px]:hidden"
          >
            <Icon name="heart" className="size-[22px]" />
          </button>
          <Link
            href="/parents"
            aria-label="Grown-ups"
            className="grid size-11 cursor-pointer place-items-center rounded-full text-ink-soft transition-colors hover:bg-mist hover:text-ink"
          >
            <Icon name="lock" className="size-5" />
          </Link>
          <ProfileSwitcher characters={characters} profiles={profiles} active={active} />
        </div>
      </div>
    </header>
  );
}

/** Minutes left on the break timer, when a grown-up has set one. */
function TimerChip() {
  const timer = parseTimer(useSyncExternalStore(subscribeDevice, readTimerRaw, () => ""));
  const now = useClock(5000);

  if (!timer || now === null) return null;
  const minutes = Math.max(0, Math.ceil((timer.endsAt - now) / 60_000));
  const fraction = Math.min(1, Math.max(0, (timer.endsAt - now) / (timer.minutes * 60_000)));

  return (
    <span
      className="mr-1 inline-flex h-10 items-center gap-2 rounded-full bg-mist pr-3.5 pl-1 text-[0.85rem] font-bold text-ink"
      title="Time until a break"
    >
      <span
        className="grid size-8 place-items-center rounded-full"
        style={{ background: `conic-gradient(var(--color-teal) ${fraction * 360}deg, var(--color-mist) 0)` }}
      >
        <span className="grid size-6 place-items-center rounded-full bg-mist">
          <Icon name="timer" className="size-4" />
        </span>
      </span>
      {minutes} min
    </span>
  );
}

function ProfileSwitcher({ characters, profiles, active }: { characters: Character[]; profiles: ProfileState; active: Profile | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const buddy = (profile: Profile) => characters.find((c) => c.id === profile.character) ?? characters[0];

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [open]);

  if (!active) {
    return (
      <Link href="/profiles" className="ml-1 inline-flex h-10 items-center rounded-full bg-ink px-4 text-[0.9rem] font-semibold text-white">
        Choose profile
      </Link>
    );
  }

  const me = buddy(active);
  const others = profiles.list.filter((p) => p.id !== active.id);

  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`${active.name}'s profile`}
        style={tint(me)}
        className="ml-1 flex cursor-pointer items-center gap-2 rounded-full p-1 pr-3 transition-colors hover:bg-mist max-[640px]:pr-1"
      >
        <span className="rounded-full bg-(--c) p-[3px]">
          <Face character={me} plain className="block size-9" />
        </span>
        <span className="max-w-[7rem] truncate font-display text-[1.02rem] font-medium max-[640px]:hidden">{active.name}</span>
      </button>

      {open && (
        <div className="absolute top-[calc(100%+10px)] right-0 z-50 w-[260px] animate-pop rounded-panel bg-paper p-2 shadow-lift ring-1 ring-line">
          {others.length > 0 && (
            <>
              <p className="px-3 pt-2 pb-1 text-[0.72rem] font-bold tracking-[0.14em] text-ink-faint uppercase">Switch to</p>
              {others.map((profile) => {
                const b = buddy(profile);
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => {
                      writeProfiles({ ...profiles, active: profile.id });
                      setOpen(false);
                      router.refresh();
                    }}
                    style={tint(b)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-mist"
                  >
                    <span className="rounded-full bg-(--c) p-[3px]">
                      <Face character={b} plain className="block size-10" />
                    </span>
                    <span className="font-display text-[1.1rem] font-medium">{profile.name}</span>
                  </button>
                );
              })}
              <div className="my-1.5 h-px bg-line" />
            </>
          )}
          <Link
            href="/profiles"
            className="flex items-center gap-3 rounded-2xl p-3 text-[0.95rem] font-semibold text-ink-soft transition-colors hover:bg-mist hover:text-ink"
          >
            <Icon name="profiles" className="size-5" />
            Who&apos;s watching?
          </Link>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------ phone tab bar -- */

function MobileNav({ onSearch, onFavourites }: { onSearch: () => void; onFavourites: () => void }) {
  const pathname = usePathname();
  const item = "relative flex flex-1 cursor-pointer flex-col items-center gap-1 py-2.5 text-[0.7rem] font-bold transition-colors";
  const dot = "absolute bottom-0.5 size-1 rounded-full bg-ink";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-canvas/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl min-[769px]:hidden">
      {NAV.map((entry) => {
        const current = entry.match(pathname);
        return (
          <Link key={entry.href} href={entry.href} className={cx(item, current ? "text-ink" : "text-ink-faint")}>
            <Icon name={entry.icon} className="size-6" />
            {entry.label}
            {current && <span className={dot} />}
          </Link>
        );
      })}
      <button type="button" onClick={onSearch} className={cx(item, "text-ink-faint")}>
        <Icon name="search" className="size-6" />
        Search
      </button>
      <button type="button" onClick={onFavourites} className={cx(item, "text-ink-faint")}>
        <Icon name="heart" className="size-6" />
        Favourites
      </button>
    </nav>
  );
}

/* ----------------------------------------------------------- favourites -- */

function FavouritesPanel({
  characters,
  shows,
  active,
  onClose,
}: {
  characters: Character[];
  shows: ShowLite[];
  active: Profile | null;
  onClose: () => void;
}) {
  const raw = useSyncExternalStore(subscribeDevice, () => readFavouritesRaw(active?.id ?? null), () => "[]");
  const ids = parseFavourites(raw);
  const saved = ids.map((id) => shows.find((s) => s.id === id)).filter((s): s is ShowLite => Boolean(s));

  return (
    <div className="fixed inset-0 z-[60] flex animate-fade justify-end bg-ink/35 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="My favourites">
      <button type="button" className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <aside className="relative flex h-full w-[min(460px,100%)] animate-sheet flex-col bg-canvas shadow-lift">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="flex items-center gap-2.5 font-display text-[1.7rem] font-medium">
            <Icon name="heart-filled" className="size-7 text-berry" />
            My favourites
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-11 cursor-pointer place-items-center rounded-full bg-paper shadow-soft ring-1 ring-line">
            <Icon name="close" className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-10">
          {saved.length ? (
            <div className="grid gap-6" onClick={onClose}>
              {saved.map((show) => (
                <ShowCard key={show.id} show={show} characters={characters} />
              ))}
            </div>
          ) : (
            <Nothing
              characters={characters}
              who="bloop"
              line="No favourites yet!"
              sub="Tap the heart on any show and it will wait for you here."
            />
          )}
        </div>
      </aside>
    </div>
  );
}

/** An empty state with a friend in it, because an empty box is no fun. */
export function Nothing({
  characters,
  line,
  sub,
  who = "cog",
}: {
  characters: Character[];
  line: string;
  sub?: string;
  who?: Character["id"];
}) {
  const friend = characters.find((c) => c.id === who) ?? characters[0];
  return (
    <div className="flex flex-col items-center py-12 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={friend.image} alt="" className="h-40 w-auto animate-sway" style={{ aspectRatio: friend.aspect }} />
      <p className="mt-5 font-display text-[1.45rem] font-medium">{line}</p>
      {sub && <p className="mt-2 max-w-[22rem] text-[0.98rem] text-ink-soft">{sub}</p>}
    </div>
  );
}
