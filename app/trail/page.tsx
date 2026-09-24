import type { Metadata } from "next";

import { getCatalog, lookupCharacter, trailFor } from "@/lib/catalog";
import { maxAgeFor } from "@/lib/profiles";
import { getProfiles } from "@/lib/session";

import AppShell from "../_components/AppShell";
import TrailClient from "./TrailClient";

// Reads the catalog and the profiles cookie on every request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "The Trail" };

export default async function TrailPage() {
  const [catalog, { active }] = await Promise.all([getCatalog(), getProfiles()]);
  const maxAge = maxAgeFor(active);

  // The guide is the buddy the child picked; without a profile, Bloop.
  const buddy = lookupCharacter(catalog, active?.character ?? "bloop") ?? catalog.characters[0];

  return (
    <AppShell>
      <TrailClient
        chapters={trailFor(catalog, maxAge)}
        characters={catalog.characters}
        buddy={buddy}
        profileId={active?.id ?? "guest"}
        name={active?.name ?? null}
      />
    </AppShell>
  );
}
