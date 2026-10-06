"""Cuts the user's art sheets (3_Sikh_Chess_Championship/images/) into the single images the app uses.

    python3 tools/slice-art.py

Each sheet is split on its transparent gaps: first into rows, then each row into cells. Pieces in one
set share ONE scale and ONE baseline, so a king is always taller than a pawn and every piece stands on
the same line. Output is WebP (small, transparent) under public/art/. Re-run whenever a sheet changes.
"""
from pathlib import Path
import numpy as np
from PIL import Image

SRC = Path(__file__).resolve().parents[3] / "images"
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


def sheet(name, rows, cols, names, folder, size, bottom=False):
    cs = cells(SRC / name, rows, cols)
    for c, n in zip(cs, names):
        save(c, OUT / folder / f"{n}.webp", size, bottom=bottom)
    print(f"{folder}: {len(cs)} from {name}")


if __name__ == "__main__":
    pieces("pieces-A-sheet.png", "A")
    pieces("pieces-B-sheet.png", "B")
    pieces("chess.png", "B2")
    pieces("pieces-C-sheet.png", "C")
    moods = ["neutral", "happy", "think", "oops", "cheer"]
    sheet("coach-young-sheet.png", 1, 5, [f"young-{m}" for m in moods], "coach", 320, bottom=True)
    sheet("coach-junior-sheet.png", 2, 5, [f"singh-{m}" for m in moods] + [f"kaur-{m}" for m in moods], "coach", 320, bottom=True)
    for bot in ["nanhi-chidi", "teer", "kesri", "ghorsavaar", "sher", "baaz"]:
        sheet(f"bot-{bot}.png", 1, 3, [f"{bot}-neutral", f"{bot}-win", f"{bot}-lose"], "bots", 256)
    sheet("badges-sheet.png", 2, 5, [f"level-{n}" for n in range(1, 11)], "badges", 192)
    Image.open(SRC / "app-icon.png").convert("RGB").resize((512, 512), Image.LANCZOS).save(OUT / "app-icon-512.png")
    Image.open(SRC / "app-icon.png").convert("RGB").resize((192, 192), Image.LANCZOS).save(OUT / "app-icon-192.png")
    Image.open(SRC / "tex-phulkari.png").convert("RGB").save(OUT / "tex-phulkari.webp", "WEBP", quality=80)
    print("icons + texture done")
