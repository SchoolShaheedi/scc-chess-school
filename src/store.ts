// Everything the app remembers, kept on this device only. Phases 1-3 have no accounts on
// purpose (LEARNING-PLAN.md §7): no child's data leaves the phone. We store no name and no
// exact age - only which of the three age bands was picked.
import { NATIVE } from "./native";
import { fromLevel as ratingFromLevel, update as updateRating } from "./me/rating";
import { addDays, review } from "./openings/srs";

export type Look = "young" | "junior" | "adult";

/** `review`: the lesson was finished with "Skip for now" on at least one exercise, so the list offers "practise again". */
export interface LessonResult { stars: 1 | 2 | 3; completedAt: string; review?: boolean }

export interface State {
  onboarded: boolean;
  lang: "en" | "pa";
  look: Look;
  pieceSet: "A" | "C" | "B" | "B2" | "V" | "cburnett" | "merida" | "chessnut" | "spatial";   // DECISIONS #40, #84: A is the default
  /** The board's colours (DECISIONS #84); unset = walnut. */
  boardTheme?: "walnut" | "forest" | "lake" | "slate" | "stone" | "contrast" | "gold" | "river" | "night";
  /** Rewards earned for good (DECISIONS #94, src/rewards.ts), the avatar frame chosen, and streak freezes in hand (max 2). */
  unlocked?: string[];
  frame?: string;
  freezes?: number;
  /** Superheroes (DECISIONS #109): heroes earned by beating a level's boss, boss rounds won per level (0-3), and the
   *  picture shown for this learner on their own screens (a hero id, or "bot:<id>" for an animal hero). */
  heroes?: string[];
  boss?: Record<string, number>;
  heroAvatar?: string;
  /** The colours (DECISIONS #111): dark (SWC black and gold) by default, or the light look. Per device. */
  themeMode?: "dark" | "light";
  coach: "singh" | "kaur";                  // the Junior look's coach: "singh" = Hans the swan, "kaur" = Koel the cuckoo (#96); Young has Ghuggi the dove
  sound: boolean;                           // sound effects on/off (DECISIONS #43)
  /** The coach voice (DECISIONS #80); unset = on for the Young look only (see voice.ts). */
  voice?: boolean;
  /** Games (DECISIONS #84): always promote to a queen; premoves (unset = on except for the Young look). */
  autoQueen?: boolean;
  premove?: boolean;
  /** Game settings (DECISIONS #115): confirm each move (off), legal-move dots in games (on), the board's
   *  coordinates everywhere (inside), and focus mode in games (off). Unset = the default. */
  confirmMoves?: boolean;
  legalDots?: boolean;
  coordsMode?: "off" | "in" | "out";
  focusMode?: boolean;
  /** Solo Chess (DECISIONS #115): stars on each puzzle of the Young path, and Puzzle Survival's best score. */
  soloPath?: number[];
  survivalBest?: number;
  xp: number;
  streak: { days: number; last: string };   // last = YYYY-MM-DD
  lessons: Record<string, LessonResult>;    // keyed by lesson id
  tests: Record<string, { best: number; passed: boolean }>;   // level tests, keyed by level number
  /** The level the placement test put the learner at; levels up to it are open (DECISIONS #71). 0 = never placed. */
  placed: number;
  /** Today's puzzle (DECISIONS #72): the date it was solved for. */
  daily: { date: string; solved: boolean };
  /** Best Puzzle Race score. */
  rushBest: number;
  /** Openings trainer (DECISIONS #74): the chosen option per slot, and one review card per line ("optionId:index"). */
  rep: { white?: string; e4?: string; d4?: string; cards: Record<string, { box: number; due: string }>; course?: Record<string, string[]> };
  /** Days with any practice (YYYY-MM-DD, newest last, ~120 kept) for the streak calendar; today's count for the daily goal (DECISIONS #76). */
  active: string[];
  goal: { date: string; n: number };
  /** Totals for the trophy room: bot wins by bot id, games played, daily puzzles solved, games reviewed. */
  stats: { botWins: Record<string, number>; games: number; dailies: number; reviews: number };
  /** A short buzz on a wrong move (DECISIONS #68), now switchable. */
  buzz: boolean;
  /** The learner's rating estimate (src/me/rating.ts) and the mistake bank: missed puzzles by Lichess id, on review boxes. */
  rating: { r: number; n: number };
  missed: Record<string, { box: number; due: string; r?: number }>;
  /** Phase 2 (DECISIONS #85): a separate puzzle rating (the one above is now the playing rating, from games); one
   *  point a day of each for the graphs; per Lichess theme [tried, solved]; per "bot:<id>" and "tc:<clock>" [won, lost, drawn]. */
  prating?: { r: number; n: number };
  hist?: { play: [string, number][]; puz: [string, number][] };
  themeStats?: Record<string, [number, number]>;
  results?: Record<string, [number, number, number]>;
  /** Puzzles finished per day, the last two weeks (DECISIONS #89: the class leaderboard's weekly puzzles). */
  puzzlesByDay?: Record<string, number>;
}
export const GOAL = 3;

