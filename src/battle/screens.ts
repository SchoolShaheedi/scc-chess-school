// Puzzle Battle (class features 2026-11-03, not yet in DECISIONS.md): the screen where two friends or classmates race through the same puzzles. Everything that
// counts is decided by the server (src/battle/api.ts, supabase/functions/puzzle-battle): this screen shows the position,
// sends each move, and draws what comes back. The answers are never in the app, so there is nothing to look up or fake.
import { Chess, type Square as CjSquare } from "chess.js";
import { Board } from "../chess/board";
import { placementFromFen } from "../chess/types";
import { confetti } from "../celebrate";
import { family } from "../family";
import { num, t, type UIKey } from "../i18n";
import { icon } from "../icons";
import { checkSquare, refusal } from "../lesson/exercises";
import { avatarHTML } from "../me/family";
import { myPlayer, opponents } from "../online/api";
import { movesFor, promotion } from "../play/gamekit";
import { sound } from "../sound";
import { ask } from "../ui/dialog";
import { acceptBattle, battleMove, type Battle, cancelBattle, claimBattle, declineBattle, getBattle, leaveBattle, serverSkew, watchBattle } from "./api";
import { resultFor } from "./rules";

type Go = (h: string) => void;
const bar = (title: string) => `<div class="lessonbar"><button class="iconbtn" data-back aria-label="${t("back")}">${icon("chevronLeft")}</button><h1 class="grow">${title}</h1></div>`;
const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export function battleScreen(root: HTMLElement, id: string, go: Go): () => void {
  let alive = true, board: Board | null = null, unwatch: (() => void) | null = null, ticker = 0, onVisible: (() => void) | null = null;
  const leave = () => {
    alive = false; unwatch?.(); clearInterval(ticker); board?.destroy(); board = null;
    if (onVisible) document.removeEventListener("visibilitychange", onVisible);
  };
  root.innerHTML = `<div class="screen">${bar(t("battleTitle"))}<p class="muted">${t("loading")}</p></div>`;
  root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/online");
  void (async () => {
    const [me, first, skew] = await Promise.all([myPlayer(), getBattle(id), serverSkew()]);
    if (!alive) return;
    if (!me || !first || (first.from_player !== me.id && first.to_player !== me.id)) return go("#/online");
    const meId = me.id;
    const side: "a" | "b" = first.from_player === me.id ? "a" : "b", them: "a" | "b" = side === "a" ? "b" : "a";
    const oppId = side === "a" ? first.to_player : first.from_player;
    const opp = (await opponents(me.id)).find(o => o.player === oppId) ?? { avatar: "cat", colour: "#9AA39E" };
    if (!alive) return;
    let b: Battle = first, phase: "invited" | "countdown" | "play" | "over" | "gone" = "gone", idx = -1, busy = true, claimedAt = 0, announced = false;
    const alreadyOver = first.status === "finished";
    const now = () => Date.now() + skew;                                     // the server's clock, as near as we can tell
    const startMs = () => (b.started_at ? Date.parse(b.started_at) : 0);
    const endMs = () => startMs() + b.seconds * 1000;
    const solved = (s: "a" | "b") => b[`${s}_solved`] as number;
    const myIdx = () => b[`${side}_idx`] as number;
    const frame = (body: string) => { root.innerHTML = `<div class="screen">${bar(t("battleTitle"))}${body}</div>`; root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/online"); };
    const faces = () => `<div class="bscores"><div class="bside me">${avatarHTML(family.current())}<b data-score="${side}">${num(solved(side))}</b><small>${t("battleSolved")}</small></div>
      <div class="bclock" data-clock></div><div class="bside">${avatarHTML(opp)}<b data-score="${them}">${num(solved(them))}</b><small>${t("battleSolved")}</small></div></div>`;
    const scores = () => root.querySelectorAll<HTMLElement>("[data-score]").forEach(e => { e.textContent = num(solved(e.dataset.score as "a" | "b")); });

    // ---------- waiting for an answer to the invitation ----------
    const drawInvited = () => {
      phase = "invited";
      const incoming = side === "b";
      frame(`<div class="hero">${avatarHTML(opp, "big")}<h3>${incoming ? t("battleWantsToPlay") : t("battleWaitingFor")}</h3><p>${t(`battleLevel_${b.level}` as UIKey)}</p></div>
        <p class="muted">${t("battleAbout")}</p><p class="note err" data-err></p>
        <div class="actions" style="flex-direction:column">${incoming
          ? `<button class="btn wide" data-yes>${t("onlineAccept")}</button><button class="btn ghost wide" data-no>${t("onlineDecline")}</button>`
          : `<button class="btn ghost wide" data-no>${t("cancel")}</button>`}</div>`);
      root.querySelector<HTMLButtonElement>("[data-yes]")?.addEventListener("click", async () => {
        const e = await acceptBattle(meId, id); if (!alive) return;
        if (e) root.querySelector("[data-err]")!.textContent = e; else apply((await getBattle(id)) ?? b);
      });
      root.querySelector<HTMLButtonElement>("[data-no]")!.onclick = async () => { await (incoming ? declineBattle(meId, id) : cancelBattle(meId, id)); go("#/online"); };
    };

    // ---------- the countdown, then the race ----------
    const drawCountdown = () => {
      phase = "countdown";
      frame(`<div class="hero">${avatarHTML(opp, "big")}<h3>${t("battleStartsIn")}</h3><div class="bigcount" data-count></div></div>${faces()}`);
    };
    let game: Chess | null = null, learner: "w" | "b" = "w";
    const ctx = () => ({ board: board!, extra: root.querySelector<HTMLElement>("[data-extra]")!, say: () => {}, status: () => {}, done: () => {} });
    const say = (h: string, tone: "" | "ok" | "no" = "") => { const e = root.querySelector<HTMLElement>("[data-say]"); if (e) { e.innerHTML = tone ? icon(tone, "tone") + h : h; e.className = `bubble ${tone}`; } };
    const show = (last?: [CjSquare, CjSquare], anim = false) =>
      board!.set(placementFromFen(game!.fen()), { lastMove: last, check: checkSquare(game!) }, anim ? last : undefined);
    function drawPlay() {
      phase = "play";
      frame(`${faces()}<div class="coach"><div class="bubble" data-say aria-live="polite"></div></div>
        <div class="frame"><div class="boardwrap" data-board></div></div><div class="extra" data-extra></div>
        <div class="actions"><button class="btn ghost" data-leave>${t("battleLeave")}</button></div>`);
      board = new Board(root.querySelector("[data-board]")!, {});
      root.querySelector<HTMLButtonElement>("[data-leave]")!.onclick = async () => {
        if (await ask(t("battleLeaveConfirm"), { danger: true })) { await leaveBattle(meId, id); apply((await getBattle(id)) ?? b); }
      };
      board.interact({
        canPick: s => { if (busy || !game) return t("onlineTheirMove"); const p = game.get(s as CjSquare); return p && p.color === learner ? true : t("whyNotYours"); },
        targets: s => (game ? game.moves({ square: s as CjSquare, verbose: true }).map(m => m.to) : []),
        onTap: () => {},
        onMove: async (from, to) => {
          if (busy || !game || phase !== "play") return;
          const legal = movesFor(game, from as CjSquare, to as CjSquare);
          // an illegal drop is a slip of the finger: explained, never sent to the server, never a miss
          if (!legal.length) { board!.shake(to); say(refusal(game.fen(), from, to), "no"); return; }
          const pr = legal[0].promotion ? await promotion(ctx(), learner) : undefined;
          const uci = legal[0].from + legal[0].to + (pr ?? "");
          busy = true;
          game.move({ from: legal[0].from, to: legal[0].to, promotion: pr });
          show([legal[0].from, legal[0].to] as [CjSquare, CjSquare], true);
          const r = await battleMove(id, meId, uci);
          if (!alive) return;
          if (r.error) {
            // not counted (too quick, or the battle changed): put the piece back and let them play it again
            game.undo(); show(); busy = false; say(r.error, "no");
            void getBattle(id).then(x => { if (alive && x) apply(x); });
            return;
          }
          if (r.over) { void getBattle(id).then(x => { if (alive && x) apply(x); }); }
          if (!r.ok) { sound.wrong(); say(t("battleMiss"), "no"); await wait(800); if (alive && phase === "play") void next(); return; }
          if (r.solved) { sound.correct(); say(t("correct"), "ok"); await wait(400); if (alive && phase === "play") void next(); return; }
          say(t("correct"), "ok");
          if (r.reply) { await wait(450); if (!alive) return; game.move({ from: r.reply.slice(0, 2), to: r.reply.slice(2, 4), promotion: r.reply[4] }); show([r.reply.slice(0, 2), r.reply.slice(2, 4)] as [CjSquare, CjSquare], true); }
          busy = false;
        },
      });
      void next();
    }
    /** The next puzzle in the set: the server picked the set, so both players meet the same ones in the same order. */
    async function next() {
      idx = idx < 0 ? myIdx() : idx + 1;
      const pz = b.puzzles?.[idx];
      if (!pz) { busy = true; game = null; board!.interact({}); say(t("battleSetDone")); return; }
      busy = true; game = new Chess(pz.fen);
      learner = game.turn() === "w" ? "b" : "w";                  // the first move belongs to the other side, as in every puzzle
      board!.setFlip(learner === "b"); show(); say(t("dailyFind"));
      await wait(450); if (!alive || phase !== "play" || !game) return;
      game.move({ from: pz.first.slice(0, 2), to: pz.first.slice(2, 4), promotion: pz.first[4] });
      show([pz.first.slice(0, 2), pz.first.slice(2, 4)] as [CjSquare, CjSquare], true);
      busy = false;
    }

    // ---------- the result ----------
    const drawOver = () => {
      phase = "over";
      board?.destroy(); board = null;
      const r = resultFor(side, b.winner) ?? "draw";
      frame(`<div class="complete"><div class="trophy ${r === "won" ? "" : "light"}">${icon(r === "won" ? "trophy" : "puzzle")}</div>
        <h1>${r === "won" ? t("battleWon") : r === "lost" ? t("battleLost") : t("battleDrawn")}</h1>
        <p>${b.reason ? t(`battleBy_${b.reason}` as UIKey) : ""}</p></div>${faces()}
        <div class="actions" style="flex-direction:column"><button class="btn wide" data-lobby>${t("onlineBackToLobby")}</button></div>`);
      root.querySelector<HTMLButtonElement>("[data-lobby]")!.onclick = () => go("#/online");
      if (r === "won" && !announced && !alreadyOver) { sound.complete(); confetti(root.querySelector(".screen")!); }
      announced = true;
    };

    /** A new row from the server (live update or our own fetch): go to whichever screen it calls for. */
    function apply(next: Battle) {
      b = next;
      if (b.status === "declined" || b.status === "cancelled") return go("#/online");
      const want = b.status === "invited" ? "invited" : b.status === "finished" ? "over" : now() < startMs() ? "countdown" : "play";
      if (want === phase) { scores(); return; }
      if (want === "invited") drawInvited(); else if (want === "countdown") drawCountdown(); else if (want === "play") drawPlay(); else drawOver();
    }
    apply(b);
    unwatch = watchBattle(id, x => { if (alive) apply(x); });
    // once a second: the countdown, the clock, and (when time is up) asking the server to finish the battle
    ticker = window.setInterval(() => {
      if (!alive) return;
      const c = root.querySelector<HTMLElement>("[data-count]");
      if (phase === "countdown") {
        const left = Math.max(0, Math.ceil((startMs() - now()) / 1000));
        if (c) c.textContent = num(left);
        if (left <= 0) apply(b);
      } else if (phase === "play") {
        const left = Math.max(0, Math.ceil((endMs() - now()) / 1000));
        const k = root.querySelector<HTMLElement>("[data-clock]"); if (k) { k.textContent = `${num(Math.floor(left / 60))}:${num(String(left % 60).padStart(2, "0"))}`; k.classList.toggle("low", left <= 10); }
        // time is up (or both have been through the set): the server finishes it, and says who won
        if ((left <= 0 || (b.puzzles && myIdx() >= b.puzzles.length)) && Date.now() - claimedAt > 3000) {
          claimedAt = Date.now(); void claimBattle(id, meId).then(() => getBattle(id)).then(x => { if (alive && x) apply(x); });
        }
      }
    }, 1000);
    // a phone that slept may have missed live updates: look again when the app comes back to the front
    onVisible = () => { if (document.visibilityState === "visible") void getBattle(id).then(x => { if (alive && x) apply(x); }); };
    document.addEventListener("visibilitychange", onVisible);
  })();
  return leave;
}
