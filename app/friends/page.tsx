import type { Metadata } from "next";

import { getCatalog } from "@/lib/catalog";

import CrewCard from "../_components/CrewCard";
import AppShell from "../_components/AppShell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "The crew" };

export default async function FriendsPage() {
  const catalog = await getCatalog();

  return (
    <AppShell>
      <main className="mx-auto max-w-[1320px] px-6 pt-8 pb-20 max-[640px]:px-4">
        <h1 className="font-display text-[clamp(2.2rem,4.6vw,3.4rem)] leading-none font-medium">Meet the crew</h1>
        <p className="mt-3 max-w-[34rem] text-[1.05rem] leading-relaxed text-ink-soft">
          Six best friends from Tiva Island. Pick one to see their world and everything they star in.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-x-6 gap-y-4 max-[960px]:grid-cols-2 max-[560px]:grid-cols-1 max-[560px]:gap-y-2">
          {catalog.characters.map((character) => (
            <CrewCard key={character.id} character={character} />
          ))}
        </div>
      </main>
    </AppShell>
  );
}
