"""Read-only checks for the enlarged building source sheet; does not edit PNGs."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def main():
    spec = json.loads((ROOT / 'docs/briefs/buildings-big16-spec.json').read_text())
    source_map = json.loads((ROOT / 'art-source/buildings-big16/final-source-map.json').read_text())
    palette = json.loads((ROOT / 'docs/briefs/world-life16-spec.json').read_text())['palette']
    allowed = {tuple(bytes.fromhex(c[1:])) for c in palette} | {(255, 0, 255)}
    path = source_map['destination']
    data = (ROOT / path).read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    with Image.open(ROOT / path) as original:
        original.load()
        assert original.format == 'PNG'
        im = original.convert('RGB')
    colors = im.getcolors(im.width * im.height)
    outside = sum(count for count, color in colors if color not in allowed)
    perimeter = [im.getpixel((x, y)) for y in (0, im.height - 1) for x in range(im.width)]
    perimeter += [im.getpixel((x, y)) for x in (0, im.width - 1) for y in range(1, im.height - 1)]
    entries = [{'slot': row * 6 + col + 1, 'row': row + 1, 'column': col + 1,
                'building': name, 'upgrade': spec['upgrade_levels'][row],
                'target_native_size': spec['native_by_row'][row]}
               for row in range(3) for col, name in enumerate(spec['columns'])]
    assert len(entries) == 18
    sheet = {'filename': spec['filename'], 'path': path, 'sha256': digest,
             'actual_size': list(im.size), 'requested_size': spec['requested_size'],
             'requested_grid': [6, 3], 'entries_describe_requested_slots': True,
             'extraction_coordinates': None, 'entries': entries}
    catalog = {'asset_kind': 'image_generator_source_sheets', 'engine_ready': False,
               'sheet_count': 1, 'requested_slot_count': 18, 'sheets': [sheet]}
    report = {'readable_png': True, 'asset_kind': 'image_generator_source_sheet',
              'engine_ready': False, 'strict_pixel_and_runtime_gate': 'HOLD',
              'path': path, 'sha256': digest, 'actual_size': list(im.size),
              'requested_size': spec['requested_size'],
              'canvas_pass': list(im.size) == spec['requested_size'],
              'square_canvas_pass': im.width == im.height,
              'unique_rgb_colors': len(colors), 'off_palette_pixels': outside,
              'palette_pass': outside == 0,
              'exact_magenta_perimeter_pass': all(c == (255, 0, 255) for c in perimeter),
              'native_48_64_80_grid': 'NOT_CERTIFIED',
              'one_pixel_outline_and_flat_two_tones': 'NOT_CERTIFIED',
              'door_scale_vs_26px_visitors': 'NOT_TESTED_IN_GAME',
              'common_pixel_scale_and_gutters': 'NOT_CERTIFIED',
              'reference': spec['reference'],
              'reference_sha256': hashlib.sha256((ROOT / spec['reference']).read_bytes()).hexdigest(),
              'visual_review': '6 columns x 3 rows inspected; family colors and bear cutout retained; side-wall depth, windows, blank plaques and pavilion access added.',
              'correction': 'Initial wide, near-reference output was superseded by square architectural redraw.'}
    (ROOT / 'assets/catalog16_buildings_big.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'reports/BUILDINGS_BIG16_SOURCE_AUDIT.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(report, ensure_ascii=False))


if __name__ == '__main__':
    main()
