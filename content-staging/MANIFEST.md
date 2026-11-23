# Attackfee Learning Center batch-09 content staging

Base: lukecarriere/attackfee origin/main 107d367eea277751bf94f00d9cb93224edde431f
Branch: learn-content-staging-09 (data-only; never merge this branch)
Staging layout: `content-staging/learn/<hub>/<slug>.md` (same relative path as `website/learn/`) plus this manifest.
Time: 23 Nov 2026, 10:11 AM CST (America/Chicago)

## Counts

- NEW pages: 13
- MODIFIED existing pages: 4 (hub indexes, body-list additions only)
- Expected after apply: 139 Learning Center pages (126 live + 13 new)

## NEW

- `concepts/how-to-read-v1-health.md`
- `concepts/what-attackfee-yaml-configures.md`
- `concepts/what-attackfee-error-codes-mean.md`
- `concepts/how-to-run-the-express-contact-example.md`
- `limits/how-to-set-the-challenge-rate-limit.md`
- `concepts/how-to-set-allowed-origins.md`
- `concepts/how-to-show-a-visible-check-on-a-form.md`
- `payments/what-fields-v1-price-returns.md`
- `payments/how-to-request-a-work-only-challenge.md`
- `concepts/why-self-hosted-installs-use-a-stub-backend.md`
- `concepts/how-to-leave-a-search-route-free.md`
- `payments/when-the-converted-price-is-hidden.md`
- `agents/how-to-solve-a-work-challenge-in-node.md`

## MODIFIED (diff vs origin/main `website/learn/`, after stripping leftover `updated:` front-matter from the drop-folder copies so lastmod is not reintroduced, and after ensuring a trailing newline)

- `concepts/index.md` — 8 insertions
- `payments/index.md` — 3 insertions
- `limits/index.md` — 1 insertion
- `agents/index.md` — 1 insertion

These four indexes are hub body-list additions only. Front-matter `related` arrays were left unchanged. No existing blurbs or FAQ answers were rewritten. The `/learn` index was not edited. No new hub was added.

The drop-folder hub copies still contained `updated: 2026-11-20`. Live origin/main already omits `updated:`. The staged copies match live except for the new list items.

## What the PR must do

Copy these files into `website/learn/` at the same relative paths. Then regenerate renderer output, `sitemap.xml`, `llms-learn.txt`, and `llms-full.txt` so the 13 new paths and the updated hub lists are included. `llms.txt` stays the short hub index (it already names `/learn`, the seven hubs, and `/llms-learn.txt`). Do not reintroduce `updated:` on the four hub indexes unless it equals the commit date. Do not invent copy. Keep internal payment labels unchanged.

Self-hosted payment wording in this batch is "stub backend." Do not use "default self-hosted backend," "default settlement backend," or "no real money moves."

## Validation (scratch tree at origin/main with 13 NEW + 4 MODIFIED overlaid onto `website/learn/`)

- Batch `check.py` md5 `2132358d42399bfc0e101f1649f1885f` (matches the handoff)
- `python3 check.py --repo <public main clone>` (local mode) — PASS, including `node website/learn.mjs --check` (`learn: ok`, 139 pages)
- `node website/learn.mjs --check` on the cleaned overlay — `learn: ok` (139 pages)
- `node website/build.mjs` — 139 HTML under `website/dist/learn/`, 139 Markdown twins (138 under `website/dist/learn/` plus `website/dist/learn.md`), 154 sitemap locs (15 non-learn + 139 learn); all 13 new paths are in `sitemap.xml` and `llms-learn.txt`
- `npm run lint:copy` — 0 hits (46 rules from `docs/copy.md`)
- Local worker `wrangler dev --local` on `127.0.0.1:56609` (not 8791 or 8803)
- `node scripts/check-learn-batch.mjs --base http://127.0.0.1:56609 --batch website/learn` — `learn-batch: ok`
- The 13 new pages and 4 staged hubs have no rail words (`l402`, `cashu`, `lightning`, `wallet`, `sats`, `bitcoin`), no old product names, and no machine paths
- No page or `check.py` references `docs/runs`, `qa`, `.cursor`, or `RENAMES.md`

No PR opened. `main` untouched. This branch is for a follow-up PR to apply the files into `website/learn/`.
