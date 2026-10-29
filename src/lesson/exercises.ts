// Exercise runners. Each takes one exercise from a lesson file and drives the board until the
// learner finishes it, counting mistakes. A refused move is always explained (DECISIONS #16).
import { Chess, type Square as CjSquare } from "chess.js";
import { Board } from "../chess/board";
import { attackedBy, attacks, drillMoves, move } from "../chess/drill";
import { pieceHTML } from "../chess/pieces";
import { defend, engineGoalMet, judge, miniGameResult, SLIP, whyIllegal } from "../chess/rules";
import { botById, botMove } from "../bots/bots";
import { answerSquares } from "../chess/structure";
import { getEngine } from "../engine/browser";
import { asNumber } from "../engine/uci";
import { type PieceCode, type Placement, type Square, placementFromFen } from "../chess/types";
import { num, t, tx, type UIKey } from "../i18n";
import { canSkip, canWatch, firstSafeMove, firstStarsMove, goalMove, rungFor, topicKey, topicOf, watchLine, watchPick } from "./help";
import type {
  ChooseExercise, CoordExercise, EngineBestExercise, EngineVsExercise, Exercise, LineExercise, PickExercise, MateVsExercise, PlaceExercise, PlayExercise, PuzzleExercise, SafeExercise, StarsExercise, BotGameExercise, Text,
} from "./types";

export interface Ctx {
  board: Board;
  extra: HTMLElement;                           // room under the board for buttons
  say(text: string, tone?: "ok" | "no" | "info"): void;
  status(html: string): void;                   // small counter line: "Stars left 2"
  done(mistakes: number): void;
  /** "Skip for now" (2026-10-29): called once an exercise has been failed 3 times. The player shows the button; where it is
   *  missing (the Puzzles tab, the placement test) nothing is offered. */
  offerSkip?(): void;
  /** "Watch me do it": called after 2 failed attempts at a mate or a mini-game; `run` plays the winning side for the learner. */
  offerWatch?(run: () => Promise<void>): void;
}
type Cleanup = () => void;
const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/** The hint if the exercise has one, else the glow's own words. */
const hintOr = (ex: { hint?: Text }, key: UIKey) => ex.hint ? tx(ex.hint) : t(key);

/** The opponent's best reply, for "why that was wrong". Null when no engine is ready within a moment: then it is simply skipped. */
async function bestReply(fen: string): Promise<string | null> {
  try {
    const a = await Promise.race([getEngine().analyse(fen, { depth: 8 }), wait(1500).then(() => null)]);
    return a?.best ?? null;
  } catch { return null; }
}

/** The engine plays the learner's side for "Watch me do it". */
const engineBestMove = (depth: number) => async (fen: string) => (await getEngine().analyse(fen, { depth })).best;

/** Why a drill piece cannot go to `to`: blocked on its line, or not its shape of move at all. */
function whyRefused(board: Placement, from: Square, to: Square): string {
  const p = board[from]!;
  if (board[to]?.[0] === p[0]) return t("whyBlocked");
  const open = attacks({ [from]: p }, from, p);           // same piece on an empty board
  const pawnPush = p[1] === "P";
  if (open.includes(to) || (pawnPush && drillMoves({ [from]: p }, from).includes(to))) return t("whyBlocked");
  return t(`why${p[1]}` as UIKey);
}

function runCoord(ex: CoordExercise, c: Ctx): Cleanup {
  let i = 0, mistakes = 0, wrong = 0;
  const ask = () => { c.say(`${t("tapSquare")} <b class="sqname">${ex.targets[i]}</b>`); c.status(`${num(i + 1)} / ${num(ex.targets.length)}`); };
  c.board.set({});
  c.board.interact({
    onTap: s => {
      if (s === ex.targets[i]) {
        wrong = 0;
        c.board.mark({ flash: { sq: s, ok: true }, highlights: [], stars: [] });
        if (++i === ex.targets.length) { c.say(t("wellDone"), "ok"); c.done(mistakes); return; }
        ask();
      } else {
        mistakes++; wrong++;
        c.board.mark({ flash: { sq: s, ok: false } });
        c.say(`<b class="sqname">${s}</b> ✗ · ${t("tapSquare")} <b class="sqname">${ex.targets[i]}</b>`, "no");
        // the help ladder: 2 misses light up the column (and give the hint), 3 put a star on the square
        const target = ex.targets[i], rung = rungFor(wrong);
        if (rung === "hint") {
          c.board.mark({ highlights: [1, 2, 3, 4, 5, 6, 7, 8].map(r => target[0] + r) });
          c.say(`${ex.hint ? tx(ex.hint) + " " : ""}${t("helpCoordFile").replaceAll("{f}", target[0])}`);
        } else if (rung === "arrow") { c.board.mark({ stars: [target], highlights: [] }); c.say(t("helpCoordHere")); }
        if (canSkip(wrong)) c.offerSkip?.();
      }
    },
  });
  ask();
  return () => {};
}

