// The "Me" page's ranks and trophy room (DECISIONS #76). Pure: everything is worked out from saved progress,
// so a trophy can never be lost or need saving on its own. Tested in test/me.test.ts.
import { LEVELS } from "../content/levels";
import type { Text } from "../lesson/types";
import type { IconName } from "../icons";
import { learnt } from "../openings/srs";
import type { State } from "../store";

/** XP ranks, named after the pieces (no religious names, DECISIONS #2). */
export const RANKS: { at: number; name: Text }[] = [
  { at: 0, name: { en: "Pawn", pa: "ਪਿਆਦਾ" } },
  { at: 300, name: { en: "Knight", pa: "ਘੋੜਾ" } },
  { at: 800, name: { en: "Bishop", pa: "ਊਠ" } },
  { at: 1600, name: { en: "Rook", pa: "ਹਾਥੀ" } },
  { at: 3000, name: { en: "Queen", pa: "ਰਾਣੀ" } },
  { at: 5000, name: { en: "King", pa: "ਬਾਦਸ਼ਾਹ" } },
];
export function rankOf(xp: number) {
  const i = RANKS.reduce((k, r, j) => (xp >= r.at ? j : k), 0), next = RANKS[i + 1];
  return { i, name: RANKS[i].name, next: next?.at ?? null, from: RANKS[i].at };
}

/** The longest run of consecutive practice days. */
export function longestRun(days: string[]): number {
  let best = 0, run = 0, prev = "";
  for (const d of [...new Set(days)].sort()) {
    const y = new Date(`${d}T12:00:00`); y.setDate(y.getDate() - 1);
    run = prev === y.toLocaleDateString("en-CA") ? run + 1 : 1;
    best = Math.max(best, run); prev = d;
  }
  return best;
}

export interface Trophy { id: string; icon: IconName; name: Text; got: boolean; /** how far along: [now, needed] (DECISIONS #94) */ prog?: [number, number] }

export function trophies(s: Readonly<State>): Trophy[] {
  const done = Object.keys(s.lessons).length, all = LEVELS.flatMap(l => l.lessons).length;
  const three = Object.values(s.lessons).some(r => r.stars === 3);
  const fullLevel = LEVELS.some(l => l.lessons.length > 0 && l.lessons.every(x => s.lessons[x.id]?.stars === 3));
  const run = Math.max(longestRun(s.active), s.streak.days);
  const passed = (n: number) => !!s.tests[n]?.passed;
  const wins = (id: string) => (s.stats.botWins[id] ?? 0) > 0;
  const learntLines = Object.values(s.rep.cards).filter(learnt).length;
  const T = (id: string, icon: IconName, en: string, pa: string, got: boolean, prog?: [number, number]): Trophy =>
    ({ id, icon, name: { en, pa }, got, prog: prog && [Math.min(prog[0], prog[1]), prog[1]] });
  return [
    T("lesson1", "grad", "First lesson", "ਪਹਿਲਾ ਪਾਠ", done >= 1, [done, 1]),
    T("lesson10", "grad", "10 lessons", "੧੦ ਪਾਠ", done >= 10, [done, 10]),
    T("lesson50", "grad", "50 lessons", "੫੦ ਪਾਠ", done >= 50, [done, 50]),
    T("lessonAll", "crown", "Every lesson", "ਸਾਰੇ ਪਾਠ", done >= all, [done, all]),
    T("stars3", "star", "Three stars", "੩ ਤਾਰੇ", three),
    T("starsLevel", "medal", "A level of 3 stars", "ਪੂਰੇ ਪੱਧਰ 'ਤੇ ੩ ਤਾਰੇ", fullLevel),
    T("streak3", "flame", "3-day streak", "੩ ਦਿਨ ਲਗਾਤਾਰ", run >= 3, [run, 3]),
    T("streak7", "flame", "7-day streak", "੭ ਦਿਨ ਲਗਾਤਾਰ", run >= 7, [run, 7]),
    T("streak30", "flame", "30-day streak", "੩੦ ਦਿਨ ਲਗਾਤਾਰ", run >= 30, [run, 30]),
    T("test1", "trophy", "First level test", "ਪਹਿਲੀ ਪੱਧਰ ਦੀ ਪਰਖ", Object.values(s.tests).some(x => x.passed)),
    T("test5", "trophy", "Level 5 passed", "ਪੱਧਰ ੫ ਪਾਸ", passed(5)),
    T("test10", "crown", "Level 10 passed", "ਪੱਧਰ ੧੦ ਪਾਸ", passed(10)),
    T("beatChidi", "swords", "Beat Titli", "ਤਿਤਲੀ ਉੱਤੇ ਜਿੱਤ", wins("nanhi-chidi")),
    T("beatKesri", "swords", "Beat Chakor", "ਚਕੋਰ ਉੱਤੇ ਜਿੱਤ", wins("kesri")),
    T("beatGhorsavaar", "swords", "Beat Cheeta", "ਚੀਤੇ ਉੱਤੇ ਜਿੱਤ", wins("ghorsavaar")),
    T("beatTeer", "swords", "Beat Baaz", "ਬਾਜ਼ ਉੱਤੇ ਜਿੱਤ", wins("teer")),
    T("beatSher", "swords", "Beat Bhaalu", "ਭਾਲੂ ਉੱਤੇ ਜਿੱਤ", wins("sher")),
    T("beatBaaz", "crown", "Beat Sher", "ਸ਼ੇਰ ਉੱਤੇ ਜਿੱਤ", wins("baaz")),
    T("daily1", "target", "First daily puzzle", "ਪਹਿਲੀ ਰੋਜ਼ਾਨਾ ਬੁਝਾਰਤ", s.stats.dailies >= 1, [s.stats.dailies, 1]),
    T("daily30", "target", "30 daily puzzles", "੩੦ ਰੋਜ਼ਾਨਾ ਬੁਝਾਰਤਾਂ", s.stats.dailies >= 30, [s.stats.dailies, 30]),
    T("rush10", "timer", "Rush 10", "ਦੌੜ ਵਿੱਚ ੧੦", s.rushBest >= 10, [s.rushBest, 10]),
    T("rush20", "timer", "Rush 20", "ਦੌੜ ਵਿੱਚ ੨੦", s.rushBest >= 20, [s.rushBest, 20]),
    T("open5", "book", "5 opening lines learnt", "੫ ਸ਼ੁਰੂਆਤੀ ਲਾਈਨਾਂ ਸਿੱਖੀਆਂ", learntLines >= 5, [learntLines, 5]),
    T("review1", "search", "First game review", "ਪਹਿਲੀ ਖੇਡ ਦੀ ਪੜਚੋਲ", s.stats.reviews >= 1),
  ];
}

/** The trophy closest to being won, among those with a measurable distance (the Me page, DECISIONS #94). */
export function nextTrophy(list: Trophy[]): Trophy | null {
  const open = list.filter(x => !x.got && x.prog);
  return open.length ? open.reduce((a, b) => (b.prog![0] / b.prog![1] > a.prog![0] / a.prog![1] ? b : a)) : null;
}
