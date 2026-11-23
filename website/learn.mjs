// Learning Center pages. One Markdown file under website/learn/ becomes one static page.
// The catalog is the front matter. docs/copy.md is not a second table.
// A hub crumb links /learn/<hub> only when that hub index is in the set, so an
// unpublished hub is never a link that 404s.
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { twinPath } from "./agent-text.mjs";
import { lintText } from "../scripts/copy-lib.mjs";
import { OLD_BRAND } from "../scripts/check-served-brand.mjs";

const HERE = fileURLToPath(new URL("./learn/", import.meta.url));
const BANNED = new RegExp(["ca", "pt", "cha"].join(""), "i");

export const LEARN_HUBS = [
  ["concepts", "Concepts"],
  ["write-surfaces", "Write surfaces"],
  ["agents", "Agents"],
  ["payments", "Payments"],
  ["wordpress", "WordPress"],
  ["comparisons", "Comparisons"],
  ["limits", "Limits"],
];
const HUB_IDS = new Set(LEARN_HUBS.map(([id]) => id));
const HUB_LABEL = Object.fromEntries(LEARN_HUBS);
export const LEARN_TYPES = ["hub", "concept", "how-to", "use-case", "comparison", "story", "example", "edge-case", "background", "philosophy", "intention", "glossary"];
const AUDIENCES = new Set(["owners", "agents", "both"]);
const SCHEMAS = new Set(["WebPage", "TechArticle"]);

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function learnPublicPath(rel) {
  const id = rel.replace(/\\/g, "/").replace(/\.md$/, "");
  if (id === "index") return "/learn";
  if (id.endsWith("/index")) return "/learn/" + id.slice(0, -"/index".length);
  return "/learn/" + id;
}

function blankPage(rel) {
  const file = "learn/" + rel.replace(/\.md$/, "");
  return {
    file, path: learnPublicPath(rel), title: "", description: "", hub: "", slug: "", type: "",
    order: NaN, orderRaw: undefined, related: null, audience: "", status: "", schema: "WebPage",
    updated: "", faq: null, body: "",
  };
}

function splitFront(text) {
  const src = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  if (!src.startsWith("---\n")) return { error: "missing front matter" };
  const end = src.indexOf("\n---\n", 3);
  if (end < 0) return { error: "unclosed front matter" };
  return { yaml: src.slice(4, end), body: src.slice(end + 5).replace(/^\n+/, "") };
}

function parseYaml(yaml) {
  const data = {};
  const lines = yaml.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "" || line.trimStart().startsWith("#")) { i++; continue; }
    const m = /^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/.exec(line);
    if (!m) return { error: "bad front matter line" };
    const key = m[1];
    const rest = m[2].trim();
    if (rest === ">-" || rest === ">" || rest === "|") {
      const buf = [];
      i++;
      while (i < lines.length && (lines[i].startsWith(" ") || lines[i] === "")) { buf.push(lines[i].trim()); i++; }
      data[key] = buf.filter(Boolean).join(rest === "|" ? "\n" : " ");
      continue;
    }
    if (rest === "") {
      i++;
      const items = [];
      while (i < lines.length && lines[i].startsWith("  - ")) {
        const item = lines[i].slice(4);
        if (item.startsWith("q:")) {
          const q = item.replace(/^q:\s*/, "");
          i++;
          const aLine = lines[i] ?? "";
          if (!/^\s+a:/.test(aLine)) return { error: "faq item needs a" };
          items.push({ q, a: aLine.replace(/^\s*a:\s*/, "") });
          i++;
          continue;
        }
        items.push(item.trim());
        i++;
      }
      data[key] = items;
      continue;
    }
    data[key] = rest.replace(/^["']|["']$/g, "");
    i++;
  }
  return { data };
}

