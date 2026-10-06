// The ten levels (DECISIONS #26), each named by its rating band (#28). Only built levels
// carry lessons; the rest show their title and lesson count as "coming soon".
import type { Exercise, Level, PuzzleExercise } from "../lesson/types";
import { LEVEL1 } from "./level1";
import { LEVEL2 } from "./level2";
import { LEVEL3 } from "./level3";
import { LEVEL4 } from "./level4";
import { LEVEL5 } from "./level5";
import { LEVEL6 } from "./level6";
import { LEVEL7 } from "./level7";
import { LEVEL8 } from "./level8";
import { LEVEL9 } from "./level9";
import { LEVEL10 } from "./level10";
import p_long from "./puzzles/long.json";
import p_very_long from "./puzzles/very-long.json";
import p_defend_hard from "./puzzles/defend-hard.json";
import p_mate_hard from "./puzzles/mate-hard.json";
import p_rook_endgame from "./puzzles/rook-endgame.json";
import p_zugzwang from "./puzzles/zugzwang.json";
import p_bishop_endgame from "./puzzles/bishop-endgame.json";
import p_knight_endgame from "./puzzles/knight-endgame.json";
import p_queen_endgame_hard from "./puzzles/queen-endgame-hard.json";
import p_converting from "./puzzles/converting.json";
import p_kingside_attack from "./puzzles/kingside-attack.json";
import p_exposed_king from "./puzzles/exposed-king.json";
import p_advantage from "./puzzles/advantage.json";
import p_mate2 from "./puzzles/mate2.json";
import p_mate3 from "./puzzles/mate3.json";
import p_mate_patterns from "./puzzles/mate-patterns.json";
import p_attraction from "./puzzles/attraction.json";
import p_deflection from "./puzzles/deflection.json";
import p_intermezzo from "./puzzles/intermezzo.json";
import p_interference from "./puzzles/interference.json";
import p_clearance from "./puzzles/clearance.json";
import p_xray from "./puzzles/xray.json";
import p_sacrifice from "./puzzles/sacrifice.json";
import p_quiet from "./puzzles/quiet.json";
import openingEasy from "./puzzles/opening-easy.json";
import openingMate from "./puzzles/opening-mate.json";
import passedPawn from "./puzzles/passed-pawn.json";
import pawnEndgame from "./puzzles/pawn-endgame.json";
import queenEndgame from "./puzzles/queen-endgame.json";
import defenderEasy from "./puzzles/defender-easy.json";
import discoveredEasy from "./puzzles/discovered-easy.json";
import doublecheckEasy from "./puzzles/doublecheck-easy.json";
import forkEasy from "./puzzles/fork-easy.json";
import pinEasy from "./puzzles/pin-easy.json";
import skewerEasy from "./puzzles/skewer-easy.json";
import trappedEasy from "./puzzles/trapped-easy.json";
import backrank from "./puzzles/backrank.json";
import defendEasy from "./puzzles/defend-easy.json";
import mate1Mid from "./puzzles/mate1-mid.json";
import smothered from "./puzzles/smothered.json";
import enpassant from "./puzzles/enpassant.json";
import mate1Easy from "./puzzles/mate1-easy.json";
import promotionEasy from "./puzzles/promotion-easy.json";
import hangingEasy from "./puzzles/hanging-easy.json";

