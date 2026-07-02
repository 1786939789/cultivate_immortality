from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def remove_chroma(image: Image.Image, key=(0, 255, 0), tolerance=42) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    kr, kg, kb = key
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            distance = abs(r - kr) + abs(g - kg) + abs(b - kb)
            green_dominance = g - max(r, b)
            if distance <= tolerance or (g > 170 and green_dominance > 65):
                pixels[x, y] = (r, g, b, 0)
    return rgba


def trim_alpha(image: Image.Image, padding=12) -> Image.Image:
    bbox = image.getbbox()
    if not bbox:
        return image
    left, top, right, bottom = bbox
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(image.width, right + padding)
    bottom = min(image.height, bottom + padding)
    return image.crop((left, top, right, bottom))


def component_bounds(alpha: Image.Image) -> list[tuple[int, int, int, int, int]]:
    width, height = alpha.size
    pixels = alpha.load()
    seen = bytearray(width * height)
    components = []
    for start_y in range(height):
        for start_x in range(width):
            index = start_y * width + start_x
            if seen[index] or pixels[start_x, start_y] <= 10:
                continue
            seen[index] = 1
            stack = [(start_x, start_y)]
            left = right = start_x
            top = bottom = start_y
            area = 0
            while stack:
                x, y = stack.pop()
                area += 1
                left = min(left, x)
                right = max(right, x)
                top = min(top, y)
                bottom = max(bottom, y)
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height:
                        continue
                    next_index = ny * width + nx
                    if seen[next_index] or pixels[nx, ny] <= 10:
                        continue
                    seen[next_index] = 1
                    stack.append((nx, ny))
            components.append((area, left, top, right + 1, bottom + 1))
    return components


def clean_stray_fragments(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    components = component_bounds(alpha)
    if not components:
        return rgba

    cell_center = (rgba.width / 2, rgba.height / 2)

    def centrality(component: tuple[int, int, int, int, int]) -> float:
        area, left, top, right, bottom = component
        center = ((left + right) / 2, (top + bottom) / 2)
        distance = abs(center[0] - cell_center[0]) + abs(center[1] - cell_center[1])
        return area - distance * 18

    large_enough = [component for component in components if component[0] >= 90]
    largest = max(large_enough or components, key=centrality)
    largest_area, largest_left, largest_top, largest_right, largest_bottom = largest
    largest_center = ((largest_left + largest_right) / 2, (largest_top + largest_bottom) / 2)
    keep = []
    for area, left, top, right, bottom in components:
        width = right - left
        height = bottom - top
        center = ((left + right) / 2, (top + bottom) / 2)
        distance_to_largest = abs(center[0] - largest_center[0]) + abs(center[1] - largest_center[1])
        distance_to_center = abs(center[0] - cell_center[0]) + abs(center[1] - cell_center[1])
        near_main_box = not (
            right < largest_left - 14 or
            left > largest_right + 14 or
            bottom < largest_top - 14 or
            top > largest_bottom + 14
        )
        in_inner_cell = (
            0.14 * rgba.width <= center[0] <= 0.86 * rgba.width and
            0.12 * rgba.height <= center[1] <= 0.88 * rgba.height
        )
        is_main = area == largest_area
        is_near_main = area >= largest_area * 0.08 and area >= 180 and near_main_box
        is_substantial_pair = area >= largest_area * 0.32 and distance_to_largest <= max(rgba.width, rgba.height) * 0.22 and in_inner_cell
        is_attached_effect = area >= 150 and max(width, height) >= 34 and near_main_box and distance_to_largest <= max(rgba.width, rgba.height) * 0.18
        is_centered_main_detail = area >= largest_area * 0.16 and distance_to_center <= max(rgba.width, rgba.height) * 0.18
        if is_main or is_near_main or is_substantial_pair or is_attached_effect or is_centered_main_detail:
            keep.append((left, top, right, bottom))

    mask = Image.new("L", rgba.size, 0)
    source_alpha = rgba.getchannel("A")
    for left, top, right, bottom in keep:
        crop = source_alpha.crop((left, top, right, bottom))
        mask.paste(crop, (left, top))
    rgba.putalpha(mask)
    return rgba


def contain(image: Image.Image, size=256) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    trimmed = trim_alpha(clean_stray_fragments(image))
    trimmed.thumbnail((size - 28, size - 28), Image.Resampling.LANCZOS)
    x = (size - trimmed.width) // 2
    y = (size - trimmed.height) // 2
    canvas.alpha_composite(trimmed, (x, y))
    return canvas


def main() -> None:
    parser = argparse.ArgumentParser(description="Slice a chroma-key equipment spritesheet into item icons.")
    parser.add_argument("--sheet", required=True, type=Path)
    parser.add_argument("--out-dir", required=True, type=Path)
    parser.add_argument("--ids", required=True, help="Comma-separated equipment ids in reading order.")
    parser.add_argument("--cols", type=int, default=4)
    parser.add_argument("--rows", type=int, default=5)
    parser.add_argument("--size", type=int, default=256)
    args = parser.parse_args()

    ids = [item.strip() for item in args.ids.split(",") if item.strip()]
    expected = args.cols * args.rows
    if len(ids) != expected:
        raise SystemExit(f"Expected {expected} ids, got {len(ids)}")

    args.out_dir.mkdir(parents=True, exist_ok=True)
    sheet = Image.open(args.sheet).convert("RGBA")
    cell_width = sheet.width // args.cols
    cell_height = sheet.height // args.rows

    for index, item_id in enumerate(ids):
        col = index % args.cols
        row = index // args.cols
        cell = sheet.crop((col * cell_width, row * cell_height, (col + 1) * cell_width, (row + 1) * cell_height))
        icon = contain(remove_chroma(cell), args.size)
        icon.save(args.out_dir / f"{item_id}.webp", quality=92, method=6)


if __name__ == "__main__":
    main()
