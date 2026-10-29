// The ten superheroes (DECISIONS #95, #109): one per level, each a virtue a chess player needs. A hero introduces
// their level (on its first lesson) and returns at its key lesson; at the end of the level the hero is the BOSS:
// three rounds (a challenge on the level's idea, Magical Chess against the hero, then a real game), and winning all
// three makes the hero yours, as your picture on your own screens. Comic style (the user's pick, #104).
import { BOTS, type Bot } from "../bots/bots";
import { LEVELS } from "../content/levels";
import type { Text } from "../lesson/types";
import { type State, store, unlockAll } from "../store";

export interface Hero { id: string; level: number; name: Text; virtue: Text; line: Text }

export const HEROES: Hero[] = [
  { id: "himmat", level: 1, name: { en: "Himmat", pa: "ਹਿੰਮਤ" }, virtue: { en: "Courage", pa: "ਹਿੰਮਤ" },
    line: { en: "Every great player started with one brave first move. Let's make yours!", pa: "ਹਰ ਵੱਡੇ ਖਿਡਾਰੀ ਨੇ ਇੱਕ ਦਲੇਰ ਪਹਿਲੀ ਚਾਲ ਨਾਲ ਸ਼ੁਰੂਆਤ ਕੀਤੀ ਸੀ। ਆਓ, ਤੁਸੀਂ ਵੀ ਸ਼ੁਰੂ ਕਰੋ!" } },
  { id: "seva", level: 2, name: { en: "Seva", pa: "ਸੇਵਾ" }, virtue: { en: "Service", pa: "ਸੇਵਾ" },
    line: { en: "Good pieces help each other. Learn to guard, and your king stays safe.", pa: "ਚੰਗੇ ਮੋਹਰੇ ਇੱਕ-ਦੂਜੇ ਦੀ ਮਦਦ ਕਰਦੇ ਹਨ। ਰਾਖੀ ਕਰਨੀ ਸਿੱਖੋ, ਤੇ ਬਾਦਸ਼ਾਹ ਸੁਰੱਖਿਅਤ ਰਹੇਗਾ।" } },
  { id: "ekta", level: 3, name: { en: "Ekta", pa: "ਏਕਤਾ" }, virtue: { en: "Unity", pa: "ਏਕਤਾ" },
    line: { en: "Alone, a piece can't trap a king. Together, they can. That's unity!", pa: "ਇਕੱਲਾ ਮੋਹਰਾ ਬਾਦਸ਼ਾਹ ਨੂੰ ਨਹੀਂ ਘੇਰ ਸਕਦਾ। ਮਿਲ ਕੇ ਘੇਰ ਸਕਦੇ ਹਨ। ਇਹੀ ਏਕਤਾ ਹੈ!" } },
  { id: "dhyaan", level: 4, name: { en: "Dhyaan", pa: "ਧਿਆਨ" }, virtue: { en: "Focus", pa: "ਧਿਆਨ" },
    line: { en: "Look at every piece before you move. Focus finds the trick.", pa: "ਚਾਲ ਤੋਂ ਪਹਿਲਾਂ ਹਰ ਮੋਹਰਾ ਵੇਖੋ। ਧਿਆਨ ਨਾਲ ਹੀ ਦਾਅ ਲੱਭਦਾ ਹੈ।" } },
  { id: "sabar", level: 5, name: { en: "Sabar", pa: "ਸਬਰ" }, virtue: { en: "Patience", pa: "ਸਬਰ" },
    line: { en: "In the endgame, slow and steady wins. Patience turns a pawn into a queen.", pa: "ਅੰਤਲੀ ਖੇਡ ਵਿੱਚ ਹੌਲੀ ਤੇ ਪੱਕੀ ਚਾਲ ਜਿੱਤਦੀ ਹੈ। ਸਬਰ ਨਾਲ ਪਿਆਦਾ ਰਾਣੀ ਬਣ ਜਾਂਦਾ ਹੈ।" } },
  { id: "utsaah", level: 6, name: { en: "Utsaah", pa: "ਉਤਸ਼ਾਹ" }, virtue: { en: "Enthusiasm", pa: "ਉਤਸ਼ਾਹ" },
    line: { en: "Start with energy: take the centre and bring your pieces out!", pa: "ਜੋਸ਼ ਨਾਲ ਸ਼ੁਰੂ ਕਰੋ: ਵਿਚਕਾਰ ਮੱਲੋ ਅਤੇ ਆਪਣੇ ਮੋਹਰੇ ਬਾਹਰ ਕੱਢੋ!" } },
  { id: "imaan", level: 7, name: { en: "Imaan", pa: "ਈਮਾਨ" }, virtue: { en: "Honesty", pa: "ਈਮਾਨਦਾਰੀ" },
    line: { en: "An X-ray attack shows what hides behind a piece. Look honestly at what is really there.", pa: "ਆਰ-ਪਾਰ ਹਮਲਾ ਮੋਹਰੇ ਦੇ ਪਿੱਛੇ ਲੁਕੀ ਚੀਜ਼ ਵਿਖਾ ਦਿੰਦਾ ਹੈ। ਈਮਾਨਦਾਰ ਨਜ਼ਰ ਉਹੀ ਵੇਖਦੀ ਹੈ ਜੋ ਸੱਚਮੁੱਚ ਹੈ।" } },
  { id: "siaanap", level: 8, name: { en: "Siaanap", pa: "ਸਿਆਣਪ" }, virtue: { en: "Wisdom", pa: "ਸਿਆਣਪ" },
    line: { en: "Wisdom is a plan. Ask yourself: where do my pieces belong?", pa: "ਸਿਆਣਪ ਇੱਕ ਯੋਜਨਾ ਹੈ। ਆਪਣੇ ਆਪ ਤੋਂ ਪੁੱਛੋ: ਮੇਰੇ ਮੋਹਰਿਆਂ ਲਈ ਸਭ ਤੋਂ ਚੰਗੀ ਥਾਂ ਕਿਹੜੀ ਹੈ?" } },
  { id: "hausla", level: 9, name: { en: "Hausla", pa: "ਹੌਸਲਾ" }, virtue: { en: "Grit", pa: "ਸਿਰੜ" },
    line: { en: "Hard endgames need grit. Never give up a position you can hold!", pa: "ਔਖੀ ਅੰਤਲੀ ਖੇਡ ਲਈ ਹੌਸਲਾ ਚਾਹੀਦਾ ਹੈ। ਜਿਹੜੀ ਹਾਲਤ ਬਚ ਸਕਦੀ ਹੈ, ਉਸ ਨੂੰ ਕਦੇ ਨਾ ਛੱਡੋ!" } },
  { id: "nimrata", level: 10, name: { en: "Nimrata", pa: "ਨਿਮਰਤਾ" }, virtue: { en: "Humility", pa: "ਨਿਮਰਤਾ" },
    line: { en: "Even masters keep learning. Calculate calmly, and check your idea again.", pa: "ਉਸਤਾਦ ਵੀ ਸਿੱਖਦੇ ਰਹਿੰਦੇ ਹਨ। ਠਰ੍ਹੰਮੇ ਨਾਲ ਗਿਣੋ, ਅਤੇ ਆਪਣਾ ਵਿਚਾਰ ਦੁਬਾਰਾ ਜਾਂਚੋ।" } },
];