function runStars(ex: StarsExercise, c: Ctx): Cleanup {
  let pos: Placement, stars: Square[], moves = 0, mistakes = 0, alive = true;
  const counter = () => c.status(`${t("starsLeft")} <b>${num(stars.length)}</b>`
    + (ex.maxMoves ? ` · ${t("movesLeft")} <b>${num(ex.maxMoves - moves)}</b>` : ""));
  const reset = () => { pos = { ...ex.pieces }; stars = [...ex.stars]; moves = 0; c.board.set(pos, { stars }); counter(); };
  // the help ladder: 2 misses glow the piece to move (or give the hint), 3 draw the arrow and offer "Skip for now"
  const help = () => {
    const rung = rungFor(mistakes);
    if (rung === "none") return;
    const cap = ex.maxMoves ? ex.maxMoves - moves : 8;
    let m = firstStarsMove(pos, stars, ex.only, Math.min(cap, 8));
    if (!m) { reset(); m = firstStarsMove(pos, stars, ex.only, Math.min(ex.maxMoves ?? 8, 8)); }   // this attempt can no longer finish: start again
    if (rung === "hint") { c.board.mark({ stars, highlights: m ? [m[0]] : [] }); c.say(hintOr(ex, "helpLookPiece")); }
    else { c.board.mark({ stars, highlights: m ? [m[0]] : [], arrows: m ? [m] : [] }); c.say(t("helpArrow")); }
    if (canSkip(mistakes)) c.offerSkip?.();
  };
  c.board.interact({
    canPick: s => pos[s]?.[0] !== "w" ? t("whyNotYours") : ex.only && pos[s]![1] !== ex.only ? t("whyWall") : true,
    targets: s => drillMoves(pos, s),
    onTap: s => c.say(pos[s]?.[0] === "b" ? t("whyNotYours") : pos[s] ? t("whyWall") : t("whyPickFirst"), pos[s] ? "no" : "info"),
    onMove: async (from, to) => {
      if (!drillMoves(pos, from).includes(to)) {
        mistakes++; c.board.shake(to); c.say(whyRefused(pos, from, to), "no"); help(); return;
      }
      pos = move(pos, from, to); moves++;
      stars = stars.filter(s => s !== to);
      c.board.set(pos, { stars, lastMove: [from, to] }, [from, to]);
      counter();
      if (!stars.length) { c.say(t("wellDone"), "ok"); c.done(mistakes); return; }
      if (ex.maxMoves && moves >= ex.maxMoves) {
        mistakes++; c.say(t("tooManyMoves"), "no");
        await wait(1100); if (alive) { reset(); c.say(tx(ex.prompt)); help(); }
      }
    },
  });
  reset();
  return () => { alive = false; };
}

function runSafe(ex: SafeExercise, c: Ctx): Cleanup {
  let pos: Placement, moves = 0, mistakes = 0, alive = true;
  const king = () => Object.keys(pos).find(s => pos[s] === "wK")!;
  const counter = () => c.status(ex.maxMoves ? `${t("movesLeft")} <b>${num(ex.maxMoves - moves)}</b>` : "");
  const reset = () => { pos = { ...ex.pieces }; moves = 0; c.board.set(pos, { goal: ex.goal, stars: [ex.goal] }); counter(); };
  // the help ladder: 2 misses glow the king (or give the hint), 3 draw the safe next step and offer "Skip for now"
  const help = () => {
    const rung = rungFor(mistakes);
    if (rung === "none") return;
    const cap = ex.maxMoves ? ex.maxMoves - moves : 12;
    let m = firstSafeMove(pos, ex.goal, cap);
    if (!m) { reset(); m = firstSafeMove(pos, ex.goal, ex.maxMoves ?? 12); }
    const marks = { goal: ex.goal, stars: [ex.goal], highlights: m ? [m[0]] : [] };
    if (rung === "hint") { c.board.mark(marks); c.say(hintOr(ex, "helpLookPiece")); }
    else { c.board.mark({ ...marks, arrows: m ? [m] : [], crosses: [] }); c.say(t("helpArrow")); }
    if (canSkip(mistakes)) c.offerSkip?.();
  };
  c.board.interact({
    canPick: s => pos[s] === "wK" ? true : t("whyNotYours"),
    targets: s => drillMoves(pos, s),
    onTap: () => c.say(t("whyPickFirst"), "info"),
    onMove: async (from, to) => {
      if (!drillMoves(pos, from).includes(to)) { mistakes++; c.board.shake(to); c.say(t("whyK"), "no"); help(); return; }
      const next = move(pos, from, to);
      if (attackedBy(next, "b").has(to)) {
        mistakes++; c.board.shake(to);
        // show who attacks that square, so the learner sees the reason, not just hears it
        const attackers = Object.keys(next).filter(s => next[s]?.[0] === "b" && attacks(next, s, next[s]!).includes(to));
        c.board.mark({ crosses: [to], highlights: attackers, arrows: attackers.map(a => [a, to] as [Square, Square]) });
        c.say(t("whyUnsafe"), "no");
        if (rungFor(mistakes) !== "none") { await wait(1200); if (alive) help(); }   // let the reason be seen before the answer
        return;
      }
      pos = next; moves++;
      c.board.set(pos, { goal: ex.goal, stars: to === ex.goal ? [] : [ex.goal], lastMove: [from, to] }, [from, to]);
      counter();
      if (king() === ex.goal) { c.say(t("wellDone"), "ok"); c.done(mistakes); return; }
      if (ex.maxMoves && moves >= ex.maxMoves) {
        mistakes++; c.say(t("tooManyMoves"), "no");
        await wait(1100); if (alive) { reset(); c.say(tx(ex.prompt)); help(); }
      }
    },
  });
  reset();
  return () => { alive = false; };
}

