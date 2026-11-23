// Builds the widget into dist/:
//   attackfee.js                  page script (custom element + form binding + the engine's headless solver), esbuild IIFE
//   attackfee.worker.js           the engine's prebuilt PBKDF2 worker, copied unchanged from the pinned package
//   attackfee.worker-argon2id.js  the engine's prebuilt Argon2id worker (hardened mode only; lazy, not in the default path)
//   LICENSES.txt             third-party notices for everything bundled or copied above
// Engine and versions: docs/adapters.md. Nothing here is fetched from a CDN at build or run time.
import { build } from "esbuild";
import { gzipSync } from "node:zlib";
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const require = createRequire(here + "package.json");
/** Package root of `name` as resolved from `req` (walks up from the entry file; works with "exports"). */
function pkgDir(name, req = require) {
  let d = dirname(req.resolve(name));
  while (!(existsSync(d + "/package.json") && JSON.parse(readFileSync(d + "/package.json", "utf8")).name === name)) {
    if (d === dirname(d)) throw new Error("package root not found: " + name);
    d = dirname(d);
  }
  return d;
}
const engineUi = pkgDir("altcha"); // prebuilt workers only; its UI is never loaded
const engineLib = pkgDir("altcha-lib", createRequire(here + "../work-adapter/package.json")); // the solver attackfee.js bundles, via @attackfee/work-adapter/browser
const hashWasm = pkgDir("hash-wasm", createRequire(engineUi + "/package.json"));

mkdirSync(here + "dist", { recursive: true });
await build({ bundle: true, minify: true, format: "iife", target: ["es2020"], legalComments: "none", loader: { ".css": "text" }, entryPoints: [here + "src/index.ts"], outfile: here + "dist/attackfee.js" });
copyFileSync(engineUi + "/dist/workers/pbkdf2.js", here + "dist/attackfee.worker.js");
copyFileSync(engineUi + "/dist/workers/argon2id.js", here + "dist/attackfee.worker-argon2id.js");

const ver = (d) => JSON.parse(readFileSync(d + "/package.json", "utf8")).version;
const lic = (d, f) => readFileSync(d + "/" + f, "utf8").trim();
writeFileSync(here + "dist/LICENSES.txt", [
  "Third-party software in attackfee.js, attackfee.worker.js and attackfee.worker-argon2id.js",
  "",
  `altcha-lib ${ver(engineLib)} (solver, bundled into attackfee.js)`, lic(engineLib, "LICENSE.txt"), "",
  `altcha ${ver(engineUi)} (prebuilt workers: attackfee.worker.js, attackfee.worker-argon2id.js)`, lic(engineUi, "LICENSE.txt"), "",
  `hash-wasm ${ver(hashWasm)} (inside attackfee.worker-argon2id.js)`, lic(hashWasm, "LICENSE"), "",
].join("\n"));

const BUDGET = 25 * 1024;
const size = (f) => { const b = readFileSync(here + "dist/" + f); return { raw: b.length, gz: gzipSync(b, { level: 9 }).length }; };
let total = 0;
for (const f of ["attackfee.js", "attackfee.worker.js"]) {
  const s = size(f);
  total += s.gz;
  console.log(`widget: dist/${f} ${s.raw} B, ${s.gz} B gzipped`);
}
const a = size("attackfee.worker-argon2id.js");
console.log(`widget: dist/attackfee.worker-argon2id.js ${a.raw} B, ${a.gz} B gzipped (hardened mode only, loaded on demand)`);
console.log(`widget: default path total ${total} B gzipped (budget ${BUDGET} B); hardened path ${total - size("attackfee.worker.js").gz + a.gz} B`);
if (total > BUDGET) {
  console.error("widget: over the 25 KB gzip budget");
  process.exit(1);
}
