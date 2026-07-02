from __future__ import annotations

import importlib.util
from pathlib import Path

from PIL import Image, ImageDraw


spec = importlib.util.spec_from_file_location("slice_equipment_icons", "scripts/slice_equipment_icons.py")
slice_equipment_icons = importlib.util.module_from_spec(spec)
assert spec.loader
spec.loader.exec_module(slice_equipment_icons)


def main() -> None:
    paths = sorted(Path("web/public/assets/equipment-icons/items").glob("*.webp"))
    thumb = 96
    cols = 10
    rows = (len(paths) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * thumb, rows * thumb), (245, 235, 210, 255))
    draw = ImageDraw.Draw(sheet)
    suspicious = []

    for index, path in enumerate(paths):
        image = Image.open(path).convert("RGBA")
        components = slice_equipment_icons.component_bounds(image.getchannel("A"))
        large_components = [component for component in components if component[0] > 60]
        if len(large_components) > 1:
            suspicious.append((path.name, len(large_components), sorted((component[0] for component in large_components), reverse=True)[:4]))

        preview = image.copy()
        preview.thumbnail((thumb - 12, thumb - 12), Image.Resampling.LANCZOS)
        x = (index % cols) * thumb + (thumb - preview.width) // 2
        y = (index // cols) * thumb + (thumb - preview.height) // 2
        sheet.alpha_composite(preview, (x, y))
        draw.rectangle(
            [
                (index % cols) * thumb,
                (index // cols) * thumb,
                (index % cols + 1) * thumb - 1,
                (index // cols + 1) * thumb - 1,
            ],
            outline=(176, 142, 77, 255),
        )

    out = Path("assets/equipment-icons/preview.jpg")
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(out, quality=88)
    print({"count": len(paths), "multi_component": len(suspicious), "preview": str(out)})
    for item in suspicious[:40]:
        print(item)


if __name__ == "__main__":
    main()
