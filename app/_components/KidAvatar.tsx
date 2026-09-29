"use client";

// A child, as the app shows them: their own photo in a circle, or, until a
// grown-up adds one, their first initial on a colour of their own. The
// colour comes from the crew's palette and is fixed by the profile's id, so a
// child keeps the same colour on every screen.

import { useSyncExternalStore } from "react";

import { cx } from "@/lib/cx";
import { readPhotoRaw, subscribeDevice } from "@/lib/device";

const TONES = [
  { bg: "#e2f0ff", fg: "#0a58b8" },
  { bg: "#d8f6ee", fg: "#0a7d6b" },
  { bg: "#ffead4", fg: "#c25a00" },
  { bg: "#efe3ff", fg: "#6326a8" },
  { bg: "#fff4c7", fg: "#8a6700" },
  { bg: "#ffe3ec", fg: "#b8275b" },
];

export function toneFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}

interface KidAvatarProps {
  profile: { id: string; name: string };
  className?: string;
  /** Shown instead of the stored photo, e.g. a photo still being chosen. */
  preview?: string | null;
}

export default function KidAvatar({ profile, className, preview }: KidAvatarProps) {
  const stored = useSyncExternalStore(subscribeDevice, () => readPhotoRaw(profile.id), () => "");
  const photo = preview === undefined ? stored : preview;
  const tone = toneFor(profile.id);
  const initial = profile.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      role="img"
      aria-label={profile.name}
      className={cx("relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full", className)}
      style={{ background: tone.bg, color: tone.fg, containerType: "inline-size" }}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" className="absolute inset-0 size-full object-cover" draggable={false} />
      ) : (
        <span aria-hidden className="font-display text-[44cqw] leading-none font-medium">
          {initial}
        </span>
      )}
    </span>
  );
}
