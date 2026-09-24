import type { Metadata } from "next";

import { getCatalog } from "@/lib/catalog";
import { getProfiles } from "@/lib/session";

import ProfilesClient from "./ProfilesClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Who's watching?" };

export default async function ProfilesPage({ searchParams }: { searchParams: Promise<{ add?: string }> }) {
  const [{ characters }, { state }, params] = await Promise.all([getCatalog(), getProfiles(), searchParams]);
  return <ProfilesClient characters={characters} state={state} startAdding={params.add === "1"} />;
}
