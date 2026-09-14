export function orderCausalTree(items) {
  const nodes = items.map((item, index) => ({ item, index, operationId:item.operationId ?? null, parentOperationId:item.parentOperationId ?? null }));
  const byOperation = new Map(nodes.filter((node) => node.operationId).map((node) => [node.operationId, node]));
  const children = new Map();
  for (const node of nodes) {
    if (!node.parentOperationId || !byOperation.has(node.parentOperationId)) continue;
    const list = children.get(node.parentOperationId) ?? [];
    list.push(node);
    children.set(node.parentOperationId, list);
  }

  const result = [];
  const visited = new Set();
  function visit(node, depth) {
    if (visited.has(node.index)) return;
    visited.add(node.index);
    result.push(Object.freeze({
      item:node.item,
      depth,
      orphan:Boolean(node.parentOperationId && !byOperation.has(node.parentOperationId)),
      childCount:node.operationId ? (children.get(node.operationId)?.length ?? 0) : 0,
    }));
    for (const child of children.get(node.operationId) ?? []) visit(child, depth + 1);
  }

  for (const node of nodes) {
    if (!node.parentOperationId || !byOperation.has(node.parentOperationId)) visit(node, 0);
  }
  for (const node of nodes) visit(node, 0);
  return Object.freeze(result);
}

export function causalTreeVisibility(items, collapsedOperationIds = []) {
  const collapsed = new Set(collapsedOperationIds);
  const ordered = orderCausalTree(items);
  const ancestors = [];
  return Object.freeze(ordered.map((entry) => {
    ancestors.length = entry.depth;
    const hidden = ancestors.some((operationId) => collapsed.has(operationId));
    ancestors[entry.depth] = entry.item.operationId ?? null;
    return Object.freeze({ ...entry, hidden });
  }));
}
