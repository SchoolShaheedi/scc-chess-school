// Simran in the background, and the Simran page with live kirtan (DECISIONS #129, changed the same day by the user:
// "only add simran musics"). The background music is simran only, one of two recordings of Shaheedi Bunga's own,
// chosen in Settings; it is quiet, off until switched on, and pauses when the app is hidden.
// Live kirtan from Sachkhand Sri Harmandar Sahib is SGPC's: they reserve its rights and forbid re-streaming it, and
// YouTube does not allow its player to be hidden, so it is offered only as SGPC's own YouTube live, in a visible player
// on the Simran page, loaded only when the learner presses the button (youtube-nocookie.com; the privacy page says so).
// The background simran stops while the page's own recording or the live player is on.
import { icon } from "./icons";
import { t } from "./i18n";
import { store } from "./store";

export const TRACKS = { simran3: "audio/music/simran.mp3", camp: "audio/music/simran-camp.mp3" } as const;
export type Track = keyof typeof TRACKS;
const SGPC_CHANNEL = "UCYn6UEtQ771a_OWSiNBoG8w";          // "SGPC, Sri Amritsar", SGPC's official channel
const SGPC_OTHER = "https://www.youtube.com/@officialsgpc/live";   // their other official channel, as a fallback link

let bg: HTMLAudioElement | null = null, bgTrack: Track | null = null;
let pageListening = false;   // the Simran page is playing its recording or the live player

const track = (): Track => store.get().musicTrack ?? "simran3";

function sync() {
  const want = !!store.get().music && !pageListening && document.visibilityState === "visible";
  if (want) {
    if (!bg || bgTrack !== track()) { bg?.pause(); bgTrack = track(); bg = new Audio(TRACKS[bgTrack]); bg.loop = true; bg.volume = 0.3; }
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

/** The Simran page: the chosen simran recording, and SGPC's live kirtan from Sachkhand Sri Harmandar Sahib. */
export function simranScreen(root: HTMLElement, go: (h: string) => void): () => void {
  const a = new Audio(TRACKS[track()]);
  a.loop = true; a.volume = 0.8;
  let playing = false, live = false;
  root.innerHTML = `<div class="screen simran">
    <div class="lessonbar"><button class="iconbtn" data-back aria-label="${t("back")}">${icon("chevronLeft")}</button>
      <h1 class="grow">${t("simranTitle")}</h1></div>
    <div class="hero"><div class="simranglow" aria-hidden="true"></div>
      <h1 lang="pa">ਵਾਹਿਗੁਰੂ</h1><p>${t("simranNote")}</p></div>
    <div class="actions"><button class="btn wide" data-play aria-pressed="false">${icon("play")} ${t("simranPlay")}</button></div>
    <div class="group livebox"><h2>${t("liveTitle")}</h2><p class="note">${t("liveNote")}</p>
      <div data-live></div>
      <button class="btn ghost wide" data-golive>${icon("play")} ${t("liveOpen")}</button>
      <a class="linkbtn" href="${SGPC_OTHER}" target="_blank" rel="noopener">${t("liveOther")}</a></div></div>`;
  const btn = root.querySelector<HTMLButtonElement>("[data-play]")!;
  const show = () => {
    pageListening = playing || live;
    btn.setAttribute("aria-pressed", String(playing));
    btn.innerHTML = playing ? `${icon("music")} ${t("simranStop")}` : `${icon("play")} ${t("simranPlay")}`;
    root.querySelector(".simran")?.classList.toggle("on", playing);
    sync();
  };
  btn.onclick = () => {
    playing = !playing;
    if (playing) void a.play().catch(() => { playing = false; show(); }); else a.pause();
    show();
  };
  root.querySelector<HTMLButtonElement>("[data-golive]")!.onclick = e => {
    // the player is loaded only now, on the learner's own tap; the recording stops so the two never play together
    playing = false; a.pause(); live = true; show();
    (e.currentTarget as HTMLElement).remove();
    root.querySelector("[data-live]")!.innerHTML = `<div class="liveframe"><iframe title="${t("liveTitle")}"
      src="https://www.youtube-nocookie.com/embed/live_stream?channel=${SGPC_CHANNEL}&autoplay=1"
      allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
  };
  root.querySelector<HTMLButtonElement>("[data-back]")!.onclick = () => go("#/settings");
  return () => { a.pause(); a.removeAttribute("src"); a.load(); pageListening = false; sync(); };
}
