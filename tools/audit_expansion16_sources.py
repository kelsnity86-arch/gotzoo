"""Audit four generated BbopZOO expansion PNGs without modifying pixels.

The catalog records requested slots, not automatically detected sprite bounds.
Requires Python 3 and Pillow. Outputs source audit and requested-slot catalog.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def main():
    spec = json.loads((ROOT / 'docs/briefs/expansion16-spec.json').read_text())
    rgb = lambda color: tuple(bytes.fromhex(color.lstrip('#')))
    palette = {rgb(c) for c in spec['palette']} | {rgb(spec['background'])}
    assert len(spec['sheets']) == 4 and len(spec['palette']) == 38
    sheets, checks, seen = [], [], set()
    for sheet, expected_count in zip(spec['sheets'], [24, 17, 32, 17]):
        path = Path('assets/spritesheets16/expansion') / sheet['group'] / sheet['filename']
        digest = hashlib.sha256((ROOT / path).read_bytes()).hexdigest()
        assert digest not in seen, 'Duplicate whole sheet'
        seen.add(digest)
        with Image.open(ROOT / path) as original:
            assert original.format == 'PNG'
            original.load()
            image = original.convert('RGB')
        entries = []
        for row, names in enumerate(sheet['rows'], 1):
            assert len(names) == sheet['row_columns'][row - 1]
            for column, name in enumerate(names, 1):
                floor = sheet['filename'] == 'fencesdiag16.png' and row == 3
                entries.append({
                    'slot': len(entries) + 1, 'row': row, 'column': column, 'name': name,
                    'target_native_size': sheet.get('native_overrides', {}).get(
                        f'{row}:{column}', sheet['native_by_row'][row - 1]),
                    'outline_required': not floor,
                    'seamless_floor_required': floor,
                })
        assert len(entries) == expected_count
        colors = image.getcolors(image.width * image.height)
        outside = sum(count for count, color in colors if color not in palette)
        perimeter = [image.getpixel((x, y)) for y in (0, image.height - 1) for x in range(image.width)]
        perimeter += [image.getpixel((x, y)) for x in (0, image.width - 1) for y in range(1, image.height - 1)]
        sheets.append({
            'filename': sheet['filename'], 'path': str(path), 'group': sheet['group'],
            'actual_size': list(image.size), 'target_size': sheet['size'],
            'row_columns': sheet['row_columns'], 'sha256': digest,
            'entries_describe_requested_slots': True, 'entries': entries,
        })
        checks.append({
            'filename': sheet['filename'], 'readable_png': True,
            'requested_slots': len(entries),
            'actual_size': list(image.size), 'requested_size': sheet['size'],
            'requested_canvas_pass': list(image.size) == sheet['size'],
            'unique_rgb_colors': len(colors), 'off_palette_pixels': outside,
            'palette_pass': outside == 0,
            'exact_magenta_perimeter_pass': all(c == rgb(spec['background']) for c in perimeter),
            'native_grid_and_outline_status': 'NOT_EXPORTED_OR_CERTIFIED',
            'animation_playback_status': 'NOT_TESTED' if sheet['filename'] in ('pengacha16.png', 'incidents16.png') else 'NOT_APPLICABLE',
            'seamless_and_connection_status': 'NOT_TESTED' if sheet['filename'] == 'fencesdiag16.png' else 'NOT_APPLICABLE',
        })
    assert sum(len(s['entries']) for s in sheets) == 90
    catalog = {
        'schema': 1, 'asset_kind': 'image_generator_source_sheets', 'engine_ready': False,
        'sheet_count': 4, 'requested_slot_count': 90, 'sheets': sheets,
    }
    audit = {
        'source_delivery': 'PASS_4_READABLE_DISTINCT_PNGS',
        'strict_pixel_and_runtime_gate': 'HOLD', 'checks': checks,
        'canvas_matches': sum(c['requested_canvas_pass'] for c in checks),
        'canvas_mismatches': sum(not c['requested_canvas_pass'] for c in checks),
        'manual_review': 'See EXPANSION16_SOURCE_REVIEW.md; catalog counts are requested slots, not automatic object recognition.',
        'corrections': ['Turned caught pickpocket toward left; removed bubble backdrops around healing, whistle and shield effects with image editing.'],
        'remaining': [
            'Exact native pixel grids, specified palette, flat magenta background and outline width/color.',
            'Requested canvas dimensions for icons16_2.png and fencesdiag16.png.',
            'Native fence endpoints, diagonal front/back orientation and straight-fence joins; floor tiling.',
            'Walk/run leg alternation, identity, common frame pivots and animation playback.',
        ],
    }
    (ROOT / 'assets/catalog16_expansion.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'reports/EXPANSION16_SOURCE_AUDIT.json').write_text(json.dumps(audit, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({
        'source_sheets': 4, 'requested_slots': 90,
        'canvas_matches': audit['canvas_matches'], 'canvas_mismatches': audit['canvas_mismatches'],
        'strict_pixel_and_runtime_gate': 'HOLD',
    }))


if __name__ == '__main__':
    main()
