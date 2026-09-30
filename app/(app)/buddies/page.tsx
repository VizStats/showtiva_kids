import type { Metadata } from "next";

import { getCatalog, showsFor } from "@/lib/catalog";
import { toLite } from "@/lib/catalog-types";
import { getViewer } from "@/lib/session";

import BuddiesClient from "./BuddiesClient";

// Reads the catalog and the profiles cookie on every request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "The crew" };

/** Every buddy in one place: find one, hear them talk, make them yours. */
export default async function BuddiesPage() {
  const [catalog, { state, active, maxAge, buddy }] = await Promise.all([getCatalog(), getViewer()]);
  return (
    <BuddiesClient
      characters={catalog.characters}
      shows={showsFor(catalog, maxAge).map(toLite)}
      state={state}
      kid={active}
      buddy={buddy}
    />
  );
}
