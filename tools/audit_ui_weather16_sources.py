"""Read-only pixel audit and requested-slot catalog; never modifies PNGs."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def main():
    spec = json.loads((ROOT / 'docs/briefs/ui-weather16-spec.json').read_text())
    palette = {tuple(bytes.fromhex(c[1:])) for c in spec['palette']} | {(255, 0, 255)}
    checks, sheets, digests = [], [], set()
    for s in spec['sheets']:
        path = Path('assets/spritesheets16/ui-weather') / s['group'] / s['filename']
        digest = hashlib.sha256((ROOT / path).read_bytes()).hexdigest()
        assert digest not in digests
        digests.add(digest)
        with Image.open(ROOT / path) as source:
            assert source.format == 'PNG'
            source.load()
            im = source.convert('RGB')
        colors = im.getcolors(im.width * im.height)
        outside = sum(n for n, c in colors if c not in palette)
        edge = [im.getpixel((x, y)) for y in (0, im.height - 1) for x in range(im.width)]
        edge += [im.getpixel((x, y)) for x in (0, im.width - 1) for y in range(1, im.height - 1)]
        entries = []
        assert len(s['rows']) == s['grid'][1]
        for row, items in enumerate(s['rows'], 1):
            assert len(items) == s['grid'][0]
            for col, item in enumerate(items, 1):
                entries.append({'slot': len(entries) + 1, 'row': row, 'column': col,
                                'label': item['label'], 'target_native_size': item.get('native', s['native']),
                                'requested_no_outline': item.get('no_outline', False)})
        sheets.append({'filename': s['filename'], 'path': str(path), 'sha256': digest,
                       'actual_size': list(im.size), 'requested_size': s['size'],
                       'requested_grid': s['grid'], 'entries_describe_requested_slots': True,
                       'extraction_coordinates': None, 'entries': entries})
        checks.append({'filename': s['filename'], 'readable_png': True,
                       'actual_size': list(im.size), 'requested_size': s['size'],
                       'canvas_pass': list(im.size) == s['size'], 'unique_rgb_colors': len(colors),
                       'off_palette_pixels': outside, 'off_palette_fraction': round(outside / (im.width * im.height), 6),
                       'palette_pass': outside == 0,
                       'exact_magenta_perimeter_pass': all(c == (255, 0, 255) for c in edge),
                       'native_grid_outline_and_flat_fills': 'NOT_CERTIFIED',
                       'animation_registration_and_runtime': 'NOT_TESTED'})
    refs = ['assets/spritesheets16/ui-effects/icons/icons16.png',
            'assets/spritesheets16/expansion/icons/icons16_2.png',
            'assets/spritesheets16/world-life/effects/fx_life16.png']
    catalog = {'asset_kind': 'image_generator_source_sheets', 'engine_ready': False,
               'sheet_count': 3, 'requested_slot_count': 96,
               'count_note': '40 primary UI icons + 32 secondary UI icons + 24 weather/night sprites.',
               'references': [{'path': p, 'sha256': hashlib.sha256((ROOT / p).read_bytes()).hexdigest()} for p in refs],
               'sheets': sheets}
    report = {'source_delivery': 'PASS_3_READABLE_DISTINCT_PNGS',
              'strict_pixel_and_runtime_gate': 'HOLD',
              'canvas_matches': sum(c['canvas_pass'] for c in checks),
              'canvas_mismatches': sum(not c['canvas_pass'] for c in checks), 'checks': checks,
              'visual_layout_review': '40 / 32 / 24 occupied slots, row-major ordering inspected visually.',
              'corrections': ['Weather streak changed to one streak; splash phase 2 made wider and lower; sun glare changed to four-point sparkle; firefly rings simplified.'],
              'remaining': ['Exact native grids, 38-color palette, uniform magenta and 1px brown outlines not certified.',
                            'UI sheet canvases differ from requested dimensions.',
                            'Solid two-tone fills contain intermediate colors.',
                            'Weather particle sizes and splash anchors need native-grid redraw and playback verification.',
                            'Petal A/B/C silhouettes are not verified as one rotated source.',
                            'No runtime import or interactive icon readability test performed.']}
    assert sum(len(s['entries']) for s in sheets) == 96
    (ROOT / 'assets/catalog16_ui_weather.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'reports/UI_WEATHER16_SOURCE_AUDIT.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'sheets': 3, 'slots': 96, 'checks': checks, 'strict_gate': 'HOLD'}))


if __name__ == '__main__':
    main()
