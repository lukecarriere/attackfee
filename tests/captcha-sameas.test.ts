// CAPTCHA may appear only in two approved plain-comparison sentences
// (Luke, 2026-11-18, 10:58 PM CT). It still fails in <title>, the meta
// description, og:* and twitter:* tags, h1-h3, and FAQ questions.
// Organization JSON-LD lists https://x.com/attackfee as sameAs.
import { test } from "node:test";
import assert from "node:assert/strict";
// @ts-ignore plain JS helper
import { lintText } from "../scripts/copy-lib.mjs";
// @ts-ignore plain JS build script
import { HOME, renderHome } from "../website/build.mjs";

const SENTENCE_DEF = "People never pay money, and there is no CAPTCHA to solve.";
const SENTENCE_HOW = "There is no CAPTCHA to solve and nothing to click.";
const SAME_AS = ["https://x.com/attackfee"];
const SITE = "https://attackfee.dev";

function terms(html: string): string[] {
  return lintText("website/index.html", html).map((h: { term: string }) => h.term);
}

function graph(html: string) {
  const raw = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)?.[1];
  assert.ok(raw, "homepage JSON-LD is present");
  return JSON.parse(raw)["@graph"] as Array<Record<string, unknown>>;
}

test("an approved CAPTCHA comparison sentence passes the copy lint", () => {
  assert.deepEqual(lintText("website/index.html", SENTENCE_DEF), []);
  assert.deepEqual(lintText("website/index.html", SENTENCE_HOW), []);
  assert.deepEqual(lintText("website/build.mjs", `definition: "${SENTENCE_DEF}"`), []);
  assert.deepEqual(lintText("website/index.html", `<p>${SENTENCE_HOW}</p>`), []);
});

test("captcha in a title, meta, og or twitter tag, h2 or FAQ question still fails", () => {
  const hits = (s: string) => terms(s).filter((t) => t === "captcha" || t === "captchas");
  assert.ok(hits("<title>No captcha to solve</title>").length, "title");
  assert.ok(hits('<meta name="description" content="No captcha to solve">').length, "meta description");
  assert.ok(hits('<meta property="og:description" content="No captcha to solve">').length, "og:description");
  assert.ok(hits('<meta name="twitter:description" content="No captcha to solve">').length, "twitter:description");
  assert.ok(hits("<h2>No captcha to solve</h2>").length, "h2");
  assert.ok(hits('{"@type":"Question","name":"Is there a captcha?","acceptedAnswer":{"@type":"Answer","text":"No."}}').length, "FAQ question");
  // An approved sentence in a restricted place is still a fail.
  assert.ok(hits(`<title>${SENTENCE_HOW}</title>`).length, "approved sentence in title");
  assert.ok(hits(`<h2>${SENTENCE_HOW}</h2>`).length, "approved sentence in h2");
  assert.ok(hits(`{"@type":"Question","name":"${SENTENCE_DEF}","acceptedAnswer":{"@type":"Answer","text":"No."}}`).length, "approved sentence as a FAQ question");
});

test("homepage definition and How it works use the approved CAPTCHA comparison sentences", () => {
  assert.ok(HOME.definition.includes(SENTENCE_DEF), "definition paragraph");
  assert.equal(HOME.definition.includes("have nothing to solve"), false);
  const how = HOME.sections.find((s: { id: string }) => s.id === "how") as { body: Array<{ ol?: string[] }> };
  const step2 = how.body[0]?.ol?.[1] ?? "";
  assert.ok(step2.includes(SENTENCE_HOW), "How it works step 2");
  assert.equal(step2.includes("There is nothing to solve and nothing to click."), false);
  const html = renderHome(SITE);
  assert.ok(html.includes(SENTENCE_DEF));
  assert.ok(html.includes(SENTENCE_HOW));
  const desc = /<meta name="description" content="([^"]*)">/.exec(html)?.[1] ?? "";
  assert.doesNotMatch(desc, /captcha/i, "meta description stays free of captcha");
  assert.doesNotMatch(/<title>[^<]*<\/title>/.exec(html)?.[0] ?? "", /captcha/i, "title stays free of captcha");
});

test("Organization JSON-LD sameAs is exactly the official X profile", () => {
  const org = graph(renderHome(SITE)).find((n) => n["@type"] === "Organization");
  assert.ok(org, "Organization node");
  assert.equal(org["@id"], SITE + "/#org");
  assert.deepEqual(org.sameAs, SAME_AS);
});
