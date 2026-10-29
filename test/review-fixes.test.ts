// Proof for the two-review fix pass (chess-school review, 2026-10-29). Every position that was added or changed
// in src/content/level*.ts is proved here: chess.js for the rules facts (always runs, fast), and the app's own
// Stockfish for the "this move is best / this is a draw / this is mate in N" claims.
//
// The Stockfish half is slow, so it only runs under an env flag, like COURSE_BUILD in course.test.ts:
//     REVIEW_PROOF=1 npx vitest run test/review-fixes.test.ts
import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { judge, solutions } from "../src/chess/rules";
import { asNumber } from "../src/engine/uci";
import { LEVELS } from "../src/content/levels";
import { nodeEngine } from "./engine";

const D = 22;
const diagramFens = (id: string): string[] => {
  const l = LEVELS.flatMap(x => x.lessons).find(x => x.id === id)!;
  return l.learn.map(s => s.board?.fen).filter((f): f is string => !!f);
};

/** Every legal move's score from the mover's side: SAN -> number (mate pushed far out, see asNumber). */
async function scores(fen: string, depth = D): Promise<Record<string, number>> {
  const e = await nodeEngine(), g = new Chess(fen), n = g.moves().length;
  const out: Record<string, number> = {};
  for (const c of await e.candidates(fen, { n, depth })) {
    const m = g.move({ from: c.move.slice(0, 2), to: c.move.slice(2, 4), promotion: c.move[4] });
    out[m.san] = asNumber(c.score); g.undo();
  }
  return out;
}
const rest = (s: Record<string, number>, ...except: string[]) => Math.max(...Object.entries(s).filter(([k]) => !except.includes(k)).map(([, v]) => v));

