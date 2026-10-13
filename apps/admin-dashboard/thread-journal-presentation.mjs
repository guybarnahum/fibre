export function journalEntries(document) {
  const lines = String(document ?? "").split(/\r?\n/u);
  const entries = [];
  let current = null;
  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (current) entries.push(current);
      current = { heading:line.slice(3).trim(), lines:[] };
      continue;
    }
    if (current) current.lines.push(line);
  }
  if (current) entries.push(current);
  return Object.freeze(entries.map((entry) => Object.freeze({
    heading:entry.heading,
    lines:Object.freeze([...entry.lines]),
  })));
}

export function threadJournalPresentationModel(journal, authorityEntries = []) {
  const profile = journal?.profile ?? null;
  const entries = journalEntries(journal?.document);
  const authority = Object.freeze(
    Array.isArray(authorityEntries) ? authorityEntries.map((entry) => structuredClone(entry)) : [],
  );
  return Object.freeze({
    profile:profile === null ? null : Object.freeze(structuredClone(profile)),
    entries,
    authorityEntries:authority,
    authorityCount:authority.length,
  });
}

/** Pack whole journal entries into a fixed-height reading area. */
export function packJournalPages(heights, pageHeight) {
  const pages=[];
  let page=[];
  let used=0;
  for (let index=0;index<heights.length;index++){
    const height=Math.max(1,Math.ceil(heights[index]));
    if (page.length && used+height>pageHeight){
      pages.push(page);
      page=[];
      used=0;
    }
    page.push(index);
    used+=height;
  }
  if(page.length)pages.push(page);
  return pages;
}
