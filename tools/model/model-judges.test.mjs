import assert from "node:assert/strict";
import test from "node:test";
import { createClaudeAdapter } from "./model-judges.mjs";

test("a judge that is rate-limited waits as asked and still gives its verdict", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) return new Response(JSON.stringify({ error:{ message:"rate limit" } }), { status:429, headers:{ "retry-after":"0.01" } });
    return Response.json({ stop_reason:"end_turn", content:[{ type:"text", text:JSON.stringify({ acceptable:true }) }],
      usage:{ input_tokens:10, output_tokens:2 } });
  };
  const judge = createClaudeAdapter({ model:"claude-opus-5-5", apiKey:"test", fetchImpl });
  const { output } = await judge.invoke({ systemPrompt:"judge", input:{}, responseSchema:{ type:"object" } });
  assert.deepEqual(output, { acceptable:true }, "a rate limit was counted as a verdict the judge could not give");
  assert.equal(calls, 2);
});
