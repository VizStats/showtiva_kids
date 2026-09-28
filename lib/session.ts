// Server side of profiles.ts: reads the profiles cookie off the request.
import "server-only";

import { cookies } from "next/headers";

import type { CharacterId } from "./catalog-types";
import { PROFILES_COOKIE, activeProfile, maxAgeFor, parseProfiles, type Profile, type ProfileState } from "./profiles";

export async function getProfiles(): Promise<{ state: ProfileState; active: Profile | null }> {
  const state = parseProfiles((await cookies()).get(PROFILES_COOKIE)?.value);
  return { state, active: activeProfile(state) };
}

export interface Viewer {
  state: ProfileState;
  /** The child watching now; null before anyone is picked. */
  active: Profile | null;
  /** The oldest age of show that child may see. */
  maxAge: number;
  /** The friend that child picked as their buddy, if they have. */
  buddy: CharacterId | null;
}

/** Who is watching, and what that means for the page. */
export async function getViewer(): Promise<Viewer> {
  const { state, active } = await getProfiles();
  return { state, active, maxAge: maxAgeFor(active), buddy: active?.buddy ?? null };
}
