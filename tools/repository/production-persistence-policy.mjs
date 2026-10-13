import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const RUNTIME_SOURCE = /\.(?:mjs|js|ts|tsx|jsx)$/u;

export const DIRECT_FILE_PERSISTENCE_MIGRATION_PATHS = Object.freeze([]);

const DIRECT_FILE_PERSISTENCE_SET = new Set();

const SQLITE_IMPORT = /(?:from\s+["'](?:node:sqlite|better-sqlite3|sqlite3)["']|require\(\s*["'](?:node:sqlite|better-sqlite3|sqlite3)["']\s*\))/u;
const FS_WRITE_NAME = "(?:writeFileSync|writeFile|appendFileSync|appendFile|createWriteStream|copyFileSync|copyFile)";
const FS_NAMED_WRITE_IMPORT = new RegExp(
  `import\\s*\\{[^}]*\\b${FS_WRITE_NAME}\\b[^}]*\\}\\s*from\\s*["']node:fs(?:/promises)?["']`,
  "su",
);
const FS_NAMESPACE_IMPORT = /import\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s+["']node:fs(?:\/promises)?["']/gu;
const DEPLOYMENT_SQL_BYPASS = /\bstorage\s*\.\s*sql\b/u;
const DEPLOYMENT_OBJECT_BYPASS = /\b(?:bucket|[A-Za-z_$][\w$]*Bucket|[A-Z_]+_OBJECTS)\s*\.\s*(?:get|put|delete)\s*\(/u;

const CLOUD_STORAGE_IMPORT = /(?:from\s+["']|require\(\s*["'])(?:@aws-sdk\/client-(?:s3|dynamodb)|@google-cloud\/(?:storage|spanner|firestore)|@azure\/(?:storage-blob|cosmos)|firebase-admin\/firestore)(?:["']|["']\s*\))/u;

function normalize(path) {
  return path.replaceAll("\\", "/");
}

function isRuntimeServiceSource(path) {
  return path.startsWith("services/")
    && RUNTIME_SOURCE.test(path)
    && !path.includes("/test/")
    && !path.endsWith(".test.mjs")
    && !path.endsWith(".test.js")
    && !path.endsWith(".test.ts");
}

function isRuntimeDeploymentSource(path) {
  return path.startsWith("infra/deployments/")
    && RUNTIME_SOURCE.test(path)
    && !path.includes("/test/")
    && !/\.test\.(?:mjs|js|ts)$/u.test(path);
}

function namespaceWrites(text) {
  for (const match of text.matchAll(FS_NAMESPACE_IMPORT)) {
    const identifier = match[1].replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    const writeCall = new RegExp(`\\b${identifier}\\.${FS_WRITE_NAME}\\s*\\(`, "u");
    if (writeCall.test(text)) return true;
  }
  return false;
}

export function productionPersistenceViolationsForSource(path, text) {
  const normalizedPath = normalize(path);
  const service = isRuntimeServiceSource(normalizedPath);
  const deployment = isRuntimeDeploymentSource(normalizedPath);
  if (!service && !deployment) return [];
  const errors = [];

  if (deployment) {
    if (DEPLOYMENT_SQL_BYPASS.test(text)) {
      errors.push(`Production persistence bypass: ${normalizedPath} accesses Durable Object SQL outside InfraDriver.state`);
    }
    if (DEPLOYMENT_OBJECT_BYPASS.test(text)) {
      errors.push(`Production persistence bypass: ${normalizedPath} accesses mutable object storage outside InfraDriver`);
    }
    return errors;
  }

  if (SQLITE_IMPORT.test(text)) {
    errors.push(
      `Production persistence bypass: ${normalizedPath} imports SQLite directly; new service state must use a semantic store over InfraDriver`,
    );
  }

  const directFileWrite = FS_NAMED_WRITE_IMPORT.test(text) || namespaceWrites(text);
  if (directFileWrite && !DIRECT_FILE_PERSISTENCE_SET.has(normalizedPath)) {
    errors.push(
      `Production persistence bypass: ${normalizedPath} writes durable files directly; service persistence must use an InfraDriver capability`,
    );
  }

  if (CLOUD_STORAGE_IMPORT.test(text)) {
    errors.push(
      `Production persistence bypass: ${normalizedPath} imports a cloud storage/database SDK directly; provider persistence belongs behind InfraDriver`,
    );
  }

  return errors;
}

function trackedRuntimeSources(root) {
  return execFileSync("git", ["ls-files", "--", "services", "infra/deployments"], {
    cwd: root,
    encoding: "utf8",
  })
    .split(/\r?\n/u)
    .map((path) => normalize(path.trim()))
    .filter((path) => path && (isRuntimeServiceSource(path) || isRuntimeDeploymentSource(path)));
}

export function validateProductionPersistencePolicy({ root = process.cwd(), paths = null } = {}) {
  const runtimePaths = paths ?? trackedRuntimeSources(root);
  const errors = [];
  for (const path of runtimePaths) {
    const text = readFileSync(resolve(root, path), "utf8");
    errors.push(...productionPersistenceViolationsForSource(path, text));
  }
  return errors;
}
