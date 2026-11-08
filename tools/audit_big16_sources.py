"""Read-only audit of the three enlarged animal source sheets."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def main():
    spec = json.loads((ROOT / "docs/briefs/big16-spec.json").read_text())
    palette = {tuple(bytes.fromhex(c[1:])) for c in spec["palette"]} | {(255, 0, 255)}
    sheets, checks = [], []
    for s in spec["sheets"]:
        path = Path("assets/spritesheets16/animals-large") / s["filename"]
        with Image.open(ROOT / path) as original:
            assert original.format == "PNG"
            original.load()
            im = original.convert("RGB")
        colors = im.getcolors(im.width * im.height)
        off = sum(n for n, c in colors if c not in palette)
        entries = []
        cols, rows = s["grid"]
        for i in range(cols * rows):
            entry = {"slot": i + 1, "row": i // cols + 1, "column": i % cols + 1,
                     "empty": i >= len(s["entries"])}
            if not entry["empty"]:
                entry.update(s["entries"][i])
                folder = "seasonal" if entry["reference_sheet"] in ("animals16_11.png", "animals16_12.png") else "permanent"
                refpath = Path("assets/spritesheets16/animals") / folder / entry["reference_sheet"]
                entry["reference_path"] = str(refpath)
                entry["reference_sha256"] = hashlib.sha256((ROOT / refpath).read_bytes()).hexdigest()
            entries.append(entry)
        sheets.append({"filename": s["filename"], "path": str(path),
                       "sha256": hashlib.sha256((ROOT / path).read_bytes()).hexdigest(),
                       "actual_size": list(im.size), "requested_size": s["requested_size"],
                       "target_native_size": s["native"], "requested_grid": s["grid"],
                       "entries_describe_requested_slots": True, "extraction_coordinates": None,
                       "entries": entries})
        blank_checks = []
        for slot in s["empty_slots"]:
            i = slot - 1
            x0, x1 = int((i % cols + 0.05) * im.width / cols), int((i % cols + 0.95) * im.width / cols)
            y0, y1 = int((i // cols + 0.05) * im.height / rows), int((i // cols + 0.95) * im.height / rows)
            points = [im.getpixel((x, y)) for y in range(y0, y1) for x in range(x0, x1)]
            blank_checks.append({"slot": slot, "sample": "inner 90 percent of nominal cell",
                                 "near_magenta_fraction": sum(r > 235 and g < 25 and b > 235 for r, g, b in points) / len(points),
                                 "note": "Approximate color test, not exact chromakey certification."})
        checks.append({"filename": s["filename"], "readable_png": True,
                       "actual_size": list(im.size), "requested_size": s["requested_size"],
                       "canvas_pass": list(im.size) == s["requested_size"],
                       "unique_rgb_colors": len(colors), "off_palette_pixels": off,
                       "palette_pass": off == 0, "empty_cell_samples": blank_checks,
                       "native_grid_and_outline": "NOT_CERTIFIED", "all_left_facing": "NOT_CERTIFIED",
                       "exact_character_identity": "NOT_CERTIFIED"})
    catalog = {"asset_kind": "image_generator_source_sheets", "engine_ready": False, "sheet_count": 3,
               "requested_animal_count": 67, "requested_slot_count": 71, "empty_slot_count": 4, "sheets": sheets}
    assert sum(not e["empty"] for s in sheets for e in s["entries"]) == 67
    assert sum(len(s["entries"]) for s in sheets) == 71
    report = {"source_delivery": "PASS_3_READABLE_PNGS", "strict_pixel_gate": "HOLD", "checks": checks,
              "remaining": ["All canvases differ from requested 1536x1536.",
                            "Exact 48x48/60x60 native grid, palette, magenta background and brown outline not met.",
                            "Some faces remain near frontal; exact character identity and left-facing view need review.",
                            "Native-size redrawing/extraction and in-game rendering have not been completed."]}
    (ROOT / "assets/catalog16_big.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n")
    (ROOT / "reports/BIG16_SOURCE_AUDIT.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"sheets": 3, "animals": 67, "slots": 71, "empty": 4,
                      "sizes": [s["actual_size"] for s in sheets], "strict_gate": "HOLD",
                      "blank_samples": checks[-1]["empty_cell_samples"]}))


if __name__ == "__main__":
    main()
