import { cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const output = path.join(root, "public");
const rootFiles = [
  "index.html",
  "captcha.js",
  "design-system.css",
  "module-auth-guard.js",
  "portal-admin.js",
  "portal-auth-critical.css",
  "portal-auth.js",
  "portal-modern.css",
  "shared-runtime.js",
  "supabase-config.js",
];

await rm(output, { recursive: true, force: true });
await mkdir(path.join(output, "modules"), { recursive: true });

await Promise.all(rootFiles.map((file) => cp(path.join(root, file), path.join(output, file))));
await Promise.all([
  cp(path.join(root, "modules", "monitor"), path.join(output, "modules", "monitor"), { recursive: true }),
  cp(path.join(root, "modules", "votacao"), path.join(output, "modules", "votacao"), { recursive: true }),
  cp(path.join(root, "modules", "inteligencia"), path.join(output, "modules", "inteligencia"), { recursive: true }),
]);

const moduleFiles = await readdir(path.join(root, "modules"), { withFileTypes: true });
await Promise.all(
  moduleFiles
    .filter((entry) => entry.isFile() && entry.name.endsWith(".css"))
    .map((entry) => cp(path.join(root, "modules", entry.name), path.join(output, "modules", entry.name))),
);

console.log("Portal estático preparado em public/.");
