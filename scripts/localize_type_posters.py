#!/usr/bin/env python3
"""Reuse original SBTI posters and rebuild the text area in Thai."""

from __future__ import annotations

import re
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path("/Users/hac/AI-Studio/kwai-test")
INDEX_FILE = ROOT / "index-thai.html"
SOURCE_DIR = Path("/tmp/sbti-origin/image")
OUTPUT_DIR = ROOT / "images" / "types"

HEADER_TEXT = "บุคลิกของมึงคือ:"
HEADER_COLOR = (110, 110, 110)
NAME_COLOR = (74, 89, 76)
CODE_COLOR = (79, 175, 73)
BG_COLOR = (252, 252, 250)

FONT_REGULAR = "/System/Library/Fonts/Supplemental/Thonburi.ttc"
FONT_BOLD = "/System/Library/Fonts/Supplemental/Arial Unicode.ttf"

SOURCE_OVERRIDES = {
    "ATM-er": "ATM-er.png",
    "DIO-s": "/Users/hac/AI-Studio/kwai-test/scripts/generated/doges_regen.png",
    "JOKE-R": "JOKE-R.jpg",
    "CHIL": "OJBK.png",
    "FUCK": "/Users/hac/AI-Studio/kwai-test/scripts/generated/fuck_regen_v3.png",
    "LING": "MALO.png",
    "HIA!": "/Users/hac/AI-Studio/kwai-test/scripts/generated/hia_regen_v2.png",
    "KWAI!": "IMSB.png",
    "NOK": "IMFW.png",
    "555+": "HHHH.png",
}

EXTRA_TOP_TRIM = {
    "CHIL": 0.12,
    "LING": 0.10,
    "NOK": 0.12,
    "555+": 0.10,
}

ERASE_TOP_BAND = {
}

MANUAL_CROP_BOXES = {
    "ATM-er": (0.18, 0.44, 0.82, 0.98),
    "BOSS": (0.18, 0.44, 0.82, 0.98),
    "CTRL": (0.18, 0.44, 0.82, 0.98),
    "DRUNK": (0.18, 0.42, 0.85, 0.98),
    "GOGO": (0.22, 0.44, 0.80, 0.98),
    "LOVE-R": (0.18, 0.44, 0.82, 0.98),
    "MONK": (0.18, 0.44, 0.82, 0.98),
    "MUM": (0.18, 0.44, 0.82, 0.98),
    "OH-NO": (0.18, 0.46, 0.82, 0.98),
    "POOR": (0.18, 0.42, 0.86, 0.98),
    "SEXY": (0.20, 0.44, 0.80, 0.98),
    "SOLO": (0.18, 0.44, 0.82, 0.98),
    "THAN-K": (0.18, 0.44, 0.82, 0.98),
    "HIA!": (0.08, 0.02, 0.92, 0.98),
    "JOKE-R": (0.18, 0.44, 0.82, 0.98),
    "FUCK": (0.08, 0.02, 0.92, 0.98),
    "DIO-s": (0.10, 0.05, 0.92, 0.98),
    "CHIL": (0.22, 0.37, 0.80, 0.98),
    "LING": (0.12, 0.28, 0.88, 0.98),
    "KWAI!": (0.50, 0.48, 0.93, 0.99),
    "NOK": (0.24, 0.42, 0.77, 0.98),
    "555+": (0.18, 0.40, 0.82, 0.98),
}

FIGURE_MAX_RATIO = {
    "KWAI!": (0.62, 0.44),
}


def load_font(path: str, size: int, index: int = 0) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(path, size=size, index=index)
    except OSError:
        return ImageFont.truetype(path, size=size)


def fit_font(text: str, max_width: int, path: str, start_size: int, min_size: int, index: int = 0):
    probe = Image.new("RGB", (10, 10))
    draw = ImageDraw.Draw(probe)
    for size in range(start_size, min_size - 1, -2):
        font = load_font(path, size, index=index)
        left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
        if right - left <= max_width:
            return font
    return load_font(path, min_size, index=index)


def parse_type_names(html: str) -> dict[str, str]:
    start = html.index("const TYPE_LIBRARY = {")
    end = html.index("};\n    const TYPE_IMAGES", start)
    chunk = html[start:end]
    pairs = re.findall(r'"([^"]+)":\s*\{.*?"cn":\s*"([^"]+)"', chunk, re.S)
    return {code: name for code, name in pairs}


def parse_type_images(html: str) -> dict[str, str]:
    start = html.index("const TYPE_IMAGES = {")
    end = html.index("};", start)
    chunk = html[start:end]
    pairs = re.findall(r'"([^"]+)":\s*"\./images/types/([^"]+)"', chunk)
    return {code: filename for code, filename in pairs}


