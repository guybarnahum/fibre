// The actual pages of a Project Gutenberg text, a bounded passage at a time.
// Only the bytes needed are read: a Range request, and the stream is closed
// as soon as the passage is in hand, so a whole book is never downloaded to
// read a page. A library may keep its own copy of a book (World's, once
// fetched whole); then its pages no longer depend on Gutenberg being up.
const START_MARKER = /\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG E(?:BOOK|TEXT)[^\n]*\n/iu;
const END_MARKER = /\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG E(?:BOOK|TEXT)/iu;
const FIRST_LOOK_BYTES = 48_000;
const MAX_BOOK_BYTES = 16_000_000;
const ATTEMPTS = 2;
const RETRY_AFTER_MS = 1_500;
const HEADERS = Object.freeze({ "User-Agent": "FibreWorldLibrary/1.0 (a library for persistent artificial persons)" });

// Where a book's plain text can be found, in order: Gutenberg's current home
// for it, its mirrors at the same path, then the catalogue's own link (older
// links, for example /files/…, can be gone).
export const GUTENBERG_HOSTS = Object.freeze([
  "https://www.gutenberg.org", "https://gutenberg.pglaf.org", "https://aleph.gutenberg.org",
]);
export function gutenbergTextUrls({ sourceId = null, textUrl }) {
  if (typeof textUrl !== "string" || !textUrl.startsWith("https://")) throw new TypeError("book text must be an https link");
  const id = String(sourceId ?? "");
  const cached = /^\d+$/u.test(id) ? GUTENBERG_HOSTS.map((host) => `${host}/cache/epub/${id}/pg${id}.txt`) : [];
  return [...new Set([...cached, textUrl])];
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const busy = (status) => status === 429 || status >= 500;

// The first source that answers: a source that has no such book is passed
// over at once; a busy one is asked again after a moment, then passed over.
async function answer(urls, init, fetchImpl) {
  let last = null;
  for (const url of urls) {
    for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
      try {
        const response = await fetchImpl(url, { ...init, headers: { ...HEADERS, ...(init.headers ?? {}) },
          redirect: "follow", signal: AbortSignal.timeout(20_000) });
        if (response.ok) return { response, url };
        last = `book text ${response.status}`;
        await response.body?.cancel?.().catch?.(() => {});
        if (!busy(response.status)) break;
      } catch (error) {
        last = String(error?.message ?? error);
      }
      if (attempt < ATTEMPTS) await pause(RETRY_AFTER_MS);
    }
  }
  throw new Error(last ?? "book text unavailable");
}

async function take(response, skip, length) {
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
  const bytes = new Uint8Array(Math.min(held, length));
  let offset = 0;
  for (const chunk of chunks) {
    if (offset >= bytes.length) break;
    bytes.set(chunk.subarray(0, bytes.length - offset), offset);
    offset += chunk.length;
  }
  return bytes;
}

async function readBytes(urls, from, length, fetchImpl) {
  const { response } = await answer(urls, { headers: { Range: `bytes=${from}-${from + length - 1}` } }, fetchImpl);
  // A server that ignores Range returns the whole book from its first byte.
  return take(response, response.status === 206 ? 0 : from, length);
}

// A whole book's text, once, for a library to keep: its bytes and where they
// came from.
export async function fetchGutenbergText({ sourceId = null, textUrl, fetchImpl = globalThis.fetch } = {}) {
  const { response, url } = await answer(gutenbergTextUrls({ sourceId, textUrl }), {}, fetchImpl);
  const bytes = await take(response, 0, MAX_BOOK_BYTES + 1);
  if (bytes.length > MAX_BOOK_BYTES) throw new Error("book text too long to keep");
  if (bytes.length === 0) throw new Error("book text empty");
  return Object.freeze({ bytes, fetchedFrom: new URL(url).host });
}

// The passage beginning at fromByte (null: the book's first page, after the
// Gutenberg header), ending at a paragraph, else a sentence, else a word,
// near maxChars. nextByte is where this reader stops and will start next
// time; null when the book is finished. `kept` is the library's own copy,
// when it has one: { read(from, length) } giving that book's bytes.
export async function readGutenbergPassage({ sourceId = null, textUrl, fromByte = null, maxChars = 1500,
  fetchImpl = globalThis.fetch, kept = null } = {}) {
  const textUrls = gutenbergTextUrls({ sourceId, textUrl });
  if (fromByte !== null && (!Number.isSafeInteger(fromByte) || fromByte < 0)) throw new TypeError("reading position must be a byte offset");
  const encoder = new TextEncoder();
  const from = fromByte ?? 0;
  const wanted = fromByte === null ? FIRST_LOOK_BYTES : maxChars * 4;
  const raw = new TextDecoder("utf-8").decode(kept !== null
    ? kept.read(from, wanted) : await readBytes(textUrls, from, wanted, fetchImpl));
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
