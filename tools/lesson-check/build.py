"""Build the lesson check sheet (DECISIONS #93) from exported levels and the notes for each.
   LEVEL=n OUT=<dir>/level<n>.json npx vitest run test/_review    # once per level, then:
   python3 tools/lesson-check/build.py <dir with levelN.json> <out.html>"""
import json, pathlib, sys
here = pathlib.Path(__file__).parent
src, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
levels = []
for f in sorted(src.glob("level*.json"), key=lambda p: int(p.stem[5:])):
    lv = json.loads(f.read_text())
    notes = here / "notes" / f.name
    lv["notes"] = json.loads(notes.read_text()) if notes.exists() else {}
    levels.append(lv)
data = json.dumps({"levels": levels}, ensure_ascii=False).replace("</", "<\\/")
tpl = (here / "template.html").read_text()
assert tpl.count("/*DATA*/") == 1
out.write_text(tpl.replace("/*DATA*/", data))
print(f"{len(levels)} level(s), {sum(len(l['lessons']) for l in levels)} lessons -> {out}")
