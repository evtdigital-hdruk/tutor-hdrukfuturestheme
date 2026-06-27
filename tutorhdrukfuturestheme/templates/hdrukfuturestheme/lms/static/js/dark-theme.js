$(document).ready(function() {
    'use strict';

    // Pure cookie/theme logic lives in theme-core.js (concatenated by Pipeline
    // before this file; exposes window.HdrukThemeCore) so it can be unit-tested.
    // It mirrors hdruk-frontend-plugin-slots src/theme-core.js: same `theme`
    // cookie ('dark' | 'light'), shared base domain, 1-year max-age, samesite=lax.
    // This file keeps the jQuery / DOM glue that Pipeline can't bundle-test.
    const core = window.HdrukThemeCore;
    const THEME_COOKIE = core.THEME_COOKIE;
    const LIGHT = core.LIGHT;
    const DARK = core.DARK;
    const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
    // Base domain so the cookie is shared with the MFEs and marketing site (the
    // MFE side reads getConfig().SESSION_COOKIE_DOMAIN). `BASE_DOMAIN` is the
    // cross-plugin tutor config owned by tutor-contrib-hdrukplugin (e.g.
    // ".example.com"); `default("")` keeps `tutor config save` working if that
    // plugin is absent. Empty = host-only (theme won't sync across subdomains).
    const themeCookieDomain = '{{ BASE_DOMAIN | default("") }}';

    function getStoredTheme(){
      return core.resolveActiveTheme(document.cookie);
    }

    function storeTheme(value){
      document.cookie = core.buildThemeCookie(THEME_COOKIE, value, ONE_YEAR_SECONDS, themeCookieDomain);
    }

    function applyThemeOnPage(){
      const theme = getStoredTheme();
      {% if HDRUKFUTURESTHEME_ENABLE_DARK_TOGGLE %}
      // Toggle the dark class on BOTH <html> (matches the MFEs / marketing
      // site + descendant rules) and <body> (the theme's `.dark.view-*`
      // courseware rules live on the body element).
      const isDark = theme === DARK;
      document.documentElement.classList.toggle("dark", isDark);
      if (document.body) {
        document.body.classList.toggle("dark", isDark);
      }
      {% endif %}
      updateAccessibility();
    }

    // Mirror theme.js setTheme(): after persisting, tell any child iframes so
    // cross-origin embeds (e.g. xblocks) re-read the cookie and re-theme live
    // without a reload. postMessage is allowed cross-origin, hence '*'.
    function notifyIframes(theme){
      const iframes = document.getElementsByTagName('iframe');
      for (let i = 0; i < iframes.length; i += 1) {
        try {
          if (iframes[i].contentWindow) {
            iframes[i].contentWindow.postMessage({ theme: theme }, '*');
          }
        } catch (e) {
          // Ignore frames we can't post to.
        }
      }
    }

    function setThemeToggleBtnState(){
      const theme = getStoredTheme();
      $("#toggle-switch-input").prop("checked", theme === DARK);
      updateAccessibility();
    }

    function updateAccessibility() {
      const theme = getStoredTheme();
      const textWrapper = $('#theme-label');
      if (theme === DARK) {
        textWrapper.text('Switch to Light Mode');
        textWrapper.attr('aria-checked', 'true');
      } else {
        textWrapper.text('Switch to Dark Mode');
        textWrapper.attr('aria-checked', 'false');
      }
    }

    function toggleTheme(){
      const themeValue = getStoredTheme() === DARK ? LIGHT : DARK;
      storeTheme(themeValue);
      applyThemeOnPage();
      notifyIframes(themeValue);
    }

    // Listener for updating the theme inside an iframe (the parent posts the new
    // theme on toggle; we just re-read the cookie and re-apply).
    window.addEventListener("message", function(e){
      if (e.data && e.data.theme){
        applyThemeOnPage();
      }
    });

    applyThemeOnPage();  // loading theme on page load
    setThemeToggleBtnState(); // check/uncheck toggle btn based on theme

    $('#toggle-switch').on('change', toggleTheme);
    $('#toggle-switch-input').on('keydown', function (event) {
      if (event.key === "Enter") {
          toggleTheme();
      }
    });
});
