import test from "node:test";
import assert from "node:assert/strict";
import { visualIdentityReviewUrl } from "./visual-identity-review.mjs";

test("visual identity review opens the environment's authenticated Admin page",()=>{
  assert.equal(visualIdentityReviewUrl("staging"),
    "https://admin.staging.insidefibre.com/visual-identity-review.html");
  assert.equal(visualIdentityReviewUrl("production"),
    "https://admin.insidefibre.com/visual-identity-review.html");
  assert.throws(()=>visualIdentityReviewUrl(null),/--env/);
});
