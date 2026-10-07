function frameEnd(buffer) {
  const crlf = buffer.indexOf("\r\n\r\n");
  const lf = buffer.indexOf("\n\n");
  if (crlf === -1) return lf === -1 ? null : { index:lf, length:2 };
  if (lf === -1 || crlf < lf) return { index:crlf, length:4 };
  return { index:lf, length:2 };
}

function dataForFrame(frame) {
  const lines = frame.split(/\r?\n/u);
  const data = [];
  for (const line of lines) {
    if (!line.startsWith("data:")) continue;
    data.push(line.slice(5).replace(/^ /u, ""));
  }
  return data.length === 0 ? null : data.join("\n");
}

function parseData(data) {
  if (data === null || data === "" || data === "[DONE]") return null;
  return JSON.parse(data);
}

export async function* streamSseJson(body) {
  if (!body || typeof body.getReader !== "function") {
    throw new TypeError("SSE response body must be a readable stream");
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream:!done });

      let boundary;
      while ((boundary = frameEnd(buffer)) !== null) {
        const frame = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary.length);
        const parsed = parseData(dataForFrame(frame));
        if (parsed !== null) yield parsed;
      }

      if (done) break;
    }

    const parsed = parseData(dataForFrame(buffer));
    if (parsed !== null) yield parsed;
  } finally {
    reader.releaseLock();
  }
}
