// Native datalist popups are OS-controlled: render their suggestions in the page.
// No data is fetched and original input/change events and validation are preserved.
export function installSuggestionLists(doc = document) {
  if (doc.documentElement.dataset.semedSuggestions === "ready") return () => {};
  doc.documentElement.dataset.semedSuggestions = "ready";
  const view = doc.defaultView;
  const popup = doc.createElement("div");
  popup.id = "semed-suggestion-options";
  popup.setAttribute("role", "listbox");
  popup.hidden = true;
  popup.style.cssText = "position:fixed;z-index:2147483647;background:#fff!important;color:#000!important;border:1px solid #8893a4;border-radius:10px;box-shadow:0 8px 24px #0002;overflow-y:auto;padding:4px;font:14px/1.5 Arial,sans-serif;color-scheme:light;";
  doc.body.append(popup);
  let input = null, values = [], active = -1;
  const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  function adopt() {
    doc.querySelectorAll("input[list]").forEach((field) => {
      field.dataset.semedList = field.getAttribute("list");
      field.removeAttribute("list");
      field.setAttribute("role", "combobox");
      field.setAttribute("aria-autocomplete", "list");
      field.setAttribute("aria-controls", popup.id);
      field.setAttribute("aria-expanded", "false");
      field.setAttribute("autocomplete", "off");
    });
  }
  function close() {
    popup.hidden = true;
    if (input) {
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
    }
    active = -1;
  }
  function position() {
    if (!input || popup.hidden) return;
    const rect = input.getBoundingClientRect();
    const below = view.innerHeight - rect.bottom - 10;
    const above = rect.top - 10;
    const height = Math.min(280, Math.max(below, above));
    popup.style.left = Math.max(8, Math.min(rect.left, view.innerWidth - Math.min(rect.width, view.innerWidth - 16) - 8)) + "px";
    popup.style.width = Math.min(rect.width, view.innerWidth - 16) + "px";
    popup.style.maxHeight = Math.max(80, height) + "px";
    popup.style.top = below >= Math.min(200, above) ? rect.bottom + 4 + "px" : Math.max(8, rect.top - Math.min(popup.scrollHeight, height) - 4) + "px";
  }
  function choose(value) {
    if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(view.HTMLInputElement.prototype, "value").set;
    setter.call(input, value);
    input.dispatchEvent(new view.Event("input", { bubbles: true }));
    input.dispatchEvent(new view.Event("change", { bubbles: true }));
    close();
    input.focus();
  }
  function show(field) {
    if (input && input !== field) close();
    input = field;
    const list = doc.getElementById(field.dataset.semedList);
    if (!list) { close(); return; }
    const term = normalize(field.value.trim());
    values = [...new Set([...list.querySelectorAll("option")].filter((option) => !option.disabled).map((option) => option.value).filter(Boolean))].filter((value) => !term || normalize(value).includes(term));
    active = -1;
    popup.replaceChildren();
    if (!values.length) { close(); return; }
    values.forEach((value, index) => {
      const option = doc.createElement("div");
      option.id = popup.id + "-" + index;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");
      option.textContent = value;
      option.style.cssText = "background:#fff!important;color:#000!important;padding:10px 12px;cursor:pointer;white-space:normal;overflow-wrap:anywhere;border-radius:6px;";
      option.addEventListener("pointerdown", (event) => { event.preventDefault(); choose(value); });
      popup.append(option);
    });
    popup.hidden = false;
    input.setAttribute("aria-expanded", "true");
    position();
  }
  function fieldFrom(event) {
    return event.target instanceof view.HTMLInputElement && event.target.dataset.semedList ? event.target : null;
  }
  function onFocus(event) { const field = fieldFrom(event); if (field && !field.disabled && !field.readOnly) show(field); }
  function onInput(event) { const field = fieldFrom(event); if (field) show(field); }
  function onPointer(event) {
    adopt();
    const field = fieldFrom(event);
    if (field && !field.disabled && !field.readOnly) show(field);
    else if (!popup.contains(event.target)) close();
  }
  function onKey(event) {
    const field = fieldFrom(event);
    if (!field) return;
    if (event.key === "Escape" || event.key === "Tab") { close(); return; }
    if (event.key === "Enter" && !popup.hidden && active >= 0) { event.preventDefault(); choose(values[active]); return; }
    if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
    event.preventDefault();
    if (popup.hidden) show(field);
    if (!values.length) return;
    active = (active + (event.key === "ArrowDown" ? 1 : -1) + values.length) % values.length;
    [...popup.children].forEach((option, index) => {
      option.setAttribute("aria-selected", String(index === active));
      option.style.outline = index === active ? "2px solid #000" : "";
      option.style.outlineOffset = "-2px";
    });
    input.setAttribute("aria-activedescendant", popup.children[active].id);
    popup.children[active].scrollIntoView({ block: "nearest" });
  }
  function onBlur(event) { if (fieldFrom(event)) close(); }
  function onScroll(event) { if (!popup.contains(event.target)) close(); }
  const observer = new view.MutationObserver(() => { adopt(); if (input && !input.isConnected) close(); });
  adopt();
  observer.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["list"] });
  doc.addEventListener("focusin", onFocus);
  doc.addEventListener("input", onInput);
  doc.addEventListener("pointerdown", onPointer, true);
  doc.addEventListener("keydown", onKey);
  doc.addEventListener("focusout", onBlur);
  view.addEventListener("resize", close);
  doc.addEventListener("scroll", onScroll, true);
  return () => {
    observer.disconnect();
    doc.removeEventListener("focusin", onFocus);
    doc.removeEventListener("input", onInput);
    doc.removeEventListener("pointerdown", onPointer, true);
    doc.removeEventListener("keydown", onKey);
    doc.removeEventListener("focusout", onBlur);
    view.removeEventListener("resize", close);
    doc.removeEventListener("scroll", onScroll, true);
    doc.querySelectorAll("input[data-semed-list]").forEach((field) => {
      field.setAttribute("list", field.dataset.semedList);
      delete field.dataset.semedList;
      ["role", "aria-autocomplete", "aria-controls", "aria-expanded", "aria-activedescendant"].forEach((name) => field.removeAttribute(name));
    });
    popup.remove();
    delete doc.documentElement.dataset.semedSuggestions;
  };
}
