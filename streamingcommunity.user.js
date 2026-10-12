// ==UserScript==
// @name         StreamingCommunity - blocco pubblicita
// @description  Toglie script/overlay pubblicitari e popunder su StreamingCommunity (dominio variabile)
// @match        *://*/*
// @run-at       document-start
// @inject-into  page
// ==/UserScript==
(() => {
  'use strict';
  // Il dominio cambia (.shiksha, .ink, ...): niente @match fisso, controllo qui il nome. Aggiungi varianti se serve.
  if (!/^(www\.)?(streamingcommunity|streamingunity)[a-z0-9-]*\./i.test(location.hostname)) return;

  const html = document.documentElement;
  const BAD = /(^|\.)(spbgc\.com)$/i;
  const SDK = /^\/[A-Za-z0-9]{8,}\/\d{3,6}$/; // percorso tipico degli script popunder: /token/zona

  const url = u => { try { return new URL(u, location.href); } catch { return null; } };
  const bad = u => { const x = url(u); return !!x && BAD.test(x.hostname); };
  const badScript = u => { const x = url(u); return !!x && (BAD.test(x.hostname) || (x.hostname !== location.hostname && SDK.test(x.pathname))); };
  const native = (fn, name) => { fn.toString = () => `function ${name}() { [native code] }`; return fn; };

  // 1. window.open finta "nativa" + form/link nascosti verso l'esterno
  window.open = native(() => null, 'open');
  const fs = HTMLFormElement.prototype.submit;
  HTMLFormElement.prototype.submit = native(function () {
    if (this.target && this.style.display === 'none') return;
    return fs.call(this);
  }, 'submit');
  const ac = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = native(function () {
    const x = url(this.href);
    if (x && (bad(this.href) || (x.hostname !== location.hostname && !this.offsetWidth))) return;
    return ac.call(this);
  }, 'click');

  // 2. Click su link verso domini pubblicitari o su contenitori fuori da <body>: fermati
  const stop = e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const a = t.closest('a[href]');
    if ((a && bad(a.href)) || t.closest('html > :not(head):not(body):not(#adex)')) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
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
  //    (#adex = esca anti-adblock del sito: non toccarla, altrimenti ti scopre)
  const st = document.createElement('style');
  st.id = 'enb-style';
  st.textContent = 'html>:not(head):not(body):not(#enb-style):not(#adex){display:none!important}';
  html.appendChild(st);

  const isAd = n => n.nodeType === 1 && (
    (n.parentNode === html && !['HEAD', 'BODY'].includes(n.tagName) && n.id !== 'enb-style' && n.id !== 'adex') ||
    (n.tagName === 'IFRAME' && bad(n.getAttribute('src') || '')) ||
    (n.tagName === 'SCRIPT' && n.src && badScript(n.src)));
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => isAd(n) && n.remove())))
    .observe(html, { childList: true, subtree: true });
})();
