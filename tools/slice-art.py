"""Cuts the user's art sheets (3_Sikh_Chess_Championship/04_Assets/sheets/) into the single images the app uses.

    python3 tools/slice-art.py

Each sheet is split on its transparent gaps: first into rows, then each row into cells. Pieces in one
set share ONE scale and ONE baseline, so a king is always taller than a pawn and every piece stands on
the same line. Output is WebP (small, transparent) under public/art/. Re-run whenever a sheet changes.
"""
from pathlib import Path
import numpy as np
from PIL import Image

SRC = Path(__file__).resolve().parents[3] / "04_Assets" / "sheets"
OUT = Path(__file__).resolve().parents[1] / "public" / "art"
ORDER = ["K", "Q", "R", "B", "N", "P"]


def bands(occupied, expected, min_gap=4, weight=None):
    """Runs of True in a 1-D occupancy array, merged across tiny gaps, trimmed to the `expected` biggest."""
    runs, start, gap = [], None, 0
    for i, v in enumerate(occupied):
        if v:
            if start is None: start = i
            gap = 0
        elif start is not None:
            gap += 1
            if gap > min_gap:
                runs.append([start, i - gap + 1]); start, gap = None, 0
    if start is not None: runs.append([start, len(occupied)])
    while len(runs) > expected:  # merge the pair with the smallest gap between them
        k = min(range(len(runs) - 1), key=lambda j: runs[j + 1][0] - runs[j][1])
        runs[k:k + 2] = [[runs[k][0], runs[k + 1][1]]]
    while weight is not None and len(runs) < expected:
        # two pieces touch (a tusk, a plume): split the widest group at its thinnest column
        k = max(range(len(runs)), key=lambda j: runs[j][1] - runs[j][0])
        r0, r1 = runs[k]; lo, hi = r0 + (r1 - r0) // 5, r1 - (r1 - r0) // 5
        cut = lo + int(np.argmin(weight[lo:hi]))
        runs[k:k + 1] = [[r0, cut], [cut, r1]]
    if len(runs) != expected:
        raise SystemExit(f"expected {expected} bands, found {len(runs)}")
    return runs


def cells(path, rows, cols):
    im = Image.open(path).convert("RGBA")
    alpha = np.array(im)[:, :, 3]
    a = alpha > 24                      # what to keep when cropping
    solid = alpha > 160                 # what decides the gaps: faint shadows must not bridge two rows
    out = []
    for r0, r1 in bands(solid.sum(axis=1) > 2, rows, min_gap=3):
        row = solid[r0:r1]
        for c0, c1 in bands(row.sum(axis=0) > 1, cols, min_gap=3, weight=row.sum(axis=0)):
            sub = a[r0:r1, c0:c1]
            ys, xs = np.where(sub)
            box = (c0 + xs.min(), r0 + ys.min(), c0 + xs.max() + 1, r0 + ys.max() + 1)
            out.append(im.crop(box))
    return out


def save(img, path, size, scale=None, bottom=True):
    """Place `img` on a square transparent canvas, scaled (fixed scale if given), bottom- or centre-aligned."""
    s = scale or min(size * 0.94 / img.width, size * 0.94 / img.height)
    w, h = max(1, round(img.width * s)), max(1, round(img.height * s))
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    x = (size - w) // 2
    y = size - h - round(size * 0.02) if bottom else (size - h) // 2
    canvas.paste(img.resize((w, h), Image.LANCZOS), (x, y))
    path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(path, "WEBP", quality=88, method=6)


