# Docs

Attackfee checks the routes on your site that change something and leaves everything else free to read. You add a small script to the page, mark the forms you want covered, and check each write on your own server. A person's browser earns a pass in the background. A script has to keep earning them.

The packages are not on npm yet. Every page here assumes you are working from a copy of the repo.

Start here:

- [Quick start](/docs/quick-start): protect one form and check its writes on your own server.
- [Page script](/docs/widget): serve `attackfee.js` from your own site and mark a form with `data-attackfee`.
- [Server](/docs/server): the Node issuer and verifier, with Express middleware and the `/v1` API.
- [Agent SDK](/docs/agent): a client for automated callers that does the work and retries once.
- [MCP server](/docs/mcp): local tools that let an agent price a write and get a pass.
- [Agent calls](/docs/ask): one table of what an agent asks and the call that answers it.
- [WordPress plugin](/docs/wordpress): covers comments and the login form by default.
- [Self-hosting](/docs/self-hosting): run every check on your own server.
- [Download](/download): the WordPress plugin zip.

Agent builders can go straight to Agent calls.