function runPlace(ex: PlaceExercise, c: Ctx): Cleanup {
  let pos: Placement = { ...(ex.start ?? {}) }, i = 0, mistakes = 0, wrong = 0;
  const ask = () => {
    const st = ex.steps[i];
    c.say(`<span class="tray">${pieceHTML(st.piece)}</span> ${t("whereGoes")}`);
    c.status(`${num(i + 1)} / ${num(ex.steps.length)}`);
  };
  c.board.set(pos);
  c.board.interact({
    onTap: s => {
      const st = ex.steps[i];
      if (st.squares.includes(s) && !pos[s]) {
        pos = { ...pos, [s]: st.piece }; wrong = 0;
        c.board.set(pos, { flash: { sq: s, ok: true } });
        if (++i === ex.steps.length) { c.say(t("wellDone"), "ok"); c.done(mistakes); return; }
        ask();
      } else {
        mistakes++; wrong++; c.board.shake(s); c.board.mark({ flash: { sq: s, ok: false } });
        c.say(ex.hint ? tx(ex.hint) : t("notQuite"), "no");
        // the help ladder: 2 misses glow the squares this piece may go to, 3 put a star on one and offer "Skip for now"
        const free = st.squares.filter(q => !pos[q]), rung = rungFor(wrong);
        if (rung === "hint") { c.board.mark({ highlights: free }); if (!ex.hint) c.say(t("helpSquares")); }
        else if (rung === "arrow") { c.board.mark({ highlights: free, stars: free.slice(0, 1) }); c.say(t("helpPickStar")); }
        if (canSkip(wrong)) c.offerSkip?.();
      }
    },
  });
  ask();
  return () => {};
}

function runChoose(ex: ChooseExercise, c: Ctx): Cleanup {
  let mistakes = 0;
  const b = ex.board;
  c.board.set(b?.fen ? placementFromFen(b.fen) : b?.pieces ?? {},
    { arrows: b?.arrows, highlights: b?.highlights, dots: b?.dots, crosses: b?.crosses, stars: b?.stars });
  c.board.interact({});
  c.say(tx(ex.prompt));
  c.extra.innerHTML = `<div class="choices">${ex.options.map((o, i) =>
    `<button class="choice" data-i="${i}">${tx(o.text)}</button>`).join("")}</div>`;
  c.extra.querySelectorAll<HTMLButtonElement>(".choice").forEach(btn => btn.onclick = () => {
    const o = ex.options[+btn.dataset.i!];
    if (o.correct) {
      btn.classList.add("ok");
      c.extra.querySelectorAll("button").forEach(x => (x as HTMLButtonElement).disabled = true);
      c.say(o.why ? tx(o.why) : t("correct"), "ok");
      c.done(mistakes);
    } else {
      mistakes++; btn.classList.add("no"); btn.disabled = true;
      c.say(o.why ? tx(o.why) : t("notQuite"), "no");
      // the help ladder: 2 misses give the hint and make the right answer glow; 3 offer "Skip for now"
      if (rungFor(mistakes) !== "none") {
        const right = c.extra.querySelector<HTMLButtonElement>(`.choice[data-i="${ex.options.findIndex(x => x.correct)}"]`);
        right?.classList.add("glow");
        c.say(`${o.why ? tx(o.why) + " " : ""}${hintOr(ex, "helpAnswer")}`, "no");
      }
      if (canSkip(mistakes)) c.offerSkip?.();
    }
  });
  return () => { c.extra.innerHTML = ""; };
}

/** Asks which piece a pawn becomes. Resolves to "q" | "r" | "b" | "n". */
export function pickPromotion(c: Ctx, color: "w" | "b"): Promise<string> {
  return new Promise(resolve => {
    c.extra.innerHTML = `<div class="promo"><b>${t("promoteTo")}</b>${(["q", "r", "b", "n"] as const).map(p =>
      `<button data-p="${p}" aria-label="${p}">${pieceHTML(`${color}${p.toUpperCase()}` as PieceCode)}</button>`).join("")}</div>`;
    c.extra.querySelectorAll<HTMLButtonElement>("[data-p]").forEach(b => b.onclick = () => { c.extra.innerHTML = ""; resolve(b.dataset.p!); });
  });
}

/** The king of the side to move, if it is in check, for the red glow. */
export const checkSquare = (g: Chess): Square | undefined =>
  g.inCheck() ? g.findPiece({ type: "k", color: g.turn() })[0] : undefined;

/** Explains a move chess.js refused: king safety first (Level 2), else the piece's own shape of move. */
export function refusal(fen: string, from: Square, to: Square): string {
  const k = whyIllegal(fen, from, to);
  return k ? t(k) : whyRefused(placementFromFen(fen), from, to);
}

