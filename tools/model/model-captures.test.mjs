import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { meteredReasoningIntegration } from "../../infra/deployments/integration-selection.mjs";
import { promptFor } from "../../services/world-kernel/src/cognition-prompts.mjs";
import { recordedRequests } from "./model-captures.mjs";
import { captures } from "./model-recorded-requests.mjs";

test("a reflection recorded in the World's logs comes back as the very request a candidate model is judged on", async () => {
  const prompt = promptFor("experience.consolidation");
  const input = { thread:{ identity:{ name:"Habiba" } }, experiences:[{ experienceText:"Kadir asked about my notes." }] };
  const lines = [];
  const world = meteredReasoningIntegration({ provider:"openai", modelId:"gpt-test", configuration:{},
    invoke:async () => ({ output:{ journal:"a quiet day" }, provenance:{ modelId:"gpt-test" } }) },
  { port:"livedNow", captureDepths:["deep"], log:(line) => lines.push(JSON.parse(line)) });
  await world.invoke({ clientRequestId:`consolidation_${"b".repeat(24)}`, depth:"deep",
    promptRef:`${prompt.id}@${prompt.version}`, input, responseSchema:{ type:"object" } });
  // Workers Logs parses a JSON log line into the event's source; one record was cut short.
  const logged = [...lines.map((source) => ({ source })),
    { source:{ event:"model-capture", prompt:`${prompt.id}@${prompt.version}`, capture:"{\"input\":" } }];
  const { events, broken } = recordedRequests(logged);
  assert.equal(broken, 1, "a record cut short in the logs was not set aside");
  const directory = await mkdtemp(join(tmpdir(), "fibre-captures-"));
  await writeFile(join(directory, "captures.json"), JSON.stringify({ events }));
  const { found } = await captures(directory, "experience.consolidation");
  assert.deepEqual(found.map((event) => [event.input, event.output]), [[input, { journal:"a quiet day" }]],
    "the request judged is not the one the Thread made");
});
