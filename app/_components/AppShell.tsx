import type { ReactNode } from "react";

import { getCatalog, libraryFor, showsFor } from "@/lib/catalog";
import { toLite } from "@/lib/catalog-types";
import { maxAgeFor } from "@/lib/profiles";
import { getProfiles } from "@/lib/session";

import KidsChrome from "./KidsChrome";

/**
 * The frame every in-app page sits in, with its data. Reads the catalog and
 * the profiles cookie itself (both are cached for the request, so a page that
 * also reads them costs nothing extra) and hands the header what search,
 * Discover and favourites need, already filtered to the viewer's age.
 */
export default async function AppShell({ children }: { children: ReactNode }) {
  const [catalog, { state, active }] = await Promise.all([getCatalog(), getProfiles()]);
  const maxAge = maxAgeFor(active);

  return (
    <KidsChrome
      characters={catalog.characters}
      shows={showsFor(catalog, maxAge).map(toLite)}
      library={libraryFor(catalog, maxAge)}
      profiles={state}
      active={active}
    >
      {children}
    </KidsChrome>
  );
}
