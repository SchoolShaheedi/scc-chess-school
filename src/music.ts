// Soft background music and the Simran page (DECISIONS #129). Both recordings are Shaheedi Bunga's own (the user,
// 2026-10-29). The background is an instrumental only (Mystic Strings): it is quiet, off until switched on in
// Settings, and pauses when the app is hidden. Simran is never a bed under something else (the sound library's rule
// for sung Bani and simran): it plays only on its own page, chosen by the learner, and the background music stops
// while it plays. Neither file is in the offline cache; they stream on the website and ship inside the Android app.
import { icon } from "./icons";
import { t } from "./i18n";
import { store } from "./store";

const BG = "audio/music/mystic-strings.mp3", SIMRAN = "audio/music/simran.mp3";
let bg: HTMLAudioElement | null = null;
let simranPlaying = false;

function sync() {
  const want = !!store.get().music && !simranPlaying && document.visibilityState === "visible";
  if (want) {
    if (!bg) { bg = new Audio(BG); bg.loop = true; bg.volume = 0.18; }
    if (bg.paused) void bg.play().catch(() => { /* a browser only allows sound after a tap: the next tap starts it */ });
  } else bg?.pause();
}

/** Called once at start-up. */
export function startMusic() {
  store.subscribe(sync);
  document.addEventListener("visibilitychange", sync);
  document.addEventListener("pointerdown", sync);   // the first tap is what browsers need before any sound can start
  sync();
}

/** The Simran page: Vaheguru simran plays, on a loop, only while this page is open. */
export function simranScreen(root: HTMLElement, go: (h: string) => void): () => void {
  const a = new Audio(SIMRAN);
  a.loop = true; a.volume = 0.8;
  root.innerHTML = `<div class="screen simran">
    <div class="lessonbar"><button class="iconbtn" data-back aria-label="${t("back")}">${icon("chevronLeft")}</button>
      <h1 class="grow">${t("simranTitle")}</h1></div>
    <div class="hero"><div class="simranglow" aria-hidden="true"></div>
      <h1 lang="pa">ਵਾਹਿਗੁਰੂ</h1><p>${t("simranNote")}</p></div>
    <div class="actions"><button class="btn wide" data-play aria-pressed="false">${icon("play")} ${t("simranPlay")}</button></div></div>`;
  const btn = root.querySelector<HTMLButtonElement>("[data-play]")!;
  const show = () => {
    btn.setAttribute("aria-pressed", String(simranPlaying));
    btn.innerHTML = simranPlaying ? `${icon("music")} ${t("simranStop")}` : `${icon("play")} ${t("simranPlay")}`;
    root.querySelector(".simran")?.classList.toggle("on", simranPlaying);
  };
  btn.onclick = () => {
    simranPlaying = !simranPlaying;
    if (simranPlaying) void a.play().catch(() => { simranPlaying = false; show(); }); else a.pause();
    sync(); show();
  };
  root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/settings");
  return () => { a.pause(); a.removeAttribute("src"); a.load(); simranPlaying = false; sync(); };
}
