// Live checks for the public Attackfee site.
// Default is free and read-only: health, price, the 403 and 402 gates, and /demo/stats.
// --spend <cap> adds the real-ecash checks. Those need --proofs and --wallet (or ATTACKFEE_PROOFS
// and ATTACKFEE_WALLET). Paths are never built in. Tokens, proofs, and secrets are not printed.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { mainBlocks, markdownPlain, outsideCode, stripAlternate, KEY_FACTS } from "../website/agent-text.mjs";
import { OLD_BRAND } from "./check-served-brand.mjs";

const SECRET_KEY = /^(secret|C|c|dleq|proofs|pass|token|macaroon|invoice|preimage|credential|sig|signature|request)$/i;
const SECRET_TEXT = /(cashu[AB]|creqA|eyJ)[A-Za-z0-9_\-+/=.]{12,}|((?:Attackfee|Bearer|L402)\s+)[A-Za-z0-9_\-+/=.:]{12,}/g;

export function redact(value) {
  const json = JSON.stringify(value, (key, item) => {
    if (key && SECRET_KEY.test(key) && item != null && typeof item !== "number" && typeof item !== "boolean") {
      const rendered = typeof item === "string" ? item : JSON.stringify(item);
      return `<${key} redacted ${rendered.length} chars>`;
    }
    return item;
  });
  return json.replace(SECRET_TEXT, (match, prefix) => `<${(prefix || match.slice(0, 6)).trim()} redacted ${match.length}>`);
}

function arg(name, fallback = "") {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")) return process.argv[i + 1];
  return fallback;
}

function has(name) {
  return process.argv.includes(name);
}

export const DEFAULT_EXPECT = "cashu";

export function parseExpect(value) {
  if (value !== "off" && value !== "cashu") {
    throw new Error("expect must be off|cashu");
  }
  return value;
}

