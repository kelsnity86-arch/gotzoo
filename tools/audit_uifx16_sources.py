"""Read-only PNG audit and requested-slot catalog for BbopZOO UI/effects.

This does not alter images, extract sprites, or certify native pixel grids.
Run from any directory with Python 3 and Pillow installed.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def main():
    spec = json.loads((ROOT / 'docs/briefs/uifx16-spec.json').read_text())
    rgb = lambda value: tuple(bytes.fromhex(value.lstrip('#')))
    palette = {rgb(value) for value in spec['palette']} | {rgb(spec['background'])}
    expected_counts = [20, 15, 14, 40, 30, 12]
    assert len(spec['sheets']) == 6 and len(spec['palette']) == 38
    catalog, checks, seen = [], [], set()
    for sheet, expected_count in zip(spec['sheets'], expected_counts):
        path = Path('assets/spritesheets16/ui-effects') / sheet['group'] / sheet['filename']
        payload = (ROOT / path).read_bytes()
        digest = hashlib.sha256(payload).hexdigest()
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
                entries.append({
                    'slot': len(entries) + 1, 'row': row, 'column': column,
                    'name': name, 'intentionally_empty': name is None,
                    'target_native_size': sheet.get('native_overrides', {}).get(
                        f'{row}:{column}', sheet['native_by_row'][row - 1]),
                })
        assert len(entries) == expected_count
        assert [[e['row'], e['column']] for e in entries if e['intentionally_empty']] == sheet.get('empty_slots', [])
        colors = image.getcolors(image.width * image.height)
        outside = sum(count for count, color in colors if color not in palette)
        perimeter = [image.getpixel((x, y)) for y in (0, image.height - 1) for x in range(image.width)]
        perimeter += [image.getpixel((x, y)) for x in (0, image.width - 1) for y in range(1, image.height - 1)]
        catalog.append({
            'filename': sheet['filename'], 'path': str(path), 'group': sheet['group'],
            'actual_size': list(image.size), 'target_size': sheet['size'],
            'row_columns': sheet['row_columns'], 'sha256': digest,
            'entries_describe_requested_slots': True, 'entries': entries,
        })
        checks.append({
            'filename': sheet['filename'], 'readable_png': True,
            'requested_slots': len(entries),
            'intentionally_empty_slots': sum(e['intentionally_empty'] for e in entries),
            'actual_size': list(image.size), 'requested_size': sheet['size'],
            'requested_canvas_pass': list(image.size) == sheet['size'],
            'unique_rgb_colors': len(colors), 'off_palette_pixels': outside,
            'palette_pass': outside == 0,
            'exact_magenta_perimeter_pass': all(c == rgb(spec['background']) for c in perimeter),
            'native_pixel_grid_status': 'NOT_EXPORTED_OR_CERTIFIED',
            'outline_width_and_color_status': 'NOT_CERTIFIED',
            'animation_playback_status': 'NOT_TESTED' if sheet['filename'] in ('gacha16.png', 'fx16.png') else 'NOT_APPLICABLE',
        })
    assert sum(len(s['entries']) for s in catalog) == 131
    assert sum(e['intentionally_empty'] for s in catalog for e in s['entries']) == 1
    result = {
        'schema': 1, 'asset_kind': 'image_generator_source_sheets', 'engine_ready': False,
        'sheet_count': 6, 'requested_slot_count': 131, 'requested_filled_slot_count': 130,
        'intentionally_empty_slot_count': 1, 'sheets': catalog,
    }
    report = {
        'source_delivery': 'PASS_6_READABLE_DISTINCT_PNGS',
        'strict_pixel_and_runtime_gate': 'HOLD', 'checks': checks,
        'canvas_matches': sum(c['requested_canvas_pass'] for c in checks),
        'canvas_mismatches': sum(not c['requested_canvas_pass'] for c in checks),
        'manual_review': 'See UIFX16_SOURCE_REVIEW.md; automated counts describe the specification, not object recognition.',
        'corrections': ['Removed unwanted square backdrop from large legendary burst using image-generation editing.'],
        'remaining': [
            'Exact native grids, 38-color palette, uniform #FF00FF background and one-pixel dark outlines.',
            'Export requested canvas dimensions for icons16.png and fx16.png.',
            'Export frame rectangles and verify gacha shaking, capsule opening, coin, sparkle and firework playback.',
            'Verify 20x20 card window and 2px card border after native reconstruction; rainbow overlay needs runtime masking.',
        ],
    }
    (ROOT / 'assets/catalog16_ui.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'reports/UIFX16_SOURCE_AUDIT.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({
        'source_sheets': 6, 'requested_slots': 131, 'filled_slots': 130,
        'canvas_matches': report['canvas_matches'], 'canvas_mismatches': report['canvas_mismatches'],
        'strict_pixel_and_runtime_gate': 'HOLD',
    }))


if __name__ == '__main__':
    main()
