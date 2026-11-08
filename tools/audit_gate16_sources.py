"""Read-only PNG audit and requested-slot catalog for three entrance sheets."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def main():
    spec = json.loads((ROOT / 'docs/briefs/gate16-spec.json').read_text())
    rgb = lambda value: tuple(bytes.fromhex(value.lstrip('#')))
    palette = {rgb(c) for c in spec['palette']} | {rgb(spec['background'])}
    assert len(spec['sheets']) == 3 and len(spec['palette']) == 38
    catalog, checks, seen = [], [], set()
    for sheet, count in zip(spec['sheets'], [4, 20, 8]):
        path = Path('assets/spritesheets16/entrance') / sheet['group'] / sheet['filename']
        digest = hashlib.sha256((ROOT / path).read_bytes()).hexdigest()
        assert digest not in seen
        seen.add(digest)
        with Image.open(ROOT / path) as original:
            assert original.format == 'PNG'
            original.load()
            image = original.convert('RGB')
        entries = []
        for row, names in enumerate(sheet['rows'], 1):
            assert len(names) == sheet['row_columns'][row - 1]
            for column, name in enumerate(names, 1):
                size = sheet['native_by_row'][row - 1] if sheet.get('native_by_row') else sheet['native_by_column'][column - 1]
                pair = sheet['group'] == 'seasonal' and row == 2
                entries.append({'slot': len(entries) + 1, 'row': row, 'column': column, 'name': name,
                                'target_native_size_per_piece': size, 'paired_base_decoration': pair,
                                'piece_count': 2 if pair else 1})
        assert len(entries) == count
        colors = image.getcolors(image.width * image.height)
        outside = sum(n for n, c in colors if c not in palette)
        edge = [image.getpixel((x, y)) for y in (0, image.height - 1) for x in range(image.width)]
        edge += [image.getpixel((x, y)) for x in (0, image.width - 1) for y in range(1, image.height - 1)]
        catalog.append({'filename': sheet['filename'], 'path': str(path), 'group': sheet['group'],
                        'actual_size': list(image.size), 'target_size': sheet['size'], 'sha256': digest,
                        'reference_sheet_used': sheet.get('reference_sheet_used'),
                        'entries_describe_requested_slots': True, 'entries': entries})
        checks.append({'filename': sheet['filename'], 'readable_png': True, 'requested_slots': count,
                       'actual_size': list(image.size), 'requested_size': sheet['size'],
                       'requested_canvas_pass': list(image.size) == sheet['size'],
                       'unique_rgb_colors': len(colors), 'off_palette_pixels': outside, 'palette_pass': outside == 0,
                       'exact_magenta_perimeter_pass': all(c == rgb(spec['background']) for c in edge),
                       'native_grid_and_outline_status': 'NOT_CERTIFIED',
                       'gate_alignment_wall_tiling_overlay_status': 'NOT_TESTED'})
    result = {'schema': 1, 'asset_kind': 'image_generator_source_sheets', 'engine_ready': False,
              'sheet_count': 3, 'requested_slot_count': 32,
              'count_note': 'Four seasonal base slots contain pairs; counts are requested cells, not detected components.',
              'sheets': catalog}
    report = {'source_delivery': 'PASS_3_READABLE_DISTINCT_PNGS', 'strict_pixel_and_runtime_gate': 'HOLD',
              'checks': checks, 'canvas_matches': sum(c['requested_canvas_pass'] for c in checks),
              'canvas_mismatches': sum(not c['requested_canvas_pass'] for c in checks),
              'corrections': ['Removed oversized terminal posts and pots from wall segments using image editing.'],
              'remaining': ['Exact native grid, requested dimensions, 38-color palette, flat magenta and brown outlines.',
                            'Equal gate opening widths, proportions, replacement pivots and open-door geometry.',
                            '32px wall repeat joins and seamless edge patterns.',
                            'Seasonal overlay placement on all four gates; 96px garland and paired pillar anchors.']}
    assert sum(len(s['entries']) for s in catalog) == 32
    (ROOT / 'assets/catalog16_gate.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'reports/GATE16_SOURCE_AUDIT.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'sheets': 3, 'requested_slots': 32, 'canvas_matches': report['canvas_matches'],
                      'canvas_mismatches': report['canvas_mismatches'], 'strict_pixel_and_runtime_gate': 'HOLD'}))


if __name__ == '__main__':
    main()
