// Builds the coach-voice recording script (DECISIONS #80): every line a child hears, with the exact file name
// the app looks for. Runs only with VOICE=1 (npm run voice-script); writes 04_Assets/VOICE-SCRIPT.md and .csv.
import { writeFileSync } from "node:fs";
import { it } from "vitest";
import { LEVELS } from "../src/content/levels";
import { UI } from "../src/i18n";
import { learnId, promptId, UI_LINES, uiId } from "../src/voice";

it.runIf(process.env.VOICE)("voice script", () => {
  const rows: { id: string; where: string; en: string; pa: string }[] = [];
  for (const k of UI_LINES) rows.push({ id: uiId(k), where: "everywhere", en: UI[k].en, pa: UI[k].pa });
  for (const lv of LEVELS) for (const l of lv.lessons) {
    l.learn.forEach((s, i) => {
      rows.push({ id: learnId(l.id, i), where: `${l.id} learn ${i + 1}`, ...s.text });
      // the Young look reads the short version (or a split into one idea per slide): its own clip, "<id>-y" / "<id>-y1".. (2026-10-29)
      if (s.young) rows.push({ id: `${learnId(l.id, i)}-y`, where: `${l.id} learn ${i + 1} (young)`, ...s.young });
      s.youngSplit?.forEach((x, k) => rows.push({ id: `${learnId(l.id, i)}-y${k + 1}`, where: `${l.id} learn ${i + 1} (young, part ${k + 1})`, ...x.text }));
    });
    rows.push({ id: promptId(l.id, "try"), where: `${l.id} try`, ...l.try.prompt });
    if (l.try.young) rows.push({ id: `${promptId(l.id, "try")}-y`, where: `${l.id} try (young)`, ...l.try.young });
    l.practise.forEach((p, i) => {
      rows.push({ id: promptId(l.id, "practise", i), where: `${l.id} practise ${i + 1}`, ...p.prompt });
      if (p.young) rows.push({ id: `${promptId(l.id, "practise", i)}-y`, where: `${l.id} practise ${i + 1} (young)`, ...p.young });
    });
    rows.push({ id: promptId(l.id, "challenge"), where: `${l.id} challenge`, ...l.challenge.prompt });
    if (l.challenge.young) rows.push({ id: `${promptId(l.id, "challenge")}-y`, where: `${l.id} challenge (young)`, ...l.challenge.young });
  }
  const dir = new URL("../../../04_Assets/", import.meta.url);
  const md = [
    "# Coach voice: recording script", "",
    `Generated ${new Date().toISOString().slice(0, 10)} by \`npm run voice-script\` (DECISIONS #80). ${rows.length} lines, each in Punjabi and English.`, "",
    "How to record: one clip per line, read warmly and slowly, like speaking to a 6-year-old. Save each as MP3 (mono, 64 kbps is plenty)",
    "with EXACTLY the file name shown, into `03_App/school/public/audio/pa/` or `public/audio/en/`. A line with no clip is simply silent,",
    "so you can record a level at a time — Level 1 and 2 first. Re-run the script after lessons change: ids follow the lesson, step and number.", "",
    "| File | Where | ਪੰਜਾਬੀ | English |", "|---|---|---|---|",
    ...rows.map(r => `| \`${r.id}.mp3\` | ${r.where} | ${r.pa.replace(/\|/g, "/")} | ${r.en.replace(/\|/g, "/")} |`),
  ].join("\n");
  writeFileSync(new URL("VOICE-SCRIPT.md", dir), md + "\n");
  const csv = ["file,where,pa,en", ...rows.map(r => [r.id + ".mp3", r.where, r.pa, r.en].map(x => `"${x.replace(/"/g, '""')}"`).join(","))].join("\n");
  writeFileSync(new URL("VOICE-SCRIPT.csv", dir), csv + "\n");
  process.stderr.write(`voice script: ${rows.length} lines\n`);
});
