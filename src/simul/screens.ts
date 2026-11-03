// The teacher-run class simul (class features 2026-11-03, not yet in DECISIONS.md): the teacher plays White against every ready pupil at once. Each pupil plays on
// their own device through the ordinary online game; this is the teacher's side: every board at a glance, and the
// boards that are waiting for the teacher's move first. Pupils are shown only as an animal and a colour (with the
// teacher's own labels from this device); there is no chat.
import { Chess, type Square as CjSquare } from "chess.js";
import { Board } from "../chess/board";
import { pieceHTML } from "../chess/pieces";
import { placementFromFen } from "../chess/types";
import { num, t } from "../i18n";
import { icon } from "../icons";
import { checkSquare, refusal } from "../lesson/exercises";
import { avatarHTML } from "../me/family";
import { sendMove, type Game } from "../online/api";
import { movesFor, promotion } from "../play/gamekit";
import { teacherClasses } from "../teach/api";
import { pupilLabel } from "../teach/screens";
import { ask } from "../ui/dialog";
import { activeSimul, endSimul, seatSimul, simulBoards, simulGames, startSimul, watchSimul, type Simul, type SimulBoard } from "./api";
import { boardState, mergeGames, nextBoard, summarise } from "./rules";

type Go = (h: string) => void;
const bar = (title: string) => `<div class="lessonbar"><button class="iconbtn" data-back aria-label="${t("back")}">${icon("chevronLeft")}</button><h1 class="grow">${title}</h1></div>`;
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** A small static board for the grid. */
function mini(fen: string): string {
  const b = placementFromFen(fen);
  let out = "";
  for (let r = 8; r >= 1; r--) for (let f = 0; f < 8; f++) { const sq = "abcdefgh"[f] + r, p = b[sq]; out += `<div class="${(f + r) % 2 ? "l" : "d"}">${p ? pieceHTML(p) : ""}</div>`; }
  return `<div class="thumb mini">${out}</div>`;
}

