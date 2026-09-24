import type { Metadata } from "next";

import { getCatalog, lookupCharacter, lookupShow, showsFor, trailFor } from "@/lib/catalog";
import { toLite, type ShowLite } from "@/lib/catalog-types";
import { maxAgeFor } from "@/lib/profiles";
import { getProfiles } from "@/lib/session";

import AppShell from "../_components/AppShell";
import HomeClient, { type HomeRow } from "./HomeClient";

// Reads the catalog and the profiles cookie on every request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Home" };

export default async function WatchPage() {
  const [catalog, { active }] = await Promise.all([getCatalog(), getProfiles()]);

  // With a profile, the catalog is that child's view: only shows for the age
  // a grown-up chose. Without one it is still open (a locked door before the
  // first show is a door people bounce off), and the page offers to set a
  // profile up rather than insisting on it.
  const maxAge = maxAgeFor(active);
  const visible = showsFor(catalog, maxAge).map(toLite);
  const byId = new Map(visible.map((show) => [show.id, show]));
  const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((show): show is ShowLite => Boolean(show));

  const featured = pick(catalog.featuredIds.filter((id) => lookupShow(catalog, id)));

  // Curated rows first, then one row per friend's world, in the crew's order.
  const worlds: HomeRow[] = catalog.characters.map((character) => ({
    id: `world-${character.id}`,
    title: `${character.world} with ${character.name}`,
    host: character.id,
    seeAll: `/friends/${character.id}`,
    shows: visible.filter((show) => show.host === character.id),
  }));
  const [brandNew, ...moreCurated] = catalog.rows.map((row) => ({ id: row.id, title: row.title, shows: pick(row.showIds) }));
  const rows = [brandNew, ...worlds.slice(0, 3), ...moreCurated, ...worlds.slice(3)].filter(
    (row): row is HomeRow => Boolean(row) && row.shows.length > 0,
  );

  return (
    <AppShell>
      <HomeClient
        characters={catalog.characters}
        featured={featured}
        rows={rows}
        shows={visible}
        profile={active}
        trail={trailFor(catalog, maxAge)}
        buddy={lookupCharacter(catalog, active?.character ?? "bloop") ?? catalog.characters[0]}
      />
    </AppShell>
  );
}
