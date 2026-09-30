import {
  invalidateView,
  threadObservatoryViewKey,
  threadPopulationViewKey,
  threadViewKey,
  watchViewInvalidation,
} from "./view-invalidation.js";

const liveKeys = new Map();
let socket = null;
let reconnectTimer = null;
let reconnectDelay = 1500;
let hasConnected = false;

function socketUrl() {
  const url = new URL("/api/live", location.href);
  url.protocol = location.protocol === "https:" ? "wss:" : "ws:";
  return url.href;
}

function reconnectSoon() {
  if (reconnectTimer !== null || liveKeys.size === 0 || document.hidden) return;
  const delay = reconnectDelay;
  reconnectDelay = Math.min(30_000, reconnectDelay * 2);
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    ensureSocket();
  }, delay);
}

function reconcileLiveViews(reason) {
  for (const [key, entries] of liveKeys) {
    if (![...entries].some((entry) => entry.active())) continue;
    invalidateView(key, { source:"admin-live", reason });
  }
}

export function routeAdminLiveMessage(message) {
  if (message?.type !== "admin-live.invalidate") return false;
  if (message.entity !== "thread" || typeof message.id !== "string" || typeof message.aspect !== "string") return false;
  invalidateView(threadViewKey(message.id, message.aspect), {
    source:"admin-live",
    reason:"changed",
  });
  invalidateView(threadObservatoryViewKey(message.id), {
    source:"admin-live",
    reason:"changed",
    aspect:message.aspect,
  });
  invalidateView(threadPopulationViewKey(), {
    source:"admin-live",
    reason:"changed",
    threadId:message.id,
    aspect:message.aspect,
  });
  return true;
}

function handleMessage(event) {
  let message;
  try { message = JSON.parse(event.data); }
  catch { return; }

  if (message?.type === "admin-live.ready") {
    reconnectDelay = 1500;
    const reason = hasConnected ? "reconnected" : "connected";
    hasConnected = true;
    reconcileLiveViews(reason);
    return;
  }
  routeAdminLiveMessage(message);
}

function ensureSocket() {
  if (liveKeys.size === 0 || document.hidden) return;
  if (socket && [WebSocket.CONNECTING, WebSocket.OPEN].includes(socket.readyState)) return;

  const opened = new WebSocket(socketUrl());
  socket = opened;
  opened.addEventListener("message", handleMessage);
  opened.addEventListener("close", () => {
    if (socket === opened) socket = null;
    reconnectSoon();
  });
  opened.addEventListener("error", () => {
    try { opened.close(); } catch {}
  });
}

export function watchAdminLive(key, callback, { active = () => true, reconcileOnSubscribe = true } = {}) {
  const entry = { active };
  let entries = liveKeys.get(key);
  if (!entries) {
    entries = new Set();
    liveKeys.set(key, entries);
  }
  entries.add(entry);

  const stopView = watchViewInvalidation(key, async (detail) => {
    if (active()) await callback(detail);
  });

  if (socket?.readyState === WebSocket.OPEN) {
    if (reconcileOnSubscribe) invalidateView(key, { source:"admin-live", reason:"watch-started" });
  } else {
    ensureSocket();
  }

  return () => {
    stopView();
    const current = liveKeys.get(key);
    if (current) {
      current.delete(entry);
      if (current.size === 0) liveKeys.delete(key);
    }
    if (liveKeys.size === 0) {
      reconnectDelay = 1500;
      hasConnected = false;
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (socket) {
        try { socket.close(1000, "no live Admin views"); } catch {}
        socket = null;
      }
    }
  };
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      reconnectDelay = 1500;
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (socket) {
        try { socket.close(1000, "Admin hidden"); } catch {}
        socket = null;
      }
      return;
    }
    ensureSocket();
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    if (socket) {
      try { socket.close(1000, "Admin page closed"); } catch {}
      socket = null;
    }
  });
}