export function resolveMint({ arg = "", env = "", offer = "", manifest = "" } = {}) {
  for (const value of [arg, env, offer, manifest]) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

/** Refusal cases derived from the allowlisted mint, plus the generic unlisted test mint. */
export function unlistedMints(allowlisted) {
  const out = ["https://testnut.cashu.space"];
  try {
    const url = new URL(allowlisted);
    out.push(`${url.origin}/Other`);
    const rest = url.href.slice(url.protocol.length);
    out.push(`${url.protocol === "https:" ? "http:" : "https:"}${rest}`);
  } catch {
    /* ignore a bad allowlist value; the generic test mint is still tried */
  }
  return out.filter((mint, i, all) => mint && mint !== allowlisted && all.indexOf(mint) === i);
}

export function parseL402WwwAuthenticate(header) {
  if (typeof header !== "string") return null;
  const match = /^L402\s+macaroon="([^"]+)",\s*invoice="([^"]+)"/.exec(header.trim());
  if (!match) return null;
  return { scheme: "L402", macaroon: match[1], invoice: match[2] };
}

/**
 * Spend-mode test header. Every request carries `attackfee-test: 1` so it lands in the test_*
 * counters, except with `countReal`: then exactly one request, the first paid write (kind "pay"),
 * goes without it so the real paid_writes / sats_settled columns move once.
 * Kinds: "offer" (fetch a 402), "pay" (the request that carries the payment), "use" (spend the
 * pass), "other".
 */
export function testHeaderPlan({ countReal = false } = {}) {
  let left = countReal ? 1 : 0;
  let sent = 0;
  return {
    headers(kind) {
      if (kind === "pay" && left > 0) {
        left--;
        sent++;
        return {};
      }
      return { "attackfee-test": "1" };
    },
    realSent: () => sent,
  };
}

function readSecretFile(file, what) {
  if (typeof file !== "string" || file === "" || /^ln[a-z]{2,}[0-9]/i.test(file.trim())) {
    throw new Error(`${what} must be given as a file path, never in argv`);
  }
  const value = readFileSync(path.resolve(file), "utf8").trim();
  if (!value) throw new Error(`${what} file is empty`);
  return value;
}

/**
 * Owner withdraw: POST /v1/owner/withdraw {invoice} with the owner key, and read the balance
 * before and after. The invoice and the key come from files and are never printed or logged.
 * PASS when the withdraw answers 200 paid (or 202 pending) and withdrawn_msat went up.
 */
export async function withdrawStep({ base, invoiceFile, keyFile, note, fetchImpl = fetch }) {
  const invoice = readSecretFile(invoiceFile, "withdraw invoice");
  const key = readSecretFile(keyFile, "owner key");
  const auth = { authorization: "Bearer " + key, accept: "application/json" };
  const balance = async () => {
    const res = await fetchImpl(base + "/v1/owner/balance", { headers: auth, signal: AbortSignal.timeout(20000) });
    const json = await res.json().catch(() => ({}));
    return { http: res.status, available_msat: json.available_msat, withdrawn_msat: json.withdrawn_msat };
  };
  const before = await balance();
  const res = await fetchImpl(base + "/v1/owner/withdraw", {
    method: "POST",
    headers: { ...auth, "content-type": "application/json", "attackfee-test": "1" },
    body: JSON.stringify({ invoice }),
    signal: AbortSignal.timeout(60000),
  });
  const body = await res.json().catch(() => ({}));
  const after = await balance();
  const state = typeof body.state === "string" ? body.state : null;
  const settled = (res.status === 200 && state === "paid") || res.status === 202;
  const moved = Number.isSafeInteger(before.withdrawn_msat) && Number.isSafeInteger(after.withdrawn_msat) && after.withdrawn_msat > before.withdrawn_msat;
  const pass = before.http === 200 && settled && (res.status === 202 || moved);
  note("withdraw", pass ? "PASS" : "FAIL", { http: res.status, state, amount_msat: body.amount_msat ?? null, fee_msat: body.fee_msat ?? null, before, after });
  return pass;
}

const HELP = `Usage: scripts/live-checks.sh [--base URL] [--out dir] [--expect off|cashu] [--mint URL] [--spend <cap>] [--proofs file] [--wallet module] [--src checkout] [--steps a,b,c,d,e,f] [--count-real] [--withdraw-invoice-file file --owner-key-file file] [--only agentRead] [--html-baseline file]

Free read-only checks (the default): health, price, POST /demo/contact 403 without an agent header, the agent gate for the chosen --expect mode, a never-paying L402 header check when --expect cashu, and GET /demo/stats with exactly {accepted, rejected, reversals, reversed_sats}. Default --expect is cashu, matching production payments-on. Pass --expect off for a work-only origin.

The free run ends with agentRead: every sitemap page asked for with a GPTBot user agent and with Accept: text/markdown must answer 200 text/markdown (Vary: Accept, User-Agent) with no script outside code, no site chrome and no old product name, and every text block of the page's HTML <main> must be in it. The browser HTML, minus its one Markdown alternate link, must hash to --html-baseline (JSON of path to sha256) when given, else to the --src checkout's built website/dist. If that directory is missing and no baseline is given, the check stops. A GPTBot write with the agent header must still get 402 (403 with --expect off). --only agentRead runs just that check.

--spend <cap> also runs the real-ecash checks and will not spend more than <cap>. It reads proofs from --proofs or ATTACKFEE_PROOFS and the wallet module from --wallet or ATTACKFEE_WALLET. The module exports wallet(), norm, and MINT. Nothing secret is printed. A spend run's .state.json is mode 0600 and stays in the out dir.

--count-real (spend mode only) sends exactly one paid write without the attackfee-test header, so the real paid_writes and sats_settled columns move once. Every other request keeps the header. Without it, behaviour is unchanged.

--withdraw-invoice-file <file> adds the withdraw step: POST /v1/owner/withdraw with the invoice read from the file and the owner key read from --owner-key-file (or OWNER_KEY_FILE). Neither is ever printed. It only runs when the flag is given.
`;

function schemeOf(value) {
  if (typeof value !== "string") return null;
  if (value.startsWith("cashuB")) return "cashuB";
  if (value.startsWith("cashuA")) return "cashuA";
  if (value.startsWith("creqA")) return "creqA";
  return "other";
}

async function main() {
  if (has("--help") || has("-h")) {
    process.stdout.write(HELP);
    process.exit(0);
  }
  const here = path.dirname(new URL(import.meta.url).pathname);
  const repo = path.resolve(here, "..");
  const base = (arg("--base", process.env.ATTACKFEE_BASE || "https://attackfee.dev")).replace(/\/$/, "");
  let expect;
  try {
    expect = parseExpect(arg("--expect", process.env.EXPECT_PAYMENT || DEFAULT_EXPECT));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "expect must be off|cashu");
    process.exit(64);
  }
  const mintArg = arg("--mint", process.env.ATTACKFEE_MINT || "");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const out = path.resolve(arg("--out", path.join(repo, ".verify-attackfee", `live-${stamp}`)));
  const spend = arg("--spend", "");
  mkdirSync(out, { recursive: true });
  const results = {};
  const lines = [];
  const note = (check, status, detail) => {
    results[check] = status;
    lines.push(`check ${check}: ${status}`);
    writeFileSync(path.join(out, `${check}.json`), redact({ check, status, ...detail }) + "\n");
  };

  const only = arg("--only", "");
  if (only !== "" && only !== "agentRead") {
    console.error("--only takes agentRead");
    process.exit(64);
  }
  const baselineFile = arg("--html-baseline", "");
  const srcRoot = path.resolve(arg("--src", repo));
  let expectedHtml;
  if (baselineFile) expectedHtml = JSON.parse(readFileSync(baselineFile, "utf8"));
  else if (!existsSync(path.join(srcRoot, "website/dist"))) {
    console.error("build the website first or pass --html-baseline");
    process.exit(1);
  } else expectedHtml = builtHtmlHashes(srcRoot);
  if (only === "") await freeChecks({ base, expect, mint: mintArg, note });
  await agentReadCheck({ base, expect, note, expected: expectedHtml });
  if (only !== "") {
    finish(out, base, results, lines, "");
    return;
  }

  if (spend !== "") {
    if (!/^[0-9]+$/.test(spend)) {
      console.error("spend cap must be a whole number");
      process.exit(64);
    }
    const failedFree = Object.values(results).some((status) => status !== "PASS");
    if (failedFree) {
      finish(out, base, results, lines, "free checks failed; spend was not started");
      return;
    }
    await spendChecks({
      base,
      cap: Number(spend),
      out,
      src: path.resolve(arg("--src", repo)),
      proofs: arg("--proofs", process.env.ATTACKFEE_PROOFS || ""),
      walletModule: arg("--wallet", process.env.ATTACKFEE_WALLET || ""),
      mint: mintArg,
      steps: (arg("--steps", "a,b,c,d,e,f")).split(",").map((step) => step.trim()).filter(Boolean),
      plan: testHeaderPlan({ countReal: has("--count-real") }),
      note,
      line: (text) => lines.push(text),
    });
  }

  const withdrawInvoice = arg("--withdraw-invoice-file", "");
  if (withdrawInvoice !== "" || has("--withdraw-invoice-file")) {
    const failedBefore = Object.values(results).some((status) => status !== "PASS" && status !== "PASS_INDIRECT");
    if (failedBefore) {
      finish(out, base, results, lines, "earlier checks failed; withdraw was not started");
      return;
    }
    try {
      await withdrawStep({ base, invoiceFile: withdrawInvoice, keyFile: arg("--owner-key-file", process.env.OWNER_KEY_FILE || ""), note });
    } catch (error) {
      note("withdraw", "FAIL", { reason: error instanceof Error ? error.message : "withdraw failed" });
    }
  }

  finish(out, base, results, lines, "");
}

