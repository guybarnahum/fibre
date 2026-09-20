const TAG_NAME = "fibre-fin-card";

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
    this._tiltX = 0;
    this._tiltY = 0;
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
      <style>
        :host{display:block;min-width:0;width:100%;color:inherit}
        .shell{display:grid;gap:7px;justify-items:center;min-width:0}
        button{display:block;width:100%;max-width:760px;border:0;padding:14px;background:transparent;color:inherit;perspective:1200px;cursor:pointer;border-radius:14px;outline:none;font:inherit}
        button:focus-visible{box-shadow:0 0 0 2px color-mix(in srgb,var(--accent,#ea7a24) 45%,transparent)}
        .inner{position:relative;display:block;width:100%;aspect-ratio:1.586/1;transform-style:preserve-3d;transition:transform 520ms cubic-bezier(.2,.75,.2,1);will-change:transform}
        .face{position:absolute;inset:0;display:block;overflow:hidden;border-radius:16px;background:var(--surface,#fff);backface-visibility:hidden;-webkit-backface-visibility:hidden;box-shadow:0 14px 28px rgba(20,22,26,.18),0 2px 5px rgba(20,22,26,.12);border:1px solid var(--border-strong,#c8c8c2)}
        .face::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(120deg,rgba(255,255,255,.14),transparent 27%,transparent 72%,rgba(255,255,255,.08));mix-blend-mode:screen}
        .face img{display:block;width:100%;height:100%;object-fit:contain}
        .back{transform:rotateY(180deg)}
        .hint{font-size:9px;color:var(--muted,#6d6f73);letter-spacing:.02em}
        @media(hover:hover) and (pointer:fine){button:hover .face{box-shadow:0 18px 34px rgba(20,22,26,.22),0 3px 7px rgba(20,22,26,.13)}}
        @media(prefers-reduced-motion:reduce){.inner{transition:none}.face::after{display:none}}
      </style>
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
    this._inner = this.shadowRoot.querySelector(".inner");
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
    const reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
    if (!reducedMotion) {
      this._control.addEventListener("pointermove", (event) => {
        if (event.pointerType === "touch") return;
        const bounds = this._control.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0) return;
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        this._tiltX = Math.max(-2.5, Math.min(2.5, -y * 5));
        this._tiltY = Math.max(-3.5, Math.min(3.5, x * 7));
        this._renderTransform();
      });
      this._control.addEventListener("pointerleave", () => {
        this._tiltX = 0;
        this._tiltY = 0;
        this._renderTransform();
      });
    }
    this._setFlipped(false);
  }

  _renderTransform() {
    if (!this._inner) return;
    const rotation = (this._flipped ? 180 : 0) + this._tiltY;
    this._inner.style.transform = `rotateX(${this._tiltX}deg) rotateY(${rotation}deg)`;
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
    this._renderTransform();
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
