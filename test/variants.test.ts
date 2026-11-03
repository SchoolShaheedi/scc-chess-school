// Odds starts and the two bot variants (src/bots/variants.ts): pure rules, on hand-made positions.
import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { BOTS, botMove } from "../src/bots/bots";
import type { Uci } from "../src/engine/uci";
import { countChecks, letsOpponentWin, oddsFen, variantChoice, variantWinner, winningMoves } from "../src/bots/variants";

const KOTH = { variant: "koth" as const, checks: { w: 0, b: 0 } };
const three = (w: number, b: number) => ({ variant: "threecheck" as const, checks: { w, b } });
const legalOf = (fen: string) => new Chess(fen).moves({ verbose: true }).map(m => m.from + m.to + (m.promotion ?? ""));

describe("odds start positions", () => {
  it("each is a legal position with the one piece gone and the right castling rights", () => {
    const cases: [Parameters<typeof oddsFen>[0], "w" | "b", string][] = [
      ["pawn", "b", "rnbqkbnr/ppppp1pp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"],
      ["pawn", "w", "rnbqkbnr/pppppppp/8/8/8/8/PPPPP1PP/RNBQKBNR w KQkq - 0 1"],
      ["knight", "b", "r1bqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"],
      ["knight", "w", "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/R1BQKBNR w KQkq - 0 1"],
      ["rook", "b", "1nbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQk - 0 1"],
      ["rook", "w", "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/1NBQKBNR w Kkq - 0 1"],
    ];
    for (const [odds, bot, want] of cases) {
      const fen = oddsFen(odds, bot);
      expect(fen, `${odds} by ${bot}`).toBe(want);
      expect(() => new Chess(fen)).not.toThrow();
    }
  });
  it("after the a-rook is gone the bot has kingside castling only", () => {
    const black = new Chess(oddsFen("rook", "b"));
    expect(black.getCastlingRights("b")).toEqual({ k: true, q: false });
    expect(black.getCastlingRights("w")).toEqual({ k: true, q: true });
    const white = new Chess(oddsFen("rook", "w"));
    expect(white.getCastlingRights("w")).toEqual({ k: true, q: false });
    expect(white.getCastlingRights("b")).toEqual({ k: true, q: true });
  });
  it("the standard start for no odds", () => {
    expect(oddsFen("none", "b")).toBe(new Chess().fen());
  });
});

describe("variant win detection", () => {
  it("King of the Hill: a king on d4, d5, e4 or e5 wins for that side", () => {
    for (const sq of ["d4", "d5", "e4", "e5"]) {
      const g = new Chess("4k3/8/8/8/8/8/8/8 b - - 0 1", { skipValidation: true });
      g.put({ type: "k", color: "w" }, sq as "d4");
      expect(variantWinner(g, "koth", { w: 0, b: 0 }), sq).toBe("w");
    }
  });
  it("King of the Hill: a king on e3 or d6 does not win", () => {
    expect(variantWinner(new Chess("4k3/8/8/8/8/4K3/8/8 b - - 0 1"), "koth", { w: 0, b: 0 })).toBeNull();
    expect(variantWinner(new Chess("8/8/3k4/8/8/8/8/4K3 w - - 0 1"), "koth", { w: 0, b: 0 })).toBeNull();
  });
  it("King of the Hill: a move that walks the king there ends the game", () => {
    const g = new Chess("4k3/8/8/8/8/4K3/8/8 w - - 0 1");
    g.move("Ke4");
    expect(variantWinner(g, "koth", { w: 0, b: 0 })).toBe("w");
    const b = new Chess("4k3/8/8/8/8/8/8/4K3 b - - 0 1");
    b.move("Kd7");
    expect(variantWinner(b, "koth", { w: 0, b: 0 })).toBeNull();
  });
  it("Three-check: counts checks (and mates) from the moves played, and the third one wins", () => {
    const g = new Chess();
    for (const m of ["e4", "e5", "Qh5", "Nc6", "Qxf7+"]) g.move(m);
    expect(countChecks(g.history({ verbose: true }))).toEqual({ w: 1, b: 0 });
    expect(variantWinner(g, "threecheck", { w: 1, b: 0 })).toBeNull();
    expect(variantWinner(g, "threecheck", { w: 3, b: 0 })).toBe("w");
    expect(variantWinner(g, "threecheck", { w: 2, b: 3 })).toBe("b");
  });
  it("no variant, no variant win", () => {
    expect(variantWinner(new Chess("4k3/8/8/8/4K3/8/8/8 b - - 0 1"), "none", { w: 9, b: 9 })).toBeNull();
  });
});

