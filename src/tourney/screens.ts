// Club tournaments (DECISIONS #90): set up an event, run it round by round, enter results, see standings, print
// the pairings and the standings. Everything stays on this device (the names are typed by the organiser and are
// never uploaded); a file export/import moves an event to another device or keeps a backup.
import { num, t } from "../i18n";
import { icon } from "../icons";
import { currentRound, type Game, type Player, playingRound, type Result, roundDone, roundRobin, standings, suggestRounds, suggestSystem, swissRound, type Tournament } from "./engine";
import { ask, tell } from "../ui/dialog";

type Go = (h: string) => void;
const KEY = "scc-tourneys";
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const bar = (title: string) => `<div class="lessonbar"><button class="iconbtn" data-back aria-label="${t("back")}">${icon("chevronLeft")}</button><h1 class="grow">${title}</h1></div>`;

/** An imported file is rebuilt field by field from what a tournament may contain (full check 2026-10-08): anything
 *  else, or any value of the wrong kind, is dropped or refused, so a tampered file can't put markup on the page. */
function clean(x: unknown): Tournament | null {
  const o = x as Partial<Tournament> | null;
  if (!o || typeof o !== "object" || typeof o.id !== "string" || !/^t[a-z0-9]{1,20}$/.test(o.id)) return null;
  if (!Array.isArray(o.players) || !Array.isArray(o.games) || o.players.length > 64 || o.games.length > 2000) return null;
  const results: (Result | null)[] = ["1-0", "0-1", "½-½", null];
  const players: Player[] = o.players.map((p, i) => ({ id: String(p?.id ?? "").slice(0, 24), name: String(p?.name ?? "?").slice(0, 40), seed: Number(p?.seed) || i + 1, withdrawn: !!p?.withdrawn }));
  const ids = new Set(players.map(p => p.id));
  if (players.some(p => !p.id) || ids.size !== players.length) return null;
  const games: Game[] = [];
  for (const g of o.games) {
    const res = results.includes(g?.result as Result) ? (g!.result as Result | null) : null;
    if (!ids.has(g?.white as string) || (g?.black !== null && !ids.has(g?.black as string))) return null;
    games.push({ round: Math.max(1, Math.floor(Number(g.round)) || 1), board: Math.max(0, Math.floor(Number(g.board)) || 0), white: g.white, black: g.black ?? null, result: res });
  }
  return { id: o.id, name: String(o.name ?? "").slice(0, 60), created: String(o.created ?? "").slice(0, 10), system: o.system === "rr" ? "rr" : "swiss",
    rounds: Math.max(1, Math.min(20, Math.floor(Number(o.rounds)) || 1)), players, games };
}

const all = (): Tournament[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]") as Tournament[]; } catch { return []; } };
const saveAll = (list: Tournament[]) => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { void tell(t("tnStorageFull")); } };
const save = (tn: Tournament) => saveAll([tn, ...all().filter(x => x.id !== tn.id)]);
const find = (id: string) => all().find(x => x.id === id);
const nameOf = (tn: Tournament, id: string | null) => (id ? esc(tn.players.find(p => p.id === id)?.name ?? "?") : t("tnBye"));
/** Points as on a scoresheet: 2½, ¾, 0 (tie-breaks can be quarters: half a point against a half-point opponent). */
const pts = (n: number) => {
  const q = Math.round(n * 4), whole = Math.floor(q / 4), frac = ["", "¼", "½", "¾"][q % 4];
  return whole || !frac ? `${num(whole)}${frac}` : frac;
};

/** The list of events, with New and Import. */
export function tourneyHome(root: HTMLElement, go: Go) {
  const list = all();
  root.innerHTML = `<div class="screen">${bar(t("tnTitle"))}
    <p class="muted">${t("tnAbout")}</p>
    <div class="botlist">${list.map(x => `<button class="botcard" data-open="${x.id}"><span class="rushicon dark">${icon("trophy")}</span>
      <span class="grow"><b>${esc(x.name)}</b><small>${num(x.players.length)} ${t("tnPlayers")} · ${t(x.system === "rr" ? "tnRR" : "tnSwiss")} · ${t("tnRoundOf").replace("{r}", num(playingRound(x))).replace("{n}", num(x.rounds))}</small></span>${icon("arrowRight")}</button>`).join("")}</div>
    <div class="actions" style="flex-direction:column"><button class="btn wide" data-new>${icon("plus")} ${t("tnNew")}</button>
      <label class="btn ghost wide">${t("tnImport")}<input type="file" accept="application/json,.json" data-import hidden></label></div>
    <p class="note">${t("tnPrivacy")}</p></div>`;
  root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/play");
  root.querySelectorAll<HTMLButtonElement>("[data-open]").forEach(b => b.onclick = () => go(`#/tourney/${b.dataset.open}`));
  root.querySelector<HTMLButtonElement>("[data-new]")!.onclick = () => newTourney(root, go);
  root.querySelector<HTMLInputElement>("[data-import]")!.onchange = async e => {
    const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
    try {
      if (f.size > 2_000_000) throw new Error("too big");
      const tn = clean(JSON.parse(await f.text()));
      if (!tn) throw new Error("not an event");
      save(tn); go(`#/tourney/${tn.id}`);
    } catch { void tell(t("tnImportBad")); }
  };
}

