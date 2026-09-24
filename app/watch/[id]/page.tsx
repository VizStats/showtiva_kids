import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCatalog, lookupShow, relatedShows, showsFor } from "@/lib/catalog";
import { toLite } from "@/lib/catalog-types";
import { maxAgeFor } from "@/lib/profiles";
import { getProfiles } from "@/lib/session";

import AppShell from "../../_components/AppShell";
import ShowClient from "./ShowClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ play?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const show = lookupShow(await getCatalog(), id);
  return show ? { title: show.title, description: show.logline } : { title: "Not found" };
}

export default async function ShowPage({ params, searchParams }: PageProps) {
  const [{ id }, { play }, catalog, { active }] = await Promise.all([params, searchParams, getCatalog(), getProfiles()]);

  const maxAge = maxAgeFor(active);
  const show = lookupShow(catalog, id);
  // A show above this profile's age is treated as not there at all, so a
  // shared link cannot walk a younger child around the age setting.
  if (!show || show.ageMin > maxAge) notFound();

  const visible = showsFor(catalog, maxAge).map(toLite);
  const sameHost = visible.filter((other) => other.host === show.host && other.id !== show.id);
  const related = relatedShows(catalog, show, maxAge)
    .filter((other) => other.host !== show.host)
    .map(toLite);

  return (
    <AppShell>
      <ShowClient
        key={show.id}
        show={show}
        characters={catalog.characters}
        sameHost={sameHost}
        related={related}
        profileId={active?.id ?? null}
        autoplay={play === "1"}
      />
    </AppShell>
  );
}
