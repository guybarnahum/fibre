export function createProviderProgressHeartbeat({
  progress = () => {},
  intervalMs = 10_000,
  now = Date.now,
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
  waitingLabel = "Awaiting provider response",
} = {}) {
  let active = null;

  const elapsedSeconds = (startedAt) =>
    Math.max(0, Math.floor((now() - startedAt) / 1000));

  function finish(label = "Provider call completed") {
    if (active === null) return;
    const { phase, startedAt, timer } = active;
    clearIntervalFn(timer);
    active = null;
    progress(phase, `${label} · ${elapsedSeconds(startedAt)}s elapsed`);
  }

  function report(phase, message) {
    if (String(message).startsWith("Calling ")) {
      finish("Provider response received");
      progress(phase, message);
      const startedAt = now();
      progress(phase, `${waitingLabel} · 0s elapsed`);
      const timer = setIntervalFn(() => {
        progress(
          phase,
          `${waitingLabel} · ${elapsedSeconds(startedAt)}s elapsed`,
        );
      }, intervalMs);
      timer?.unref?.();
      active = { phase, startedAt, timer };
      return;
    }
    progress(phase, message);
  }

  return Object.freeze({ report, finish });
}
