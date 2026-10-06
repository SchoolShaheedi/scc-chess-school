// The big puzzle bank (DECISIONS #85): 50,050 Lichess puzzles (CC0) in 100-point rating bands, built by
// tools/build-puzzle-bank.mjs into public/puzzles/bank/. A band is fetched the first time it is needed and then kept by
// the service worker, so the Puzzles tab works offline for every band already opened.
import type { PuzzleExercise, Text } from "../lesson/types";

export interface BankPuzzle { id: string; fen: string; moves: string[]; rating: number; themes: string[] }
interface Index { step: number; themes: string[]; bands: { min: number; file: string; count: number }[]; themeCounts: Record<string, number> }

/** The themes a learner can practise, in the glossary's words (01_Research/CURRICULUM.md), easiest ideas first. */
export const THEMES: { id: string; name: Text }[] = [
  { id: "mateIn1", name: { en: "Mate in one", pa: "ਇੱਕ ਚਾਲ ਵਿੱਚ ਮਾਤ" } },
  { id: "hangingPiece", name: { en: "Free pieces", pa: "ਬੇ-ਬਚਾਅ ਮੋਹਰੇ" } },
  { id: "fork", name: { en: "Forks", pa: "ਦੋਹਰਾ ਵਾਰ" } },
  { id: "pin", name: { en: "Pins", pa: "ਬੰਨ੍ਹ" } },
  { id: "skewer", name: { en: "Skewers", pa: "ਪਿਛਲਾ ਵਾਰ" } },
  { id: "discoveredAttack", name: { en: "Discovered attacks", pa: "ਲੁਕਵਾਂ ਹਮਲਾ" } },
  { id: "doubleCheck", name: { en: "Double check", pa: "ਦੋਹਰੀ ਸ਼ਹਿ" } },
  { id: "capturingDefender", name: { en: "Removing the defender", pa: "ਰਾਖਾ ਹਟਾਉਣਾ" } },
  { id: "trappedPiece", name: { en: "Trapped pieces", pa: "ਫਸਿਆ ਮੋਹਰਾ" } },
  { id: "backRankMate", name: { en: "Back-rank mate", pa: "ਪਿਛਲੀ ਕਤਾਰ ਦੀ ਮਾਤ" } },
  { id: "mateIn2", name: { en: "Mate in two", pa: "ਦੋ ਚਾਲਾਂ ਵਿੱਚ ਮਾਤ" } },
  { id: "mateIn3", name: { en: "Mate in three", pa: "ਤਿੰਨ ਚਾਲਾਂ ਵਿੱਚ ਮਾਤ" } },
  { id: "smotheredMate", name: { en: "Smothered mate", pa: "ਘਿਰੀ ਹੋਈ ਮਾਤ" } },
  { id: "attraction", name: { en: "Decoy", pa: "ਚੋਗਾ" } },
  { id: "deflection", name: { en: "Deflection", pa: "ਧਿਆਨ ਹਟਾਉਣਾ" } },
  { id: "intermezzo", name: { en: "In-between moves", pa: "ਵਿਚਕਾਰਲੀ ਚਾਲ" } },
  { id: "xRayAttack", name: { en: "X-ray", pa: "ਆਰ-ਪਾਰ ਹਮਲਾ" } },
  { id: "sacrifice", name: { en: "Giving up material", pa: "ਜਾਣ-ਬੁੱਝ ਕੇ ਮੋਹਰਾ ਦੇਣਾ" } },
  { id: "quietMove", name: { en: "Quiet moves", pa: "ਚੁੱਪ ਚਾਲ" } },
  { id: "defensiveMove", name: { en: "Defending", pa: "ਆਪਣਾ ਬਚਾਅ" } },
  { id: "promotion", name: { en: "Promotion", pa: "ਤਰੱਕੀ" } },
  { id: "advancedPawn", name: { en: "Passed pawns", pa: "ਆਜ਼ਾਦ ਪਿਆਦਾ" } },
  { id: "pawnEndgame", name: { en: "Pawn endgames", pa: "ਪਿਆਦਿਆਂ ਦੀ ਅੰਤਲੀ ਖੇਡ" } },
  { id: "rookEndgame", name: { en: "Rook endgames", pa: "ਹਾਥੀ ਦੀ ਅੰਤਲੀ ਖੇਡ" } },
  { id: "zugzwang", name: { en: "Zugzwang", pa: "ਮਜਬੂਰੀ ਦੀ ਚਾਲ" } },
  { id: "kingsideAttack", name: { en: "Attacking the king", pa: "ਬਾਦਸ਼ਾਹ 'ਤੇ ਹਮਲਾ" } },
  { id: "opening", name: { en: "Opening tricks", pa: "ਸ਼ੁਰੂਆਤੀ ਫੰਦੇ" } },
];
export const themeName = (id: string) => THEMES.find(x => x.id === id)?.name;

let indexP: Promise<Index> | null = null;
const bands = new Map<number, Promise<BankPuzzle[]>>();
const index = () => (indexP ??= fetch("puzzles/bank/index.json").then(r => r.json() as Promise<Index>));

/** One rating band (e.g. 1200 = 1200-1299). */
export function band(min: number): Promise<BankPuzzle[]> {
  if (!bands.has(min)) bands.set(min, index().then(async ix => {
    const b = ix.bands.find(x => x.min === min); if (!b) return [];
    const text = await (await fetch(`puzzles/bank/${b.file}`)).text();
    return text.split("\n").filter(Boolean).map(line => {
      const [id, fen, moves, rating, th] = line.split("\t");
      return { id, fen, moves: moves.split(" "), rating: +rating, themes: th.split(",").map(i => ix.themes[+i]) };
    });
  }).catch(e => { bands.delete(min); throw e; }));   // a failed fetch (offline, never opened) can be tried again
  return bands.get(min)!;
}
const LOW = 400, HIGH = 2500, STEP = 100;
const bandOf = (r: number) => Math.min(HIGH, Math.max(LOW, Math.floor(r / STEP) * STEP));

/** A puzzle near a rating, never one in `used`; with a theme, from that theme only (widening the search band by band). */
export async function nearRating(r: number, used: Set<string>, theme?: string, rand: () => number = Math.random): Promise<BankPuzzle | null> {
  for (let spread = 0; spread <= 6; spread++) {
    const mins = [...new Set([bandOf(r - spread * STEP), bandOf(r + spread * STEP)])];
    const pool = (await Promise.all(mins.map(band))).flat().filter(p => !used.has(p.id) && (!theme || p.themes.includes(theme)));
    // prefer the ones nearest the rating: pick among the closest 30
    if (pool.length) { const near = pool.sort((a, b) => Math.abs(a.rating - r) - Math.abs(b.rating - r)).slice(0, 30); return near[Math.floor(rand() * near.length)]; }
  }
  return null;
}

/** A bank puzzle by its Lichess id, given the rating it was saved with (the mistake bank). */
export async function bankById(id: string, rating: number): Promise<BankPuzzle | undefined> {
  return (await band(bandOf(rating))).find(p => p.id === id);
}

export const bankExercise = (p: BankPuzzle): PuzzleExercise => ({
  kind: "puzzle", fen: p.fen, moves: p.moves, prompt: { en: "Find the best move.", pa: "ਸਭ ਤੋਂ ਵਧੀਆ ਚਾਲ ਲੱਭੋ।" }, source: `lichess.org/training/${p.id}`,
});