export const LEVELS: Level[] = [
  { n: 1, band: "0–200", title: { en: "Pieces & moves", pa: "ਮੋਹਰੇ ਤੇ ਚਾਲਾਂ" }, lessons: LEVEL1, plannedLessons: 12, botTest: "nanhi-chidi", race: 5 },
  { n: 2, band: "200–400", title: { en: "Special moves, check & mate", pa: "ਖ਼ਾਸ ਚਾਲਾਂ, ਸ਼ਹਿ ਤੇ ਮਾਤ" }, lessons: LEVEL2, plannedLessons: 10,
    test: { pass: 9, packs: [{ pack: "mate1-easy", count: 6 }, { pack: "promotion-easy", count: 3 }, { pack: "enpassant", count: 1 }, { pack: "hanging-easy", count: 2 }] } },
  { n: 3, band: "400–600", title: { en: "First checkmates", pa: "ਪਹਿਲੀਆਂ ਮਾਤਾਂ" }, lessons: LEVEL3, plannedLessons: 8,
    test: { pass: 11, packs: [{ pack: "mate1-mid", count: 6 }, { pack: "backrank", count: 3 }, { pack: "smothered", count: 2 }, { pack: "defend-easy", count: 2 }, { pack: "mate1-easy", count: 2 }] } },
  { n: 4, band: "600–800", title: { en: "Tactics I", pa: "ਦਾਅ-ਪੇਚ ੧" }, lessons: LEVEL4, plannedLessons: 11,
    test: { pass: 15, packs: [{ pack: "fork-easy", count: 4 }, { pack: "pin-easy", count: 3 }, { pack: "skewer-easy", count: 3 }, { pack: "discovered-easy", count: 3 },
      { pack: "doublecheck-easy", count: 2 }, { pack: "defender-easy", count: 2 }, { pack: "trapped-easy", count: 2 }, { pack: "hanging-easy", count: 1 }] } },
  { n: 5, band: "800–1000", title: { en: "Endgames I", pa: "ਅੰਤਲੀ ਖੇਡ ੧" }, lessons: LEVEL5, plannedLessons: 8,
    test: { pass: 12, packs: [{ pack: "pawn-endgame", count: 6 }, { pack: "passed-pawn", count: 5 }, { pack: "queen-endgame", count: 3 }, { pack: "hanging-easy", count: 2 }] } },
  { n: 6, band: "1000–1200", title: { en: "Openings", pa: "ਸ਼ੁਰੂਆਤ" }, lessons: LEVEL6, plannedLessons: 8,
    test: { pass: 11, packs: [{ pack: "opening-easy", count: 8 }, { pack: "opening-mate", count: 4 }, { pack: "fork-easy", count: 2 }, { pack: "pin-easy", count: 1 }] } },
  { n: 7, band: "1200–1400", title: { en: "Tactics II", pa: "ਦਾਅ-ਪੇਚ ੨" }, lessons: LEVEL7, plannedLessons: 10,
    test: { pass: 15, packs: [{ pack: "mate2", count: 4 }, { pack: "mate3", count: 2 }, { pack: "mate-patterns", count: 3 }, { pack: "attraction", count: 2 }, { pack: "deflection", count: 2 },
      { pack: "intermezzo", count: 2 }, { pack: "clearance", count: 1 }, { pack: "xray", count: 1 }, { pack: "sacrifice", count: 2 }, { pack: "quiet", count: 1 }] } },
  { n: 8, band: "1400–1600", title: { en: "Strategy", pa: "ਰਣਨੀਤੀ" }, lessons: LEVEL8, plannedLessons: 9,
    test: { pass: 11, packs: [{ pack: "advantage", count: 6 }, { pack: "kingside-attack", count: 4 }, { pack: "exposed-king", count: 3 }, { pack: "passed-pawn", count: 2 }] } },
  { n: 9, band: "1600–1800", title: { en: "Endgames II", pa: "ਅੰਤਲੀ ਖੇਡ ੨" }, lessons: LEVEL9, plannedLessons: 9,
    test: { pass: 11, packs: [{ pack: "rook-endgame", count: 4 }, { pack: "zugzwang", count: 2 }, { pack: "bishop-endgame", count: 2 }, { pack: "knight-endgame", count: 2 }, { pack: "queen-endgame-hard", count: 2 }, { pack: "converting", count: 3 }] } },
  { n: 10, band: "1800+", title: { en: "Repertoire & calculation", pa: "ਸ਼ੁਰੂਆਤਾਂ ਤੇ ਗਿਣਤੀ" }, lessons: LEVEL10, plannedLessons: 8,
    test: { pass: 11, packs: [{ pack: "long", count: 5 }, { pack: "very-long", count: 3 }, { pack: "defend-hard", count: 4 }, { pack: "mate-hard", count: 3 }] } },
];

interface Pack { source: string; puzzles: { id: string; fen: string; moves: string[]; rating: number }[] }
export const PACKS: Record<string, Pack> = {
  "hanging-easy": hangingEasy as Pack, "mate1-easy": mate1Easy as Pack,
  "promotion-easy": promotionEasy as Pack, enpassant: enpassant as Pack,
  backrank: backrank as Pack, smothered: smothered as Pack, "mate1-mid": mate1Mid as Pack, "defend-easy": defendEasy as Pack,
  "fork-easy": forkEasy as Pack, "pin-easy": pinEasy as Pack, "skewer-easy": skewerEasy as Pack, "discovered-easy": discoveredEasy as Pack,
  "doublecheck-easy": doublecheckEasy as Pack, "defender-easy": defenderEasy as Pack, "trapped-easy": trappedEasy as Pack,
  "pawn-endgame": pawnEndgame as Pack, "passed-pawn": passedPawn as Pack, "queen-endgame": queenEndgame as Pack,
  "opening-easy": openingEasy as Pack, "opening-mate": openingMate as Pack,
  "mate2": p_mate2 as Pack, "mate3": p_mate3 as Pack, "mate-patterns": p_mate_patterns as Pack, "attraction": p_attraction as Pack, "deflection": p_deflection as Pack, "intermezzo": p_intermezzo as Pack, "interference": p_interference as Pack, "clearance": p_clearance as Pack, "xray": p_xray as Pack, "sacrifice": p_sacrifice as Pack, "quiet": p_quiet as Pack,
  "kingside-attack": p_kingside_attack as Pack, "exposed-king": p_exposed_king as Pack, "advantage": p_advantage as Pack,
  "rook-endgame": p_rook_endgame as Pack, "zugzwang": p_zugzwang as Pack, "bishop-endgame": p_bishop_endgame as Pack, "knight-endgame": p_knight_endgame as Pack, "queen-endgame-hard": p_queen_endgame_hard as Pack, "converting": p_converting as Pack,
  "long": p_long as Pack, "very-long": p_very_long as Pack, "defend-hard": p_defend_hard as Pack, "mate-hard": p_mate_hard as Pack,
};

/** Turns "pack" exercises into N concrete puzzles. A fresh shuffle each time a lesson is played,
 *  so a replay is not the same five puzzles in the same order. */
export function expand(list: Exercise[], rand: () => number = Math.random): Exercise[] {
  return list.flatMap((ex): Exercise[] => {
    if (ex.kind !== "pack") return [ex];
    const pool = [...PACKS[ex.pack].puzzles].sort(() => rand() - 0.5).slice(0, ex.count);
    return pool.map((p): PuzzleExercise => ({
      kind: "puzzle", fen: p.fen, moves: p.moves, prompt: ex.prompt, hint: ex.hint,
      source: `lichess.org/training/${p.id}`,
    }));
  });
}

export const allLessons = () => LEVELS.flatMap(l => l.lessons);
export const findLesson = (id: string) => allLessons().find(l => l.id === id);