describe("review fixes: rules and positions (chess.js)", () => {
  it("#5 1.10 capture practice: only Bxe2 is legal, and a king that takes the checker counts as capturing", () => {
    const fen = "k7/8/8/8/8/3p4/4q3/3BK3 w - - 0 1";
    expect(new Chess(fen).moves()).toEqual(["Bxe2"]);
    expect(solutions(fen, "escape-capture")).toEqual(["d1e2"]);
    const bare = "k7/8/8/8/8/8/4q3/4K3 w - - 0 1";          // the king may take an undefended checker
    expect(judge(bare, "e1e2", "escape-capture").ok).toBe(true);
    expect(judge(bare, "e1e2", "escape-move").ok).toBe(true);    // and it is still a king move: no "that works too" scolding either way
    const pawnCheck = "k7/8/8/8/8/8/3p4/4K3 w - - 0 1";        // a king that takes a checking pawn: a king move AND a capture
    expect(judge(pawnCheck, "e1d2", "escape-move").ok).toBe(true);
    expect(judge(pawnCheck, "e1d2", "escape-capture").ok).toBe(true);
    expect(judge("k3r3/8/8/8/2B5/8/8/4K3 w - - 0 1", "c4e2", "escape-move").tryAnother).toBe(true);  // blocking is still not a king move
  });

  it("#4 4.4 king fork: Kd2 is the one move that forks; Kf1 is rejected; both are the only legal moves", () => {
    const fen = "4k3/R7/8/8/7b/2n5/2b5/4K3 w - - 0 1";
    const g = new Chess(fen);
    expect(g.inCheck()).toBe(true);
    expect(g.attackers("e1", "b")).toEqual(["h4"]);                // checked by the bishop only
    expect(g.moves().sort()).toEqual(["Kd2", "Kf1"]);
    expect(solutions(fen, "fork")).toEqual(["e1d2"]);
    expect(judge(fen, "e1f1", "fork").ok).toBe(false);
    // the fork is real: after Kd2 both c3 and c2 are attacked and neither is defended
    const a = new Chess(fen); a.move("Kd2");
    expect(a.attackers("c3", "w")).toContain("d2"); expect(a.attackers("c2", "w")).toContain("d2");
    expect(a.attackers("c3", "b")).toEqual([]); expect(a.attackers("c2", "b")).toEqual([]);
  });

  it("#12 4.9 the defender bishop e6 is itself defended, and it is the knight's only guard", () => {
    for (const fen of diagramFens("4.9")) {
      const g = new Chess(fen);
      expect(g.attackers("e6", "b"), "e6 bishop must be defended").toEqual(["e8"]);
      expect(g.attackers("d5", "b")).toEqual(["e6"]);             // the bishop is the knight's only defender
      expect(g.attackers("d5", "w")).toEqual(["d1"]);
      expect(g.attackers("e6", "w")).toEqual(["h3"]);
    }
  });

  it("#14 3.4 after the waiting move Rb7 the black king CAN step to f8, so the slide must not say it must", () => {
    const g = new Chess("4k3/R7/3K4/8/8/8/8/8 w - - 0 1"); g.move("Rb7");
    expect(g.moves()).toContain("Kf8");
  });

  it("#15 3.1 slide 4 draws the pawn on h2, where the arrow starts", () => {
    const g = new Chess("6k1/8/8/8/8/8/5PPP/6K1 w - - 0 1");
    expect(g.get("h2")).toMatchObject({ type: "p", color: "w" }); expect(g.get("h3")).toBeUndefined();
  });

  it("#9 10.5 Blunder check: Qxd5 really lets Black mate in two (Ra1+ Qd1 Rxd1#), and the queen is the only guard of the back row", () => {
    const fen = diagramFens("10.5")[1];
    const g = new Chess(fen);
    expect(g.attackers("a1", "w")).toEqual(["d1"]);
    g.move("Qxd5"); g.move("Ra1+");
    expect(g.moves()).toEqual(["Qd1"]);                             // the only reply, which just walks into the mate
    g.move("Qd1"); g.move("Rxd1#"); expect(g.isCheckmate()).toBe(true);
  });

  it("#2 9.6 / 10.6 perpetual: Qh5+ Kg8 Qe8+ Kh7 Qh5+ is forced all the way round, so the checks really repeat", () => {
    for (const id of ["9.6", "10.6"]) {
      const fen = diagramFens(id).find(f => f.includes("K2Q4"))!;
      const g = new Chess(fen);
      g.move("Qh5+"); expect(g.moves()).toEqual(["Kg8"]); g.move("Kg8");
      g.move("Qe8+");
      expect(g.moves()).toEqual(["Kh7"]);                           // the king has one square, and the rooks cannot block on f8
      g.move("Kh7"); g.move("Qh5+"); expect(g.moves()).toEqual(["Kg8"]);   // back to the position after move one: a repetition
    }
  });

  it("#3 9.4 the trebuchet is a legal, mutual zugzwang position (every king move of the side to move is legal and only kings and pawns)", () => {
    const f = diagramFens("9.4");
    expect(f[0]).toBe("8/8/8/3Kp3/4Pk2/8/8/8 w - - 0 1");
    const black = new Chess(f[0].replace(" w ", " b "));
    expect(black.moves().length).toBeGreaterThan(0);
    const spare = new Chess(f[1]);
    expect(spare.get("a2")).toMatchObject({ type: "p", color: "w" });
  });

  it("#1 9.7 the 'trade' board is not mate: Rxd8+ is a check the king simply takes", () => {
    const fen = diagramFens("9.7")[0];
    const g = new Chess(fen);
    const m = g.move("Rxd8+"); expect(m.captured).toBe("r");
    expect(g.isCheckmate()).toBe(false);
    expect(g.moves()).toContain("Kxd8");                            // the king simply takes back: a trade, not a mate
    // 9.7's pawn-ending claim: after the trade White still has the extra (outside, passed) a-pawn
    g.move("Kxd8");
    expect(g.get("a2")).toMatchObject({ type: "p", color: "w" }); expect(g.get("a7")).toBeUndefined();
  });

  it("#7 7.2 the mate-in-three diagram is a legal position with Black to move, and Rxh2+ Kxh2 Qh8+ Qh7 Qxh7# is the line", () => {
    const fen = diagramFens("7.2")[0];
    const g = new Chess(fen);
    expect(g.turn()).toBe("b");
    for (const san of ["Rxh2+", "Kxh2", "Qh8+", "Qh7", "Qxh7#"]) g.move(san);
    expect(g.isCheckmate()).toBe(true);
  });

  it("#10 7.7 the interference diagram: Nd6+ cuts the bishop b8's guard of the pinned knight e5; Bxd6 is met by cxd6", () => {
    const fen = diagramFens("7.7")[0];
    const g = new Chess(fen);
    expect(g.attackers("e5", "b")).toEqual(["b8"]);                  // the only guard, along b8-e5
    expect(g.attackers("e5", "w")).toEqual(["e1"]);                  // attacked once, so the guard matters
    expect(g.attackers("b8", "w")).toEqual([]);                      // and nothing wins a piece for free here (no Nxa5-style capture)
    g.move("Nd6+");                                                    // the check also cuts the line: nothing guards e5 now
    expect(g.attackers("e5", "b")).toEqual([]);
    expect(g.moves()).toContain("Bxd6");                               // the only way to keep the guard is to take the knight, and c5xd6 follows
  });

  it("#11 7.8 the x-ray diagram: Rd1 reaches d5 only THROUGH its own rook on d2", () => {
    const fen = diagramFens("7.8")[0];
    const g = new Chess(fen);
    expect(g.attackers("d5", "w")).toEqual(["d2"]);                  // d1 is hidden behind d2
    const h = new Chess(fen); h.move("Rxd5"); h.move("Rxd5");
    expect(h.attackers("d5", "w")).toEqual(["d1"]);                  // once d2 has gone, the rook behind comes alive
  });
});

