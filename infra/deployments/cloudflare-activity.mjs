import { createActivityRecorder } from "#infra/telemetry";
import { createCloudflareActivityTelemetryPort } from "#infra/providers/cloudflare/telemetry";

function nonEmpty(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

export function createCloudflareActivityRecorder({ env, service } = {}) {
  if (!env || typeof env !== "object") throw new TypeError("Cloudflare activity recorder env is required");
  const serviceId = nonEmpty("Cloudflare activity service", service);
  if (env.ACTIVITY_LOG === undefined || env.ACTIVITY_LOG === null) return null;
  if (typeof env.ACTIVITY_LOG.prepare !== "function") {
    throw new TypeError("ACTIVITY_LOG D1 binding must expose prepare()");
  }
  const environment = nonEmpty(
    "Cloudflare activity environment",
    env.FIBRE_ACTIVITY_ENV ?? env.FIBRE_DEPLOYMENT_ENV,
  );
  const deploymentGitSha = typeof env.FIBRE_DEPLOYMENT_GIT_SHA === "string" && env.FIBRE_DEPLOYMENT_GIT_SHA !== ""
    ? env.FIBRE_DEPLOYMENT_GIT_SHA
    : null;
  const telemetry = createCloudflareActivityTelemetryPort({ database: env.ACTIVITY_LOG });
  return createActivityRecorder({
    telemetry,
    environment,
    service: serviceId,
    deploymentGitSha,
    onTelemetryError(error, activity) {
      console.error(JSON.stringify({
        event: "activity-log-write-failed",
        service: serviceId,
        activityId: activity.activityId,
        stage: activity.stage,
        errorName: error?.constructor?.name ?? "Error",
      }));
    },
  });
}
