"""Read-only audit and requested-slot catalog for six new building families."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def main():
    spec = json.loads((ROOT / 'docs/briefs/buildings-new16-spec.json').read_text())
    mapping = json.loads((ROOT / 'art-source/buildings-new16/final-source-map.json').read_text())
    palette = json.loads((ROOT / 'docs/briefs/world-life16-spec.json').read_text())['palette']
    allowed = {tuple(bytes.fromhex(c[1:])) for c in palette} | {(255, 0, 255)}
    path = mapping['destination']
    digest = hashlib.sha256((ROOT / path).read_bytes()).hexdigest()
    with Image.open(ROOT / path) as original:
        original.load()
        assert original.format == 'PNG'
        im = original.convert('RGB')
    colors = im.getcolors(im.width * im.height)
    off = sum(n for n, color in colors if color not in allowed)
    edges = [im.getpixel((x, y)) for y in (0, im.height - 1) for x in range(im.width)]
    edges += [im.getpixel((x, y)) for x in (0, im.width - 1) for y in range(1, im.height - 1)]
    entries = [{'slot': row * 6 + col + 1, 'row': row + 1, 'column': col + 1,
                'building': name, 'upgrade': spec['upgrade_levels'][row],
                'target_native_size': spec['native_by_row'][row], 'identity': spec['identities'][col]}
               for row in range(3) for col, name in enumerate(spec['columns'])]
    sheet = {'filename': spec['filename'], 'path': path, 'sha256': digest,
             'actual_size': list(im.size), 'requested_size': spec['requested_size'],
             'requested_grid': [6, 3], 'entries_describe_requested_slots': True,
             'extraction_coordinates': None, 'entries': entries}
    catalog = {'asset_kind': 'image_generator_source_sheets', 'engine_ready': False,
               'sheet_count': 1, 'requested_slot_count': 18, 'sheets': [sheet]}
    report = {'readable_png': True, 'path': path, 'sha256': digest,
              'engine_ready': False, 'strict_pixel_and_runtime_gate': 'HOLD',
              'actual_size': list(im.size), 'requested_size': spec['requested_size'],
              'canvas_pass': list(im.size) == spec['requested_size'],
              'square_canvas_pass': im.width == im.height, 'unique_rgb_colors': len(colors),
              'off_palette_pixels': off, 'palette_pass': off == 0,
              'exact_magenta_perimeter_pass': all(c == (255, 0, 255) for c in edges),
              'native_48_64_80_grid_and_one_pixel_outline': 'NOT_CERTIFIED',
              'size_match_against_existing_buildings_in_game': 'NOT_TESTED',
              'reference': spec['reference'],
              'reference_sha256': hashlib.sha256((ROOT / spec['reference']).read_bytes()).hexdigest(),
              'visual_review': '18 requested slots inspected; all six new identities retained through upgrades; tower blank plaques added in a local edit.',
              'remaining': ['Actual canvas differs from requested1536x1536.',
                            'Strict palette, uniform background and flat two-tone native pixel art not met.',
                            'Exact relative size, pivots and equal cell extraction need runtime/native-grid verification.']}
    assert len(entries) == 18
    (ROOT / 'assets/catalog16_buildings_new.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'reports/BUILDINGS_NEW16_SOURCE_AUDIT.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(report, ensure_ascii=False))


if __name__ == '__main__':
    main()
