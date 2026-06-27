// Pure, framework-free theme helpers for the LMS dark-theme.js.
//
// This file is NOT Jinja-templated. Django Pipeline concatenates it into the LMS
// bundle BEFORE dark-theme.js (see plugin.py), exposing `window.HdrukThemeCore`.
// It uses no module system / no imports, so the SAME file works both as a
// concatenated browser script and when loaded directly by the unit tests
// (tests/theme-core.test.mjs via node:vm). Mirrors the rules in
// hdruk-frontend-plugin-slots/src/theme-core.js - the LMS twin of that module,
// which can't be imported here (Pipeline has no bundler).
(function (root) {
  'use strict';

  var THEME_COOKIE = 'theme';
  var LIGHT = 'light';
  var DARK = 'dark';

  // Parse the `theme` variant out of a raw cookie string; null if absent/invalid.
  function readThemeFromCookie(cookieString) {
    var match = (cookieString || '').match(/(?:^|; )theme=(dark|light)/);
    return match ? match[1] : null;
  }

  // True when the OS prefers dark (false if matchMedia is unavailable).
  function prefersDark() {
    return !!(root.matchMedia && root.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  // The active theme: the cookie if valid, otherwise the OS preference.
  function resolveActiveTheme(cookieString) {
    var stored = readThemeFromCookie(cookieString);
    if (stored === DARK || stored === LIGHT) {
      return stored;
    }
    return prefersDark() ? DARK : LIGHT;
  }

  // Build the Set-Cookie value (path=/, samesite=lax, 1y), shared across
  // subdomains when a base domain is given.
  function buildThemeCookie(name, value, maxAgeSeconds, domain) {
    var cookie = name + '=' + value + '; path=/; max-age=' + maxAgeSeconds + '; samesite=lax';
    if (domain) {
      cookie += '; domain=' + domain;
    }
    return cookie;
  }

  root.HdrukThemeCore = {
    THEME_COOKIE: THEME_COOKIE,
    LIGHT: LIGHT,
    DARK: DARK,
    readThemeFromCookie: readThemeFromCookie,
    prefersDark: prefersDark,
    resolveActiveTheme: resolveActiveTheme,
    buildThemeCookie: buildThemeCookie,
  };
}(typeof window !== 'undefined' ? window : this));
