import assert from "node:assert/strict";

function requireSource(source) {
  if (typeof source !== "string") throw new TypeError("source invariant requires source text");
  return source;
}

function requirePattern(pattern) {
  if (!(pattern instanceof RegExp)) throw new TypeError("source invariant requires a RegExp pattern");
  return pattern;
}

function reset(pattern) {
  pattern.lastIndex = 0;
  return pattern;
}

export function assertSourceContains(source, pattern, message) {
  const text = requireSource(source);
  const expression = reset(requirePattern(pattern));
  assert.equal(expression.test(text), true, message);
}

export function assertSourceOmits(source, pattern, message) {
  const text = requireSource(source);
  const expression = reset(requirePattern(pattern));
  assert.equal(expression.test(text), false, message);
}
