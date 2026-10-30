// fibre-test-lifecycle: regression
// fibre-test-scope: birth-center
// fibre-test-purpose: reject-incompatible-birth-model-schemas-before-deployment
import assert from "node:assert/strict";
import test from "node:test";
import {
  assertOpenAIStrictResponseSchema,projectOpenAIStructuredOutputSchema,
} from "../../../integrations/ai/reasoning/openai.mjs";
import {
  BIRTH_RESPONSE_SCHEMAS,assertBirthResponseSchemaPatterns,
} from "../src/model-response-schemas.mjs";

test("every Birth Center model schema is acceptable to the strict OpenAI regex subset",()=>{
  assert.equal(BIRTH_RESPONSE_SCHEMAS.length,7,"Birth response schema inventory drift");
  for(const entry of BIRTH_RESPONSE_SCHEMAS){
    assertBirthResponseSchemaPatterns(entry);
    assertOpenAIStrictResponseSchema(projectOpenAIStructuredOutputSchema(entry.schema));
  }
  for(const expression of [String.raw`^\p{L}+$`,String.raw`^(?!a)b$`,
    String.raw`^(?<=a)b$`,String.raw`^(a)\1$`,String.raw`^\bword$`]){
    assert.throws(()=>assertBirthResponseSchemaPatterns({
      name:"example",schema:{type:"string",pattern:expression},
    }),/Birth schema example field \$ has unsupported OpenAI regex/u);
  }
});
