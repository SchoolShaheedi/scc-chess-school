// The coach voice (DECISIONS #80): recorded Punjabi and English clips, so a child who can't read yet can
// follow a lesson. Recorded by a person (the user's choice), never text-to-speech. Each clip lives at
// public/audio/<lang>/<id>.mp3; the ids come from here, and 04_Assets/VOICE-SCRIPT.md lists every line with
// its file name (built by `npm run voice-script`). A clip that hasn't been recorded yet is silently skipped.
import { store } from "./store";

export const learnId = (lesson: string, i: number) => `${lesson}-learn-${i + 1}`;
export const promptId = (lesson: string, step: "try" | "practise" | "challenge", i = 0) => `${lesson}-${step}${step === "practise" || i ? `-${i + 1}` : ""}`;
/** The few coach lines heard everywhere. */
export const UI_LINES = ["correct", "puzzleWrong", "notQuite", "wellDone", "lessonDone"] as const;
export const uiId = (key: (typeof UI_LINES)[number]) => `ui-${key}`;

/** On by default for the Young look; anyone can switch it in Settings. */
export const voiceOn = () => store.get().voice ?? store.get().look === "young";

let current: HTMLAudioElement | null = null;
const missing = new Set<string>();

/** Play a clip if it exists. Resolves true if it started, false if there's no recording (yet). */
export function speak(id: string): Promise<boolean> {
  const src = `audio/${store.get().lang}/${id}.mp3`;
  if (missing.has(src)) return Promise.resolve(false);
  current?.pause();
  const a = new Audio(src); current = a;
  return a.play().then(() => true, () => { missing.add(src); return false; });
}
export const stopVoice = () => { current?.pause(); current = null; };
