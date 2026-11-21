import * as fs from 'fs';
import * as path from 'path';
import { parse as babelParse } from '@babel/core';

describe('Bridge', () => {
  it('bisa dibuat tanpa langsung konek', () => {
    const { Bridge } = require('../src/net/bridge');
    const b = new Bridge({ onPesan: () => {}, onStatus: () => {} });
    expect(b).toBeTruthy();
    // kirim sebelum sambung harus gagal, bukan crash
    expect(b.kirim('P\n')).toBe(false);
    b.putus();
  });
});

describe('App.tsx dan bundle lain', () => {
  it('App.tsx bisa di-parse sebagai TSX valid', () => {
    const file = path.join(__dirname, '..', 'App.tsx');
    const kode = fs.readFileSync(file, 'utf8');
    const hasil = babelParse(kode, {
      filename: 'App.tsx',
      presets: [
        ['@babel/preset-typescript', { isTSX: true, allExtensions: true }],
      ],
      configFile: false,
      babelrc: false,
    });
    expect(hasil).toBeTruthy();
    expect(hasil!.type).toBe('File');
  });

  it('bridge/bridge.js valid secara sintaks', () => {
    const file = path.join(__dirname, '..', 'bridge', 'bridge.js');
    const kode = fs.readFileSync(file, 'utf8');
    // new Function() tidak menerima shebang, padahal node menerimanya
    const tanpaShebang = kode.replace(/^#!.*\n/, '');
    expect(() => new Function(tanpaShebang)).not.toThrow();
  });
});
