"use client";

// The frame around every in-app page. No bar and no menu: a few buttons float
// over the page's top corners. Favourites on the left; on the right the child
// watching and their buddy, each a switcher. The trail is home, and there is
// nothing else to navigate to.

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { cx, tint } from "@/lib/cx";
import type { Character, CharacterId, ShowLite } from "@/lib/catalog-types";
import { parseFavourites, parseTimer, readFavouritesRaw, readTimerRaw, subscribeDevice } from "@/lib/device";
import { writeProfiles, type Profile, type ProfileState } from "@/lib/profiles";
import { useClock } from "@/lib/use-client";

import Face from "./Face";
import Icon from "./Icon";
import KidAvatar from "./KidAvatar";
import ShowCard from "./ShowCard";

export interface ChromeProps {
  characters: Character[];
  /** Everything this child may watch, for their favourites. */
  shows: ShowLite[];
  profiles: ProfileState;
  active: Profile | null;
  /** The watching child's buddy, if they have picked one. */
  buddy: CharacterId | null;
}

type Menu = "kid" | "buddy" | null;

export default function KidsChrome({ characters, shows, profiles, active, buddy, children }: ChromeProps & { children: ReactNode }) {
  const [favourites, setFavourites] = useState(false);

  // Lock the page behind the favourites panel, and close it on Escape.
  useEffect(() => {
    if (!favourites) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setFavourites(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [favourites]);

  return (
    <div className="min-h-dvh">
      <Controls characters={characters} profiles={profiles} active={active} buddy={buddy} onFavourites={() => setFavourites(true)} />
      {children}
      {favourites && <FavouritesPanel characters={characters} shows={shows} active={active} onClose={() => setFavourites(false)} />}
    </div>
  );
}

/* --------------------------------------------------------- floating -- */

function Controls({
  characters,
  profiles,
  active,
  buddy,
  onFavourites,
}: {
  characters: Character[];
  profiles: ProfileState;
  active: Profile | null;
  buddy: CharacterId | null;
  onFavourites: () => void;
}) {
  const [menu, setMenu] = useState<Menu>(null);

  // One menu at a time; a click anywhere else or Escape closes it.
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && close();
    window.addEventListener("click", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const toggle = (which: Exclude<Menu, null>) => setMenu((open) => (open === which ? null : which));

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex items-start justify-between p-4 max-[640px]:p-3">
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onFavourites}
          aria-label="My favourites"
          className={cx(float, "h-11 gap-2 pr-4 pl-3 text-[0.95rem] font-semibold text-ink max-[640px]:size-11 max-[640px]:justify-center max-[640px]:p-0")}
        >
          <Icon name="heart-filled" className="size-5 text-berry" />
          <span className="max-[640px]:hidden">Favourites</span>
        </button>
        <TimerChip />
      </div>

      <div className="pointer-events-auto flex items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
        <KidSwitcher profiles={profiles} active={active} open={menu === "kid"} onToggle={() => toggle("kid")} onDone={() => setMenu(null)} />
        {active && (
          <BuddySwitcher
            characters={characters}
            profiles={profiles}
            active={active}
            buddy={buddy}
            open={menu === "buddy"}
            onToggle={() => toggle("buddy")}
            onDone={() => setMenu(null)}
          />
        )}
      </div>
    </div>
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
    <span className={cx(float, "h-11 gap-2 pr-3.5 pl-1.5 text-[0.85rem] font-bold text-ink")} title="Time until a break">
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

/** A button floating over the page: its own white ground and shadow, since there is no bar behind it. */
const float = "inline-flex cursor-pointer items-center rounded-full bg-paper/95 shadow-lift ring-1 ring-line backdrop-blur-md transition-transform hover:-translate-y-px";
const pill = cx(float, "gap-2 p-1 pr-3.5 aria-expanded:bg-mist max-[640px]:pr-1");
const sheet = "absolute top-[calc(100%+10px)] right-0 z-50 animate-pop rounded-panel bg-paper p-2 shadow-lift ring-1 ring-line";

/** The child watching: switch to a sibling, pick again, or find the grown-ups area. */
function KidSwitcher({
  profiles,
  active,
  open,
  onToggle,
  onDone,
}: {
  profiles: ProfileState;
  active: Profile | null;
  open: boolean;
  onToggle: () => void;
  onDone: () => void;
}) {
  const router = useRouter();

  if (!active) {
    return (
      <Link href="/profiles" className="inline-flex h-11 items-center rounded-full bg-ink px-4 text-[0.9rem] font-semibold text-white shadow-lift">
        Who&apos;s watching?
      </Link>
    );
  }

  const others = profiles.list.filter((p) => p.id !== active.id);

  return (
    <div className="relative">
      <button type="button" onClick={onToggle} aria-expanded={open} aria-label={`Watching: ${active.name}. Switch`} className={pill}>
        <KidAvatar profile={active} className="size-9" />
        <span className="max-w-[6.5rem] truncate font-display text-[1.02rem] font-medium max-[640px]:hidden">{active.name}</span>
      </button>

      {open && (
        <div className={cx(sheet, "w-[260px]")}>
          {others.length > 0 && (
            <>
              <p className="px-3 pt-2 pb-1 text-[0.72rem] font-bold tracking-[0.14em] text-ink-faint uppercase">Switch to</p>
              {others.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => {
                    writeProfiles({ ...profiles, active: profile.id });
                    onDone();
                    router.refresh();
                  }}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-2xl p-2 text-left transition-colors hover:bg-mist"
                >
                  <KidAvatar profile={profile} className="size-11" />
                  <span className="font-display text-[1.1rem] font-medium">{profile.name}</span>
                </button>
              ))}
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
          <Link
            href="/parents"
            className="flex items-center gap-3 rounded-2xl p-3 text-[0.95rem] font-semibold text-ink-soft transition-colors hover:bg-mist hover:text-ink"
          >
            <Icon name="lock" className="size-5" />
            Grown-ups
          </Link>
        </div>
      )}
    </div>
  );
}

/** The watching child's buddy: swap to another friend on the spot, or meet them all on the stage. */
function BuddySwitcher({
  characters,
  profiles,
  active,
  buddy,
  open,
  onToggle,
  onDone,
}: {
  characters: Character[];
  profiles: ProfileState;
  active: Profile;
  buddy: CharacterId | null;
  open: boolean;
  onToggle: () => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const guide = characters.find((c) => c.id === (buddy ?? "bloop")) ?? characters[0];

  const choose = (id: CharacterId) => {
    writeProfiles({ ...profiles, list: profiles.list.map((p) => (p.id === active.id ? { ...p, buddy: id } : p)) });
    onDone();
    router.refresh();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={buddy ? `Buddy: ${guide.name}. Switch` : "Choose a buddy"}
        className={pill}
        style={tint(guide)}
      >
        <Face character={guide} className={cx("size-9", !buddy && "opacity-50 grayscale")} />
        <span className="max-w-[6.5rem] truncate font-display text-[1.02rem] font-medium text-(--c-deep) max-[640px]:hidden">
          {buddy ? guide.name : "Buddy"}
        </span>
      </button>

      {open && (
        <div className={cx(sheet, "w-[292px] p-3")}>
          <p className="px-1 pb-2 text-[0.72rem] font-bold tracking-[0.14em] text-ink-faint uppercase">{active.name}&apos;s buddy</p>
          <ul className="grid grid-cols-3 gap-1">
            {characters.map((character) => {
              const current = character.id === buddy;
              return (
                <li key={character.id}>
                  <button
                    type="button"
                    onClick={() => choose(character.id)}
                    aria-pressed={current}
                    className="flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-2xl p-2 transition-colors hover:bg-mist"
                    style={tint(character)}
                  >
                    <span className="relative">
                      <Face character={character} className={cx("size-14 transition-transform", current && "ring-3 ring-(--c)")} />
                      {current && (
                        <span className="absolute -right-1 -bottom-1 grid size-6 place-items-center rounded-full bg-(--c) text-(--c-on) ring-2 ring-paper">
                          <Icon name="check" className="size-3.5" />
                        </span>
                      )}
                    </span>
                    <span className="font-display text-[0.98rem] font-medium">{character.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="my-2 h-px bg-line" />
          <Link
            href="/buddy"
            className="flex items-center gap-3 rounded-2xl p-2.5 text-[0.95rem] font-semibold text-ink-soft transition-colors hover:bg-mist hover:text-ink"
          >
            <Icon name="sparkle" className="size-5" />
            Meet them on the stage
          </Link>
        </div>
      )}
    </div>
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
