// The boss battle (DECISIONS #109, option A): from a level card, the level's hero waits as the boss. Three rounds in
// order: 1, three puzzles on the level's idea, all right in a row; 2, Magical Chess against the hero; 3, a real game
// against the hero at the top of the level's band. Winning the third makes the hero yours. Also the hero's intro card,
// shown before the level's first lesson and its key lesson.
import { Board } from "../chess/board";
import { confetti } from "../celebrate";
import { expand, LEVELS } from "../content/levels";
import { num, t, tx } from "../i18n";
import { icon } from "../icons";
import { runExercise } from "../lesson/exercises";
import type { Exercise } from "../lesson/types";
import { playBoss } from "../bots/play";
import { powerBoss } from "../power/screen";
import { sound } from "../sound";
import { store } from "../store";
import { bossBot, bossRating, type Hero, heroArt, heroOf, hasHero, roundsWon, winRound } from "./heroes";

const name = (h: Hero) => tx(h.name);

/** The boss page: the hero, the three rounds (won, next, still to come), and the prize once all three are won. */
export function bossScreen(root: HTMLElement, level: number, open: boolean, go: (h: string) => void) {
  const h = heroOf(level), won = roundsWon(level), mine = hasHero(h.id);
  const sub = (k: "bossR1Sub" | "bossR2Sub" | "bossR3Sub") => t(k).replace("{hero}", name(h)).replace("{r}", num(bossRating(level)));
  const round = (n: 1 | 2 | 3, title: "bossR1" | "bossR2" | "bossR3", s: "bossR1Sub" | "bossR2Sub" | "bossR3Sub") =>
    `<div class="rd ${won >= n ? "done" : won + 1 === n && open ? "now" : ""}"><span>${won >= n ? "✓" : num(n)}</span><b>${t(title).replace(/^\S+ · /, "")}</b><small>${sub(s)}</small></div>`;
  root.innerHTML = `<div class="screen">
    <div class="lessonbar"><button class="iconbtn" data-back aria-label="${t("back")}">${icon("chevronLeft")}</button>
      <h1 class="grow">${t("bossOf").replace("{n}", num(level))}</h1></div>
    <div class="bosscard"><img src="${heroArt(h.id, "action")}" alt=""><h2>${name(h)}</h2><p>${tx(h.virtue)} · ${tx(LEVELS[level - 1].title)}</p></div>
    ${mine ? prize(h) : `<p class="note">${t("bossIntro").replace("{hero}", name(h))}</p>`}
    <div class="rounds">${round(1, "bossR1", "bossR1Sub")}${round(2, "bossR2", "bossR2Sub")}${round(3, "bossR3", "bossR3Sub")}</div>
    <div class="actions" style="flex-direction:column">
      ${!open ? `<p class="note">${t("bossLocked")}</p>` : won < 3 ? `<button class="btn gold wide" data-round="${won + 1}">${t("bossStartRound").replace("{n}", num(won + 1))}</button>` : ""}
    </div></div>`;
  root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/");
  root.querySelector<HTMLButtonElement>("[data-round]")?.addEventListener("click", e => go(`#/boss/${level}/${(e.currentTarget as HTMLElement).dataset.round}`));
  wirePrize(root, h, () => bossScreen(root, level, open, go));
}

/** The prize card: the hero is yours; use it as your picture (on your own screens only) or switch back. */
function prize(h: Hero): string {
  const using = store.get().heroAvatar === h.id;
  return `<div class="heroprize"><img class="heroface" src="${heroArt(h.id)}" alt=""><b>${t("heroYours").replace("{hero}", name(h))}</b>
    ${using ? `<small>${t("heroUsing")}</small><button class="btn ghost" data-useanimal>${t("heroUseAnimal")}</button>`
      : `<button class="btn gold" data-usehero>${t("heroUse")}</button>`}</div>`;
}
function wirePrize(root: HTMLElement, h: Hero, again: () => void) {
  root.querySelector<HTMLButtonElement>("[data-usehero]")?.addEventListener("click", () => { store.set({ heroAvatar: h.id }); again(); });
  root.querySelector<HTMLButtonElement>("[data-useanimal]")?.addEventListener("click", () => { store.set({ heroAvatar: undefined }); again(); });
}

/** One round. Only the next round can be played; anything else goes back to the boss page. */
export function bossRound(root: HTMLElement, level: number, n: number, open: boolean, go: (h: string) => void): () => void {
  const back = `#/boss/${level}`;
  if (!open || n !== roundsWon(level) + 1) { go(back); return () => {}; }
  const done = (r: "won" | "lost" | "draw") => { if (r === "won") winRound(level, n as 2 | 3); };
  if (n === 2) return powerBoss(root, bossBot(level), go, back, done);
  if (n === 3) return playBoss(root, bossBot(level), go, back, done);
  return challenge(root, level, go, back);
}