export function parseLearnFile(rel, text) {
  const page = blankPage(rel);
  const front = splitFront(text);
  if (front.error) return { errors: [`${rel}: ${front.error}`], page };
  const yaml = parseYaml(front.yaml);
  if (yaml.error) return { errors: [`${rel}: ${yaml.error}`], page };
  const data = yaml.data;
  page.body = front.body;
  page.title = data.title ?? "";
  page.description = data.description ?? "";
  page.hub = data.hub ?? "";
  page.slug = data.slug ?? "";
  page.type = data.type ?? "";
  page.orderRaw = data.order;
  page.order = typeof data.order === "string" && /^-?\d+$/.test(data.order) ? Number(data.order) : NaN;
  page.related = data.related === undefined ? null : data.related;
  page.audience = data.audience ?? "";
  page.status = data.status ?? "";
  page.schema = data.schema == null || data.schema === "" ? "WebPage" : data.schema;
  page.updated = data.updated || "";
  page.faq = data.faq === undefined ? null : data.faq;
  page.has = (key) => Object.prototype.hasOwnProperty.call(data, key);
  return { errors: [], page };
}

function expectedHub(rel) {
  const parts = rel.split("/");
  return parts.length === 1 ? "index" : parts[parts.length - 2];
}

function normPath(url) {
  const path = url.split("#")[0].split("?")[0];
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

function linksIn(md) {
  return [...md.matchAll(/\[[^\]\n]*\]\(([^)\s]+)\)/g)].map((m) => m[1]);
}

function headings(body) {
  return body.split("\n").flatMap((line) => {
    const m = /^(#{1,3})\s+(.+)$/.exec(line);
    return m ? [m[2].trim()] : [];
  });
}

function isRealDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function validateLearnFiles(files, ctx) {
  const today = ctx.today || new Date().toISOString().slice(0, 10);
  const lastmod = ctx.lastmod || (() => "");
  const parsed = files.map((f) => ({ rel: f.rel, text: f.text, ...parseLearnFile(f.rel, f.text) }));
  const errors = parsed.flatMap((p) => p.errors);
  const pages = parsed.filter((p) => p.errors.length === 0).map((p) => p.page);
  const known = new Set(ctx.knownPaths || []);
  for (const p of pages) known.add(p.path);
  const slugCount = new Map();
  const pathCount = new Map();
  for (const p of pages) {
    slugCount.set(p.hub + "/" + p.slug, (slugCount.get(p.hub + "/" + p.slug) || 0) + 1);
    pathCount.set(p.path, (pathCount.get(p.path) || 0) + 1);
  }
  for (const item of parsed) {
    if (item.errors.length) continue;
    const { rel, text, page } = item;
    const say = (msg) => errors.push(`${rel}: ${msg}`);
    if (!page.has("title") || !page.title.trim()) say("missing title");
    if (!page.has("description") || !page.description.trim()) say("missing description");
    if (!page.has("hub") || !page.hub) say("missing hub");
    if (!page.has("slug") || !page.slug) say("missing slug");
    if (!page.has("type") || !page.type) say("missing type");
    if (!page.has("order")) say("missing order");
    if (page.related == null) say("missing related");
    if (!page.has("audience") || !page.audience) say("missing audience");
    if (!page.has("status") || !page.status) say("missing status");
    const filename = rel.split("/").pop().replace(/\.md$/, "");
    if (page.slug && page.slug !== filename) say("slug does not match filename");
    if (page.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page.slug)) say("slug must be lowercase hyphenated");
    if (rel !== "index.md" && !rel.includes("/")) say("pages live in a hub directory");
    if (page.hub && page.hub !== expectedHub(rel)) say("hub does not match directory");
    if (page.hub && page.hub !== "index" && !HUB_IDS.has(page.hub)) say("unknown hub");
    if (page.hub === "index" && rel !== "index.md") say("unknown hub");
    if (page.type && !LEARN_TYPES.includes(page.type)) say("unknown type");
    if (page.has("order") && (typeof page.orderRaw !== "string" || !/^-?\d+$/.test(page.orderRaw))) say("order must be an integer");
    if (page.audience && !AUDIENCES.has(page.audience)) say("unknown audience");
    if (page.status && page.status !== "published") say("status must be published");
    if (page.has("schema") && !SCHEMAS.has(page.schema)) say("unknown schema");
    if (Array.isArray(page.related) && (page.related.length < 3 || page.related.length > 8)) say("related needs 3 to 8 paths");
    if (page.faq != null && (!Array.isArray(page.faq) || page.faq.length < 3 || page.faq.length > 8 || page.faq.some((i) => !i || typeof i.q !== "string" || !i.q.trim() || typeof i.a !== "string" || !i.a.trim()))) say("faq needs 3 to 8 items");
    if (page.title) {
      const first = (page.body.split("\n")[0] ?? "");
      const h1 = /^# (.+)$/.exec(first);
      if (!h1 || h1[1].trim() !== page.title.trim()) say("title does not match h1");
    }
    if (page.body) {
      try {
        const { parseGuide } = requireGuide();
        parseGuide(page.body);
      } catch (err) {
        say(err instanceof Error ? err.message : "unsupported markdown");
      }
    }
    const urls = [...(Array.isArray(page.related) ? page.related : []), ...linksIn(page.body)];
    for (const url of urls) {
      if (typeof url !== "string" || !/^\/(?!\/)/.test(url) || /\.html?(?:$|[?#])/i.test(url)) { say("broken link " + url); continue; }
      const path = normPath(url);
      if (!known.has(path)) say("broken link " + path);
    }
    if ((slugCount.get(page.hub + "/" + page.slug) || 0) > 1) say("duplicate slug " + page.slug);
    if ((pathCount.get(page.path) || 0) > 1) say("duplicate path " + page.path);
    if (/\$\s?\d/.test(text)) say("dollar amount");
    for (const hit of lintText("website/learn/" + rel, text)) say("lint: " + hit.term);
    if (OLD_BRAND.test(text)) say("old product name");
    const fields = [["title", page.title], ["slug", page.slug], ["description", page.description], ...headings(page.body).map((h) => ["heading", h])];
    for (const [field, value] of fields) {
      const hit = String(value).match(BANNED);
      if (hit) say(`${field} contains ${hit[0]}`);
    }
    if (page.updated) {
      if (!isRealDate(page.updated)) say("updated must be YYYY-MM-DD");
      else if (page.updated > today) say("updated is in the future");
      else {
        const committed = lastmod(page.file);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(committed) || page.updated > committed) say("updated is after the last commit");
      }
    }
  }
  return errors;
}

let guideFns;
function requireGuide() {
  if (!guideFns) throw new Error("learn: guide renderer is not ready");
  return guideFns;
}

export function useGuide(fns) {
  guideFns = fns;
}

function rank(hub) {
  if (hub === "index") return -1;
  const i = LEARN_HUBS.findIndex(([id]) => id === hub);
  return i < 0 ? 99 : i;
}

function walkMd(dir, prefix = "") {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith(".")) continue;
    const rel = prefix ? prefix + "/" + name : name;
    const abs = dir + "/" + name;
    if (statSync(abs).isDirectory()) out.push(...walkMd(abs, rel));
    else if (name.endsWith(".md")) out.push(rel);
  }
  return out;
}

