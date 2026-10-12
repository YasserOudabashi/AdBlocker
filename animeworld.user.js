// ==UserScript==
// @name         AnimeWorld - blocco pubblicita
// @description  Toglie banner e popunder al click su animeworld
// @match        *://*.animeworld.ac/*
// @run-at       document-start
// @inject-into  page
// ==/UserScript==
(() => {
  'use strict';
  const html = document.documentElement;
  const BAD = /(^|\.)(crittereasilyhangover\.com|aqle3\.com|spherepsoai\.com|a-ads\.com)$/i;
  const SDK = /^\/[A-Za-z0-9]{8,}\/\d{3,6}$/; // percorso tipico degli script popunder: /token/zona
  const HIDE = '#dl-banner-728x90,#dl-banner-300x250,iframe[src*="a-ads.com"]';

  const url = u => { try { return new URL(u, location.href); } catch { return null; } };
  const bad = u => { const x = url(u); return !!x && BAD.test(x.hostname); };
  const badScript = u => { const x = url(u); return !!x && (BAD.test(x.hostname) || (x.hostname !== location.hostname && SDK.test(x.pathname))); };
  const native = (fn, name) => { fn.toString = () => `function ${name}() { [native code] }`; return fn; };

  // 1. window.open finta "nativa" (lo SDK controlla [native code], altrimenti ne prende una pulita da un iframe)
  window.open = native(() => null, 'open');
  const fs = HTMLFormElement.prototype.submit;
  HTMLFormElement.prototype.submit = native(function () {
    if (this.target && this.style.display === 'none') return; // form nascosto dello SDK
    return fs.call(this);
  }, 'submit');
  const ac = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = native(function () {
    const x = url(this.href);
    if (x && (bad(this.href) || (x.hostname !== location.hostname && !this.offsetWidth))) return;
    return ac.call(this);
  }, 'click');

  // 2. Click su link verso domini pubblicitari: fermati
  const stop = e => {
    const a = e.target instanceof Element && e.target.closest('a[href]');
    if (a && bad(a.href)) { e.stopImmediatePropagation(); e.preventDefault(); }
  };
  ['touchstart', 'pointerdown', 'mousedown', 'click'].forEach(n => window.addEventListener(n, stop, true));

  // 3. Script/iframe creati da JS verso domini pubblicitari: src ignorato
  const sd = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
  Object.defineProperty(HTMLScriptElement.prototype, 'src', {
    ...sd,
    set(v) { if (!badScript(v)) sd.set.call(this, v); },
  });
  const sa = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (k, v) {
    if (k === 'src' && ((this.tagName === 'SCRIPT' && badScript(v)) || (this.tagName === 'IFRAME' && bad(v)))) return;
    return sa.call(this, k, v);
  };

  // 4. CSS immediato + rimozione di cio' che viene aggiunto fuori da <body> o da domini pubblicitari
  //    (#adex = esca anti-adblock di alcuni siti: non toccarla)
  const st = document.createElement('style');
  st.id = 'enb-style';
  st.textContent = `${HIDE},html>:not(head):not(body):not(#enb-style):not(#adex){display:none!important}`;
  html.appendChild(st);

  const isAd = n => n.nodeType === 1 && (
    (n.parentNode === html && !['HEAD', 'BODY'].includes(n.tagName) && n.id !== 'enb-style' && n.id !== 'adex') ||
    (n.tagName === 'IFRAME' && bad(n.getAttribute('src') || '')) ||
    (n.tagName === 'SCRIPT' && n.src && badScript(n.src)));
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => isAd(n) && n.remove())))
    .observe(html, { childList: true, subtree: true });
})();
