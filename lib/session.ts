// Server side of profiles.ts: reads the profiles cookie off the request.
import "server-only";

import { cookies } from "next/headers";

import { PROFILES_COOKIE, activeProfile, parseProfiles, type Profile, type ProfileState } from "./profiles";

export async function getProfiles(): Promise<{ state: ProfileState; active: Profile | null }> {
  const state = parseProfiles((await cookies()).get(PROFILES_COOKIE)?.value);
  return { state, active: activeProfile(state) };
}
