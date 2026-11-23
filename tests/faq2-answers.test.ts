// FAQ answer 2 on the homepage: the visible Questions answer and the FAQPage JSON-LD
// acceptedAnswer must be the same text, and that text must name both 402 and 403.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// @ts-ignore plain JS build script
import { build } from "../website/build.mjs";

const SITE = "https://attackfee.dev";
const FAQ2_Q = "How do I stop AI agents from flooding my forms without blocking them from my site?";

const decode = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const text = (html: string) => decode(html.replace(/<[^>]+>/g, ""));
const norm = (s: string) => decode(s).replace(/\s+/g, " ").trim();

let OUT = "";
before(() => { OUT = build(mkdtempSync(join(tmpdir(), "attackfee-faq2-")) + "/", SITE, () => {}); });
after(() => { if (OUT) rmSync(OUT, { recursive: true, force: true }); });

test("homepage FAQ 2: visible answer and JSON-LD answer match, and name both 402 and 403", () => {
  const html = readFileSync(OUT + "index.html", "utf8");
  const section = /<section class="sec" id="faq"[\s\S]*?<\/section>/.exec(html)?.[0] ?? "";
  const visiblePairs = [...section.matchAll(/<h3>([\s\S]*?)<\/h3><p>([\s\S]*?)<\/p>/g)].map((m) => [norm(text(m[1])), norm(text(m[2]))]);
  const visible = visiblePairs.find(([q]) => q === FAQ2_Q)?.[1] ?? "";
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  const items = blocks.flatMap((d) => d["@graph"] ?? [d]);
  const faq = items.find((i) => i["@type"] === "FAQPage");
  const ld = norm(faq?.mainEntity?.find((q: { name: string; acceptedAnswer?: { text?: string } }) => q.name === FAQ2_Q)?.acceptedAnswer?.text ?? "");
  assert.ok(visible, "visible FAQ 2 answer is present");
  assert.ok(ld, "JSON-LD FAQ 2 answer is present");
  assert.equal(visible, ld, "visible FAQ 2 and JSON-LD FAQ 2 answers match");
  assert.match(visible, /402/, "FAQ 2 names 402");
  assert.match(visible, /403/, "FAQ 2 names 403");
});
