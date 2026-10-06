// The openings trainer (DECISIONS #74): choose one opening per slot, then drill its lines on a schedule.
// Opens once Level 6 (openings) is passed, or after a placement above it. Lines are played with the same
// "line" runner the lessons use: the app plays the other side's book moves, a slip gets an arrow.
import { Board } from "../chess/board";
import { REPERTOIRE, repOption, SLOTS, type Slot } from "../content/repertoire";
import { num, t, tx } from "../i18n";
import { icon } from "../icons";
import { runExercise } from "../lesson/exercises";
import { sound } from "../sound";
import { store, today, unlockAll } from "../store";
import { isDue, learnt, newCard, review, WAITS } from "./srs";

type Go = (h: string) => void;
const SESSION = 10;

export const openingsOpen = () => unlockAll() || !!store.get().tests[6]?.passed || store.get().placed >= 7;

/** Every line of the chosen options, with its card. */
export function myLines() {
  const r = store.get().rep;
  return SLOTS.flatMap(({ slot }) => {
    const o = r[slot] ? repOption(r[slot]!) : undefined;
    return o ? o.lines.map((line, i) => ({ key: `${o.id}:${i}`, o, line, card: r.cards[`${o.id}:${i}`] ?? newCard(today()) })) : [];
  });
}
export const dueCount = () => myLines().filter(l => isDue(l.card, today())).length;

const bar = (title: string) => `<div class="lessonbar"><button class="iconbtn" data-back aria-label="${t("back")}">${icon("chevronLeft")}</button><h1 class="grow">${title}</h1></div>`;

