/* @vitest-environment node */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'vite';

const distDir = resolve(__dirname, '../../dist');
const configFile = resolve(__dirname, '../../vite.config.ts');

describe('vite production build', () => {
  beforeAll(async () => {
    await rm(distDir, { recursive: true, force: true });
  });

  it('completes without errors', async () => {
    await expect(
      build({
        configFile,
        mode: 'production',
        logLevel: 'error',
      }),
    ).resolves.toBeDefined();
  });

  afterAll(async () => {
    await rm(distDir, { recursive: true, force: true });
  });
});
