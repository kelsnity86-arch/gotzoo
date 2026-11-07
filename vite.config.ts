import { defineConfig } from 'vite';

// ARTIFACT=1 이면 이미지·폰트를 전부 data URI로 넣어 한 파일 배포용으로 빌드한다 (tools/build-artifact.mjs).
const single = process.env.ARTIFACT === '1';

export default defineConfig({
  base: './',
  build: {
    assetsInlineLimit: single ? Number.MAX_SAFE_INTEGER : 0,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 20000,
    outDir: single ? 'dist-artifact' : 'dist',
  },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
} as never);
