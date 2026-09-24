"use client";

// "Ask a grown-up": the lock in front of anything a child should not change on
// their own (profiles, the break timer, leaving for the grown-up app).
//
// The question is a times-table sum written out in words, the same idea the
// big kids' apps use: easy for an adult at a glance, out of reach for a
// pre-reader, and not something a quick tap-and-hold gets past. A wrong
// answer shakes, clears and asks a different sum, so guessing does not pay.

import { useCallback, useEffect, useMemo, useState } from "react";

import { cx } from "@/lib/cx";
import { gateOpen, openGate, readGateRaw } from "@/lib/device";
import { useIsClient } from "@/lib/use-client";

import Icon from "./Icon";

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

function newSum() {
  const a = 3 + Math.floor(Math.random() * 7);
  const b = 3 + Math.floor(Math.random() * 7);
  return { a, b, answer: String(a * b) };
}

interface ParentGateProps {
  /** What the grown-up is about to do, e.g. "Add a profile". */
  reason: string;
  onPass: () => void;
  onCancel?: () => void;
  /** Rendered inline (a whole page behind the gate) rather than as a modal. */
  inline?: boolean;
}

export default function ParentGate({ reason, onPass, onCancel, inline }: ParentGateProps) {
  // The sum is random, so it is only shown once in the browser: drawn on the
  // server too, it would not match the one the client draws.
  const client = useIsClient();
  const [drawn, setSum] = useState(newSum);
  const sum = client ? drawn : null;
  const [entry, setEntry] = useState("");
  const [wrong, setWrong] = useState(0);

  // A grown-up who passed the gate a moment ago is not asked again.
  useEffect(() => {
    if (gateOpen(readGateRaw())) onPass();
    // Checked once, as the gate appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const press = useCallback(
    (digit: string) => {
      if (!sum || entry.length >= sum.answer.length) return;
      const next = entry + digit;
      setEntry(next);
      if (next.length < sum.answer.length) return;
      if (next === sum.answer) {
        openGate();
        // Let the last digit paint before the gate goes away.
        window.setTimeout(onPass, 120);
      } else {
        setWrong((n) => n + 1);
        window.setTimeout(() => {
          setSum(newSum());
          setEntry("");
        }, 420);
      }
    },
    [sum, entry, onPass],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (/^[0-9]$/.test(event.key)) press(event.key);
      else if (event.key === "Backspace") setEntry((current) => current.slice(0, -1));
      else if (event.key === "Escape" && onCancel) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press, onCancel]);

  const slots = useMemo(() => Array.from({ length: sum?.answer.length ?? 2 }), [sum]);

  const card = (
    <div
      role="dialog"
      aria-modal={inline ? undefined : true}
      aria-labelledby="gate-title"
      className="relative w-full max-w-[400px] animate-sheet rounded-panel bg-paper p-7 shadow-lift max-[420px]:p-5"
    >
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="absolute top-4 right-4 grid size-11 cursor-pointer place-items-center rounded-full text-ink-soft transition-colors hover:bg-mist hover:text-ink"
        >
          <Icon name="close" className="size-5" />
        </button>
      )}

      <div className="mx-auto grid size-14 place-items-center rounded-full bg-mist text-ink">
        <Icon name="lock" className="size-7" />
      </div>
      <p className="mt-4 text-center text-[0.78rem] font-bold tracking-[0.14em] text-ink-faint uppercase">Grown-ups only</p>
      <h2 id="gate-title" className="mt-1 text-center font-display text-[1.45rem] leading-tight font-medium text-balance">
        {reason}
      </h2>
      <p className="mt-3 text-center text-[0.95rem] text-ink-soft" aria-live="polite">
        {sum ? (
          <>
            What is <strong className="font-bold text-ink">{WORDS[sum.a]}</strong> times{" "}
            <strong className="font-bold text-ink">{WORDS[sum.b]}</strong>?
          </>
        ) : (
          " "
        )}
      </p>

      <div key={wrong} className={cx("mt-5 flex justify-center gap-2.5", wrong > 0 && "animate-shake")}>
        {slots.map((_, i) => (
          <span
            key={i}
            className={cx(
              "grid h-16 w-14 place-items-center rounded-2xl border-2 font-display text-[1.9rem] font-medium transition-colors",
              entry[i] ? "border-ink bg-paper" : "border-line bg-mist",
            )}
          >
            {entry[i] ?? ""}
          </span>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2.5">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
          <Key key={digit} onClick={() => press(digit)}>
            {digit}
          </Key>
        ))}
        <span />
        <Key onClick={() => press("0")}>0</Key>
        <Key onClick={() => setEntry((current) => current.slice(0, -1))} label="Delete">
          <Icon name="backspace" className="size-6" />
        </Key>
      </div>
    </div>
  );

  if (inline) return card;

  return (
    <div className="fixed inset-0 z-[80] grid animate-fade place-items-center bg-ink/45 p-4 backdrop-blur-md">
      {onCancel && <button type="button" aria-label="Close" className="absolute inset-0 cursor-default" onClick={onCancel} />}
      {card}
    </div>
  );
}

function Key({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-14 cursor-pointer place-items-center rounded-2xl bg-mist font-display text-[1.4rem] font-medium text-ink transition-[background-color,transform] duration-150 hover:bg-[#ebe3d6] active:scale-95"
    >
      {children}
    </button>
  );
}
