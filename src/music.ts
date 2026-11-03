// Live kirtan from Sachkhand Sri Harmandar Sahib in the background (DECISIONS #129, as the user finally set it on
// 2026-10-29: "only Darbar Sahib… play in the background with a pause option, only audio, no video"). The audio is
// SGPC's live broadcast as streamed by SikhNet Radio, which the charity has permission to use (the user, 2026-10-29).
// Off until switched on in Settings; once on, a small floating button pauses and plays it from any screen. A browser
// only allows sound after a tap, so the first tap starts it. When Amritsar is not broadcasting the stream fails and the
// button says so. It pauses while the app is hidden, and never records, cuts or alters the broadcast.
import { icon } from "./icons";
import { t } from "./i18n";
import { store } from "./store";
import { OFFLINE_APP } from "./native";

export const LIVE_STREAM = "https://radio.sikhnet.com/proxy/channel09/live";   // SikhNet Radio: Sri Harimandir Sahib

let audio: HTMLAudioElement | null = null;
let paused = false;          // the learner pressed Pause (for this visit only; the setting stays on)
let offAir = false;          // the stream could not be reached (no broadcast at this hour, or offline)
let offAirAt = 0;            // when it last failed: while off air it is retried by a button press, or at most every 60 s
const RETRY_MS = 60_000;
let button: HTMLButtonElement | null = null;

function draw() {
  const on = !!store.get().music && !OFFLINE_APP;
  if (!on) { button?.remove(); button = null; return; }
  if (!button) {
    button = document.createElement("button");
    button.className = "livepill";
    // off air, a press is "try again" (it must not flip Pause); otherwise it is Pause / Play
    button.onclick = () => { if (offAir) { offAir = false; paused = false; } else paused = !paused; sync(); };
    document.body.appendChild(button);
  }
  const playing = !paused && !offAir;
  button.setAttribute("aria-pressed", String(playing));
  // a round icon button, so it never covers a game's buttons on a phone; its words are its label and tooltip
  const label = t(offAir ? "liveOffAir" : playing ? "livePause" : "livePlay");
  button.setAttribute("aria-label", label); button.title = label;
  button.classList.toggle("offair", offAir);
  button.innerHTML = icon(playing ? "music" : "play");
}

function sync() {
  const want = !!store.get().music && !OFFLINE_APP && !paused && document.visibilityState === "visible";
  // off air: no retry on every store change or tap; only a button press (offAir cleared there) or after RETRY_MS
  if (want && offAir && Date.now() - offAirAt < RETRY_MS) { draw(); return; }
  if (want && offAir) offAir = false;
  if (want) {
    if (!audio) {
      audio = new Audio();
      audio.volume = 0.45;
      const mine = audio;
      audio.onerror = () => { if (audio !== mine) return; offAir = true; offAirAt = Date.now(); audio?.removeAttribute("src"); audio = null; draw(); };
      audio.onplaying = () => { offAir = false; draw(); };
      audio.src = LIVE_STREAM;   // a live stream: reconnecting (not resuming) is how it catches up after a pause
    }
    if (audio.paused) void audio.play().catch(() => { /* waits for the learner's first tap */ });
  } else if (audio) { audio.pause(); audio.removeAttribute("src"); audio.load(); audio = null; }
  draw();
}

/** Called once at start-up. */
export function startMusic() {
  store.subscribe(sync);
  document.addEventListener("visibilitychange", sync);
  document.addEventListener("pointerdown", () => { if (audio?.paused) sync(); });
  sync();
}
