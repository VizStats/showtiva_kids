import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getProfiles } from "@/lib/session";

import ProfilesClient from "./ProfilesClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Who's watching?" };

export default async function ProfilesPage({ searchParams }: { searchParams: Promise<{ add?: string }> }) {
  const [{ state }, params] = await Promise.all([getProfiles(), searchParams]);

  // No kids yet (or a grown-up asked to add someone): the family starts on
  // "Add your kids".
  if (state.list.length === 0 || params.add === "1") redirect("/profiles/new");

  return <ProfilesClient state={state} />;
}
