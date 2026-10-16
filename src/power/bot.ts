// How a bot plays Magical Chess (DECISIONS #98, #101). It plays its normal chess (botMove: Stockfish, its strength
// and style), and Stockfish also judges the gems: a changed position is ordinary chess, so "land on this gem and
// change?" is one more position to score. A weaker bot looks less deep and sometimes misses its chance.
import { Chess, type Square } from "chess.js";
import { type Bot, botMove } from "../bots/bots";
import { asNumber, type Uci } from "../engine/uci";
import { changeFen, gemFor, type PowerState } from "./rules";

export interface BotAction { uci: string; change: boolean }

/** A gem is worth a short detour: a move onto one is chosen if, at its best, it costs no more than this. */
const DETOUR = 40;
/** Change only for a clear gain over staying as it is (centipawns). */
const GAIN = 20;

export async function botPowerAction(engine: Uci, st: PowerState, bot: Bot, rand: () => number, history: string[]): Promise<BotAction> {
  const g = new Chess(st.fen), verbose = g.moves({ verbose: true });
  const legal = verbose.map(m => m.from + m.to + (m.promotion ?? ""));
  const depth = Math.max(2, Math.min(bot.depth, 10));
  /** For a move that lands on a gem: the score (for the bot) of changing, and of staying as it is. */
  async function both(uci: string) {
    const h = new Chess(st.fen), m = h.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    const gem = gemFor(st, m)!;
    const stay = -asNumber((await engine.analyse(h.fen(), { depth })).score);
    const change = -asNumber((await engine.analyse(changeFen(h.fen(), m.to as Square, gem.piece), { depth })).score);
    return { stay, change };
  }
  const careless = () => rand() < bot.careless;

  // 1. a move onto a gem, when that is about as good as the best move (a careless bot can miss it)
  const onGem = verbose.filter(m => gemFor(st, m));
  if (onGem.length && !careless()) {
    const cands = await engine.candidates(st.fen, { n: Math.min(8, legal.length), depth });
    const best = cands.length ? asNumber(cands[0].score) : 0;
    let pick: { uci: string; value: number; change: boolean } | null = null;
    for (const m of onGem) {
      const uci = m.from + m.to + (m.promotion ?? "");
      const s = await both(uci), value = Math.max(s.stay, s.change);
      if (value >= best - DETOUR && (!pick || value > pick.value)) pick = { uci, value, change: s.change > s.stay + GAIN };
    }
    if (pick) return { uci: pick.uci, change: pick.change };
  }

  // 2. otherwise its usual chess; if that happens to land on a gem, it still decides whether to change
  const uci = await botMove(engine, st.fen, legal, bot, rand, history);
  const m = verbose.find(x => x.from + x.to + (x.promotion ?? "") === uci);
  if (m && gemFor(st, m)) { const s = await both(uci); return { uci, change: s.change > s.stay + GAIN && !careless() }; }
  return { uci, change: false };
}
