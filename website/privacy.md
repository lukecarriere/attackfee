# Privacy

Plain-language, not legal advice. Last updated November 18, 2026.

## The MCP server

The `@attackfee/mcp` package runs on your own computer. It stores no data and has no service of its own. It only sends requests to the site you name in each tool call, and only to that site's public `/v1` API.

## This site

- Pages, docs and downloads are static files. There are no analytics, no ads and no tracking scripts.
- The demo at /demo checks writes only. What you type is checked and then thrown away. Its name, email and message are not read, stored or logged.
- To rate-limit a running demo, the site keeps a counter keyed by your network address. The counter resets each window and is never linked to anything you type.
- Static pages do not set a cookie. If a write check is running and you finish the background work from the same origin, the issuer may set one first-party cookie, `attackfee_pass`. It is HttpOnly and SameSite=Lax, and Secure on HTTPS. It holds the pass and lasts 15 minutes by default. The cookie is not set for a paid or agent pass. The Node issuer also skips it when the check comes from another origin; then the pass is sent in a header or a hidden form field. The page script does not set cookies.
- A running demo may keep daily totals of accepted and rejected sends. It also keeps daily totals of paid writes, free writes, settled amounts, and HTTP 402 offers. These are plain counts with no personal data. Our own test sends are counted separately. Anyone can read the totals at `/demo/stats/daily`.
- Our hosting provider handles the network traffic for this site and may keep its own short-term request records.

## Questions

See [Support](/support).
