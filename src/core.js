/**
 * Core read/write functions for big-endian (network byte order) integers.
 *
 * All multi-byte integers on the wire are big-endian (most significant byte first),
 * per IETF RFC 1700. We operate on Uint8Array directly rather than wrapping with
 * a DataView so callers do not pay for view construction or byte-offset bookkeeping
 * they already manage themselves.
 */

// All error messages say "offset" rather than "index" to match buffer / DataView
// conventions and make grep across a codebase easier.

const SIZE_U16 = 2;
const SIZE_U32 = 4;
const RANGE_U16 = 0x10000; // 2^16; any value >= this overflows u16

function assertRange(view, offset, size) {
  // Using instanceof Uint8Array keeps this strict: a regular Array has a
  // different element layout and byteLength semantics, so we refuse it.
  if (!(view instanceof Uint8Array)) {
    throw new TypeError('expected Uint8Array');
  }
  if (!Number.isInteger(offset)) {
    throw new TypeError('offset must be an integer');
  }
  if (offset < 0 || offset + size > view.length) {
    throw new RangeError('offset out of range');
  }
}

// --- Unsigned reads ----------------------------------------------------

export function readUint16BE(view, offset = 0) {
  assertRange(view, offset, SIZE_U16);
  return (view[offset] << 8) | view[offset + 1];
}

export function readUint32BE(view, offset = 0) {
  assertRange(view, offset, SIZE_U32);
  // >>> 0 coerces to an unsigned 32-bit integer, undoing the sign extension
  // that << applies when bit 31 is set. Without it we would return negatives.
  return (
    ((view[offset] << 24) |
      (view[offset + 1] << 16) |
      (view[offset + 2] << 8) |
      view[offset + 3]) >>>
    0
  );
}

// --- Signed reads ------------------------------------------------------

export function readInt16BE(view, offset = 0) {
  const u = readUint16BE(view, offset);
  return u >= 0x8000 ? u - 0x10000 : u;
}

export function readInt32BE(view, offset = 0) {
  const u = readUint32BE(view, offset);
  return u >= 0x80000000 ? u - 0x100000000 : u;
}

// --- Unsigned writes ---------------------------------------------------

export function writeUint16BE(view, value, offset = 0) {
  assertRange(view, offset, SIZE_U16);
  if (!Number.isInteger(value)) {
    throw new TypeError('value must be an integer');
  }
  if (value < 0 || value >= RANGE_U16) {
    throw new RangeError('value out of range for uint16');
  }
  view[offset] = value >>> 8;
  view[offset + 1] = value & 0xff;
  return SIZE_U16;
}

export function writeUint32BE(view, value, offset = 0) {
  assertRange(view, offset, SIZE_U32);
  if (!Number.isInteger(value)) {
    throw new TypeError('value must be an integer');
  }
  if (value < 0 || value > 0xffffffff) {
    throw new RangeError('value out of range for uint32');
  }
  view[offset] = (value >>> 24) & 0xff;
  view[offset + 1] = (value >>> 16) & 0xff;
  view[offset + 2] = (value >>> 8) & 0xff;
  view[offset + 3] = value & 0xff;
  return SIZE_U32;
}

// --- Signed writes -----------------------------------------------------

export function writeInt16BE(view, value, offset = 0) {
  if (!Number.isInteger(value)) {
    throw new TypeError('value must be an integer');
  }
  if (value < -0x8000 || value > 0x7fff) {
    throw new RangeError('value out of range for int16');
  }
  if (value < 0) value += 0x10000;
  return writeUint16BE(view, value, offset);
}

export function writeInt32BE(view, value, offset = 0) {
  if (!Number.isInteger(value)) {
    throw new TypeError('value must be an integer');
  }
  if (value < -0x80000000 || value > 0x7fffffff) {
    throw new RangeError('value out of range for int32');
  }
  if (value < 0) value += 0x100000000;
  return writeUint32BE(view, value, offset);
}
