import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getCatalog, lookupCharacter, showsFor } from "@/lib/catalog";
import { toLite } from "@/lib/catalog-types";
import { maxAgeFor } from "@/lib/profiles";
import { getProfiles } from "@/lib/session";

import AppShell from "../../_components/AppShell";
import FriendClient from "./FriendClient";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const character = lookupCharacter(await getCatalog(), (await params).id);
  return character ? { title: `${character.name}'s ${character.world}`, description: character.worldLine } : { title: "Not found" };
}

export default async function FriendPage({ params }: PageProps) {
  const [{ id }, catalog, { active }] = await Promise.all([params, getCatalog(), getProfiles()]);
  const character = lookupCharacter(catalog, id);
  if (!character) notFound();

  const visible = showsFor(catalog, maxAgeFor(active)).map(toLite);
  const hosted = visible.filter((show) => show.host === character.id);
  const guest = visible.filter((show) => show.host !== character.id && show.cast.includes(character.id));

  return (
    <AppShell>
      <FriendClient key={character.id} character={character} characters={catalog.characters} hosted={hosted} guest={guest} />
    </AppShell>
  );
}
