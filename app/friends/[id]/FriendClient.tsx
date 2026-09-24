"use client";

// A friend's world. The character is the page: big, alive, and talkative
// when tapped. Below, everything they host and everything they turn up in.

import { useState } from "react";
import Link from "next/link";

import { cx, tint } from "@/lib/cx";
import type { Character as CharacterData, ShowLite } from "@/lib/catalog-types";

import Character from "../../_components/Character";
import Face from "../../_components/Face";
import Row, { ROW_CARD } from "../../_components/Row";
import ShowCard from "../../_components/ShowCard";

interface FriendClientProps {
  character: CharacterData;
  characters: CharacterData[];
  hosted: ShowLite[];
  guest: ShowLite[];
}

export default function FriendClient({ character, characters, hosted, guest }: FriendClientProps) {
  const [said, setSaid] = useState<{ line: string; n: number } | null>(null);
  const others = characters.filter((c) => c.id !== character.id);

  const poke = () => {
    setSaid((current) => {
      const n = (current?.n ?? -1) + 1;
      return { line: character.quotes[n % character.quotes.length], n };
    });
  };

  return (
    <main className="pb-16" style={tint(character)}>
      {/* ---- the stage ---- */}
      <section className="mx-auto max-w-[1320px] px-6 pt-4 max-[640px]:px-4">
        <div className="relative grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-center overflow-clip rounded-stage bg-(--c-soft) max-[860px]:grid-cols-1">
          {/* A big soft sun behind the character. */}
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-[8%] aspect-square w-[46%] -translate-y-1/2 rounded-full bg-paper/60 max-[860px]:top-[24%] max-[860px]:right-1/2 max-[860px]:w-[80%] max-[860px]:translate-x-1/2"
          />

          <div className="relative z-10 px-[clamp(1.75rem,5vw,4.5rem)] py-[clamp(2.5rem,5vw,4rem)] max-[860px]:order-2 max-[860px]:pt-2">
            <p className="inline-flex items-center gap-2 rounded-full bg-paper px-3 py-1.5 text-[0.8rem] font-bold tracking-[0.1em] text-(--c-deep) uppercase">
              {character.world}
            </p>
            <h1 className="mt-4 font-display text-[clamp(2.8rem,6vw,5rem)] leading-[0.95] font-medium text-(--c-deep)">
              Hi, I&apos;m {character.name}!
            </h1>
            <p className="mt-2 font-display text-[1.3rem] font-medium text-ink-soft">{character.role}</p>
            <p className="mt-5 max-w-[34rem] text-[1.1rem] leading-relaxed text-ink">{character.bio}</p>

            <p className="mt-6 text-[0.8rem] font-bold tracking-[0.14em] text-ink-faint uppercase">Loves</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {character.likes.map((like) => (
                <li key={like} className="rounded-full bg-paper px-4 py-2 text-[0.95rem] font-semibold shadow-soft">
                  {like}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative flex h-[clamp(380px,44vw,560px)] items-end justify-center max-[860px]:order-1 max-[860px]:h-[380px]">
            {said && (
              <p
                key={said.n}
                role="status"
                className="absolute top-[6%] left-1/2 z-20 max-w-[260px] animate-bubble rounded-3xl bg-paper px-5 py-3 text-center font-display text-[1.15rem] leading-snug font-medium text-ink shadow-lift"
              >
                {said.line}
                <span className="absolute -bottom-2 left-1/2 size-4 -translate-x-1/2 rotate-45 bg-paper" />
              </p>
            )}
            <button
              type="button"
              onClick={poke}
              aria-label={`Say hi to ${character.name}`}
              className="relative h-[92%] cursor-pointer rounded-[3rem] outline-offset-8"
            >
              <span key={said?.n ?? "idle"} className={cx("block h-full origin-bottom", said ? "animate-jump" : "animate-rise")}>
                <span className="block h-full animate-bob">
                  <Character character={character} priority className="h-full" />
                </span>
              </span>
            </button>
            {!said && (
              <span className="pointer-events-none absolute right-6 bottom-6 animate-fade-up rounded-full bg-paper/90 px-4 py-2 text-[0.88rem] font-bold text-ink-soft shadow-soft [animation-delay:1.2s] max-[860px]:right-1/2 max-[860px]:translate-x-1/2">
                Tap me!
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ---- their shows ---- */}
      {hosted.length > 0 && (
        <section className="mx-auto mt-[clamp(2.5rem,4vw,3.5rem)] max-w-[1320px] px-6 max-[640px]:px-4">
          <h2 className="font-display text-[clamp(1.35rem,2.2vw,1.7rem)] font-medium">
            {character.name}&apos;s shows
          </h2>
          <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-x-5 gap-y-7">
            {hosted.map((show) => (
              <ShowCard key={show.id} show={show} characters={characters} />
            ))}
          </div>
        </section>
      )}

      {guest.length > 0 && (
        <Row title={`Spot ${character.name} in`}>
          {guest.map((show) => (
            <ShowCard key={show.id} show={show} characters={characters} className={ROW_CARD} />
          ))}
        </Row>
      )}

      {/* ---- the rest of the crew ---- */}
      <section className="mx-auto mt-[clamp(2.5rem,4vw,3.5rem)] max-w-[1320px] px-6 max-[640px]:px-4">
        <h2 className="font-display text-[clamp(1.35rem,2.2vw,1.7rem)] font-medium">More friends</h2>
        <ul className="mt-4 flex flex-wrap gap-3">
          {others.map((friend) => (
            <li key={friend.id}>
              <Link
                href={`/friends/${friend.id}`}
                style={tint(friend)}
                className="group flex items-center gap-3 rounded-full bg-(--c-soft) py-1.5 pr-5 pl-1.5 transition-transform hover:-translate-y-0.5"
              >
                <Face character={friend} plain className="size-12 transition-transform duration-300 ease-spring group-hover:rotate-[-6deg]" />
                <span className="font-display text-[1.15rem] font-medium text-(--c-deep)">{friend.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
