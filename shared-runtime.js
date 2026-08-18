const style = document.createElement("style");
style.textContent = `
  .semed-global-status{position:fixed;right:18px;bottom:18px;z-index:10000;max-width:min(420px,calc(100vw - 36px));padding:13px 16px;border-radius:10px;background:#062b78;color:#fff;box-shadow:0 12px 35px #00164055;font:600 14px/1.4 system-ui}
  .semed-global-status[data-kind="error"]{background:#9b1c1c}.semed-global-status[hidden]{display:none}
  @media (max-width:720px){.semed-global-status{left:12px;right:12px;bottom:12px;max-width:none}}
`;
document.head.append(style);

const status = document.createElement("div");
status.className = "semed-global-status";
status.setAttribute("role", "status");
status.setAttribute("aria-live", "polite");
status.hidden = true;
document.addEventListener("DOMContentLoaded", () => document.body.append(status), { once: true });

let timer;
function show(message, kind = "info", persistent = false) {
  clearTimeout(timer);
  status.textContent = String(message || "");
  status.dataset.kind = kind;
  status.hidden = !message;
  if (!persistent && message) timer = setTimeout(() => { status.hidden = true; }, 5000);
}

export const semedUi = {
  loading(message = "Carregando…") { show(message, "info", true); },
  success(message) { show(message, "info"); },
  error(message = "Não foi possível concluir a operação.") { show(message, "error", true); },
  clear() { clearTimeout(timer); status.hidden = true; },
};

window.SEMED_UI = semedUi;
window.addEventListener("unhandledrejection", (event) => semedUi.error(event.reason?.message || "O sistema encontrou uma falha inesperada."));
window.addEventListener("error", () => semedUi.error("O sistema encontrou uma falha inesperada."));
