"use client";

// "Add your kids": the first thing a family does after the landing page.
//
// A grown-up adds each child: a photo from the device (camera or library), a
// first name, and the month and year they were born. The birthday sets which
// shows they see; there is no picker for it, and it moves up by itself as they
// grow. Several children can be added in one sitting; "Done" takes the family
// to "Who's watching?", or, with one child, straight on to choosing a buddy.
//
// Only month and year of birth are asked for: enough to know an age, and no
// more than the app needs. Photos are shrunk to a small square on the device
// and never leave it.

import { useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { cx } from "@/lib/cx";
import { readPhotoRaw, removePhoto, savePhoto, subscribeDevice } from "@/lib/device";
import {
  MAX_NAME_LENGTH,
  MAX_PROFILES,
  ageBand,
  ageFromBirth,
  bandForAge,
  newProfileId,
  writeProfiles,
  type Profile,
  type ProfileState,
} from "@/lib/profiles";
import { useClock } from "@/lib/use-client";

import Icon from "../../_components/Icon";
import KidAvatar from "../../_components/KidAvatar";

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

  const [kids, setKids] = useState<Profile[]>(state.list);
  const [draftId, setDraftId] = useState(() => editing?.id ?? newProfileId());
  const [name, setName] = useState(editing?.name ?? "");
  const [birthYear, setBirthYear] = useState(editing?.birth?.slice(0, 4) ?? "");
  const [birthMonth, setBirthMonth] = useState(editing?.birth?.slice(5, 7) ?? "");
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
  const level = age !== null ? ageBand(bandForAge(age)) : null;
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
    if (!trimmed || !birth || age === null) return;

    const profile: Profile = editing
      ? { ...editing, name: trimmed.slice(0, MAX_NAME_LENGTH), birth, age: bandForAge(age) }
      : { id: draftId, name: trimmed.slice(0, MAX_NAME_LENGTH), age: bandForAge(age), birth };

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
    setPhoto(undefined);
    setTried(false);
    router.refresh();
    nameRef.current?.focus();
  };

  const finish = () => {
    if (kids.length === 1) {
      writeProfiles({ active: kids[0].id, list: kids });
      router.push("/buddy");
    } else {
      router.push("/profiles");
    }
  };

  if (now === null) return <main className="min-h-dvh bg-canvas" />;

  const years = Array.from({ length: 15 }, (_, i) => String(new Date(now).getFullYear() - i));
  const field = "h-12 w-full rounded-xl border bg-canvas px-4 text-[1rem] font-medium text-ink outline-none transition-colors focus:border-ink/50";

  return (
    <main className="min-h-dvh bg-canvas pb-24 text-ink">
      <header className="mx-auto flex max-w-[620px] items-center justify-between gap-4 px-6 pt-6 max-[640px]:px-4">
        <Link href="/" aria-label="ShowTiva Kids home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.svg" alt="ShowTiva Kids" className="h-9 w-auto" />
        </Link>
        {editing ? (
          <Link href="/parents" className="text-[0.95rem] font-semibold text-ink-soft transition-colors hover:text-ink">
            Cancel
          </Link>
        ) : (
          kids.length > 0 && (
            <button type="button" onClick={finish} className="cursor-pointer text-[0.95rem] font-semibold text-ink-soft transition-colors hover:text-ink">
              Done
            </button>
          )
        )}
      </header>

      <div className="mx-auto max-w-[620px] px-6 max-[640px]:px-4">
        <h1 className="mt-12 font-display text-[clamp(2.1rem,4.4vw,2.8rem)] leading-none font-medium max-[640px]:mt-9">
          {editing ? `Edit ${editing.name}` : kids.length > 0 ? "Add another child" : "Add your first child"}
        </h1>
        <p className="mt-3 max-w-[32rem] text-[1.02rem] leading-relaxed text-ink-soft">
          {editing
            ? "Change their photo, name or birthday."
            : "Each child gets their own profile, trail and buddy. Their birthday decides which shows they see."}
        </p>

        {/* Who is in so far. */}
        {!editing && kids.length > 0 && (
          <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-4" aria-label="Added so far">
            {kids.map((kid) => (
              <li key={kid.id} className={cx("flex w-16 flex-col items-center gap-1.5 text-center", justAdded?.id === kid.id && "animate-pop")}>
                <span className="relative">
                  <KidAvatar profile={kid} className="size-14" />
                  {justAdded?.id === kid.id && (
                    <span className="absolute -right-1 -bottom-1 grid size-6 place-items-center rounded-full bg-ink text-white ring-2 ring-canvas">
                      <Icon name="check" className="size-3.5" />
                    </span>
                  )}
                </span>
                <span className="w-full truncate text-[0.88rem] font-semibold">{kid.name}</span>
              </li>
            ))}
          </ul>
        )}

        {full ? (
          <p className="mt-10 rounded-2xl border border-line bg-paper p-6 text-[1rem] text-ink-soft">
            That&apos;s everyone this device has room for: {MAX_PROFILES} kids.{" "}
            <button type="button" onClick={finish} className="cursor-pointer font-semibold text-ink underline underline-offset-4">
              Carry on
            </button>
          </p>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
            noValidate
            className="mt-8"
          >
            <div className="rounded-2xl border border-line bg-paper">
              <Row label="Photo">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    aria-label={shownPhoto ? "Change photo" : "Choose a photo"}
                    className="flex-none cursor-pointer rounded-full outline-offset-4"
                  >
                    {shownPhoto || trimmed ? (
                      <KidAvatar profile={{ id: draftId, name: trimmed || "?" }} preview={shownPhoto} className="size-16" />
                    ) : (
                      <span className="grid size-16 place-items-center rounded-full bg-mist text-ink-soft">
                        <CameraIcon className="size-7" />
                      </span>
                    )}
                  </button>
                  <span className="flex flex-wrap gap-x-4 gap-y-1 text-[0.92rem] font-semibold">
                    <button type="button" onClick={() => fileRef.current?.click()} className="cursor-pointer text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-ink">
                      {shownPhoto ? "Change photo" : "Choose a photo"}
                    </button>
                    {shownPhoto && (
                      <button type="button" onClick={() => setPhoto(null)} className="cursor-pointer text-ink-soft transition-colors hover:text-berry">
                        Remove
                      </button>
                    )}
                  </span>
                </div>
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
                <p className={cx("mt-2 text-[0.85rem]", photoError ? "font-semibold text-berry" : "text-ink-faint")}>
                  {photoError ?? "Optional. Until there is one, we show their first initial."}
                </p>
              </Row>

              <Row label="First name" htmlFor="kid-name">
                <input
                  id="kid-name"
                  ref={nameRef}
                  value={name}
                  maxLength={MAX_NAME_LENGTH}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="First name or nickname"
                  autoComplete="off"
                  className={cx(field, tried && !trimmed ? "border-berry" : "border-line")}
                />
                {tried && !trimmed && <p className="mt-1.5 text-[0.85rem] font-semibold text-berry">What should we call them?</p>}
              </Row>

              <Row label="Born">
                <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-2">
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
                <p className={cx("mt-2 text-[0.85rem]", tried && !birth ? "font-semibold text-berry" : "text-ink-faint")}>
                  {age !== null
                    ? age < 2
                      ? "Under 2. ShowTiva Kids is made for 2 and up, so they'll get the gentlest shows."
                      : age > 12
                        ? `${age}. ShowTiva Kids is made for up to 12, so they'll see everything.`
                        : `${age} years old.`
                    : tried
                      ? "We need this to know which shows are right for them."
                      : "The month and year is enough."}
                </p>
              </Row>

              <Row label="Shows">
                {level ? (
                  <>
                    <p className="pt-3 text-[1rem] max-[560px]:pt-0">
                      <span className="font-semibold">{level.label}</span>
                      <span className="text-ink-soft"> · {level.range}</span>
                    </p>
                    <p className="mt-1 text-[0.85rem] leading-relaxed text-ink-faint">
                      {level.blurb} Set by their age; it moves up on its own as they grow.
                    </p>
                  </>
                ) : (
                  <p className="pt-3 text-[0.95rem] text-ink-faint max-[560px]:pt-0">Worked out from their birthday.</p>
                )}
              </Row>
            </div>

            <button
              type="submit"
              className="mt-6 inline-flex h-13 w-full cursor-pointer items-center justify-center rounded-xl bg-ink text-[1.02rem] font-semibold text-white transition-transform active:scale-[0.99]"
            >
              {editing ? "Save changes" : trimmed ? `Add ${trimmed}` : "Add child"}
            </button>
            {!editing && kids.length > 0 && (
              <button
                type="button"
                onClick={finish}
                className="mt-3 h-13 w-full cursor-pointer rounded-xl border border-line bg-paper text-[1rem] font-semibold transition-colors hover:border-ink/30"
              >
                That&apos;s everyone
              </button>
            )}
            <p className="mt-6 text-center text-[0.85rem] text-ink-faint">Photos and birthdays stay on this device. Nothing is uploaded.</p>
          </form>
        )}
      </div>
    </main>
  );
}

/** One line of the form: its name on the left, the control on the right (stacked on a phone). */
function Row({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  const Label = htmlFor ? "label" : "span";
  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)] items-start gap-x-6 gap-y-2 border-b border-line px-5 py-5 last:border-b-0 max-[560px]:grid-cols-1 max-[560px]:px-4">
      <Label htmlFor={htmlFor} className="pt-3 text-[0.95rem] font-semibold max-[560px]:pt-0">
        {label}
      </Label>
      <div className="min-w-0">{children}</div>
    </div>
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
