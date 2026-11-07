import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', include: [`tools/sim/${process.env.SIM ?? 'economy'}.sim.ts`] } });