export function loadLearnPages(dir = HERE) {
  const root = dir.endsWith("/") ? dir.slice(0, -1) : dir;
  return walkMd(root).map((rel) => parseLearnFile(rel, readFileSync(root + "/" + rel, "utf8")).page)
    .sort((a, b) => rank(a.hub) - rank(b.hub) || (a.order || 0) - (b.order || 0) || a.slug.localeCompare(b.slug));
}

export function learnSourceFiles(dir = HERE) {
  return loadLearnPages(dir).map((p) => p.file);
}

export function validateLearnDir(dir, ctx) {
  const root = dir.endsWith("/") ? dir.slice(0, -1) : dir;
  const files = walkMd(root).map((rel) => ({ rel, text: readFileSync(root + "/" + rel, "utf8") }));
  return validateLearnFiles(files, ctx);
}

function crumbsFor(page, hubPages) {
  const hubs = new Set(hubPages || []);
  const crumbs = [
    { name: "Attackfee", path: "/", linked: true },
    { name: "Learn", path: "/learn", linked: true },
  ];
  if (page.hub !== "index") {
    crumbs.push({ name: HUB_LABEL[page.hub] || page.hub, path: "/learn/" + page.hub, linked: hubs.has(page.hub) });
  }
  if (crumbs[crumbs.length - 1].path !== page.path) crumbs.push({ name: page.title, path: page.path, linked: true });
  return crumbs;
}

function crumbHtml(crumbs, page) {
  const items = crumbs.map((c) => {
    if (!c.linked) return `<li><span>${esc(c.name)}</span></li>`;
    const current = c.path === page.path ? ' aria-current="page"' : "";
    return `<li><a href="${esc(c.path)}"${current}>${esc(c.name)}</a></li>`;
  }).join("");
  return `<nav class="crumbs" aria-label="Breadcrumb"><ol>${items}</ol></nav>`;
}