function finish(out, base, results, lines, extra) {
  const values = Object.values(results);
  const pass = values.length > 0 && values.every((status) => status === "PASS" || status === "PASS_INDIRECT") && !extra;
  const overall = pass ? "PASS" : "FAIL";
  const summary = [
    "# Attackfee live checks",
    "",
    `- base: ${base}`,
    `- overall: ${overall}`,
    extra ? `- note: ${extra}` : "",
    "",
    "| Check | Result |",
    "| --- | --- |",
    ...Object.entries(results).map(([name, status]) => `| ${name} | ${status} |`),
    "",
  ].filter((line) => line !== undefined).join("\n");
  writeFileSync(path.join(out, "SUMMARY.md"), summary);
  for (const line of lines) console.log(line);
  if (extra) console.log(extra);
  console.log(`OVERALL: ${overall}`);
  console.log(`evidence: ${out}`);
  process.exit(pass ? 0 : 1);
}

async function readBody(response) {
  return response.text();
}

export async function freeChecks({ base, expect, mint = "", note }) {
  const healthRes = await fetch(base + "/v1/health", { signal: AbortSignal.timeout(20000) });
  const healthText = await readBody(healthRes);
  let health;
  try { health = JSON.parse(healthText); } catch { health = null; }
  const healthOk = healthRes.status === 200 && health && health.ok === true && typeof health.v === "string" && health.v !== "" && health.settlement === expect && health.edge === true;
  note("health", healthOk ? "PASS" : "FAIL", { http: healthRes.status, ok: health?.ok ?? null, v: health?.v ?? null, settlement: health?.settlement ?? null, edge: health?.edge ?? null });

  const priceRes = await fetch(base + "/v1/price?action=write", { signal: AbortSignal.timeout(20000) });
  const priceText = await readBody(priceRes);
  let price;
  try { price = JSON.parse(priceText); } catch { price = null; }
  const priceOk = expect === "off"
    ? priceRes.status === 200 && price && price.action === "write" && price.status === "stub"
    : priceRes.status === 200 && price && price.action === "write" && price.status === expect && Number.isSafeInteger(price.amount_msat) && price.amount_msat > 0;
  note("price", priceOk ? "PASS" : "FAIL", { http: priceRes.status, action: price?.action ?? null, status: price?.status ?? null, amount_msat: price?.amount_msat ?? null });

  const headers = { accept: "application/json", "content-type": "application/json", "attackfee-test": "1" };
  const human = await fetch(base + "/demo/contact", { method: "POST", headers, body: "{}", signal: AbortSignal.timeout(20000) });
  const humanText = await readBody(human);
  let humanBody;
  try { humanBody = JSON.parse(humanText); } catch { humanBody = null; }
  const humanOk = human.status === 403 && humanBody && humanBody.error === "attackfee_required" && humanBody.challenge && typeof humanBody.challenge === "object" && humanBody.pass === undefined;
  note("gate403", humanOk ? "PASS" : "FAIL", { http: human.status, error: humanBody?.error ?? null, hasChallenge: Boolean(humanBody?.challenge) });

  const agent = await fetch(base + "/demo/contact", { method: "POST", headers: { ...headers, "attackfee-client": "agent" }, body: "{}", signal: AbortSignal.timeout(20000) });
  const agentText = await readBody(agent);
  let agentBody;
  try { agentBody = JSON.parse(agentText); } catch { agentBody = null; }
  const offers = Array.isArray(agentBody?.offers) ? agentBody.offers : [];
  const cashu = offers.find((offer) => offer && offer.kind === "cashu");
  const l402Offer = offers.find((offer) => offer && (offer.kind === "l402" || offer.kind === "ln402"));
  const headerScheme = schemeOf(agent.headers.get("x-cashu") || "");
  const www = agent.headers.get("www-authenticate") || "";
  const l402Header = parseL402WwwAuthenticate(www);
  const expectedMint = resolveMint({ arg: mint, env: process.env.ATTACKFEE_MINT, offer: cashu?.mint || "" });

  let agentOk = false;
  if (expect === "off") {
    agentOk = agent.status === 403 && agentBody && agentBody.error === "attackfee_required" && agentBody.challenge && typeof agentBody.challenge === "object" && agentBody.pass === undefined && headerScheme !== "creqA" && !l402Header;
  } else {
    const mintOk = !mint || (cashu && cashu.mint === expectedMint);
    agentOk = agent.status === 402 && agentBody && agentBody.error === "payment_required" && headerScheme === "creqA" && cashu && Number.isSafeInteger(cashu.amount) && typeof cashu.mint === "string" && mintOk && agentBody.pass === undefined;
  }
  note("gateAgent", agentOk ? "PASS" : "FAIL", { http: agent.status, error: agentBody?.error ?? null, xCashu: headerScheme, offerKind: cashu?.kind ?? null, offerAmount: cashu?.amount ?? null, offerMint: cashu?.mint ?? null });

  if (expect === "cashu") {
    let invoiceMsat = null;
    if (l402Header?.invoice) {
      try {
        const here = path.dirname(new URL(import.meta.url).pathname);
        const { decodeBolt11 } = await import(pathToFileURL(path.join(here, "../packages/settlement-ln/src/bolt11.ts")).href);
        invoiceMsat = decodeBolt11(l402Header.invoice).amountMsat;
      } catch {
        invoiceMsat = null;
      }
    }
    const offerInvoice = typeof l402Offer?.invoice === "string" ? l402Offer.invoice : "";
    const offerMsat = Number.isSafeInteger(l402Offer?.amount_msat) ? l402Offer.amount_msat : null;
    const priceMsat = Number.isSafeInteger(price?.amount_msat) ? price.amount_msat : null;
    const l402Ok = Boolean(l402Header) && l402Header.scheme === "L402" && typeof l402Header.invoice === "string" && l402Header.invoice.startsWith("ln") && invoiceMsat != null && priceMsat != null && invoiceMsat === priceMsat && (offerMsat == null || offerMsat === priceMsat) && (offerInvoice === "" || offerInvoice === l402Header.invoice);
    note("l402", l402Ok ? "PASS" : "FAIL", { scheme: l402Header?.scheme ?? null, invoiceMsat, priceMsat, offerMsat, invoiceMatchesOffer: offerInvoice === "" ? null : offerInvoice === l402Header?.invoice });
  }

  const statsRes = await fetch(base + "/demo/stats", { signal: AbortSignal.timeout(20000) });
  const statsText = await readBody(statsRes);
  let stats;
  try { stats = JSON.parse(statsText); } catch { stats = null; }
  const keys = stats && typeof stats === "object" ? Object.keys(stats).sort() : [];
  const want = ["accepted", "rejected", "reversals", "reversed_sats"];
  const statsOk = statsRes.status === 200 && JSON.stringify(keys) === JSON.stringify(want) && want.every((key) => Number.isSafeInteger(stats[key]) && stats[key] >= 0);
  note("stats", statsOk ? "PASS" : "FAIL", { http: statsRes.status, keys, accepted: stats?.accepted ?? null, rejected: stats?.rejected ?? null, reversals: stats?.reversals ?? null, reversed_sats: stats?.reversed_sats ?? null });
}