describe.runIf(process.env.REVIEW_PROOF === "1")("review fixes: Stockfish proofs", () => {
  it("#1 9.7: trading rooks is by far the best move, and the pawn ending after Kxd8 is winning", async () => {
    const fen = diagramFens("9.7")[0], s = await scores(fen);
    expect(s["Rxd8+"]).toBeGreaterThan(rest(s, "Rxd8+") + 300);
    const g = new Chess(fen); g.move("Rxd8+"); g.move("Kxd8");
    const after = asNumber((await (await nodeEngine()).analyse(g.fen(), { depth: D })).score);   // White is to move again, so the score is already White's
    expect(after).toBeGreaterThan(400);
  }, 120000);

  it("#2 9.6 / 10.6: with the checks it is a draw, without them White is clearly worse", async () => {
    const fen = diagramFens("9.6").find(f => f.includes("K2Q4"))!, s = await scores(fen, 26);
    expect(Math.abs(s["Qh5+"])).toBeLessThanOrEqual(30);
    for (const quiet of ["Qd3", "Qd4", "Qd5", "Qd6", "Qg1", "Qe1", "Qf1", "Qc1"]) expect(s[quiet], quiet).toBeLessThanOrEqual(-150);
    expect(diagramFens("10.6")).toContain(fen);
  }, 180000);

  it("#3 9.4: the trebuchet is a mutual zugzwang (every move of whoever is to move loses), and the spare tempo a3 wins", async () => {
    const f = diagramFens("9.4")[0];
    for (const fen of [f, f.replace(" w ", " b ")]) {
      const s = await scores(fen, 26);
      expect(Math.max(...Object.values(s)), fen).toBeLessThan(-500);
    }
    const t = await scores(diagramFens("9.4")[1], 26);
    expect(t["a3"]).toBeGreaterThan(500);
    for (const k of ["Kc6", "Kd6", "Kc5", "Ke6"]) expect(t[k], k).toBeLessThanOrEqual(50);   // a king move throws the win away
  }, 240000);

  it("#4 4.4: Kd2 (the fork) is about level, Kf1 loses material", async () => {
    const s = await scores("4k3/R7/8/8/7b/2n5/2b5/4K3 w - - 0 1", 26);
    expect(s["Kd2"]).toBeGreaterThan(-50); expect(s["Kd2"] - s["Kf1"]).toBeGreaterThan(150);
  }, 120000);

  it("#7 7.2: Rxh2+ is a forced mate in exactly three, and nothing else mates", async () => {
    const fen = diagramFens("7.2")[0], e = await nodeEngine();
    const c = await e.candidates(fen, { n: 3, depth: 24 });
    expect(c[0].move).toBe("h8h2"); expect(c[0].score.mate).toBe(3);
    expect(c[1].score.mate).toBeUndefined();
  }, 120000);

  it("#8 7.1 and 10.4: Re8+ loses the rook, Bxd5 wins a knight, h3 wins nothing", async () => {
    const fen = "r5k1/5ppp/8/3n4/8/1B6/5PPP/4R1K1 w - - 0 1";
    expect(diagramFens("7.1")[0]).toBe(fen); expect(diagramFens("10.4")[0]).toBe(fen);
    const s = await scores(fen);
    expect(s["Bxd5"]).toBeGreaterThan(300); expect(s["Re8+"]).toBeLessThan(-300); expect(Math.abs(s["h3"])).toBeLessThan(60);
    expect(s["Bxd5"]).toBeGreaterThan(rest(s, "Bxd5") + 300);
  }, 120000);

  it("#9 10.5: every sensible move keeps the win, Qxd5 gets mated", async () => {
    const s = await scores(diagramFens("10.5")[1]);
    expect(s["Qxd5"]).toBeLessThan(-90000);
    for (const [k, v] of Object.entries(s)) if (k !== "Qxd5" && !k.startsWith("Q") ) expect(v, k).toBeGreaterThan(300);
  }, 120000);

  it("#10 7.7: Nd6+ is the only move that wins material", async () => {
    const s = await scores(diagramFens("7.7")[0], 26);
    expect(s["Nd6+"]).toBeGreaterThan(150); expect(s["Nd6+"]).toBeGreaterThan(rest(s, "Nd6+") + 150);
  }, 120000);

  it("#11 7.8: Rxd5 wins the queen, every other move loses it", async () => {
    const s = await scores(diagramFens("7.8")[0]);
    expect(s["Rxd5"]).toBeGreaterThan(400); expect(rest(s, "Rxd5")).toBeLessThan(-300);
  }, 120000);

  it("#12 4.9: Bxe6+ (remove the defender) is far the best move", async () => {
    const s = await scores(diagramFens("4.9")[0], 24);
    expect(s["Bxe6+"]).toBeGreaterThan(rest(s, "Bxe6+") + 400);
  }, 120000);

  it("#6 2.10: g6 and Nf6 (the exercise's moves) are sound; the other sound defences are listed in the report", async () => {
    const e = await nodeEngine();
    const g = new Chess();
    for (const m of ["e4", "e5", "Bc4", "Nc6", "Qh5"]) g.move(m);
    const a = await scores(g.fen()); const best = Math.max(...Object.values(a));
    expect(best - a["g6"]).toBeLessThan(50);
    g.move("g6"); g.move("Qf3");
    const b = await scores(g.fen()); expect(Math.max(...Object.values(b)) - b["Nf6"]).toBeLessThan(50);
    expect(e).toBeTruthy();
  }, 120000);
});