function runPlay(ex: PlayExercise, c: Ctx): Cleanup {
  const game = new Chess(ex.fen);
  const me = game.turn();
  let mistakes = 0, done = false, busy = false, alive = true;
  // the help ladder: 2 misses glow the piece to move (or give the hint), 3 draw the arrow and offer "Skip for now"
  let helpFrom: Square[] = [], helpArrow: [Square, Square][] = [];
  const show = (last?: [Square, Square], anim = false) =>
    c.board.set(placementFromFen(game.fen()), { lastMove: last, check: checkSquare(game), highlights: helpFrom, arrows: helpArrow }, anim ? last : undefined);
  const help = () => {
    const rung = rungFor(mistakes);
    if (rung === "none") return;
    const m = goalMove(game.fen(), ex.goal);
    helpFrom = m ? [m[0]] : []; helpArrow = rung === "arrow" && m ? [m] : [];
    show();
    c.say(rung === "arrow" ? t("helpArrow") : hintOr(ex, "helpLookPiece"));
    if (canSkip(mistakes)) c.offerSkip?.();
  };
  c.board.setFlip(me === "b");
  show();
  c.status(t(me === "w" ? "whiteToMove" : "blackToMove"));
  c.board.interact({
    canPick: s => { if (done) return t("wellDone"); if (busy) return t("notQuite"); const p = game.get(s as CjSquare); return p && p.color === me ? true : t("whyNotYours"); },
    targets: s => game.moves({ square: s as CjSquare, verbose: true }).map(m => m.to),
    onTap: () => {},
    onMove: async (from, to) => {
      if (done || busy) return;
      const legal = game.moves({ square: from as CjSquare, verbose: true }).filter(m => m.to === to);
      if (!legal.length) { mistakes++; c.board.shake(to); c.say(refusal(game.fen(), from, to), "no"); help(); return; }
      const promo = legal[0].promotion ? await pickPromotion(c, me) : "";
      const uci = from + to + promo;
      const v = judge(game.fen(), uci, ex.goal);
      if (v.ok) {
        game.move({ from, to, promotion: promo || undefined });
        done = true; helpFrom = []; helpArrow = []; show([from, to], true);
        c.say(t("correct"), "ok"); c.done(mistakes); return;
      }
      if (!v.tryAnother) mistakes++;
      // show the consequence of a wrong-but-legal move for a moment, then put it back
      const before = game.fen();
      busy = true;
      helpFrom = []; helpArrow = [];
      game.move({ from, to, promotion: promo || undefined });
      show([from, to], true);
      c.say(t(v.why!), v.tryAnother ? "info" : "no");
      await wait(1300);
      if (!alive) return;
      game.load(before); busy = false; show();
      help();
    },
  });
  return () => { alive = false; c.board.setFlip(false); };
}

function runMateVs(ex: MateVsExercise, c: Ctx): Cleanup {
  let game: Chess, moves = 0, mistakes = 0, busy = false, alive = true, done = false;
  const me = new Chess(ex.fen).turn();
  const show = (last?: [Square, Square], anim = false) =>
    c.board.set(placementFromFen(game.fen()), { lastMove: last, check: checkSquare(game) }, anim ? last : undefined);
  const counter = () => c.status(`${t("movesLeft")} <b>${num(ex.maxMoves - moves)}</b>`);
  const reset = () => { game = new Chess(ex.fen); moves = 0; busy = false; show(); counter(); };
  // "Watch me do it": the engine mates for the learner (against the same stubborn defender), then it is their turn again
  const watch = async () => {
    reset(); busy = true; c.say(t("watching"));
    const out = await watchLine({
      fen: ex.fen, side: me, best: engineBestMove(18), reply: async f => defend(f),
      show: (g, last) => c.board.set(placementFromFen(g.fen()), { lastMove: last, check: checkSquare(g) }, last),
      pause: wait, alive: () => alive, stop: g => g.isCheckmate(), maxPlies: 90,
    });
    if (!alive || out === "gone") return;
    c.say(out === "stopped" ? t("checkmate") : t("watchHalf"), out === "stopped" ? "ok" : "info");
    await wait(1800); if (!alive) return;
    reset(); c.say(t("watchTry"));
  };
  const offerHelp = () => {
    if (canWatch(mistakes)) c.offerWatch?.(watch);
    if (canSkip(mistakes)) c.offerSkip?.();
  };
  const fail = async (key: UIKey) => {
    mistakes++; busy = true; c.say(t(key), "no");
    await wait(1600); if (!alive) return; reset(); c.say(canWatch(mistakes) && ex.hint ? tx(ex.hint) : tx(ex.prompt));
    offerHelp();
  };
  c.board.setFlip(me === "b");
  c.board.interact({
    canPick: s => { if (done) return t("wellDone"); if (busy) return t("notQuite"); const p = game.get(s as CjSquare); return p && p.color === me ? true : t("whyNotYours"); },
    targets: s => game.moves({ square: s as CjSquare, verbose: true }).map(m => m.to),
    onTap: () => {},
    onMove: async (from, to) => {
      if (done || busy) return;
      const legal = game.moves({ square: from as CjSquare, verbose: true }).filter(m => m.to === to);
      if (!legal.length) { c.board.shake(to); c.say(refusal(game.fen(), from, to), "no"); return; }
      const promo = legal[0].promotion ? await pickPromotion(c, me) : undefined;
      game.move({ from, to, promotion: promo }); moves++; show([from, to], true); counter();
      if (game.isCheckmate()) { done = true; c.say(t("checkmate"), "ok"); c.done(mistakes); return; }
      if (game.isStalemate()) return fail("mateStalemate");
      if (moves >= ex.maxMoves) return fail("mateOutOfMoves");
      busy = true; await wait(420); if (!alive) return;
      const reply = defend(game.fen())!;
      const r = game.move({ from: reply.slice(0, 2), to: reply.slice(2, 4) });
      show([r.from, r.to], true);
      if (r.captured) return fail("mateLost");
      busy = false;
    },
  });
  reset();
  return () => { alive = false; c.board.setFlip(false); };
}

