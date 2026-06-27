// Unit tests for the LMS theme-core.js (the Pipeline-concatenated twin of
// hdruk-frontend-plugin-slots/src/theme-core.js). Zero deps: node's built-in
// test runner + vm, so the tutor repo needs no JS toolchain. Run: `node --test`
// (or `make test-js`). theme-core.js exposes window.HdrukThemeCore; we load it
// into a vm sandbox and assert on the pure functions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const CORE_PATH = fileURLToPath(
  new URL(
    '../tutorhdrukfuturestheme/templates/hdrukfuturestheme/lms/static/js/theme-core.js',
    import.meta.url,
  ),
);
const code = readFileSync(CORE_PATH, 'utf8');

// Load theme-core.js into a fresh sandbox with an optional matchMedia stub,
// returning the exposed window.HdrukThemeCore.
function load(matchMedia) {
  const sandbox = { window: { matchMedia } };
  vm.runInNewContext(code, sandbox);
  return sandbox.window.HdrukThemeCore;
}

test('readThemeFromCookie extracts a valid variant, else null', () => {
  const core = load();
  assert.equal(core.readThemeFromCookie('theme=dark'), 'dark');
  assert.equal(core.readThemeFromCookie('a=1; theme=light; b=2'), 'light');
  assert.equal(core.readThemeFromCookie('theme=banana'), null);
  assert.equal(core.readThemeFromCookie('mytheme=dark'), null);
  assert.equal(core.readThemeFromCookie(''), null);
});

test('resolveActiveTheme returns the cookie value when valid', () => {
  const core = load();
  assert.equal(core.resolveActiveTheme('theme=dark'), 'dark');
  assert.equal(core.resolveActiveTheme('foo=1; theme=light'), 'light');
});

test('resolveActiveTheme falls back to prefers-color-scheme', () => {
  const core = load((q) => ({ matches: q.includes('dark') }));
  assert.equal(core.resolveActiveTheme(''), 'dark');
  assert.equal(core.resolveActiveTheme('theme=nonsense'), 'dark');
});

test('resolveActiveTheme defaults to light when matchMedia is absent', () => {
  const core = load(undefined);
  assert.equal(core.resolveActiveTheme(''), 'light');
});

test('prefersDark reflects the media query (false without matchMedia)', () => {
  assert.equal(load((q) => ({ matches: q.includes('dark') })).prefersDark(), true);
  assert.equal(load(() => ({ matches: false })).prefersDark(), false);
  assert.equal(load(undefined).prefersDark(), false);
});

test('buildThemeCookie formats with and without a domain', () => {
  const core = load();
  assert.equal(
    core.buildThemeCookie('theme', 'dark', 100, ''),
    'theme=dark; path=/; max-age=100; samesite=lax',
  );
  assert.equal(
    core.buildThemeCookie('theme', 'light', 31536000, '.example.com'),
    'theme=light; path=/; max-age=31536000; samesite=lax; domain=.example.com',
  );
});
