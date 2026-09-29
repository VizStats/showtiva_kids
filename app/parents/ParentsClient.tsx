"use client";

// The grown-ups area. A settings page that reads like one: section names on
// the left, the controls on the right, hairlines between, and the kids first
// because they are what a parent comes here for. Open to anyone for now; it
// gets a proper lock when there are accounts to sign in to.

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { Character } from "@/lib/catalog-types";
import { SHOWTIVA_URL, cx } from "@/lib/cx";
import {
  clearDevice,
  parseFavourites,
  parseTimer,
  parseTrail,
  readFavouritesRaw,
  readTimerRaw,
  readTrailRaw,
  readVoiceOn,
  removePhoto,
  setTimer,
  setVoiceOn,
  subscribeDevice,
} from "@/lib/device";
import {
  AGE_BANDS,
  EMPTY_PROFILES,
  MAX_PROFILES,
  ageBand,
  ageFromBirth,
  writeProfiles,
  type AgeBandId,
  type Profile,
  type ProfileState,
} from "@/lib/profiles";
import { useClock } from "@/lib/use-client";

import Icon from "../_components/Icon";
import KidAvatar from "../_components/KidAvatar";

const TIMER_CHOICES: { value: number | null; label: string }[] = [
  { value: null, label: "Off" },
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hour" },
];

