// The actual pages of a Project Gutenberg text, a bounded passage at a time.
// Only the bytes needed are read: a Range request, and the stream is closed
// as soon as the passage is in hand, so a whole book is never downloaded.
const START_MARKER = /\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG E(?:BOOK|TEXT)[^\n]*\n/iu;
const END_MARKER = /\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG E(?:BOOK|TEXT)/iu;
const FIRST_LOOK_BYTES = 48_000;

// Gutenberg's current home for a book's plain text. Older catalogue links
// (for example /files/…) can be gone; this one is tried first, then the
// catalogue's own link.
const canonicalText = (sourceId) => /^\d+$/u.test(String(sourceId ?? ""))
  ? `https://www.gutenberg.org/cache/epub/${sourceId}/pg${sourceId}.txt` : null;

async function readBytes(textUrls, from, length, fetchImpl) {
  let response = null;
  for (const url of textUrls) {
    response = await fetchImpl(url, { headers: { Range: `bytes=${from}-${from + length - 1}` },
      redirect: "follow", signal: AbortSignal.timeout(20_000) });
    if (response.ok || response.status !== 404) break;
  }
  if (!response.ok) throw new Error(`book text ${response.status}`);
  // A server that ignores Range returns the whole book from its first byte.
  let skip = response.status === 206 ? 0 : from;
  const chunks = [];
  let held = 0;
  const reader = response.body.getReader();
  try {
    while (held < length) {
      const { done, value } = await reader.read();
      if (done) break;
      let chunk = value;
      if (skip > 0) { const cut = Math.min(skip, chunk.length); chunk = chunk.subarray(cut); skip -= cut; }
      chunks.push(chunk);
      held += chunk.length;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const bytes = new Uint8Array(held);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk.subarray(0, Math.max(0, held - offset)), offset); offset += chunk.length; }
  return bytes.subarray(0, Math.min(held, length));
}

// The passage beginning at fromByte (null: the book's first page, after the
// Gutenberg header), ending at a paragraph, else a sentence, else a word,
// near maxChars. nextByte is where this reader stops and will start next
// time; null when the book is finished.
export async function readGutenbergPassage({ sourceId = null, textUrl, fromByte = null, maxChars = 1500,
  fetchImpl = globalThis.fetch } = {}) {
  if (typeof textUrl !== "string" || !textUrl.startsWith("https://")) throw new TypeError("book text must be an https link");
  const textUrls = [...new Set([canonicalText(sourceId), textUrl].filter(Boolean))];
  if (fromByte !== null && (!Number.isSafeInteger(fromByte) || fromByte < 0)) throw new TypeError("reading position must be a byte offset");
  const encoder = new TextEncoder();
  const from = fromByte ?? 0;
  const raw = new TextDecoder("utf-8").decode(
    await readBytes(textUrls, from, fromByte === null ? FIRST_LOOK_BYTES : maxChars * 4, fetchImpl));
  let offset = 0;
  if (fromByte === null) {
    const marker = START_MARKER.exec(raw);
    if (marker !== null) offset = marker.index + marker[0].length;
  }
  const lead = raw.slice(offset).search(/\S/u);
  const startByte = (at) => from + encoder.encode(raw.slice(0, at)).length;
  if (lead < 0) return Object.freeze({ text: "", startByte: startByte(offset), nextByte: null });
  offset += lead;
  let rest = raw.slice(offset);
  const end = END_MARKER.exec(rest);
  if (end !== null) rest = rest.slice(0, end.index);
  let length = rest.length;
  if (rest.length > maxChars) {
    const window = rest.slice(0, maxChars);
    const sentence = Math.max(...[". ", "! ", "? ", ".\n", "!\n", "?\n"].map((stop) => window.lastIndexOf(stop) + 1));
    length = [window.lastIndexOf("\n\n"), sentence, window.lastIndexOf(" ")].find((index) => index > maxChars / 2) ?? maxChars;
  }
  const finished = end !== null && length >= rest.length;
  return Object.freeze({
    text: rest.slice(0, length).replace(/\uFFFD/gu, "").trim(),
    startByte: startByte(offset),
    nextByte: finished ? null : startByte(offset) + encoder.encode(rest.slice(0, length)).length,
  });
}
