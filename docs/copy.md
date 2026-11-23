# Attackfee: words we will and will not say (`docs/copy.md`)

> **Contributor documentation.** Not a public page. Do not publish this file on the site.

Owner: product. Sources, newest wins: the Attackfee brand (Marketing, Nov 17, 2026: brand.md, site-copy.md, claims.md), then the older calls recorded below.
Decision (Nov 17, 2026): Attackfee has its own brand. The previous product's name, domain, one-word problem framing, road imagery and its brand lines are retired everywhere. The lint list below stays in force until it is changed here. Every public claim must match what the product actually does today; QA checks each one against the code.
Engineering: copy this file to `docs/copy.md` in the repo. The copy lint reads the "Lint list" below. This file is exempt from the lint because it holds the list.

## Where these rules apply
Public surfaces: `README.md`, `website/` pages, readme.txt, widget strings, demo pages, WordPress plugin screens and notices (including Advanced settlement), `docs/` pages meant for readers (not this file), package names, the public repo description, and commit titles for user-facing files.
Exempt (may use protocol words): `docs/settlement.md`, `docs/settlement-vectors.json`, `packages/settlement-ln/`, the payment client code in `examples/agent-pay-402/` (its `.mjs` and `.sh` files; its README stays linted), code identifiers, the JSON wire format (for example `amount_msat`, `ln402`, `rail`), the `payment` objects in the manifest and MCP files, and standard licence text (the GPL's own wording).

## Lint list (case-insensitive, whole words, CI fails on any hit in a public surface)
From the brand brief (Oct 1): clear, clearlane, tsa, precheck, skip the line, skip-the-line, tax, taxes, taxed, taxing, surcharge, surcharges, paywall, paywalls, on-ramp, on-ramps, make ai pay, bitcoin, lightning, wallet, wallets, sats, detect ai, detects ai, human score, captcha, captchas, puzzle, puzzles.
From §19.12: btc, satoshi, l402.
From §1 (PRD §6 testing bar): sat, on-chain, onchain, seed phrase, orange pill, softwar, energy money, proof-of-compute, geopolitics, ai slop, we detect ai.
From the photo source (Oct 1, the hero photo is a pine forest on California 1 near San Simeon): redwood, redwoods.
Also fail on any percentage next to "human", "bot" or "AI" (a risk score as identity, for example "12% human").

## CAPTCHA in plain comparisons

Luke approved on 2026-11-18 at 10:58 PM CT: CAPTCHA may appear on attackfee.dev in plain comparisons only.

The word stays on the lint list and is banned by default. It is allowed only in these two exact sentences (and any verbatim repeat of the first sentence with the definition paragraph):

- People never pay money, and there is no CAPTCHA to solve.
- There is no CAPTCHA to solve and nothing to click.

It still fails in the `<title>`, meta description, `og:*` and `twitter:*` tags, `h1`–`h3` headings, and FAQ questions. Never as a product claim.

## Avoid (review, not lint)
Any claim that Attackfee detects bots or AI, scores visitors, or says who a visitor is. Absolutes ("stops all attacks", "unbreakable", "bot-proof", "100%"). Compliance or certification claims. Customer names, user counts, attack-reduction numbers or testimonials. Prices: payments are on. Public pages may say that an automated client can pay over HTTP 402 and that current prices are at `/v1/price` and `/.well-known/attackfee.json`. Do not hardcode a dollar amount. Coin units, invoices and rail names stay off website pages (lint list). Hype words and AI-writing tics (game-changer, revolutionary, delve, unlock, elevate, seamless, leverage, em dashes, emoji bullets, rhetorical-question openers). Imagery to avoid: robots, shields, padlocks, hooded figures, binary rain, glowing brains, globes with network lines, roads, gates, booths, coins, electric bolts, red alarm screens. Token is fine only as the code name `attackfee-pass`.

## Brand lines (Attackfee brand, Nov 17, 2026)
- Tagline: Open to read. Priced to write. (homepage, social card, README top)
- Alternates: "Let the agents read. Make the floods expensive." (agent-builder audiences) and "Cover for your forms when the agents arrive." (short ads).
- Positioning: Attackfee is write-side security for websites and APIs. It leaves the read side open and puts a small, per-action cost on the routes that change something. It prices the action and never asks who the caller is.
- Voice: a calm security engineer explaining a system to a peer. Dry, exact, never excited. State limits plainly and early. Short declarative sentences. Weather is the one running metaphor (agents arrive like hail, reads pass under cover, writes sit under a meter), used in headlines and imagery only; body copy stays literal.
- "Priced" means a cost in background work or a paid offer at the current published price. Public pages may state that paying per action over HTTP 402 is available.

Plugin one-liner (readme.txt), also the plugin header Description, exact (Attackfee, Marketing site-copy.md, Nov 16, 2026; under 150 characters):
- "Attackfee puts a cost on logins and form posts, so scripted abuse gets slow and expensive. Visitors read free and post without solving anything."
The same check governs "logins" in the README top: if it fails, drop "logins," from that line too.

Search (PM call, revised Oct 1 after QA's claim check): on WordPress, search is a page load (`/?s=`) and stays free. On Node and the edge, only a search sent as a form post (POST) is checked; a GET search is a free read. Only the homepage class list, the demo and developer docs name posted search. The WordPress manifest must not list a search price.

Retired (Oct 1): the SPEC §1 "allowed public framing" list. Payment claims may now say that paying per action over HTTP 402 is available, and that current prices are published at `/v1/price` and `/.well-known/attackfee.json`.

## Money
- Always USD from the live FX rate (cached ≤ 15 min). Never hardcode "0.004".
- Totals use two decimals: "$12.40". A non-zero amount under a cent: "less than $0.01".
- `{fee}` is `fee_bps / 100` as a plain number with trailing zeros dropped: 1000 → "10", 750 → "7.5", 25 → "0.25". Default 10.
- Rounding: owner balances and totals round down to the cent, so we never show more than can be withdrawn. Offer prices round up and show at most four decimals ($0.0001). Offers are whole sats underneath (Q3).
- FX down: hide the amount. Demo shows "—" with "Rate unavailable"; WordPress shows "Balance will show again shortly".
- Never show msat, coin units, invoices or rail names on a default surface.

## README (top, exact; Attackfee brand, Nov 17, 2026)
```
Attackfee
Open to read. Priced to write.
Attackfee puts a small cost on the routes that change something on your site, like comments, signups, logins and write APIs. Reads stay free. People barely notice. Volume pays.
```
Then two paragraphs, exact: "A person's browser earns a pass with a fraction of a second of background work while they read or type, and one pass covers 20 actions for 15 minutes. A script has to keep earning passes, every 20 actions. An agent sends the `Attackfee-Client: agent` header, does the same work and retries. An automated client can pay per action over HTTP 402 instead of doing the work. Current prices are at `/v1/price`. Checks run on your own server and never identify the caller." and "What it doesn't do: it doesn't gate page views, block crawlers, filter network floods or claim to stop a funded attacker. Proof of work is cheap on rented GPUs, so someone willing to spend can keep going."
Licence line, exact: "The Node packages are MIT. The WordPress plugin and the PHP library are GPL-2.0-or-later."
Then the not-published note, how it works, privacy, and a protocol link.

## Widget strings (exact; `…` is U+2026)
| Use | String |
|---|---|
| Working (≥ 500ms) | Checking… |
| Done after a visible check | Verified |
| Checkbox mode button / accessible name | Verify before sending |
| Error | Couldn't check this form. |
| Error action | Try again |
| No JavaScript | This form needs JavaScript. |

## Demo strings (exact)
- Top bar: Attackfee demo · Forms · Bot hammer · Agent hammer
- Mode tag: work-only (Phase 1) · test payments on (Phase 2) · test payments paused (settlement degraded)
- Forms intro: Every form on this page is protected
- No-pass card: Try it without a pass · button "Send without a pass" · result "✕ Rejected · 403"
- Hammer runs: 50 writes without the check · 50 writes with the check · Run 50 · grid label "N of 50 accepted"
- Stats, Phase 1: Accepted · Rejected · Mean solve time ("312 ms")
- Stats, Phase 2 adds: Paid requests · Usage value collected
- Agent hammer card (Phase 2, design/proto/hammer.html): command `node demo/agent-pay.mjs --writes 20` · counts "paid requests" · "usage value collected" · "N ✕" over "replayed payments rejected" ("replayed payment rejected" at 1)
- Owner block: heading "Site owner" · Collect usage payouts · helper "High-volume clients can pay per request. You withdraw from the dashboard." · balance "$X.XX" over "available to withdraw · after the {fee}% platform fee"
  - These two lines stay as written. The helper is §18 verbatim, and in WordPress "the dashboard" is WP admin, where Advanced settlement lives. Withdrawal is MVP (§8.6.6, phase 2), and only the platform fee is held until phase 4, so the owner's net balance really is "available to withdraw". Do not mention the hosted dashboard anywhere.
- Forms page: lede "Use them like a normal visitor. Each one runs an invisible check in the background, and the counts on the right update as you go. Then try the same endpoint without a pass." · panel "Live stats"
- Form cards: Contact "A write. Gated as" + tag · Comments "In-memory thread. Gated as write; your pass covers about 20 comments for 15 minutes." · "Add a comment" · button "Post comment" · Search "A search that POSTs. Gated as search (cheaper than a write)." · No-pass sub "The same contact endpoint, called the way a script would."
- Fields and results: Name · Email · Message · button "Send" · pill "✓ Accepted · 200" · search line "N result(s) for "query"" (singular at 1)
- Hammer page: title "Bot hammer" · lede "Fire 50 writes at the contact endpoint, first as a script that skips the check, then through the widget's background worker. Each square is one request." · run subs "Plain POSTs, no worker, no pass." and "Each request solves in the worker first, like a visitor's browser." · counts "accepted" · "rejected" · "mean solve" · legend "✓ accepted" · "✕ rejected" · "not sent yet"
- Agent hammer: "An automated client sends 20 writes with no widget. It pays each request instead of doing the work, using the test payment backend." · tag "phase 2"

## WordPress strings (exact)
- Menu: Settings → Attackfee. Line under title: Challenges issued today: N
- Counters: link "Export counters" · help "Downloads the counts as a CSV file. Nothing is sent anywhere."
- **Protect these forms.** "Visitors get an invisible check. Forms that skip it are rejected." Options: Comments · Login · Registration · Lost password · WooCommerce checkout "(WooCommerce is active)", help "Covers the classic checkout. The newer block checkout isn't covered yet." (PM, Oct 2: block checkout is off at launch; this help line is exact) · Contact Form 7 forms · Any form with `data-attackfee`, help "Always on. Add `data-attackfee="write"` to a form in your theme to protect it."
- **Visible check.** "Show a "Verify before sending" button instead of an invisible check" · help "Off by default. Most sites don't need it."
- **Longest check.** 4 / 8 / 12 seconds · help "If a check would take longer, the visitor gets a "Verify before sending" button instead of waiting."
- **Keys.** Site key · Secret · Show · Generate new secret · help "Checks run on this site. Keep the secret private; after generating a new one, visitors get a fresh check on their next form."
- **Usage payouts.** Collect usage payouts · helper "High-volume clients can pay per request. You withdraw from the dashboard." (§18, verbatim) · Balance "$12.40" over "available to withdraw, after the {fee}% platform fee" · "To withdraw, open Advanced settlement below."
- **Advanced settlement** (collapsed on every load) · note "Payment connection, fee and withdrawals"
  - Payment connection (option A, Oct 1, 2026): Test mode (no real money) · Payment server. The old NWC and LND REST options are gone, because WordPress doesn't take payments itself.
  - Test mode help (Oct 1, 2026; replaces "Test mode lets clients pay with test funds so you can try payouts safely."): "In test mode, no real money moves and clients do the background check instead of paying. To try payouts, choose Payment server and add the address of a server running in test mode." With payouts ticked, the Balance row shows "Payouts start once a payment server address is added." and Withdraw is disabled.
  - Payment server address: placeholder "https://pay.example.com" · help "Payouts need a server that can take payments. Paste its address here. Protection keeps working on this site without it."
  - Payment server key help: "Stored on this server only. Never sent to visitors' browsers."
  - Ticked with no address: "Payouts start once a payment server address is added."
  - Balance and withdrawals come from the payment server; the strings above stay the same.
  - Platform fee: "{fee}% · recorded on each payment"
  - Withdraw: placeholder "Paste a payout invoice for up to $X.XX" · button "Withdraw" · help "The invoice amount is checked against your balance before anything is sent."
- Notices: "Settings saved." · "Withdrawal sent: $X.XX." · "That invoice couldn't be paid. Check the amount and try again." · "That invoice is for more than your available balance." · "Paid requests are paused. Visitors and clients can still get through with the background check." · "The payment server isn't responding. Visitors and clients can still get through with the background check."

## Naming
Product: Attackfee (one word, capital A). WordPress plugin: display name "Attackfee" (Plugins list and WordPress.org listing; the header may not contain "WordPress", which Plugin Check flags as a trademark), slug `attackfee`, folder `packages/wp-attackfee`. In prose: "the Attackfee WordPress plugin". The admin menu and settings page are "Attackfee". Domain: `attackfee.dev` (primary, registered Nov 16, 2026, with attackfee.com, which 308-redirects to attackfee.dev). Public site URLs use that domain from wrangler.toml `ATTACKFEE_SITE_URL`. www and attackfee.com are not attached to the Worker; they 308 to the apex at the DNS layer. The site worker runs attackfee.dev and the demo at /demo. The packages are not on npm yet. Widget file: `attackfee.js` at `/attackfee/v1/`, element `<attackfee-check>`, form attribute `data-attackfee`, pass cookie `attackfee_pass`, header `Authorization: Attackfee`, wire error `attackfee_required`, WordPress REST namespace `/wp-json/attackfee/v1/`. Never name a public file or package after a coin or payment network (`bitcoin.js` is out); the internal rail lives in `packages/settlement-ln/`.

## Amendment 2: reads stay free (Oct 1, 2026; wording unlocked the same day)
The meaning stays: page views stay free, Attackfee checks writes, and gating page views needs a warning and an explicit confirm. A later brand call may reword every line below in the brief's voice; search is covered as described under Brand lines.
- First screen after install (README and WordPress helper text), exact (Oct 1, revised after QA): "Attackfee checks writes, not page views. Leave public pages open so people and answer engines can read you. Turn Attackfee on for comments, forms, logins, and APIs."
- Dashboard warning when an owner gates ordinary page views, exact, with an explicit confirm (default stays off): "This hides the site from answer engines and new readers. Attackfee is for writes."
- `docs/positioning.md`: Amendment 2 §B, for contributors, not a public screen.
- Never on any public surface: crawler allow, charge, or block features, or "block training bots".
- No page-view switch in WordPress (PM call, Oct 1): nothing there can gate a page view, so the warning has nothing to attach to.
- Routes editor confirm (when deleting `/` or raising a GET path above read): body is the §A warning above. Buttons: "Keep pages open" (focused, default) and "Gate page views" (destructive).

## Amendment 3: agent discovery (Oct 1, 2026)
Wording, unlocked Oct 1; a later brand call may reword it:
- Manifest and MCP `description`, exact (Nov 18, 2026; 127 characters): "A small cost on each write, paid in background work or per action over HTTP 402. Reads stay free. Does not identify the caller."

Tool names and descriptions (PM copy; the description is the ranking signal, so it must state each tool's job and what it does not do):
- `price_write_action`: "Returns the current USD price, and the work alternative, for one write on an Attackfee-protected site: a comment, signup, login, form post, or state-changing API call. Use it before a write to choose between paying and doing the work. Not for page views, which are free and need no call. Does not identify the caller."
- `gate_form_write`: "Gets a one-use pass for one write on an Attackfee-protected site. With no payment it returns the payment offer and a work challenge. With proof of payment it returns the pass. Use only for writes. Does not block public reads, does not detect who the caller is, and does not license or price content."
- `verify_write_pass`: "For the site's own server: checks that a pass sent with a write is valid, unused, and for this site and action. Returns valid or invalid with a reason. Does not score the caller or say whether it is a person or a program."
- When payments are off, the same tools are listed with work-only wording. The manifest does not advertise a pay URL, paid-redeem inputs, or a choice between paying and doing the work:
  - `price_write_action` (payments off): "Returns the work alternative for one write on an Attackfee-protected site: a comment, signup, login, form post, or state-changing API call. Use it before a write. Not for page views, which are free and need no call. Does not identify the caller."
  - `gate_form_write` (payments off): "Gets a one-use pass for one write on an Attackfee-protected site. Returns a work challenge. Use only for writes. Does not block public reads, does not detect who the caller is, and does not license or price content."
  - `verify_write_pass` stays as written above.
- `not_for`, exact: ["page views", "crawler blocking", "citation licensing"]. `reads_free`: true.

Price and payment honesty:
- Until a real offer exists, every price carries a status beside it: `"status": "test"` (test or testnet rail) or `"status": "stub"`. The USD display is computed from `amount_msat` and the configured rate, rounded up to $0.0001 exactly like the 402 offer (never typed by hand), and reads like "$0.0100 (test)" for a write at the demo rate. It never stands alone as a bare number. The demo's fixed test rate is not a market price.
- Lint scope: the manifest and MCP files are for machines, so only their `payment` objects may name the payment method (Amendment 3). Every `description` string and all website pages stay under the full lint list.
- Base price label (Oct 1, ~4:30 AM): the manifest price field is labelled base price, and each priced tool in the manifest carries this exact note: "Base price. The 402 offer is the price that applies, and it can go up while the site is under load." `price_write_action` returns the price that applies right now, including any load increase, so its description ("Returns the current USD price…") stays as written. Parity tests run at load multiplier 1.

## Former mission pages
`/mission`, `/vision`, `/values` and `/ecosystem` carried the previous brand. They no longer ship. The site worker answers each with a 308: `/mission` and `/vision` to `/#why`, `/values` to `/#privacy`, `/ecosystem` to `/#limits`.

## Docs pages

Visitor guides. Bodies live in the markdown files named here and are linted with everything else under `website/`. The homepage nav label and each page's meta description are exact.

Homepage nav label: Docs

- `website/docs/index` (Docs): How to add Attackfee: the widget, the Node and PHP servers, the agent SDK, the MCP server, and the WordPress plugin.
- `website/docs/quick-start` (Quick start): From a clone, add the Attackfee packages, protect a form, and check each write on your own server. Page views stay free. The packages are not on npm yet.
- `website/docs/widget` (Widget): Serve attackfee.js from your own site and mark a form with data-attackfee. The check runs in the background. Nothing to solve.
- `website/docs/server` (Server): @attackfee/server is the Node issuer. PHP checks passes with the library shipped in the plugin. Both speak the /v1 API.
- `website/docs/agent` (Agent): A client for automated callers. It does the work for a write and retries once. Reads need no call and stay free.
- `website/docs/mcp` (MCP): A local server for three write tools. It reads the site manifest and calls that site's /v1 API only.
- `website/docs/ask` (Agent calls): One table for agents: what you ask, and the Attackfee call that answers it. Passes, challenges, discovery and errors.
- `website/docs/wordpress` (WordPress): The Attackfee WordPress plugin covers comments and the login form. Visitors read for free and post without solving anything.
- `website/docs/self-hosting` (Self-hosting): Run Attackfee on your own server. Checks stay there, page views stay free, and nothing about a visitor is sent out.
- `website/download/index` (Download): Download the Attackfee WordPress plugin. The plugin is GPL-2.0-or-later, and the zip is built from this project.

## Image alt text (exact; Attackfee brand, Nov 17, 2026)
- Homepage hero art (`/img/hail-grid.svg`): "Pale hail falls on a dark grid. Most cells stay open; a few are lit orange where a write was priced."
- Social card (`/img/social-card.png`, `og:image:alt` and `twitter:image:alt`): "Attackfee. Open to read. Priced to write."

## Homepage head tags (exact; Marketing SEO brief attackfee-homepage.md, Nov 18, 2026)
- `<title>`: Attackfee · Write-side security for forms, logins and APIs
- `<meta name="description">`: Attackfee puts a cost on comments, signups, logins and write APIs. Browsers cover it with background work. Agents work or pay per write. Reads stay free.
- The same description is the homepage JSON-LD description. The homepage JSON-LD is one block: Organization with `sameAs` `["https://x.com/attackfee"]`, SoftwareApplication and FAQPage (the visible Questions, word for word). /demo carries WebPage and BreadcrumbList JSON-LD.
- The separator is a middle dot (U+00B7) with one space on each side. Other pages: `{Page} · Attackfee`.

## Attackfee homepage (exact; Marketing site-copy.md, Nov 17, 2026)
The homepage body, the /demo page, the docs intro and llms.txt use Marketing's site-copy.md text verbatim, without the review-only claim tags. The homepage words live in `website/build.mjs` (`HOME`), the llms.txt lines in `LLMS_SUMMARY`, `LLMS_BODY` and `LLMS_SITE`, and the demo words in `website/demo.html`. Section order: hero (kicker, headline, lede, definition paragraph, Try the demo and Read the docs, two facts), The cheap side of your site is the side that writes, How it works, What stays open, What carries a cost, For agents, Privacy, Limits, Where it runs, Questions, closing line. The definition paragraph, the second fact, the Questions section and the /demo "As an AI agent" block follow Marketing's SEO briefs (attackfee-homepage.md and attackfee-demo.md, Nov 18, 2026). Nav: How it works · For agents · Limits · Demo · Docs.

## llms.txt (exact; Marketing site-copy.md, Nov 17, 2026)
- Summary line: "Attackfee puts a small cost on the routes that change something on a website, like comments, signups, logins and write APIs. Reads stay free."
- Body paragraph: "Attackfee is write-side security for websites and APIs. Each protected write needs a pass. A browser earns one with a fraction of a second of background work, and one pass covers 20 actions for 15 minutes. An automated client sends the `Attackfee-Client: agent` header, does the same work and gets JSON responses. Page views, docs and GET requests are free and are never gated, and Attackfee does not block crawlers. It does not identify the caller. Checks run on the site owner's server. An automated client can pay per action over HTTP 402 instead of doing the work. Current prices are at `/v1/price`. Each site describes its write routes at `/.well-known/attackfee.json`."
- Site line: "This site's pages, docs and downloads are static files with no analytics, no ads and no tracking scripts."
- Then the docs pages and the other pages, each as a link with its meta description.
- Learning Center, after the docs: the `/learn` page and each hub index (`/learn/concepts`, `/learn/write-surfaces`, `/learn/agents`, `/learn/payments`, `/learn/wordpress`, `/learn/comparisons`, `/learn/limits`), each as a link with that page's description, then one catalog line: "Every Learning Center page, with its Markdown twin." The link is `/llms-learn.txt`.
- `/llms-learn.txt` lists every Learning Center page under a heading per hub. Each page is a link to its Markdown twin and a link to its HTML page, with the page description. `/llms-full.txt` still joins every twin. The sitemap lists HTML pages only.

## Legal page descriptions
`<meta name="description">` for the legal and support pages. Nav labels are Privacy, Terms, Support.

- `website/privacy` (Privacy): The Attackfee MCP server runs on your computer and stores no data. Pages, docs and downloads are static files with no analytics.
- `website/terms` (Terms): Attackfee Node packages are MIT, provided as is. The WordPress plugin is GPL-2.0-or-later.
- `website/support` (Support): Where to ask questions, report bugs and report security problems.

## Footer
Links on every page: Privacy, Terms, Support, Download. Then, exact: "Attackfee runs on your own server. This site has no analytics and no tracking scripts."