export const GPTBOT_UA = "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2";
export const BROWSER_UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const BROWSER_ACCEPT = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
const MD_TYPE = "text/markdown; charset=utf-8";
const squash = (s) => s.replace(/\s+/g, "");
const sha256 = (s) => createHash("sha256").update(s).digest("hex");

/** sha256 of each built page's HTML without its Markdown alternate link, keyed by URL path. Empty when there is no build. */
export function builtHtmlHashes(src) {
  const out = {};
  const dist = path.join(src, "website/dist");
  const sm = path.join(dist, "sitemap.xml");
  if (!existsSync(sm)) return out;
  for (const m of readFileSync(sm, "utf8").matchAll(/<loc>([^<]*)<\/loc>/g)) {
    const p = new URL(m[1]).pathname;
    const rel = p === "/" ? "" : p.slice(1);
    const file = p === "/" ? "index.html" : existsSync(path.join(dist, rel, "index.html")) ? rel + "/index.html" : rel + ".html";
    if (existsSync(path.join(dist, file))) out[p] = sha256(stripAlternate(readFileSync(path.join(dist, file), "utf8")));
  }
  return out;
}

/** What one agent-view response shows: status, type, vary, and what is wrong with its body. */
function inspectMarkdown(res, body, blocks, isHome) {
  const vary = (res.headers.get("vary") || "").toLowerCase().split(",").map((v) => v.trim());
  const prose = outsideCode(body);
  const plain = squash(markdownPlain(body));
  return {
    http: res.status,
    type: res.headers.get("content-type"),
    vary: res.headers.get("vary"),
    ok200: res.status === 200,
    typeOk: res.headers.get("content-type") === MD_TYPE,
    varyOk: vary.includes("accept") && vary.includes("user-agent"),
    script: /<script/i.test(prose),
    chrome: /<(?:nav|header|footer|html|body)\b|aria-label=|This site has no analytics and no tracking scripts\./i.test(prose),
    oldName: OLD_BRAND.test(body),
    missingBlocks: blocks.filter((b) => !plain.includes(squash(b))).slice(0, 5),
    missingFacts: isHome ? KEY_FACTS.filter((f) => !plain.includes(squash(f))) : [],
  };
}