function newTourney(root: HTMLElement, go: Go) {
  let system: "swiss" | "rr" | null = null;
  const draw = () => {
    const names = (root.querySelector<HTMLTextAreaElement>("[data-names]")?.value ?? "").split("\n").map(s => s.trim()).filter(Boolean);
    const sys = system ?? suggestSystem(names.length);
    const keep = { name: root.querySelector<HTMLInputElement>("[data-name]")?.value ?? "", names: root.querySelector<HTMLTextAreaElement>("[data-names]")?.value ?? "" };
    root.innerHTML = `<div class="screen">${bar(t("tnNew"))}
      <label class="note" for="tnn">${t("tnName")}</label><input id="tnn" class="textin" data-name aria-label="${t("tnName")}" maxlength="60" value="${esc(keep.name)}" placeholder="${t("tnNamePh")}">
      <label class="note" for="tnp">${t("tnNames")}</label><textarea id="tnp" class="textin" data-names aria-label="${t("tnNames")}" rows="8" placeholder="${t("tnNamesPh")}">${esc(keep.names)}</textarea>
      <p class="note">${t("tnSeedNote")} · <b>${num(names.length)}</b> ${t("tnPlayers")}</p>
      <h2 class="sec">${t("tnSystem")}</h2>
      <div class="seg" role="group"><button data-sys="rr" aria-pressed="${sys === "rr"}">${t("tnRR")}</button><button data-sys="swiss" aria-pressed="${sys === "swiss"}">${t("tnSwiss")}</button></div>
      <p class="note">${t(sys === "rr" ? "tnRRNote" : "tnSwissNote").replace("{n}", num(suggestRounds(Math.max(2, names.length), sys)))}</p>
      <div class="actions"><button class="btn wide" data-start ${names.length < 2 ? "disabled" : ""}>${t("tnStart")}</button></div></div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => tourneyHome(root, go);
    root.querySelector<HTMLTextAreaElement>("[data-names]")!.oninput = () => {
      const pos = root.querySelector<HTMLTextAreaElement>("[data-names]")!.selectionStart; draw();
      const ta = root.querySelector<HTMLTextAreaElement>("[data-names]")!; ta.focus(); ta.setSelectionRange(pos, pos);
    };
    root.querySelectorAll<HTMLButtonElement>("[data-sys]").forEach(b => b.onclick = () => { system = b.dataset.sys as "swiss" | "rr"; draw(); });
    root.querySelector<HTMLButtonElement>("[data-start]")!.onclick = () => {
      const players: Player[] = names.slice(0, 64).map((name, i) => ({ id: `p${i + 1}`, name: name.slice(0, 40), seed: i + 1 }));
      const tn: Tournament = { id: `t${Date.now().toString(36)}`, name: (keep.name || root.querySelector<HTMLInputElement>("[data-name]")!.value || t("tnTitle")).slice(0, 60),
        created: new Date().toISOString().slice(0, 10), system: sys, rounds: suggestRounds(players.length, sys), players, games: [] };
      tn.games = sys === "rr" ? roundRobin(players) : swissRound(tn) ?? [];
      save(tn); go(`#/tourney/${tn.id}`);
    };
  };
  draw();
}

