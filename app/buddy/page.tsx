import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCatalog } from "@/lib/catalog";
import { getViewer } from "@/lib/session";

import BuddyClient from "./BuddyClient";

// Reads the catalog and the profiles cookie on every request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Choose your buddy" };

/** After "Who's watching?": the child picks the friend who comes along, one at a time on a stage. */
export default async function BuddyPage() {
  const [{ characters }, { state, active }] = await Promise.all([getCatalog(), getViewer()]);

  // A buddy belongs to a child, so someone has to be watching first.
  if (!active) redirect("/profiles");

  return <BuddyClient key={active.id} characters={characters} state={state} kid={active} />;
}
