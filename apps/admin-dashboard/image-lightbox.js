function ensureDialog() {
  let dialog = document.querySelector("#thread-image-dialog");
  if (dialog) return dialog;

  dialog = document.createElement("dialog");
  dialog.id = "thread-image-dialog";
  dialog.className = "thread-image-dialog";
  dialog.innerHTML = [
    '<button class="thread-image-close" type="button" aria-label="Close image">×</button>',
    '<figure><img alt=""><figcaption></figcaption></figure>',
  ].join("");
  dialog.querySelector(".thread-image-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  document.body.append(dialog);
  return dialog;
}

document.addEventListener("click", (event) => {
  const trigger = event.target.closest?.("[data-lightbox-src]");
  if (!trigger) return;
  const src = trigger.dataset.lightboxSrc;
  if (!src) return;
  event.preventDefault();
  const dialog = ensureDialog();
  const image = dialog.querySelector("img");
  const caption = dialog.querySelector("figcaption");
  image.src = src;
  image.alt = trigger.dataset.lightboxAlt ?? "Thread image";
  caption.textContent = trigger.dataset.lightboxAlt ?? "";
  if (!dialog.open) dialog.showModal();
});
