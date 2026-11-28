/**
 * Global test setup for Vitest + Angular.
 *
 * Import order matters:
 * 1. `@angular/compiler` must be FIRST — activates JIT so Angular decorators
 *    work in test mode before any other Angular package is loaded.
 * 2. `getTestBed().initTestEnvironment()` bootstraps Angular's testing harness
 *    using `BrowserTestingModule` + `platformBrowserTesting()` from
 *    `@angular/platform-browser/testing`.
 * 3. `resolveComponentResources` resolves `templateUrl` (.html) from disk under
 *    `src/app` and stubs `styleUrl` (.scss/.css) as empty strings in jsdom.
 */
import '@angular/compiler';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import { ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { AppModal } from './src/app/shared/components/app-modal/app-modal';

getTestBed().initTestEnvironment(
  BrowserTestingModule,
  platformBrowserTesting(),
  { teardown: { destroyAfterEach: true } },
);

function buildResourceIndex(dir: string, index = new Map<string, string>()): Map<string, string> {
  if (!existsSync(dir)) return index;
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      buildResourceIndex(fullPath, index);
    } else if (entry.endsWith('.html')) {
      index.set(entry, fullPath);
    }
  }
  return index;
}

const htmlIndex = buildResourceIndex(resolve(process.cwd(), 'src/app'));

beforeAll(async () => {
  await resolveComponentResources(async (url) => {
    if (url.endsWith('.scss') || url.endsWith('.css')) {
      return '';
    }
    const fileName = basename(url);
    const matchedPath = htmlIndex.get(fileName);
    if (matchedPath) {
      return readFileSync(matchedPath, 'utf8');
    }
    throw new Error(`Unable to resolve component resource: ${url}`);
  });

  // Vitest runs without Angular's ngtsc AOT transform, so signal-based
  // input.required() / output() on AppModal are not registered on ɵcmp in JIT.
  const modalCmp = (
    AppModal as unknown as {
      ɵcmp?: {
        inputs: Record<string, unknown>;
        declaredInputs: Record<string, string>;
        outputs: Record<string, string>;
      };
    }
  ).ɵcmp;
  if (modalCmp) {
    modalCmp.inputs = {
      ...modalCmp.inputs,
      open: ['open', 1, null],
      dialogLabel: ['dialogLabel', 1, null],
    };
    modalCmp.declaredInputs = {
      ...modalCmp.declaredInputs,
      open: 'open',
      dialogLabel: 'dialogLabel',
    };
    modalCmp.outputs = {
      ...modalCmp.outputs,
      closed: 'closed',
    };
  }
});
