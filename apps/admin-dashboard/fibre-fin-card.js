function element(tag, className = null, text = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null) node.textContent = text;
  return node;
}

function usableAsset(asset) {
  return asset
    && typeof asset.url === "string"
    && asset.url !== ""
    && String(asset.mediaType ?? "").startsWith("image/");
}

export function createFibreFinCard({
  front,
  back,
  descriptor = null,
  label = "Fibre Identity Card",
} = {}) {
  if (!usableAsset(front) || !usableAsset(back)) {
    throw new TypeError("Fibre FIN card renderer requires front and back image assets");
  }

  const shell = element("div", "fibre-fin-card-shell");
  if (typeof descriptor?.url === "string" && descriptor.url !== "") {
    shell.dataset.cardAssetUrl = descriptor.url;
  }

  const control = element("button", "fibre-fin-card");
  control.type = "button";
  control.dataset.side = "front";
  control.setAttribute("aria-pressed", "false");
  control.setAttribute("aria-label", `${label}, front. Click to flip to back.`);
  control.title = "Click to flip";

  const inner = element("span", "fibre-fin-card-inner");
  const frontFace = element("span", "fibre-fin-card-face fibre-fin-card-front");
  const backFace = element("span", "fibre-fin-card-face fibre-fin-card-back");

  const frontImage = document.createElement("img");
  frontImage.src = front.url;
  frontImage.alt = `${label} front`;
  frontImage.loading = "lazy";

  const backImage = document.createElement("img");
  backImage.src = back.url;
  backImage.alt = `${label} back`;
  backImage.loading = "lazy";

  frontFace.append(frontImage);
  backFace.append(backImage);
  inner.append(frontFace, backFace);
  control.append(inner);

  const hint = element("span", "fibre-fin-card-hint", "Front · click to flip");
  shell.append(control, hint);

  let flipped = false;
  let tiltX = 0;
  let tiltY = 0;
  const reducedMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;

  const renderTransform = () => {
    const rotation = (flipped ? 180 : 0) + tiltY;
    inner.style.transform = `rotateX(${tiltX}deg) rotateY(${rotation}deg)`;
  };

  const setFlipped = (value) => {
    flipped = value;
    control.dataset.side = flipped ? "back" : "front";
    control.setAttribute("aria-pressed", flipped ? "true" : "false");
    control.setAttribute(
      "aria-label",
      `${label}, ${flipped ? "back" : "front"}. Click to flip to ${flipped ? "front" : "back"}.`,
    );
    hint.textContent = `${flipped ? "Back" : "Front"} · click to flip`;
    renderTransform();
  };

  control.addEventListener("click", () => setFlipped(!flipped));

  if (!reducedMotion) {
    control.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") return;
      const bounds = control.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      const x = (event.clientX - bounds.left) / bounds.width - 0.5;
      const y = (event.clientY - bounds.top) / bounds.height - 0.5;
      tiltX = Math.max(-2.5, Math.min(2.5, -y * 5));
      tiltY = Math.max(-3.5, Math.min(3.5, x * 7));
      renderTransform();
    });
    control.addEventListener("pointerleave", () => {
      tiltX = 0;
      tiltY = 0;
      renderTransform();
    });
  }

  renderTransform();
  return shell;
}