function runEngineVs(ex: EngineVsExercise, c: Ctx): Cleanup {
  const engine = getEngine();
  const me = new Chess(ex.fen).turn();
  const depth = ex.depth ?? 12;
  let game: Chess, moves = 0, mistakes = 0, busy = false, alive = true, done = false;
  const show = (last?: [Square, Square], anim = false) =>
    c.board.set(placementFromFen(game.fen()), { lastMove: last, check: checkSquare(game) }, anim ? last : undefined);
  const counter = () => c.status(`${t("movesLeft")} <b>${num(ex.maxMoves - moves)}</b>`);
  const reset = () => { game = new Chess(ex.fen); moves = 0; busy = false; show(); counter(); };
  // "Watch me do it": the engine plays the learner's side, and replies as it would, then it is their turn again
  const watch = async () => {
    reset(); busy = true; c.say(t("watching"));
    const out = await watchLine({
      fen: ex.fen, side: me, best: engineBestMove(depth), reply: async f => (await getEngine().analyse(f, { depth })).best,
      show: (g, last) => c.board.set(placementFromFen(g.fen()), { lastMove: last, check: checkSquare(g) }, last),
      pause: wait, alive: () => alive,
      stop: (g, m) => g.isCheckmate() || (m.color === me && ex.goal !== "hold" && engineGoalMet(g, me, ex.goal, m)) || (ex.goal === "wipe" && engineGoalMet(g, me, "wipe")),
      maxPlies: Math.max(12, ex.maxMoves * 2),
    });
    if (!alive || out === "gone") return;
    c.say(out === "stopped" ? t("miniWin") : t("watchHalf"), out === "stopped" ? "ok" : "info");
    await wait(1800); if (!alive) return;
    reset(); c.say(t("watchTry"));
  };
  const fail = async (key: UIKey) => {
    mistakes++; busy = true; c.say(t(key), "no");
    await wait(1800); if (!alive) return; reset(); c.say(canWatch(mistakes) && ex.hint ? tx(ex.hint) : tx(ex.prompt));
    if (canWatch(mistakes)) c.offerWatch?.(watch);
    if (canSkip(mistakes)) c.offerSkip?.();
  };
  const win = (key: UIKey) => { done = true; c.status(""); c.say(t(key), "ok"); c.done(mistakes); };
  c.board.setFlip(me === "b");
  c.board.interact({
    canPick: s => { if (done) return t("wellDone"); if (busy) return t("engineThinking"); const p = game.get(s as CjSquare); return p && p.color === me ? true : t("whyNotYours"); },
    targets: s => game.moves({ square: s as CjSquare, verbose: true }).map(m => m.to),
    onTap: () => {},
    onMove: async (from, to) => {
      if (done || busy) return;
      const legal = game.moves({ square: from as CjSquare, verbose: true }).filter(m => m.to === to);
      if (!legal.length) { c.board.shake(to); c.say(refusal(game.fen(), from, to), "no"); return; }
      const promo = legal[0].promotion ? await pickPromotion(c, me) : undefined;
      const mv = game.move({ from, to, promotion: promo }); moves++; show([from, to], true); counter();
      busy = true; c.status(t("engineThinking"));
      // judge the move first: has it already met the goal, or thrown the result away?
      if (game.isCheckmate()) return win("checkmate");
      const a = await engine.analyse(game.fen(), { depth }); if (!alive) return;
      const mine = -asNumber(a.score);                       // engine scored it for the side to move: flip
      if (game.isGameOver()) return ex.goal === "hold" ? win("heldDraw") : fail("slipWin");
      if (ex.goal !== "hold" && mine < SLIP[ex.goal]) return fail("slipWin");
      if (ex.goal === "hold" && mine < SLIP.hold) return fail("slipDraw");
      if (ex.goal !== "hold" && engineGoalMet(game, me, ex.goal, mv)) return win(ex.goal === "promote" && mv.promotion ? "promoted" : "wiped");
      if (ex.goal === "hold" && moves >= ex.maxMoves) return win("heldDraw");
      if (moves >= ex.maxMoves) return fail("mateOutOfMoves");
      // the engine's reply is the best move it found
      await wait(250); if (!alive) return;
      const r = game.move({ from: a.best.slice(0, 2), to: a.best.slice(2, 4), promotion: a.best[4] });
      show([r.from, r.to], true); counter();
      if (game.isCheckmate()) return fail(ex.goal === "hold" ? "slipDraw" : "slipWin");
      if (game.isGameOver()) return ex.goal === "hold" ? win("heldDraw") : fail("slipWin");
      if (ex.goal === "wipe" && engineGoalMet(game, me, "wipe")) return win("wiped");
      busy = false;
    },
  });
  reset();
  return () => { alive = false; c.board.setFlip(false); };
}

