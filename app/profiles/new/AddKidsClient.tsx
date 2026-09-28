"use client";

// "Add your kids": the first thing a family does after the landing page.
//
// A grown-up adds each child: a photo from the device (camera or library), a
// first name, and a birthday. The birthday suggests what the child may watch,
// and the grown-up can pick differently. Several children can be added in
// one sitting; "Done" takes the family to "Who's watching?", or straight in
// when there is only one child.
//
// Only month and year of birth are asked for: enough to know an age, and no
// more than the app needs. Photos are shrunk to a small square on the device
// and never leave it.

import { useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { cx } from "@/lib/cx";
import { gateOpen, readGateRaw, readPhotoRaw, removePhoto, savePhoto, subscribeDevice } from "@/lib/device";
import {
  AGE_BANDS,
  MAX_NAME_LENGTH,
  MAX_PROFILES,
  ageBand,
  ageFromBirth,
  bandForAge,
  newProfileId,
  nextGuide,
  writeProfiles,
  type AgeBandId,
  type Profile,
  type ProfileState,
} from "@/lib/profiles";
import { useClock } from "@/lib/use-client";

import Icon from "../../_components/Icon";
import KidAvatar from "../../_components/KidAvatar";
import ParentGate from "../../_components/ParentGate";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** A square crop of the photo, shrunk to avatar size. Biased a little towards the top, where faces usually are. */
async function toAvatar(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("That file isn't a photo we can read."));
      img.src = url;
    });
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    const sx = (image.naturalWidth - side) / 2;
    const sy = (image.naturalHeight - side) * 0.35;
    const size = 320;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser can't prepare photos.");
    context.drawImage(image, sx, sy, side, side, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

interface AddKidsClientProps {
  state: ProfileState;
  editing: Profile | null;
}

export default function AddKidsClient({ state, editing }: AddKidsClientProps) {
  const router = useRouter();
  const now = useClock(60_000);

  // Adding to a family that already has profiles is a grown-up's job, so it
  // sits behind the gate. The very first setup does not: whoever is setting
  // the app up is the grown-up. Decided once, on arrival, so the gate cannot
  // appear half way through adding a second child.
  const [needsGate] = useState(() => state.list.length > 0);
  const gateRaw = useSyncExternalStore(subscribeDevice, readGateRaw, () => "");
  const unlocked = !needsGate || (now !== null && gateOpen(gateRaw, now));

  const [kids, setKids] = useState<Profile[]>(state.list);
  const [draftId, setDraftId] = useState(() => editing?.id ?? newProfileId());
  const [name, setName] = useState(editing?.name ?? "");
  const [birthYear, setBirthYear] = useState(editing?.birth?.slice(0, 4) ?? "");
  const [birthMonth, setBirthMonth] = useState(editing?.birth?.slice(5, 7) ?? "");
  const [band, setBand] = useState<AgeBandId | null>(editing?.age ?? null);
  const [bandTouched, setBandTouched] = useState(Boolean(editing));
  const [photo, setPhoto] = useState<string | null | undefined>(undefined); // undefined: unchanged
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const [justAdded, setJustAdded] = useState<Profile | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);

  const storedPhoto = useSyncExternalStore(subscribeDevice, () => (editing ? readPhotoRaw(editing.id) : ""), () => "");
  const shownPhoto = photo === undefined ? storedPhoto || null : photo;

  const birth = birthYear && birthMonth ? `${birthYear}-${birthMonth}` : null;
  const age = birth && now !== null ? ageFromBirth(birth, new Date(now)) : null;
  const suggested = age !== null ? bandForAge(age) : null;
  const chosenBand = bandTouched ? band : (suggested ?? band);
  const trimmed = name.trim();
  const full = !editing && kids.length >= MAX_PROFILES;

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoError(null);
    try {
      setPhoto(await toAvatar(file));
    } catch (cause) {
      setPhotoError((cause as Error).message);
    }
  };

  const save = () => {
    setTried(true);
    if (!trimmed || !birth || !chosenBand) return;

    const profile: Profile = editing
      ? { ...editing, name: trimmed.slice(0, MAX_NAME_LENGTH), birth, age: chosenBand }
      : { id: draftId, name: trimmed.slice(0, MAX_NAME_LENGTH), character: nextGuide(kids), age: chosenBand, birth };

    if (photo === null) removePhoto(profile.id);
    else if (photo && !savePhoto(profile.id, photo)) {
      setPhotoError("There isn't room on this device for the photo, so we saved everything else.");
    }

    const list = editing ? kids.map((k) => (k.id === profile.id ? profile : k)) : [...kids, profile];
    writeProfiles({ active: state.active, list });
    setKids(list);

    if (editing) {
      router.push("/parents");
      return;
    }

    // Ready for the next child.
    setJustAdded(profile);
    setDraftId(newProfileId());
    setName("");
    setBirthYear("");
    setBirthMonth("");
    setBand(null);
    setBandTouched(false);
    setPhoto(undefined);
    setTried(false);
    router.refresh();
    nameRef.current?.focus();
  };

  const finish = () => {
    if (kids.length === 1) {
      writeProfiles({ active: kids[0].id, list: kids });
      router.push("/watch");
    } else {
      router.push("/profiles");
    }
  };

  if (now === null) return <main className="min-h-dvh bg-canvas" />;

  if (!unlocked) {
    return (
      <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-10">
        <div className="flex w-full flex-col items-center">
          <ParentGate inline reason="Add a child" onPass={() => undefined} />
          <Link href="/profiles" className="mt-6 text-[0.95rem] font-semibold text-ink-soft hover:text-ink">
            Back
          </Link>
        </div>
      </main>
    );
  }

  const years = Array.from({ length: 15 }, (_, i) => String(new Date(now).getFullYear() - i));
  const field = "h-14 w-full rounded-2xl border-2 bg-canvas px-4 text-[1.05rem] font-semibold text-ink outline-none transition-colors focus:border-ink";

  return (
    <main className="min-h-dvh bg-canvas pb-20">
      <header className="mx-auto flex max-w-[1040px] items-center justify-between gap-4 px-6 pt-5 max-[640px]:px-4">
        <Link href="/" aria-label="ShowTiva Kids home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.svg" alt="ShowTiva Kids" className="h-10 w-auto" />
        </Link>
        {editing ? (
          <Link href="/parents" className="inline-flex h-11 items-center rounded-full px-4 text-[0.95rem] font-semibold text-ink-soft hover:bg-mist hover:text-ink">
            Cancel
          </Link>
        ) : (
          kids.length > 0 && (
            <button
              type="button"
              onClick={finish}
              className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-full bg-ink px-5 text-[0.95rem] font-semibold text-white"
            >
              Done
              <Icon name="chevron-right" className="size-4" />
            </button>
          )
        )}
      </header>

      <div className="mx-auto grid max-w-[1040px] grid-cols-[minmax(0,1fr)_minmax(0,460px)] items-start gap-[clamp(2rem,6vw,5rem)] px-6 pt-[clamp(2rem,6vh,4rem)] max-[900px]:grid-cols-1 max-[640px]:px-4">
        {/* ---- what this is, and who is in so far ---- */}
        <section>
          <h1 className="font-display text-[clamp(2.2rem,4.8vw,3.4rem)] leading-[1.02] font-medium text-balance">
            {editing ? `Edit ${editing.name}'s profile` : "Add your kids"}
          </h1>
          <p className="mt-4 max-w-[30rem] text-[1.05rem] leading-relaxed text-ink-soft">
            {editing
              ? "Change their photo, name or birthday, or what they can watch."
              : "Give each child their own profile with a photo, their name and their birthday. Their age decides which shows they see, and you can change that any time."}
          </p>

          {!editing && kids.length > 0 && (
            <div className="mt-8">
              <p className="text-[0.78rem] font-bold tracking-[0.14em] text-ink-faint uppercase">Your kids</p>
              <ul className="mt-3 flex flex-col gap-2">
                {kids.map((kid) => (
                  <li key={kid.id} className={cx("flex items-center gap-3 rounded-2xl bg-paper p-2.5 pr-4 ring-1 ring-line", justAdded?.id === kid.id && "animate-pop")}>
                    <KidAvatar profile={kid} className="size-12" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-[1.15rem] leading-tight font-medium">{kid.name}</span>
                      <span className="block text-[0.85rem] font-semibold text-ink-faint">
                        {kid.birth ? `${ageFromBirth(kid.birth, new Date(now))} years old · ` : ""}
                        {ageBand(kid.age).label}
                      </span>
                    </span>
                    {justAdded?.id === kid.id && (
                      <span className="flex items-center gap-1 text-[0.85rem] font-bold text-teal">
                        <Icon name="check" className="size-4" />
                        Added
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-8 flex max-w-[30rem] items-start gap-2.5 text-[0.9rem] leading-relaxed text-ink-soft">
            <Icon name="shield" className="mt-0.5 size-5 flex-none text-teal" />
            Photos and details stay on this device. Nothing is uploaded, and we only ask for the month and year they were born.
          </p>
        </section>

        {/* ---- the form ---- */}
        <section className="rounded-stage bg-paper p-[clamp(1.25rem,3vw,2rem)] ring-1 ring-line">
          {full ? (
            <div className="py-6 text-center">
              <p className="font-display text-[1.4rem] font-medium">That&apos;s a full house!</p>
              <p className="mt-2 text-[0.98rem] text-ink-soft">ShowTiva Kids has room for {MAX_PROFILES} kids on one device.</p>
            </div>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                save();
              }}
              noValidate
            >
              {justAdded && !editing && (
                <p className="mb-6 flex animate-fade-up items-center gap-3 rounded-2xl bg-[#d8f6ee] p-3 text-[0.95rem] font-semibold text-[#0a7d6b]">
                  <KidAvatar profile={justAdded} className="size-10" />
                  {justAdded.name} is all set. Add another child, or tap Done.
                </p>
              )}

              {/* Photo */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="group relative cursor-pointer rounded-full outline-offset-4"
                  aria-label={shownPhoto ? "Change photo" : "Add a photo"}
                >
                  {shownPhoto || trimmed ? (
                    <KidAvatar profile={{ id: draftId, name: trimmed || "?" }} preview={shownPhoto} className="size-[136px] ring-4 ring-mist" />
                  ) : (
                    <span className="grid size-[136px] place-items-center rounded-full border-[3px] border-dashed border-ink/20 bg-canvas text-ink-soft transition-colors group-hover:border-ink/40 group-hover:text-ink">
                      <CameraIcon className="size-11" />
                    </span>
                  )}
                  <span className="absolute right-1 bottom-1 grid size-10 place-items-center rounded-full bg-ink text-white ring-4 ring-paper">
                    <CameraIcon className="size-5" />
                  </span>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  tabIndex={-1}
                  onChange={(event) => {
                    void pickPhoto(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="h-10 cursor-pointer rounded-full px-4 text-[0.9rem] font-bold text-ink transition-colors hover:bg-mist"
                  >
                    {shownPhoto ? "Change photo" : "Add a photo"}
                  </button>
                  {shownPhoto && (
                    <button
                      type="button"
                      onClick={() => setPhoto(null)}
                      className="h-10 cursor-pointer rounded-full px-4 text-[0.9rem] font-bold text-ink-faint transition-colors hover:bg-mist hover:text-berry"
                    >
                      Remove
                    </button>
                  )}
                </div>
                {photoError && <p className="mt-1 text-center text-[0.85rem] font-semibold text-berry">{photoError}</p>}
              </div>

              {/* Name */}
              <label className="mt-6 block">
                <span className="text-[0.9rem] font-bold text-ink">First name</span>
                <input
                  ref={nameRef}
                  value={name}
                  maxLength={MAX_NAME_LENGTH}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Their first name or a nickname"
                  autoComplete="off"
                  className={cx(field, "mt-2", tried && !trimmed ? "border-berry" : "border-line")}
                />
                {tried && !trimmed && <span className="mt-1.5 block text-[0.85rem] font-semibold text-berry">What should we call them?</span>}
              </label>

              {/* Birthday */}
              <fieldset className="mt-5">
                <legend className="text-[0.9rem] font-bold text-ink">Birthday</legend>
                <div className="mt-2 grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-2.5">
                  <select
                    value={birthMonth}
                    onChange={(event) => setBirthMonth(event.target.value)}
                    aria-label="Birth month"
                    className={cx(field, tried && !birthMonth ? "border-berry" : "border-line", !birthMonth && "text-ink-faint")}
                  >
                    <option value="">Month</option>
                    {MONTHS.map((month, i) => (
                      <option key={month} value={String(i + 1).padStart(2, "0")}>
                        {month}
                      </option>
                    ))}
                  </select>
                  <select
                    value={birthYear}
                    onChange={(event) => setBirthYear(event.target.value)}
                    aria-label="Birth year"
                    className={cx(field, tried && !birthYear ? "border-berry" : "border-line", !birthYear && "text-ink-faint")}
                  >
                    <option value="">Year</option>
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <p className={cx("mt-2 text-[0.88rem] font-semibold", tried && !birth ? "text-berry" : "text-ink-faint")}>
                  {age !== null
                    ? age < 2
                      ? "ShowTiva Kids is made for ages 2 and up, so we'll keep things extra gentle."
                      : age > 12
                        ? `${age} years old. ShowTiva Kids is made for up to 12, so they'll see everything.`
                        : `${age} years old`
                    : tried
                      ? "We use their age to choose what they can watch."
                      : "Just the month and year."}
                </p>
              </fieldset>

              {/* What they can watch */}
              <fieldset className="mt-5">
                <legend className="text-[0.9rem] font-bold text-ink">What they can watch</legend>
                <div className="mt-2 flex flex-col gap-2" role="radiogroup">
                  {AGE_BANDS.map((option) => {
                    const picked = chosenBand === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={picked}
                        onClick={() => {
                          setBand(option.id);
                          setBandTouched(true);
                        }}
                        className={cx(
                          "flex w-full cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-colors",
                          picked ? "border-ink bg-canvas" : "border-line hover:border-ink/25",
                        )}
                      >
                        <span className={cx("grid size-6 flex-none place-items-center rounded-full border-2", picked ? "border-ink bg-ink text-white" : "border-ink/20")}>
                          {picked && <Icon name="check" className="size-3.5" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-x-2">
                            <strong className="text-[0.98rem] font-bold">{option.label}</strong>
                            <span className="text-[0.85rem] font-semibold text-ink-faint">{option.range}</span>
                            {suggested === option.id && (
                              <span className="rounded-full bg-[#d8f6ee] px-2 py-0.5 text-[0.7rem] font-bold text-[#0a7d6b]">Suggested</span>
                            )}
                          </span>
                          <span className="mt-0.5 block text-[0.85rem] leading-snug text-ink-soft">{option.blurb}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <button
                type="submit"
                className="mt-7 inline-flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-ink text-[1.02rem] font-semibold text-white transition-transform active:scale-[0.98]"
              >
                {editing ? "Save changes" : (
                  <>
                    <Icon name="plus" className="size-5" />
                    {trimmed ? `Add ${trimmed}` : "Add child"}
                  </>
                )}
              </button>
              {!editing && kids.length > 0 && (
                <button
                  type="button"
                  onClick={finish}
                  className="mt-2 h-12 w-full cursor-pointer rounded-full text-[0.95rem] font-bold text-ink-soft transition-colors hover:bg-mist hover:text-ink"
                >
                  I&apos;m done adding kids
                </button>
              )}
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.4-2h5.8l1.4 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" fill="currentColor" fillOpacity="0.14" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}
