"""Generates every logo asset of the fork from fork/packaging/icons/app-logo.svg.

The SVG only uses filled polygon paths (M x,y x y ... Z), so it can be rasterized here with OpenCV
without an SVG engine. Outputs:
  - fork/packaging/icons/256x256.png and icon.ico (installer and executable icon)
  - packages/bruno-electron/src/about/256x256.png (window icon, registered hook H-07)
  - packages/bruno-app/src/components/fork/AppLogo/logo-paths.js (in-app logo, H-06)

Requires: pip install numpy opencv-python pillow
"""
import re
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ICONS = ROOT / "fork/packaging/icons"
SVG = ICONS / "app-logo.svg"
WINDOW_ICON = ROOT / "packages/bruno-electron/src/about/256x256.png"
LOGO_MODULE = ROOT / "packages/bruno-app/src/components/fork/AppLogo/logo-paths.js"
SUPERSAMPLE = 4


def read_svg():
    svg = SVG.read_text(encoding="utf-8")
    view_box = [float(v) for v in re.search(r'viewBox="([^"]+)"', svg).group(1).split()]
    paths = re.findall(r'<path fill="(#[0-9a-fA-F]{6})"[^>]*?d="([^"]*)"', svg)
    return view_box, paths


def rasterize(view_box, paths, size):
    vx, vy, vw, vh = view_box
    scale = size * SUPERSAMPLE / max(vw, vh)
    canvas = np.zeros((size * SUPERSAMPLE, size * SUPERSAMPLE, 4), np.uint8)
    for fill, d in paths:
        polygons = []
        for sub in re.findall(r"M([^Z]+)Z", d):
            points = np.array([float(n) for n in re.split(r"[ ,]+", sub.strip())]).reshape(-1, 2)
            polygons.append(np.round((points - [vx, vy]) * scale).astype(np.int32))
        r, g, b = (int(fill[i:i + 2], 16) for i in (1, 3, 5))
        cv2.fillPoly(canvas, polygons, (b, g, r, 255))
    small = cv2.resize(canvas, (size, size), interpolation=cv2.INTER_AREA)
    return Image.fromarray(cv2.cvtColor(small, cv2.COLOR_BGRA2RGBA))


def write_logo_module(view_box, paths):
    LOGO_MODULE.parent.mkdir(parents=True, exist_ok=True)
    entries = ",\n".join(f"  ['{fill}', '{d}']" for fill, d in paths)
    view_box_text = " ".join(f"{v:g}" for v in view_box)
    LOGO_MODULE.write_text(
        "// Built from fork/packaging/icons/app-logo.svg by fork/packaging/make-icon.py. Do not edit.\n"
        f"export const LOGO_VIEW_BOX = '{view_box_text}';\n\n"
        f"export const LOGO_PATHS = [\n{entries}\n];\n",
        encoding="utf-8",
        newline="\n",
    )


def main():
    view_box, paths = read_svg()
    icon_256 = rasterize(view_box, paths, 256)
    icon_256.save(ICONS / "256x256.png")
    icon_256.save(WINDOW_ICON)
    rasterize(view_box, paths, 512).save(
        ICONS / "icon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    )
    write_logo_module(view_box, paths)


if __name__ == "__main__":
    main()
