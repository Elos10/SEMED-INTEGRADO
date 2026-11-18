import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8").replace(/\r/g, "");
const standard = read("consultation-standard.css");
for (const path of [
  "work/semed-comunicacao-fix/app/consultation-standard.css",
  "modules/gestao-avaliacoes/apps/web/src/consultation-standard.css",
]) assert.equal(read(path), standard, `Padrão divergente: ${path}`);
for (const rule of [
  "color-scheme: light", "background-color: #ffffff !important",
  "color: #000000 !important", "select option", 'table *', '[role="listbox"]',
  "outline: 2px solid #000000",
]) assert.ok(standard.includes(rule), `Regra ausente: ${rule}`);
for (const path of ["design-system.css", "modules/workspace-reference.css", "modules/gestao-avaliacoes/apps/web/src/index.css", "work/semed-comunicacao-fix/app/globals.css", "scripts/build-portal.mjs"]) {
  assert.ok(read(path).includes("consultation-standard.css"), `Integração ausente: ${path}`);
}
console.log("Padrão branco/preto, foco e integração verificados nas aplicações.");
