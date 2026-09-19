const PNG_SIGNATURE = [137,80,78,71,13,10,26,10];

function assertBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  throw new TypeError("FID photo bytes are required");
}

function u32(bytes, offset) {
  return new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, false);
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : (pb <= pc ? b : c);
}

async function inflate(bytes) {
  if (typeof DecompressionStream !== "function") throw new Error("FID runtime cannot decode PNG photos");
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function decodePngRgba(input) {
  const bytes = assertBytes(input);
  if (bytes.length < 33 || PNG_SIGNATURE.some((value, index) => bytes[index] !== value)) {
    throw new TypeError("FID photo must be PNG");
  }

  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = -1;
  let interlace = -1;
  let palette = null;
  let paletteAlpha = null;
  const idat = [];
  for (let offset = 8; offset + 12 <= bytes.length;) {
    const length = u32(bytes, offset);
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    const start = offset + 8;
    const end = start + length;
    if (end + 4 > bytes.length) throw new TypeError("FID photo PNG is truncated");
    if (type === "IHDR") {
      width = u32(bytes, start);
      height = u32(bytes, start + 4);
      bitDepth = bytes[start + 8];
      colorType = bytes[start + 9];
      interlace = bytes[start + 12];
    } else if (type === "PLTE") {
      palette = bytes.slice(start, end);
    } else if (type === "tRNS") {
      paletteAlpha = bytes.slice(start, end);
    } else if (type === "IDAT") {
      idat.push(bytes.slice(start, end));
    } else if (type === "IEND") {
      break;
    }
    offset = end + 4;
  }

  const channels = ({ 0:1, 2:3, 3:1, 4:2, 6:4 })[colorType] ?? 0;
  if (width < 1 || height < 1 || bitDepth !== 8 || channels === 0 || interlace !== 0 || idat.length === 0
    || (colorType === 3 && (palette === null || palette.length === 0 || palette.length % 3 !== 0))) {
    throw new TypeError("FID photo PNG format is unsupported");
  }

  const compressedLength = idat.reduce((total, chunk) => total + chunk.length, 0);
  const compressed = new Uint8Array(compressedLength);
  let cursor = 0;
  for (const chunk of idat) { compressed.set(chunk, cursor); cursor += chunk.length; }
  const raw = await inflate(compressed);
  const stride = width * channels;
  if (raw.length !== height * (stride + 1)) throw new TypeError("FID photo PNG pixels are invalid");

  const pixels = new Uint8Array(height * stride);
  for (let y = 0; y < height; y += 1) {
    const source = y * (stride + 1);
    const filter = raw[source];
    const row = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const value = raw[source + 1 + x];
      const left = x >= channels ? pixels[row + x - channels] : 0;
      const above = y > 0 ? pixels[row - stride + x] : 0;
      const upperLeft = y > 0 && x >= channels ? pixels[row - stride + x - channels] : 0;
      let decoded;
      if (filter === 0) decoded = value;
      else if (filter === 1) decoded = value + left;
      else if (filter === 2) decoded = value + above;
      else if (filter === 3) decoded = value + Math.floor((left + above) / 2);
      else if (filter === 4) decoded = value + paeth(left, above, upperLeft);
      else throw new TypeError("FID photo PNG filter is unsupported");
      pixels[row + x] = decoded & 0xff;
    }
  }

  const rgba = new Uint8Array(width * height * 4);
  for (let source = 0, target = 0; source < pixels.length; source += channels, target += 4) {
    if (colorType === 0) {
      rgba[target] = pixels[source];
      rgba[target + 1] = pixels[source];
      rgba[target + 2] = pixels[source];
      rgba[target + 3] = 255;
    } else if (colorType === 2) {
      rgba[target] = pixels[source];
      rgba[target + 1] = pixels[source + 1];
      rgba[target + 2] = pixels[source + 2];
      rgba[target + 3] = 255;
    } else if (colorType === 4) {
      rgba[target] = pixels[source];
      rgba[target + 1] = pixels[source];
      rgba[target + 2] = pixels[source];
      rgba[target + 3] = pixels[source + 1];
    } else if (colorType === 3) {
      const index = pixels[source];
      const paletteOffset = index * 3;
      if (paletteOffset + 2 >= palette.length) throw new TypeError("FID photo PNG palette is invalid");
      rgba[target] = palette[paletteOffset];
      rgba[target + 1] = palette[paletteOffset + 1];
      rgba[target + 2] = palette[paletteOffset + 2];
      rgba[target + 3] = paletteAlpha?.[index] ?? 255;
    } else {
      rgba[target] = pixels[source];
      rgba[target + 1] = pixels[source + 1];
      rgba[target + 2] = pixels[source + 2];
      rgba[target + 3] = pixels[source + 3];
    }
  }
  return Object.freeze({ width, height, rgba });
}
