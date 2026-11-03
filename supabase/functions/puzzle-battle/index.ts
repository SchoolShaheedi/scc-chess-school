// puzzle-battle (class features 2026-11-03, not yet in DECISIONS.md): the ONLY way a Puzzle Battle starts, scores or ends. Like play-move it takes the caller's
// sign-in, checks they own the player they act for, and judges everything itself, so a modified app can't fake a score:
//   * the puzzle SOLUTIONS never leave the server: the set stored on the battle holds only the start position and the
//     opponent's first move; each answer is one move, judged here against the real line (fetched from the public bank);
//   * time is the server's: the battle starts at started_at (set here, after a countdown), and an answer outside the
//     three minutes (plus a short grace), or faster than a person can play, is refused;
//   * the winner is worked out here (src/battle/rules.ts, copied to ./rules.ts) and written with the end of the battle.
//
// POST { action: "accept", battle, player }       the invited player accepts: picks the puzzle set, starts the countdown
// POST { action: "move", battle, player, uci }    one of the solver's moves in the current puzzle
// POST { action: "claim", battle, player }        time is up (or both are through the set): finish the battle
//
// The database write uses Supabase's server key, which Supabase gives every server function (SUPABASE_SERVICE_ROLE_KEY).
// It exists only on Supabase's servers. The invite, decline, cancel and leave steps are database functions (battles.sql).
import { createClient } from "npm:@supabase/supabase-js@2";
import { Chess } from "npm:chess.js@1.4.0";
import {
  BATTLE_BANDS, BATTLE_COUNTDOWN_MS, BATTLE_SET, inWindow, isLevel, judgeMove, outcome, pickSet, plausible, publicOf,
  type PoolPuzzle, type PublicPuzzle, type Tally,
} from "./rules.ts";

const ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map(s => s.trim()).filter(Boolean).concat(["https://scc-chess-school.pages.dev", "https://localhost", "capacitor://localhost", "http://localhost:8752", "http://127.0.0.1:8752"]);
// where the puzzle bank is served from (the app's own site); the bank is public, the SOLUTIONS are used only in here
const SITE = (Deno.env.get("SITE_URL") ?? "https://scc-chess-school.pages.dev").replace(/\/$/, "");
let cors: Record<string, string> = {};
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// the bank, fetched from the site the first time a band is needed and kept while this function instance lives
let indexP: Promise<{ bands: { min: number; file: string }[] }> | null = null;
const bands = new Map<number, Promise<Map<string, PoolPuzzle>>>();
const bankIndex = () => (indexP ??= fetch(`${SITE}/puzzles/bank/index.json`).then(r => { if (!r.ok) throw new Error("bank"); return r.json(); }).catch(e => { indexP = null; throw e; }));
function bandOf(min: number): Promise<Map<string, PoolPuzzle>> {
  if (!bands.has(min)) bands.set(min, bankIndex().then(async ix => {
    const b = ix.bands.find((x: { min: number }) => x.min === min); if (!b) return new Map();
    const res = await fetch(`${SITE}/puzzles/bank/${b.file}`); if (!res.ok) throw new Error("bank");
    const out = new Map<string, PoolPuzzle>();
    for (const line of (await res.text()).split("\n")) {
      if (!line) continue;
      const [id, fen, moves, rating] = line.split("\t");
      out.set(id, { id, fen, moves: moves.split(" "), rating: +rating });
    }
    return out;
  }).catch(e => { bands.delete(min); throw e; }));
  return bands.get(min)!;
}

