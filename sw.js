// MIT Vanta — Service Worker (scope-relative, works at any deploy path)
// Zero external imports. GitHub Pages + Neocities safe.
'use strict';

// ── Derive proxy prefix from SW scope ─────────────────────────────────────────
// e.g. scope = https://user.github.io/myproxy/  →  PREFIX = /myproxy/service/
//      scope = https://user.github.io/           →  PREFIX = /service/
var _scopePath = null;
function getScopePath() {
  if (_scopePath !== null) return _scopePath;
  try { _scopePath = new URL(self.registration.scope).pathname; } catch(e) { _scopePath = '/'; }
  return _scopePath;
}
function getPrefix() { return getScopePath() + 'service/'; }

// ── Inline codec ──────────────────────────────────────────────────────────────
function encUrl(url) {
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
function decUrl(enc) {
  var o = '';
  for (var i = 0; i + 2 < enc.length; i += 3) {
    var c = parseInt(enc.slice(i, i+3), 10);
    if (!isNaN(c)) o += String.fromCharCode(c);
  }
  return o;
}
function toProxy(url)  { return getPrefix() + encUrl(url); }
function fromProxy(p)  {
  var prefix = getPrefix();
  return decUrl(p.slice(prefix.length).split('?')[0].split('#')[0]);
}

// ── Config (bare server URL) ───────────────────────────────────────────────────
var BARE = '';

// ── Cookie jar ────────────────────────────────────────────────────────────────
var cookieJar = {};

function parseCookies(origin, list) {
  (Array.isArray(list) ? list : [list]).forEach(function(h) {
    if (!h) return;
    var parts = h.split(';').map(function(p) { return p.trim(); });
    var eq = parts[0].indexOf('='); if (eq < 0) return;
    var name = parts[0].slice(0, eq).trim(), val = parts[0].slice(eq+1).trim();
    var del = false, exp = null;
    parts.slice(1).forEach(function(p) {
      var i = p.indexOf('='), k = p.slice(0,i<0?p.length:i).trim().toLowerCase(), v = i<0?'':p.slice(i+1).trim();
      if (k==='max-age')  { var n=parseInt(v); exp=Date.now()+n*1000; if(n<=0) del=true; }
      if (k==='expires')  { exp=new Date(v).getTime(); if(exp<Date.now()) del=true; }
    });
    if (!cookieJar[origin]) cookieJar[origin] = {};
    if (del) delete cookieJar[origin][name];
    else cookieJar[origin][name] = { value: val, expires: exp };
  });
}

function getCookieHeader(origin) {
  var jar = cookieJar[origin]; if (!jar) return '';
  var now = Date.now(), out = [];
  Object.keys(jar).forEach(function(n) {
    var c = jar[n];
    if (c.expires && c.expires < now) { delete jar[n]; return; }
    out.push(n + '=' + c.value);
  });
  return out.join('; ');
}

self.addEventListener('message', function(e) {
  if (!e.data) return;
  if (e.data.type === 'VANTA_CONFIG')  { BARE = e.data.bare || BARE; }
  if (e.data.type === 'SKIP_WAITING')  { self.skipWaiting(); }
  if (e.data.type === 'VANTA_COOKIE')  { parseCookies(e.data.origin, [e.data.cookie]); }
});

// ── Hop headers ───────────────────────────────────────────────────────────────
var HOP = new Set(['connection','keep-alive','proxy-authenticate','proxy-authorization',
  'te','trailers','transfer-encoding','upgrade']);

// ── URL helpers ───────────────────────────────────────────────────────────────
function resolve(base, rel) { try { return new URL(rel, base).href; } catch(e) { return rel; } }

function rewriteAttr(val, base) {
  val = (val||'').trim();
  if (!val || /^(data:|blob:|#|javascript:|mailto:)/i.test(val)) return val;
  try { var a = resolve(base, val); return a.startsWith('http') ? toProxy(a) : val; }
  catch(e) { return val; }
}

// ── HTML rewriter ──────────────────────────────────────────────────────────────
function rewriteHtml(html, base) {
  html = html.replace(/<base[^>]*>/gi, '');

  html = html.replace(/(\b(?:src|href|action|poster|data|background|formaction)\s*=\s*)(["'])((?:(?!\2)[^])*?)\2/gi,
    function(m, attr, q, val) { return attr + q + rewriteAttr(val, base) + q; });

  html = html.replace(/(\bsrcset\s*=\s*)(["'])([^]*?)\2/gi, function(m, a, q, val) {
    return a + q + val.replace(/([^\s,]+)(\s*(?:\s+\d+[wx])?)/g, function(m2, u, d) {
      return rewriteAttr(u, base) + d;
    }) + q;
  });

  html = html.replace(/(content\s*=\s*["'][^"']*?url\s*=\s*)([^"';\s]+)/gi,
    function(m, p, u) { return p + rewriteAttr(u, base); });

  html = html.replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/gi,
    function(m, o, css, c) { return o + rewriteCss(css, base) + c; });

  html = html.replace(/(\bstyle\s*=\s*["'][^"']*?)(url\s*\(\s*(['"]?)([^)'"]*?)\3\s*\))/gi,
    function(m, p, _, q, u) { return p + 'url(' + q + rewriteAttr(u, base) + q + ')'; });

  // Inject client bootstrap: pass the current prefix so client.js works at any path
  var tag = '<script>window.__vantaPrefix=' + JSON.stringify(getPrefix()) + ';<\/script>' +
            '<script src="' + getScopePath() + 'vanta/client.js"><\/script>';
  if (html.indexOf('</head>') !== -1) html = html.replace('</head>', tag + '</head>');
  else html = tag + html;

  return html;
}

function rewriteCss(css, base) {
  return css.replace(/url\(\s*(['"]?)([^)'"]+?)\1\s*\)/gi,
    function(m, q, u) { return 'url(' + q + rewriteAttr(u, base) + q + ')'; });
}

// ── Bare fetch ─────────────────────────────────────────────────────────────────
async function bareFetch(targetUrl, method, reqHeaders, body) {
  if (!BARE) throw new Error('bare_unconfigured');
  var t = new URL(targetUrl);
  var fwd = {};
  Object.keys(reqHeaders).forEach(function(k) {
    if (!HOP.has(k.toLowerCase()) && k.toLowerCase() !== 'host') fwd[k] = reqHeaders[k];
  });
  fwd['Host'] = t.host;
  return fetch(BARE, {
    method: method || 'GET',
    headers: {
      'X-Bare-Host':     t.hostname,
      'X-Bare-Port':     String(t.port || (t.protocol === 'https:' ? '443' : '80')),
      'X-Bare-Protocol': t.protocol,
      'X-Bare-Path':     t.pathname + t.search,
      'X-Bare-Headers':  JSON.stringify(fwd),
    },
    body: body || null,
    redirect: 'manual',
  });
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
self.addEventListener('install',  function() { self.skipWaiting(); });
self.addEventListener('activate', function(e) { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);
  if (!url.pathname.startsWith(getPrefix())) return;
  e.respondWith(handle(e.request, url));
});

// ── Main handler ──────────────────────────────────────────────────────────────
async function handle(req, proxyUrl) {
  var targetStr = fromProxy(proxyUrl.pathname);
  if (!targetStr || !targetStr.startsWith('http'))
    return new Response('Bad proxy URL', { status: 400 });

  var target = new URL(targetStr);
  if (proxyUrl.search && !target.search) {
    try { target = new URL(targetStr + proxyUrl.search); } catch(e) {}
  }
  var origin = target.origin;
  var scopePath = getScopePath();

  // Ask main page for config if BARE not set yet
  if (!BARE) {
    var clients = await self.clients.matchAll();
    clients.forEach(function(c) { c.postMessage({ type: 'VANTA_NEED_CONFIG' }); });
    await new Promise(function(r) { setTimeout(r, 100); });
    if (!BARE) return new Response(
      '<!doctype html><html><body style="font:1rem system-ui;padding:2rem">' +
      '<h2>&#9881; Vanta needs your server URL</h2>' +
      '<p>Go back to <a href="' + scopePath + '">the proxy home</a>, open Settings, and enter your Wisp/bare server URL.</p>' +
      '</body></html>',
      { status: 503, headers: { 'content-type': 'text/html' } }
    );
  }

  // Forward headers
  var fwd = {};
  req.headers.forEach(function(v, k) {
    var kl = k.toLowerCase();
    if (HOP.has(kl) || kl === 'host') return;
    if (kl === 'referer') {
      try {
        var rr = fromProxy(new URL(v).pathname);
        if (rr) fwd['Referer'] = rr;
      } catch(e) {}
      return;
    }
    fwd[k] = v;
  });
  var ck = getCookieHeader(origin);
  if (ck) fwd['cookie'] = (fwd['cookie'] ? fwd['cookie'] + '; ' : '') + ck;

  var body = null;
  if (req.method !== 'GET' && req.method !== 'HEAD') body = await req.arrayBuffer();

  var resp;
  try { resp = await bareFetch(target.href, req.method, fwd, body); }
  catch(err) { return new Response('Vanta error: ' + err.message, { status: 502 }); }

  // Redirect
  var loc = resp.headers.get('x-bare-location') || resp.headers.get('location');
  if (loc && resp.status >= 300 && resp.status < 400)
    return Response.redirect(toProxy(resolve(target.href, loc)), resp.status);

  // Parse bare response headers
  var bareHdrs = {};
  try { var xbh = resp.headers.get('x-bare-headers'); if (xbh) bareHdrs = JSON.parse(xbh); } catch(e) {}

  // Cookies
  var sc = [];
  ['set-cookie','Set-Cookie'].forEach(function(k) {
    var v = bareHdrs[k] || resp.headers.get(k);
    if (v) sc.push(v);
  });
  if (sc.length) parseCookies(origin, sc);

  // Build output headers
  var out = new Headers();
  Object.keys(bareHdrs).forEach(function(k) {
    var kl = k.toLowerCase();
    if (HOP.has(kl) || kl === 'set-cookie') return;
    if (/^(content-security-policy|x-frame-options|cross-origin-opener-policy)/i.test(kl)) return;
    try { out.set(k, String(bareHdrs[k])); } catch(e) {}
  });

  var ct = String(bareHdrs['content-type'] || bareHdrs['Content-Type'] || resp.headers.get('content-type') || '');
  if (ct) out.set('content-type', ct);
  var status = resp.status === 204 ? 200 : (resp.status || 200);

  var ctl = ct.toLowerCase();
  if (ctl.includes('text/html'))
    return new Response(rewriteHtml(await resp.text(), target.href), { status, headers: out });
  if (ctl.includes('text/css'))
    return new Response(rewriteCss(await resp.text(), target.href), { status, headers: out });
  return new Response(resp.body, { status, headers: out });
}
