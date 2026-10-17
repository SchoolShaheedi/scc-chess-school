// Real icons in place of emoji (DECISIONS #67): Lucide (ISC licence), imported one by one so only these ship.
import {
  ArrowLeft, ArrowRight, BookOpen, Check, ChevronLeft, ChevronRight, CircleCheck, CircleX, Crown, Flame, GraduationCap, House,
  Languages, Lightbulb, Lock, LogIn, Mail, Medal, Music, Play, Puzzle, RotateCcw, Search, Settings, ShieldCheck, Star, Swords,
  Target, Timer, Trophy, UserRound, Vibrate, Volume2, WifiOff, X, Zap, Cat, Dog, Rabbit, Bird, Fish, Turtle, Squirrel, Snail,
  Plus, Trash2, Users, Grid3x3, SunMoon, ChartColumn, Ellipsis, Share2, Heart, Flag, Sun, Moon, type IconNode,
} from "lucide";

const ICONS = {
  arrowLeft: ArrowLeft, arrowRight: ArrowRight, book: BookOpen, check: Check, chevronLeft: ChevronLeft, ok: CircleCheck, no: CircleX,
  sun: SunMoon, crown: Crown, flame: Flame, hint: Lightbulb, lock: Lock, play: Play, again: RotateCcw, settings: Settings, star: Star,
  target: Target, timer: Timer, trophy: Trophy, sound: Volume2, close: X, xp: Zap,
  chevronRight: ChevronRight, grad: GraduationCap, home: House, languages: Languages, login: LogIn, mail: Mail, medal: Medal,
  music: Music, puzzle: Puzzle, search: Search, shield: ShieldCheck, swords: Swords, user: UserRound, vibrate: Vibrate, offline: WifiOff,
  cat: Cat, dog: Dog, rabbit: Rabbit, bird: Bird, fish: Fish, turtle: Turtle, squirrel: Squirrel, snail: Snail, plus: Plus, trash: Trash2, users: Users, grid: Grid3x3, chart: ChartColumn, dots: Ellipsis, share: Share2, heart: Heart, flag: Flag, light: Sun, dark: Moon,
} satisfies Record<string, IconNode>;
export type IconName = keyof typeof ICONS;

const attrs = (a: Record<string, string | number>) => Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(" ");
type El = [string, Record<string, string | number>, El[]?];
const node = ([tag, a, kids]: El): string => `<${tag} ${attrs(a)}>${(kids ?? []).map(node).join("")}</${tag}>`;

/** An inline SVG icon. Decorative (aria-hidden): the button or text beside it carries the label. */
export function icon(name: IconName, cls = ""): string {
  const [, a, kids] = ICONS[name] as unknown as El;
  return `<svg ${attrs({ ...a, width: "1em", height: "1em" })} class="ic ${cls}" aria-hidden="true">${(kids ?? []).map(node).join("")}</svg>`;
}
