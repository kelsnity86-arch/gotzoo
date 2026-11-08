"""Read-only PNG audit for the 11-sheet BbopZOO WORLD art request.

Requires Pillow. Writes a requested-slot catalog and audit JSON; never edits PNGs.
Slot names/counts come from the brief, not automated object detection.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def native_size(sheet, row, column):
    if sheet.get('native_by_row'):
        return sheet['native_by_row'][row - 1]
    if sheet.get('native_by_column'):
        return sheet['native_by_column'][column - 1]
    return sheet['native_by_slot'][row - 1][column - 1]


def main():
    spec = json.loads((ROOT / 'docs/briefs/world-life16-spec.json').read_text())
    rgb = lambda value: tuple(bytes.fromhex(value.lstrip('#')))
    palette = {rgb(c) for c in spec['palette']} | {rgb(spec['background'])}
    assert len(spec['sheets']) == 11 and len(spec['palette']) == 38
    catalog, checks, seen = [], [], set()
    for sheet, expected_count in zip(spec['sheets'], [16, 4, 24, 4, 4, 36, 18, 18, 32, 20, 24]):
        path = Path('assets/spritesheets16/world-life') / sheet['group'] / sheet['filename']
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
                slot = len(entries) + 1
                entry = {'slot': slot, 'row': row, 'column': column, 'name': name,
                         'target_native_size': native_size(sheet, row, column)}
                if sheet['group'] == 'visitor-actions':
                    entry.update(requested_facing='front', identity_row=row, action_column=column)
                elif sheet['group'] == 'staff-actions':
                    entry.update(requested_facing='left', identity_index=(slot - 1) // 2 + 1,
                                 frame=(slot - 1) % 2 + 1)
                elif sheet['group'] == 'buildings':
                    entry.update(upgrade_level=row, building_type_column=column)
                elif sheet['group'] == 'effects' and slot in (17, 18):
                    entry['outline_required'] = False
                entries.append(entry)
        assert len(entries) == expected_count == sheet['requested_slot_count']
        colors = image.getcolors(image.width * image.height)
        outside = sum(count for count, color in colors if color not in palette)
        perimeter = [image.getpixel((x, y)) for y in (0, image.height - 1) for x in range(image.width)]
        perimeter += [image.getpixel((x, y)) for x in (0, image.width - 1) for y in range(1, image.height - 1)]
        catalog.append({
            'filename': sheet['filename'], 'path': str(path), 'group': sheet['group'],
            'sha256': digest, 'actual_size': list(image.size), 'target_size': sheet['size'],
            'row_columns': sheet['row_columns'], 'reference_sheet_used': sheet.get('reference_sheet_used'),
            'entries_describe_requested_slots': True, 'entries': entries,
        })
        checks.append({
            'filename': sheet['filename'], 'readable_png': True, 'requested_slots': len(entries),
            'actual_size': list(image.size), 'requested_size': sheet['size'],
            'requested_canvas_pass': list(image.size) == sheet['size'],
            'unique_rgb_colors': len(colors), 'off_palette_pixels': outside, 'palette_pass': outside == 0,
            'exact_magenta_perimeter_pass': all(c == rgb(spec['background']) for c in perimeter),
            'native_grid_outline_and_light_status': 'NOT_CERTIFIED',
            'tiling_and_patch_extraction_status': 'NOT_TESTED' if sheet['group'] in ('ground', 'paths', 'floors', 'fences') else 'NOT_APPLICABLE',
            'identity_pivots_and_animation_status': 'NOT_TESTED' if sheet['group'] in ('visitor-actions', 'staff-actions', 'effects') else 'NOT_APPLICABLE',
        })
    assert sum(len(s['entries']) for s in catalog) == 200
    result = {
        'schema': 1, 'asset_kind': 'image_generator_source_sheets', 'engine_ready': False,
        'sheet_count': 11, 'requested_slot_count': 200,
        'slot_count_note': 'Counts patches, props and action frames; not unique characters or extracted 16x16 tiles.',
        'object_outline_target': spec['object_outline'], 'light_target': spec['light'], 'sheets': catalog,
    }
    report = {
        'source_delivery': 'PASS_11_READABLE_DISTINCT_PNGS', 'strict_pixel_and_runtime_gate': 'HOLD',
        'canvas_matches': sum(c['requested_canvas_pass'] for c in checks),
        'canvas_mismatches': sum(not c['requested_canvas_pass'] for c in checks), 'checks': checks,
        'manual_review': 'See WORLD_LIFE16_SOURCE_REVIEW.md. Counts are requested slots, not automated recognition.',
        'references': ['fences16_b created from fences16_a material-edit reference.',
                       'staff_act16 created from the existing world/staff/staff16.png reference.'],
        'corrections': ['Restored seated woman ponytail and adjusted seated visitor identity.',
                        'Replaced recognizable sleep letters with short abstract stair-step marks.'],
        'remaining': ['Exact native grids, brown outline thickness, palette and uniform magenta.',
                      'Requested output canvas sizes where mismatched.',
                      'Same-row ground/floor tiling; 16px path/fence extraction and corner joins.',
                      'Action identity, common pivots, timing and playback in game.',
                      'Consistent object-to-character art-pixel scale, light and shadow in a composed scene.'],
    }
    (ROOT / 'assets/catalog16_world_life.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'reports/WORLD_LIFE16_SOURCE_AUDIT.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'source_sheets': 11, 'requested_slots': 200,
                      'canvas_matches': report['canvas_matches'], 'canvas_mismatches': report['canvas_mismatches'],
                      'strict_pixel_and_runtime_gate': 'HOLD'}))


if __name__ == '__main__':
    main()