export function simulScreen(root: HTMLElement, classId: string, go: Go): () => void {
  let alive = true, unwatch: (() => void) | null = null, board: Board | null = null;
  const leave = () => { alive = false; unwatch?.(); board?.destroy(); board = null; };
  root.innerHTML = `<div class="screen">${bar(t("simulTitle"))}<p class="muted">${t("loading")}</p></div>`;
  root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go(`#/teach/${classId}`);
  void (async () => {
    const cls = (await teacherClasses()).find(c => c.id === classId);
    if (!alive) return;
    if (!cls) return go("#/teach");
    const title = esc(cls.title);
    let simul = await activeSimul(classId);
    if (!alive) return;
    const intro = (err = "") => {
      root.innerHTML = `<div class="screen">${bar(`${t("simulTitle")} · ${title}`)}
        <div class="hero"><div class="trophy light">${icon("swords")}</div><p>${t("simulAbout")}</p></div>
        <p class="note">${t("simulSafe")}</p><p class="note err" data-err>${esc(err)}</p>
        <div class="actions"><button class="btn wide" data-start>${t("simulStart")}</button></div></div>`;
      root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go(`#/teach/${classId}`);
      root.querySelector<HTMLButtonElement>("[data-start]")!.onclick = async () => {
        const r = await startSimul(classId); if (!alive) return;
        if (r.error || !r.id) return intro(r.error ?? "");
        simul = await activeSimul(classId); if (alive && simul) void run(simul); else intro();
      };
    };
    if (!simul) return intro();
    void run(simul);

    // ---------- the running simul ----------
    async function run(sim: Simul) {
      let games: Game[] = await simulGames(sim.id), who = await simulBoards(sim.id), sel: string | null = null, busy = false, note = "";
      if (!alive) return;
      const tp = sim.teacher_player!;
      const who1 = (id: string): SimulBoard | undefined => who.find(w => w.game === id);
      const states = () => games.map(boardState);
      const chessOf = (g: Game) => new Chess(g.fen);
      const label = (id: string) => { const w = who1(id); return w ? esc(pupilLabel(classId, w.parent, w.profile_id)) : ""; };
      const face = (id: string) => { const w = who1(id); return avatarHTML(w ? { avatar: w.avatar, colour: w.colour } : { avatar: "cat", colour: "#9AA39E" }); };

      function draw() {
        const st = states(), sum = summarise(st), pick = sel ? games.find(g => g.id === sel) : undefined;
        board?.destroy(); board = null;
        root.innerHTML = `<div class="screen">${bar(`${t("simulTitle")} · ${title}`)}
          <p class="note"><b>${num(sum.waitingForTeacher)}</b> ${t("simulWaitingYou")} · ${t("simulScore").replace("{w}", num(sum.teacherWon)).replace("{d}", num(sum.drawn)).replace("{p}", num(sum.pupilWon))}</p>
          <div class="actions"><button class="btn" data-next>${icon("arrowRight")} ${t("simulNext")}</button><button class="btn ghost" data-seat>${t("simulSeat")}</button></div>
          <p class="note ${note ? "err" : ""}" data-note>${note || (games.length ? "" : t("simulNobody"))}</p>
          ${pick ? `<div class="pbar">${face(pick.id)}<div class="grow"><b>${label(pick.id) || t("simulBoards")}</b></div>
              <b>${pick.status === "finished" ? (pick.result === "1-0" ? t("simulYouWon") : pick.result === "0-1" ? t("simulPupilWon") : t("simulDrawn")) : chessOf(pick).turn() === "w" ? t("simulYourMove") : t("simulTheirMove")}</b></div>
            <div class="frame"><div class="boardwrap" data-board></div></div><div class="extra" data-extra></div>` : ""}
          <h2 class="sec">${t("simulBoards")} <span>${num(games.length)}</span></h2>
          <div class="simulgrid">${games.map((g, i) => {
            const s = st[i];
            return `<button class="simulcell ${s.toMove === "teacher" ? "wait" : ""} ${g.id === sel ? "on" : ""}" data-open="${g.id}">${mini(g.fen)}
              <span class="who">${face(g.id)}<small>${label(g.id)}</small></span>
              <small class="st">${s.toMove === "teacher" ? t("simulYourMove") : s.toMove === "pupil" ? t("simulTheirMove") : s.outcome === "teacher" ? t("simulYouWon") : s.outcome === "pupil" ? t("simulPupilWon") : t("simulDrawn")}</small></button>`;
          }).join("")}</div>
          <p class="note">${t("simulSafe")}</p>
          <div class="actions"><button class="danger" data-end>${t("simulEnd")}</button></div></div>`;
        root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go(`#/teach/${classId}`);
        root.querySelectorAll<HTMLButtonElement>("[data-open]").forEach(b => b.onclick = () => { sel = b.dataset.open!; note = ""; draw(); });
        root.querySelector<HTMLButtonElement>("[data-next]")!.onclick = () => {
          const n = nextBoard(states(), sel); if (n) { sel = n; note = ""; } else note = t("simulNoneWaiting");
          draw();
        };
        root.querySelector<HTMLButtonElement>("[data-seat]")!.onclick = async () => {
          const r = await seatSimul(sim.id); if (!alive) return;
          note = r.error ?? ""; games = await simulGames(sim.id); who = await simulBoards(sim.id); if (alive) draw();
        };
        root.querySelector<HTMLButtonElement>("[data-end]")!.onclick = async () => {
          if (!(await ask(t("simulEndConfirm"), { danger: true }))) return;
          const e = await endSimul(sim.id); if (e) { note = e; draw(); } else go(`#/teach/${classId}`);
        };
        if (pick) mount(pick);
      }

      /** The selected board, large, with the teacher's moves going through play-move like any online game. */
      function mount(g: Game) {
        board = new Board(root.querySelector("[data-board]")!, {});
        const showPos = () => { const c = chessOf(g), last = g.moves.at(-1); board!.set(placementFromFen(c.fen()), { lastMove: last ? [last.slice(0, 2), last.slice(2, 4)] as [CjSquare, CjSquare] : undefined, check: checkSquare(c) }); };
        showPos();
        const ctx = { board: board!, extra: root.querySelector<HTMLElement>("[data-extra]")!, say: () => {}, status: () => {}, done: () => {} };
        board.interact({
          canPick: s => { const c = chessOf(g), p = c.get(s as CjSquare); if (g.status !== "active" || c.turn() !== "w" || busy) return t("simulTheirMove"); return p && p.color === "w" ? true : t("whyNotYours"); },
          targets: s => chessOf(g).moves({ square: s as CjSquare, verbose: true }).map(m => m.to),
          onTap: () => {},
          onMove: async (from, to) => {
            const c = chessOf(g); if (g.status !== "active" || c.turn() !== "w" || busy) return;
            const legal = movesFor(c, from as CjSquare, to as CjSquare);
            if (!legal.length) { board!.shake(to); note = refusal(c.fen(), from, to); root.querySelector<HTMLElement>("[data-note]")!.textContent = note; return; }
            const pr = legal[0].promotion ? await promotion(ctx, "w") : undefined;
            const uci = legal[0].from + legal[0].to + (pr ?? "");
            busy = true;
            const e = await sendMove(g.id, tp, uci);                        // checked by play-move: legal, and the teacher's turn
            busy = false; if (!alive) return;
            if (e) { note = e; draw(); return; }
            // the live update brings the new position; move on to the next board that is waiting
            note = "";
          },
        });
      }

      unwatch = watchSimul(sim.id, g => {
        if (!alive) return;
        games = mergeGames(games, [g]);
        if (!who1(g.id)) void simulBoards(sim.id).then(w => { who = w; if (alive) draw(); }); else draw();
      });
      draw();
    }
  })();
  return leave;
}
