import test from "node:test";
import assert from "node:assert/strict";

import { causalTreeVisibility, orderCausalTree } from "./causal-tree.js";

function ids(result) {
  return result.map(({ item, depth, orphan }) => [item.operationId, depth, orphan]);
}

test("causal tree places descendants immediately beneath their parent", () => {
  const result = orderCausalTree([
    { operationId:"op_root", parentOperationId:null },
    { operationId:"op_other", parentOperationId:null },
    { operationId:"op_child", parentOperationId:"op_root" },
    { operationId:"op_grandchild", parentOperationId:"op_child" },
  ]);
  assert.deepEqual(ids(result), [
    ["op_root", 0, false],
    ["op_child", 1, false],
    ["op_grandchild", 2, false],
    ["op_other", 0, false],
  ]);
});

test("causal tree keeps missing-parent operations visible as roots", () => {
  const result = orderCausalTree([
    { operationId:"op_orphan", parentOperationId:"op_previous_page" },
    { operationId:"op_root", parentOperationId:null },
  ]);
  assert.deepEqual(ids(result), [
    ["op_orphan", 0, true],
    ["op_root", 0, false],
  ]);
});

test("causal tree fails open on cyclic lineage without dropping rows", () => {
  const result = orderCausalTree([
    { operationId:"op_a", parentOperationId:"op_b" },
    { operationId:"op_b", parentOperationId:"op_a" },
  ]);
  assert.deepEqual(ids(result), [
    ["op_a", 0, false],
    ["op_b", 1, false],
  ]);
});

test("collapsing a parent hides all descendants but leaves later roots visible", () => {
  const result = causalTreeVisibility([
    { operationId:"op_root", parentOperationId:null },
    { operationId:"op_other", parentOperationId:null },
    { operationId:"op_child", parentOperationId:"op_root" },
    { operationId:"op_grandchild", parentOperationId:"op_child" },
  ], ["op_root"]);
  assert.deepEqual(result.map(({ item, hidden }) => [item.operationId, hidden]), [
    ["op_root", false],
    ["op_child", true],
    ["op_grandchild", true],
    ["op_other", false],
  ]);
});

test("nested collapsed state survives expanding an ancestor", () => {
  const items = [
    { operationId:"op_root", parentOperationId:null },
    { operationId:"op_child", parentOperationId:"op_root" },
    { operationId:"op_grandchild", parentOperationId:"op_child" },
  ];
  const result = causalTreeVisibility(items, ["op_child"]);
  assert.deepEqual(result.map(({ item, hidden }) => [item.operationId, hidden]), [
    ["op_root", false],
    ["op_child", false],
    ["op_grandchild", true],
  ]);
});
