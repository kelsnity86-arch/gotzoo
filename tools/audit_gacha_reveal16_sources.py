"""Read-only PNG audit and requested-slot catalog for gacha reveal sources."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def main():
    spec = json.loads((ROOT / "docs/briefs/gacha-reveal16-spec.json").read_text())
    palette = {tuple(bytes.fromhex(c[1:])) for c in spec["palette"]} | {(255, 0, 255)}
    sheets, checks, seen = [], [], set()
    for s in spec["sheets"]:
        path = Path("assets/spritesheets16/gacha-reveal") / s["group"] / s["filename"]
        digest = hashlib.sha256((ROOT / path).read_bytes()).hexdigest()
        assert digest not in seen
        seen.add(digest)
        with Image.open(ROOT / path) as original:
            assert original.format == "PNG"
            original.load()
            im = original.convert("RGB")
        colors = im.getcolors(im.width * im.height)
        off = sum(n for n, c in colors if c not in palette)
        edge = [im.getpixel((x, y)) for y in (0, im.height - 1) for x in range(im.width)]
        edge += [im.getpixel((x, y)) for x in (0, im.width - 1) for y in range(1, im.height - 1)]
        entries = []
        for row, items in enumerate(s["rows"], 1):
            assert len(items) == s["grid"][0]
            for col, item in enumerate(items, 1):
                entries.append({"slot": len(entries) + 1, "row": row, "column": col,
                                **item, "target_native_size": s.get("native") or s["native_by_row"][row - 1]})
        assert len(entries) == s["grid"][0] * s["grid"][1]
        sheets.append({"filename": s["filename"], "path": str(path), "group": s["group"],
                       "sha256": digest, "actual_size": list(im.size), "requested_size": s["size"],
                       "requested_grid": s["grid"], "entries_describe_requested_slots": True,
                       "extraction_coordinates": None, "entries": entries})
        checks.append({"filename": s["filename"], "readable_png": True, "actual_size": list(im.size),
                       "requested_size": s["size"], "canvas_pass": list(im.size) == s["size"],
                       "unique_rgb_colors": len(colors), "off_palette_pixels": off, "palette_pass": off == 0,
                       "exact_magenta_perimeter_pass": all(c == (255, 0, 255) for c in edge),
                       "native_grid_outline_and_flat_fills": "NOT_CERTIFIED",
                       "animation_registration_and_playback": "NOT_TESTED",
                       "card_window_uniformity": "NOT_CERTIFIED"})
    refs = ["assets/spritesheets16/ui-effects/gacha/gacha16.png",
            "assets/spritesheets16/ui-effects/cards/cards16.png",
            "assets/spritesheets16/ui-effects/effects/fxbig16.png",
            "assets/spritesheets16/world-life/park-props/parkprops16.png"]
    catalog = {"asset_kind": "image_generator_source_sheets", "engine_ready": False,
               "sheet_count": 5, "requested_slot_count": 70,
               "count_note": "18 machine frames + 24 capsule frames + 18 effects + 8 cards + 2 banners.",
               "references": [{"path": p, "sha256": hashlib.sha256((ROOT / p).read_bytes()).hexdigest()} for p in refs],
               "sheets": sheets}
    report = {"source_delivery": "PASS_5_READABLE_DISTINCT_PNGS", "strict_pixel_and_runtime_gate": "HOLD",
              "canvas_matches": sum(c["canvas_pass"] for c in checks),
              "canvas_mismatches": sum(not c["canvas_pass"] for c in checks), "checks": checks,
              "corrections": ["Cut-in ray fills edited to reduce smooth lighting; exact flat RGB areas remain uncertified."],
              "remaining": ["Exact native grid, 38-color palette, uniform magenta and 1px brown outline not met.",
                            "Card and FX canvases differ from requested dimensions.",
                            "Machine body equality, capsule diameter, animation anchors and playback need review.",
                            "Staff machine dome retains a round capsule behind ID-card shapes.",
                            "Cut-in ray fills still contain intermediate colors; no true flat-palette certification.",
                            "Empty card window geometry and no-text requirement checked visually only."]}
    assert sum(len(s["entries"]) for s in sheets) == 70
    (ROOT / "assets/catalog16_gacha_reveal.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n")
    (ROOT / "reports/GACHA_REVEAL16_SOURCE_AUDIT.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"sheets": 5, "slots": 70, "sizes": [s["actual_size"] for s in sheets],
                      "canvas_matches": report["canvas_matches"], "canvas_mismatches": report["canvas_mismatches"],
                      "palette_pass_count": sum(c["palette_pass"] for c in checks), "strict_gate": "HOLD"}))


if __name__ == "__main__":
    main()
