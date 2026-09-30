// Who's watching: the kids on this device, and which one is watching now.
// Each child has their own id, and with it their own shows (by age), their
// own favourites, their own trail and their own buddy.
//
// Kept in a cookie rather than localStorage because the server needs it. The
// age a profile is set to decides which shows a page may render, and making
// that call on the client would mean painting the whole catalog, reading
// storage, then pulling rows back out in front of the child. The cookie
// arrives with the request, so the first frame is already the right one.
//
// Pure module: no `next/headers`, so the client can import the same parser
// and writer. The server-side reader lives in session.ts.

import { CHARACTER_IDS, type CharacterId } from "./catalog-types";

export const PROFILES_COOKIE = "stk_profiles";
export const MAX_PROFILES = 6;
export const MAX_NAME_LENGTH = 16;

/**
 * The three levels of show. A child's level comes from their birthday, never
 * a picker, and moves up on its own as they grow (see parseProfiles). The ids
 * are what is stored; the labels are what people see.
 */
export const AGE_BANDS = [
  {
    id: "preschool",
    label: "Sprouts",
    range: "4 and under",
    maxAge: 4,
    blurb: "Songs, counting, gentle stories and first cartoons.",
  },
  {
    id: "younger",
    label: "Explorers",
    range: "Ages 5 to 8",
    maxAge: 8,
    blurb: "Adventures, science, skate parks and silly shows.",
  },
  {
    id: "older",
    label: "Voyagers",
    range: "Ages 9 to 12",
    maxAge: 12,
    blurb: "Everything on ShowTiva Kids, including coding and deep-sea docs.",
  },
] as const;

export type AgeBandId = (typeof AGE_BANDS)[number]["id"];

export interface Profile {
  id: string;
  name: string;
  /** Their level of show, from their birthday. */
  age: AgeBandId;
  /** Birth month, "2019-04". Month and year only: enough for an age. */
  birth?: string;
  /**
   * The friend this child picked on "Choose your buddy": who guides their
   * trail and colours their sidebar.
   */
  buddy?: CharacterId;
}

export interface ProfileState {
  active: string | null;
  list: Profile[];
}

export const EMPTY_PROFILES: ProfileState = { active: null, list: [] };

export function ageBand(id: AgeBandId) {
  return AGE_BANDS.find((band) => band.id === id) ?? AGE_BANDS[1];
}

/** The oldest age whose shows this profile may see; everything with no profile. */
export function maxAgeFor(profile: Profile | null): number {
  return profile ? ageBand(profile.age).maxAge : 12;
}

function isProfile(value: unknown): value is Profile {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === "string" &&
    /^[a-z0-9]{4,16}$/.test(p.id) &&
    typeof p.name === "string" &&
    p.name.trim().length > 0 &&
    p.name.length <= MAX_NAME_LENGTH &&
    AGE_BANDS.some((band) => band.id === p.age) &&
    (p.birth === undefined || (typeof p.birth === "string" && BIRTH.test(p.birth)))
  );
}

/** A buddy as stored, if it names a friend. Reads the earlier "friend-look" form as that friend. */
function readBuddy(value: unknown): CharacterId | undefined {
  const id = typeof value === "string" ? value.split("-")[0] : "";
  return CHARACTER_IDS.includes(id as CharacterId) ? (id as CharacterId) : undefined;
}

const BIRTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Whole years since a birth month, as of `now`. */
export function ageFromBirth(birth: string, now: Date): number {
  const [year, month] = birth.split("-").map(Number);
  let age = now.getFullYear() - year;
  if (now.getMonth() + 1 < month) age -= 1;
  return Math.max(0, age);
}

/** The content level that fits an age. */
export function bandForAge(age: number): AgeBandId {
  if (age <= 4) return "preschool";
  if (age <= 8) return "younger";
  return "older";
}

/**
 * Parse the cookie defensively: it came from the browser, so anything that
 * does not look exactly like a profile is dropped rather than trusted.
 * Accepts the value raw or still URI-encoded, since which one arrives depends
 * on who parsed the header.
 */
export function parseProfiles(raw: string | undefined | null): ProfileState {
  if (!raw) return EMPTY_PROFILES;

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    try {
      value = JSON.parse(decodeURIComponent(raw));
    } catch {
      return EMPTY_PROFILES;
    }
  }

  if (typeof value !== "object" || value === null) return EMPTY_PROFILES;
  const state = value as Record<string, unknown>;
  const list = Array.isArray(state.list)
    ? state.list
        .filter(isProfile)
        .slice(0, MAX_PROFILES)
        // A child's level follows their age, so it moves up by itself on the
        // birthday that crosses into the next one.
        .map((profile) => ({
          ...profile,
          age: profile.birth ? bandForAge(ageFromBirth(profile.birth, new Date())) : profile.age,
          buddy: readBuddy(profile.buddy),
        }))
    : [];
  const active = list.some((p) => p.id === state.active) ? (state.active as string) : null;
  return { active, list };
}

export function activeProfile(state: ProfileState): Profile | null {
  return state.list.find((profile) => profile.id === state.active) ?? null;
}

/** Client only: persist the state for a year. The caller refreshes the route. */
export function writeProfiles(state: ProfileState): void {
  const value = encodeURIComponent(JSON.stringify(state));
  document.cookie = `${PROFILES_COOKIE}=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function newProfileId(): string {
  return Math.random().toString(36).slice(2, 10).padEnd(6, "0");
}
