"""Generates the application icons (PNG + multi-size ICO) used by the fork build."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).parent / "icons"
SIZE = 1024
BACKGROUND = (232, 89, 12)
FOREGROUND = (255, 255, 255)
FONT_CANDIDATES = ["C:/Windows/Fonts/segoeuib.ttf", "C:/Windows/Fonts/arialbd.ttf"]


def load_font(size):
    for candidate in FONT_CANDIDATES:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def render():
    image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    margin = SIZE // 16
    draw.rounded_rectangle((margin, margin, SIZE - margin, SIZE - margin), radius=SIZE // 5, fill=BACKGROUND)

    font = load_font(int(SIZE * 0.62))
    left, top, right, bottom = draw.textbbox((0, 0), "b", font=font)
    x = (SIZE - (right - left)) / 2 - left
    y = (SIZE - (bottom - top)) / 2 - top
    draw.text((x, y), "b", font=font, fill=FOREGROUND)
    return image


def main():
    OUT.mkdir(exist_ok=True)
    image = render()
    image.resize((256, 256), Image.LANCZOS).save(OUT / "256x256.png")
    image.save(OUT / "icon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])


if __name__ == "__main__":
    main()