def base_centre(img):
    """x of the middle of the piece's base (its bottom solid rows): the eye centres a chess piece on
    its base, so a knight's head or an elephant's trunk must not pull it off-centre."""
    a = np.array(img)[:, :, 3] > 160
    ys, xs = np.where(a)
    foot = xs[ys >= ys.max() - max(3, img.height // 20)]
    return (foot.min() + foot.max() + 1) / 2


BASELINE = 0.92   # where a piece's base would stand if all shared one line (8% above the edge)


def place_piece(img, path, size, scale):
    """DECISIONS #46, "optical centre": across the square, the piece is centred on its BASE;
    up and down, it sits halfway between standing on the shared baseline and being centred on
    its own, so tall and short pieces both look in the middle while bases stay nearly level.
    A lopsided piece that would spill over the edge is shrunk just enough to fit."""
    bc = base_centre(img)
    s = scale
    for _ in range(20):
        w, h = round(img.width * s), round(img.height * s)
        x = round(size / 2 - bc * s)
        if x >= 0 and x + w <= size: break
        s *= 0.97
    on_line = size * BASELINE - h
    centred = (size - h) / 2
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(img.resize((w, h), Image.LANCZOS), (x, round((on_line + centred) / 2)))
    path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(path, "WEBP", quality=88, method=6)


def pieces(sheet, set_id, size=256):
    cs = cells(SRC / sheet, 2, 6)
    # the tallest piece (the king) fills 84% of the square, as in Lichess/chess.com piece sets
    scale = min(min(size * 0.84 / c.height for c in cs), min(size * 0.96 / c.width for c in cs))
    for i, c in enumerate(cs):
        color = "w" if i < 6 else "b"
        place_piece(c, OUT / "pieces" / set_id / f"{color}{ORDER[i % 6]}.webp", size, scale)
    print(f"pieces {set_id}: 12")


def strip_slivers(img):
    """Remove small pieces that touch the left or right edge of a cut: the tip of a NEIGHBOUR's wing caught in
    the crop when two poses nearly touch (Koel's sheet, 2026-10-15). The figure and its own sparkles stay."""
    from scipy import ndimage
    arr = np.array(img); a = arr[:, :, 3] > 24
    lab, n = ndimage.label(a)
    if n < 2: return img
    sizes = ndimage.sum(a, lab, range(1, n + 1)); big = sizes.max()
    for k in range(1, n + 1):
        ys, xs = np.where(lab == k)
        if sizes[k - 1] < 0.15 * big and (xs.min() == 0 or xs.max() == a.shape[1] - 1):
            arr[lab == k, 3] = 0
    out = Image.fromarray(arr)
    return out.crop(out.getbbox())


def single(name, path, size):
    """A whole picture (an action pose), trimmed to its content and fitted into a square, centred."""
    im = Image.open(SRC / name).convert("RGBA")
    save(im.crop(im.getbbox()), path, size, bottom=False)


def sheet(name, rows, cols, names, folder, size, bottom=False):
    cs = cells(SRC / name, rows, cols)
    for c, n in zip(cs, names):
        save(strip_slivers(c), OUT / folder / f"{n}.webp", size, bottom=bottom)
    print(f"{folder}: {len(cs)} from {name}")


# DECISIONS #96: the bots are cartoon animals now. The app's ids stay the OLD names (saved wins depend on them), so
# each id is filled from its new animal's sheet. The old people sheets are in sheets/_Archive/2026-10-15/.
BOT_SHEETS = {
    "nanhi-chidi": "bot-titli.png", "kesri": "bot-chakor.png", "ghorsavaar": "bot-cheeta.png",
    "teer": "bot-baaz-hawk.png", "sher": "bot-bhaalu.png", "baaz": "bot-sher-lion.png",
}
# the 2026-10-15 v2 piece sheets replace A, B and C (the old sheets are in sheets/_Archive/2026-10-15/)
PIECE_SHEETS = {"A": "pieces-A-sheet-v2.png", "B": "pieces-B-sheet-v2.png", "B2": "chess.png", "C": "pieces-C-sheet-v2.png"}

if __name__ == "__main__":
    import sys
    parts = set(sys.argv[1:]) or {"pieces", "coach", "bots", "heroes", "badges", "icons"}   # e.g. `slice-art.py bots pieces`
    if "pieces" in parts:
        for set_id, name in PIECE_SHEETS.items(): pieces(name, set_id)
    moods = ["neutral", "happy", "think", "oops", "cheer"]
    if "coach" in parts:
        # DECISIONS #96: the coaches are birds now. The file names keep the old keys the app stores:
        # young = Ghuggi the dove, singh = Hans the swan, kaur = Koel the cuckoo
        sheet("coach-ghuggi-sheet.png", 1, 5, [f"young-{m}" for m in moods], "coach", 320, bottom=True)
        sheet("coach-hans-sheet.png", 1, 5, [f"singh-{m}" for m in moods], "coach", 320, bottom=True)
        sheet("coach-koel-sheet.png", 1, 5, [f"kaur-{m}" for m in moods], "coach", 320, bottom=True)
    if "bots" in parts:
        for bot, name in BOT_SHEETS.items():
            sheet(name, 1, 3, [f"{bot}-neutral", f"{bot}-win", f"{bot}-lose"], "bots", 256)
    if "heroes" in parts:
        # DECISIONS #109: the ten virtue heroes (comic style, the user's pick) and the six animal bots' hero versions
        for h in ["himmat", "seva", "ekta", "dhyaan", "sabar", "utsaah", "imaan", "siaanap", "hausla", "nimrata"]:
            sheet(f"heroes/hero-{h}-portrait.png", 1, 3, [f"{h}-neutral", f"{h}-win", f"{h}-lose"], "heroes", 256)
            single(f"heroes/hero-{h}-action.png", OUT / "heroes" / f"{h}-action.webp", 560)
        for animal, bot in [("titli", "nanhi-chidi"), ("chakor", "kesri"), ("cheeta", "ghorsavaar"), ("baaz", "teer"), ("bhaalu", "sher"), ("sher", "baaz")]:
            sheet(f"heroes/herobot-{animal}-sheet.png", 1, 3, [f"{bot}-neutral", f"{bot}-win", f"{bot}-lose"], "herobots", 256)
            single(f"heroes/herobot-{animal}-action.png", OUT / "herobots" / f"{bot}-action.webp", 560)
    if "badges" not in parts and "icons" not in parts: raise SystemExit(0)
    # 2026-10-15: phulkari borders (the old sheet had maple leaves); the two king badges had a cross on top,
    # painted out and given a plain round top, as on the king pieces (DECISIONS #107)
    sheet("badges-sheet-v2.png", 2, 5, [f"level-{n}" for n in range(1, 11)], "badges", 192)
    Image.open(SRC / "app-icon.png").convert("RGB").resize((512, 512), Image.LANCZOS).save(OUT / "app-icon-512.png")
    Image.open(SRC / "app-icon.png").convert("RGB").resize((192, 192), Image.LANCZOS).save(OUT / "app-icon-192.png")
    Image.open(SRC / "tex-phulkari.png").convert("RGB").save(OUT / "tex-phulkari.webp", "WEBP", quality=80)
    print("icons + texture done")
