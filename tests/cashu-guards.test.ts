// The guard fails on the known-bad samples in tests/fixtures/cashu-guards/, and it is quiet on this tree.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { conservationHits, tokenHits, treeHits } from "../scripts/cashu-guards.ts";

const sample = (name: string) => readFileSync(new URL("./fixtures/cashu-guards/" + name, import.meta.url), "utf8");

test("this tree has no cashuB-only gate and abort() stays on an empty restore", () => {
  assert.deepEqual(treeHits(), []);
});

test("a redeem body that requires cashuB, and a header that refuses cashuA, are gates", () => {
  const rail = sample("redeem-body.ts.txt");
  const http = sample("cashu-header.ts.txt");
  const codec = sample("presented-cashu.ts.txt");
  assert.ok(tokenHits("packages/settlement-ln/src/rail.ts", rail).some((h) => h.rule === "cashuB-only gate"));
  assert.ok(tokenHits("packages/server-node/src/http.ts", http).some((h) => h.rule === "cashuA is not a payment"));
  assert.ok(tokenHits("packages/settlement-ln/src/cashu.ts", codec).some((h) => h.rule === "cashuA is not a payment"));
  assert.match(rail, /!body\.token\.startsWith\("cashuB"\)/);
  assert.match(http, /presented\.kind === "a"/);
  assert.match(codec, /startsWith\("cashuA"\)\) return \{ kind: "a" \}/);
});

test("cashuA is refused in Node, PHP, and the payer", () => {
  const http = sample("owner-cashu.ts.txt");
  const php = sample("settlement.php.txt");
  const gate = sample("presented-gate.php.txt");
  const payer = sample("payer-load.ts.txt");
  assert.ok(tokenHits("packages/server-node/src/http.ts", http).length > 0);
  assert.ok(tokenHits("packages/server-php/src/Settlement.php", php).some((h) => h.rule === "cashuA is not a payment"));
  assert.ok(tokenHits("packages/wp-attackfee/includes/gate.php", gate).some((h) => h.rule === "cashuA is not a payment"));
  assert.ok(tokenHits("packages/agent/src/cashu-payer.ts", payer).some((h) => h.rule === "cashuB-only gate"));
  assert.match(php, /str_starts_with\(\$t, 'cashuA'\)\) return \['kind' => 'a'\]/);
  assert.match(gate, /\$p\['kind'\] === 'a'\) return \[400, \['error' => 'malformed'\]/);
});

test("abort and lose run while the mint still holds the outputs", () => {
  const src = sample("abort-on-bad.ts.txt");
  const hits = conservationHits(src);
  assert.ok(hits.some((h) => h.rule.includes("not gated")));
  assert.ok(hits.some((h) => h.rule.startsWith("lose()")));
});

test("a cashuB check that is not startsWith, and a cashuA refusal that is not one line, are still gates", () => {
  const tsCases = [
    `if (body.token.slice(0, 6) !== "cashuB") throw new Error("malformed");`,
    `if (/^cashuB/.test(header)) return header; throw new Error("malformed");`,
    `if (header.indexOf("cashuB") !== 0) return null;`,
    `if (presented.kind === "a")\n  return { error: "malformed" };`,
    `if (token.startsWith("cashuA")) return null;`,
    `if (s.startsWith("cashuB") && !s.startsWith("cashuA")) return s;`,
  ];
  for (const src of tsCases) assert.ok(tokenHits("fixture.ts", src).length > 0, src);
  assert.ok(tokenHits("fixture.php", `if (substr($payment, 0, 6) === 'cashuB') return $payment;`).length > 0);
  assert.ok(tokenHits("fixture.php", `if (str_starts_with($token, 'cashuA')) return null;`).some((h) => h.rule.includes("cashuA")));
});

test("abort.bind and an abort() outside cashu-receive.ts are still unguarded", () => {
  const src = `function pay() {\n  const drop = store.abort.bind(store);\n  if (bad) drop(id);\n}\n`;
  assert.ok(conservationHits(src, "packages/other.ts").some((h) => h.rule.includes("not gated")));
});

test("extra parentheses or a broken if still count as the empty-restore guard", () => {
  const wrapped = `function f() { if ((empty && !unclear && state === "unspent")) { store.abort(id); } }`;
  const broken = `function f() {\n  if (\n    empty &&\n    !unclear &&\n    state === "unspent"\n  ) { store.abort(id); }\n}`;
  assert.deepEqual(conservationHits(wrapped), []);
  assert.deepEqual(conservationHits(broken), []);
});

test("a sweeper may abort after tryRestore is none and tryCheck is unspent", () => {
  const src = `async function recoverSaved() {\n  for (const pending of rows) {\n    const restored = await this.tryRestore(pending);\n    if (restored.kind !== "none") continue;\n    if ((await this.tryCheck(pending)) === "unspent") await store.abort(pending.id);\n  }\n}\n`;
  assert.deepEqual(conservationHits(src), []);
});

test("abort on a mint refusal is not an empty restore", () => {
  const src = sample("abort-on-refused.ts.txt");
  const hits = conservationHits(src);
  assert.ok(hits.some((h) => h.rule.includes("empty restore")));
  assert.match(src, /if \(outcome\.kind === "refused" && state === "unspent"\)/);
});

test("the current receive file gates the one abort() on an empty restore", () => {
  const src = readFileSync("packages/settlement-ln/src/cashu-receive.ts", "utf8");
  assert.deepEqual(conservationHits(src), []);
});

test("PHP hits are on the call, not an earlier line", () => {
  const php = sample("settlement.php.txt");
  const gate = sample("presented-gate.php.txt");
  const lines = tokenHits("packages/server-php/src/Settlement.php", php).map((h) => h.line).sort((a, b) => a - b);
  assert.deepEqual(lines, [99, 100, 161]);
  assert.deepEqual(tokenHits("packages/wp-attackfee/includes/gate.php", gate).map((h) => h.line), [9]);
});

test("call, switch, element access, match, apply, and strpos still refuse cashuA or abort", () => {
  const tsCases = [
    `if (String.prototype.startsWith.call(token, "cashuB")) return token; throw new Error("malformed");`,
    `switch (token.slice(0, 6)) { case "cashuB": return token; default: throw new Error("malformed"); }`,
    `if (token["startsWith"]("cashuB")) return token;`,
    `if (token.match(/^cashuB/) == null) throw new Error("malformed");`,
  ];
  for (const src of tsCases) assert.ok(tokenHits("fixture.ts", src).length > 0, src);
  assert.ok(conservationHits(`function pay() { store.abort.apply(store, [id]); }`, "packages/other.ts").some((h) => h.rule.includes("not gated")));
  assert.ok(tokenHits("fixture.php", `if (strpos($payment, 'cashuB') === 0) return $payment;`).length > 0);
});

test("an inconclusive restore is not an empty restore, and a saved check or UNSPENT still is", () => {
  const bad = `function f() { if (empty && unclear && state === "unspent") store.abort(id); }`;
  const saved = `function f() { const clear = empty && state === "unspent"; if (clear) store.abort(id); }`;
  const upper = `function f() { if (restored.kind === "none" && state === "UNSPENT") store.abort(id); }`;
  assert.ok(conservationHits(bad).some((h) => h.rule.includes("not gated")));
  assert.deepEqual(conservationHits(saved), []);
  assert.deepEqual(conservationHits(upper), []);
});
