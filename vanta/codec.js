// MIT Vanta — Custom Transport Codec
// Each character → 3-digit zero-padded decimal char code.
// Prefix is derived dynamically from the page URL so the proxy works
// at ANY deploy path: root (/) or subdirectory (/myrepo/).
(function(g) {
  'use strict';

  // Derive base path from current location (works in window AND in SW via import)
  // e.g. https://user.github.io/myproxy/  →  /myproxy/
  //      https://user.github.io/          →  /
  var BASE = (function() {
    try {
      var href = (typeof location !== 'undefined') ? location.href : '/';
      var p = new URL(href).pathname;
      // strip filename if present (e.g. /myproxy/index.html → /myproxy/)
      return p.replace(/[^/]*$/, '') || '/';
    } catch(e) { return '/'; }
  })();

  var PREFIX = BASE + 'service/';

  // ── Pure JS codec ──────────────────────────────────────────────────────────
  function encodeUrl(url) {
    var out = '';
    for (var i = 0; i < url.length; i++) {
      var code = url.charCodeAt(i);
      if (code < 128) {
        out += ('000' + code).slice(-3);
      } else {
        var bytes = encodeURIComponent(url[i]).replace(/%/g,'').match(/.{2}/g) || [];
        for (var j = 0; j < bytes.length; j++)
          out += ('000' + parseInt(bytes[j], 16)).slice(-3);
      }
    }
    return out;
  }

  function decodeUrl(enc) {
    var out = '';
    for (var i = 0; i + 2 < enc.length; i += 3) {
      var code = parseInt(enc.slice(i, i + 3), 10);
      if (!isNaN(code)) out += String.fromCharCode(code);
    }
    return out;
  }

  function toProxy(url)    { return PREFIX + encodeUrl(url); }
  function fromProxy(path) {
    return decodeUrl(path.slice(PREFIX.length).split('?')[0].split('#')[0]);
  }
  function isProxy(path)   { return path.startsWith(PREFIX); }

  // ── WASM accelerated ───────────────────────────────────────────────────────
  var _wasmEncode = null, _wasmDecode = null, _wasmMem = null;

  function loadWasm() {
    var wasmUrl;
    try { wasmUrl = new URL(BASE + 'vanta/codec.wasm', location.href).href; }
    catch(e) { return; }

    return fetch(wasmUrl)
      .then(function(r) { return r.arrayBuffer(); })
      .then(function(buf) { return WebAssembly.instantiate(buf); })
      .then(function(result) {
        var exp = result.instance.exports;
        _wasmMem = exp.mem;

        var PAGE = 65536;
        function ensureMem(need) {
          var cur = _wasmMem.buffer.byteLength / PAGE;
          if (need > cur) try { _wasmMem.grow(need - cur); } catch(e) {}
        }

        _wasmEncode = function(url) {
          var inB = new TextEncoder().encode(url);
          ensureMem(Math.ceil((inB.length * 4 + 16) / PAGE));
          var mem8 = new Uint8Array(_wasmMem.buffer);
          var inPtr = 16, outPtr = inPtr + inB.length + 16;
          mem8.set(inB, inPtr);
          var n = exp.encode(inPtr, inB.length, outPtr);
          return new TextDecoder().decode(mem8.subarray(outPtr, outPtr + n));
        };

        _wasmDecode = function(enc) {
          var inB = new TextEncoder().encode(enc);
          ensureMem(Math.ceil((inB.length * 2 + 16) / PAGE));
          var mem8 = new Uint8Array(_wasmMem.buffer);
          var inPtr = 16, outPtr = inPtr + inB.length + 16;
          mem8.set(inB, inPtr);
          var n = exp.decode(inPtr, inB.length, outPtr);
          return new TextDecoder().decode(mem8.subarray(outPtr, outPtr + n));
        };
      })
      .catch(function() { /* WASM unavailable — JS fallback stays active */ });
  }

  if (typeof fetch !== 'undefined' && typeof WebAssembly !== 'undefined') {
    loadWasm();
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  g.VantaCodec = {
    BASE:      BASE,
    PREFIX:    PREFIX,
    encode:    function(url)  { return (_wasmEncode || encodeUrl)(url); },
    decode:    function(enc)  { return (_wasmDecode || decodeUrl)(enc); },
    toProxy:   toProxy,
    fromProxy: fromProxy,
    isProxy:   isProxy,
    encodeJs:  encodeUrl,
    decodeJs:  decodeUrl,
  };

})(typeof globalThis !== 'undefined' ? globalThis : self);
