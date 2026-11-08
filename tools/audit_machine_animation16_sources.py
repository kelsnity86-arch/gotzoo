"""Read-only PNG audit. Parts are concepts, not registered runtime layers."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def main():
    spec = json.loads((ROOT / 'docs/briefs/machine-animation16-spec.json').read_text())
    palette = json.loads((ROOT / 'docs/briefs/world-life16-spec.json').read_text())['palette']
    allowed = {tuple(bytes.fromhex(c[1:])) for c in palette} | {(255, 0, 255)}
    sheets, checks = [], []
    for s in spec['sheets']:
        path = 'assets/spritesheets16/machine-animation/' + s['group'] + '/' + s['filename']
        digest = hashlib.sha256((ROOT / path).read_bytes()).hexdigest()
        with Image.open(ROOT / path) as original:
            original.load()
            assert original.format == 'PNG'
            im = original.convert('RGB')
        colors = im.getcolors(im.width * im.height)
        off = sum(n for n, color in colors if color not in allowed)
        edge = [im.getpixel((x, y)) for y in (0, im.height - 1) for x in range(im.width)]
        edge += [im.getpixel((x, y)) for x in (0, im.width - 1) for y in range(1, im.height - 1)]
        entries = []
        for row, items in enumerate(s['rows'], 1):
            assert len(items) == s['row_columns'][row - 1]
            for col, item in enumerate(items, 1):
                entries.append({'slot': len(entries) + 1, 'row': row, 'column': col, **item})
        status = 'CONCEPT_ONLY_REGISTRATION_FAILED' if s['group'] == 'parts' else 'SOURCE_ONLY_PIXEL_GATE_HOLD'
        sheets.append({'filename': s['filename'], 'path': path, 'sha256': digest,
                       'actual_size': list(im.size), 'requested_size': s['size'],
                       'row_columns': s['row_columns'], 'delivery_status': status,
                       'entries_describe_requested_slots': True, 'extraction_coordinates': None,
                       'entries': entries})
        checks.append({'filename': s['filename'], 'readable_png': True,
                       'actual_size': list(im.size), 'requested_size': s['size'],
                       'canvas_pass': list(im.size) == s['size'],
                       'unique_rgb_colors': len(colors), 'off_palette_pixels': off,
                       'palette_pass': off == 0,
                       'exact_magenta_perimeter_pass': all(c == (255, 0, 255) for c in edge),
                       'native_grid_outline_and_flat_fill': 'NOT_CERTIFIED',
                       'delivery_status': status})
    assert sum(len(s['entries']) for s in sheets) == 68
    catalog = {'asset_kind': 'image_generator_source_sheets', 'engine_ready': False,
               'sheet_count': 2, 'requested_slot_count': 68,
               'count_note': '48 logical part cells + 12 large tier/action/aura cells + 8 tiny capsule/sparkle cells.',
               'reference': spec['reference'],
               'reference_sha256': hashlib.sha256((ROOT / spec['reference']).read_bytes()).hexdigest(),
               'sheets': sheets}
    report = {'strict_pixel_and_runtime_gate': 'HOLD', 'engine_ready': False,
              'checks': checks,
              'parts_registration': {'result': 'FAIL_VISUAL',
                                     'issue': 'Dome and body do not meet at a shared local edge; crank hubs shift between directional cells. Same-origin compositing would not assemble the requested machine.',
                                     'basis': 'Visual inspection of original and correction; no calibrated native-grid extraction or gameplay playback.',
                                     'correction': 'Correction moved dome down into body region without fixing hubs; rejected. Initial file retained only as a concept.',
                                     'flap_hinge': 'NOT_CERTIFIED'},
              'tiers_review': {'layout': '3 rows x 4 large cells plus 8 small items on bottom row, visually inspected.',
                               'animation_pivots_and_native_size': 'NOT_CERTIFIED',
                               'playback': 'NOT_TESTED'},
              'remaining': ['Both canvases differ from requested output sizes.',
                            'Strict palette, native grid, flat fills and uniform magenta not met.',
                            'Parts atlas needs pixel-accurate reauthoring before use; source is not a usable animation rig.',
                            'Tier animation needs frame registration and in-game playback review.']}
    (ROOT / 'assets/catalog16_machine_animation.json').write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'reports/MACHINE_ANIMATION16_SOURCE_AUDIT.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'sheets': 2, 'slots': 68, 'checks': checks, 'parts_registration': 'FAIL_VISUAL'}, ensure_ascii=False))


if __name__ == '__main__':
    main()