export const heroOf = (level: number) => HEROES.find(h => h.level === level)!;
export const heroById = (id: string) => HEROES.find(h => h.id === id);
export const heroArt = (id: string, mood: "neutral" | "win" | "lose" | "action" = "neutral") => `art/heroes/${id}-${mood}.webp`;

/** The lessons where the hero appears: the level's first, and its key lesson (the middle one). */
export function heroLessons(level: number): string[] {
  const ls = LEVELS[level - 1].lessons;
  return [...new Set([ls[0]?.id, ls[Math.floor(ls.length / 2)]?.id].filter(Boolean) as string[])];
}

/** The top of a level's rating band: how strong its boss plays ("400–600" → 600; "1800+" → 2000). */
export function bossRating(level: number): number {
  const band = LEVELS[level - 1].band, nums = band.match(/\d+/g)!.map(Number);
  return band.includes("+") ? nums[0] + 200 : nums[nums.length - 1];
}

/** The hero as a bot: the play of the bot nearest that strength, under the hero's name and art. */
export function bossBot(level: number): Bot {
  const target = bossRating(level), h = heroOf(level);
  const like = BOTS.filter(b => !b.beyond).sort((a, b) => Math.abs(a.rating - target) - Math.abs(b.rating - target))[0];
  return { ...like, name: h.name, about: h.virtue, rating: target, help: false, art: `art/heroes/${h.id}` };
}

/** A level's boss can be fought once its lessons are done (its test is open), or on the developer's unlock switch. */
export const bossOpen = (level: number, testOpen: (n: number) => boolean) => unlockAll() || testOpen(level);
export const roundsWon = (level: number, s: Readonly<State> = store.get()) => s.boss?.[String(level)] ?? 0;
export const hasHero = (id: string, s: Readonly<State> = store.get()) => !!s.heroes?.includes(id);

/** A boss round won: rounds go in order; the third makes the hero yours. Returns true when the hero was just earned. */
export function winRound(level: number, round: 1 | 2 | 3): boolean {
  const s = store.get(), won = roundsWon(level, s);
  if (round !== won + 1) return false;               // a round already won, or one not yet open
  const boss = { ...(s.boss ?? {}), [String(level)]: round };
  const id = heroOf(level).id, earned = round === 3 && !hasHero(id, s);
  store.set({ boss, ...(earned ? { heroes: [...(s.heroes ?? []), id] } : {}) });
  return earned;
}

/** The animals' hero versions (#109): an animal hero is yours once you have beaten that bot in a normal game. */
export const animalHeroArt = (botId: string, mood: "neutral" | "win" | "lose" | "action" = "neutral") => `art/herobots/${botId}-${mood}.webp`;
export const animalHeroEarned = (botId: string, s: Readonly<State> = store.get()) => unlockAll() || (s.stats.botWins[botId] ?? 0) > 0;