const mdOk = (r) => r.ok200 && r.typeOk && r.varyOk && !r.script && !r.chrome && !r.oldName && r.missingBlocks.length === 0 && r.missingFacts.length === 0;

/**
 * Cloudflare Web Analytics inserts this script into HTML responses, then one newline before </body>.
 * It is not page content. Only this host is removed, together with that newline, so the bytes match
 * the built page. Any other script stays, so the HTML hash and the Markdown script check still fail.
 */
const INSIGHTS_BEACON = /<script\b[^>]*\bsrc=["'](?:https:)?\/\/static\.cloudflareinsights\.com\/[^"']*["'][^>]*>\s*<\/script>\r?\n?/gi;

export function stripInsightsBeacon(html) {
  return html.replace(INSIGHTS_BEACON, "");
}

/**
 * agentRead: every sitemap page as an AI agent sees it. Read-only GETs, plus one unpaid write with
 * attackfee-test: 1 that must still get 402 (403 with --expect off). `expected` maps a page path to the sha256 of its human HTML
 * without the alternate link; a page missing from it fails.
 */
export async function agentReadCheck({ base, expect = DEFAULT_EXPECT, note, expected = {} }) {
  const get = async (p, headers) => {
    const res = await fetch(base + p, { headers, signal: AbortSignal.timeout(20000) });
    return { res, body: await readBody(res) };
  };
  const pages = [];
  let sitemapOk = false;
  try {
    const sm = await get("/sitemap.xml", { "user-agent": BROWSER_UA });
    const locs = [...sm.body.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
    sitemapOk = sm.res.status === 200 && locs.length > 0;
    for (const p of locs) {
      const human = await get(p, { "user-agent": BROWSER_UA, accept: BROWSER_ACCEPT });
      const humanHtml = stripInsightsBeacon(human.body);
      const blocks = mainBlocks(humanHtml);
      const isHome = p === "/";
      const htmlFacts = isHome ? KEY_FACTS.filter((f) => !squash(blocks.join("\n")).includes(squash(f))) : [];
      const alternates = [...humanHtml.matchAll(/<link rel="alternate" type="text\/markdown" href="([^"]*)">/g)].map((m) => m[1]);
      const hash = sha256(stripAlternate(humanHtml));
      const humanVary = (human.res.headers.get("vary") || "").toLowerCase();
      const page = {
        path: p,
        human: { http: human.res.status, type: human.res.headers.get("content-type"), vary: human.res.headers.get("vary"), alternates, hash, expected: expected[p] ?? null, blocks: blocks.length, missingFacts: htmlFacts },
      };
      const humanOk = human.res.status === 200 && /^text\/html\b/.test(human.res.headers.get("content-type") || "") && humanVary.includes("accept") && humanVary.includes("user-agent") && alternates.length === 1 && blocks.length > 0 && htmlFacts.length === 0 && expected[p] === hash;
      const ua = await get(p, { "user-agent": GPTBOT_UA });
      const accept = await get(p, { "user-agent": BROWSER_UA, accept: "text/markdown" });
      page.gptbot = inspectMarkdown(ua.res, ua.body, blocks, isHome);
      page.acceptMarkdown = inspectMarkdown(accept.res, accept.body, blocks, isHome);
      let twinOk = false;
      if (alternates.length === 1) {
        const twin = await get(new URL(alternates[0], base).pathname, { "user-agent": BROWSER_UA });
        page.twin = { path: new URL(alternates[0], base).pathname, http: twin.res.status, type: twin.res.headers.get("content-type"), sameAsNegotiated: twin.body === ua.body };
        twinOk = twin.res.status === 200 && twin.res.headers.get("content-type") === MD_TYPE && twin.body === ua.body && ua.body === accept.body;
      }
      page.ok = humanOk && mdOk(page.gptbot) && mdOk(page.acceptMarkdown) && twinOk;
      pages.push(page);
    }
  } catch (error) {
    pages.push({ error: error instanceof Error ? error.message : "request failed" });
  }
  const write = await fetch(base + "/demo/contact", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", "attackfee-test": "1", "attackfee-client": "agent", "user-agent": GPTBOT_UA },
    body: "{}",
    signal: AbortSignal.timeout(20000),
  });
  let writeBody;
  try { writeBody = JSON.parse(await readBody(write)); } catch { writeBody = null; }
  // The same gate answer as gateAgent: a GPTBot user agent changes nothing about a write.
  const writeOk = expect === "off" ? write.status === 403 && writeBody?.error === "attackfee_required" : write.status === 402 && writeBody?.error === "payment_required";
  const pass = sitemapOk && pages.length > 0 && pages.every((page) => page.ok === true) && writeOk;
  note("agentRead", pass ? "PASS" : "FAIL", { sitemapOk, pages: pages.length, failed: pages.filter((page) => page.ok !== true).map((page) => page.path ?? page.error), write402: { http: write.status, error: writeBody?.error ?? null }, detail: pages });
}

