"""Read-only audit and catalog for four seasonal decoration source sheets."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def main():
    spec = json.loads((ROOT / "docs/briefs/seasonal-decor16-spec.json").read_text())
    palette = {tuple(bytes.fromhex(c[1:])) for c in spec["palette"]} | {(255, 0, 255)}
    sheets, checks, seen = [], [], set()
    reference_hash = hashlib.sha256((ROOT / spec["reference"]).read_bytes()).hexdigest()
    for s in spec["sheets"]:
        path = Path("assets/spritesheets16/seasonal-decor") / s["filename"]
        digest = hashlib.sha256((ROOT / path).read_bytes()).hexdigest()
        assert digest not in seen
        seen.add(digest)
        with Image.open(ROOT / path) as original:
            assert original.format == "PNG"
            original.load()
            im = original.convert("RGB")
        assert len(s["entries"]) == 12
        colors = im.getcolors(im.width * im.height)
        off = sum(n for n, c in colors if c not in palette)
        edge = [im.getpixel((x, y)) for y in (0, im.height - 1) for x in range(im.width)]
        edge += [im.getpixel((x, y)) for x in (0, im.width - 1) for y in range(1, im.height - 1)]
        sheets.append({"filename": s["filename"], "path": str(path), "season": s["season"],
                       "sha256": digest, "actual_size": list(im.size), "requested_size": s["requested_size"],
                       "requested_grid": s["grid"], "target_native_size": s["target_native_size"],
                       "max_tree_size": s["max_tree_size"], "entries_describe_requested_slots": True,
                       "extraction_coordinates": None, "entries": s["entries"]})
        checks.append({"filename": s["filename"], "readable_png": True,
                       "actual_size": list(im.size), "requested_size": s["requested_size"],
                       "canvas_pass": list(im.size) == s["requested_size"],
                       "aspect_ratio_2_to_1_pass": im.width == 2 * im.height,
                       "unique_rgb_colors": len(colors), "off_palette_pixels": off,
                       "palette_pass": off == 0,
                       "exact_magenta_perimeter_pass": all(c == (255, 0, 255) for c in edge),
                       "native_grid_outline_shadow": "NOT_CERTIFIED",
                       "footprint_pivot_and_game_scale": "NOT_TESTED"})
    catalog = {"asset_kind": "image_generator_source_sheets", "engine_ready": False,
               "sheet_count": 4, "requested_prop_count": 48, "reference": spec["reference"],
               "reference_sha256": reference_hash, "sheets": sheets}
    report = {"source_delivery": "PASS_4_READABLE_DISTINCT_PNGS", "strict_pixel_and_runtime_gate": "HOLD",
              "checks": checks, "corrections": ["Spring sheet recomposed from 3:2 to requested 2:1 aspect ratio."],
              "remaining": ["Actual canvas differs from requested 1536x768.",
                            "Exact native art grid, 38-color palette, pure magenta and 1px brown outline not met.",
                            "Flat shadow colors, footprint, common baseline and per-prop pivots need native-size review.",
                            "No transparent extraction or game-scale scene test completed."]}
    assert sum(len(s["entries"]) for s in sheets) == 48
    (ROOT / "assets/catalog16_seasonal_decor.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n")
    (ROOT / "reports/SEASONAL_DECOR16_SOURCE_AUDIT.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"sheets": 4, "props": 48, "sizes": [s["actual_size"] for s in sheets],
                      "aspect_2_to_1_pass_count": sum(c["aspect_ratio_2_to_1_pass"] for c in checks),
                      "palette_pass_count": sum(c["palette_pass"] for c in checks), "strict_gate": "HOLD"}))


if __name__ == "__main__":
    main()
