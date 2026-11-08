"""Read-only image audit; preserves image-generator output bytes unchanged.

The requested 16x16 grid is a target, not an assertion that these generated
source images are engine-ready native sprites. This audit reports mismatches.
"""
from pathlib import Path
from collections import Counter
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def audit():
    spec = json.loads((ROOT / 'docs/briefs/animals16-spec.json').read_text())
    rgb = lambda value: tuple(bytes.fromhex(value.lstrip('#')))
    palette = {rgb(value) for value in spec['palette']} | {rgb(spec['background'])}
    catalog = []
    checks = []
    species_total = 0
    hashes = set()
    rarity_counts = Counter()
    season_counts = Counter()
    assert len(spec['sheets']) == 12
    assert len(spec['palette']) == 38
    for index, sheet in enumerate(spec['sheets'], 1):
        assert sheet['filename'] == f'animals16_{index:02d}.png'
        assert len(sheet['animals']) == 25
        path = Path('assets/spritesheets16/animals') / sheet['group'] / sheet['filename']
        payload = (ROOT / path).read_bytes()
        digest = hashlib.sha256(payload).hexdigest()
        assert digest not in hashes, 'Duplicate generated sheet'
        hashes.add(digest)
        with Image.open(ROOT / path) as opened:
            opened.load()
            im = opened.convert('RGB')
        colors = dict((color, count) for count, color in im.getcolors(im.width * im.height))
        outside = sum(count for color, count in colors.items() if color not in palette)
        # All outermost pixels should be pure magenta if that target is met.
        perimeter = [im.getpixel((x, y)) for y in (0, im.height - 1) for x in range(im.width)]
        perimeter += [im.getpixel((x, y)) for x in (0, im.width - 1) for y in range(1, im.height - 1)]
        checks.append({
            'filename': sheet['filename'], 'decoded_png': True,
            'actual_size': list(im.size), 'requested_size': spec['canvas'],
            'requested_canvas_pass': list(im.size) == spec['canvas'],
            'unique_rgb_colors': len(colors),
            'pixels_outside_requested_palette': outside,
            'requested_palette_pass': outside == 0,
            'outer_border_exact_magenta_pass': all(c == rgb(spec['background']) for c in perimeter),
            'native_16x16_grid_status': 'NOT_VERIFIED_OR_EXPORTED',
            'visual_review': {
                'five_rows_of_five_animals': True,
                'reviewed_against_requested_order': True,
                'visible_text_or_grid_lines': False,
                'note': 'Visual review does not certify exact bitmap grid, color palette, or every pose direction.'
            },
        })
        animals = []
        for slot, entry in enumerate(sheet['animals'], 1):
            fields = entry.split('|')
            name, rarity = fields[:2]
            season = fields[2] if len(fields) == 3 else None
            species_total += 1
            rarity_counts[rarity] += 1
            if season:
                season_counts[season] += 1
            animals.append({'global_index': species_total, 'slot': slot,
                            'row': (slot - 1) // 5 + 1, 'column': (slot - 1) % 5 + 1,
                            'name': name, 'rarity': rarity, 'season': season})
        catalog.append({'filename': sheet['filename'], 'path': str(path),
                        'group': sheet['group'], 'actual_size': list(im.size),
                        'sha256': digest, 'animals': animals})
    assert species_total == 300
    assert sum(season_counts.values()) == 50
    source_catalog = {'schema': 1, 'asset_kind': 'unchanged_generated_source_sheets',
                      'target_sprite_size': [16, 16], 'engine_ready': False,
                      'sheets': catalog}
    report = {'delivery_check': 'PASS_12_DISTINCT_READABLE_PNGS_AND_300_ORDERED_ENTRIES',
              'strict_pixel_specification': 'HOLD',
              'sheets': len(catalog), 'animals': species_total,
              'permanent': 250, 'seasonal': 50,
              'rarity_counts': dict(rarity_counts), 'season_counts': dict(season_counts),
              'checks': checks,
              'remaining': ['1024x1024 sheet export', 'exact native 16x16 redraw/normalization',
                            '38-color palette and exact #FF00FF background',
                            'pixel-level outline, pose direction and silhouette review']}
    (ROOT / 'assets/catalog16.json').write_text(json.dumps(source_catalog, ensure_ascii=False, indent=2) + '\n')
    (ROOT / 'reports/ANIMALS16_SOURCE_AUDIT.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'files': len(catalog), 'animals': species_total,
                      'source_delivery': 'PASS', 'strict_pixel_specification': 'HOLD'}, ensure_ascii=False))


if __name__ == '__main__':
    audit()
