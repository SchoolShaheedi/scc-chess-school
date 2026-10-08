// Level 4 · 600-800 · Tactics I. Ids/titles follow CURRICULUM.md (skewer = ਪਿਛਲਾ ਵਾਰ). ALL TEXT DRAFT (#25, #33).
// Hand-built positions use the tactic goals in src/chess/rules.ts; the guard proves each has a solution.
// Real puzzles are Lichess 500-900 (DECISIONS #53).
import type { Lesson } from "../lesson/types";

const realGames = (en: string, pa: string) => ({ en: `Real games: ${en}`, pa: `ਅਸਲੀ ਖੇਡਾਂ: ${pa}` });

export const LEVEL4: Lesson[] = [
  {
    id: "4.1", level: 4, status: "draft",
    title: { en: "Hanging pieces", pa: "ਬੇ-ਬਚਾਅ ਮੋਹਰੇ" },
    goal: { en: "Take what is free, and never leave your own pieces loose.", pa: "ਜੋ ਮੁਫ਼ਤ ਹੈ ਉਹ ਲਓ, ਅਤੇ ਆਪਣੇ ਮੋਹਰੇ ਕਦੇ ਬੇ-ਬਚਾਅ ਨਾ ਛੱਡੋ।" },
    learn: [
      { text: { en: "A hanging piece is attacked and not defended. It can be taken for free.", pa: "ਬੇ-ਬਚਾਅ ਮੋਹਰੇ 'ਤੇ ਹਮਲਾ ਹੁੰਦਾ ਹੈ ਪਰ ਉਸ ਦੀ ਰਾਖੀ ਨਹੀਂ। ਉਸ ਨੂੰ ਮੁਫ਼ਤ ਮਾਰਿਆ ਜਾ ਸਕਦਾ ਹੈ।" },
        board: { play: true, fen: "4k3/8/8/3n4/8/8/8/3RK3 w - - 0 1", arrows: [["d1", "d5"]], highlights: ["d5"] } },
      { text: { en: "Before every move, ask two questions: can I take something for free? And is any of MY pieces hanging?", pa: "ਹਰ ਚਾਲ ਤੋਂ ਪਹਿਲਾਂ ਦੋ ਸਵਾਲ ਪੁੱਛੋ: ਕੀ ਤੁਸੀਂ ਕੁਝ ਮੁਫ਼ਤ ਮਾਰ ਸਕਦੇ ਹੋ? ਅਤੇ ਕੀ ਤੁਹਾਡਾ ਕੋਈ ਮੋਹਰਾ ਬੇ-ਬਚਾਅ ਹੈ?" },
        board: { fen: "4k3/8/8/1b1n4/2N5/8/8/3RK3 w - - 0 1", arrows: [["d1","d5"],["b5","c4"]], highlights: ["d5","c4"] } },
    ],
    try: { kind: "play", fen: "4k3/8/8/3n4/8/8/8/3RK3 w - - 0 1", goal: "win-free",
      prompt: { en: "Take the free piece.", pa: "ਮੁਫ਼ਤ ਮੋਹਰਾ ਮਾਰੋ।" } },
    practise: [
      { kind: "play", fen: "4k3/2p5/3n4/8/6b1/8/8/3RK1R1 w - - 0 1", goal: "win-free",
        prompt: { en: "Two pieces can be captured. Only one of them is free.", pa: "ਦੋ ਮੋਹਰੇ ਮਾਰੇ ਜਾ ਸਕਦੇ ਹਨ। ਮੁਫ਼ਤ ਸਿਰਫ਼ ਇੱਕ ਹੈ।" },
        hint: { en: "Check what defends each one.", pa: "ਵੇਖੋ ਹਰ ਇੱਕ ਦੀ ਰਾਖੀ ਕੌਣ ਕਰਦਾ ਹੈ।" } },
      { kind: "pack", pack: "hanging-easy", count: 4, prompt: realGames("find the free piece.", "ਮੁਫ਼ਤ ਮੋਹਰਾ ਲੱਭੋ।") },
    ],
    challenge: { kind: "pack", pack: "hanging-easy", count: 4, prompt: realGames("take what is free.", "ਜੋ ਮੁਫ਼ਤ ਹੈ ਉਹ ਲਓ।") },
  },

  {
    id: "4.2", level: 4, status: "draft",
    title: { en: "Double attack", pa: "ਦੋ ਪਾਸੀ ਹਮਲਾ" },
    goal: { en: "Make one move that threatens two things.", pa: "ਇੱਕ ਅਜਿਹੀ ਚਾਲ ਚੱਲੋ ਜੋ ਦੋ ਚੀਜ਼ਾਂ ਨੂੰ ਖ਼ਤਰਾ ਦੇਵੇ।" },
    learn: [
      { text: { en: "A double attack threatens two things with one move. Your opponent can usually save only one of them.", pa: "ਦੋ ਪਾਸੀ ਹਮਲਾ ਇੱਕ ਚਾਲ ਨਾਲ ਦੋ ਚੀਜ਼ਾਂ ਨੂੰ ਖ਼ਤਰਾ ਦਿੰਦਾ ਹੈ। ਵਿਰੋਧੀ ਆਮ ਤੌਰ 'ਤੇ ਸਿਰਫ਼ ਇੱਕ ਨੂੰ ਬਚਾ ਸਕਦਾ ਹੈ।" },
        board: { fen: "4k3/8/8/n2Q3b/8/8/8/4K3 b - - 0 1", arrows: [["d5", "a5"], ["d5", "h5"]] } },
      { text: { en: "The queen is the best double-attacker: she moves in eight directions.", pa: "ਰਾਣੀ ਸਭ ਤੋਂ ਵਧੀਆ ਦੋ ਪਾਸੀ ਹਮਲਾ ਕਰਦੀ ਹੈ: ਉਹ ਅੱਠ ਪਾਸਿਆਂ ਵੱਲ ਚੱਲਦੀ ਹੈ।" },
        board: { pieces: {d4:"wQ"}, arrows: [["d4","d8"],["d4","h8"],["d4","h4"],["d4","g1"],["d4","d1"],["d4","a1"],["d4","a4"],["d4","a7"]] } },
    ],
    try: { kind: "play", fen: "8/8/n7/7K/8/7Q/1k1b4/8 w - - 0 1", goal: "fork",
      prompt: { en: "Attack both black pieces with one queen move, on a square where neither can hit back.", pa: "ਰਾਣੀ ਦੀ ਇੱਕ ਚਾਲ ਨਾਲ ਕਾਲੇ ਦੋਵਾਂ ਮੋਹਰਿਆਂ 'ਤੇ ਹਮਲਾ ਕਰੋ, ਉਸ ਖਾਨੇ ਤੋਂ ਜਿੱਥੇ ਕੋਈ ਵਾਪਸ ਨਾ ਮਾਰ ਸਕੇ।" },
      hint: { en: "Find one square that sees the knight along a diagonal and the bishop straight down.", pa: "ਉਹ ਖਾਨਾ ਲੱਭੋ ਜਿੱਥੋਂ ਘੋੜਾ ਤਿਰਛੀ ਲਕੀਰ 'ਤੇ ਅਤੇ ਊਠ ਸਿੱਧਾ ਹੇਠਾਂ ਦਿਸੇ।" } },
    practise: [
      { kind: "play", fen: "2K5/8/8/4PP2/b7/3n3k/5R2/8 w - - 0 1", goal: "fork",
        prompt: { en: "Now with a rook: check the king and attack the knight at once.", pa: "ਹੁਣ ਹਾਥੀ ਨਾਲ: ਬਾਦਸ਼ਾਹ ਨੂੰ ਸ਼ਹਿ ਦਿਓ ਅਤੇ ਨਾਲ ਹੀ ਘੋੜੇ 'ਤੇ ਹਮਲਾ ਕਰੋ।" } },
      { kind: "pack", pack: "fork-easy", count: 4, prompt: realGames("find the double attack.", "ਦੋ ਪਾਸੀ ਹਮਲਾ ਲੱਭੋ।") },
    ],
    challenge: { kind: "pack", pack: "fork-easy", count: 4, prompt: realGames("one move, two threats.", "ਇੱਕ ਚਾਲ, ਦੋ ਖ਼ਤਰੇ।") },
  },

  {
    id: "4.3", level: 4, status: "draft",
    title: { en: "The knight fork", pa: "ਘੋੜੇ ਦਾ ਦੋਹਰਾ ਵਾਰ" },
    goal: { en: "Use the knight to attack two pieces at once.", pa: "ਘੋੜੇ ਨਾਲ ਇੱਕੋ ਵਾਰ ਦੋ ਮੋਹਰਿਆਂ 'ਤੇ ਹਮਲਾ ਕਰੋ।" },
    learn: [
      { text: { en: "Knights are fork experts. They attack in a ring, and their attack can't be blocked.", pa: "ਘੋੜੇ ਦੋਹਰੇ ਵਾਰ ਦੇ ਮਾਹਿਰ ਹਨ। ਉਹ ਘੇਰੇ ਵਿੱਚ ਹਮਲਾ ਕਰਦੇ ਹਨ, ਅਤੇ ਉਨ੍ਹਾਂ ਦਾ ਹਮਲਾ ਰੋਕਿਆ ਨਹੀਂ ਜਾ ਸਕਦਾ।" },
        board: { pieces: { d4: "wN" }, dots: ["c2", "e2", "b3", "f3", "b5", "f5", "c6", "e6"] } },
      { text: { en: "A fork with check is the strongest: the king must move, and you take the other piece.", pa: "ਸ਼ਹਿ ਵਾਲਾ ਦੋਹਰਾ ਵਾਰ ਸਭ ਤੋਂ ਤਾਕਤਵਰ ਹੈ: ਬਾਦਸ਼ਾਹ ਨੂੰ ਹਟਣਾ ਪੈਂਦਾ ਹੈ, ਅਤੇ ਤੁਸੀਂ ਦੂਜਾ ਮੋਹਰਾ ਮਾਰ ਲੈਂਦੇ ਹੋ।" },
        board: { fen: "r3k3/2N5/8/8/8/8/8/4K3 b - - 0 1", arrows: [["c7", "e8"], ["c7", "a8"]] } },
    ],
    try: { kind: "play", fen: "r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1", goal: "fork",
      prompt: { en: "Find the knight jump that attacks the king and the rook.", pa: "ਘੋੜੇ ਦੀ ਉਹ ਛਾਲ ਲੱਭੋ ਜੋ ਬਾਦਸ਼ਾਹ ਅਤੇ ਹਾਥੀ 'ਤੇ ਹਮਲਾ ਕਰੇ।" } },
    practise: [
      { kind: "play", fen: "3k4/6q1/8/8/3N3R/3K4/8/8 w - - 0 1", goal: "fork",
        prompt: { en: "Fork the king and the queen with your knight.", pa: "ਆਪਣੇ ਘੋੜੇ ਨਾਲ ਬਾਦਸ਼ਾਹ ਅਤੇ ਰਾਣੀ 'ਤੇ ਦੋਹਰਾ ਵਾਰ ਕਰੋ।" } },
      { kind: "pack", pack: "fork-easy", count: 3, prompt: realGames("find the fork.", "ਦੋਹਰਾ ਵਾਰ ਲੱਭੋ।") },
    ],
    challenge: { kind: "pack", pack: "fork-easy", count: 4, prompt: realGames("forks everywhere.", "ਹਰ ਪਾਸੇ ਦੋਹਰੇ ਵਾਰ।") },
  },

  {
    id: "4.4", level: 4, status: "draft",
    title: { en: "Forks by other pieces", pa: "ਹੋਰ ਦੋਹਰੇ ਵਾਰ" },
    goal: { en: "Fork with a pawn, and even with the king.", pa: "ਪਿਆਦੇ ਨਾਲ, ਅਤੇ ਬਾਦਸ਼ਾਹ ਨਾਲ ਵੀ, ਦੋਹਰਾ ਵਾਰ ਕਰੋ।" },
    learn: [
      { text: { en: "Even a pawn can fork: one step forward, and it attacks two pieces diagonally.", pa: "ਪਿਆਦਾ ਵੀ ਦੋਹਰਾ ਵਾਰ ਕਰ ਸਕਦਾ ਹੈ: ਇੱਕ ਕਦਮ ਅੱਗੇ, ਅਤੇ ਉਹ ਦੋ ਮੋਹਰਿਆਂ 'ਤੇ ਤਿਰਛਾ ਹਮਲਾ ਕਰਦਾ ਹੈ।" },
        board: { fen: "4k3/8/8/3n1b2/4P3/3P4/8/4K3 b - - 0 1", arrows: [["e4", "d5"], ["e4", "f5"]] } },
      { text: { en: "A pawn fork is deadly because the pawn is worth so little: whatever you win, you win big.", pa: "ਪਿਆਦੇ ਦਾ ਦੋਹਰਾ ਵਾਰ ਖ਼ਤਰਨਾਕ ਹੈ ਕਿਉਂਕਿ ਪਿਆਦੇ ਦਾ ਮੁੱਲ ਬਹੁਤ ਘੱਟ ਹੈ: ਜੋ ਵੀ ਜਿੱਤੋ, ਵੱਡਾ ਜਿੱਤਦੇ ਹੋ।" },
        board: { fen: "4k3/8/8/2r1n3/3P4/8/8/4K3 b - - 0 1", arrows: [["d4","c5"],["d4","e5"]] } },
      { text: { en: "The king can fork too, when two enemy pieces stand undefended next to it.", pa: "ਬਾਦਸ਼ਾਹ ਵੀ ਦੋਹਰਾ ਵਾਰ ਕਰ ਸਕਦਾ ਹੈ, ਜਦੋਂ ਦੁਸ਼ਮਣ ਦੇ ਦੋ ਬੇ-ਬਚਾਅ ਮੋਹਰੇ ਉਸ ਦੇ ਨਾਲ ਖੜ੍ਹੇ ਹੋਣ।" },
        board: { fen: "7k/8/2r5/3K4/4n3/8/8/8 b - - 0 1", arrows: [["d5","c6"],["d5","e4"]] } },
    ],
    try: { kind: "play", fen: "4k3/8/8/3n1b2/8/3PP3/8/4K3 w - - 0 1", goal: "fork",
      prompt: { en: "Fork the knight and bishop with a pawn. Your other pawn keeps it safe.", pa: "ਪਿਆਦੇ ਨਾਲ ਘੋੜੇ ਅਤੇ ਊਠ 'ਤੇ ਦੋਹਰਾ ਵਾਰ ਕਰੋ। ਤੁਹਾਡਾ ਦੂਜਾ ਪਿਆਦਾ ਉਸ ਦੀ ਰਾਖੀ ਕਰਦਾ ਹੈ।" } },
    practise: [
      { kind: "play", fen: "4k3/8/8/8/8/3r4/5b2/4K3 w - - 0 1", goal: "fork",
        prompt: { en: "You are in check from the bishop. Escape AND fork with your king.", pa: "ਤੁਹਾਨੂੰ ਊਠ ਦੀ ਸ਼ਹਿ ਹੈ। ਬਚੋ ਵੀ, ਅਤੇ ਆਪਣੇ ਬਾਦਸ਼ਾਹ ਨਾਲ ਦੋਹਰਾ ਵਾਰ ਵੀ ਕਰੋ।" } },
      { kind: "pack", pack: "fork-easy", count: 3, prompt: realGames("find the fork.", "ਦੋਹਰਾ ਵਾਰ ਲੱਭੋ।") },
    ],
    challenge: { kind: "pack", pack: "fork-easy", count: 3, prompt: realGames("any piece can fork.", "ਕੋਈ ਵੀ ਮੋਹਰਾ ਦੋਹਰਾ ਵਾਰ ਕਰ ਸਕਦਾ ਹੈ।") },
  },

  {
    id: "4.5", level: 4, status: "draft",
    title: { en: "The pin", pa: "ਬੰਨ੍ਹ" },
    goal: { en: "Pin a piece so it can't move, then attack it again.", pa: "ਮੋਹਰੇ ਨੂੰ ਬੰਨ੍ਹੋ ਤਾਂ ਜੋ ਉਹ ਹਿੱਲ ਨਾ ਸਕੇ, ਫਿਰ ਉਸ 'ਤੇ ਦੁਬਾਰਾ ਹਮਲਾ ਕਰੋ।" },
    learn: [
      { text: { en: "A pin: a piece is stuck. If the king stands behind it, it can't move at all. If a bigger piece stands behind it, it can move, but then that bigger piece is lost.", pa: "ਬੰਨ੍ਹ: ਮੋਹਰਾ ਫਸ ਜਾਂਦਾ ਹੈ। ਜੇ ਉਸ ਦੇ ਪਿੱਛੇ ਬਾਦਸ਼ਾਹ ਹੋਵੇ, ਤਾਂ ਉਹ ਹਿੱਲ ਹੀ ਨਹੀਂ ਸਕਦਾ। ਜੇ ਪਿੱਛੇ ਵੱਡਾ ਮੋਹਰਾ ਹੋਵੇ, ਤਾਂ ਉਹ ਹਿੱਲ ਸਕਦਾ ਹੈ, ਪਰ ਫਿਰ ਉਹ ਵੱਡਾ ਮੋਹਰਾ ਮਾਰਿਆ ਜਾਂਦਾ ਹੈ।" },
        board: { fen: "4k3/8/2n5/1B6/8/8/8/4K3 b - - 0 1", arrows: [["b5", "e8"]], highlights: ["c6"] } },
      { text: { en: "If the king is behind it, the pinned piece may not move at all. That's the strongest pin.", pa: "ਜੇ ਪਿੱਛੇ ਬਾਦਸ਼ਾਹ ਹੋਵੇ, ਤਾਂ ਬੰਨ੍ਹਿਆ ਮੋਹਰਾ ਬਿਲਕੁਲ ਨਹੀਂ ਹਿੱਲ ਸਕਦਾ। ਇਹ ਸਭ ਤੋਂ ਤਕੜਾ ਬੰਨ੍ਹ ਹੈ।" },
        board: { fen: "4k3/3n4/8/1B6/8/8/8/4K3 b - - 0 1", arrows: [["b5","e8"]], crosses: ["b6","b8","c5","e5","f6","f8"] } },
      { text: { en: "Then pile up: attack the pinned piece again. It can't run away.", pa: "ਫਿਰ ਹੋਰ ਦਬਾਓ: ਬੰਨ੍ਹੇ ਮੋਹਰੇ 'ਤੇ ਦੁਬਾਰਾ ਹਮਲਾ ਕਰੋ। ਉਹ ਭੱਜ ਨਹੀਂ ਸਕਦਾ।" },
        board: { fen: "4k3/8/2n5/1B6/3P4/8/8/4K3 w - - 0 1", arrows: [["b5","e8"],["d4","d5"]], highlights: ["c6"] } },
    ],
    try: { kind: "play", fen: "4k3/8/2n5/8/8/8/8/4KB2 w - - 0 1", goal: "pin",
      prompt: { en: "Pin the knight to the black king with your bishop.", pa: "ਆਪਣੇ ਊਠ ਨਾਲ ਘੋੜੇ ਨੂੰ ਕਾਲੇ ਬਾਦਸ਼ਾਹ ਨਾਲ ਬੰਨ੍ਹੋ।" } },
    practise: [
      { kind: "play", fen: "3qk3/8/8/3n4/8/8/8/R3K3 w - - 0 1", goal: "pin",
        prompt: { en: "Pin the knight to the queen with your rook.", pa: "ਆਪਣੇ ਹਾਥੀ ਨਾਲ ਘੋੜੇ ਨੂੰ ਰਾਣੀ ਨਾਲ ਬੰਨ੍ਹੋ।" } },
      { kind: "pack", pack: "pin-easy", count: 4, prompt: realGames("use the pin.", "ਬੰਨ੍ਹ ਵਰਤੋ।") },
    ],
    challenge: { kind: "pack", pack: "pin-easy", count: 4, prompt: realGames("pins win pieces.", "ਬੰਨ੍ਹ ਮੋਹਰੇ ਜਿਤਾਉਂਦੇ ਹਨ।") },
  },

  {
    id: "4.6", level: 4, status: "draft",
    title: { en: "The skewer", pa: "ਪਿਛਲਾ ਵਾਰ" },
    goal: { en: "Attack a big piece and win the one behind it.", pa: "ਵੱਡੇ ਮੋਹਰੇ 'ਤੇ ਹਮਲਾ ਕਰੋ ਅਤੇ ਉਸ ਦੇ ਪਿੱਛੇ ਵਾਲਾ ਜਿੱਤੋ।" },
    learn: [
      { text: { en: "A skewer is a pin turned around: the BIG piece is in front. When it moves out of the way, you take the piece behind.", pa: "ਪਿਛਲਾ ਵਾਰ ਉਲਟਾ ਬੰਨ੍ਹ ਹੈ: ਵੱਡਾ ਮੋਹਰਾ ਅੱਗੇ ਹੁੰਦਾ ਹੈ। ਜਦੋਂ ਉਹ ਰਾਹੋਂ ਹਟਦਾ ਹੈ, ਤੁਸੀਂ ਪਿੱਛੇ ਵਾਲਾ ਮਾਰ ਲੈਂਦੇ ਹੋ।" },
        board: { fen: "8/8/8/1r1k3R/8/8/8/4K3 b - - 0 1", arrows: [["h5", "b5"]], highlights: ["d5"] } },
      { text: { en: "A skewer with check is the strongest: the king must move, and the piece behind falls.", pa: "ਸ਼ਹਿ ਵਾਲਾ ਪਿਛਲਾ ਵਾਰ ਸਭ ਤੋਂ ਤਕੜਾ ਹੈ: ਬਾਦਸ਼ਾਹ ਨੂੰ ਹਟਣਾ ਪੈਂਦਾ ਹੈ, ਅਤੇ ਪਿੱਛੇ ਵਾਲਾ ਮੋਹਰਾ ਡਿੱਗ ਜਾਂਦਾ ਹੈ।" },
        board: { fen: "8/q7/8/8/3k4/8/8/4K1B1 b - - 0 1", arrows: [["g1","a7"]], highlights: ["a7"] } },
    ],
    try: { kind: "play", fen: "8/8/8/1r1k4/8/8/8/4K2R w - - 0 1", goal: "skewer",
      prompt: { en: "Skewer the king and the rook behind it.", pa: "ਬਾਦਸ਼ਾਹ ਅਤੇ ਉਸ ਦੇ ਪਿੱਛੇ ਵਾਲੇ ਹਾਥੀ 'ਤੇ ਪਿਛਲਾ ਵਾਰ ਕਰੋ।" },
      hint: { en: "Check along the row they share.", pa: "ਉਨ੍ਹਾਂ ਦੀ ਸਾਂਝੀ ਕਤਾਰ ਵਿੱਚ ਸ਼ਹਿ ਦਿਓ।" } },
    practise: [
      { kind: "play", fen: "q7/8/8/k1B5/8/2K5/8/5R2 w - - 0 1", goal: "skewer",
        prompt: { en: "Skewer the king and the queen with your rook: the king must move, and the queen behind it falls.", pa: "ਆਪਣੇ ਹਾਥੀ ਨਾਲ ਬਾਦਸ਼ਾਹ ਅਤੇ ਰਾਣੀ 'ਤੇ ਪਿਛਲਾ ਵਾਰ ਕਰੋ: ਬਾਦਸ਼ਾਹ ਨੂੰ ਹਿੱਲਣਾ ਪਵੇਗਾ, ਅਤੇ ਪਿੱਛੇ ਵਾਲੀ ਰਾਣੀ ਮਾਰੀ ਜਾਵੇਗੀ।" } },
      { kind: "pack", pack: "skewer-easy", count: 3, prompt: realGames("find the skewer.", "ਪਿਛਲਾ ਵਾਰ ਲੱਭੋ।") },
    ],
    challenge: { kind: "pack", pack: "skewer-easy", count: 4, prompt: realGames("big piece first, then the one behind.", "ਪਹਿਲਾਂ ਵੱਡਾ ਮੋਹਰਾ, ਫਿਰ ਪਿੱਛੇ ਵਾਲਾ।") },
  },

  {
    id: "4.7", level: 4, status: "draft",
    title: { en: "Discovered attack", pa: "ਲੁਕਵਾਂ ਹਮਲਾ" },
    goal: { en: "Move one piece to uncover an attack by another.", pa: "ਇੱਕ ਮੋਹਰਾ ਹਿਲਾ ਕੇ ਦੂਜੇ ਦਾ ਹਮਲਾ ਖੋਲ੍ਹੋ।" },
    learn: [
      { text: { en: "Move one piece out of the way, and the piece behind it suddenly attacks.", pa: "ਇੱਕ ਮੋਹਰੇ ਨੂੰ ਰਾਹੋਂ ਹਟਾਓ, ਅਤੇ ਉਸ ਦੇ ਪਿੱਛੇ ਵਾਲਾ ਮੋਹਰਾ ਅਚਾਨਕ ਹਮਲਾ ਕਰਦਾ ਹੈ।" },
        board: { fen: "4k3/4q3/8/8/4N3/8/8/4RK2 w - - 0 1", arrows: [["e1", "e7"]], highlights: ["e4"] } },
      { text: { en: "The piece that moves can make its own threat too. Two threats at once!", pa: "ਹਿੱਲਣ ਵਾਲਾ ਮੋਹਰਾ ਆਪ ਵੀ ਖ਼ਤਰਾ ਦੇ ਸਕਦਾ ਹੈ। ਇੱਕੋ ਵਾਰ ਦੋ ਖ਼ਤਰੇ!" },
        board: { fen: "7k/4q1p1/8/4N3/8/8/8/4R1K1 w - - 0 1", arrows: [["e5","g6"],["e1","e7"]] } },
    ],
    try: { kind: "play", fen: "4k3/4q3/8/8/4N3/8/8/4RK2 w - - 0 1", goal: "discover",
      prompt: { en: "Move the knight to uncover the rook's attack on the queen.", pa: "ਘੋੜੇ ਨੂੰ ਹਿਲਾ ਕੇ ਰਾਣੀ 'ਤੇ ਹਾਥੀ ਦਾ ਹਮਲਾ ਖੋਲ੍ਹੋ।" } },
    practise: [
      { kind: "play", fen: "8/7k/8/8/8/3N4/8/1B2K3 w - - 0 1", goal: "discover",
        prompt: { en: "Move the knight and uncover check from the bishop.", pa: "ਘੋੜੇ ਨੂੰ ਹਿਲਾਓ ਅਤੇ ਊਠ ਦੀ ਸ਼ਹਿ ਖੋਲ੍ਹੋ।" } },
      { kind: "pack", pack: "discovered-easy", count: 3, prompt: realGames("uncover the attack.", "ਲੁਕਵਾਂ ਹਮਲਾ ਖੋਲ੍ਹੋ।") },
    ],
    challenge: { kind: "pack", pack: "discovered-easy", count: 4, prompt: realGames("hidden attacks.", "ਲੁਕਵੇਂ ਹਮਲੇ।") },
  },

  {
    id: "4.8", level: 4, status: "draft",
    title: { en: "Double check", pa: "ਦੋਹਰੀ ਸ਼ਹਿ" },
    goal: { en: "Give check with two pieces at once.", pa: "ਦੋ ਮੋਹਰਿਆਂ ਨਾਲ ਇਕੱਠੀ ਸ਼ਹਿ ਦਿਓ।" },
    learn: [
      { text: { en: "If the piece you move gives check, AND it uncovers a check from another piece, that is double check.", pa: "ਜੇ ਹਿੱਲਣ ਵਾਲਾ ਮੋਹਰਾ ਸ਼ਹਿ ਦੇਵੇ, ਅਤੇ ਨਾਲ ਹੀ ਦੂਜੇ ਮੋਹਰੇ ਦੀ ਸ਼ਹਿ ਵੀ ਖੋਲ੍ਹੇ, ਤਾਂ ਇਹ ਦੋਹਰੀ ਸ਼ਹਿ ਹੈ।" },
        board: { fen: "4k3/8/5N2/8/8/8/8/4RK2 b - - 0 1", arrows: [["f6", "e8"], ["e1", "e8"]] } },
      { text: { en: "No block and no capture can stop two checks at once. Only the king can move.", pa: "ਕੋਈ ਰੋਕ ਜਾਂ ਮਾਰ ਇੱਕੋ ਵਾਰ ਦੋ ਸ਼ਹਿਆਂ ਨੂੰ ਨਹੀਂ ਰੋਕ ਸਕਦੀ। ਸਿਰਫ਼ ਬਾਦਸ਼ਾਹ ਹਿੱਲ ਸਕਦਾ ਹੈ।" },
        board: { fen: "4k3/8/5N2/8/8/8/8/4RK2 b - - 0 1", dots: ["d8","f7","f8"], crosses: ["d7","e7"] } },
    ],
    try: { kind: "play", fen: "4k3/8/8/8/4N3/8/8/4RK2 w - - 0 1", goal: "double-check",
      prompt: { en: "Give double check.", pa: "ਦੋਹਰੀ ਸ਼ਹਿ ਦਿਓ।" },
      hint: { en: "The knight must check the king itself, and get off the rook's line.", pa: "ਘੋੜਾ ਆਪ ਬਾਦਸ਼ਾਹ ਨੂੰ ਸ਼ਹਿ ਦੇਵੇ, ਅਤੇ ਹਾਥੀ ਦੀ ਲਕੀਰ ਤੋਂ ਹਟ ਜਾਵੇ।" } },
    practise: [
      { kind: "pack", pack: "doublecheck-easy", count: 3, prompt: realGames("two checks at once.", "ਇੱਕੋ ਵਾਰ ਦੋ ਸ਼ਹਿ।") },
    ],
    challenge: { kind: "pack", pack: "doublecheck-easy", count: 3, prompt: realGames("double check.", "ਦੋਹਰੀ ਸ਼ਹਿ।") },
  },

  {
    id: "4.9", level: 4, status: "draft",
    title: { en: "Removing the defender", pa: "ਰਾਖਾ ਹਟਾਉਣਾ" },
    goal: { en: "Take away a guard, then win what it guarded.", pa: "ਰਾਖੇ ਨੂੰ ਹਟਾਓ, ਫਿਰ ਉਹ ਜਿੱਤੋ ਜਿਸ ਦੀ ਉਹ ਰਾਖੀ ਕਰਦਾ ਸੀ।" },
    learn: [
      { text: { en: "If a piece is defended only once, capture its defender, or chase it away. Then the piece is hanging.", pa: "ਜੇ ਕਿਸੇ ਮੋਹਰੇ ਦੀ ਰਾਖੀ ਸਿਰਫ਼ ਇੱਕੋ ਮੋਹਰਾ ਕਰਦਾ ਹੈ, ਤਾਂ ਉਸ ਰਾਖੇ ਨੂੰ ਮਾਰੋ ਜਾਂ ਭਜਾਓ। ਫਿਰ ਉਹ ਮੋਹਰਾ ਬੇ-ਬਚਾਅ ਹੈ।" },
        board: { fen: "6k1/8/4b3/3n4/8/7B/8/3RK3 w - - 0 1", arrows: [["h3", "e6"], ["e6", "d5"], ["d1", "d5"]] } },
      { text: { en: "Ask: what is this piece's job? Take the guard away, and the job is left undone.", pa: "ਪੁੱਛੋ: ਇਸ ਮੋਹਰੇ ਦਾ ਕੰਮ ਕੀ ਹੈ? ਰਾਖਾ ਹਟਾ ਦਿਓ, ਅਤੇ ਕੰਮ ਅਧੂਰਾ ਰਹਿ ਜਾਂਦਾ ਹੈ।" },
        board: { fen: "6k1/8/4b3/3n4/8/7B/8/3RK3 w - - 0 1", arrows: [["e6","d5"]], highlights: ["e6"] } },
    ],
    try: { kind: "pack", pack: "defender-easy", count: 1, prompt: { en: "Remove the defender, then win the piece.", pa: "ਰਾਖਾ ਹਟਾਓ, ਫਿਰ ਮੋਹਰਾ ਜਿੱਤੋ।" } },
    practise: [
      { kind: "pack", pack: "defender-easy", count: 4, prompt: realGames("remove the defender.", "ਰਾਖਾ ਹਟਾਓ।") },
    ],
    challenge: { kind: "pack", pack: "defender-easy", count: 4, prompt: realGames("no guard, no piece.", "ਰਾਖਾ ਨਹੀਂ, ਮੋਹਰਾ ਨਹੀਂ।") },
  },

  {
    id: "4.10", level: 4, status: "draft",
    title: { en: "Trapped pieces", pa: "ਫਸਿਆ ਮੋਹਰਾ" },
    goal: { en: "Win a piece that has no safe squares.", pa: "ਉਹ ਮੋਹਰਾ ਜਿੱਤੋ ਜਿਸ ਕੋਲ ਕੋਈ ਸੁਰੱਖਿਅਤ ਖਾਨਾ ਨਹੀਂ।" },
    learn: [
      { text: { en: "A piece with no safe squares is trapped. Attack it, and it is lost.", pa: "ਜਿਸ ਮੋਹਰੇ ਕੋਲ ਕੋਈ ਸੁਰੱਖਿਅਤ ਖਾਨਾ ਨਹੀਂ, ਉਹ ਫਸਿਆ ਹੋਇਆ ਹੈ। ਉਸ 'ਤੇ ਹਮਲਾ ਕਰੋ, ਅਤੇ ਉਹ ਗਿਆ।" },
        board: { fen: "4k3/8/8/8/8/8/7P/5K1n w - - 0 1", highlights: ["h1"], crosses: ["f2", "g3"] } },
      { text: { en: "Knights and bishops on the edge get trapped easily. Keep yours near the middle.", pa: "ਕੰਢੇ ਵਾਲੇ ਘੋੜੇ ਅਤੇ ਊਠ ਸੌਖਿਆਂ ਫਸ ਜਾਂਦੇ ਹਨ। ਆਪਣਿਆਂ ਨੂੰ ਵਿਚਕਾਰ ਦੇ ਨੇੜੇ ਰੱਖੋ।" },
        board: { pieces: {h1:"wN",d4:"wN"}, dots: ["f2","g3","b3","b5","c2","c6","e2","e6","f3","f5"] } },
    ],
    try: { kind: "pack", pack: "trapped-easy", count: 1, prompt: { en: "A piece is trapped. Win it.", pa: "ਇੱਕ ਮੋਹਰਾ ਫਸਿਆ ਹੈ। ਉਸ ਨੂੰ ਜਿੱਤੋ।" } },
    practise: [
      { kind: "pack", pack: "trapped-easy", count: 4, prompt: realGames("trap and win.", "ਫਸਾਓ ਅਤੇ ਜਿੱਤੋ।") },
    ],
    challenge: { kind: "pack", pack: "trapped-easy", count: 4, prompt: realGames("nowhere to run.", "ਭੱਜਣ ਦੀ ਕੋਈ ਥਾਂ ਨਹੀਂ।") },
  },

  // 4.11 (full check 2026-10-05): the "exchange" skill, counting attackers against defenders before a capture
  {
    id: "4.11", level: 4, status: "draft",
    title: { en: "Count before you capture", pa: "ਮਾਰਨ ਤੋਂ ਪਹਿਲਾਂ ਗਿਣੋ" },
    goal: { en: "Know when a capture wins, trades or loses, by counting.", pa: "ਗਿਣ ਕੇ ਜਾਣੋ ਕਿ ਮਾਰਨਾ ਕਦੋਂ ਜਿਤਾਉਂਦਾ, ਬਰਾਬਰ ਕਰਦਾ ਜਾਂ ਹਰਾਉਂਦਾ ਹੈ।" },
    learn: [
      { text: { en: "Before you capture, count: how many of your pieces attack the square, and how many of theirs defend it?", pa: "ਮਾਰਨ ਤੋਂ ਪਹਿਲਾਂ ਗਿਣੋ: ਤੁਹਾਡੇ ਕਿੰਨੇ ਮੋਹਰੇ ਖਾਨੇ 'ਤੇ ਹਮਲਾ ਕਰਦੇ ਹਨ, ਅਤੇ ਉਨ੍ਹਾਂ ਦੇ ਕਿੰਨੇ ਰਾਖੀ ਕਰਦੇ ਹਨ?" },
        board: { pieces: { e4: "wP", c3: "wN", d5: "bP", f6: "bN" }, arrows: [["e4", "d5"], ["c3", "d5"], ["f6", "d5"]] } },
      { text: { en: "More attackers than defenders: you win it. The same number: usually just a trade. Fewer: leave it alone.", pa: "ਰਾਖਿਆਂ ਨਾਲੋਂ ਵੱਧ ਹਮਲਾਵਰ: ਤੁਸੀਂ ਜਿੱਤਦੇ ਹੋ। ਬਰਾਬਰ: ਅਕਸਰ ਸਿਰਫ਼ ਵਟਾਂਦਰਾ। ਘੱਟ: ਰਹਿਣ ਦਿਓ।" },
        board: { pieces: {e4:"wP",c3:"wN",b3:"wB",d5:"bP",f6:"bN"}, arrows: [["e4","d5"],["c3","d5"],["b3","d5"],["f6","d5"]] } },
      { text: { en: "Capture with your cheapest piece first, so you never give a big piece for a small one.", pa: "ਪਹਿਲਾਂ ਆਪਣੇ ਸਭ ਤੋਂ ਸਸਤੇ ਮੋਹਰੇ ਨਾਲ ਮਾਰੋ, ਤਾਂ ਜੋ ਛੋਟੇ ਲਈ ਵੱਡਾ ਮੋਹਰਾ ਕਦੇ ਨਾ ਦੇਣਾ ਪਵੇ।" },
        board: { pieces: {e4:"wP",d1:"wQ",d5:"bN",c6:"bP"}, arrows: [["e4","d5"],["c6","d5"]], highlights: ["e4"] } },
    ],
    try: { kind: "choose", board: { pieces: { e4: "wP", c3: "wN", d5: "bP", f6: "bN" } },
      prompt: { en: "Two white attackers, one black defender. Can White win the d5 pawn?", pa: "ਦੋ ਚਿੱਟੇ ਹਮਲਾਵਰ, ਇੱਕ ਕਾਲਾ ਰਾਖਾ। ਕੀ ਚਿੱਟਾ d5 ਵਾਲਾ ਪਿਆਦਾ ਜਿੱਤ ਸਕਦਾ ਹੈ?" },
      options: [
        { text: { en: "Yes: exd5 Nxd5 Nxd5", pa: "ਹਾਂ: exd5 Nxd5 Nxd5" }, correct: true, why: { en: "Right: after the trades White is a pawn and a knight up for a pawn.", pa: "ਠੀਕ: ਵਟਾਂਦਰਿਆਂ ਤੋਂ ਬਾਅਦ ਚਿੱਟਾ ਇੱਕ ਪਿਆਦੇ ਬਦਲੇ ਪਿਆਦਾ ਅਤੇ ਘੋੜਾ ਅੱਗੇ ਹੈ।" } },
        { text: { en: "No", pa: "ਨਹੀਂ" }, why: { en: "Count again: two attackers beat one defender.", pa: "ਫਿਰ ਗਿਣੋ: ਦੋ ਹਮਲਾਵਰ ਇੱਕ ਰਾਖੇ ਤੋਂ ਵੱਧ ਹਨ।" } },
      ] },
    practise: [
      { kind: "choose", board: { pieces: { c3: "wN", d5: "bP", e6: "bP" } },
        prompt: { en: "Should White play Nxd5?", pa: "ਕੀ ਚਿੱਟੇ ਨੂੰ Nxd5 ਖੇਡਣਾ ਚਾਹੀਦਾ ਹੈ?" },
        options: [
          { text: { en: "No", pa: "ਨਹੀਂ" }, correct: true, why: { en: "Right: exd5 takes the knight. A knight for a pawn is a bad trade.", pa: "ਠੀਕ: exd5 ਘੋੜੇ ਨੂੰ ਮਾਰ ਦਿੰਦਾ ਹੈ। ਪਿਆਦੇ ਬਦਲੇ ਘੋੜਾ ਮਾੜਾ ਵਟਾਂਦਰਾ ਹੈ।" } },
          { text: { en: "Yes, it wins a pawn", pa: "ਹਾਂ, ਇੱਕ ਪਿਆਦਾ ਜਿੱਤਦਾ ਹੈ" }, why: { en: "The e6 pawn defends d5: one attacker, one defender, and you lose the bigger piece.", pa: "e6 ਵਾਲਾ ਪਿਆਦਾ d5 ਦੀ ਰਾਖੀ ਕਰਦਾ ਹੈ: ਇੱਕ ਹਮਲਾਵਰ, ਇੱਕ ਰਾਖਾ, ਅਤੇ ਵੱਡਾ ਮੋਹਰਾ ਤੁਹਾਡਾ ਜਾਂਦਾ ਹੈ।" } },
        ] },
      { kind: "choose", board: { pieces: { b3: "wB", c3: "wN", d5: "bP", f6: "bN", e6: "bP", c6: "bP" } },
        prompt: { en: "Two attackers on d5 against three defenders. Capture?", pa: "d5 'ਤੇ ਦੋ ਹਮਲਾਵਰ, ਤਿੰਨ ਰਾਖਿਆਂ ਵਿਰੁੱਧ। ਮਾਰੋ?" },
        options: [
          { text: { en: "No: fewer attackers than defenders", pa: "ਨਹੀਂ: ਰਾਖਿਆਂ ਨਾਲੋਂ ਘੱਟ ਹਮਲਾਵਰ" }, correct: true, why: { en: "Right: each capture is answered, and White runs out of attackers first.", pa: "ਠੀਕ: ਹਰ ਮਾਰ ਦਾ ਜਵਾਬ ਮਿਲਦਾ ਹੈ, ਅਤੇ ਚਿੱਟੇ ਦੇ ਹਮਲਾਵਰ ਪਹਿਲਾਂ ਮੁੱਕ ਜਾਂਦੇ ਹਨ।" } },
          { text: { en: "Yes", pa: "ਹਾਂ" }, why: { en: "Count: bishop and knight attack; two pawns and a knight defend.", pa: "ਗਿਣੋ: ਊਠ ਅਤੇ ਘੋੜਾ ਹਮਲਾ ਕਰਦੇ ਹਨ; ਦੋ ਪਿਆਦੇ ਅਤੇ ਇੱਕ ਘੋੜਾ ਰਾਖੀ ਕਰਦੇ ਹਨ।" } },
        ] },
    ],
    challenge: { kind: "pack", pack: "hanging-easy", count: 4, prompt: realGames("count, then take only what is really free.", "ਗਿਣੋ, ਫਿਰ ਸਿਰਫ਼ ਉਹੀ ਲਓ ਜੋ ਸੱਚਮੁੱਚ ਮੁਫ਼ਤ ਹੈ।") },
  },
];
