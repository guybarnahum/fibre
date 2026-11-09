import assert from "node:assert/strict";
import test from "node:test";
import { publicDomainWork } from "./gutendex.mjs";

test("only a work the catalogue attests as public domain, with its text, becomes a work", () => {
  const entry = { id: 205, title: "Walden, and On The Duty Of Civil Disobedience", copyright: false,
    authors: [{ name: "Thoreau, Henry David", birth_year: 1817, death_year: 1862 }], languages: ["en"],
    subjects: ["Solitude", "Nature"], bookshelves: ["Category: Philosophy"],
    formats: { "text/plain; charset=us-ascii": "https://www.gutenberg.org/ebooks/205.txt.utf-8" } };
  const work = publicDomainWork(entry);
  assert.deepEqual([work.sourceId, work.authors[0].name, work.subjects.at(-1)], ["205", "Henry David Thoreau", "Philosophy"],
    "the catalogue's own identity, author and subjects were not kept");
  assert.equal(publicDomainWork({ ...entry, copyright: true }), null, "an in-copyright work became readable");
  assert.equal(publicDomainWork({ ...entry, formats: {} }), null, "a work without its text became readable");
});