function crumbMd(crumbs) {
  return crumbs.map((c) => c.linked ? `- [${c.name}](${c.path})` : `- ${c.name}`).join("\n");
}

export function renderLearnPage(page, opts) {
  const { guideHtml, siteNav, ICON_TAGS, FOOTER, socialTags } = requireGuide();
  const base = opts.base || null;
  const lastmod = /^\d{4}-\d{2}-\d{2}$/.test(opts.lastmod || "") ? opts.lastmod : "";
  const labels = opts.labels || {};
  const crumbs = crumbsFor(page, opts.hubPages);
  const related = (page.related || []).map((href) => ({ href, label: labels[href] || href }));
  const head = `${page.title} \u00b7 Attackfee Learning Center`;
  const social = socialTags(page.file, head, page.description, base);
  const jsonLd = base ? jsonLdTag(page, base, lastmod, crumbs) : "";
  const faqHtml = faqBlock(page.faq);
  const relatedHtml = `<nav class="related" aria-label="Related"><h2>Related</h2><ul>${related.map((r) => `<li><a href="${esc(r.href)}">${esc(r.label)}</a></li>`).join("")}</ul></nav>`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(head)}</title><meta name="description" content="${esc(page.description)}">${social}${jsonLd}${ICON_TAGS}<link rel="stylesheet" href="/site.css"><link rel="stylesheet" href="/docs.css"><link rel="stylesheet" href="/learn.css"></head><body>
<header><div class="bar"><a class="mark" href="/">Attackfee<i aria-hidden="true"></i></a><nav aria-label="Pages">${siteNav("/learn")}</nav></div></header>
<main>${crumbHtml(crumbs, page)}
<h1>${esc(page.title)}</h1>
${guideHtml(page.body)}
${faqHtml}${relatedHtml}
</main>${FOOTER}</body></html>`;
  const md = [page.body.replace(/\s+$/, ""), crumbMd(crumbs), "## Related", "", related.map((r) => `- [${r.label}](${r.href})`).join("\n"), faqMd(page.faq)].filter((p) => p !== "").join("\n\n").replace(/\s+$/, "") + "\n";
  return { html, markdown: md };
}

function faqBlock(faq) {
  if (!Array.isArray(faq) || !faq.length) return "";
  return `<h2>Questions</h2>\n${faq.map((item) => `<h3>${esc(item.q)}</h3>\n<p>${esc(item.a)}</p>`).join("\n")}\n`;
}

function faqMd(faq) {
  if (!Array.isArray(faq) || !faq.length) return "";
  return ["## Questions", "", ...faq.map((item) => `### ${item.q}\n\n${item.a}`)].join("\n\n");
}

function jsonLdTag(page, base, lastmod, crumbs) {
  const url = base + page.path;
  const graph = [
    {
      "@type": "WebPage",
      name: page.title,
      description: page.description,
      url,
      inLanguage: "en",
      isPartOf: { "@type": "WebSite", name: "Attackfee", url: base + "/" },
      ...(lastmod ? { dateModified: lastmod } : {}),
      breadcrumb: { "@id": url + "#breadcrumb" },
    },
    {
      "@type": "BreadcrumbList",
      "@id": url + "#breadcrumb",
      itemListElement: crumbs.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.name,
        ...(c.linked ? { item: base + c.path } : {}),
      })),
    },
  ];
  if (page.schema === "TechArticle" && lastmod) {
    graph.push({ "@type": "TechArticle", headline: page.title, description: page.description, dateModified: lastmod, url, inLanguage: "en" });
  }
  if (Array.isArray(page.faq) && page.faq.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: page.faq.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })),
    });
  }
  const body = JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">${body}</script>`;
}

/** llms.txt stays under this size. The flat page list lives in /llms-learn.txt. */
export const LLMS_BYTE_CAP = 16384;

/** The llms.txt line that points at the complete Learning Center catalog. Recorded in docs/copy.md. */
export const LEARN_CATALOG_LINE = "Every Learning Center page, with its Markdown twin.";

function linkLine(base, href, label, description) {
  return `- [${label}](${base}${href}): ${description}`;
}

