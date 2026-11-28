import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for the Museu UNICAP BI frontend.
 *
 * Key points for Angular 22 + Vitest integration:
 * - `globals: true` mirrors `tsconfig.spec.json` `"types": ["vitest/globals"]`
 * - `jsdom` environment with base `url` so fetch() can resolve relative paths
 * - `resolveId` / `load` plugin intercepts `templateUrl` and `styleUrl`
 *   references at build time so Angular's JIT compiler receives inline content
 *   instead of trying to `fetch()` relative URLs at runtime
 */
export default defineConfig({
  plugins: [
    {
      // Transform Angular templateUrl (.html) and styleUrl (.scss/.css) imports
      // into inline string exports so the JIT resolver sees them immediately.
      name: 'angular-templates',
      enforce: 'pre',
      transform(code, id) {
        if (id.endsWith('.html') || id.endsWith('.scss') || id.endsWith('.css')) {
          return { code: `export default ${JSON.stringify(code)}`, map: null };
        }
        return null;
      },
    },
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/app/**/*.ts'],
      exclude: ['src/app/**/*.spec.ts', 'src/app/**/*.routes.ts'],
    },
  },
});
