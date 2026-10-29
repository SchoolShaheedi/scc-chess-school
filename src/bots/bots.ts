// The six bots (DECISIONS #69), and two beyond the course (2026-10-29). Stockfish finds each position's top moves; a bot then CHOOSES among them
// the way a player of its strength would: a weaker bot looks less deep, often picks a worse candidate,
// and sometimes plays a careless move. The ratings are targets, checked only RELATIVELY by the ladder
// test (each bot beats the one below it); they are not measured Elo.
import type { Text } from "../lesson/types";
import { Chess } from "chess.js";
import book from "../content/book.json";
import { asNumber, type Candidate, type Uci } from "../engine/uci";

export type BotId = "nanhi-chidi" | "kesri" | "ghorsavaar" | "teer" | "sher" | "baaz" | "bhediya" | "bagh";

export interface Bot {
  id: BotId; name: Text; rating: number; about: Text;
  /** Takebacks and a hint arrow are allowed against this bot (the first three only). */
  help: boolean;
  /** How it plays: search depth, how many candidates it weighs, how loosely it picks (centipawns), careless-move chance. */
  depth: number; spread: number; temp: number; careless: number;
  /** A playing style (chess review 2026-10-04): a bonus in centipawns for the moves this bot likes. */
  style?: "attack" | "knight";
  /** Its picture, without the "-<mood>.webp" ending; unset = art/bots/<id>. A level's boss uses its hero's (DECISIONS #109). */
  art?: string;
  /** Beyond the course (2026-10-29): stronger than any level boss. Never a boss's play, and no collectible hero of its own. */
  beyond?: true;
}

// DECISIONS #96: the bots are cartoon animals, renamed 2026-10-15. The ids are the OLD names and stay, so saved wins,
// trophies and the Level 1 test keep working: nanhi-chidi = Titli, kesri = Chakor, ghorsavaar = Cheeta, teer = Baaz,
// sher = Bhaalu, baaz = Sher. Art files are keyed by id (public/art/bots/<id>-<mood>.webp).
const ALL_BOTS: Bot[] = [
  { id: "nanhi-chidi", name: { en: "Titli", pa: "ਤਿਤਲੀ" }, rating: 250, help: true,
    about: { en: "Just learning. Often leaves pieces where you can take them.", pa: "ਹੁਣੇ ਸਿੱਖ ਰਹੀ ਹੈ। ਅਕਸਰ ਮੋਹਰੇ ਅਜਿਹੀ ਥਾਂ ਛੱਡਦੀ ਹੈ ਜਿੱਥੋਂ ਤੁਸੀਂ ਮਾਰ ਸਕੋ।" },
    depth: 1, spread: 8, temp: 450, careless: 0.45 },
  { id: "kesri", name: { en: "Chakor", pa: "ਚਕੋਰ" }, rating: 600, help: true,
    about: { en: "Knows the moves and loves to attack, but forgets to defend.", pa: "ਚਾਲਾਂ ਜਾਣਦਾ ਹੈ ਅਤੇ ਹਮਲਾ ਪਸੰਦ ਕਰਦਾ ਹੈ, ਪਰ ਬਚਾਅ ਭੁੱਲ ਜਾਂਦਾ ਹੈ।" },
    depth: 3, spread: 6, temp: 260, careless: 0.22, style: "attack" },
  { id: "ghorsavaar", name: { en: "Cheeta", pa: "ਚੀਤਾ" }, rating: 1000, help: true,
    about: { en: "Quick with the knights. Sees one-move tricks.", pa: "ਘੋੜਿਆਂ ਨਾਲ ਫੁਰਤੀਲਾ। ਇੱਕ ਚਾਲ ਦੇ ਦਾਅ ਵੇਖ ਲੈਂਦਾ ਹੈ।" },
    depth: 5, spread: 5, temp: 150, careless: 0.1, style: "knight" },
  { id: "teer", name: { en: "Baaz", pa: "ਬਾਜ਼" }, rating: 1300, help: false,
    about: { en: "Sharp and fast. Punishes loose pieces.", pa: "ਤਿੱਖਾ ਅਤੇ ਤੇਜ਼। ਖੁੱਲ੍ਹੇ ਛੱਡੇ ਮੋਹਰਿਆਂ ਦੀ ਸਜ਼ਾ ਦਿੰਦਾ ਹੈ।" },
    depth: 7, spread: 4, temp: 80, careless: 0.05 },
  { id: "sher", name: { en: "Bhaalu", pa: "ਭਾਲੂ" }, rating: 1700, help: false,
    about: { en: "Strong in the middlegame. Plans ahead.", pa: "ਵਿਚਕਾਰਲੀ ਖੇਡ ਵਿੱਚ ਤਕੜਾ। ਅੱਗੇ ਦੀ ਯੋਜਨਾ ਬਣਾਉਂਦਾ ਹੈ।" },
    depth: 9, spread: 3, temp: 35, careless: 0.015 },
  { id: "baaz", name: { en: "Sher", pa: "ਸ਼ੇਰ" }, rating: 2100, help: false,
    about: { en: "The final challenge. Rarely makes a mistake.", pa: "ਆਖ਼ਰੀ ਚੁਣੌਤੀ। ਬਹੁਤ ਘੱਟ ਗ਼ਲਤੀ ਕਰਦਾ ਹੈ।" },
    depth: 12, spread: 2, temp: 12, careless: 0 },
  // Beyond the course: for players who have outgrown Sher. Same knobs, no new ones. Their pictures are COPIES of Bhaalu's and
  // Sher's (no new art was made); the ratings are targets like all the others, and the top one is the engine at close to full
  // strength, so "about 2300" is a label, not a measurement.
  { id: "bhediya", name: { en: "Bhediya", pa: "ਭੇੜੀਆ" }, rating: 1900, help: false, beyond: true,
    about: { en: "A patient hunter. Pounces on the smallest slip.", pa: "ਸਬਰ ਵਾਲਾ ਸ਼ਿਕਾਰੀ। ਛੋਟੀ ਤੋਂ ਛੋਟੀ ਗ਼ਲਤੀ ਉੱਤੇ ਝਪਟ ਪੈਂਦਾ ਹੈ।" },
    depth: 10, spread: 2, temp: 22, careless: 0.004 },
  { id: "bagh", name: { en: "Bagh", pa: "ਬਾਘ" }, rating: 2300, help: false, beyond: true,
    about: { en: "Full strength. It calculates deep and never plays a careless move.", pa: "ਪੂਰੀ ਤਾਕਤ। ਡੂੰਘੀ ਗਿਣਤੀ ਕਰਦਾ ਹੈ ਅਤੇ ਕਦੇ ਲਾਪਰਵਾਹ ਚਾਲ ਨਹੀਂ ਚੱਲਦਾ।" },
    depth: 14, spread: 2, temp: 4, careless: 0 },
];
/** Weakest first (the pickers and the ladder test read them in this order). */
export const BOTS: Bot[] = [...ALL_BOTS].sort((a, b) => a.rating - b.rating);
export const botById = (id: string) => BOTS.find(b => b.id === id);