export function openingsHub(root: HTMLElement, go: Go) {
  if (!openingsOpen()) {
    root.innerHTML = `<div class="screen">${bar(t("openTitle"))}<div class="hero"><div class="trophy light">${icon("lock")}</div>
      <h1>${t("openTitle")}</h1><p>${t("openLocked")}</p></div></div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/");
    return;
  }
  const r = store.get().rep, lines = myLines(), due = dueCount();
  root.innerHTML = `<div class="screen">${bar(t("openTitle"))}
    <p class="muted">${t("openAbout")}</p>
    <div class="slots">${SLOTS.map(({ slot, title }) => {
      const o = r[slot] ? repOption(r[slot]!) : undefined, mine = lines.filter(l => l.o === o);
      return `<button class="slotcard" data-slot="${slot}"><small>${tx(title)}</small>
        ${o ? `<b>${tx(o.name)}</b><span class="lineprog">${num(mine.filter(l => learnt(l.card)).length)} / ${num(mine.length)} ${t("openLearnt")}</span>`
            : `<b class="pick">${t("openChoose")}</b>`}${icon("arrowRight")}</button>`;
    }).join("")}</div>
    <div class="actions" style="flex-direction:column">
      ${lines.length ? `<button class="btn wide" data-train>${due ? t("openTrain").replace("{n}", num(Math.min(due, SESSION))) : t("openPractise")}</button>
        ${due ? "" : `<p class="note" style="text-align:center">${t("openNoneDue")}</p>`}` : `<p class="note" style="text-align:center">${t("openStart")}</p>`}
    </div></div>`;
  root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/");
  root.querySelectorAll<HTMLButtonElement>("[data-slot]").forEach(b => b.onclick = () => go(`#/openings/choose/${b.dataset.slot}`));
  root.querySelector<HTMLButtonElement>("[data-train]")?.addEventListener("click", () => go("#/openings/train"));
}

export function chooseOpening(root: HTMLElement, slot: Slot, go: Go) {
  const cur = store.get().rep[slot], title = SLOTS.find(s => s.slot === slot)!.title;
  root.innerHTML = `<div class="screen">${bar(tx(title))}
    <div class="botlist">${REPERTOIRE.filter(o => o.slot === slot).map(o => `<button class="botcard ${o.id === cur ? "on" : ""}" data-o="${o.id}">
      <span class="grow"><b>${tx(o.name)}</b><small>${tx(o.about)}</small><small class="rating">${num(o.lines.length)} ${t("openLines")}</small></span>
      ${icon(o.id === cur ? "check" : "arrowRight", "go")}</button>`).join("")}</div></div>`;
  root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/openings");
  root.querySelectorAll<HTMLButtonElement>("[data-o]").forEach(b => b.onclick = () => {
    const o = repOption(b.dataset.o!)!, r = store.get().rep, cards = { ...r.cards };
    o.lines.forEach((_, i) => { cards[`${o.id}:${i}`] ??= newCard(today()); });   // a returning choice keeps its progress
    store.set({ rep: { ...r, [slot]: o.id, cards } });
    go("#/openings");
  });
}

export function trainOpenings(root: HTMLElement, go: Go): () => void {
  const all = myLines(), due = all.filter(l => isDue(l.card, today()));
  // nothing due: practise the lines that come up soonest, without moving their schedule
  const practice = !due.length;
  const queue = (practice ? [...all].sort((a, b) => a.card.due.localeCompare(b.card.due)) : due.sort((a, b) => a.card.due.localeCompare(b.card.due))).slice(0, SESSION);
  let i = 0, clean = 0, board: Board | null = null, cleanup: (() => void) | null = null;
  const teardown = () => { cleanup?.(); cleanup = null; board?.destroy(); board = null; };

  function next() {
    teardown();
    if (i >= queue.length) return finish();
    const { key, o, line, card } = queue[i];
    root.innerHTML = `<div class="screen">${bar(tx(o.name))}
      <div class="segbar">${queue.map((_, k) => `<i class="${k < i ? "done" : k === i ? "on" : ""}"></i>`).join("")}</div>
      <div class="coach"><div class="bubble" data-say aria-live="polite"></div></div>
      <div class="frame"><div class="boardwrap" data-board></div></div>
      <div class="status" data-status></div><div class="extra" data-extra></div>
      <div class="actions"><button class="btn" data-continue disabled>${t("continue")}</button></div></div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/openings");
    const bubble = root.querySelector<HTMLElement>("[data-say]")!, btn = root.querySelector<HTMLButtonElement>("[data-continue]")!;
    const say = (text: string, tone: "ok" | "no" | "info" = "info") => {
      bubble.innerHTML = (tone === "info" ? "" : icon(tone, "tone")) + text; bubble.className = `bubble ${tone === "info" ? "" : tone}`;
      if (tone === "no") sound.wrong();
    };
    board = new Board(root.querySelector("[data-board]")!, {});
    cleanup = runExercise({ kind: "line", side: o.side, moves: line.moves, opening: line.opening, prompt: { en: "Play your line.", pa: "ਆਪਣੀ ਲਾਈਨ ਖੇਡੋ।" } }, {
      board, extra: root.querySelector("[data-extra]")!, say,
      status: html => { root.querySelector("[data-status]")!.innerHTML = html; },
      done: mistakes => {
        const ok = mistakes === 0; if (ok) { clean++; sound.correct(); }
        if (!practice) {
          const c = review(card, ok, today()), r = store.get().rep;
          store.set({ rep: { ...r, cards: { ...r.cards, [key]: c } } });
          say(ok ? (WAITS[card.box] === 1 ? t("openNextTomorrow") : t("openNext").replace("{n}", num(WAITS[card.box]))) : t("openAgain"), ok ? "ok" : "no");
        } else say(ok ? t("lineDone") : t("openAgain"), ok ? "ok" : "no");
        btn.disabled = false; btn.focus();
      },
    });
    btn.onclick = () => { i++; next(); };
  }

  function finish() {
    store.recordPractice();
    root.innerHTML = `<div class="screen"><div class="complete"><div class="trophy light">${icon("trophy")}</div>
      <h1>${num(clean)} / ${num(queue.length)}</h1><p>${t("openClean")}</p>
      <p class="note">${dueCount() ? t("openStillDue").replace("{n}", num(dueCount())) : t("openNoneDue")}</p></div>
      <div class="actions"><button class="btn wide" data-hub>${t("openTitle")}</button></div></div>`;
    root.querySelector<HTMLButtonElement>("[data-hub]")!.onclick = () => go("#/openings");
  }

  if (!openingsOpen() || !queue.length) { go("#/openings"); return teardown; }
  next();
  return teardown;
}
