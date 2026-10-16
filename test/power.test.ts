// Magical Chess rules (DECISIONS #98-#101): gems work like a promotion, and the game is ordinary chess underneath.
import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { afterMove, changeFen, gemFor, MAX_ORBS, maybeSpawn, newPower, type PowerState, rng, spawnSquares } from "../src/power/rules";

const play = (st: PowerState, san: string, change = false) => { const g = new Chess(st.fen); const m = g.move(san); return afterMove(st, m, g.fen(), change); };

describe("Magical Chess: the seeded random", () => {
  it("is the same for the same seed and ply, and different for another ply", () => {
    expect(rng(42, 3)()).toBe(rng(42, 3)());
    expect(rng(42, 3)()).not.toBe(rng(42, 4)());
  });
  it("orbs appear about 1 time in 6, never more than 3, only on safe empty squares in ranks 3-6", () => {
    let spawned = 0;
    for (let seed = 0; seed < 600; seed++) {
      const st = maybeSpawn(newPower(seed));
      if (st.orbs.length) {
        spawned++;
        const o = st.orbs[0];
        expect(+o.sq[1]).toBeGreaterThanOrEqual(3); expect(+o.sq[1]).toBeLessThanOrEqual(6);
        expect(spawnSquares(newPower(seed))).toContain(o.sq);
      }
    }
    expect(spawned).toBeGreaterThan(60); expect(spawned).toBeLessThan(150);
    const full = { ...newPower(1), orbs: [{ sq: "a4", piece: "n" }, { sq: "b4", piece: "n" }, { sq: "c4", piece: "n" }] } as PowerState;
    for (let p = 0; p < 50; p++) expect(maybeSpawn({ ...full, ply: p }).orbs.length).toBe(MAX_ORBS);
  });
  it("never puts an orb where the side to move can step at once", () => {
    // White to move at the start can reach a3, a4, b3, b4 ... h4; none of those may be offered
    const sq = spawnSquares(newPower(1));
    for (const s of ["a3", "a4", "e4", "f3", "h3", "c3"]) expect(sq).not.toContain(s);
    expect(sq).toContain("e5");
  });
});

describe("Magical Chess: landing on a gem", () => {
  const withGem = (fen: string, sq: string, piece: "n" | "b" | "r" | "q"): PowerState => ({ fen, orbs: [{ sq: sq as never, piece }], seed: 7, ply: 0 });
  it("changing turns the piece into the gem's piece, as part of the move: the turn passes once", () => {
    const st = play(withGem(new Chess().fen(), "f3", "r"), "Nf3", true);
    const g = new Chess(st.fen);
    expect(g.get("f3")).toEqual({ type: "r", color: "w" }); expect(g.turn()).toBe("b");
    expect(st.orbs.some(o => o.sq === "f3")).toBe(false);
  });
  it("staying keeps the piece, and the gem is used up all the same", () => {
    const st = play(withGem(new Chess().fen(), "f3", "r"), "Nf3", false);
    expect(new Chess(st.fen).get("f3")).toEqual({ type: "n", color: "w" });
    expect(st.orbs.some(o => o.sq === "f3")).toBe(false);
  });
  it("a king walks over a gem: it can't use it, and the gem stays", () => {
    const st = withGem("4k3/8/8/8/8/8/8/4K3 w - - 0 1", "e2", "q");
    expect(gemFor(st, { to: "e2", piece: "k" })).toBeUndefined();
    const after = play(st, "Ke2", true);
    expect(new Chess(after.fen).get("e2")).toEqual({ type: "k", color: "w" }); expect(after.orbs.some(o => o.sq === "e2")).toBe(true);
  });
  it("can give checkmate, like a promotion", () => {
    // the bishop lands on the e8 gem and becomes a rook: a back-rank mate, the king boxed in by its own pawns
    const st = withGem("7k/6pp/8/8/B7/8/8/6K1 w - - 0 1", "e8", "r");
    expect(new Chess(play(st, "Be8", true).fen).isCheckmate()).toBe(true);
    expect(new Chess(play(st, "Be8", false).fen).isCheckmate()).toBe(false);
  });
  it("a pawn that changes leaves no en-passant square behind", () => {
    const fen = changeFen("4k3/8/8/3p4/4P3/8/8/4K3 w - d6 0 2", "d5", "n");
    expect(fen.split(" ")[3]).toBe("-"); expect(new Chess(fen).get("d5")).toEqual({ type: "n", color: "b" });
  });
});