def extract_figure(image: Image.Image) -> Image.Image:
    img = image.convert("RGB")
    w, h = img.size
    search_top = int(h * 0.38)
    pixels = img.load()

    region_h = h - search_top
    visited: set[tuple[int, int]] = set()
    best = None

    def is_fg(xx: int, yy: int) -> bool:
        r, g, b = pixels[xx, yy]
        return r < 245 or g < 245 or b < 245

    for y in range(search_top, h):
        for x in range(w):
            key = (x, y)
            if key in visited or not is_fg(x, y):
                continue

            q = deque([(x, y)])
            visited.add(key)
            area = 0
            min_x = max_x = x
            min_y = max_y = y

            while q:
                cx, cy = q.popleft()
                area += 1
                min_x = min(min_x, cx)
                min_y = min(min_y, cy)
                max_x = max(max_x, cx)
                max_y = max(max_y, cy)

                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if nx < 0 or nx >= w or ny < search_top or ny >= h:
                        continue
                    nkey = (nx, ny)
                    if nkey in visited or not is_fg(nx, ny):
                        continue
                    visited.add(nkey)
                    q.append((nx, ny))

            center_y = (min_y + max_y) / 2
            bottomness = (center_y - search_top) / max(1, region_h)
            score = area * (1 + bottomness)
            if best is None or score > best[0]:
                best = (score, min_x, min_y, max_x, max_y)

    if best is None:
        return img

    _, min_x, min_y, max_x, max_y = best
    pad_x = int(w * 0.05)
    pad_top = int(h * 0.08)
    pad_bottom = int(h * 0.03)
    left = max(0, min_x - pad_x)
    top = max(0, min_y - pad_top)
    right = min(w, max_x + pad_x)
    bottom = min(h, max_y + pad_bottom)
    return img.crop((left, top, right, bottom))


def poster_for(code: str, thai_name: str, source_path: Path, dest_path: Path) -> None:
    src = Image.open(source_path).convert("RGB")
    w, h = src.size
    if code in MANUAL_CROP_BOXES:
        l, t, r, b = MANUAL_CROP_BOXES[code]
        figure = src.crop((int(w * l), int(h * t), int(w * r), int(h * b)))
    else:
        figure = extract_figure(src)
    trim_ratio = EXTRA_TOP_TRIM.get(code, 0)
    if trim_ratio:
        trim_px = int(figure.height * trim_ratio)
        figure = figure.crop((0, min(trim_px, figure.height - 1), figure.width, figure.height))
    erase_ratio = ERASE_TOP_BAND.get(code, 0)
    if erase_ratio:
        draw_fig = ImageDraw.Draw(figure)
        erase_h = int(figure.height * erase_ratio)
        draw_fig.rectangle((0, 0, figure.width, erase_h), fill=BG_COLOR)

    canvas = Image.new("RGB", (w, h), BG_COLOR)
    draw = ImageDraw.Draw(canvas)

    header_font = fit_font(HEADER_TEXT, int(w * 0.84), FONT_REGULAR, int(h * 0.085), 24)
    name_font = fit_font(thai_name, int(w * 0.82), FONT_BOLD, int(h * 0.11), 28)
    code_font = fit_font(code, int(w * 0.7), FONT_BOLD, int(h * 0.105), 24)

    header_box = draw.textbbox((0, 0), HEADER_TEXT, font=header_font)
    name_box = draw.textbbox((0, 0), thai_name, font=name_font)
    code_box = draw.textbbox((0, 0), code, font=code_font)

    header_y = int(h * 0.035)
    name_y = int(h * 0.115)
    code_y = name_y + (name_box[3] - name_box[1]) + int(h * 0.03)

    draw.text(((w - (header_box[2] - header_box[0])) / 2, header_y), HEADER_TEXT, fill=HEADER_COLOR, font=header_font)
    draw.text(((w - (name_box[2] - name_box[0])) / 2, name_y), thai_name, fill=NAME_COLOR, font=name_font)
    draw.text(((w - (code_box[2] - code_box[0])) / 2, code_y), code, fill=CODE_COLOR, font=code_font)

    figure_w_ratio, figure_h_ratio = FIGURE_MAX_RATIO.get(code, (0.66, 0.48))
    figure_max_w = int(w * figure_w_ratio)
    figure_max_h = int(h * figure_h_ratio)
    scale = min(figure_max_w / figure.width, figure_max_h / figure.height)
    scale = max(0.1, scale)
    resized = figure.resize((int(figure.width * scale), int(figure.height * scale)), Image.LANCZOS)

    paste_x = (w - resized.width) // 2
    paste_y = h - resized.height - int(h * 0.04)
    canvas.paste(resized, (paste_x, paste_y))

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    canvas.save(dest_path)
    print(f"saved {dest_path.name}")


def main() -> None:
    html = INDEX_FILE.read_text(encoding="utf-8")
    type_names = parse_type_names(html)
    type_images = parse_type_images(html)

    for code, dest_name in type_images.items():
        thai_name = type_names.get(code, code)
        source_name = SOURCE_OVERRIDES.get(code, dest_name)
        source_path = Path(source_name) if str(source_name).startswith("/") else SOURCE_DIR / source_name
        if not source_path.exists():
            raise FileNotFoundError(f"missing source image for {code}: {source_path}")
        poster_for(code, thai_name, source_path, OUTPUT_DIR / dest_name)


if __name__ == "__main__":
    main()
