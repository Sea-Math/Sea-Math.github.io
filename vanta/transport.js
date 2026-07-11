// MIT Vanta — Wisp Transport
// Opens ONE persistent WebSocket to the user's Wisp server.
// HTTP/HTTPS requests tunnel through /bare/ on the same server.
// WebSocket connections use /wisp/ directly.
(function(g) {
  'use strict';

  // Derive bare URL from Wisp URL
  // wss://host/wisp/ → https://host/bare/
  // ws://host/wisp/  → http://host/bare/
  function bareFromWisp(wispUrl) {
    try {
      var u = new URL(wispUrl);
      u.protocol = u.protocol === 'wss:' ? 'https:' : 'http:';
      u.pathname = '/bare/';
      return u.href;
    } catch(e) { return ''; }
  }

  // ── Wisp multiplexed connection ──────────────────────────────────────────
  var TYPE_CONNECT  = 0x01;
  var TYPE_DATA     = 0x02;
  var TYPE_CONTINUE = 0x03;
  var TYPE_CLOSE    = 0x04;
  var REASON_NORMAL = 0x01;

  var _streamId = 1;

  function makePacket(type, id, payload) {
    var hdr = new Uint8Array(5);
    hdr[0] = type;
    new DataView(hdr.buffer).setUint32(1, id, true);
    if (payload && payload.byteLength) {
      var out = new Uint8Array(5 + payload.byteLength);
      out.set(hdr); out.set(new Uint8Array(payload), 5);
      return out.buffer;
    }
    return hdr.buffer;
  }

  function VantaWisp(url) {
    this._url      = url;
    this._ws       = null;
    this._streams  = {};
    this._queue    = [];
    this._ready    = false;
    this._dead     = false;
    this._delay    = 500;
    this._connect();
  }

  VantaWisp.prototype._connect = function() {
    if (this._dead) return;
    var self = this;
    var ws = new WebSocket(this._url);
    ws.binaryType = 'arraybuffer';
    this._ws = ws;

    ws.onopen = function() {
      self._ready = true;
      self._delay = 500;
      self._queue.forEach(function(b) { ws.send(b); });
      self._queue = [];
    };

    ws.onmessage = function(e) { self._parse(e.data); };

    ws.onclose = ws.onerror = function() {
      self._ready = false;
      if (self._dead) return;
      Object.keys(self._streams).forEach(function(id) {
        var s = self._streams[id];
        if (s && s._onclose) s._onclose(0x03);
      });
      self._streams = {};
      var d = self._delay;
      self._delay = Math.min(d * 2, 8000);
      setTimeout(function() { self._connect(); }, d);
    };
  };

  VantaWisp.prototype._parse = function(buf) {
    var view = new DataView(buf);
    if (buf.byteLength < 5) return;
    var type = view.getUint8(0);
    var id   = view.getUint32(1, true);
    var data = buf.byteLength > 5 ? buf.slice(5) : null;
    var s    = this._streams[id];
    if (!s) return;
    if (type === TYPE_DATA)     { if (s._ondata) s._ondata(data); }
    if (type === TYPE_CONTINUE) { if (data) s._credit += new DataView(data).getUint32(0, true); }
    if (type === TYPE_CLOSE)    { var r = data ? new DataView(data).getUint8(0) : 1; s._onclose && s._onclose(r); delete this._streams[id]; }
  };

  VantaWisp.prototype._send = function(buf) {
    if (this._ready) this._ws.send(buf);
    else this._queue.push(buf);
  };

  VantaWisp.prototype.openStream = function(host, port) {
    var id = _streamId++;
    var stream = { id: id, _conn: this, _credit: 128, _ondata: null, _onclose: null };
    this._streams[id] = stream;

    // CONNECT packet: streamType(1) + port(2LE) + hostname
    var hostBytes = new TextEncoder().encode(host);
    var payload   = new Uint8Array(3 + hostBytes.length);
    payload[0] = 0x01; // TCP
    new DataView(payload.buffer).setUint16(1, port, true);
    payload.set(hostBytes, 3);
    this._send(makePacket(TYPE_CONNECT, id, payload.buffer));

    stream.send = function(data) {
      if (stream._credit <= 0) return;
      stream._credit--;
      var buf = (data instanceof ArrayBuffer) ? data :
                (ArrayBuffer.isView(data)) ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) :
                new TextEncoder().encode(data).buffer;
      this._conn._send(makePacket(TYPE_DATA, id, buf));
    }.bind(stream);

    stream.close = function() {
      var r = new Uint8Array([REASON_NORMAL]);
      this._conn._send(makePacket(TYPE_CLOSE, id, r.buffer));
      delete this._conn._streams[id];
    }.bind(stream);

    return stream;
  };

  VantaWisp.prototype.destroy = function() {
    this._dead = true;
    if (this._ws) this._ws.close();
  };

  // ── Singleton connection pool ────────────────────────────────────────────
  var _conn = null;

  function getConn() {
    var wispUrl = (typeof localStorage !== 'undefined' && localStorage.getItem('vanta_wisp')) || '';
    if (!wispUrl) return null;
    if (!_conn || _conn._dead) _conn = new VantaWisp(wispUrl);
    return _conn;
  }

  g.VantaTransport = {
    VantaWisp: VantaWisp,
    getConn:   getConn,
    bareFromWisp: bareFromWisp,
    // Get bare server URL (for SW HTTP fetching)
    getBare: function() {
      var saved = (typeof localStorage !== 'undefined' && localStorage.getItem('vanta_bare')) || '';
      if (saved) return saved;
      var wisp = (typeof localStorage !== 'undefined' && localStorage.getItem('vanta_wisp')) || '';
      return wisp ? bareFromWisp(wisp) : '';
    },
  };

})(typeof globalThis !== 'undefined' ? globalThis : self);
