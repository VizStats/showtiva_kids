"use client";

// Three small steps, each one screen, each one decision: pick a buddy, say
// your name, choose an age. The buddy comes first on purpose. It is the step a
// child can do alone, so the grown-up can hand the device over for it, and
// once chosen the buddy stays on screen greeting the child by name while the
// rest is filled in.

import { useState } from "react";

import { cx, tint } from "@/lib/cx";
import type { Character as CharacterData } from "@/lib/catalog-types";
import {
  AGE_BANDS,
  MAX_NAME_LENGTH,
  newProfileId,
  writeProfiles,
  type AgeBandId,
  type ProfileState,
} from "@/lib/profiles";

import Character from "../_components/Character";
import Icon from "../_components/Icon";

interface AddProfileProps {
  characters: CharacterData[];
  state: ProfileState;
  onClose: () => void;
  onSaved: () => void;
}

const STEPS = ["Pick a buddy", "What's your name?", "How old?"] as const;

export default function AddProfile({ characters, state, onClose, onSaved }: AddProfileProps) {
  const [step, setStep] = useState(0);
  const [buddyId, setBuddyId] = useState<CharacterData["id"] | null>(null);
  const [name, setName] = useState("");
  const [age, setAge] = useState<AgeBandId | null>(null);

  const buddy = characters.find((c) => c.id === buddyId) ?? null;
  const trimmed = name.trim();
  const canNext = step === 0 ? !!buddy : step === 1 ? trimmed.length > 0 : !!age;

  const save = () => {
    if (!buddy || !trimmed || !age) return;
    const profile = { id: newProfileId(), name: trimmed.slice(0, MAX_NAME_LENGTH), character: buddy.id, age };
    // The new profile becomes the one watching: whoever just set it up wants
    // to see it working, not to be asked "who's watching?" a second time.
    writeProfiles({ active: profile.id, list: [...state.list, profile] });
    onSaved();
  };

  const next = () => {
    if (!canNext) return;
    if (step < 2) setStep(step + 1);
    else save();
  };

  return (
    <div className="fixed inset-0 z-[70] grid animate-fade place-items-center bg-ink/45 p-4 backdrop-blur-md max-[560px]:place-items-end max-[560px]:p-0">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-title"
        className="relative flex max-h-[min(760px,100dvh)] w-full max-w-[760px] animate-sheet flex-col overflow-hidden rounded-stage bg-paper shadow-lift max-[560px]:rounded-b-none"
        style={buddy ? tint(buddy) : undefined}
      >
        <div className="flex items-center justify-between gap-4 px-7 pt-6 max-[560px]:px-5">
          <div className="flex items-center gap-1.5" aria-label={`Step ${step + 1} of 3`}>
            {STEPS.map((label, i) => (
              <span
                key={label}
                className={cx(
                  "h-2 rounded-full transition-[width,background-color] duration-300",
                  i === step ? "w-8 bg-ink" : i < step ? "w-2 bg-ink" : "w-2 bg-ink/15",
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-11 cursor-pointer place-items-center rounded-full text-ink-soft transition-colors hover:bg-mist hover:text-ink"
          >
            <Icon name="close" className="size-5" />
          </button>
        </div>

        <h2 id="add-title" className="px-7 pt-2 font-display text-[clamp(1.7rem,3.4vw,2.3rem)] leading-tight font-medium max-[560px]:px-5">
          {STEPS[step]}
        </h2>

        <div className="min-h-0 flex-1 overflow-y-auto px-7 pt-5 pb-6 max-[560px]:px-5">
          {step === 0 && (
            <ul className="grid grid-cols-3 gap-3 max-[560px]:grid-cols-2">
              {characters.map((character) => {
                const picked = character.id === buddyId;
                return (
                  <li key={character.id}>
                    <button
                      type="button"
                      onClick={() => setBuddyId(character.id)}
                      aria-pressed={picked}
                      style={tint(character)}
                      className={cx(
                        "group relative flex h-[188px] w-full cursor-pointer flex-col items-center justify-end overflow-hidden rounded-panel pb-3 transition-[background-color,box-shadow,transform] duration-300 ease-spring",
                        picked ? "bg-(--c) shadow-pop" : "bg-(--c-soft) hover:-translate-y-1",
                      )}
                    >
                      <Character
                        character={character}
                        decorative
                        className={cx(
                          "absolute top-3 h-[150px] transition-transform duration-500 ease-spring",
                          picked ? "-translate-y-1 scale-[1.06]" : "group-hover:-rotate-3",
                        )}
                      />
                      <span
                        className={cx(
                          "relative rounded-full px-3 py-1 font-display text-[1.1rem] font-medium",
                          picked ? "bg-paper text-ink" : "bg-paper/80 text-(--c-deep)",
                        )}
                      >
                        {character.name}
                      </span>
                      {picked && (
                        <span className="absolute top-3 right-3 grid size-8 animate-pop place-items-center rounded-full bg-paper text-ink">
                          <Icon name="check" className="size-5" />
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {step > 0 && buddy && (
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-6 max-[560px]:grid-cols-1">
              <div className="relative mx-auto flex flex-col items-center">
                <span className="relative mb-3 max-w-[220px] animate-pop rounded-3xl bg-(--c-soft) px-4 py-3 text-center font-display text-[1.05rem] leading-snug font-medium text-(--c-deep)">
                  {trimmed ? `Nice to meet you, ${trimmed}!` : `Hi! I'm ${buddy.name}. What's your name?`}
                  <span className="absolute -bottom-2 left-1/2 size-4 -translate-x-1/2 rotate-45 bg-(--c-soft)" />
                </span>
                <Character character={buddy} decorative className="h-[220px] animate-bob max-[560px]:h-[170px]" />
              </div>

              {step === 1 ? (
                <label className="flex flex-col gap-3 pb-4">
                  <span className="text-[0.95rem] font-semibold text-ink-soft">Their first name or a nickname</span>
                  <input
                    autoFocus
                    value={name}
                    maxLength={MAX_NAME_LENGTH}
                    onChange={(event) => setName(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && next()}
                    placeholder="Type a name"
                    autoComplete="off"
                    className="h-16 w-full rounded-2xl border-2 border-line bg-canvas px-5 font-display text-[1.6rem] font-medium text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-(--c)"
                  />
                  <span className="text-[0.85rem] text-ink-faint">It stays on this device. We never ask for a surname.</span>
                </label>
              ) : (
                <ul className="flex flex-col gap-2.5 pb-2" role="radiogroup" aria-label="Age">
                  {AGE_BANDS.map((band) => {
                    const picked = band.id === age;
                    return (
                      <li key={band.id}>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={picked}
                          onClick={() => setAge(band.id)}
                          className={cx(
                            "flex w-full cursor-pointer items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition-colors",
                            picked ? "border-(--c) bg-(--c-soft)" : "border-line bg-paper hover:border-ink/20",
                          )}
                        >
                          <span
                            className={cx(
                              "grid size-7 flex-none place-items-center rounded-full border-2 transition-colors",
                              picked ? "border-(--c) bg-(--c) text-(--c-on)" : "border-ink/20",
                            )}
                          >
                            {picked && <Icon name="check" className="size-4" />}
                          </span>
                          <span className="min-w-0">
                            <span className="flex flex-wrap items-baseline gap-x-2">
                              <strong className="font-display text-[1.2rem] font-medium">{band.label}</strong>
                              <span className="text-[0.9rem] font-semibold text-ink-soft">{band.range}</span>
                            </span>
                            <span className="mt-0.5 block text-[0.9rem] leading-snug text-ink-soft">{band.blurb}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line px-7 py-4 max-[560px]:px-5">
          <button
            type="button"
            onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
            className="h-12 cursor-pointer rounded-full px-5 text-[0.95rem] font-semibold text-ink-soft transition-colors hover:bg-mist hover:text-ink"
          >
            {step === 0 ? "Cancel" : "Back"}
          </button>
          <button
            type="button"
            onClick={next}
            disabled={!canNext}
            className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-full bg-ink px-7 text-[0.98rem] font-semibold text-white shadow-lift transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-mist disabled:text-ink-faint disabled:shadow-none"
          >
            {step === 2 ? "Create profile" : "Next"}
            {step < 2 && <Icon name="chevron-right" className="size-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
