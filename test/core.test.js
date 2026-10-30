import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  readUint16BE,
  readUint32BE,
  readInt16BE,
  readInt32BE,
  writeUint16BE,
  writeUint32BE,
  writeInt16BE,
  writeInt32BE,
} from '../src/index.js';

function buf(bytes) {
  return new Uint8Array(bytes);
}

// --- Unsigned reads ----------------------------------------------------

test('readUint16BE reads common values', () => {
  assert.equal(readUint16BE(buf([0x12, 0x34])), 0x1234);
  assert.equal(readUint16BE(buf([0xff, 0xff])), 65535);
  assert.equal(readUint16BE(buf([0x00, 0x00])), 0);
});

test('readUint16BE respects offset', () => {
  assert.equal(readUint16BE(buf([0x00, 0xab, 0xcd]), 1), 0xabcd);
});

test('readUint32BE reads common values', () => {
  assert.equal(readUint32BE(buf([0x12, 0x34, 0x56, 0x78])), 0x12345678);
  assert.equal(readUint32BE(buf([0xff, 0xff, 0xff, 0xff])), 4294967295);
});

test('readUint32BE returns unsigned for high bit set', () => {
  assert.equal(readUint32BE(buf([0x80, 0x00, 0x00, 0x00])), 2147483648);
});

// --- Signed reads ------------------------------------------------------

test('readInt16BE handles negative via two\'s complement', () => {
  assert.equal(readInt16BE(buf([0xff, 0xff])), -1);
  assert.equal(readInt16BE(buf([0x80, 0x00])), -32768);
  assert.equal(readInt16BE(buf([0x7f, 0xff])), 32767);
});

test('readInt32BE handles negative via two\'s complement', () => {
  assert.equal(readInt32BE(buf([0xff, 0xff, 0xff, 0xff])), -1);
  assert.equal(readInt32BE(buf([0x80, 0x00, 0x00, 0x00])), -2147483648);
  assert.equal(readInt32BE(buf([0x7f, 0xff, 0xff, 0xff])), 2147483647);
});

test('readInt32BE offset variant works', () => {
  assert.equal(readInt32BE(buf([0x00, 0x80, 0x00, 0x00, 0x00]), 1), -2147483648);
});

// --- Unsigned writes ---------------------------------------------------

test('writeUint16BE writes into provided buffer and returns bytes written', () => {
  const out = new Uint8Array(2);
  assert.equal(writeUint16BE(out, 0x1234), 2);
  assert.deepEqual(Array.from(out), [0x12, 0x34]);
});

test('writeUint16BE at offset', () => {
  const out = new Uint8Array(3);
  writeUint16BE(out, 0xabcd, 1);
  assert.deepEqual(Array.from(out), [0x00, 0xab, 0xcd]);
});

test('writeUint16BE boundary values', () => {
  const a = new Uint8Array(2);
  writeUint16BE(a, 0);
  assert.deepEqual(Array.from(a), [0x00, 0x00]);
  const b = new Uint8Array(2);
  writeUint16BE(b, 65535);
  assert.deepEqual(Array.from(b), [0xff, 0xff]);
});

test('writeUint32BE writes all four bytes', () => {
  const out = new Uint8Array(4);
  writeUint32BE(out, 0x12345678);
  assert.deepEqual(Array.from(out), [0x12, 0x34, 0x56, 0x78]);
});

test('writeUint32BE handles max uint32', () => {
  const out = new Uint8Array(4);
  writeUint32BE(out, 4294967295);
  assert.deepEqual(Array.from(out), [0xff, 0xff, 0xff, 0xff]);
});

// --- Signed writes -----------------------------------------------------

test('writeInt16BE writes negative values in two\'s complement', () => {
  const out = new Uint8Array(2);
  writeInt16BE(out, -1);
  assert.deepEqual(Array.from(out), [0xff, 0xff]);
});

test('writeInt16BE boundaries', () => {
  const lo = new Uint8Array(2);
  writeInt16BE(lo, -32768);
  assert.deepEqual(Array.from(lo), [0x80, 0x00]);
  const hi = new Uint8Array(2);
  writeInt16BE(hi, 32767);
  assert.deepEqual(Array.from(hi), [0x7f, 0xff]);
});

test('writeInt32BE negative end-to-end', () => {
  const out = new Uint8Array(4);
  writeInt32BE(out, -1);
  assert.deepEqual(Array.from(out), [0xff, 0xff, 0xff, 0xff]);
  assert.equal(readInt32BE(out), -1);
});

test('writeInt32BE boundary values round-trip', () => {
  for (const v of [0, -1, 2147483647, -2147483648]) {
    const out = new Uint8Array(4);
    writeInt32BE(out, v);
    assert.equal(readInt32BE(out), v);
  }
});

// --- Round-trip --------------------------------------------------------

test('round trip across all widths', () => {
  const cases = [
    [writeUint16BE, readUint16BE, 4660],
    [writeUint16BE, readUint16BE, 65535],
    [writeUint32BE, readUint32BE, 305419896],
    [writeUint32BE, readUint32BE, 4294967295],
    [writeInt16BE, readInt16BE, -1],
    [writeInt16BE, readInt16BE, 32767],
    [writeInt32BE, readInt32BE, -2147483648],
    [writeInt32BE, readInt32BE, 2147483647],
  ];
  for (const [write, read, value] of cases) {
    const size = write.length === 3 ? new Uint8Array(4) : new Uint8Array(4);
    // Write into a buffer large enough for any width.
    const buf = new Uint8Array(4);
    write(buf, value, 0);
    assert.equal(read(buf, 0), value);
  }
});

// --- Error paths -------------------------------------------------------

test('read functions reject insufficient buffer', () => {
  assert.throws(() => readUint16BE(buf([0x12])), RangeError);
  assert.throws(() => readUint32BE(buf([0x12, 0x34])), RangeError);
});

test('read rejects negative offset', () => {
  assert.throws(() => readUint16BE(buf([0x00, 0x00]), -1), RangeError);
});

test('read rejects non-Uint8Array input', () => {
  assert.throws(() => readUint16BE([0, 1]), TypeError);
});

test('write rejects out-of-range values', () => {
  assert.throws(() => writeUint16BE(new Uint8Array(2), 65536), RangeError);
  assert.throws(() => writeUint16BE(new Uint8Array(2), -1), RangeError);
  assert.throws(() => writeUint32BE(new Uint8Array(4), 4294967296), RangeError);
  assert.throws(() => writeInt16BE(new Uint8Array(2), 32768), RangeError);
  assert.throws(() => writeInt16BE(new Uint8Array(2), -32769), RangeError);
});

test('write rejects non-integer values', () => {
  assert.throws(() => writeUint16BE(new Uint8Array(2), 3.5), TypeError);
});

test('write rejects insufficient buffer', () => {
  assert.throws(() => writeUint16BE(new Uint8Array(1), 0), RangeError);
});
