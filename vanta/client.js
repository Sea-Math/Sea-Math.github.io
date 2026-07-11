// MIT Vanta — Client script (injected into every proxied page by the SW)
// The SW injects window.__vantaPrefix before this script loads.
(function() {
  'use strict';

  // Prefix injected by SW into the page — falls back to /service/ at root
  var PREFIX = (typeof window.__vantaPrefix === 'string') ? window.__vantaPrefix : '/service/';

  // Inline 3-digit decimal codec (no deps)
  function enc(url) {
    var o = '';
    for (var i = 0; i < url.length; i++) {
      var c = url.charCodeAt(i);
      if (c < 128) { o += ('000' + c).slice(-3); }
      else {
        var bytes = encodeURIComponent(url[i]).replace(/%/g,'').match(/.{2}/g) || [];
        for (var j = 0; j < bytes.length; j++) o += ('000' + parseInt(bytes[j],16)).slice(-3);
      }
    }
    return o;
  }
  function toProxy(url) { return PREFIX + enc(url); }

  // Decode the real URL from the current proxied path
  function decPath(p) {
    var raw = p.slice(PREFIX.length).split('?')[0].split('#')[0];
    var o = '';
    for (var i = 0; i + 2 < raw.length; i += 3) {
      var c = parseInt(raw.slice(i, i+3), 10);
      if (!isNaN(c)) o += String.fromCharCode(c);
    }
    return o;
  }

  var __real = (function() {
    var p = location.pathname;
    return p.startsWith(PREFIX) ? decPath(p) : location.href;
  })();
  var __realUrl; try { __realUrl = new URL(__real); } catch(e) { return; }

  // ── document.cookie jar ────────────────────────────────────────────────────
  var _cookies = '';
  function mergeCookie(raw) {
    var parts = raw.split(';');
    var nv = parts[0].indexOf('='); if (nv < 0) return;
    var name = parts[0].slice(0, nv).trim(), val = parts[0].slice(nv+1).trim();
    var del = false;
    parts.slice(1).forEach(function(p) {
      var i = p.indexOf('='), k = p.slice(0,i<0?p.length:i).trim().toLowerCase(), v = i<0?'':p.slice(i+1).trim();
      if (k==='max-age' && parseInt(v)<=0) del = true;
      if (k==='expires' && new Date(v).getTime()<Date.now()) del = true;
    });
    var m = {};
    _cookies.split(';').forEach(function(s) {
      var i = s.indexOf('='); if (i<0) return;
      var k = s.slice(0,i).trim(); if (k) m[k] = s.slice(i+1).trim();
    });
    if (del) delete m[name]; else m[name] = val;
    _cookies = Object.keys(m).map(function(k) { return k+'='+m[k]; }).join('; ');
    try {
      navigator.serviceWorker.controller &&
        navigator.serviceWorker.controller.postMessage({
          type: 'VANTA_COOKIE', origin: __realUrl.origin, cookie: raw
        });
    } catch(e) {}
  }
  try {
    Object.defineProperty(document, 'cookie', {
      get: function() { return _cookies; },
      set: function(v) { mergeCookie(v); },
      configurable: true
    });
  } catch(e) {}

  // ── fetch ──────────────────────────────────────────────────────────────────
  var _f = window.fetch;
  window.fetch = function(input, init) {
    if (typeof input === 'string' && /^https?:\/\//i.test(input)) input = toProxy(input);
    else if (input && input.url && /^https?:\/\//i.test(input.url))
      input = new Request(toProxy(input.url), input);
    return _f.call(window, input, init);
  };

  // ── XHR ────────────────────────────────────────────────────────────────────
  var _xo = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(m, u) {
    var a = Array.prototype.slice.call(arguments);
    if (typeof u === 'string' && /^https?:\/\//i.test(u)) a[1] = toProxy(u);
    return _xo.apply(this, a);
  };

  // ── window.open ────────────────────────────────────────────────────────────
  var _wo = window.open;
  window.open = function(u, t, f) {
    if (u && /^https?:\/\//i.test(u)) u = toProxy(u);
    return _wo.call(window, u, t, f);
  };

  // ── history ────────────────────────────────────────────────────────────────
  var _hp = history.pushState.bind(history), _hr = history.replaceState.bind(history);
  history.pushState = function(s,t,u) {
    if (u && /^https?:\/\//i.test(u)) u = toProxy(u); return _hp(s,t,u);
  };
  history.replaceState = function(s,t,u) {
    if (u && /^https?:\/\//i.test(u)) u = toProxy(u); return _hr(s,t,u);
  };

  // ── click delegation ───────────────────────────────────────────────────────
  document.addEventListener('click', function(e) {
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var h = a.getAttribute('href');
    if (!h || /^(#|javascript:|mailto:)/i.test(h) || h.startsWith(PREFIX)) return;
    try {
      var abs = new URL(h, __real).href;
      if (abs.startsWith('http')) { e.preventDefault(); location.href = toProxy(abs); }
    } catch(e2) {}
  }, true);

  // ── form submission ────────────────────────────────────────────────────────
  document.addEventListener('submit', function(e) {
    var f = e.target, a = f.action;
    if (!a || a.startsWith(PREFIX)) return;
    try {
      var abs = new URL(a, __real).href;
      if (abs.startsWith('http')) f.action = toProxy(abs);
    } catch(e2) {}
  }, true);

})();
