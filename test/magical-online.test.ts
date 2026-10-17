// Magical Chess online (Stage 2): the server's checks agree with the app's game, and its copy of the rules is current.
import { readFileSync } from "node:fs";
import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";
import { afterMove, gemFor, newPower, rng, type PowerState } from "../src/power/rules";
import { magicalLine, playMagical, replayMagical } from "../src/power/online";
// @ts-expect-error a plain .mjs build script, no types
import { forServer } from "../tools/sync-magical.mjs";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

describe("the server's copy of the rules", () => {
  it("is exactly the app's (run node tools/sync-magical.mjs after changing src/power/rules.ts or online.ts)", () => {
    for (const f of ["rules.ts", "online.ts"]) expect(read(`../supabase/functions/play-move/power/${f}`)).toBe(forServer(read(`../src/power/${f}`)));
  });
});

/** A random Magical Chess game played the way the app plays it, changing on some gems. */
function randomGame(seed: number) {
  const pick = rng(seed, 9999);
  let st: PowerState = newPower(seed);
  const moves: string[] = [], changes: number[] = [], states: PowerState[] = [];
  for (let ply = 0; ply < 80; ply++) {
    const g = new Chess(st.fen), legal = g.moves({ verbose: true });
    if (!legal.length || g.isGameOver()) break;
    // prefer a move onto a gem now and then, so changes really happen
    const onGem = legal.filter(m => gemFor(st, m));
    const m = onGem.length && pick() < .6 ? onGem[Math.floor(pick() * onGem.length)] : legal[Math.floor(pick() * legal.length)];
    const change = !!gemFor(st, m) && pick() < .7;
    g.move(m);
    try { st = afterMove(st, m, g.fen(), change); } catch { break; }   // a change that would make an impossible position
    moves.push(m.lan); if (change) changes.push(ply); states.push(st);
  }
  return { moves, changes, states };
}

describe("the server's replay", () => {
  it("rebuilds the same position and the same gems as the game, after every move, over 200 random games", () => {
    let changed = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const { moves, changes, states } = randomGame(seed * 7919);
      changed += changes.length;
      const mid = Math.floor(moves.length / 2);
      for (const i of moves.length ? [mid] : []) expect(replayMagical(seed * 7919, moves.slice(0, i + 1), changes.filter(c => c <= i))).toEqual(states[i]);
      const end = replayMagical(seed * 7919, moves, changes);
      expect(end).toEqual(states.at(-1) ?? newPower(seed * 7919));
    }
    expect(changed).toBeGreaterThan(50);   // the games really did change pieces
  }, 60_000);
  it("accepts each move of a real game, with its changes, one at a time", () => {
    const seed = 4242, { moves, changes, states } = randomGame(seed);
    for (let i = 0; i < moves.length; i++) {
      const r = playMagical(seed, moves.slice(0, i), changes.filter(c => c < i), moves[i], changes.includes(i));
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.st).toEqual(states[i]);
    }
  });
  it("the screen's line has every state, and writes a change the way the bot game does (=R✨)", () => {
    for (let seed = 1; seed < 50; seed++) {
      const { moves, changes, states } = randomGame(seed);
      if (!changes.length) continue;
      const l = magicalLine(seed, moves, changes);
      expect(l.states.slice(1)).toEqual(states);
      expect(l.sans[changes[0]]).toMatch(/=[NBRQ][+#]?✨$/);
      expect(l.sans.filter(x => x.endsWith("✨"))).toHaveLength(changes.length);
      return;
    }
    throw new Error("no game with a change");
  });
  it("refuses an illegal move, and a change where no gem is", () => {
    expect(playMagical(1, [], [], "e2e5", false)).toEqual({ ok: false, error: "illegal move" });
    expect(playMagical(1, [], [], "e2e4", true)).toEqual({ ok: false, error: "no gem there" });
  });
  it("lets a king walk over a gem but never change", () => {
    // find a game position with a gem a king can step onto
    for (let seed = 1; seed < 3000; seed++) {
      const { moves, changes, states } = randomGame(seed);
      for (let i = 0; i < states.length; i++) {
        const st = states[i], g = new Chess(st.fen);
        const k = g.moves({ verbose: true }).find(m => m.piece === "k" && st.orbs.some(o => o.sq === m.to));
        if (!k) continue;
        const prior = moves.slice(0, i + 1), pc = changes.filter(c => c <= i);
        expect(playMagical(seed, prior, pc, k.lan, true)).toEqual({ ok: false, error: "no gem there" });
        const walk = playMagical(seed, prior, pc, k.lan, false);
        expect(walk.ok && walk.st.orbs.some(o => o.sq === k.to)).toBe(true);   // the gem stays
        return;
      }
    }
    throw new Error("no king-on-gem position found");
  });
});