/** A mini-game against a bot (Pawn Wars, a piece against pawns). A loss or draw starts it again and counts as one try. */
function runBotGame(ex: BotGameExercise, c: Ctx): Cleanup {
  const bot = botById(ex.bot)!, me = new Chess(ex.fen).turn();
  let game = new Chess(ex.fen), tries = 0, busy = false, alive = true, done = false;
  const show = (last?: [Square, Square], anim = false) =>
    c.board.set(placementFromFen(game.fen()), { lastMove: last, check: checkSquare(game) }, anim ? last : undefined);
  const settle = async (r: ReturnType<typeof miniGameResult>) => {
    if (!r) return false;
    if (r === "win") { done = true; c.status(""); c.say(t("miniWin"), "ok"); c.done(tries); return true; }
    tries++; busy = true; c.say(t(r === "lose" ? "miniLose" : "miniDraw"), "no");
    await wait(1800); if (!alive) return true;
    game = new Chess(ex.fen); busy = false; show(); c.say(canWatch(tries) && ex.hint ? tx(ex.hint) : tx(ex.prompt));
    if (canWatch(tries)) c.offerWatch?.(watch);
    if (canSkip(tries)) c.offerSkip?.();
    return true;
  };
  // "Watch me do it": the engine plays the learner's side against the same bot, then it is their turn again
  const watch = async () => {
    game = new Chess(ex.fen); busy = true; show(); c.status(""); c.say(t("watching"));
    const out = await watchLine({
      fen: ex.fen, side: me,
      best: async f => watchPick(f, (await getEngine().candidates(f, { n: 6, depth: 8 })).map(x => ({ move: x.move, score: asNumber(x.score) })), ex.goal),
      reply: async f => { const legalAll = new Chess(f).moves({ verbose: true }).map(m => m.from + m.to + (m.promotion ?? "")); return botMove(getEngine(), f, legalAll, bot); },
      show: (g, last) => c.board.set(placementFromFen(g.fen()), { lastMove: last, check: checkSquare(g) }, last),
      pause: wait, alive: () => alive, stop: (g, m) => miniGameResult(g, me, ex.goal, m) !== null, maxPlies: 80,
    });
    if (!alive || out === "gone") return;
    await wait(1200); if (!alive) return;
    game = new Chess(ex.fen); busy = false; show(); c.say(t("watchTry"));
  };
  c.board.setFlip(me === "b");
  c.board.interact({
    canPick: s => { if (done) return t("wellDone"); if (busy) return t("engineThinking"); const p = game.get(s as CjSquare); return p && p.color === me ? true : t("whyNotYours"); },
    targets: s => game.moves({ square: s as CjSquare, verbose: true }).map(m => m.to),
    onTap: () => {},
    onMove: async (from, to) => {
      if (done || busy) return;
      const legal = game.moves({ square: from as CjSquare, verbose: true }).filter(m => m.to === to);
      if (!legal.length) { c.board.shake(to); c.say(refusal(game.fen(), from, to), "no"); return; }
      const promo = legal[0].promotion ? await pickPromotion(c, me) : undefined;
      const mv = game.move({ from, to, promotion: promo }); show([from, to], true);
      if (await settle(miniGameResult(game, me, ex.goal, mv))) return;
      busy = true; c.status(t("engineThinking"));
      await wait(350); if (!alive) return;
      const legalAll = game.moves({ verbose: true }).map(m => m.from + m.to + (m.promotion ?? ""));
      const u = await botMove(getEngine(), game.fen(), legalAll, bot); if (!alive || done) return;
      const r = game.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] });
      busy = false; show([r.from, r.to], true); c.status("");
      await settle(miniGameResult(game, me, ex.goal, r));
    },
  });
  show(); c.say(tx(ex.prompt));
  return () => { alive = false; c.board.setFlip(false); };
}

function runLine(ex: LineExercise, c: Ctx): Cleanup {
  const game = new Chess();
  let i = 0, mistakes = 0, wrongHere = 0, busy = true, alive = true;
  const show = (last?: [Square, Square], anim = false, arrows?: [Square, Square][], highlights?: Square[]) =>
    c.board.set(placementFromFen(game.fen()), { lastMove: last, check: checkSquare(game), arrows, highlights }, anim ? last : undefined);
  const counter = () => c.status(`${ex.opening ? `<b>${ex.opening}</b> · ` : ""}${num(Math.min(i, ex.moves.length))} / ${num(ex.moves.length)}`);
  const replyIfTheirTurn = async () => {
    while (i < ex.moves.length && game.turn() !== ex.side) {
      await wait(450); if (!alive) return;
      const m = game.move(ex.moves[i++]); show([m.from, m.to], true); counter();
    }
    if (i >= ex.moves.length) { c.say(t("lineDone"), "ok"); c.done(mistakes); return; }
    busy = false;
  };
  c.board.setFlip(ex.side === "b");
  show(); counter();
  c.board.interact({
    canPick: s => { if (busy) return t("notQuite"); const p = game.get(s as CjSquare); return p && p.color === ex.side ? true : t("whyNotYours"); },
    targets: s => game.moves({ square: s as CjSquare, verbose: true }).map(m => m.to),
    onTap: () => {},
    onMove: async (from, to) => {
      if (busy) return;
      const legal = game.moves({ square: from as CjSquare, verbose: true }).filter(m => m.to === to);
      if (!legal.length) { c.board.shake(to); c.say(refusal(game.fen(), from, to), "no"); return; }
      const want = new Chess(game.fen()).move(ex.moves[i]);
      if (want.from === from && want.to === to) {
        busy = true; wrongHere = 0;
        const m = game.move(ex.moves[i++]); show([m.from, m.to], true); counter();
        c.say(tx(ex.prompt));
        return replyIfTheirTurn();
      }
      mistakes++; wrongHere++; c.board.shake(to);
      // the help ladder: 2 misses glow the piece to move (or give the hint), 3 draw the arrow and offer "Skip for now"
      const rung = rungFor(wrongHere);
      if (rung === "arrow") { show(undefined, false, [[want.from, want.to]], [want.from]); c.say(t("showLine"), "no"); }
      else if (rung === "hint") { show(undefined, false, undefined, [want.from]); c.say(hintOr(ex, "helpLookPiece")); }
      else c.say(t("wrongLine"), "no");
      if (canSkip(wrongHere)) c.offerSkip?.();
    },
  });
  replyIfTheirTurn();
  return () => { alive = false; c.board.setFlip(false); };
}

