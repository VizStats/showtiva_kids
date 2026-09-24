import type { Metadata } from "next";

import { getCatalog } from "@/lib/catalog";
import { getProfiles } from "@/lib/session";

import ParentsClient from "./ParentsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Grown-ups" };

export default async function ParentsPage() {
  const [{ characters }, { state }] = await Promise.all([getCatalog(), getProfiles()]);
  return <ParentsClient characters={characters} state={state} />;
}
