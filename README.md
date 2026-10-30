# tiny-network-byte-order

Reads and writes signed and unsigned 16- and 32-bit integers in big-endian (network) byte order into and out of `Uint8Array` buffers.

```js
import {
  readUint16BE,
  readUint32BE,
  readInt16BE,
  readInt32BE,
  writeUint16BE,
  writeUint32BE,
  writeInt16BE,
  writeInt32BE,
} from 'tiny-network-byte-order';

const buf = new Uint8Array(4);
writeUint32BE(buf, 0x12345678, 0);  // → 4 (bytes written)
const n = readUint32BE(buf, 0);     // → 305419896
```

All eight functions take the form `(view, value?, offset = 0)`. The readers return the decoded integer; the writers return the number of bytes written (always 2 or 4) and mutate `view` in place.

## Why this exists

Network protocols encode multi-byte integers most-significant-byte first. `DataView` already handles this, but it is a heavier abstraction: every call pays for a view object and offset bookkeeping that many callers do not need. This library trades that flexibility for eight small, allocation-free functions that operate directly on a `Uint8Array` you already own.

The trade-off: there is no streaming reader, no growable buffer, and no 64-bit support. If you need any of those, use `DataView` or a dedicated protocol library instead.

## Edge cases

- Values are range-checked. `writeUint16BE(buf, 65536)` and `writeInt16BE(buf, -32769)` both throw `RangeError`; non-integers throw `TypeError`.
- Out-of-bounds offsets throw `RangeError`, as do negative offsets.
- Only `Uint8Array` is accepted — a plain `Array` will throw `TypeError`, because its element layout and `byteLength` semantics differ.
- `readUint32BE` returns values up to `4294967295` using `>>> 0` to keep them unsigned; without it, bit 31 would produce a negative number via JavaScript's signed bitwise shift.

## Layout

```
src/index.js   re-exports everything from core.js
src/core.js    the eight functions
```

Run the tests with `node --test`.
