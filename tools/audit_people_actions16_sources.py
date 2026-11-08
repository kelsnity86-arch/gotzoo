"""Read-only PNG audit and requested-slot catalog; never alters image pixels."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
POSES = ["watch", "cheer", "photo_phone_back", "seasonal_food", "point_down",
         "sit_no_bench", "toss_coin", "disappointed"]
VIP = ["gold_gentleman", "movie_star_with_dog", "witch_costume_child", "ghost_costume_child"]
FOOD = {"spring": "ice_cream_cone", "summer": "popsicle",
        "autumn": "corn_dog", "winter": "hot_cocoa_cup"}


def requested_entries(sheet, visitors):
    entries = []
    columns, rows = sheet["grid"]
    for row in range(1, rows + 1):
        for column in range(1, columns + 1):
            group = sheet["group"]
            if group in ("model", "walk"):
                who = visitors[column - 1]
                pose = ("stand_front" if row == 1 else "walk_left") if group == "model" else ("walk_left_a" if row == 1 else "walk_left_b")
            elif group == "poses":
                who = visitors[sheet["visitor_ids"][row - 1] - 1]
                pose = POSES[column - 1]
            else:
                who = VIP[row - 1]
                pose = ["walk_left_a", "walk_left_b", *POSES][column - 1]
            food = ("lollipop" if group == "vip" else FOOD.get(sheet["season"])) if pose == "seasonal_food" else None
            entries.append({"slot": len(entries) + 1, "row": row, "column": column,
                            "visitor": who, "action": pose, "food": food,
                            "target_native_size": sheet["native"],
                            "facing": "left" if pose.startswith("walk_left") else "front"})
    assert len(entries) == sheet["requested_slot_count"]
    return entries


def main():
    spec = json.loads((ROOT / "docs/briefs/people-actions16-spec.json").read_text())
    rgb = lambda value: tuple(bytes.fromhex(value.lstrip("#")))
    palette = {rgb(c) for c in spec["palette"]} | {rgb(spec["background"])}
    assert len(spec["sheets"]) == 14 and len(spec["palette"]) == 38
    catalog, checks, seen = [], [], set()
    for sheet in spec["sheets"]:
        path = Path("assets/spritesheets16/people-actions") / sheet["group"] / sheet["filename"]
        digest = hashlib.sha256((ROOT / path).read_bytes()).hexdigest()
        assert digest not in seen
        seen.add(digest)
        with Image.open(ROOT / path) as original:
            assert original.format == "PNG"
            original.load()
            mode = original.mode
            image = original.convert("RGB")
        colors = image.getcolors(image.width * image.height)
        outside = sum(n for n, c in colors if c not in palette)
        edge = [image.getpixel((x, y)) for y in (0, image.height - 1) for x in range(image.width)]
        edge += [image.getpixel((x, y)) for x in (0, image.width - 1) for y in range(1, image.height - 1)]
        catalog.append({"filename": sheet["filename"], "path": str(path), "group": sheet["group"],
                        "season": sheet["season"], "actual_size": list(image.size),
                        "target_size": sheet["size"], "requested_grid": sheet["grid"], "sha256": digest,
                        "entries_describe_requested_slots": True, "extraction_coordinates": None,
                        "entries": requested_entries(sheet, spec["visitors"])})
        checks.append({"filename": sheet["filename"], "readable_png": True, "mode": mode,
                       "actual_size": list(image.size), "requested_size": sheet["size"],
                       "requested_canvas_pass": list(image.size) == sheet["size"],
                       "unique_rgb_colors": len(colors), "off_palette_pixels": outside,
                       "palette_pass": outside == 0,
                       "exact_magenta_perimeter_pass": all(c == rgb(spec["background"]) for c in edge),
                       "native_grid_and_outline_status": "NOT_CERTIFIED",
                       "exact_identity_and_pivot_status": "NOT_CERTIFIED",
                       "animation_playback_status": "NOT_TESTED"})
    assert sum(len(s["entries"]) for s in catalog) == 376
    result = {"schema": 1, "asset_kind": "image_generator_source_sheets",
              "engine_ready": False, "sheet_count": 14, "requested_slot_count": 376,
              "count_note": "Requested cells, including model views, poses and walk frames; not 376 unique people.",
              "sheets": catalog}
    report = {"source_delivery": "PASS_14_READABLE_DISTINCT_PNGS",
              "strict_pixel_identity_and_animation_gate": "HOLD", "checks": checks,
              "canvas_matches": sum(c["requested_canvas_pass"] for c in checks),
              "canvas_mismatches": sum(not c["requested_canvas_pass"] for c in checks),
              "remaining": ["Exact 16x26 art grid, 38-color palette, flat magenta and 1px outline.",
                            "Frame registration, common baseline and A/B leg identity at playback speed.",
                            "VIP witch walk B changes eye expression; VIP walk leg phases remain weak.",
                            "Seated head scale, shoe soles and some coat details vary between poses.",
                            "Camera, handbag, hair and winter mittens need per-cell native-size review."]}
    (ROOT / "assets/catalog16_people_actions.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    (ROOT / "reports/PEOPLE_ACTIONS16_SOURCE_AUDIT.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"sheets": 14, "requested_slots": 376,
                      "canvas_matches": report["canvas_matches"],
                      "canvas_mismatches": report["canvas_mismatches"],
                      "palette_pass_count": sum(c["palette_pass"] for c in checks),
                      "strict_gate": "HOLD"}))


if __name__ == "__main__":
    main()