function runEngineBest(ex: EngineBestExercise, c: Ctx): Cleanup {
  const engine = getEngine(), game = new Chess(ex.fen), me = game.turn(), tol = ex.tolerance ?? 50;
  let mistakes = 0, busy = true, alive = true, done = false, best = -Infinity, bestMove = "";
  c.board.setFlip(me === "b");
  c.board.set(placementFromFen(ex.fen), { check: checkSquare(game) });
  c.status(t("engineThinking"));
  // the engine's own verdict on the position, so each try is compared like with like
  engine.analyse(ex.fen, { depth: 16 }).then(a => { if (!alive) return; best = asNumber(a.score); bestMove = a.best; busy = false;
    c.status(t(me === "w" ? "whiteToMove" : "blackToMove")); });
  c.board.interact({
    canPick: s => { if (done) return t("wellDone"); if (busy) return t("engineThinking"); const p = game.get(s as CjSquare); return p && p.color === me ? true : t("whyNotYours"); },
    targets: s => game.moves({ square: s as CjSquare, verbose: true }).map(m => m.to),
    onTap: () => {},
    onMove: async (from, to) => {
      if (busy || done) return;
      const legal = game.moves({ square: from as CjSquare, verbose: true }).filter(m => m.to === to);
      if (!legal.length) { c.board.shake(to); c.say(refusal(game.fen(), from, to), "no"); return; }
      const promo = legal[0].promotion ? await pickPromotion(c, me) : undefined;
      busy = true; c.status(t("engineThinking"));
      const trial = new Chess(ex.fen); trial.move({ from, to, promotion: promo });
      c.board.set(placementFromFen(trial.fen()), { lastMove: [from, to] }, [from, to]);
      const mine = trial.isCheckmate() ? 100000 : -asNumber((await engine.analyse(trial.fen(), { depth: 14 })).score);
      if (!alive) return;
      if (mine >= best - tol) {
        done = true; c.status("");
        c.say(`${t("goodMove")}${ex.idea ? `<br><small>${tx(ex.idea)}</small>` : ""}`, "ok"); c.done(mistakes); return;
      }
      mistakes++;
      await wait(900); if (!alive) return;
      // the help ladder: 2 misses glow the piece to move (or give the hint), 3 draw the arrow and offer "Skip for now"
      const rung = bestMove ? rungFor(mistakes) : "none", bFrom = bestMove.slice(0, 2), bTo = bestMove.slice(2, 4);
      c.board.set(placementFromFen(ex.fen), { arrows: rung === "arrow" ? [[bFrom, bTo]] : undefined, highlights: rung !== "none" ? [bFrom] : undefined });
      c.say(rung === "arrow" ? t("showBest") : rung === "hint" ? hintOr(ex, "helpLookPiece") : t("weakerMove"), rung === "hint" ? "info" : "no");
      c.status(t(me === "w" ? "whiteToMove" : "blackToMove")); busy = false;
      if (canSkip(mistakes)) c.offerSkip?.();
    },
  });
  return () => { alive = false; c.board.setFlip(false); };
}

function runPick(ex: PickExercise, c: Ctx): Cleanup {
  const { squares, byFile } = answerSquares(ex.fen, ex.feature, ex.color);
  const key = (s: Square) => byFile ? s[0] : s;
  const want = new Set(squares.map(key)), found = new Set<string>();
  let mistakes = 0;
  const marks = () => byFile ? [...found].flatMap(f => [1, 2, 3, 4, 5, 6, 7, 8].map(r => f + r)) : [...found];
  const counter = () => c.status(t("pickFound").replace("{k}", num(found.size)).replace("{n}", num(want.size)));
  c.board.set(placementFromFen(ex.fen), {});
  counter();
  c.board.interact({
    onTap: s => {
      const k = key(s);
      if (found.has(k)) return;
      if (want.has(k)) {
        found.add(k); c.board.mark({ highlights: marks(), flash: { sq: s, ok: true } }); counter();
        if (found.size === want.size) { c.say(t("wellDone"), "ok"); c.done(mistakes); }
      } else {
        mistakes++; c.board.mark({ flash: { sq: s, ok: false } }); c.say(t(`pickWrong_${ex.feature}` as UIKey), "no");
        // the help ladder: 2 misses give the hint, 3 put a star on an answer square and offer "Skip for now"
        const rung = rungFor(mistakes), left = squares.filter(q => !found.has(key(q)));
        if (rung === "hint" && ex.hint) c.say(tx(ex.hint));
        else if (rung === "arrow" && left.length) { c.board.mark({ stars: left.slice(0, 1) }); c.say(t("helpPickStar")); }
        if (canSkip(mistakes)) c.offerSkip?.();
      }
    },
  });
  return () => {};
}

