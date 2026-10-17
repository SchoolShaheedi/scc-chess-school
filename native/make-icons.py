#!/usr/bin/env python3
"""Launcher icons, the adaptive-icon foreground and the splash screens for the Android app (DECISIONS #121), from the
app's own icon (04_Assets/sheets/app-icon.png: the knight in its phulkari border). Run after `npx cap add android`:
    python3 make-icons.py
"""
import glob, os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
R = os.path.join(HERE, 'android/app/src/main/res/')
master = Image.open(os.path.join(HERE, '../../../04_Assets/sheets/app-icon.png')).convert('RGBA')
# the master is a rounded square on white: cut 7% off each side so no white corner is left, then let Android round it
w = master.width; cut = round(w * 0.07)
square = master.crop((cut, cut, w - cut, w - cut))
NAVY = '#061C3D'       # the icon's own ground, for the adaptive background
D = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}

def rounded(img, px, radius):
    im = img.resize((px, px), Image.LANCZOS)
    mask = Image.new('L', (px, px), 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, px - 1, px - 1), radius, fill=255)
    out = Image.new('RGBA', (px, px), (0, 0, 0, 0)); out.paste(im, (0, 0), mask); return out

def circle(img, px):
    im = img.resize((px, px), Image.LANCZOS)
    mask = Image.new('L', (px, px), 0); ImageDraw.Draw(mask).ellipse((0, 0, px - 1, px - 1), fill=255)
    out = Image.new('RGBA', (px, px), (0, 0, 0, 0)); out.paste(im, (0, 0), mask); return out

for k, s in D.items():
    px = round(48 * s)
    rounded(square, px, round(px * 0.18)).save(R + f'mipmap-{k}/ic_launcher.png')
    circle(square, px).save(R + f'mipmap-{k}/ic_launcher_round.png')
    # adaptive foreground: the whole 108dp canvas; Android's mask shows the middle, which holds the knight
    square.resize((round(108 * s),) * 2, Image.LANCZOS).save(R + f'mipmap-{k}/ic_launcher_foreground.png')

with open(R + 'values/ic_launcher_background.xml', 'w') as f:
    f.write(f'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">{NAVY}</color>\n</resources>\n')

# splash screens: the games' black (#141414) with the icon in the middle
for path in glob.glob(R + 'drawable*/splash.png'):
    sw, sh = Image.open(path).size
    bg = Image.new('RGBA', (sw, sh), (0x14, 0x14, 0x14, 255))
    d = round(min(sw, sh) * 0.32)
    bg.alpha_composite(rounded(square, d, round(d * 0.18)), ((sw - d) // 2, (sh - d) // 2))
    bg.convert('RGB').save(path)
print('icons and splash screens written')
