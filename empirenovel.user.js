// ==UserScript==
// @name         EmpireNovel - blocco pubblicita
// @description  Toglie overlay finti e redirect al tocco su empirenovel.com
// @match        https://www.empirenovel.com/*
// @run-at       document-start
// @inject-into  page
// ==/UserScript==
(() => {
  'use strict';
  const html = document.documentElement;
  const BAD = /(^|\.)(richeryawp\.com|dockskitlope\.cfd|coupontic\.com)$|\.(cfd|rest)$/i;
  const host = u => { try { return new URL(u, location.href).hostname; } catch { return ''; } };
  const bad = u => BAD.test(host(u));
  const native = (fn, name) => { fn.toString = () => `function ${name}() { [native code] }`; return fn; };

  // 1. po.js apre il redirect una volta all'ora (shown_at); lo facciamo credere gia' fatto.
  //    Al rientro dopo >60s azzera shown_at: teniamo unloaded_at fresco e blocchiamo la rimozione.
  const rm = Storage.prototype.removeItem;
  Storage.prototype.removeItem = function (k) { if (k !== 'shown_at') return rm.call(this, k); };
  try {
    localStorage.setItem('unloaded_at', String(Date.now()));
    localStorage.setItem('shown_at', String(Date.now() + 3.15e10));
  } catch { /* storage non disponibile */ }

  // 2. window.open finta "nativa" (po.js controlla [native code]; altrimenti usa una open pulita da iframe)
  window.open = native(() => null, 'open');
  const fs = HTMLFormElement.prototype.submit;
  HTMLFormElement.prototype.submit = native(function () {
    if (this.target && this.style.display === 'none') return; // form nascosto di po.js
    return fs.call(this);
  }, 'submit');
  const ac = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = native(function () {
    if (bad(this.href) || (host(this.href) !== location.hostname && !this.offsetWidth)) return;
    return ac.call(this);
  }, 'click');

  // 3. Tocchi sull'overlay o su link verso domini pubblicitari: fermati prima degli altri listener
  const stop = e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const a = t.closest('a[href]');
    if (t.closest('html > :not(head):not(body)') || (a && bad(a.href))) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  };
  ['touchstart', 'pointerdown', 'mousedown', 'click'].forEach(n => window.addEventListener(n, stop, true));

  // 4. Script/iframe creati dinamicamente da domini pubblicitari: src ignorato
  const sd = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
  Object.defineProperty(HTMLScriptElement.prototype, 'src', {
    ...sd,
    set(v) { if (!bad(v)) sd.set.call(this, v); },
  });
  const sa = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (k, v) {
    if (k === 'src' && /^(SCRIPT|IFRAME)$/.test(this.tagName) && bad(v)) return;
    return sa.call(this, k, v);
  };

  // 5. CSS immediato + rimozione di cio' che viene aggiunto fuori da <body> o come iframe srcdoc+sandbox
  const st = document.createElement('style');
  st.id = 'enb-style';
  st.textContent = 'html>:not(head):not(body):not(#enb-style),iframe[srcdoc][sandbox]{display:none!important}';
  html.appendChild(st);

  const isAd = n => n.nodeType === 1 && (
    (n.parentNode === html && !['HEAD', 'BODY'].includes(n.tagName) && n.id !== 'enb-style') ||
    (n.tagName === 'IFRAME' && n.hasAttribute('srcdoc') && n.hasAttribute('sandbox')) ||
    (n.tagName === 'SCRIPT' && n.src && bad(n.src)));
  const sweep = n => {
    if (isAd(n)) n.remove();
    else if (n.querySelectorAll) n.querySelectorAll('iframe[srcdoc][sandbox]').forEach(f => f.remove());
  };
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(sweep)))
    .observe(html, { childList: true, subtree: true });
})();
