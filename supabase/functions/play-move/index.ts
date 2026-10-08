// play-move (DECISIONS #86): the ONLY way a move, a clock or a result is written for an online game.
// It checks who the caller is (their sign-in), that they own the player whose turn it is, that the move is legal
// (chess.js, the same rules as the app), and keeps both clocks by the server's own time, so a modified app can't
// cheat. It also ends the game on mate, stalemate, repetition, the fifty-move rule, dead material, or time.
//
// POST { game, player, uci }           a move
// POST { game, player, claim: "time" } the opponent's clock has run out
//
// The database write uses Supabase's server key, which Supabase gives every server function automatically
// (SUPABASE_SERVICE_ROLE_KEY). It exists only on Supabase's servers: it is never in the app or in this repository.
import { createClient } from "npm:@supabase/supabase-js@2";
import { Chess } from "npm:chess.js@1.4.0";

// only the app's own addresses may call it from a browser: the live site, this computer's test address, and any
// others set in ALLOWED_ORIGINS (comma-separated; e.g. a custom domain later)
const ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map(s => s.trim()).filter(Boolean).concat(["https://scc-chess-school.pages.dev", "http://localhost:8752", "http://127.0.0.1:8752"]);
let cors: Record<string, string> = {};
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async req => {
  const origin = req.headers.get("Origin") ?? "";
  cors = { "Access-Control-Allow-Origin": ALLOWED.includes(origin) ? origin : ALLOWED[0], "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply(405, { error: "POST only" });
  const url = Deno.env.get("SUPABASE_URL")!;
  // who is calling: their own sign-in token, checked by Supabase
  const asUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return reply(401, { error: "sign in first" });
  let body: { game?: string; player?: string; uci?: string; claim?: string };
  try { body = await req.json(); } catch { return reply(400, { error: "bad request" }); }
  const { game: gameId, player, uci, claim } = body;
  if (!gameId || !player || (!uci && claim !== "time")) return reply(400, { error: "bad request" });
  if (uci && !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) return reply(400, { error: "bad move" });

  const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: me } = await db.from("online_players").select("id").eq("id", player).eq("parent", user.id).maybeSingle();
  if (!me) return reply(403, { error: "not your player" });
  const { data: g } = await db.from("games").select("*").eq("id", gameId).maybeSingle();
  if (!g) return reply(404, { error: "no such game" });
  if (g.white !== player && g.black !== player) return reply(403, { error: "not your game" });
  if (g.status !== "active") return reply(409, { error: "the game is over" });

  // replay from the start, so repetition and the fifty-move rule are judged on the whole game
  const chess = new Chess();
  for (const m of g.moves as string[]) chess.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m[4] });
  const turn = chess.turn(), now = Date.now();
  const timed = g.tc_min > 0, since = g.turn_since ? Date.parse(g.turn_since) : null;
  const left = (side: "w" | "b") => {
    const base = side === "w" ? g.white_ms : g.black_ms;
    return timed && side === turn && since !== null ? base - (now - since) : base;
  };
  const finish = async (result: string, reason: string, patch: Record<string, unknown> = {}) => {
    const { data, error } = await db.from("games").update({ ...patch, status: "finished", result, reason, draw_offer: null, updated_at: new Date(now).toISOString() })
      .eq("id", g.id).eq("status", "active").eq("updated_at", g.updated_at).select("id");   // only if nobody changed it meanwhile (updated_at is the version)
    return error || !data?.length ? reply(409, { error: "the game changed, try again" }) : reply(200, { ok: true, result, reason });
  };
  // out of time (FIDE 6.9) loses, unless the opponent could not mate by any legal series of moves: only a king; a lone
  // knight or bishop against a bare king; or nothing but bishops on one square colour (dead). The app has the same rule.
  const flagResult = (flagged: "w" | "b") => {
    const pieces = chess.board().flat().filter(p => p && p.type !== "k") as { type: string; color: string }[];
    const mine = pieces.filter(p => p.color === flagged), theirs = pieces.filter(p => p.color !== flagged);
    const lose = flagged === "w" ? "0-1" : "1-0";
    if (!theirs.length) return "1/2-1/2";
    if (!mine.length && theirs.length === 1 && (theirs[0].type === "n" || theirs[0].type === "b")) return "1/2-1/2";
    if (pieces.every(p => p.type === "b")) {
      const shades = new Set(chess.board().flatMap((row, r) => row.map((p, f) => (p && p.type === "b" ? (r + f) % 2 : -1))).filter(x => x >= 0));
      if (shades.size === 1) return "1/2-1/2";
    }
    return lose;
  };

  if (claim === "time") {
    if (!timed || left(turn) > 0) return reply(409, { error: "there is still time" });
    return finish(flagResult(turn), "time", { [turn === "w" ? "white_ms" : "black_ms"]: 0 });
  }

  const mySide = g.white === player ? "w" : "b";
  if (mySide !== turn) return reply(409, { error: "not your turn" });
  if (timed && left(turn) <= 0) return finish(flagResult(turn), "time", { [turn === "w" ? "white_ms" : "black_ms"]: 0 });
  let mv;
  try { mv = chess.move({ from: uci!.slice(0, 2), to: uci!.slice(2, 4), promotion: uci![4] }); } catch { return reply(422, { error: "illegal move" }); }

  // the clock: White's first move starts it (nobody loses time settling in); then the mover is charged and gets the increment
  const patch: Record<string, unknown> = { moves: [...g.moves, mv.lan], fen: chess.fen(), draw_offer: null, updated_at: new Date(now).toISOString() };
  if (timed && since !== null) patch[turn === "w" ? "white_ms" : "black_ms"] = Math.max(0, left(turn)) + g.tc_inc * 1000;
  patch.turn_since = timed ? new Date(now).toISOString() : null;

  if (chess.isCheckmate()) return finish(turn === "w" ? "1-0" : "0-1", "mate", patch);
  if (chess.isStalemate()) return finish("1/2-1/2", "stalemate", patch);
  if (chess.isThreefoldRepetition()) return finish("1/2-1/2", "repetition", patch);
  if (chess.isInsufficientMaterial()) return finish("1/2-1/2", "material", patch);
  if (chess.isDraw()) return finish("1/2-1/2", "fifty", patch);

  const { data, error } = await db.from("games").update(patch).eq("id", g.id).eq("status", "active").eq("updated_at", g.updated_at).select("id");
  return error || !data?.length ? reply(409, { error: "the game changed, try again" }) : reply(200, { ok: true });
});