export default function ParentsClient({ state, characters }: { state: ProfileState; characters: Character[] }) {
  const router = useRouter();
  // The viewer's clock; null on the server, which cannot know it.
  const now = useClock(1000);
  const timer = parseTimer(useSyncExternalStore(subscribeDevice, readTimerRaw, () => ""));
  const voiceOn = useSyncExternalStore(subscribeDevice, readVoiceOn, () => true);
  const [confirmReset, setConfirmReset] = useState(false);

  const save = (next: ProfileState) => {
    writeProfiles(next);
    router.refresh();
  };

  if (now === null) return <main className="min-h-dvh bg-canvas" />;

  const minutesLeft = timer ? Math.max(0, Math.ceil((timer.endsAt - now) / 60_000)) : null;
  const timerShare = timer ? Math.min(1, Math.max(0, (timer.endsAt - now) / (timer.minutes * 60_000))) : 0;

  return (
    <main className="min-h-dvh bg-canvas pb-24 text-ink">
      <header className="mx-auto flex max-w-[980px] items-center justify-between gap-4 px-6 pt-6 max-[640px]:px-4">
        <Link href="/trail" aria-label="ShowTiva Kids home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.svg" alt="ShowTiva Kids" className="h-9 w-auto" />
        </Link>
        <Link href="/trail" className="inline-flex items-center gap-1.5 text-[0.95rem] font-semibold text-ink-soft transition-colors hover:text-ink">
          <Icon name="back" className="size-[18px]" />
          Back to the trail
        </Link>
      </header>

      <div className="mx-auto max-w-[980px] px-6 max-[640px]:px-4">
        <div className="border-b border-line pt-12 pb-9 max-[640px]:pt-9">
          <h1 className="font-display text-[clamp(2.2rem,4.4vw,2.9rem)] leading-none font-medium">Grown-ups</h1>
          <p className="mt-3 max-w-[36rem] text-[1.02rem] leading-relaxed text-ink-soft">
            Settings for this device. There are no accounts yet, so everything here, the kids&apos; photos included, stays on it.
          </p>
        </div>

        <Section title="Kids" hint="Each child only sees the shows for the level set here, and keeps their own buddy, trail and favourites.">
          {state.list.length === 0 ? (
            <p className="text-[0.98rem] text-ink-soft">No kids added yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {state.list.map((profile) => (
                <KidRow
                  key={profile.id}
                  profile={profile}
                  buddy={characters.find((c) => c.id === profile.buddy) ?? null}
                  now={now}
                  onLevel={(age) => save({ ...state, list: state.list.map((p) => (p.id === profile.id ? { ...p, age } : p)) })}
                  onRemove={() => {
                    removePhoto(profile.id);
                    save({ active: state.active === profile.id ? null : state.active, list: state.list.filter((p) => p.id !== profile.id) });
                  }}
                />
              ))}
            </ul>
          )}
          {state.list.length < MAX_PROFILES && (
            <Link
              href="/profiles/new"
              className="mt-5 inline-flex items-center gap-1.5 text-[0.95rem] font-semibold text-ink underline decoration-ink/25 underline-offset-4 transition-colors hover:decoration-ink"
            >
              <Icon name="plus" className="size-4" />
              Add a child
            </Link>
          )}
        </Section>

        <Section
          title="Break timer"
          hint="When the time is up, Coco calls a break and the app waits until a grown-up lets it carry on. It counts from when you set it."
        >
          <Segmented
            label="Break timer"
            options={TIMER_CHOICES}
            value={timer ? timer.minutes : null}
            onChange={(minutes) => setTimer(minutes)}
          />
          {timer && minutesLeft !== null && (
            <div className="mt-5 max-w-[26rem]">
              <div className="flex items-baseline justify-between text-[0.92rem]">
                <span className="text-ink-soft">
                  {minutesLeft === 0 ? (
                    <strong className="font-semibold text-ink">Break time now</strong>
                  ) : (
                    <>
                      Break in <strong className="font-semibold text-ink tabular-nums">{minutesLeft} min</strong>
                    </>
                  )}
                </span>
                <button type="button" onClick={() => setTimer(timer.minutes)} className="cursor-pointer font-semibold text-ink-soft transition-colors hover:text-ink">
                  Start again
                </button>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/8">
                <div className="h-full rounded-full bg-ink transition-[width] duration-1000" style={{ width: `${timerShare * 100}%` }} />
              </div>
            </div>
          )}
        </Section>

        <Section title="Sound" hint="The buddies speak out loud when they introduce themselves and when they are tapped.">
          <Switch label="Buddy voices" on={voiceOn} onChange={setVoiceOn} />
        </Section>

        <Section title="Kept out" hint="Whatever the settings.">
          <p className="max-w-[36rem] text-[0.98rem] leading-relaxed text-ink-soft">
            No adverts, no chat, no comments or messages. No links out to the open web, and no autoplay from one show into the next.
            Nothing above a child&apos;s level, and nothing we haven&apos;t watched ourselves first.
          </p>
        </Section>

        <Section title="This device">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
              <p className="text-[0.98rem] font-semibold">Start over</p>
              <p className="mt-0.5 text-[0.9rem] text-ink-soft">Removes the kids, their photos, favourites, trails and every setting here.</p>
            </div>
            {confirmReset ? (
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    clearDevice();
                    save(EMPTY_PROFILES);
                    router.push("/");
                  }}
                  className="h-10 cursor-pointer rounded-lg bg-berry px-4 text-[0.9rem] font-semibold text-white"
                >
                  Yes, remove everything
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="h-10 cursor-pointer rounded-lg px-3 text-[0.9rem] font-semibold text-ink-soft hover:text-ink"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="h-10 cursor-pointer rounded-lg border border-line bg-paper px-4 text-[0.9rem] font-semibold text-berry transition-colors hover:border-berry/40"
              >
                Reset this device
              </button>
            )}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-line pt-6">
            <div className="min-w-0">
              <p className="text-[0.98rem] font-semibold">ShowTiva for grown-ups</p>
              <p className="mt-0.5 text-[0.9rem] text-ink-soft">The main ShowTiva app, for everything that isn&apos;t for kids.</p>
            </div>
            <a
              href={SHOWTIVA_URL}
              className="inline-flex h-10 items-center gap-1 rounded-lg border border-line bg-paper px-4 text-[0.9rem] font-semibold transition-colors hover:border-ink/30"
            >
              Open ShowTiva
              <Icon name="chevron-right" className="size-4" />
            </a>
          </div>
        </Section>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------ pieces -- */

