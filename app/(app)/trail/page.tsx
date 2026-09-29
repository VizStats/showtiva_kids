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
  // nobody watching, or no buddy yet, Bloop. The buddy also hosts the first
  // island, so the journey opens with the friend the child chose.
  const buddy = lookupCharacter(catalog, picked ?? "bloop") ?? catalog.characters[0];
  const [first, ...rest] = trailFor(catalog, maxAge);
  const chapters = first ? [{ ...first, host: buddy.id }, ...rest] : [];

  return (
    <TrailClient
      chapters={chapters}
      characters={catalog.characters}
      buddy={buddy}
      profileId={active?.id ?? "guest"}
      name={active?.name ?? null}
    />
  );
}
