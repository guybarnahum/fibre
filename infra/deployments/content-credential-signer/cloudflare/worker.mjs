import { DurableObject } from "cloudflare:workers";

const PORT = 8791;
const READY_ATTEMPTS = 50;
const READY_DELAY_MS = 100;

function required(name, value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${name} is required`);
  return value.trim();
}

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

export class FibreContentCredentialSignerContainer extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
  }

  start() {
    if (this.ctx.container.running) return;
    this.ctx.container.start({
      enableInternet:false,
      env:{
        FIBRE_DEPLOYMENT_ENV:"cloudflare",
        FIBRE_C2PA_HOST:"0.0.0.0",
        PORT:String(PORT),
        C2PA_SIGNER_ID:required("C2PA_SIGNER_ID", this.env.C2PA_SIGNER_ID),
        C2PA_TRUST_POLICY:required("C2PA_TRUST_POLICY", this.env.C2PA_TRUST_POLICY),
        C2PA_SIGNER_TOKEN:required("C2PA_SIGNER_TOKEN", this.env.C2PA_SIGNER_TOKEN),
        C2PA_SIGNER_CERT_BASE64:required("C2PA_SIGNER_CERT_BASE64", this.env.C2PA_SIGNER_CERT_BASE64),
        C2PA_SIGNER_KEY_BASE64:required("C2PA_SIGNER_KEY_BASE64", this.env.C2PA_SIGNER_KEY_BASE64),
      },
    });
  }

  async readyPort() {
    this.start();
    const port = this.ctx.container.getTcpPort(PORT);
    for (let attempt = 0; attempt < READY_ATTEMPTS; attempt += 1) {
      try {
        const response = await port.fetch("http://container/healthz");
        if (response.ok) return port;
      } catch {}
      await delay(READY_DELAY_MS);
    }
    throw new Error("Fibre C2PA signer container did not become ready");
  }

  async fetch(request) {
    const port = await this.readyPort();
    const target = new URL(request.url);
    target.protocol = "http:";
    target.host = "container";
    return port.fetch(new Request(target, request));
  }
}

export default {
  fetch(request, env) {
    return env.C2PA_SIGNER_CONTAINER.getByName("fibre-c2pa-signer").fetch(request);
  },
};