const KEY = "scc-school-v1";
const fresh = (): State => ({
  onboarded: false, lang: "pa", look: "junior", pieceSet: "A", coach: "singh", sound: true, xp: 0,
  streak: { days: 0, last: "" }, lessons: {}, tests: {}, placed: 0, daily: { date: "", solved: false }, rushBest: 0, rep: { cards: {} },
  active: [], goal: { date: "", n: 0 }, stats: { botWins: {}, games: 0, dailies: 0, reviews: 0 }, buzz: true,
  rating: { r: 400, n: 0 }, missed: {},
});

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s: State = { ...fresh(), ...JSON.parse(raw) };
      // DECISIONS #94: the illustrated Classic set became a reward; anyone already using it keeps it
      if (s.pieceSet === "A" && !s.unlocked?.includes("pieces:A")) s.unlocked = [...(s.unlocked ?? []), "pieces:A"];
      return s;
    }
  } catch { /* private mode or blocked storage: start fresh, still works */ }
  return fresh();
}

// Preview hook: ?look=young&lang=pa shows the app that way WITHOUT touching saved progress.
// Used by the design-trial pages and for screenshots; a normal visit has no query string. ONLY on the developer's
// own computer (full check 2026-10-08): on the live site it would skip sign-in and open every lesson.
const preview = (() => {
  try {
    if (!["localhost", "127.0.0.1"].includes(location.hostname)) return null;
    const q = new URLSearchParams(location.search);
    const look = q.get("look"), lang = q.get("lang");
    if (!look && !lang) return null;
    return {
      ...(look === "young" || look === "junior" || look === "adult" ? { look } : {}),
      ...(lang === "en" || lang === "pa" ? { lang } : {}),
    } as Partial<State>;
  } catch { return null; }
})();

let state: State = preview ? { ...load(), ...preview, onboarded: true } : load();
const listeners = new Set<() => void>();

const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time

export const isPreview = () => preview !== null;
/** On the developer's own computer only (localhost), a Settings switch opens every lesson, test and trainer for
 *  testing (2026-10-06). It can never be on for the live site. Previews are always unlocked. */
// the Android app is served from https://localhost too (Capacitor), but it is never the developer's computer (#121)
export const devHost = () => !NATIVE && typeof location !== "undefined" && ["localhost", "127.0.0.1"].includes(location.hostname);
export const UNLOCK_KEY = "scc-unlock-all";
export const unlockAll = () => isPreview() || (devHost() && (() => { try { return localStorage.getItem(UNLOCK_KEY) === "1"; } catch { return false; } })());
export { today };

/** Anything practised today: the streak, the calendar day and the daily goal move together (DECISIONS #76). */
function practised(): Pick<State, "streak" | "active" | "goal" | "freezes"> {
  const d = today();
  return {
    ...nextStreak(),
    active: state.active.at(-1) === d ? state.active : [...state.active, d].slice(-120),
    goal: { date: d, n: state.goal.date === d ? state.goal.n + 1 : 1 },
  };
}

/** Today counts as a day of practice. The streak goes up if the last practice was yesterday OR the day before:
 *  one rest day never breaks it, so a missed day isn't a punishment for a child (full check 2026-10-05).
 *  Each streak freeze (DECISIONS #94) covers one more missed day; finishing the daily goal earns one (max 2). */