describe("the bot wrapper: take the win, avoid the loss", () => {
  it("KOTH: takes the king step onto the hill even when the engine prefers another move", () => {
    const fen = "4k3/8/8/8/8/4K3/8/7R w - - 0 1";   // Kd4 and Ke4 win at once
    expect(winningMoves(fen, KOTH).sort()).toEqual(["e3d4", "e3e4"]);
    const mv = variantChoice(fen, KOTH, "h1h8", ["h1h8"], legalOf(fen), () => 0);
    expect(["e3d4", "e3e4"]).toContain(mv);
  });
  it("Three-check: takes the third check", () => {
    const fen = "4k3/8/8/8/8/8/8/R3K3 w - - 0 1";   // Ra8+ is a check; with two checks already it wins
    expect(winningMoves(fen, three(2, 0))).toContain("a1a8");
    expect(winningMoves(fen, three(1, 0))).toEqual([]);
    expect(variantChoice(fen, three(2, 0), "e1d2", ["e1d2"], legalOf(fen), () => 0)).toBe("a1a8");
  });
  it("KOTH: picks the best safe candidate when the engine's move lets the learner onto the hill", () => {
    // white king d3 (one step from d4/e4). Black's rook on a4 can guard row 4; moving it away lets white in.
    const fen = "4k3/8/8/8/r7/3K4/8/8 b - - 0 1";
    expect(letsOpponentWin(fen, "a4a8", KOTH)).toBe(true);    // rook leaves rank 4: Kd4 / Ke4 now legal
    expect(letsOpponentWin(fen, "a4b4", KOTH)).toBe(false);   // rook still on rank 4 guards d4 and e4 (and c4)
    const mv = variantChoice(fen, KOTH, "a4a8", ["a4a8", "a4b4"], legalOf(fen), () => 0);
    expect(mv).toBe("a4b4");
  });
  it("Three-check: does not allow the learner's third check", () => {
    // white (the learner) has two checks. Black's e5 pawn blocks the e-file: if it captures on d4, Re1+ is the third check.
    // (Rb8 stops Ra8+, so h6 is a safe waiting move.)
    const fen = "1r2k3/7p/8/4p3/3P4/8/8/R5K1 b - - 0 1";
    expect(letsOpponentWin(fen, "e5d4", three(2, 0))).toBe(true);
    expect(letsOpponentWin(fen, "e5d4", three(1, 0))).toBe(false);
    expect(letsOpponentWin(fen, "h7h6", three(2, 0))).toBe(false);
    expect(variantChoice(fen, three(2, 0), "e5d4", ["e5d4", "h7h6"], legalOf(fen), () => 0)).toBe("h7h6");
  });
  it("with no variant the engine's move is untouched", () => {
    const fen = "4k3/8/8/8/8/4K3/8/8 w - - 0 1";
    expect(variantChoice(fen, { variant: "none", checks: { w: 0, b: 0 } }, "e3e2", [], legalOf(fen))).toBe("e3e2");
  });
});

describe("the bot from an odds start", () => {
  it("never plays an opening-book move there (the book is for the standard start)", async () => {
    const fen = oddsFen("rook", "w"), legal = legalOf(fen);
    let asked = 0;
    const engine = { candidates: async () => { asked++; return [{ move: "e2e4", score: { cp: 10 } }]; } } as unknown as Uci;
    const mv = await botMove(engine, fen, legal, { ...BOTS[0], careless: 0 }, () => 0.5, []);
    expect(asked).toBe(1);   // the engine was asked: the book was skipped
    expect(mv).toBe("e2e4");
  });
});
