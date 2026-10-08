// Coach art: the user's illustrations (public/art/coach/, cut by tools/slice-art.py).
// Young = Chidi the sparrow; Junior = the teen coach, Singh or Kaur by the learner's choice;
// Adult = no coach. The old in-code drawings below stay only as an offline fallback.
import { type Look, store } from "./store";

export type Mood = "neutral" | "happy" | "think" | "oops" | "cheer";

/** Chidi, the Young look's sparrow. DECISIONS #49: an animal never wears a dastaar or patka. */
function chidi(mood: Mood): string {
  const eye = mood === "happy"
    ? `<path d="M23 31q3-4 6 0M37 31q3-4 6 0" stroke="#241A10" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
    : `<circle cx="26" cy="31" r="3.2" fill="#241A10"/><circle cx="40" cy="31" r="3.2" fill="#241A10"/><circle cx="27" cy="30" r="1" fill="#fff"/><circle cx="41" cy="30" r="1" fill="#fff"/>`;
  const wing = mood === "happy" ? `<path d="M12 40q-8-10-2-18q6 8 8 16z" fill="#8A5A34"/><path d="M54 40q8-10 2-18q-6 8-8 16z" fill="#8A5A34"/>`
    : mood === "think" ? `<path d="M50 44q2-8-6-10q-2 6 2 12z" fill="#8A5A34"/>` : "";
  return `<svg viewBox="0 0 66 66" aria-hidden="true">
    <ellipse cx="33" cy="40" rx="22" ry="21" fill="#A8703F"/>
    <ellipse cx="33" cy="47" rx="14" ry="12" fill="#F5DDB8"/>
    ${wing}
    <ellipse cx="33" cy="22" rx="17" ry="12" fill="#8A5A34"/>
    <path d="M29 11c1-4 4-6 6-6-1 2-1 4 0 6z" fill="#8A5A34"/>
    ${eye}
    <path d="M30 36l3 5 3-5z" fill="#EBB53F" stroke="#B15D10" stroke-width="1"/>
    ${mood === "oops" ? `<ellipse cx="33" cy="44" rx="2.5" ry="2" fill="#241A10"/>` : ""}
  </svg>`;
}

/** The Junior look's teen coach: navy patka, simple face. */
function teen(mood: Mood): string {
  const mouth = mood === "happy" ? `<path d="M26 44q6 6 12 0" stroke="#3A2A1C" stroke-width="2.2" fill="none" stroke-linecap="round"/>`
    : mood === "oops" ? `<circle cx="32" cy="45" r="2.6" fill="#3A2A1C"/>`
    : `<path d="M27 45h10" stroke="#3A2A1C" stroke-width="2.2" stroke-linecap="round"/>`;
  return `<svg viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="32" r="31" fill="#1E2A44"/>
    <path d="M10 64c2-12 10-17 22-17s20 5 22 17z" fill="#E07B1F"/>
    <ellipse cx="32" cy="36" rx="13" ry="14.5" fill="#C98F63"/>
    <path d="M17 31c0-10 7-16 15-16s15 6 15 16c-4-4-9-6-15-6s-11 2-15 6z" fill="#3F5E8C"/>
    <path d="M30 14c1-3 3-3 4 0l1 3h-6z" fill="#3F5E8C"/>
    <circle cx="27" cy="36" r="1.9" fill="#1B1B1B"/><circle cx="37" cy="36" r="1.9" fill="#1B1B1B"/>
    ${mood === "think" ? `<path d="M23 31l7-1M34 30l7 1" stroke="#1B1B1B" stroke-width="1.6"/>` : ""}
    ${mouth}
  </svg>`;
}

/** Flip to true once the new Chidi sheet (no head covering) is sliced into public/art/coach/young-*.webp. */
const CHIDI_ART_READY = false;

export function coachHTML(look: Look, mood: Mood = "neutral"): string {
  if (look === "adult") return "";
  // the supplied Chidi art wears a patka, which #49 rules out: use the in-code bird until new art arrives
  if (look === "young" && !CHIDI_ART_READY) return chidi(mood === "cheer" ? "happy" : mood);
  const who = look === "young" ? "young" : store.get().coach;
  const fallback = look === "young" ? chidi(mood === "cheer" ? "happy" : mood) : teen(mood === "cheer" ? "happy" : mood);
  return `<img src="art/coach/${who}-${mood}.webp" alt="" data-fallback="${encodeURIComponent(fallback)}">`;
}
