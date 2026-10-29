// The opening facts (DECISIONS #130). Always: every opening has its naming ply, its tags and its numbers, and the
// numbers add up. With OPENING_STATS=1 it rebuilds src/content/opening-stats.json from the explorer data.
import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { readFileSync, writeFileSync } from "node:fs";
import { COURSE } from "../src/content/course";
import { NAMED_AT, TAGS, statsFor } from "../src/openings/facts";

describe("opening facts", () => {
  it("every opening has a naming ply, tags and numbers that add up to about 100%", () => {
    for (const o of COURSE) {
      expect(NAMED_AT[o.id], o.id).toBeGreaterThan(0);
      expect(TAGS[o.id], o.id).toBeTruthy();
      const s = statsFor(o.id); expect(s, `${o.id}: run OPENING_STATS=1 npx vitest run test/opening-stats.test.ts`).toBeTruthy();
      expect(Math.abs(s!.white + s!.draw + s!.black - 100), o.id).toBeLessThanOrEqual(2);
      expect(s!.you).toBe(o.side === "w" ? s!.white : s!.black);
    }
  });
});

describe.runIf(process.env.OPENING_STATS === "1")("opening facts: rebuild", () => {
  it("measures every opening at the move that names it", () => {
    const EX = JSON.parse(readFileSync(new URL("../public/explorer/explorer.json", import.meta.url), "utf8"));
    const key = (f: string) => f.split(" ").slice(0, 4).join(" ");
    const P = (x: number) => Math.round(x * 100);
    const uci = (m: { from: string; to: string; promotion?: string }) => m.from + m.to + (m.promotion ?? "");
    const total = (l: [string, number][]) => l.reduce((a, x) => a + x[1], 0);
    const out: Record<string, unknown> = {};
    for (const o of COURSE) {
      const m = o.main.moves, ply = NAMED_AT[o.id], g = new Chess();
      for (let i = 0; i < ply - 1; i++) g.move(m[i]);
      const list = EX.positions[key(g.fen())]; const mv = g.move(m[ply - 1]);
      const e = list?.find((x: [string]) => x[0] === uci(mv));
      expect(e, `${o.id}: the explorer has no games at its naming move`).toBeTruthy();
      const [n, w, d] = [e[1], e[2], e[3]], b = n - w - d;
      const replies = EX.positions[key(g.fen())] ?? [];
      const reply = replies[0] ? { san: new Chess(g.fen()).move({ from: replies[0][0].slice(0, 2), to: replies[0][0].slice(2, 4), promotion: replies[0][0][4] }).san, share: P(replies[0][1] / total(replies)) } : null;
      // the model win's road: the first move where it leaves the main line, if the explorer reaches it and it is common enough to quote
      const win = o.win.moves; let dev = 0; while (dev < win.length && win[dev] === m[dev]) dev++;
      const h = new Chess(); for (let i = 0; i < dev; i++) h.move(win[i]);
      const wl = EX.positions[key(h.fen())]; let road = null;
      if (wl && dev < win.length) { const t = h.move(win[dev]); const we = wl.find((x: [string]) => x[0] === uci(t));
        if (we && we[1] >= 100 && we[1] / total(wl) >= .01) road = { move: t.san, share: Math.round(we[1] / total(wl) * 1000) / 10, games: we[1] }; }
      out[o.id] = { games: n, popular: P(n / total(list)), white: P(w / n), draw: P(d / n), black: P(b / n), you: P((o.side === "w" ? w : b) / n), reply, road };
    }
    writeFileSync(new URL("../src/content/opening-stats.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
  });
});