function runPuzzle(ex: PuzzleExercise, c: Ctx): Cleanup {
  const game = new Chess(ex.fen);
  const learner = game.turn() === "w" ? "b" : "w";       // Moves[0] is the opponent's
  let i = 0, mistakes = 0, wrongHere = 0, alive = true, busy = true;
  const play = (uci: string) => game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] ?? "q" });
  const show = (last?: [Square, Square], anim = false) =>
    c.board.set(placementFromFen(game.fen()), { lastMove: last, check: checkSquare(game) }, anim ? last : undefined);
  c.board.setFlip(learner === "b");
  show();
  c.status(t(learner === "w" ? "whiteToMove" : "blackToMove"));
  const reply = async () => {
    busy = true; await wait(450); if (!alive) return;
    const m = ex.moves[i++]; play(m);
    busy = false; // before drawing, so the learner's pieces are drawn as pick-up-able
    show([m.slice(0, 2), m.slice(2, 4)], true);
  };
  c.board.interact({
    canPick: s => {
      if (busy) return t("notQuite");
      const p = game.get(s as CjSquare);
      return p && p.color === learner ? true : t("whyNotYours");
    },
    targets: s => game.moves({ square: s as CjSquare, verbose: true }).map(m => m.to),
    onTap: () => {},
    onMove: async (from, to) => {
      if (busy) return;
      const legal = game.moves({ square: from as CjSquare, verbose: true }).find(m => m.to === to);
      // an illegal drop is a slip of the finger: explained, never counted as a wrong answer (chess review 2026-10-04)
      if (!legal) { c.board.shake(to); c.say(refusal(game.fen(), from, to), "no"); return; }
      const expected = ex.moves[i];
      const uci = from + to + (legal.promotion ? await pickPromotion(c, learner) : "");
      const trial = new Chess(game.fen()); trial.move({ from, to, promotion: uci[4] });
      const last = i === ex.moves.length - 1;
      if (uci === expected || (last && trial.isCheckmate())) {
        play(uci); i++; wrongHere = 0; show([from, to], true);
        if (i >= ex.moves.length) { c.say(t("correct"), "ok"); c.done(mistakes); return; }
        c.say(t("correct"), "ok");
        await reply();
        c.say(tx(ex.prompt));
      } else if (ex.pack) {
        // a lesson or test puzzle (2026-10-29, "no dead ends"): say WHY the move was wrong. The opponent's best reply is
        // played for a moment, then one plain sentence for the pack's theme; then the help ladder: 2 misses glow the
        // piece to move (or give the hint), 3 draw the arrow and offer "Skip for now".
        mistakes++; wrongHere++; c.board.shake(to);
        busy = true;
        c.say(t("puzzleWrong"), "no");
        const before = game.fen();
        game.move({ from, to, promotion: uci[4] });
        show([from, to], true);
        await wait(600); if (!alive) return;
        const rep = game.isGameOver() ? null : await bestReply(game.fen()); if (!alive) return;
        if (rep) { play(rep); show([rep.slice(0, 2), rep.slice(2, 4)], true); }
        c.say(t(topicKey(topicOf(ex.pack), "why")), "no");
        await wait(2200); if (!alive) return;
        game.load(before); busy = false;
        const rung = rungFor(wrongHere), want: [Square, Square] = [expected.slice(0, 2), expected.slice(2, 4)];
        c.board.set(placementFromFen(game.fen()), {
          check: checkSquare(game), highlights: rung !== "none" ? [want[0]] : undefined, arrows: rung === "arrow" ? [want] : undefined });
        if (rung === "arrow") c.say(t("puzzleShow"), "no");
        else if (rung === "hint") c.say(hintOr(ex, "helpLookPiece"));
        if (canSkip(wrongHere)) c.offerSkip?.();
      } else {
        // two wrong tries on one move: show the answer, so nobody is ever stuck (the puzzle still counts as missed)
        mistakes++; wrongHere++; c.board.shake(to);
        if (wrongHere >= 2) {
          c.board.set(placementFromFen(game.fen()), { check: checkSquare(game), arrows: [[expected.slice(0, 2), expected.slice(2, 4)]] });
          c.say(t("puzzleShow"), "no");
        } else c.say(t("puzzleWrong"), "no");
      }
    },
  });
  c.say(tx(ex.prompt));
  reply();
  return () => { alive = false; c.board.setFlip(false); };
}

export function runExercise(ex: Exercise, c: Ctx): Cleanup {
  c.extra.innerHTML = "";
  c.say(tx(ex.prompt));
  switch (ex.kind) {
    case "coord": return runCoord(ex, c);
    case "stars": return runStars(ex, c);
    case "safe": return runSafe(ex, c);
    case "place": return runPlace(ex, c);
    case "choose": return runChoose(ex, c);
    case "puzzle": return runPuzzle(ex, c);
    case "play": return runPlay(ex, c);
    case "mateVs": return runMateVs(ex, c);
    case "engineVs": return runEngineVs(ex, c);
    case "line": return runLine(ex, c);
    case "engineBest": return runEngineBest(ex, c);
    case "botGame": return runBotGame(ex, c);
    case "pick": return runPick(ex, c);
    case "pack": throw new Error("pack exercises are expanded by the player before they run");
  }
}

