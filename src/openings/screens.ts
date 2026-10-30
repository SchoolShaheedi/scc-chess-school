// The openings review (DECISIONS #74, simplified by #133a "no set-up"): every course opening whose Learn step is done
// joins by itself; its main line is the review card. One number due today, one button, a list of your openings.
// Opens once Level 6 (openings) is passed, or after a placement above it. Lines are played with the same
// "line" runner the lessons use: the app plays the other side's book moves, a slip gets an arrow.
import { Board } from "../chess/board";
import { num, t, tx } from "../i18n";
import { icon } from "../icons";
import { runExercise } from "../lesson/exercises";
import { sound } from "../sound";
import { store, today, unlockAll } from "../store";
import { isDue, learnt, review, WAITS } from "./srs";
import { daysUntil, reviewLines } from "./review";

type Go = (h: string) => void;
const SESSION = 10;

export const openingsOpen = () => unlockAll() || !!store.get().tests[6]?.passed || store.get().placed >= 7;

/** Every opening in the review, with its card. */
export const myLines = () => reviewLines(store.get().rep, today());
export const dueCount = () => myLines().filter(l => isDue(l.card, today())).length;

const bar = (title: string) => `<div class="lessonbar"><button class="iconbtn" data-back aria-label="${t("back")}">${icon("chevronLeft")}</button><h1 class="grow">${title}</h1></div>`;

export function openingsHub(root: HTMLElement, go: Go) {
  if (!openingsOpen()) {
    root.innerHTML = `<div class="screen">${bar(t("openTitle"))}<div class="hero"><div class="trophy light">${icon("lock")}</div>
      <h1>${t("openTitle")}</h1><p>${t("openLocked")}</p></div></div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/openings");
    return;
  }
  const lines = myLines(), due = dueCount(), td = today();
  const dot = (l: (typeof lines)[number]) => {
    const tick = learnt(l.card) ? ` · ${icon("check")}` : "";
    if (isDue(l.card, td)) return `<span class="duedot on" aria-hidden="true"></span><small class="rating">${t("openDueToday")}${tick}</small>`;
    const n = daysUntil(l.card, td);
    return `<span class="duedot" aria-hidden="true"></span><small class="rating">${n === 1 ? t("openNextIn1") : t("openNextIn").replace("{n}", num(n))}${tick}</small>`;
  };
  root.innerHTML = `<div class="screen">${bar(t("openTitle"))}
    <p class="muted">${t("openAbout")}</p>
    ${lines.length ? `<div class="duebig"><b>${num(due)}</b><span>${t("openLinesDue")}</span></div>
      <div class="actions" style="flex-direction:column"><button class="btn wide" data-train>${due ? t("openReviewNow") : t("openPractise")}</button>
        ${due ? "" : `<p class="note" style="text-align:center">${t("openNoneDue")}</p>`}</div>
      <h2 class="sec">${t("openYourOpenings")}</h2>
      <div class="botlist">${lines.map(l => `<button class="botcard" data-o="${l.o.id}"><span class="grow"><b>${tx(l.o.name)}</b><span class="duerow">${dot(l)}</span></span>${icon("arrowRight", "go")}</button>`).join("")}</div>`
      : `<p class="note" style="text-align:center">${t("openStart")}</p>
      <div class="actions"><button class="btn wide" data-course>${t("courseTitle")}</button></div>`}
    </div>`;
  root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/openings");
  root.querySelector<HTMLButtonElement>("[data-course]")?.addEventListener("click", () => go("#/openings"));
  root.querySelector<HTMLButtonElement>("[data-train]")?.addEventListener("click", () => go("#/openings/train"));
  root.querySelectorAll<HTMLButtonElement>("[data-o]").forEach(b => b.onclick = () => go(`#/openings/o/${b.dataset.o}`));
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
    const { key, o, card } = queue[i];
    root.innerHTML = `<div class="screen">${bar(tx(o.name))}
      <div class="segbar">${queue.map((_, k) => `<i class="${k < i ? "done" : k === i ? "on" : ""}"></i>`).join("")}</div>
      <div class="coach"><div class="bubble" data-say aria-live="polite"></div></div>
      <div class="frame"><div class="boardwrap" data-board></div></div>
      <div class="status" data-status></div><div class="extra" data-extra></div>
      <div class="actions"><button class="btn" data-continue disabled>${t("continue")}</button></div></div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/openings/review");
    const bubble = root.querySelector<HTMLElement>("[data-say]")!, btn = root.querySelector<HTMLButtonElement>("[data-continue]")!;
    const say = (text: string, tone: "ok" | "no" | "info" = "info") => {
      bubble.innerHTML = (tone === "info" ? "" : icon(tone, "tone")) + text; bubble.className = `bubble ${tone === "info" ? "" : tone}`;
      if (tone === "no") sound.wrong();
    };
    board = new Board(root.querySelector("[data-board]")!, {});
    cleanup = runExercise({ kind: "line", side: o.side, moves: o.main.moves, opening: tx(o.name), prompt: { en: "Play your line.", pa: "ਆਪਣੀ ਲਾਈਨ ਖੇਡੋ।" } }, {
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
    root.querySelector<HTMLButtonElement>("[data-hub]")!.onclick = () => go("#/openings/review");
  }

  if (!openingsOpen() || !queue.length) { go("#/openings/review"); return teardown; }
  next();
  return teardown;
}
