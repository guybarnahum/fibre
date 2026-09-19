function metric(value) {
  const number = Number(value ?? 0);
  return Number.isSafeInteger(number) && number >= 0 ? number : 0;
}

export function d1Cost(result) {
  return Object.freeze({
    rowsRead:metric(result?.meta?.rows_read),
    rowsWritten:metric(result?.meta?.rows_written),
  });
}

export function logD1Cost({ database, operation, result, ...context }) {
  const cost = d1Cost(result);
  if (cost.rowsRead === 0 && cost.rowsWritten === 0) return;
  console.log(JSON.stringify({
    event:"d1-cost",
    database,
    operation,
    ...context,
    ...cost,
  }));
}
