# Agent calls

Your agent doesn't need to read the docs. It needs this table.

Calls go to the site's origin, the site you are calling. On WordPress the same routes are under `/wp-json/attackfee/v1/`.

| You ask | Your agent calls |
|---|---|
| Does this site use Attackfee? How do I get through it? | `GET /.well-known/attackfee.json` |
| Where's the agent manifest? | `GET /.well-known/agents.json` |
| Add Attackfee to my agent's tools. | MCP server, from a clone: `node packages/mcp/src/server.ts`, which adds `price_write_action`, `gate_form_write` and `verify_write_pass`. The package is not on npm yet. |
| Is Attackfee up on this site? | `GET /v1/health` |
| What does one comment or form post cost here right now? | MCP `price_write_action` `{site}`, or `GET /v1/price?action=write`. The current USD price is at that endpoint. An automated client can pay over HTTP 402 or do the background work. |
| And a search, a signup, an admin action? | `price_write_action` with `action` set to `search`, `account` or `admin`, or `GET /v1/price?action=…`. Each class asks for more work: search 1x, write 4x, account 8x, admin 16x. |
| Do I pay to read the page? | Nothing to call. Page views are free (`reads_free: true` in `/v1/price`). |
| Get me a pass to post this form. | MCP `gate_form_write` `{site, action, path}`, which calls `GET /v1/challenge?action=write&client=agent`. You get a work challenge, and a payment offer when the site accepts payment. You can pay or do the work. |
| Do the work. | Solve the challenge, then `POST /v1/redeem` with `{challenge_id, challenge, solution}`. You get a pass. A work pass covers 20 writes for 15 minutes, unless the site changed that. |
| Do all of that for me in code. | `@attackfee/agent`: `createAgent(...)` sends `Attackfee-Client: agent`, does the work, and retries once. |
| Is my pass still good? | `GET /v1/status` with `Authorization: Attackfee <pass>`. It doesn't spend a use. `n` is the uses left. |
| Did this comment come with a valid pass? (site owner) | MCP `verify_write_pass` `{site, secret, pass}`, or `POST /v1/siteverify` with your site secret. Spends one use. |
| Protect a form on my Node server. | `Attackfee.middleware(attackfee, { action: "write" })` from `@attackfee/server`. `Attackfee.router()` serves `/v1` and the widget. |
| Protect a form on my WordPress site. | `data-attackfee="write"` on the form, then `attackfee_wp_verify_request('write')` before you handle the post. |
| Load the form widget. | `<script src="/attackfee/v1/attackfee.js">` and `data-attackfee="write"` on the form. |
| How many writes has the local demo accepted? | `GET /demo/stats` on the demo at [/demo](/demo) or on the local demo in this repo. |
| Why did my post get a 403? | A caller with no pass gets `403 attackfee_required` and a fresh challenge, unless it sent `Attackfee-Client: agent`: then it gets `402` with a payment offer and a link to the work challenge. Get a pass and send it again. |
| Why a 429 on `/v1/challenge`? | `rate_limited`. Wait for `retry-after` (60 s). |
| Why a 400 `bad_action`? | `read` isn't a paid action. Use `write`, `search`, `account` or `admin`. |
| Why a 400 `malformed` from `/v1/redeem`? | The body needs `challenge_id`, `challenge` and `solution` for the challenge you got. |
| Siteverify says `timeout-or-duplicate`. | The pass expired, was used up, or was sent again. Get a new one. |
