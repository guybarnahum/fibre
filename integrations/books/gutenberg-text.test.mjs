import assert from "node:assert/strict";
import test from "node:test";
import { fetchGutenbergText, readGutenbergPassage } from "./gutenberg-text.mjs";

const book = "The Project Gutenberg eBook of Walden\n\n*** START OF THE PROJECT GUTENBERG EBOOK WALDEN ***\n\n\n"
  + Array.from({ length: 40 }, (_, i) => `Paragraph ${i} — when I wrote the following pages, I lived alone, in the woods.`).join("\n\n")
  + "\n\n*** END OF THE PROJECT GUTENBERG EBOOK WALDEN ***\nLicense text.";
const bytes = new TextEncoder().encode(book);
const ranged = async (url, { headers }) => {
  const [, from, to] = /bytes=(\d+)-(\d+)/u.exec(headers.Range);
  return new Response(bytes.slice(Number(from), Number(to) + 1), { status: 206 });
};

test("a reader starts on the book's first page and each reading continues exactly where the last stopped, to the end", async () => {
  let from = null, read = "", turns = 0;
  do {
    const passage = await readGutenbergPassage({ textUrl: "https://example.org/walden.txt", fromByte: from, maxChars: 600, fetchImpl: ranged });
    if (turns === 0) assert.ok(passage.text.startsWith("Paragraph 0"), "the first page was the catalogue header, not the book");
    read += `${passage.text}\n\n`;
    from = passage.nextByte;
    turns += 1;
  } while (from !== null && turns < 50);
  assert.equal(from, null, "the end of the book was never reached");
  assert.equal(read.match(/Paragraph \d+/gu).length, 40, "a reading skipped or repeated part of the book");
  assert.ok(!read.includes("License"), "the catalogue's licence was read as the book");
});

test("a catalogue link that is gone does not keep a reader from the book", async () => {
  const asked = [];
  const moved = async (url, init) => {
    asked.push(String(url));
    return String(url).includes("/cache/epub/205/") ? ranged(url, init) : new Response("", { status: 404 });
  };
  const passage = await readGutenbergPassage({ sourceId: "205", textUrl: "https://www.gutenberg.org/files/205/205.txt",
    maxChars: 600, fetchImpl: moved });
  assert.ok(passage.text.startsWith("Paragraph 0"), "the book could not be read once its old link was gone");
});

test("a busy catalogue is asked again, then its mirrors; one that is down does not keep a reader from the book", async () => {
  const asked = [];
  const down = async (url, init) => {
    asked.push(new URL(url).host);
    return new URL(url).host === "www.gutenberg.org" ? new Response("busy", { status: 503 }) : ranged(url, init);
  };
  const passage = await readGutenbergPassage({ sourceId: "205", textUrl: "https://www.gutenberg.org/files/205/205.txt",
    maxChars: 600, fetchImpl: down });
  assert.ok(passage.text.startsWith("Paragraph 0"), "a busy catalogue kept the reader from the book");
  assert.deepEqual(asked.slice(0, 3), ["www.gutenberg.org", "www.gutenberg.org", "gutenberg.pglaf.org"],
    "a busy source was not asked again before the reader moved on to a mirror");
});

test("a library's own copy is read without the catalogue, and gives the same pages", async () => {
  const kept = { read: (from, length) => bytes.slice(from, from + length) };
  const nowhere = async () => { throw new Error("offline"); };
  const fromCopy = await readGutenbergPassage({ textUrl: "https://example.org/walden.txt", maxChars: 600, kept, fetchImpl: nowhere });
  const fromCatalogue = await readGutenbergPassage({ textUrl: "https://example.org/walden.txt", maxChars: 600, fetchImpl: ranged });
  assert.deepEqual(fromCopy, fromCatalogue, "the kept copy read differently from the catalogue");
  const whole = await fetchGutenbergText({ sourceId: "205", textUrl: "https://example.org/walden.txt",
    fetchImpl: async () => new Response(bytes, { status: 200 }) });
  assert.equal(whole.bytes.length, bytes.length, "a whole book fetched to keep was cut short");
  assert.equal(whole.fetchedFrom, "www.gutenberg.org", "where a kept book came from was not recorded");
});