Deno.serve(async req => {
  const origin = req.headers.get("Origin") ?? "";
  cors = { "Access-Control-Allow-Origin": ALLOWED.includes(origin) ? origin : ALLOWED[0], "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "POST only" });
  const url = Deno.env.get("SUPABASE_URL")!;
  const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return reply(401, { error: "sign in first" });
  let body: { action?: string; battle?: string; player?: string; uci?: string };
  try { body = await req.json(); } catch { return reply(400, { error: "bad request" }); }
  const { action, battle: battleId, player, uci } = body;
  if (!battleId || !player || !["accept", "move", "claim"].includes(action ?? "")) return reply(400, { error: "bad request" });
  if (action === "move" && !(typeof uci === "string" && /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci))) return reply(400, { error: "bad move" });

  const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: me } = await db.from("online_players").select("id").eq("id", player).eq("parent", user.id).maybeSingle();
  if (!me) return reply(403, { error: "not your player" });
  const { data: bt } = await db.from("battles").select("*").eq("id", battleId).maybeSingle();
  if (!bt) return reply(404, { error: "no such battle" });
  if (bt.from_player !== player && bt.to_player !== player) return reply(403, { error: "not your battle" });
  const now = Date.now();

  // ---------- accept: only the invited player; the database re-checks friends/classmates and that the invite is fresh ----------
  if (action === "accept") {
    if (bt.to_player !== player) return reply(403, { error: "only the invited player can accept" });
    if (bt.status !== "invited") return reply(409, { error: "that invitation has gone" });
    if (!isLevel(bt.level)) return reply(500, { error: "battle state error" });
    let pool: { puzzle: PoolPuzzle; band: number }[];
    try {
      pool = (await Promise.all(BATTLE_BANDS[bt.level].map(async band => [...(await bandOf(band)).values()].map(puzzle => ({ puzzle, band }))))).flat();
    } catch { return reply(502, { error: "the puzzle bank is not reachable, try again" }); }
    const bandFor = new Map(pool.map(x => [x.puzzle.id, x.band]));
    const set = pickSet(pool.map(x => x.puzzle), BATTLE_SET, Math.random);
    if (set.length < BATTLE_SET) return reply(502, { error: "not enough puzzles, try again" });
    const puzzles: PublicPuzzle[] = set.map(p => publicOf(p, bandFor.get(p.id)!));
    const { data, error } = await db.rpc("battle_begin", { p_battle: battleId, p_player: player, p_puzzles: puzzles });
    if (error) return reply(409, { error: error.message });
    return reply(200, { ok: true, started_at: data, countdown_ms: BATTLE_COUNTDOWN_MS });
  }

  if (bt.status !== "active") return reply(409, { error: "the battle is not running" });
  const side = bt.from_player === player ? "a" : "b";
  const tally = (s: "a" | "b"): Tally => ({ solved: bt[`${s}_solved`], missed: bt[`${s}_missed`], lastAt: bt[`${s}_last`] ? Date.parse(bt[`${s}_last`]) : null, idx: bt[`${s}_idx`] });
  const startMs = Date.parse(bt.started_at), setLength = (bt.puzzles as unknown[]).length;
  const clock = { startMs, nowMs: now, setLength, target: bt.target, seconds: bt.seconds };
  const finishPatch = (a: Tally, b: Tally) => {
    const o = outcome(a, b, clock);
    return o.over ? { o, patch: { status: "finished", winner: o.winner, reason: o.reason, finished_at: new Date(now).toISOString() } } : { o, patch: {} };
  };
  const ta = tally("a"), tb = tally("b");

  // ---------- claim: time is up, or both are through the set ----------
  if (action === "claim") {
    const { o, patch } = finishPatch(ta, tb);
    if (!o.over) return reply(409, { error: "there is still time" });
    const { data, error } = await db.from("battles").update(patch).eq("id", bt.id).eq("status", "active").select("id");
    return error || !data?.length ? reply(409, { error: "the battle changed, try again" }) : reply(200, { ok: true, over: true, winner: o.winner, reason: o.reason });
  }

  // ---------- move ----------
  // the clock decides first: too late, or the battle is already decided, ends it as it stands
  if (now < startMs) return reply(409, { error: "it has not started yet" });
  if (!inWindow(now, startMs, bt.seconds) || finishPatch(ta, tb).o.over) {
    const { o, patch } = finishPatch(ta, tb);
    if (o.over) await db.from("battles").update(patch).eq("id", bt.id).eq("status", "active");
    return reply(409, { error: "the battle is over", over: o.over, winner: o.winner, reason: o.reason });
  }
  const mine = tally(side);
  if (mine.idx >= setLength) return reply(409, { error: "you have finished the set" });
  const lastT = bt[`${side}_t`] ? Date.parse(bt[`${side}_t`]) : null;
  if (!plausible(now, lastT, startMs)) return reply(429, { error: "too fast" });
  const step: number = bt[`${side}_step`];
  const pub = (bt.puzzles as PublicPuzzle[])[mine.idx];
  let line: PoolPuzzle | undefined;
  try { line = (await bandOf(pub.band)).get(pub.id); } catch { return reply(502, { error: "the puzzle bank is not reachable, try again" }); }
  if (!line) return reply(500, { error: "battle state error" });
  // would this move checkmate? (any mate is right on the last move, as in the app's own puzzles)
  const mates = (m: string) => {
    try { const g = new Chess(line!.fen); for (const x of line!.moves.slice(0, step)) g.move({ from: x.slice(0, 2), to: x.slice(2, 4), promotion: x[4] }); g.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] }); return g.isCheckmate(); } catch { return false; }
  };
  const v = judgeMove(line.moves, step, uci!, mates);
  const stamp = new Date(now).toISOString();
  const next: Tally = { ...mine }, patch: Record<string, unknown> = { [`${side}_t`]: stamp };
  if (v.ok && !v.solved) patch[`${side}_step`] = v.step;
  else {
    patch[`${side}_step`] = 1; next.idx++; patch[`${side}_idx`] = next.idx;
    if (v.solved) { next.solved++; next.lastAt = now; patch[`${side}_solved`] = next.solved; patch[`${side}_last`] = stamp; }
    else { next.missed++; patch[`${side}_missed`] = next.missed; }
  }
  const { o, patch: end } = finishPatch(side === "a" ? next : tally("a"), side === "b" ? next : tally("b"));
  // only if this side has not moved meanwhile (a double tap), and the battle is still running
  const { data, error } = await db.from("battles").update({ ...patch, ...end }).eq("id", bt.id).eq("status", "active")
    .eq(`${side}_idx`, mine.idx).eq(`${side}_step`, step).select("id");
  if (error || !data?.length) return reply(409, { error: "the battle changed, try again" });
  return reply(200, { ok: v.ok, solved: v.solved, reply: v.reply, over: o.over, winner: o.winner, reason: o.reason });
});
