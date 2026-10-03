// The buddies' voices: the browser's own speech, tuned per friend.
//
// Each friend lists the voices they would like, best first (the kid voices a
// device carries, where it has any), plus a pitch and a speed. Browsers ship
// different voices, so the list is a wish: the first one this device has is
// used, and the pitch and speed keep the six sounding different even on a
// device with a single voice. Client only.
//
// Only voices that run on the device are ever used. Online voices (Edge's
// "Natural" ones, Chrome's "Google" ones) send the words to Microsoft or
// Google to be spoken, and the buddies say the child's name. With no voice on
// the device, a buddy stays quiet and the speech bubble carries the line.

export interface VoiceStyle {
  pitch: number;
  rate: number;
  /** Voice names to look for, best first: "Junior", "Samantha", "Daniel". Names that only exist as online voices are skipped. */
  prefer: string[];
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * The first of a friend's wished-for voices this device has; any English
 * voice otherwise. On-device voices only; null when there are none.
 */
export function pickVoice(prefer: string[]): SpeechSynthesisVoice | null {
  const english = window.speechSynthesis
    .getVoices()
    .filter((voice) => voice.localService && voice.lang.toLowerCase().startsWith("en"));
  for (const wish of prefer) {
    const pattern = new RegExp(`\\b${wish.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    const match = english.find((voice) => pattern.test(voice.name));
    if (match) return match;
  }
  return english[0] ?? null;
}

/**
 * Say a line in a friend's voice, cutting off anything already being said.
 * Returns a function that stops it (and drops its callbacks). With no voice
 * on the device it says nothing, and reports the line as over at once.
 */
export function say(text: string, style: VoiceStyle, events: { onstart?: () => void; onend?: () => void } = {}): () => void {
  const synth = window.speechSynthesis;
  synth.cancel();
  const voice = pickVoice(style.prefer);
  if (!voice) {
    // Never the browser's default voice, which can be an online one.
    const id = window.setTimeout(() => events.onend?.(), 0);
    return () => window.clearTimeout(id);
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.pitch = Math.min(2, style.pitch);
  utterance.rate = style.rate;
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.onstart = () => events.onstart?.();
  utterance.onend = utterance.onerror = () => events.onend?.();
  synth.speak(utterance);
  return () => {
    utterance.onstart = utterance.onend = utterance.onerror = null;
    synth.cancel();
  };
}

/**
 * Say a word silently in a friend's voice. Some voices take a moment to
 * answer the first time; after this, their real first line starts on time.
 * Resolves when done, or after a few seconds whatever happens.
 */
export function warmUp(style: VoiceStyle): Promise<void> {
  return new Promise((resolve) => {
    if (!canSpeak()) return resolve();
    const voice = pickVoice(style.prefer);
    if (!voice) return resolve();
    const utterance = new SpeechSynthesisUtterance("hi");
    utterance.volume = 0;
    utterance.voice = voice;
    utterance.lang = voice.lang;
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
