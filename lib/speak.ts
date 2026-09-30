// The buddies' voices: the browser's own speech, tuned per friend.
//
// Each friend lists the voices they would like, best first (the kid voices a
// device carries, where it has any), plus a pitch and a speed. Browsers ship
// different voices, so the list is a wish: the first one this device has is
// used, and the pitch and speed keep the six sounding different even on a
// device with a single voice. Client only.

export interface VoiceStyle {
  pitch: number;
  rate: number;
  /** Voice names to look for, best first: "Ana", "Maisie", "Google UK English Male". */
  prefer: string[];
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** The first of a friend's wished-for voices this device has; any English voice otherwise. */
export function pickVoice(prefer: string[]): SpeechSynthesisVoice | null {
  const english = window.speechSynthesis.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  for (const wish of prefer) {
    const pattern = new RegExp(`\\b${wish.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    const match = english.find((voice) => pattern.test(voice.name));
    if (match) return match;
  }
  return english[0] ?? null;
}

/**
 * Say a line in a friend's voice, cutting off anything already being said.
 * Returns a function that stops it (and drops its callbacks).
 */
export function say(text: string, style: VoiceStyle, events: { onstart?: () => void; onend?: () => void } = {}): () => void {
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.pitch = Math.min(2, style.pitch);
  utterance.rate = style.rate;
  const voice = pickVoice(style.prefer);
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  }
  utterance.onstart = () => events.onstart?.();
  utterance.onend = utterance.onerror = () => events.onend?.();
  synth.speak(utterance);
  return () => {
    utterance.onstart = utterance.onend = utterance.onerror = null;
    synth.cancel();
  };
}

/**
 * Say a word silently in a friend's voice. Online voices take a few seconds
 * to answer the first time; after this, their real first line starts on
 * time. Resolves when done, or after a few seconds whatever happens.
 */
export function warmUp(style: VoiceStyle): Promise<void> {
  return new Promise((resolve) => {
    if (!canSpeak()) return resolve();
    const utterance = new SpeechSynthesisUtterance("hi");
    utterance.volume = 0;
    const voice = pickVoice(style.prefer);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }
    const done = () => {
      utterance.onend = utterance.onerror = null;
      resolve();
    };
    utterance.onend = utterance.onerror = done;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    window.setTimeout(done, 3500);
  });
}

/** Warm the voice list, which some browsers only fill in after the first ask. */
export function warmVoices(): void {
  if (canSpeak()) window.speechSynthesis.getVoices();
}

export function hush(): void {
  if (canSpeak()) window.speechSynthesis.cancel();
}