/** A section name and a line of help on the left, its controls on the right. */
function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="grid grid-cols-[14rem_minmax(0,1fr)] gap-x-12 gap-y-4 border-b border-line py-9 max-[760px]:grid-cols-1">
      <div>
        <h2 className="text-[1.05rem] font-semibold">{title}</h2>
        {hint && <p className="mt-1.5 text-[0.88rem] leading-relaxed text-ink-soft">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/** One child: who they are, how they are getting on, their level, and edit or remove. */
function KidRow({
  profile,
  buddy,
  now,
  onLevel,
  onRemove,
}: {
  profile: Profile;
  buddy: Character | null;
  now: number;
  onLevel: (age: AgeBandId) => void;
  onRemove: () => void;
}) {
  const trail = parseTrail(useSyncExternalStore(subscribeDevice, () => readTrailRaw(profile.id), () => ""));
  const favourites = parseFavourites(useSyncExternalStore(subscribeDevice, () => readFavouritesRaw(profile.id), () => "[]")).length;
  const [removing, setRemoving] = useState(false);
  const band = ageBand(profile.age);
  const age = profile.birth ? ageFromBirth(profile.birth, new Date(now)) : null;
  const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  return (
    <li className="flex flex-wrap items-start gap-x-4 gap-y-4 py-6 first:pt-0 last:pb-0">
      <KidAvatar profile={profile} className="size-12" />
      <div className="min-w-[14rem] flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2.5">
          <span className="text-[1.1rem] font-semibold">{profile.name}</span>
          <span className="text-[0.9rem] text-ink-soft">{age !== null ? `${age} years old` : band.range}</span>
        </p>
        <p className="mt-1 text-[0.9rem] text-ink-soft tabular-nums">
          <span className="whitespace-nowrap">
            {buddy ? (
              <>
                With <span className="font-semibold" style={{ color: buddy.deep }}>{buddy.name}</span>
              </>
            ) : (
              "No buddy yet"
            )}
          </span>
          {[`${count(trail.done.length, "show", "shows")} watched`, count(trail.chests.length, "sticker", "stickers"), count(favourites, "favourite", "favourites")].map(
            (stat) => (
              <span key={stat}>
                {" · "}
                <span className="whitespace-nowrap">{stat}</span>
              </span>
            ),
          )}
        </p>
        <div className="mt-4">
          <Segmented
            label={`Level for ${profile.name}`}
            options={AGE_BANDS.map((b) => ({ value: b.id, label: b.label }))}
            value={profile.age}
            onChange={onLevel}
          />
          <p className="mt-2 text-[0.85rem] text-ink-faint">
            {band.range}. {band.blurb}
          </p>
        </div>
      </div>
      <div className="flex flex-none items-center gap-4 pt-1 text-[0.9rem] font-semibold max-[640px]:w-full max-[640px]:pt-0 max-[640px]:pl-16">
        {removing ? (
          <>
            <span className="text-ink-soft">Remove {profile.name}?</span>
            <button type="button" onClick={onRemove} className="cursor-pointer text-berry hover:underline">
              Remove
            </button>
            <button type="button" onClick={() => setRemoving(false)} className="cursor-pointer text-ink-soft hover:text-ink">
              Keep
            </button>
          </>
        ) : (
          <>
            <Link href={`/profiles/new?edit=${profile.id}`} className="text-ink-soft transition-colors hover:text-ink">
              Edit
            </Link>
            <button type="button" onClick={() => setRemoving(true)} className="cursor-pointer text-ink-soft transition-colors hover:text-berry">
              Remove
            </button>
          </>
        )}
      </div>
    </li>
  );
}

/** A row of choices, one of them on: squared off, the way settings controls are. */
function Segmented<T extends string | number | null>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex max-w-full flex-wrap rounded-lg border border-line bg-paper p-0.5">
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(option.value)}
            className={cx(
              "h-9 min-w-[3.75rem] cursor-pointer rounded-md px-3.5 text-[0.9rem] font-semibold transition-colors",
              on ? "bg-ink text-white" : "text-ink-soft hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function Switch({ label, on, onChange }: { label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)} className="group flex cursor-pointer items-center gap-3">
      <span className={cx("relative h-6 w-10 flex-none rounded-full transition-colors", on ? "bg-ink" : "bg-ink/15")}>
        <span className={cx("absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-soft transition-transform", on && "translate-x-4")} />
      </span>
      <span className="text-[0.98rem] font-semibold">{label}</span>
      <span className="text-[0.9rem] text-ink-soft">{on ? "On" : "Off"}</span>
    </button>
  );
}
