#!/usr/bin/env python3
"""Erzeugt die App-Icons für den Spotify Moderator (PWA).

Motiv: dunkler Grund, grüner Kreis, dunkles Play-Dreieck — bei 48 px noch lesbar.
Die maskable-Variante hält den Inhalt in der sicheren Zone (Android beschneidet
Icons je nach Launcher unterschiedlich stark).
"""
from PIL import Image, ImageDraw

BG = (18, 18, 18, 255)
GREEN = (29, 185, 84, 255)
DARK = (6, 36, 15, 255)


def icon(size: int, content_ratio: float = 0.68) -> Image.Image:
    # 4x zeichnen und herunterrechnen -> weiche Kanten
    s = size * 4
    img = Image.new("RGBA", (s, s), BG)
    d = ImageDraw.Draw(img)
    r = s * content_ratio / 2
    cx = cy = s / 2
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=GREEN)
    # Play-Dreieck (Höhe ~ 46 % des Kreisdurchmessers)
    h = r * 0.92
    w = h * 0.86
    left = cx - w / 2 + w * 0.12
    d.polygon([(left, cy - h / 2), (left, cy + h / 2), (left + w, cy)], fill=DARK)
    return img.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    icon(192).save("icon-192.png")
    icon(512).save("icon-512.png")
    icon(512, 0.55).save("icon-maskable-512.png")   # sichere Zone
    icon(180).convert("RGB").save("apple-touch-icon.png")
    print("Icons geschrieben: icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png")
