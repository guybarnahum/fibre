import { DurableObject } from "cloudflare:workers";

const TAG = "admin-live";

function normalizedInvalidation(value) {
  if (!value || value.entity !== "thread") throw new TypeError("Admin live entity must be thread");
  if (typeof value.id !== "string" || value.id === "") throw new TypeError("Admin live id is required");
  if (typeof value.aspect !== "string" || value.aspect === "") throw new TypeError("Admin live aspect is required");
  return Object.freeze({ entity:"thread", id:value.id, aspect:value.aspect });
}

export class FibreAdminLiveDurableObject extends DurableObject {
  async publish({ valueJson }) {
    if (typeof valueJson !== "string") throw new TypeError("Admin live valueJson is required");
    let value;
    try { value = JSON.parse(valueJson); }
    catch { throw new TypeError("Admin live valueJson must contain valid JSON"); }
    const invalidation = normalizedInvalidation(value);
    const message = JSON.stringify({ type:"admin-live.invalidate", ...invalidation });
    let delivered = 0;
    for (const ws of this.ctx.getWebSockets(TAG)) {
      try {
        ws.send(message);
        delivered += 1;
      } catch {
        try { ws.close(1011, "Admin live send failed"); } catch {}
      }
    }
    return { delivered };
  }

  async fetch(request) {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status:426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server, [TAG]);
    server.send(JSON.stringify({ type:"admin-live.ready" }));
    return new Response(null, { status:101, webSocket:client });
  }

  async webSocketMessage(ws) {
    try { ws.close(1008, "Admin live is read-only"); } catch {}
  }

  async webSocketClose() {}
  async webSocketError() {}
}
