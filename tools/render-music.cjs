// 배경음을 음원 파일로: 게임(debug)에서 OfflineAudioContext로 연주 → WAV → ffmpeg로 OGG
// node tools/render-music.cjs <출력 폴더> [곡 id ...]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const out = process.argv[2] || 'dist-music';
const ids = process.argv.slice(3).length ? process.argv.slice(3) : ['title', 'spring_day', 'spring_night', 'summer_day', 'summer_night', 'autumn_day', 'autumn_night', 'winter_day', 'winter_night', 'gacha', 'jingle_common', 'jingle_rare', 'jingle_legend', 'jingle_mythic'];
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../docs/bbopzoo.html') + '?debug'); await p.waitForTimeout(1500);
  for (const id of ids) {
    const b64 = await p.evaluate((id) => window.__zoo.renderSong(id, 3), id);
    const wavPath = path.join(out, id + '.wav');
    fs.writeFileSync(wavPath, Buffer.from(b64, 'base64'));
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wavPath, '-c:a', 'libvorbis', '-q:a', '5', path.join(out, id + '.ogg')]);
    console.log(id, fs.statSync(path.join(out, id + '.ogg')).size);
  }
  await b.close();
})();
