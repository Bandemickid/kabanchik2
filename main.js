/* ==========================================================================
   main.js — MPA version (no SPA routing, no duplicate rendering)
   - Hard navigation for header categories
   - Fix Next.js image optimizer URLs
   - Normalize relative image paths on subpages
   - Auto-activate single .page section on standalone pages
   - Hide-on-scroll header (CSS classes injected if absent)
   ========================================================================== */

(function () {
  'use strict';

  // ---------- helpers ----------
  const qs  = (sel, root) => (root || document).querySelector(sel);
  const qsa = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const isHome = p => /^\/(?:$|ru\/?$)/.test(p || location.pathname);

  // ---------- HARD NAV for header categories ----------
  (function () {
    // підтримує /ru/* та універсальні слуги
    const GEN = ['/citizenship','/residence-permit','/compare','/real-estate','/stories','/about'];
    const RU  = ['/ru/citizenship','/ru/residence','/ru/comparison-of-the-investment-programs-of-the-eu','/ru/real-estate','/ru/cases','/ru/about-us','/ru'];

    function isCategoryHref(href) {
      try {
        const url = new URL(href, location.href);
        const p = url.pathname.replace(/\/+$/, '');
        return [...GEN, ...RU].some(pref => {
          const pp = pref.replace(/\/+$/, '');
          return p === pp || p.startsWith(pp + '/');
        });
      } catch { return false; }
    }

    function hardGo(href) {
      try {
        const url = new URL(href, location.href);
        if (url.pathname !== '/' && !/\/$/.test(url.pathname)) url.pathname += '/';
        location.assign(url.href);
      } catch {}
    }

    function clickHandler(e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // allow new tab etc.
      if (e.type === 'pointerdown' && e.button !== 0) return;
      const a = e.target && e.target.closest && e.target.closest('.header-hav a, a.nav-link, header a, [data-header] a');
      if (!a) return;
      const href = a.getAttribute('href') || a.dataset.href || '';
      if (!href || !isCategoryHref(href)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      hardGo(href);
    }

    window.addEventListener('pointerdown', clickHandler, true);
    window.addEventListener('click',       clickHandler, true);

    // якщо хтось десь викличе pushState на категорію — форсимо реальний перехід
    function maybeReload(urlLike) {
      try {
        const url = new URL(urlLike || location.href, location.href);
        if (isCategoryHref(url.href)) hardGo(url.href);
      } catch {}
    }
    ['pushState','replaceState'].forEach(m => {
      const fn = history[m];
      if (!fn) return;
      history[m] = function (state, title, url) {
        const ret = fn.apply(this, arguments);
        if (url != null) maybeReload(url);
        return ret;
      };
    });
    window.addEventListener('popstate', () => maybeReload(location.href));
  })();

  // ---------- DOM fixes after load ----------
  document.addEventListener('DOMContentLoaded', () => {
    // 1) Next <Image> → звичайні src
    (function fixNextImages() {
      qsa('img').forEach(img => {
        try {
          let s  = img.getAttribute('src')    || '';
          let ss = img.getAttribute('srcset') || img.getAttribute('srcSet') || '';

          const stripNext = (u) => {
            const m = u && u.match(/\/_next\/image\/?\?(.+)$/);
            if (!m) return u;
            const q = new URLSearchParams(m[1]);
            const orig = q.get('url');
            return orig ? decodeURIComponent(orig) : u;
          };

          if (s.startsWith('/_next/image')) {
            s = stripNext(s);
            if (s) { img.setAttribute('src', s); img.removeAttribute('srcset'); img.removeAttribute('srcSet'); }
          }
          if (ss && ss.includes('/_next/image')) {
            const m = ss.match(/url=([^&\s]+)/);
            if (m) {
              img.setAttribute('src', decodeURIComponent(m[1]));
              img.removeAttribute('srcset');
              img.removeAttribute('srcSet');
            }
          }

          // 2) відносні "images/..." → абсолютні "/images/..." на підсторінках
          if (!isHome()) {
            if (/^images\//i.test(s)) {
              img.setAttribute('src', '/' + s.replace(/^\/?/, ''));
            }
            if (ss && /(^|,|\s)images\//i.test(ss)) {
              img.setAttribute('srcset', ss.replace(/(^|,|\s)images\//gi, '$1/images/'));
            }
          }
        } catch {}
      });
    })();

    // 3) якщо на сторінці рівно ОДНА секція .page — вмикаємо її
    (function activateSinglePage() {
      const pages = qsa('section.page');
      if (pages.length === 1) pages[0].classList.add('is-active');
    })();
  }, { once: true });

  // ---------- Hide-on-scroll header ----------
  (function headerAutoHide() {
    const header = qs('[data-header]') || qs('header') || qs('.header-hav');
    if (!header) return;

    let lastY = window.scrollY || 0;
    let ticking = false;
    const DELTA = 8;
    const SHOW_AT_TOP = 40;

    function onScroll() {
      const y = window.scrollY || 0;
      const dy = y - lastY;

      if (y <= SHOW_AT_TOP) {
        header.classList.remove('header--scrolled', 'header--hidden');
      } else {
        header.classList.add('header--scrolled');
        if (dy > DELTA) header.classList.add('header--hidden');      // вниз — ховаємо
        else if (dy < -DELTA) header.classList.remove('header--hidden'); // вгору — показуємо
      }
      lastY = y;
    }

    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { onScroll(); ticking = false; });
    }, { passive: true });

    onScroll();

    // інжектуємо мінімальний CSS, якщо його немає
    if (!qs('#__auto_header_css')) {
      const css = document.createElement('style');
      css.id = '__auto_header_css';
      css.textContent =
        ':root{--header-bg:#fff;--header-shadow:0 6px 24px rgba(0,0,0,.06)}' +
        '[data-header]{position:sticky;top:0;z-index:1000;background:var(--header-bg);' +
        'transition:transform .25s ease,box-shadow .2s ease;will-change:transform}' +
        '[data-header].header--scrolled{box-shadow:var(--header-shadow)}' +
        '[data-header].header--hidden{transform:translateY(-100%)}';
      document.head.appendChild(css);
    }
  })();

  // ---------- (опціонально) прибирач явних дублів за id ----------
  // розкоментуй, якщо колись побачиш дублікати елементів з однаковим id
  /*
  document.addEventListener('DOMContentLoaded', () => {
    const seen = Object.create(null);
    qsa('[id]').forEach(el => {
      const id = el.id;
      if (!id) return;
      if (seen[id]) el.remove();
      else seen[id] = true;
    });
  }, { once: true });
  */
})();
