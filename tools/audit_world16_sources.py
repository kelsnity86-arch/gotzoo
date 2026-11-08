"""Audit generated world sheets without changing their image pixels.

The catalog expands the requested item/frame order. It does not claim that
native-size sprite extraction, walk playback or modular connections passed.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def entries_for(sheet, spec):
    result = []
    group = sheet['group']
    if group in ('people', 'staff'):
        for index, name in enumerate(spec[sheet['entries']], 1):
            for frame in ('A', 'B'):
                result.append({'name': name, 'identity_index': index,
                               'frame': frame,
                               'requested_forward_foot': 'left' if frame == 'A' else 'right',
                               'season': sheet.get('season')})
    elif group == 'fences':
        for tier, material in enumerate(spec['fence_materials'], 1):
            for name in spec['fence_columns']:
                result.append({'name': name, 'material_tier': tier, 'material': material})
    elif group == 'decor':
        for key in sheet['entries']:
            result.extend({'name': name, 'season': key.removeprefix('decor_')} for name in spec[key])
    elif group == 'facilities':
        for row, key in enumerate(sheet['entries'], 1):
            for column, name in enumerate(spec[key], 1):
                result.append({'name': name, 'row': row, 'column': column,
                               'target_native_size': sheet['native_by_row'][row - 1]})
    else:
        result.extend({'name': name, 'season': sheet.get('season')} for name in spec[sheet['entries']])
    for slot, entry in enumerate(result, 1):
        entry['slot'] = slot
        if 'grid' in sheet:
            columns = sheet['grid'][0]
            entry.update(row=(slot - 1) // columns + 1, column=(slot - 1) % columns + 1,
                         target_native_size=sheet['native'])
    return result


def main():
    spec = json.loads((ROOT / 'docs/briefs/world16-spec.json').read_text())
    rgb = lambda value: tuple(bytes.fromhex(value.lstrip('#')))
    palette = {rgb(value) for value in spec['palette']} | {rgb(spec['background'])}
    expected_counts = [32, 32, 32, 32, 20, 16, 16, 16, 16, 48, 24, 24, 10]
    assert len(spec['sheets']) == 13 and len(spec['palette']) == 38
    catalog = []
    checks = []
    seen = set()
    for sheet, expected_count in zip(spec['sheets'], expected_counts):
        path = Path('assets/spritesheets16/world') / sheet['group'] / sheet['filename']
        payload = (ROOT / path).read_bytes()
        digest = hashlib.sha256(payload).hexdigest()
        assert digest not in seen, 'Duplicate whole sheet'
        seen.add(digest)
        with Image.open(ROOT / path) as original:
            original.load()
            image = original.convert('RGB')
        entries = entries_for(sheet, spec)
        assert len(entries) == expected_count
        colors = image.getcolors(image.width * image.height)
        outside = sum(count for count, color in colors if color not in palette)
        perimeter = [image.getpixel((x, y)) for y in (0, image.height - 1) for x in range(image.width)]
        perimeter += [image.getpixel((x, y)) for x in (0, image.width - 1) for y in range(1, image.height - 1)]
        reference = None
        if sheet['group'] == 'people' and sheet['season'] != 'spring':
            reference = 'people16_spring.png'
        elif sheet['group'] == 'tiles' and sheet['season'] != 'spring':
            reference = 'tiles16_spring.png'
        catalog.append({'filename': sheet['filename'], 'path': str(path), 'group': sheet['group'],
                        'season': sheet.get('season'), 'actual_size': list(image.size),
                        'target_size': sheet['size'], 'sha256': digest,
                        'reference_sheet_used': reference,
                        'entries_describe_requested_slots': True, 'entries': entries})
        checks.append({'filename': sheet['filename'], 'readable_png': True,
                       'requested_slots': len(entries), 'visual_grid_count_reviewed': True,
                       'actual_size': list(image.size), 'requested_size': sheet['size'],
                       'requested_canvas_pass': list(image.size) == sheet['size'],
                       'unique_rgb_colors': len(colors), 'off_palette_pixels': outside,
                       'palette_pass': outside == 0,
                       'exact_magenta_perimeter_pass': all(c == rgb(spec['background']) for c in perimeter),
                       'native_pixel_grid_status': 'NOT_EXPORTED_OR_CERTIFIED',
                       'walk_cycle_status': 'HOLD_REVIEW_ALTERNATING_FEET' if sheet['group'] in ('people', 'staff') else 'NOT_APPLICABLE',
                       'seamless_or_connection_status': 'HOLD_NOT_CERTIFIED' if sheet['group'] in ('tiles', 'fences') else 'NOT_APPLICABLE'})
    assert sum(len(sheet['entries']) for sheet in catalog) == 318
    result = {'schema': 1, 'asset_kind': 'image_generator_source_sheets',
              'engine_ready': False, 'sheet_count': 13, 'requested_slot_count': 318,
              'sheets': catalog}
    report = {'source_delivery': 'PASS_13_READABLE_DISTINCT_PNGS',
              'strict_pixel_and_runtime_gate': 'HOLD', 'checks': checks,
              'canvas_matches': sum(c['requested_canvas_pass'] for c in checks),
              'canvas_mismatches': sum(not c['requested_canvas_pass'] for c in checks),
              'corrections': ['Spring walking-pose readability edit used as seasonal reference.',
                              'Autumn grandma B skirt changed to match A.',
                              'Winter tile spring blossoms replaced by ice accents and red berries.'],
              'remaining': ['Exact native grid and specified 38-color palette plus magenta.',
                            'Verify A/B opposing feet and loop playback; some paired silhouettes remain similar.',
                            'Verify floor edge tiling and fence joint coordinates / concave corner geometry.',
                            'Export requested dimensions for four tile sheets and the fence sheet.']}
    (ROOT / 'assets/catalog16_world.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'reports/WORLD16_SOURCE_AUDIT.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'source_sheets': len(catalog), 'requested_slots': 318,
                      'canvas_matches': report['canvas_matches'], 'canvas_mismatches': report['canvas_mismatches'],
                      'strict_pixel_and_runtime_gate': 'HOLD'}))


if __name__ == '__main__':
    main()