export function namesPath(text, path) {
  const escaped = String(path).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(escaped + "(?![A-Za-z0-9_./-])").test(text || "");
}

function hubHeading(id) {
  if (id === "index") return "Learning Center";
  return LEARN_HUBS.find(([hub]) => hub === id)?.[1] || id;
}

/** Curated Learning Center section: the landing page, each hub index, and the catalog. */
export function learningLines(base, pages) {
  const lines = ["## Learning Center", ""];
  const landing = pages.find((p) => p.path === "/learn");
  if (landing) lines.push(linkLine(base, landing.path, landing.title, landing.description));
  for (const [id] of LEARN_HUBS) {
    const hub = pages.find((p) => p.path === "/learn/" + id && p.slug === "index");
    if (hub) lines.push(linkLine(base, hub.path, hub.title, hub.description));
  }
  lines.push(`- [Complete catalog](${base}/llms-learn.txt): ${LEARN_CATALOG_LINE}`);
  lines.push("");
  return lines;
}

/**
 * /llms-learn.txt: one H1, the landing page's description as the summary, then one H2 per hub.
 * Each page is the Markdown twin link and the HTML link, in the compiler's page order.
 */
export function llmsLearnText(base, pages) {
  const landing = pages.find((p) => p.path === "/learn");
  const lines = ["# Attackfee", "", `> ${landing ? landing.description : ""}`, ""];
  const groups = new Map();
  for (const page of pages) {
    const id = page.hub === "index" ? "index" : page.hub;
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(page);
  }
  for (const id of ["index", ...LEARN_HUBS.map(([hub]) => hub)]) {
    const list = groups.get(id);
    if (!list || !list.length) continue;
    lines.push("## " + hubHeading(id), "");
    for (const page of list) {
      lines.push(linkLine(base, twinPath(page.file), page.title, page.description));
      lines.push(linkLine(base, page.path, page.title, page.description));
    }
    lines.push("");
  }
  return lines.join("\n");
}

export function listingGaps(pages, artifacts) {
  const errors = [];
  const index = (artifacts.llms || "") + "\n" + (artifacts.learn || "");
  for (const p of pages) {
    if (!artifacts.files.includes(p.file)) errors.push(p.file + ": not in discovery files");
    if (!namesPath(artifacts.sitemap, p.path)) errors.push(p.path + ": not in sitemap");
    if (!namesPath(index, p.path)) errors.push(p.path + ": not in llms.txt or llms-learn.txt");
    if (artifacts.learn != null && !namesPath(artifacts.learn, p.path)) errors.push(p.path + ": not in llms-learn.txt");
    if (!artifacts.full.includes(p.markdown)) errors.push(p.path + ": not in llms-full.txt");
  }
  if (artifacts.sitemap && artifacts.sitemap.includes("llms-learn")) errors.push("sitemap names llms-learn.txt");
  return errors;
}

/** llms.txt names every hub and the catalog, and stays under the byte cap. */
export function learnIndexGaps(llms, base) {
  const errors = [];
  if (Buffer.byteLength(llms) > LLMS_BYTE_CAP) errors.push("llms.txt is " + Buffer.byteLength(llms) + " bytes");
  if (!llms.includes(base + "/llms-learn.txt")) errors.push("llms.txt does not name /llms-learn.txt");
  for (const [id] of LEARN_HUBS) {
    if (!namesPath(llms, "/learn/" + id)) errors.push("/learn/" + id + ": not in llms.txt");
  }
  return errors;
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.includes("--check")) {
    console.error("learn: use --check");
    process.exit(2);
  }
  const dirAt = args.indexOf("--dir");
  const dir = dirAt >= 0 ? args[dirAt + 1] : HERE;
  const build = await import("./build.mjs");
  const today = new Date().toISOString().slice(0, 10);
  const errors = validateLearnDir(dir, { knownPaths: build.sitePaths(), lastmod: build.sourceLastmod, today });
  if (!dirAt && errors.length === 0) {
    const url = build.cliSiteBase();
    if (url) errors.push(...build.learnDiscoveryGaps(url));
  }
  if (errors.length) {
    for (const e of errors) console.error(e.startsWith("learn:") ? e : "learn: " + e);
    process.exit(1);
  }
  console.log("learn: ok");
}

const invokedAsCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedAsCli) {
  main().then(() => {}, (err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
