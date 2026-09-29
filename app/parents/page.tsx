import type { Metadata } from "next";

import { getCatalog } from "@/lib/catalog";
import { getProfiles } from "@/lib/session";

import ParentsClient from "./ParentsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Grown-ups" };

export default async function ParentsPage() {
  const [{ characters }, { state }] = await Promise.all([getCatalog(), getProfiles()]);
  // Each child's buddy by name, for the list of kids.
  const buddies = Object.fromEntries(
    state.list.map((profile) => [profile.id, characters.find((c) => c.id === profile.buddy)?.name ?? null]),
  );
  return <ParentsClient state={state} buddies={buddies} />;
}
