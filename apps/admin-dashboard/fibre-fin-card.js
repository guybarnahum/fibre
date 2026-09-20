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
    this._interactionTimer = null;
  }

  connectedCallback() {
    if (!this._rendered) this._render();
  }

  disconnectedCallback() {
    if (this._interactionTimer !== null) {
      clearTimeout(this._interactionTimer);
      this._interactionTimer = null;
    }
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

    this._control.addEventListener("click", () => {
      this._showInteraction();
      this._setFlipped(!this._flipped);
    });
    this._setFlipped(false);
  }

  _showInteraction() {
    this.dataset.interacting = "true";
    if (this._interactionTimer !== null) clearTimeout(this._interactionTimer);
    this._interactionTimer = setTimeout(() => {
      delete this.dataset.interacting;
      this._interactionTimer = null;
    }, 1600);
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