export const FREEZE_MAX = 2;
function nextStreak(): Pick<State, "streak" | "freezes"> {
  const d = today(), goalNow = state.goal.date === d ? state.goal.n : 0;
  let { days, last } = state.streak, freezes = state.freezes ?? 0;
  if (last !== d) {
    const gap = last ? Math.round((Date.parse(d) - Date.parse(last)) / 86400000) : Infinity;   // 1 = yesterday
    const spare = gap - 2;                                                                       // missed days beyond the free rest day
    if (gap <= 2) days += 1;
    else if (spare <= freezes) { freezes -= spare; days += 1; }
    else days = 1;
    last = d;
  }
  // this practice completes today's goal: a freeze for the bank
  if (goalNow + 1 === GOAL) freezes = Math.min(FREEZE_MAX, freezes + 1);
  return { streak: { days, last }, freezes };
}

const hist = (): NonNullable<State["hist"]> => state.hist ?? { play: [], puz: [] };
/** Today's point on a rating graph: one per day (the day's last value), a year kept. */
const point = (list: [string, number][], r: number): [string, number][] => {
  const d = today();
  return [...(list.at(-1)?.[0] === d ? list.slice(0, -1) : list), [d, r] as [string, number]].slice(-365);
};

export const store = {
  get: (): Readonly<State> => state,
  set(patch: Partial<State>) {
    state = { ...state, ...patch };
    if (!preview) try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* keep going in memory */ }
    listeners.forEach(f => f());
  },
  subscribe(f: () => void) { listeners.add(f); return () => listeners.delete(f); },

  /** Records a finished lesson. Stars never go down on a replay; XP is given every time. */
  completeLesson(id: string, stars: 1 | 2 | 3, skipped = false) {
    const prev = state.lessons[id];
    const best = (prev && prev.stars > stars ? prev.stars : stars) as 1 | 2 | 3;
    const gained = 10 + stars * 5;
    // a skip marks the lesson for review (the next lesson opens all the same: no hard lock); a replay with a skip
    // never takes a mark off, and a clean replay clears it
    const review = skipped ? (prev ? !!prev.review : true) : false;
    store.set({
      ...practised(),
      xp: state.xp + gained,
      lessons: { ...state.lessons, [id]: { stars: best, completedAt: new Date().toISOString(), ...(review ? { review } : {}) } },
    });
    return gained;
  },
  /** The daily puzzle solved: +10 XP, and it counts as a day of practice for the streak (DECISIONS #72). */
  solveDaily() {
    if (state.daily.date === today() && state.daily.solved) return 0;
    store.set({ ...practised(), xp: state.xp + 10, daily: { date: today(), solved: true }, stats: { ...state.stats, dailies: state.stats.dailies + 1 } });
    return 10;
  },
  /** A finished Puzzle Race: XP per puzzle solved, and the best score kept. */
  recordRush(score: number) {
    store.set({ ...(score > 0 ? practised() : {}), xp: state.xp + score * 2, rushBest: Math.max(state.rushBest, score) });
  },
  /** A finished bot game: counts for the goal and the trophies; a win is remembered per bot. */
  recordGame(botId: string, won: boolean, botRating?: number, score?: number, tc = "none") {
    const s = state.stats, sc = score ?? (won ? 1 : 0);
    const rating = botRating !== undefined ? updateRating(state.rating, botRating, sc) : state.rating;
    // results per bot and per clock, for the stats (DECISIONS #85): [won, lost, drawn]
    const results = { ...(state.results ?? {}) };
    for (const k of [`bot:${botId}`, `tc:${tc}`]) {
      const e: [number, number, number] = [...(results[k] ?? [0, 0, 0])] as [number, number, number];
      e[sc === 1 ? 0 : sc === 0 ? 1 : 2]++; results[k] = e;
    }
    store.set({ ...practised(), stats: { ...s, games: s.games + 1, botWins: won ? { ...s.botWins, [botId]: (s.botWins[botId] ?? 0) + 1 } : s.botWins },
      rating, results, hist: { ...hist(), play: point(hist().play, rating.r) } });
  },
  /** Any real puzzle finished (lesson, test, daily, Rush, the bank): moves the rating, and a miss goes into the
   *  mistake bank while a clean solve moves a banked puzzle up a box (chess review 2026-10-04). */
  recordPuzzle(id: string | undefined, puzzleRating: number | undefined, clean: boolean, themes?: string[]) {
    const patch: Partial<State> = {};
    // puzzles move the PUZZLE rating (DECISIONS #85); games move the playing rating
    if (puzzleRating) {
      const pr = updateRating(state.prating ?? { ...state.rating, n: 0 }, puzzleRating, clean ? 1 : 0);
      patch.prating = pr; patch.hist = { ...hist(), puz: point(hist().puz, pr.r) };
    }
    {
      const d = today(), keep = addDays(d, -14), pbd: Record<string, number> = {};
      for (const [k, n] of Object.entries(state.puzzlesByDay ?? {})) if (k >= keep) pbd[k] = n;
      pbd[d] = (pbd[d] ?? 0) + 1; patch.puzzlesByDay = pbd;
    }
    if (themes?.length) {
      const ts = { ...(state.themeStats ?? {}) };
      for (const th of themes) { const [n, ok] = ts[th] ?? [0, 0]; ts[th] = [n + 1, ok + (clean ? 1 : 0)]; }
      patch.themeStats = ts;
    }
    if (id) {
      const missed = { ...state.missed }, card = missed[id];
      if (!clean) missed[id] = { box: 0, due: addDays(today(), 1), ...(puzzleRating ? { r: puzzleRating } : {}) };
      else if (card) { const next = review(card, true, today()); if (next.box >= 3) delete missed[id]; else missed[id] = next; }
      // keep the bank small: the 200 soonest due
      const keys = Object.keys(missed);
      if (keys.length > 200) for (const k of keys.sort((a, b) => missed[b].due.localeCompare(missed[a].due)).slice(0, keys.length - 200)) delete missed[k];
      patch.missed = missed;
    }
    store.set(patch);
  },
  /** After a placement, start the rating from the level found instead of 400 (only if nothing has rated it yet). */
  seedRating(level: number) {
    if (state.rating.n === 0) store.set({ rating: ratingFromLevel(level) });
    if (!state.prating?.n) store.set({ prating: ratingFromLevel(level) });
  },
  /** An openings session or a game review: practice that counts for the goal. */
  /** A Solo Chess puzzle solved: 5 XP; on the Young path, the stars are kept (the best of every try). */
  recordSolo(pathIndex?: number, stars = 0) {
    const path = [...(state.soloPath ?? [])];
    if (pathIndex !== undefined) path[pathIndex] = Math.max(path[pathIndex] ?? 0, stars);
    store.set({ ...practised(), xp: state.xp + 5, ...(pathIndex !== undefined ? { soloPath: Array.from(path, x => x ?? 0) } : {}) });
  },
  /** A Puzzle Survival run ended: 2 XP a puzzle, as in the Race. */
  recordSurvival(score: number) {
    store.set({ ...(score > 0 ? practised() : {}), xp: state.xp + score * 2, survivalBest: Math.max(state.survivalBest ?? 0, score) });
  },
  recordPractice(kind?: "review") {
    store.set({ ...practised(), ...(kind === "review" ? { stats: { ...state.stats, reviews: state.stats.reviews + 1 } } : {}) });
  },
  /** Progress merged in from the signed-in account (sync.ts). */
  replaceProgress(p: Pick<State, "xp" | "streak" | "lessons" | "tests" | "placed" | "daily" | "rushBest" | "rep" | "active" | "goal" | "stats" | "rating" | "missed" | "prating" | "hist" | "themeStats" | "results" | "puzzlesByDay"
    | "unlocked" | "freezes" | "heroes" | "boss" | "heroAvatar" | "soloPath" | "survivalBest">) {
    // rewards, freezes and heroes are per child too: without them, switching child kept the last child's (fixed 2026-10-16)
    store.set({ xp: p.xp, streak: p.streak, lessons: p.lessons, tests: p.tests, placed: p.placed, daily: p.daily, rushBest: p.rushBest, rep: p.rep, active: p.active, goal: p.goal, stats: p.stats, rating: p.rating, missed: p.missed,
      prating: p.prating, hist: p.hist, themeStats: p.themeStats, results: p.results, puzzlesByDay: p.puzzlesByDay,
      unlocked: p.unlocked, freezes: p.freezes, heroes: p.heroes, boss: p.boss, heroAvatar: p.heroAvatar,
      soloPath: p.soloPath, survivalBest: p.survivalBest });
  },
  /** A level test result: the best score is kept, and a pass is never lost. */
  recordTest(level: number, score: number, passed: boolean) {
    const prev = state.tests[level];
    store.set({ xp: state.xp + score * 2, tests: { ...state.tests, [level]: { best: Math.max(prev?.best ?? 0, score), passed: passed || !!prev?.passed } } });
  },
  reset() { const { lang, look } = state; state = { ...fresh(), lang, look, onboarded: true }; store.set({}); },
};
