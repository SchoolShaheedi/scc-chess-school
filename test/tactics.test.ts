// Tactic detection (chess/tactics.ts), the per-move coach notes (review/movenote.ts) and the found/missed tactics in
// Insights (insights/tactics.ts). Every FEN here is a real, legal position and the expected answer was checked by hand.
import { describe, expect, it } from "vitest";
import { allowedMate, forcedMate, forkOf, forksAvailable, freePieceTaken, freePiecesAvailable, mateIn1Moves, mateIn2Move, pinOf, pinsAvailable, threatensMate } from "../src/chess/tactics";
import { UI, type UIKey } from "../src/i18n";
import { addTactics, emptyTactics, gameTactics, shown } from "../src/insights/tactics";
import type { Reviewed } from "../src/review/insights";
import { moveNote, shortNote, whatItDid, whyWeak } from "../src/review/movenote";

const FORK = "r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1";           // Nd5-c7+ forks the king on e8 and the rook on a8
const PIN = "4k3/8/2n5/8/8/8/8/4KB2 w - - 0 1";            // Bf1-b5 pins the knight on c6 to the king on e8
const BACK_RANK = "6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1";     // Ra1-a8 is checkmate
const MATE2 = "7k/8/5K2/8/8/8/8/6R1 w - - 0 1";            // Kf7! Kh7 (forced) Rh1#
const FREEQ = "4k3/8/8/3q4/8/8/8/3RK3 w - - 0 1";          // Rd1xd5 takes the unguarded queen
const words = (k: string) => UI[k as UIKey];
const pieceWord = (p: string) => UI[`pc${p.toUpperCase()}` as UIKey];
const rev = (over: Partial<Reviewed>): Reviewed => ({ san: "", uci: "", by: "w", best: "", before: 50, after: 50, drop: 0, label: "best", i: 0, ...over });

describe("tactic detection", () => {
  it("a knight fork of the king and a rook is found, and a quiet knight move is not", () => {
    expect(forkOf(FORK, "d5c7")?.map(t => t.sq + t.type).sort()).toEqual(["a8r", "e8k"]);
    expect(forkOf(FORK, "d5b6")).toBeNull();                 // b6 attacks only the rook
    expect(forksAvailable(FORK)).toEqual(["d5c7"]);
  });
  it("a bishop pin against the king is found", () => {
    expect(pinOf(PIN, "f1b5")).toEqual({ pinned: { type: "n", sq: "c6" }, behind: { type: "k", sq: "e8" } });
    expect(pinOf(PIN, "f1c4")).toBeNull();
    expect(pinsAvailable(PIN)).toEqual(["f1b5"]);
  });
  it("mate in one, and what a move allows", () => {
    expect(mateIn1Moves(BACK_RANK)).toEqual(["a1a8"]);
    expect(allowedMate(BACK_RANK)).toBe("Ra8#");                                  // the side to move (White) has Ra8#: what a careless Black move allows
    expect(allowedMate("6k1/5ppp/8/8/8/8/R7/4K3 b - - 1 1")).toBeNull();           // Black has no mate there
    expect(threatensMate("6k1/5ppp/8/8/8/8/R7/4K3 b - - 1 1")).toBe(true);         // after Ra2, White threatens Ra8#
    expect(threatensMate("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1")).toBe(false);
  });
  it("mate in two: Kf7 forces Kh7 then Rh1#, and a rook shuffle does not", () => {
    expect(mateIn1Moves(MATE2)).toEqual([]);
    expect(mateIn2Move(MATE2)).toBe("f6f7");
    expect(forcedMate("7k/5K2/8/8/8/8/8/6R1 b - - 1 1")).toBe(true);
    expect(forcedMate("7k/8/5K2/8/8/8/6R1/8 b - - 1 1")).toBe(false);
  });
  it("a free queen is a free piece, a defended pawn is not", () => {
    expect(freePieceTaken(FREEQ, "d1d5")).toBe("q");
    expect(freePiecesAvailable(FREEQ)).toEqual(["d1d5"]);
    expect(freePieceTaken("4k3/3p4/8/4p3/8/8/8/3RK3 w - - 0 1", "d1d7")).toBeNull();   // a pawn is not worth 3
  });
});

