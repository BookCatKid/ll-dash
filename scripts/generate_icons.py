"""Build platform icons from the canonical 512px app icon.

Requires Pillow. Run from the repository root:
    python3 scripts/generate_icons.py
"""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ICONS = ROOT / "frontend" / "static" / "icons"
MASTER = ICONS / "icon-512.png"
BACKGROUND = "#151820"


def main() -> None:
    master = Image.open(MASTER).convert("RGB")
    if master.size != (512, 512):
        raise ValueError("The app icon master must be 512 by 512 pixels")

    sizes = {
        "icon-192.png": 192,
        "apple-touch-icon.png": 180,
        "favicon-32.png": 32,
        "favicon-16.png": 16,
    }
    for filename, size in sizes.items():
        master.resize((size, size), Image.Resampling.LANCZOS).save(ICONS / filename)

    maskable = Image.new("RGB", (512, 512), BACKGROUND)
    contained = master.resize((410, 410), Image.Resampling.LANCZOS)
    maskable.paste(contained, ((512 - 410) // 2, (512 - 410) // 2))
    maskable.save(ICONS / "icon-maskable-512.png")

    master.save(ICONS / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])


if __name__ == "__main__":
    main()