async function spendChecks({ base, cap, out, src, proofs, walletModule, mint: mintArg = "", steps, plan = testHeaderPlan(), note, line }) {
  if (!proofs || !walletModule) {
    console.error("spend mode needs --proofs and --wallet (or ATTACKFEE_PROOFS and ATTACKFEE_WALLET)");
    process.exit(64);
  }
  process.umask(0o077);
  const walletDir = path.dirname(path.resolve(walletModule));
  process.chdir(walletDir);
  const mod = await import(pathToFileURL(path.resolve(walletModule)).href);
  const norm = mod.norm;
  const MINT = resolveMint({ arg: mintArg, env: process.env.ATTACKFEE_MINT, offer: mod.MINT });
  if (typeof mod.wallet !== "function" || typeof norm !== "function" || typeof MINT !== "string" || MINT === "") {
    console.error("wallet module must export wallet(), norm, and MINT (or pass --mint / ATTACKFEE_MINT)");
    process.exit(64);
  }
  let cashuTs;
  try {
    cashuTs = await import(pathToFileURL(path.join(walletDir, "node_modules/@cashu/cashu-ts/lib/cashu-ts.es.js")).href);
  } catch {
    cashuTs = await import("@cashu/cashu-ts");
  }
  const { getDecodedToken } = cashuTs;
  const attackfee = path.join(src, "packages");
  const { createAgent } = await import(pathToFileURL(path.join(attackfee, "agent/src/index.ts")).href);
  const { cashuPayer } = await import(pathToFileURL(path.join(attackfee, "agent/src/cashu-payer.ts")).href);
  const cashu = await import(pathToFileURL(path.join(attackfee, "settlement-ln/src/cashu.ts")).href);
  const { decodePaymentRequest, encodeTokenV4, encodeTokenV3 } = cashu;

  const proofsPath = path.resolve(proofs);
  const readProofFile = () => {
    const data = JSON.parse(readFileSync(proofsPath, "utf8"));
    const list = Array.isArray(data) ? data : data.proofs;
    if (!Array.isArray(list)) throw new Error("proofs file has no proof list");
    return { data, list: list.map(norm) };
  };
  const loadProofs = () => readProofFile().list;
  const saveProofs = (items) => {
    const { data } = readProofFile();
    const body = Array.isArray(data) ? items : { ...data, proofs: items };
    writeFileSync(proofsPath, JSON.stringify(body), { mode: 0o600 });
  };
  const statePath = path.join(out, ".state.json");
  const st = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : {};
  const save = () => writeFileSync(statePath, JSON.stringify(st), { mode: 0o600 });
  const log = (file, obj) => appendFileSync(path.join(out, file), redact(obj) + "\n");
  const w = await mod.wallet();
  const ids = w.keyChain.getAllKeysetIds();
  const states = async (ps) => (await w.checkProofsStates(ps)).map((row) => row.state);
  const decode = (token) => getDecodedToken(token, ids).proofs.map(norm);
  const encA = (ps) => "cashuA" + Buffer.from(JSON.stringify({ token: [{ mint: MINT, proofs: ps.map((p) => ({ id: p.id, amount: p.amount, secret: p.secret, C: p.C })) }], unit: "sat" })).toString("base64url");
  const postHeaders = { "attackfee-client": "agent", accept: "application/json", "content-type": "application/x-www-form-urlencoded", "attackfee-test": "1" };
  const pathW = "/demo/contact";
  async function post(extra = {}, kind = "other") {
    const headers = { ...postHeaders, ...extra };
    // --count-real: the plan lets exactly one paid write through without the test header.
    if (plan.headers(kind)["attackfee-test"] !== "1") delete headers["attackfee-test"];
    const response = await fetch(base + pathW, { method: "POST", headers, body: "message=attackfee-live-check", signal: AbortSignal.timeout(30000) });
    const text = await response.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { rawLength: text.length }; }
    return { status: response.status, xcashu: response.headers.get("x-cashu"), json };
  }
  async function split(amount) {
    const sent = await w.send(amount, loadProofs(), { includeFees: false });
    saveProofs([...sent.keep.map(norm), ...sent.send.map(norm)]);
    return sent.send.map(norm);
  }
  async function unspent() {
    const ps = loadProofs();
    const s = await states(ps);
    return ps.reduce((sum, proof, i) => sum + (s[i] === "UNSPENT" ? proof.amount : 0), 0);
  }
  const fivexx = [];
  const note5 = (where, status) => { if (status >= 500) fivexx.push({ where, http: status }); };
  st.walletStart ??= await unspent();
  save();
  const spent = async () => st.walletStart - await unspent();
  const capOk = async (n) => (await spent()) + n <= cap;
  log("wallet.log", { step: "start", base, cap, walletStartUnspent: st.walletStart });

  if (steps.includes("a")) {
    const response = await post({}, "offer");
    note5("a", response.status);
    const creq = response.xcashu || "";
    let pr = null;
    try { pr = decodePaymentRequest(creq); } catch { /* refusal is a failed check */ }
    const pass = response.status === 402 && schemeOf(creq) === "creqA" && pr?.m?.length === 1 && pr.m[0] === MINT && pr.u === "sat" && pr.a === 10 && response.json.offers?.[0]?.mint === MINT;
    note("a", pass ? "PASS" : "FAIL", { http: response.status, xCashu: schemeOf(creq), amount: pr?.a ?? null, unit: pr?.u ?? null, mint: pr?.m?.[0] ?? null });
    log("a-creqA.log", { check: "a", http: response.status, xCashu: schemeOf(creq), amount: pr?.a ?? null, result: pass ? "PASS" : "FAIL" });
  }
  if (steps.includes("b")) {
    if (!(await capOk(10))) {
      note("b", "FAIL", { reason: "cap would be exceeded" });
      log("b-cashuB-pay.log", { check: "b", result: "cap" });
    } else {
      const source = await split(12);
      st.s12 = source.map((proof) => proof.amount);
      save();
      const offerRes = await post({}, "offer");
      note5("b-402", offerRes.status);
      const offer = offerRes.json.offers?.[0];
      let change = null;
      const payB = await cashuPayer({ token: encA(source) }, { onChange: (token) => { change = token; } })(offer);
      const payP = decode(payB);
      const chP = change ? decode(change) : [];
      saveProofs([...loadProofs(), ...payP, ...chP].filter((proof, index, list) => list.findIndex((other) => other.secret === proof.secret) === index));
      const drop = new Set(source.map((proof) => proof.secret));
      saveProofs(loadProofs().filter((proof) => !drop.has(proof.secret)));
      st.payB = payB;
      save();
      const response = await post({ "x-cashu": payB }, "pay");
      note5("b", response.status);
      let used = null;
      if (response.json.pass) {
        const use = await post({ authorization: "Attackfee " + response.json.pass }, "use");
        note5("b-use", use.status);
        used = use.status;
      }
      const inputStates = await states(payP);
      if (inputStates.every((state) => state === "SPENT")) saveProofs(loadProofs().filter((proof) => !payP.some((paid) => paid.secret === proof.secret)));
      const changeStates = chP.length ? await states(chP) : [];
      const changeBooked = chP.length > 0 && changeStates.every((state) => state === "UNSPENT") && loadProofs().some((proof) => chP.some((changeProof) => changeProof.secret === proof.secret));
      const pass = response.status === 200 && typeof response.json.pass === "string" && used === 200 && inputStates.every((state) => state === "SPENT") && schemeOf(change) === "cashuB" && changeBooked;
      note("b", pass ? "PASS" : "FAIL", { http: response.status, useHttp: used, inputStates, changeScheme: schemeOf(change), changeBooked });
      log("b-cashuB-pay.log", { check: "b", http: response.status, useHttp: used, payment: schemeOf(payB), change: schemeOf(change), inputStates, changeBooked, result: pass ? "PASS" : "FAIL" });
    }
  }
  if (steps.includes("c")) {
    if (!st.payB) note("c", "FAIL", { reason: "check b did not leave a payment" });
    else {
      const replay = await post({ "x-cashu": st.payB });
      note5("c-xcashu", replay.status);
      const fresh = await post({}, "offer");
      const offer = fresh.json.offers?.[0];
      const redeem = await fetch(base + "/v1/redeem", {
        method: "POST",
        headers: { "content-type": "application/json", "attackfee-client": "agent", ...plan.headers("other") },
        body: JSON.stringify({ offer_id: offer?.id, kind: "cashu", token: st.payB, credential: offer?.credential }),
        signal: AbortSignal.timeout(30000),
      });
      const redeemText = await redeem.text();
      let redeemBody;
      try { redeemBody = JSON.parse(redeemText); } catch { redeemBody = {}; }
      note5("c-redeem", redeem.status);
      const pass = replay.status >= 400 && replay.status < 500 && !replay.json.pass && redeem.status >= 400 && redeem.status < 500 && !redeemBody.pass;
      note("c", pass ? "PASS" : "FAIL", { xcashuHttp: replay.status, redeemHttp: redeem.status });
      log("c-replay.log", { check: "c", xcashuHttp: replay.status, redeemHttp: redeem.status, result: pass ? "PASS" : "FAIL" });
    }
  }
  if (steps.includes("e")) {
    const fake = { amount: 8, secret: "attackfee-live-unlisted-" + Date.now(), id: Buffer.from("00ad268c4d1f5826", "hex"), C: Buffer.from("02" + "11".repeat(32), "hex") };
    const outRows = [];
    for (const mint of unlistedMints(MINT)) {
      for (const [format, enc] of [["cashuB", encodeTokenV4], ["cashuA", encodeTokenV3]]) {
        const token = enc({ mint, unit: "sat", proofs: [fake, { ...fake, amount: 2, secret: fake.secret + "b" }] });
        const response = await post({ "x-cashu": token });
        note5("e", response.status);
        outRows.push({ mint, format, http: response.status, pass: Boolean(response.json.pass) });
      }
    }
    const control = [];
    for (const [format, enc] of [["cashuB", encodeTokenV4], ["cashuA", encodeTokenV3]]) {
      const token = enc({ mint: MINT, unit: "sat", proofs: [{ ...fake, secret: fake.secret + "c" + format }, { ...fake, amount: 2, secret: fake.secret + "d" + format }] });
      const response = await post({ "x-cashu": token });
      note5("e-control", response.status);
      control.push({ format, http: response.status, pass: Boolean(response.json.pass) });
    }
    const pass = outRows.every((row) => row.http >= 400 && row.http < 500 && !row.pass) && control.every((row) => row.http >= 400 && row.http < 500 && !row.pass);
    note("e", pass ? "PASS" : "FAIL", { unlisted: outRows, control });
    log("e-unlisted.log", { check: "e", unlisted: outRows, control, result: pass ? "PASS" : "FAIL" });
  }
  if (steps.includes("f")) {
    if (!(await capOk(10))) note("f", "FAIL", { reason: "cap would be exceeded" });
    else {
      const source = await split(10);
      const before = await states(source);
      const tokA = encA(source);
      let clientChange = null;
      // The SDK's own requests get the plan's header too: its POST /v1/redeem is the paid write.
      const planFetch = (input, init = {}) => {
        const headers = new Headers(init.headers);
        const kind = String(input).endsWith("/v1/redeem") ? "pay" : headers.has("authorization") ? "use" : "offer";
        for (const [k, v] of Object.entries(plan.headers(kind))) headers.set(k, v);
        return fetch(input, { ...init, headers });
      };
      const agent = createAgent({ base, pay: cashuPayer({ token: tokA }, { onChange: (token) => { clientChange = token; } }), work: false, prefer: "cashu", fetch: planFetch });
      const res = await agent.fetch(pathW, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "message=attackfee-live-cashuA" });
      note5("f", res.response.status);
      await res.response.text();
      const inputStates = await states(source);
      if (inputStates.every((state) => state === "SPENT")) saveProofs(loadProofs().filter((proof) => !source.some((item) => item.secret === proof.secret)));
      const pass = res.via === "paid" && res.response.status === 200 && res.token === tokA && inputStates.every((state) => state === "SPENT");
      note("f", pass ? "PASS" : "FAIL", { via: res.via, http: res.response.status, sentScheme: schemeOf(res.token), inputStates, change: schemeOf(clientChange) });
      log("f-cashuA-pay.log", { check: "f", via: res.via, http: res.response.status, inputsBefore: before, inputStates, change: schemeOf(clientChange), result: pass ? "PASS" : "FAIL" });
    }
  }
  if (steps.includes("d")) {
    const paid = ["b", "f"].filter((key) => steps.includes(key));
    const paidOk = paid.length > 0 && paid.every((key) => {
      try { return JSON.parse(readFileSync(path.join(out, `${key}.json`), "utf8")).status === "PASS"; } catch { return false; }
    });
    note("d", paidOk ? "PASS_INDIRECT" : "FAIL", { method: "a pass is granted only after commit and a durable read-back", paid });
    log("d-store.log", { check: "d", paidOk, result: paidOk ? "PASS_INDIRECT" : "FAIL" });
  }
  const walletEnd = await unspent();
  const sp = st.walletStart - walletEnd;
  line(`sats spent ${sp}/${cap}, 5xx ${fivexx.length}, real paid writes ${plan.realSent()}`);
  log("results.log", { cap, fivexx, walletStart: st.walletStart, walletEnd, satsSpent: sp });
  if (sp > cap || fivexx.length > 0) {
    note("cap", "FAIL", { satsSpent: sp, cap, fivexx: fivexx.length });
  }
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "live checks failed");
    process.exit(1);
  });
}
