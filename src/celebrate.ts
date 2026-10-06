// Confetti for the big moments (DECISIONS #67): a passed level test, a three-star lesson. Plain DOM + CSS,
// in the palette's own colours; nothing at all when the learner asked for less motion.
const COLOURS = ["#C6A24A", "#F1D489", "#2F6B4F", "#8B1E3F", "#EFE4CF"];

export function confetti(host: HTMLElement, pieces = 46) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const layer = document.createElement("div");
  layer.className = "confetti"; layer.setAttribute("aria-hidden", "true");
  for (let i = 0; i < pieces; i++) {
    const p = document.createElement("i");
    p.style.cssText = `left:${Math.random() * 100}%;background:${COLOURS[i % COLOURS.length]};` +
      `animation-delay:${(Math.random() * .5).toFixed(2)}s;animation-duration:${(1.8 + Math.random() * 1.4).toFixed(2)}s;` +
      `--drift:${Math.round(Math.random() * 120 - 60)}px;--spin:${Math.round(Math.random() * 720 - 360)}deg`;
    layer.appendChild(p);
  }
  host.appendChild(layer);
  setTimeout(() => layer.remove(), 3800);
}
