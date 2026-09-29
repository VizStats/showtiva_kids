import type { Metadata } from "next";

import { getProfiles } from "@/lib/session";

import AddKidsClient from "./AddKidsClient";

// Reads the profiles cookie on every request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Add your kids" };

type PageProps = { searchParams: Promise<{ edit?: string }> };

/**
 * Where a family starts: a grown-up adds each child with a photo, a name and
 * a birthday. `?edit=<id>` opens the same form on a child already added.
 */
export default async function AddKidsPage({ searchParams }: PageProps) {
  const [{ state }, { edit }] = await Promise.all([getProfiles(), searchParams]);
  const editing = edit ? (state.list.find((profile) => profile.id === edit) ?? null) : null;
  return <AddKidsClient key={editing?.id ?? "new"} state={state} editing={editing} />;
}
