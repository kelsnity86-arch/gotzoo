import { SONGS } from '../src/audio/songs';
import { compile } from '../src/audio/music';
for (const s of SONGS) { const c = compile(s); console.log(s.id.padEnd(16), s.title.padEnd(12), `${(c.beats * c.spb).toFixed(1)}초`, `음 ${c.events.length}개`); }
