import { verifyFibreFinCardAssets } from "./fibre-fin-card-verification.js";

const TAG_NAME = "fibre-fin-card";
const STYLESHEET_HREF = "/fibre-fin-card.css";

function imageAsset(value) {
  return value
    && typeof value.url === "string"
    && value.url !== ""
    && String(value.mediaType ?? "").startsWith("image/")
    ? value
    : null;
}

class FibreFinCardElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode:"open" });
    this._flipped = false;
    this._rendered = false;
  }

  connectedCallback() {
    if (!this._rendered) this._render();
  }

  _render() {
    const frontSrc = this.getAttribute("front-src");
    const backSrc = this.getAttribute("back-src");
    const label = this.getAttribute("label") || "Fibre Identity Card";
    if (!frontSrc || !backSrc) {
      this.shadowRoot.textContent = "";
      this._rendered = false;
      return;
    }

    this._rendered = true;
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="${STYLESHEET_HREF}">
      <div class="shell">
        <button type="button" aria-pressed="false" title="Click to flip">
          <span class="inner">
            <span class="face front"><img alt=""></span>
            <span class="face back"><img alt=""></span>
          </span>
        </button>
        <span class="hint">Front · click to flip</span>
        <div class="proof">
          <span class="proof-status" aria-live="polite">Verifying Fibre proof…</span>
          <details class="proof-details" hidden>
            <summary>Verified embedded data</summary>
            <dl class="proof-data"></dl>
          </details>
        </div>
      </div>
    `;

    this._control = this.shadowRoot.querySelector("button");
    this._hint = this.shadowRoot.querySelector(".hint");
    const front = this.shadowRoot.querySelector(".front img");
    const back = this.shadowRoot.querySelector(".back img");
    front.src = frontSrc;
    front.alt = `${label} front`;
    front.loading = "lazy";
    back.src = backSrc;
    back.alt = `${label} back`;
    back.loading = "lazy";

    this._control.addEventListener("click", () => this._setFlipped(!this._flipped));
    this._setFlipped(false);
    void this._verify(frontSrc, backSrc);
  }

  async _verify(frontSrc, backSrc) {
    const status = this.shadowRoot.querySelector(".proof-status");
    const details = this.shadowRoot.querySelector(".proof-details");
    const data = this.shadowRoot.querySelector(".proof-data");
    try {
      const result = await verifyFibreFinCardAssets({
        front:{ url:frontSrc },
        back:{ url:backSrc },
      });
      if (!result.verified) {
        status.textContent = "FIN proof not verified";
        status.classList.add("failed");
        return;
      }
      status.textContent = "✓ Verified by Fibre";
      status.classList.add("verified");
      details.hidden = false;
      const rows = [];
      const visit = (value, prefix = "") => {
        for (const [key, item] of Object.entries(value ?? {})) {
          const name = prefix ? `${prefix}.${key}` : key;
          if (item && typeof item === "object" && !Array.isArray(item)) visit(item, name);
          else rows.push([name, item]);
        }
      };
      const { side:_side, rawRenderDigest:_frontDigest, ...shared } = result.frontAssertion;
      visit(shared);
      rows.push(["front.rawRenderDigest", result.frontAssertion.rawRenderDigest]);
      rows.push(["back.rawRenderDigest", result.backAssertion.rawRenderDigest]);
      for (const [key, value] of rows) {
        const term = document.createElement("dt");
        term.textContent = key;
        const description = document.createElement("dd");
        description.textContent = value === null ? "null" : Array.isArray(value) ? JSON.stringify(value) : String(value);
        data.append(term, description);
      }
    } catch {
      status.textContent = "FIN proof verification unavailable";
      status.classList.add("failed");
    }
  }

  _setFlipped(value) {
    this._flipped = value;
    if (!this._control || !this._hint) return;
    const label = this.getAttribute("label") || "Fibre Identity Card";
    const side = this._flipped ? "back" : "front";
    const next = this._flipped ? "front" : "back";
    this.dataset.side = side;
    this._control.setAttribute("aria-pressed", this._flipped ? "true" : "false");
    this._control.setAttribute("aria-label", `${label}, ${side}. Click to flip to ${next}.`);
    this._hint.textContent = `${this._flipped ? "Back" : "Front"} · click to flip`;
  }
}

if (globalThis.customElements && !customElements.get(TAG_NAME)) {
  customElements.define(TAG_NAME, FibreFinCardElement);
}

export function createFibreFinCard({
  front,
  back,
  descriptor = null,
  label = "Fibre Identity Card",
} = {}) {
  const frontAsset = imageAsset(front);
  const backAsset = imageAsset(back);
  if (!frontAsset || !backAsset) {
    throw new TypeError("Fibre FIN card renderer requires front and back image assets");
  }

  const card = document.createElement(TAG_NAME);
  card.setAttribute("front-src", frontAsset.url);
  card.setAttribute("back-src", backAsset.url);
  card.setAttribute("label", label);
  if (typeof descriptor?.url === "string" && descriptor.url !== "") {
    card.setAttribute("card-src", descriptor.url);
  }
  return card;
}
