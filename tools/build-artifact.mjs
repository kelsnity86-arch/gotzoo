// 한 파일 배포본 만들기: npm run build:artifact → dist-artifact/bbopzoo.html
// 이미지·폰트는 data URI, JS·CSS는 HTML 안에 넣는다. claude.ai 아티팩트처럼 파일 하나만 올리는 곳에 쓴다.
// 아티팩트 규칙: <!doctype>·<html>·<head>·<body> 태그 없이 <title>, <style>, 본문, <script>만 둔다.
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

execSync('npx vite build', { stdio: 'inherit', env: { ...process.env, ARTIFACT: '1' } });
const out = 'dist-artifact';
const assets = readdirSync(join(out, 'assets'));
const js = assets.filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(out, 'assets', f), 'utf8'));
const css = assets.filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(out, 'assets', f), 'utf8'));
const others = assets.filter((f) => !f.endsWith('.js') && !f.endsWith('.css'));
if (others.length) throw new Error('data URI로 들어가지 않은 파일이 있습니다: ' + others.join(', '));
if (js.length !== 1) throw new Error('JS 파일이 하나가 아닙니다: ' + js.length);

// </script> 문자열이 코드 안에 있으면 HTML이 끊기므로 이스케이프
const script = js[0].replace(/<\/script/gi, '<\\/script');
const html = `<meta charset="utf-8" />
<title>뽑ZOO</title>
<meta name="robots" content="noindex" />
<meta name="theme-color" content="#1f2a1c" />
<style>${css.join('\n')}</style>
<div id="app">
  <canvas id="world"></canvas>
  <div id="ui"></div>
</div>
<script type="module">${script}</script>
`;
writeFileSync(join(out, 'bbopzoo.html'), html);
console.log(`dist-artifact/bbopzoo.html  ${(Buffer.byteLength(html) / 1e6).toFixed(2)} MB`);
