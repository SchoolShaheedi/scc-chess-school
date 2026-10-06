// The six bots (DECISIONS #69). Stockfish finds each position's top moves; a bot then CHOOSES among them
// the way a player of its strength would: a weaker bot looks less deep, often picks a worse candidate,
// and sometimes plays a careless move. The ratings are targets, checked only RELATIVELY by the ladder
// test (each bot beats the one below it); they are not measured Elo.
import type { Text } from "../lesson/types";
import { Chess } from "chess.js";
import book from "../content/book.json";
import { asNumber, type Candidate, type Uci } from "../engine/uci";

export type BotId = "nanhi-chidi" | "kesri" | "ghorsavaar" | "teer" | "sher" | "baaz";

export interface Bot {
  id: BotId; name: Text; rating: number; about: Text;
  /** Takebacks and a hint arrow are allowed against this bot (the first three only). */
  help: boolean;
  /** How it plays: search depth, how many candidates it weighs, how loosely it picks (centipawns), careless-move chance. */
  depth: number; spread: number; temp: number; careless: number;
  /** A playing style (chess review 2026-10-04): a bonus in centipawns for the moves this bot likes. */
  style?: "attack" | "knight";
}

export const BOTS: Bot[] = [
  { id: "nanhi-chidi", name: { en: "Nanhi Chidi", pa: "ਨੰਨ੍ਹੀ ਚਿੜੀ" }, rating: 250, help: true,
    about: { en: "Just learning. Often leaves pieces where you can take them.", pa: "ਹੁਣੇ ਸਿੱਖ ਰਹੀ ਹੈ। ਅਕਸਰ ਮੋਹਰੇ ਅਜਿਹੀ ਥਾਂ ਛੱਡਦੀ ਹੈ ਜਿੱਥੋਂ ਤੁਸੀਂ ਮਾਰ ਸਕੋ।" },
    depth: 1, spread: 8, temp: 450, careless: 0.45 },
  { id: "kesri", name: { en: "Kesri", pa: "ਕੇਸਰੀ" }, rating: 600, help: true,
    about: { en: "Knows the moves and loves to attack, but forgets to defend.", pa: "ਚਾਲਾਂ ਜਾਣਦੀ ਹੈ ਅਤੇ ਹਮਲਾ ਪਸੰਦ ਕਰਦੀ ਹੈ, ਪਰ ਬਚਾਅ ਭੁੱਲ ਜਾਂਦੀ ਹੈ।" },
    depth: 3, spread: 6, temp: 260, careless: 0.22, style: "attack" },
  { id: "ghorsavaar", name: { en: "Ghorsavaar", pa: "ਘੋੜਸਵਾਰ" }, rating: 1000, help: true,
    about: { en: "Quick with the knights. Sees one-move tricks.", pa: "ਘੋੜਿਆਂ ਨਾਲ ਫੁਰਤੀਲਾ। ਇੱਕ ਚਾਲ ਦੇ ਦਾਅ ਵੇਖ ਲੈਂਦਾ ਹੈ।" },
    depth: 5, spread: 5, temp: 150, careless: 0.1, style: "knight" },
  { id: "teer", name: { en: "Teer", pa: "ਤੀਰ" }, rating: 1300, help: false,
    about: { en: "Sharp and fast. Punishes loose pieces.", pa: "ਤਿੱਖਾ ਅਤੇ ਤੇਜ਼। ਖੁੱਲ੍ਹੇ ਛੱਡੇ ਮੋਹਰਿਆਂ ਦੀ ਸਜ਼ਾ ਦਿੰਦਾ ਹੈ।" },
    depth: 7, spread: 4, temp: 80, careless: 0.05 },
  { id: "sher", name: { en: "Sher", pa: "ਸ਼ੇਰ" }, rating: 1700, help: false,
    about: { en: "Strong in the middlegame. Plans ahead.", pa: "ਵਿਚਕਾਰਲੀ ਖੇਡ ਵਿੱਚ ਤਕੜਾ। ਅੱਗੇ ਦੀ ਯੋਜਨਾ ਬਣਾਉਂਦਾ ਹੈ।" },
    depth: 9, spread: 3, temp: 35, careless: 0.015 },
  { id: "baaz", name: { en: "Baaz", pa: "ਬਾਜ਼" }, rating: 2100, help: false,
    about: { en: "The final challenge. Rarely makes a mistake.", pa: "ਆਖ਼ਰੀ ਚੁਣੌਤੀ। ਬਹੁਤ ਘੱਟ ਗ਼ਲਤੀ ਕਰਦਾ ਹੈ।" },
    depth: 12, spread: 2, temp: 12, careless: 0 },
];
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

/** Style bonuses: Kesri likes checks and captures; Ghorsavaar likes knight moves. */
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
