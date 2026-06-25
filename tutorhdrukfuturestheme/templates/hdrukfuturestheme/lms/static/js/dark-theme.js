$(document).ready(function() {
    'use strict';

    // Mirrors the conventions in the MFE helper (hdruk-frontend-plugin-slots
    // src/theme.js): same `theme` cookie ('dark' | 'light'), shared base domain,
    // 1-year max-age, samesite=lax. This file is concatenated into the LMS via
    // Django Pipeline (no module bundler), so it uses raw document.cookie + the
    // global jQuery rather than universal-cookie / getConfig().
    const THEME_COOKIE = 'theme';
    const LIGHT = 'light';
    const DARK = 'dark';
    const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
    // Base domain so the cookie is shared with the MFEs and marketing site (the
    // MFE side reads getConfig().SESSION_COOKIE_DOMAIN). `BASE_DOMAIN` is the
    // cross-plugin tutor config owned by tutor-contrib-hdrukplugin (e.g.
    // ".example.com"); `default("")` keeps `tutor config save` working if that
    // plugin is absent. Empty = host-only (theme won't sync across subdomains).
    const themeCookieDomain = '{{ BASE_DOMAIN | default("") }}';

    function getStoredTheme(){
      const match = document.cookie.match(/(?:^|; )theme=(dark|light)/);
      if (match) {
        return match[1];
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK : LIGHT;
    }

    function storeTheme(value){
      let cookie = THEME_COOKIE + '=' + value + '; path=/; max-age=' + ONE_YEAR_SECONDS + '; samesite=lax';
      if (themeCookieDomain) {
        cookie += '; domain=' + themeCookieDomain;
      }
      document.cookie = cookie;
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
