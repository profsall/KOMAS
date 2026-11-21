#!/usr/bin/env node
/**
 * Bridge Demung Tutor — WebSocket (app) ⇄ TCP (ESP-01).
 *
 * Jalankan di laptop:
 *   node bridge.js --port 8081 --esp 192.168.1.50:2000
 *   node bridge.js --esp dummy        # test tanpa alat
 *
 * Semua data diteruskan apa adanya (byte-per-byte), bridge tidak mengerti isi pesan.
 */
'use strict';

const net = require('net');
const http = require('http');

/* ---------- argumen ---------- */
const args = process.argv.slice(2);
function arg(nama, def) {
  const i = args.indexOf(nama);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
}
const PORT_WS = parseInt(arg('--port', '8081'), 10);
const ESP = arg('--esp', 'dummy'); // "ip:port" atau "dummy"

/* ---------- WebSocket server (implementasi manual, tanpa dependensi) ---------- */
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Demung Tutor bridge. Sambung via WebSocket.');
});

const crypto = require('crypto');
const clients = new Set();

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) return socket.destroy();

  const accept = crypto
    .createHash('sha1')
    .update(key + GUID)
    .digest('base64');

  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
  );

  const client = { socket, terbuka: true };
  clients.add(client);
  log('app tersambung (' + clients.size + ' aktif)');

  socket.on('data', (buf) => {
    const frames = decodeFrames(buf);
    for (const f of frames) {
      if (f.opcode === 8) {
        // close
        socket.end();
        return;
      }
      if (f.text !== null && f.text.length) {
        teruskanKeAlat(f.text);
      }
    }
  });

  socket.on('close', () => {
    clients.delete(client);
    log('app terputus (' + clients.size + ' aktif)');
  });
  socket.on('error', () => {});
});

/* ---------- frame parser WebSocket (cukup untuk pesan kecil) ---------- */
function decodeFrames(buf) {
  const hasil = [];
  let i = 0;
  while (i + 2 <= buf.length) {
    const finOp = buf[i];
    const opcode = finOp & 0x0f;
    const masked = (buf[i + 1] & 0x80) !== 0;
    let len = buf[i + 1] & 0x7f;
    let off = i + 2;
    if (len === 126) {
      len = buf.readUInt16BE(off);
      off += 2;
    } else if (len === 127) {
      len = Number(buf.readBigUInt64BE(off));
      off += 8;
    }
    if (!masked) break;
    const mask = buf.slice(off, off + 4);
    off += 4;
    const payload = Buffer.allocUnsafe(len);
    for (let j = 0; j < len; j++) {
      payload[j] = buf[off + j] ^ mask[j % 4];
    }
    hasil.push({ opcode, text: opcode === 1 ? payload.toString('utf8') : null });
    i = off + len;
  }
  return hasil;
}

function encodeFrame(text) {
  const payload = Buffer.from(text, 'utf8');
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.from([0x81, len]);
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, payload]);
}

function kirimKeApp(text) {
  const frame = encodeFrame(text);
  for (const c of clients) {
    if (c.terbuka && !c.socket.destroyed) {
      try {
        c.socket.write(frame);
      } catch (_) {}
    }
  }
}

/* ---------- klien TCP ke ESP-01 ---------- */
let alat = null;
let alatDummy = ESP === 'dummy';

function sambungAlat() {
  if (alatDummy) {
    log('mode dummy — pesan dari app akan dijawab sendiri');
    return;
  }
  const [host, port] = ESP.split(':');
  const sock = net.createConnection({ host, port: parseInt(port || '2000', 10) }, () => {
    log('alat tersambung: ' + ESP);
  });
  alat = sock;
  sock.on('data', (buf) => {
    log('alat -> ' + buf.toString('utf8').trim());
    kirimKeApp(buf.toString('utf8'));
  });
  sock.on('close', () => {
    log('alat terputus, coba lagi dalam 3 dtk');
    alat = null;
    setTimeout(sambungAlat, 3000);
  });
  sock.on('error', (e) => {
    log('alat error: ' + e.message);
  });
}

function teruskanKeAlat(text) {
  log('app -> ' + text.trim());
  if (alatDummy) {
    // Simulasi alat supaya app bisa dites tanpa hardware.
    const t = text.trim();
    if (t === 'P') {
      kirimKeApp('PONG\n');
    } else if (t === 'L,0') {
      kirimKeApp('READY\n');
    } else if (t.startsWith('N,')) {
      const bilah = parseInt(t.slice(2), 10);
      // tiru user memukul bilah yang benar setelah 300 ms
      setTimeout(() => {
        kirimKeApp(`H,${bilah},640,${Date.now() % 100000}\n`);
        kirimKeApp(`R,${bilah},1,300\n`);
      }, 300);
    }
    return;
  }
  if (alat && !alat.destroyed) alat.write(text);
  else log('alat belum tersambung, pesan dibuang');
}

/* ---------- util ---------- */
function log(msg) {
  const t = new Date().toISOString().slice(11, 19);
  console.log(`[${t}] ${msg}`);
}

server.listen(PORT_WS, () => {
  log(`bridge jalan: ws://0.0.0.0:${PORT_WS}`);
  log(`target alat: ${ESP}`);
  sambungAlat();
});
