import type { Metadata } from "next";

import { getCatalog, lookupCharacter, trailFor } from "@/lib/catalog";
import { getViewer } from "@/lib/session";

import TrailClient from "./TrailClient";

// Reads the catalog and the profiles cookie on every request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "The Trail" };

export default async function TrailPage() {
  const [catalog, { active, maxAge, buddy: picked }] = await Promise.all([getCatalog(), getViewer()]);

  // Each child walks their own trail, guided by the buddy they picked; with
  // nobody watching, or no buddy yet, Bloop.
  const buddy = lookupCharacter(catalog, picked ?? "bloop") ?? catalog.characters[0];

  return (
    <TrailClient
      chapters={trailFor(catalog, maxAge)}
      characters={catalog.characters}
      buddy={buddy}
      profileId={active?.id ?? "guest"}
      name={active?.name ?? null}
    />
  );
}
