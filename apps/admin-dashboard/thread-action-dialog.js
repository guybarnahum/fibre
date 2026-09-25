function element(tag, className = null, text = null) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== null) node.textContent = text;
  return node;
}

function human(value) {
  return String(value ?? "").replace(/([a-z0-9])([A-Z])/gu, "$1 $2").replace(/[_-]+/gu, " ");
}

export function actionFields(action) {
  return Array.isArray(action?.input?.fields) ? action.input.fields : [];
}

function ensureDialog() {
  const existing = document.querySelector("#thread-action-dialog");
  if (existing) return existing;

  const dialog = element("dialog", "thread-action-dialog");
  dialog.id = "thread-action-dialog";

  const head = element("div", "dialog-head thread-action-dialog-head");
  const heading = element("div");
  const eyebrow = element("p", "eyebrow", "Thread action");
  eyebrow.dataset.threadActionEyebrow = "";
  const title = element("h2", null, "Thread action");
  title.dataset.threadActionTitle = "";
  heading.append(eyebrow, title);
  const close = element("button", "icon-button", "×");
  close.type = "button";
  close.setAttribute("aria-label", "Close");
  close.dataset.threadActionClose = "";
  head.append(heading, close);

  const form = element("form", "thread-action-form");
  form.dataset.threadActionForm = "";
  const context = element("p", "thread-action-context");
  context.dataset.threadActionContext = "";
  const description = element("p", "thread-action-description");
  description.dataset.threadActionDescription = "";
  const fields = element("div", "thread-action-fields");
  fields.dataset.threadActionFields = "";
  const status = element("div", "thread-action-status");
  status.dataset.threadActionStatus = "";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  status.hidden = true;
  const progress = element("div", "thread-action-progress");
  progress.dataset.threadActionProgress = "";
  progress.hidden = true;
  progress.append(element("span"));

  const footer = element("div", "thread-action-footer");
  const cancel = element("button", "secondary", "Cancel");
  cancel.type = "button";
  cancel.dataset.threadActionCancel = "";
  const submit = element("button", "primary", "Apply");
  submit.type = "submit";
  submit.dataset.threadActionSubmit = "";
  footer.append(cancel, submit);
  form.append(context, description, fields, status, progress, footer);
  dialog.append(head, form);
  document.body.append(dialog);

  const closeDialog = () => {
    if (dialog.dataset.busy !== "true") dialog.close();
  };
  close.addEventListener("click", closeDialog);
  cancel.addEventListener("click", closeDialog);
  dialog.addEventListener("cancel", (event) => {
    if (dialog.dataset.busy === "true") event.preventDefault();
  });
  return dialog;
}

function renderFields(host, fields) {
  host.replaceChildren();
  for (const field of fields) {
    if (typeof field?.name !== "string" || field.name === "") continue;
    const choices = Array.isArray(field.options) ? field.options : [];
    if (choices.length > 0) {
      const group = element("fieldset", "thread-action-choice-group");
      group.append(element("legend", null, field.label ?? human(field.name)));
      for (const [index, choice] of choices.entries()) {
        const option = element("label", "thread-action-choice");
        const input = document.createElement("input");
        input.type = "radio";
        input.name = field.name;
        input.value = choice;
        input.required = field.required === true;
        input.checked = field.default === choice || (field.default === undefined && choices.length === 1 && index === 0);
        option.append(input, element("span", null, human(choice)));
        group.append(option);
      }
      host.append(group);
      continue;
    }

    const label = element("label", "thread-action-field");
    label.append(element("span", null, field.label ?? human(field.name)));
    const input = document.createElement("input");
    input.type = field.kind === "number" ? "number" : "text";
    input.name = field.name;
    input.required = field.required === true;
    input.autocomplete = field.kind === "date" ? "bday" : "off";
    if (field.kind === "date") {
      input.placeholder = "MMDDYYYY, MM/DD/YYYY, or YYYY-MM-DD";
      input.inputMode = "numeric";
    } else if (field.kind === "string_list") {
      input.placeholder = field.placeholder ?? "Language 1, Language 2";
    }
    input.value = field.default ?? "";
    label.append(input);
    host.append(label);
  }
}

function readInput(form, fields) {
  if (!form.reportValidity()) return null;
  const values = {};
  const data = new FormData(form);
  for (const field of fields) {
    if (typeof field?.name !== "string" || field.name === "") continue;
    const raw = data.get(field.name);
    const value = typeof raw === "string" ? raw.trim() : "";
    if (field.required === true && value === "") return null;
    values[field.name] = field.kind === "string_list"
      ? value.split(",").map((item) => item.trim()).filter(Boolean)
      : value;
  }
  return values;
}

export function openThreadActionDialog({
  threadId,
  threadName = null,
  label,
  eyebrow = "Thread action",
  description = "",
  fields = [],
  onBusyChange = null,
  run,
}) {
  const dialog = ensureDialog();
  const form = dialog.querySelector("[data-thread-action-form]");
  const status = dialog.querySelector("[data-thread-action-status]");
  const progress = dialog.querySelector("[data-thread-action-progress]");
  const submit = dialog.querySelector("[data-thread-action-submit]");
  const cancel = dialog.querySelector("[data-thread-action-cancel]");
  const close = dialog.querySelector("[data-thread-action-close]");

  dialog.querySelector("[data-thread-action-eyebrow]").textContent = eyebrow;
  dialog.querySelector("[data-thread-action-title]").textContent = label;
  dialog.querySelector("[data-thread-action-context]").textContent = [threadName, threadId].filter(Boolean).join(" · ");
  dialog.querySelector("[data-thread-action-description]").textContent = description;
  renderFields(dialog.querySelector("[data-thread-action-fields]"), fields);
  status.hidden = true;
  status.className = "thread-action-status";
  status.textContent = "";
  progress.hidden = true;
  submit.textContent = label;
  submit.disabled = false;
  cancel.disabled = false;
  close.disabled = false;
  dialog.dataset.busy = "false";

  form.onsubmit = async (event) => {
    event.preventDefault();
    const input = readInput(form, fields);
    if (input === null) return;

    dialog.dataset.busy = "true";
    submit.disabled = true;
    cancel.disabled = true;
    close.disabled = true;
    onBusyChange?.(true);
    status.hidden = false;
    status.className = "thread-action-status working";
    status.textContent = `${label} in progress…`;
    progress.hidden = false;

    try {
      await run(input);
      dialog.dataset.busy = "false";
      onBusyChange?.(false);
      dialog.close();
    } catch (error) {
      dialog.dataset.busy = "false";
      onBusyChange?.(false);
      status.className = "thread-action-status failed";
      status.textContent = `${label} failed: ${error instanceof Error ? error.message : String(error)}`;
      progress.hidden = true;
      submit.disabled = false;
      cancel.disabled = false;
      close.disabled = false;
    }
  };

  dialog.showModal();
  const first = dialog.querySelector("[data-thread-action-fields] input");
  if (first) first.focus();
  else submit.focus();
}