describe("a note on every move", () => {
  it("a developing move: Bc4 in the Italian brings the bishop out", () => {
    const fen = "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3";
    const what = whatItDid(fen, "f1c4", 4, words, pieceWord);
    expect(what.map(x => x.en)).toEqual(["It brings the bishop out into the game."]);
    expect(what[0].pa).toContain("ਊਠ");
  });
  it("a fork that is also a check says both", () => {
    const what = whatItDid(FORK, "d5c7", 0, words, pieceWord).map(x => x.en);
    expect(what).toEqual(["It attacks the king on e8 and the rook on a8 at once: a fork.", "It gives check: the king must answer it."]);
  });
  it("a pin, a free piece and castling", () => {
    expect(whatItDid(PIN, "f1b5", 0, words, pieceWord)[0].en).toBe("It pins the knight on c6 against the king on e8 behind it.");
    expect(whatItDid(FREEQ, "d1d5", 0, words, pieceWord)[0].en).toBe("It takes the queen on d5, which nothing was guarding: a free piece.");
    expect(whatItDid("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1", "e1g1", 30, words, pieceWord)[0].en).toBe("Castling: the king is safer and a rook joins the game.");
  });
  it("checkmate says so", () => {
    expect(whatItDid(BACK_RANK, "a1a8", 40, words, pieceWord).map(x => x.en)).toEqual(["This move is checkmate!"]);
  });
  it("a mistake that leaves the rook loose when a free queen was there", () => {
    const m = rev({ uci: "e1f2", best: "d1d5", drop: 40, label: "blunder" });
    expect(whyWeak(FREEQ, m, words, pieceWord).map(x => x.en)).toEqual([
      "The rook on d1 was left with no guard.", "Better was Rxd5: it takes the queen on d5, which nothing was guarding."]);
  });
  it("a move that allows checkmate says which mate", () => {
    const fen = "6k1/5ppp/8/8/8/8/8/R3K3 b - - 0 1";
    const m = rev({ by: "b", uci: "g8h8", best: "h7h6", drop: 80, label: "blunder" });
    expect(whyWeak(fen, m, words, pieceWord).map(x => x.en)).toEqual(["This lets your opponent checkmate with Ra8#.", "h6 was better."]);
  });
  it("the Young look keeps two sentences, a good move gets no 'why'", () => {
    const n = moveNote(FORK, rev({ uci: "d5c7", drop: 0 }), words, pieceWord);
    expect(n.why).toEqual([]); expect(n.what).toHaveLength(2); expect(shortNote(n)).toHaveLength(1);
    const w = moveNote(FREEQ, rev({ uci: "e1f2", best: "d1d5", drop: 40 }), words, pieceWord);
    expect(w.why).toHaveLength(2); expect(shortNote(w).map(x => x.en)[1]).toContain("Better was Rxd5");
  });
});

describe("tactics found and missed in a game", () => {
  const row = (r: ReturnType<typeof gameTactics>, id: string) => r.find(x => x.id === id)!;
  it("finds mate in one, and counts a mate on the board that was not played as missed (even with no drop)", () => {
    expect(row(gameTactics({ me: "w", startFen: BACK_RANK, uci: ["a1a8"] }, [0]), "mate1")).toMatchObject({ found: 1, missed: 0 });
    expect(row(gameTactics({ me: "w", startFen: BACK_RANK, uci: ["a1a2"] }, [0]), "mate1")).toMatchObject({ found: 0, missed: 1 });
  });
  it("finds a forced mate in two when the game ends in it, and misses one only when the move lost ground", () => {
    expect(row(gameTactics({ me: "w", startFen: MATE2, uci: ["f6f7", "h8h7", "g1h1"] }, [0, 0, 0]), "mate2")).toMatchObject({ found: 1, missed: 0 });
    expect(row(gameTactics({ me: "w", startFen: MATE2, uci: ["g1g2"] }, [30]), "mate2")).toMatchObject({ found: 0, missed: 1 });
    expect(row(gameTactics({ me: "w", startFen: MATE2, uci: ["g1g2"] }, [2]), "mate2")).toMatchObject({ found: 0, missed: 0 });
  });
  it("forks and pins: found when played, missed when available and the move lost 10+ points", () => {
    expect(row(gameTactics({ me: "w", startFen: FORK, uci: ["d5c7"] }, [0]), "fork")).toMatchObject({ found: 1, missed: 0 });
    expect(row(gameTactics({ me: "w", startFen: FORK, uci: ["e1e2"] }, [40]), "fork")).toMatchObject({ found: 0, missed: 1 });
    expect(row(gameTactics({ me: "w", startFen: FORK, uci: ["e1e2"] }, [3]), "fork")).toMatchObject({ found: 0, missed: 0 });
    expect(row(gameTactics({ me: "w", startFen: PIN, uci: ["f1b5"] }, [0]), "pin")).toMatchObject({ found: 1, missed: 0 });
    expect(row(gameTactics({ me: "w", startFen: PIN, uci: ["e1e2"] }, [25]), "pin")).toMatchObject({ found: 0, missed: 1 });
  });
  it("free pieces: won, missed, and left hanging", () => {
    expect(row(gameTactics({ me: "w", startFen: FREEQ, uci: ["d1d5"] }, [0]), "hanging")).toMatchObject({ found: 1, missed: 0, left: 0 });
    expect(row(gameTactics({ me: "w", startFen: FREEQ, uci: ["e1f2"] }, [40]), "hanging")).toMatchObject({ found: 0, missed: 1, left: 1 });
  });
  it("only the learner's own moves count", () => {
    // Black to move would find nothing here, and White's moves are not "mine"
    const r = gameTactics({ me: "b", startFen: BACK_RANK, uci: ["a1a8"] }, [0]);
    expect(shown(r)).toEqual([]);
  });
  it("adds games together and hides rows with nothing in them", () => {
    const a = gameTactics({ me: "w", startFen: FORK, uci: ["d5c7"] }, [0]), b = gameTactics({ me: "w", startFen: FORK, uci: ["e1e2"] }, [40]);
    const sum = addTactics(addTactics(emptyTactics(), a), b);
    expect(shown(sum)).toEqual([{ id: "fork", found: 1, missed: 1, left: 0 }]);
  });
});