/** One event: a round's boards with results, the standings, the players; print and export. */
export function tourneyView(root: HTMLElement, id: string, go: Go) {
  let tab: "round" | "standings" | "players" = "round", shown = 0;
  const draw = () => {
    const tn = find(id); if (!tn) return go("#/tourney");
    const cur = currentRound(tn), playing = playingRound(tn); if (!shown || shown > cur) shown = playing;
    const games = tn.games.filter(g => g.round === shown).sort((a, b) => (a.board || 99) - (b.board || 99));
    const done = cur > 0 && roundDone(tn, cur), more = tn.system === "swiss" && cur < tn.rounds;
    const resBtn = (g: Game, r: Result, label: string) => `<button class="resbtn" data-res="${g.round}:${g.board}:${r}" aria-pressed="${g.result === r}">${label}</button>`;
    const roundTab = `<div class="seg rounds" role="group">${Array.from({ length: cur }, (_, i) => `<button data-show="${i + 1}" aria-pressed="${shown === i + 1}">${num(i + 1)}</button>`).join("")}</div>
      <div class="boards">${games.map(g => g.black === null
        ? `<div class="boardline bye"><span class="bn">–</span><span class="grow"><b>${nameOf(tn, g.white)}</b> <small>${t(tn.system === "rr" ? "tnRest" : "tnByePoint")}</small></span></div>`
        : `<div class="boardline"><span class="bn">${num(g.board)}</span><span class="grow"><span class="pw"><i class="kingdot w"></i> ${nameOf(tn, g.white)}</span><span class="pb"><i class="kingdot b"></i> ${nameOf(tn, g.black)}</span></span>
          <span class="res">${resBtn(g, "1-0", "1–0")}${resBtn(g, "½-½", "½")}${resBtn(g, "0-1", "0–1")}</span></div>`).join("")}</div>
      ${shown === cur && more ? `<div class="actions"><button class="btn wide" data-next ${done ? "" : "disabled"}>${t("tnNextRound")}</button></div>
        ${done ? "" : `<p class="note">${t("tnEnterAll")}</p>`}` : ""}
      ${tn.games.filter(g => g.black).every(g => g.result) && !more ? `<p class="note"><b>${t("tnFinished")}</b></p>` : ""}
      <button class="btn ghost wide" data-print-round>${icon("book")} ${t("tnPrintRound").replace("{r}", num(shown))}</button>`;
    const st = standings(tn);
    const standTab = `<table class="boardtable"><tr><th></th><th></th><th>${t("tnPoints")}</th>${tn.system === "swiss" ? `<th>${t("tnBuchholz")}</th>` : ""}<th>${t("tnSB")}</th></tr>
      ${st.map(r => `<tr><td class="n">${num(r.place)}</td><td>${esc(r.name)}${tn.players.find(p => p.id === r.id)?.withdrawn ? ` <small>(${t("tnWithdrawn")})</small>` : ""}</td>
        <td class="n"><b>${pts(r.points)}</b></td>${tn.system === "swiss" ? `<td class="n">${pts(r.buchholz)}</td>` : ""}<td class="n">${pts(r.sb)}</td></tr>`).join("")}</table>
      <p class="note">${t(tn.system === "swiss" ? "tnTieSwiss" : "tnTieRR")}</p>
      <button class="btn ghost wide" data-print-standings>${icon("book")} ${t("tnPrintStandings")}</button>`;
    const playersTab = `<div class="botlist">${tn.players.map(p => `<div class="botcard"><span class="grow"><b>${num(p.seed)}. ${esc(p.name)}</b>${p.withdrawn ? `<small>${t("tnWithdrawn")}</small>` : ""}</span>
        ${tn.system === "swiss" ? `<button class="btn ghost" data-withdraw="${p.id}">${t(p.withdrawn ? "tnReturn" : "tnWithdraw")}</button>` : ""}</div>`).join("")}</div>
      ${tn.system === "swiss" ? `<form class="emailform" data-late><label class="note" for="late">${t("tnLate")}</label><input id="late" class="textin" maxlength="40" required>
        <button class="btn wide" type="submit">${icon("plus")} ${t("tnAddPlayer")}</button></form>` : `<p class="note">${t("tnRRFixed")}</p>`}
      <div class="actions" style="flex-direction:column"><button class="btn ghost wide" data-export>${t("tnExport")}</button><button class="danger" data-delete>${t("tnDelete")}</button></div>`;
    root.innerHTML = `<div class="screen">${bar(esc(tn.name))}
      <p class="muted">${num(tn.players.length)} ${t("tnPlayers")} · ${t(tn.system === "rr" ? "tnRR" : "tnSwiss")} · ${t("tnRoundOf").replace("{r}", num(playing)).replace("{n}", num(tn.rounds))}</p>
      <div class="seg" role="tablist">${(["round", "standings", "players"] as const).map(k => `<button data-tab="${k}" aria-pressed="${tab === k}">${t(k === "round" ? "tnRound" : k === "standings" ? "tnStandings" : "tnPlayersTab")}</button>`).join("")}</div>
      ${tab === "round" ? roundTab : tab === "standings" ? standTab : playersTab}
      <div class="printsheet" data-sheet></div></div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/tourney");
    root.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach(b => b.onclick = () => { tab = b.dataset.tab as typeof tab; draw(); });
    root.querySelectorAll<HTMLButtonElement>("[data-show]").forEach(b => b.onclick = () => { shown = +b.dataset.show!; draw(); });
    root.querySelectorAll<HTMLButtonElement>("[data-res]").forEach(b => b.onclick = () => {
      const [r, board, res] = b.dataset.res!.split(":"), x = find(id)!;
      const g = x.games.find(y => y.round === +r && y.board === +board)!;
      g.result = g.result === res ? null : (res as Result);   // a second tap clears it
      save(x); draw();
    });
    root.querySelector<HTMLButtonElement>("[data-next]")?.addEventListener("click", () => {
      const x = find(id)!, next = swissRound(x);
      if (!next) { void tell(t("tnNoPairing")); return; }
      x.games.push(...next); save(x); shown = currentRound(x); draw();
    });
    root.querySelectorAll<HTMLButtonElement>("[data-withdraw]").forEach(b => b.onclick = () => {
      const x = find(id)!, p = x.players.find(y => y.id === b.dataset.withdraw)!; p.withdrawn = !p.withdrawn; save(x); draw();
    });
    root.querySelector<HTMLFormElement>("[data-late]")?.addEventListener("submit", e => {
      e.preventDefault();
      const x = find(id)!, name = root.querySelector<HTMLInputElement>("#late")!.value.trim(); if (!name) return;
      x.players.push({ id: `p${Date.now().toString(36)}`, name: name.slice(0, 40), seed: x.players.length + 1 }); save(x); draw();
    });
    root.querySelector<HTMLButtonElement>("[data-export]")?.addEventListener("click", () => {
      const x = find(id)!, a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(x, null, 1)], { type: "application/json" }));
      a.download = `${x.name.replace(/[^\w-]+/g, "_") || "tournament"}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
    root.querySelector<HTMLButtonElement>("[data-delete]")?.addEventListener("click", () => {
      void ask(t("tnDeleteConfirm"), { danger: true }).then(ok => { if (ok) { saveAll(all().filter(x => x.id !== id)); go("#/tourney"); } });
    });
    // printing: the sheet is drawn into a print-only block, then the browser's print dialog opens
    const print = (html: string) => { root.querySelector<HTMLElement>("[data-sheet]")!.innerHTML = html; window.print(); };
    root.querySelector<HTMLButtonElement>("[data-print-round]")?.addEventListener("click", () => print(`<h1>${esc(tn.name)}</h1><h2>${t("tnRound")} ${num(shown)}</h2>
      <table><tr><th>${t("tnBoard")}</th><th>${t("colourWhite")}</th><th>${t("tnResult")}</th><th>${t("colourBlack")}</th></tr>
      ${games.map(g => g.black === null ? `<tr><td>–</td><td>${nameOf(tn, g.white)}</td><td>${tn.system === "rr" ? t("tnRestShort") : `${t("tnBye")} (1)`}</td><td></td></tr>`
        : `<tr><td>${num(g.board)}</td><td>${nameOf(tn, g.white)}</td><td class="box">${g.result ? esc(g.result.replace("½-½", "½–½")) : ""}</td><td>${nameOf(tn, g.black)}</td></tr>`).join("")}</table>`));
    root.querySelector<HTMLButtonElement>("[data-print-standings]")?.addEventListener("click", () => print(`<h1>${esc(tn.name)}</h1>
      <h2>${t("tnStandings")} · ${t("tnRoundOf").replace("{r}", num(playing)).replace("{n}", num(tn.rounds))}</h2>
      <table><tr><th></th><th></th><th>${t("tnPoints")}</th>${tn.system === "swiss" ? `<th>${t("tnBuchholz")}</th>` : ""}<th>${t("tnSB")}</th></tr>
      ${st.map(r => `<tr><td>${num(r.place)}</td><td>${esc(r.name)}</td><td>${pts(r.points)}</td>${tn.system === "swiss" ? `<td>${pts(r.buchholz)}</td>` : ""}<td>${pts(r.sb)}</td></tr>`).join("")}</table>`));
  };
  draw();
}
