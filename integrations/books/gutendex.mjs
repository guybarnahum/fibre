// Project Gutenberg's public-domain catalogue, through the Gutendex API.
// A work is returned only when the catalogue attests it is out of copyright
// and offers its plain text; nothing about a work is inferred.
const GUTENDEX_URL = "https://gutendex.com/books/";

const text = (value) => typeof value === "string" && value.trim() ? value.trim() : null;
const year = (value) => Number.isSafeInteger(value) ? value : null;

// "Thoreau, Henry David" reads as "Henry David Thoreau".
function personName(name) {
  const [family, given] = String(name).split(/,\s*/u, 2);
  return given ? `${given} ${family}`.trim() : String(name).trim();
}

export function publicDomainWork(entry) {
  const textUrl = Object.entries(entry?.formats ?? {})
    .find(([mime, url]) => mime.startsWith("text/plain") && typeof url === "string" && !url.endsWith(".zip"))?.[1] ?? null;
  const title = text(entry?.title);
  if (entry?.copyright !== false || !Number.isSafeInteger(entry?.id) || title === null || textUrl === null) return null;
  return Object.freeze({
    source: "gutenberg",
    sourceId: String(entry.id),
    title: title.slice(0, 300),
    authors: Object.freeze((entry.authors ?? []).filter((author) => text(author?.name)).slice(0, 3)
      .map((author) => Object.freeze({ name: personName(author.name).slice(0, 120),
        birthYear: year(author.birth_year), deathYear: year(author.death_year) }))),
    languages: Object.freeze((entry.languages ?? []).filter((code) => /^[a-z]{2,3}$/u.test(code)).slice(0, 4)),
    subjects: Object.freeze([...(entry.subjects ?? []), ...(entry.bookshelves ?? [])]
      .map(text).filter(Boolean).map((subject) => subject.replace(/^Category:\s*/u, "").slice(0, 120)).slice(0, 6)),
    textUrl,
    evidenceRef: `https://www.gutenberg.org/ebooks/${entry.id}`,
  });
}

// One page (up to 32 works) of the public-domain catalogue in a language.
export async function listPublicDomainWorks({ page, language = "en", fetchImpl = globalThis.fetch } = {}) {
  if (!Number.isSafeInteger(page) || page < 1) throw new TypeError("catalogue page must be a positive integer");
  if (!/^[a-z]{2,3}$/u.test(language)) throw new TypeError("catalogue language must be a language code");
  const url = new URL(GUTENDEX_URL);
  url.searchParams.set("languages", language);
  url.searchParams.set("copyright", "false");
  url.searchParams.set("page", String(page));
  const response = await fetchImpl(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`book catalogue ${response.status}`);
  const body = await response.json();
  return Object.freeze((body?.results ?? []).map(publicDomainWork).filter(Boolean));
}
