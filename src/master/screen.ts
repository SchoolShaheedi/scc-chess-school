// Master games - guess the move. Pick a famous game and a side; at each of your moves (after the opening) guess what
// was played. The same move earns 3 points, a move the engine rates as good as it 2 ("also good"), anything else 0 and
// the played move is shown with its note. Then the opponent's move is played, and so on to the end.
import { Chess, type Square as CjSquare } from "chess.js";
import { Board } from "../chess/board";
import { placementFromFen, type Square } from "../chess/types";
import { getEngine } from "../engine/browser";
import { num, t, tx, UI } from "../i18n";
import type { Text } from "../lesson/types";
import { icon } from "../icons";
import { checkSquare } from "../lesson/exercises";
import { store } from "../store";
import { confetti } from "../celebrate";
import { type MasterGame, GAMES, NOTES, byId, firstGuess, guessPlies, maxPoints, replay } from "./games";
import { ALSO, EXACT, judgeGuess, sameMove } from "./judge";

type Go = (h: string) => void;
type Side = "w" | "b";

const TEXTS = UI as unknown as Record<string, Text>;
const gameText = (g: MasterGame, k: string): string => tx(TEXTS[`mg_${g.id}_${k}`]);
const bar = (title: string, back = true) => `<div class="lessonbar">${back ? `<button class="iconbtn" data-back aria-label="${t("back")}">${icon("chevronLeft")}</button>` : ""}<h1 class="grow">${title}</h1></div>`;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const bestKey = (id: string, side: Side) => `${id}:${side}`;
const who = (g: MasterGame) => `${esc(g.white)} - ${esc(g.black)}, ${num(g.year)}`;
const bestLine = (g: MasterGame, side: Side) => {
  const got = store.get().masterBest?.[bestKey(g.id, side)] ?? 0;
  return t("mgBest").replace("{a}", num(got)).replace("{b}", num(maxPoints(g, side)));
};
const sansLine = (g: MasterGame, upTo: number) => g.sans.slice(0, upTo).map((s, i) => (i % 2 === 0 ? `${num(i / 2 + 1)}.${s}` : s)).join(" ");
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export function masterScreen(root: HTMLElement, go: Go, id?: string): () => void {
  let board: Board | null = null;
  /** every screen change bumps this; a game loop that sees a different number stops at once */
  let run = 0;
  const teardown = () => { run++; board?.destroy(); board = null; };
  const game = id ? byId(id) : undefined;
  if (game) pick(game); else hub();
  return teardown;

  function hub() {
    teardown();
    root.innerHTML = `<div class="screen master">${bar(t("mgTitle"))}
      <p class="sub">${t("mgAbout")}</p>
      <div class="mglist">${GAMES.map(g => `<button class="mgcard" data-id="${g.id}">
        <b>${gameText(g, "name")}</b><small>${who(g)}</small>
        <span class="mgbest">${t("mgWhite")}: ${bestLine(g, "w")}</span><span class="mgbest">${t("mgBlack")}: ${bestLine(g, "b")}</span></button>`).join("")}</div></div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/play");
    root.querySelectorAll<HTMLButtonElement>("[data-id]").forEach(b => b.onclick = () => go(`#/master/${b.dataset.id}`));
  }

  function pick(g: MasterGame) {
    teardown();
    const side = (s: Side) => `<button class="btn wide ${s === "w" ? "gold" : "ghost"}" data-side="${s}">${t(s === "w" ? "mgWhite" : "mgBlack")}: ${esc(s === "w" ? g.white : g.black)}
      <small class="mgsub">${t("mgGuessCount").replace("{n}", num(guessPlies(g, s).length))} · ${bestLine(g, s)}</small></button>`;
    root.innerHTML = `<div class="screen master">${bar(gameText(g, "name"))}
      <p class="mgwho">${who(g)}</p>
      <p>${gameText(g, "intro")}</p>
      <p class="note">${g.result === "1-0" ? t("mgWinW") : t("mgWinB")}${g.mate ? ` ${t("mgMatePlayed")}` : ""} ${t("mgFrom").replace("{n}", num(g.from))}</p>
      <h2 class="sec">${t("mgPickSide")}</h2>
      <div class="mgsides">${side("w")}${side("b")}</div></div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/master");
    root.querySelectorAll<HTMLButtonElement>("[data-side]").forEach(b => b.onclick = () => play(g, b.dataset.side as Side));
  }

  function play(g: MasterGame, side: Side) {
    teardown();
    const mine = ++run;
    const alive = () => run === mine;
    const line = replay(g), total = g.sans.length, start = firstGuess(g, side), max = maxPoints(g, side);
    const noteAt = (n: number) => NOTES[g.id].find(x => x.n === n);
    const early = NOTES[g.id].filter(x => x.n <= start);
    root.innerHTML = `<div class="screen master">${bar(gameText(g, "name"))}
      <p class="mgscore"><span>${t("mgScore")}: <b data-score>${num(0)}</b> / ${num(max)}</span><small>${who(g)}</small></p>
      <div class="frame"><div class="boardwrap" data-board></div></div>
      <p class="mgsay" data-say aria-live="polite"></p>
      <div class="mgnote" data-note hidden></div>
      <div class="actions" data-after></div>
      <details class="mgbegan"><summary>${t("mgBegan")}</summary>
        <p class="mgmoves">${sansLine(g, start)}</p>${early.map(x => `<p>${gameText(g, x.k)}</p>`).join("")}</details></div>`;
    const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
    const say = (h: string) => { $("[data-say]").innerHTML = h; };
    const showNote = (h: string) => { const n = $("[data-note]"); n.hidden = !h; n.innerHTML = h; };
    const after = $("[data-after]");
    $<HTMLButtonElement>("[data-back]").onclick = () => go(`#/master/${g.id}`);
    board = new Board($("[data-board]"), { flip: side === "b" });
    const b = board;
    const draw = (i: number, anim = false) => {
      const m = i > 0 ? line.moves[i - 1] : undefined, c = new Chess(line.fens[i]);
      b.set(placementFromFen(line.fens[i]), { lastMove: m ? [m.from, m.to] : undefined, check: checkSquare(c) }, anim && m ? [m.from, m.to] : undefined);
    };
    const waitContinue = (label: string) => new Promise<void>(res => {
      after.innerHTML = `<button class="btn wide gold" data-next>${label} ${icon("arrowRight")}</button>`;
      after.querySelector<HTMLButtonElement>("[data-next]")!.onclick = () => { after.innerHTML = ""; res(); };
    });
    /** Resolves with the learner's move at ply i (only legal moves of their side are accepted). */
    const waitGuess = (i: number) => new Promise<{ from: Square; to: Square }>(res => {
      const c = new Chess(line.fens[i]);
      b.interact({
        canPick: s => (c.get(s as CjSquare)?.color === side ? true : ""),
        targets: s => c.moves({ square: s as CjSquare, verbose: true }).map(m => m.to),
        onMove: (from, to) => {
          if (!c.moves({ square: from as CjSquare, verbose: true }).some(m => m.to === to)) { b.shake(to); return; }
          b.interact({});            // one guess per move: the board is locked until the next one
          res({ from, to });
        },
      });
    });

    void (async () => {
      let score = 0;
      draw(start);
      for (let i = start; i < total; i++) {
        if (!alive()) return;
        const played = line.moves[i], n = i + 1, note = noteAt(n), mineToMove = (i % 2 === 0) === (side === "w");
        showNote("");
        if (mineToMove) {
          say(`<b>${t("mgGuess")}</b>`);
          const guess = await waitGuess(i);
          if (!alive()) return;
          const exact = sameMove({ ...guess }, { from: played.from, to: played.to, promotion: played.promotion });
          let pts: number = EXACT;
          if (!exact) {
            say(t("mgChecking"));
            pts = await judgeGuess(getEngine(), line.fens[i], guess);
            if (!alive()) return;
          }
          score += pts;
          $("[data-score]").textContent = num(score);
          draw(n, true);
          say(`<b class="${pts ? "ok" : "warn"}">${pts === EXACT ? t("mgExact") : pts === ALSO ? t("mgAlso") : t("mgMiss").replace("{m}", played.san)}</b>`);
          if (note) showNote(gameText(g, note.k));
          await waitContinue(n < total ? t("next") : t("continue"));
        } else {
          b.interact({});
          await sleep(i === start ? 250 : 650);
          if (!alive()) return;
          draw(n, true);
          say(`<b>${played.san}</b>`);
          if (note) { showNote(gameText(g, note.k)); await waitContinue(n < total ? t("next") : t("continue")); }
        }
      }
      if (!alive()) return;
      finish(score);
    })();

    function finish(score: number) {
      const key = bestKey(g.id, side), prev = store.get().masterBest?.[key] ?? 0;
      store.recordMaster(key, score);
      b.interact({});
      showNote(note(g));
      say(`<b>${t("mgFinal").replace("{a}", num(score)).replace("{b}", num(max))}</b>${score > prev ? ` <span class="mgnew">${t("mgNewBest")}</span>` : ""}`);
      if (score > prev) confetti(root.querySelector(".screen")!);
      after.innerHTML = `<button class="btn wide gold" data-again>${icon("again")} ${t("playAgain")}</button>
        <button class="btn wide ghost" data-other>${t("mgOtherSide")}</button>
        <button class="btn wide ghost" data-all>${t("mgAllGames")}</button>`;
      after.querySelector<HTMLButtonElement>("[data-again]")!.onclick = () => play(g, side);
      after.querySelector<HTMLButtonElement>("[data-other]")!.onclick = () => play(g, side === "w" ? "b" : "w");
      after.querySelector<HTMLButtonElement>("[data-all]")!.onclick = () => go("#/master");
    }
    /** The last note of the game (it is shown again with the final score). */
    function note(game: MasterGame): string {
      const last = NOTES[game.id].at(-1);
      return last ? gameText(game, last.k) : "";
    }
  }
}