/** Pick a move: a careless random legal move, or a weighted draw from the engine's candidates
 *  (weight falls off with how much worse a move is than the best, scaled by `temp`). Pure, so it is testable. */
export function chooseMove(cands: Candidate[], legal: string[], bot: Pick<Bot, "temp" | "careless">, rand: () => number = Math.random,
  bonus: (uci: string) => number = () => 0): string {
  if (!cands.length || rand() < bot.careless) return legal[Math.floor(rand() * legal.length)];
  const best = Math.max(...cands.map(c => asNumber(c.score) + bonus(c.move)));
  // mates are scored ~100000, so clamp the gap: a missed mate costs the same as a lost queen, not "infinitely" more
  const w = cands.map(c => Math.exp(-Math.min(best - asNumber(c.score) - bonus(c.move), 900) / bot.temp));
  let r = rand() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < cands.length; i++) { r -= w[i]; if (r <= 0) return cands[i].move; }
  return cands[0].move;
}

const BOOK = book as Record<string, Record<string, number>>;
export const BOOK_PLIES = 8;
/** Is `san` a book move after this history (Game Review's "Book" label, DECISIONS #104)? */
export const inBook = (history: string[], san: string) => history.length < BOOK_PLIES && !!BOOK[history.join(" ")]?.[san];

/** A move from the opening book for this game so far (SAN history), weighted by how much theory goes through it.
 *  Sidelines under 3% of the position's lines are ignored, so no bot opens 1.a3 or 1.g4. Null once out of book. */
export function bookMove(history: string[], rand: () => number = Math.random): string | null {
  if (history.length >= BOOK_PLIES) return null;
  const next = BOOK[history.join(" ")]; if (!next) return null;
  const total = Object.values(next).reduce((a, n) => a + n, 0);
  const ok = Object.entries(next).filter(([, n]) => n / total >= 0.03);
  let r = rand() * ok.reduce((a, [, n]) => a + n, 0);
  for (const [san, n] of ok) { r -= n; if (r <= 0) return san; }
  return ok[0]?.[0] ?? null;
}

/** Style bonuses: Chakor (kesri) likes checks and captures; Cheeta (ghorsavaar) likes knight moves. */
function styleBonus(fen: string, style: Bot["style"]): (uci: string) => number {
  if (!style) return () => 0;
  return uci => {
    try {
      const m = new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      if (style === "attack") return (m.captured ? 60 : 0) + (m.san.includes("+") ? 60 : 0);
      return m.piece === "n" ? 50 : 0;
    } catch { return 0; }
  };
}

/** The bot's move in this position (UCI, e.g. "e2e4"). `history` (SAN) lets it play from the opening book. */
export async function botMove(engine: Uci, fen: string, legal: string[], bot: Bot, rand: () => number = Math.random, history: string[] = []): Promise<string> {
  // a careless bot can still blunder in the opening; otherwise it plays book moves like a person would
  if (rand() >= bot.careless) {
    const san = bookMove(history, rand);
    if (san) { try { const m = new Chess(fen).move(san); return m.from + m.to + (m.promotion ?? ""); } catch { /* history and fen disagree: use the engine */ } }
  }
  const cands = await engine.candidates(fen, { n: bot.spread, depth: bot.depth });
  return chooseMove(cands, legal, bot, rand, styleBonus(fen, bot.style));
}

/** "Your next opponent" (DECISIONS #94): the bot you have not beaten yet that is nearest a little above your
 *  rating, so a strong newcomer is not sent to the beginner bot; once all are beaten, the nearest overall. */
export function nextOpponent(rating: number, botWins: Record<string, number>): Bot {
  const near = (list: Bot[]) => [...list].sort((a, b) => Math.abs(a.rating - (rating + 100)) - Math.abs(b.rating - (rating + 100)))[0];
  const unbeaten = BOTS.filter(b => !(botWins[b.id] > 0));
  return near(unbeaten.length ? unbeaten : BOTS);
}

/** The quick game offered every third lesson (DECISIONS #94): a 3-capture race against one of the three gentle
 *  bots (take-backs allowed), the one that is your next opponent among them. */
export const MINI_RACE = 3;
export const miniBot = (rating: number, botWins: Record<string, number>): Bot => {
  const gentle = BOTS.filter(b => b.help), pick = nextOpponent(rating, botWins);
  return gentle.includes(pick) ? pick : gentle[gentle.length - 1];
};
