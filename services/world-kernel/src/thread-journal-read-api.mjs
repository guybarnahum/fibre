import { assertId } from "./persistence-common.mjs";

const TOKEN_ENCODER = new TextEncoder();
const ROUTE = /^\/internal\/threads\/([^/]+)\/journal$/u;

function constantTimeEqual(left, right) {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const leftBytes = TOKEN_ENCODER.encode(left);
  const rightBytes = TOKEN_ENCODER.encode(right);
  const length = Math.max(leftBytes.length, rightBytes.length);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}

export function createThreadJournalReadApi({ journalBook, privateToken }) {
  if (journalBook === null || typeof journalBook !== "object" || typeof journalBook.read !== "function") {
    throw new TypeError("journal read API requires journalBook.read");
  }
  return Object.freeze({
    async fetch(request) {
      const url = new URL(request.url);
      const match = ROUTE.exec(url.pathname);
      if (match === null) return null;
      if (request.method !== "GET") return Response.json({ error:"method_not_allowed" }, { status:405 });
      if (!constantTimeEqual(request.headers.get("x-fibre-private-token"), privateToken)) {
        return Response.json({ error:"private_token_required" }, { status:403 });
      }
      const threadId = decodeURIComponent(match[1]);
      assertId("journal threadId", threadId);
      const book = await journalBook.read(threadId);
      if (book === null) return Response.json({ journal:null }, { headers:{ "cache-control":"no-store" } });
      return Response.json({
        journal:{
          objectKey:journalBook.key(threadId),
          profile:book.profile,
          document:book.document,
        },
      }, { headers:{ "cache-control":"no-store" } });
    },
  });
}