/** Round 1: three puzzles from the level's own test packs (Level 1: loose pieces), all right first time, in a row. */
function challenge(root: HTMLElement, level: number, go: (h: string) => void, back: string): () => void {
  const packs = LEVELS[level - 1].test?.packs ?? [{ pack: "hanging-easy", count: 3 }];
  const pick = [...packs].sort(() => Math.random() - 0.5);
  const list: Exercise[] = [0, 1, 2].map(i => ({ kind: "pack" as const, pack: pick[i % pick.length].pack, count: 1,
    prompt: { en: "Find the best move.", pa: "ਸਭ ਤੋਂ ਵਧੀਆ ਚਾਲ ਲੱਭੋ।" } }));
  const queue = expand(list);
  const h = heroOf(level);
  let i = -1, board: Board | null = null, cleanup: (() => void) | null = null;
  const teardown = () => { cleanup?.(); cleanup = null; board?.destroy(); board = null; };
  function next() {
    teardown(); i++;
    if (i >= queue.length) {
      const earned = winRound(level, 1);
      sound.complete(); void earned;
      root.innerHTML = `<div class="screen donescreen"><div class="complete"><img class="heroface" src="${heroArt(h.id, "lose")}" alt="">
        <h1>${t("bossRoundWon")}</h1></div><div class="actions"><button class="btn gold wide" data-back2>${t("bossBack")}</button></div></div>`;
      confetti(root.querySelector(".screen")!);
      root.querySelector<HTMLButtonElement>("[data-back2]")!.onclick = () => go(back);
      return;
    }
    root.innerHTML = `<div class="screen">
      <div class="lessonbar"><button class="iconbtn" data-back aria-label="${t("back")}">${icon("chevronLeft")}</button>
        <h1 class="grow">${t("bossR1")} · ${t("bossPuzzle").replace("{i}", num(i + 1))}</h1><img class="heroface sm" src="${heroArt(h.id)}" alt=""></div>
      <div class="coach"><div class="bubble" data-say aria-live="polite"></div></div>
      <div class="frame"><div class="boardwrap" data-board></div></div>
      <div class="status" data-status></div><div class="extra" data-extra></div>
      <div class="actions"><button class="btn" data-continue disabled>${t("continue")}</button></div></div>`;
    root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go(back);
    const bubble = root.querySelector<HTMLElement>("[data-say]")!, btn = root.querySelector<HTMLButtonElement>("[data-continue]")!;
    board = new Board(root.querySelector("[data-board]")!, {});
    cleanup = runExercise(queue[i], {
      board, extra: root.querySelector("[data-extra]")!,
      say: (text, tone = "info") => { bubble.innerHTML = (tone === "info" ? "" : icon(tone, "tone")) + text; bubble.className = `bubble ${tone === "info" ? "" : tone}`; },
      status: html => { root.querySelector("[data-status]")!.innerHTML = html; },
      done: mistakes => {
        if (mistakes > 0) {
          // all three right in a row: one slip and the round starts again, with new puzzles
          sound.wrong();
          bubble.innerHTML = icon("no", "tone") + t("bossTryAgain"); bubble.className = "bubble no";
          btn.textContent = t("retry"); btn.disabled = false; btn.onclick = () => { teardown(); go(`#/boss/${level}/1?${Date.now()}`); };
          return;
        }
        sound.correct(); btn.disabled = false; btn.focus(); btn.onclick = next;
      },
    });
  }
  next();
  return teardown;
}

/** The hero's card before the level's first lesson and its key lesson: the action pose, the virtue, one line. */
export function heroIntro(root: HTMLElement, level: number, onGo: () => void) {
  const h = heroOf(level);
  root.innerHTML = `<div class="screen herointro">
    <img src="${heroArt(h.id, "action")}" alt="">
    <p class="kick">${t("level")} ${num(level)} · ${tx(LEVELS[level - 1].title)}</p>
    <h1>${name(h)}</h1><p class="virtue">${tx(h.virtue)}</p>
    <blockquote>${tx(h.line)}</blockquote>
    <div class="actions"><button class="btn gold wide" data-go>${t("heroLetsGo")}</button></div></div>`;
  root.querySelector<HTMLButtonElement>("[data-go]")!.onclick = onGo;
}
