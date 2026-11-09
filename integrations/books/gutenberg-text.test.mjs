import assert from "node:assert/strict";
import test from "node:test";
import { readGutenbergPassage } from "./gutenberg-text.mjs";

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
