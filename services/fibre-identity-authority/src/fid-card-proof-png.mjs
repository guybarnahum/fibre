import {
  fidCardProofEnvelopeJson,
  normalizeFidCardProofEnvelope,
} from "./fid-card-proof.mjs";

export const FID_CARD_PROOF_PNG_CHUNK_TYPE = "fiDP";

const PNG_SIGNATURE = Buffer.from([137,80,78,71,13,10,26,10]);
const MAX_PROOF_BYTES = 64 * 1024;
const CHUNK_TYPE = Buffer.from(FID_CARD_PROOF_PNG_CHUNK_TYPE, "ascii");

function bytes(name, value) {
  if (Buffer.isBuffer(value)) return value;
  if (value instanceof Uint8Array) return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  if (ArrayBuffer.isView(value)) return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  throw new TypeError(`${name} bytes are required`);
}

function crc32(value) {
  let crc = 0xffffffff;
  for (const byte of value) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunkCrc(typeBytes, data) {
  return crc32(Buffer.concat([typeBytes, data]));
}

function proofChunk(data) {
  if (data.length > MAX_PROOF_BYTES) throw new TypeError("FID card proof PNG payload is too large");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(chunkCrc(CHUNK_TYPE, data));
  return Buffer.concat([length, CHUNK_TYPE, data, checksum]);
}

function chunkType(typeBytes) {
  const type = typeBytes.toString("ascii");
  if (!/^[A-Za-z]{4}$/u.test(type)) throw new TypeError("FID card proof PNG has an invalid chunk type");
  return type;
}

function parsePng(input) {
  const png = bytes("FID card proof PNG", input);
  if (png.length < 20 || !png.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new TypeError("FID card proof input must be PNG");
  }

  const chunks = [];
  let offset = 8;
  let sawIend = false;
  while (offset < png.length) {
    if (offset + 12 > png.length) throw new TypeError("FID card proof PNG is truncated");
    const length = png.readUInt32BE(offset);
    const typeStart = offset + 4;
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const end = dataEnd + 4;
    if (end > png.length) throw new TypeError("FID card proof PNG is truncated");

    const typeBytes = png.subarray(typeStart, dataStart);
    const type = chunkType(typeBytes);
    const data = png.subarray(dataStart, dataEnd);
    const expectedCrc = png.readUInt32BE(dataEnd);
    if (chunkCrc(typeBytes, data) !== expectedCrc) {
      throw new TypeError(`FID card proof PNG chunk ${type} failed CRC validation`);
    }

    chunks.push(Object.freeze({ type, start:offset, dataStart, dataEnd, end, length }));
    offset = end;

    if (type === "IEND") {
      if (length !== 0) throw new TypeError("FID card proof PNG IEND must be empty");
      if (offset !== png.length) throw new TypeError("FID card proof PNG has trailing bytes after IEND");
      sawIend = true;
      break;
    }
  }

  if (!sawIend) throw new TypeError("FID card proof PNG is missing IEND");
  if (chunks[0]?.type !== "IHDR" || chunks[0]?.length !== 13) {
    throw new TypeError("FID card proof PNG must begin with a valid IHDR");
  }
  return { png, chunks };
}

function decodeEnvelope(data) {
  if (data.length === 0 || data.length > MAX_PROOF_BYTES) {
    throw new TypeError("FID card proof PNG payload size is invalid");
  }
  let json;
  try {
    json = new TextDecoder("utf-8", { fatal:true }).decode(data);
  } catch {
    throw new TypeError("FID card proof PNG payload is not valid UTF-8");
  }
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new TypeError("FID card proof PNG payload is not valid JSON");
  }
  const envelope = normalizeFidCardProofEnvelope(parsed);
  if (json !== fidCardProofEnvelopeJson(envelope)) {
    throw new TypeError("FID card proof PNG payload is not canonical");
  }
  return envelope;
}

export function embedFidCardProofInPng({ pngBytes, envelope: rawEnvelope } = {}) {
  const { png, chunks } = parsePng(pngBytes);
  if (chunks.some((chunk) => chunk.type === FID_CARD_PROOF_PNG_CHUNK_TYPE)) {
    throw new TypeError("FID card proof PNG already contains a Fibre proof chunk");
  }
  const envelope = normalizeFidCardProofEnvelope(rawEnvelope);
  const data = Buffer.from(fidCardProofEnvelopeJson(envelope), "utf8");
  const iend = chunks.at(-1);
  if (iend?.type !== "IEND") throw new TypeError("FID card proof PNG is missing terminal IEND");
  return Buffer.concat([
    png.subarray(0, iend.start),
    proofChunk(data),
    png.subarray(iend.start),
  ]);
}

export function extractFidCardProofFromPng(input) {
  const { png, chunks } = parsePng(input);
  const proofChunks = chunks.filter((chunk) => chunk.type === FID_CARD_PROOF_PNG_CHUNK_TYPE);
  if (proofChunks.length === 0) throw new TypeError("FID card proof PNG does not contain a Fibre proof chunk");
  if (proofChunks.length !== 1) throw new TypeError("FID card proof PNG must contain exactly one Fibre proof chunk");

  const chunk = proofChunks[0];
  const envelope = decodeEnvelope(png.subarray(chunk.dataStart, chunk.dataEnd));
  const rawPng = Buffer.concat([
    png.subarray(0, chunk.start),
    png.subarray(chunk.end),
  ]);
  parsePng(rawPng);

  return Object.freeze({
    envelope,
    rawPng,
  });
}
