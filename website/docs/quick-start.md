# Quick start

Attackfee checks writes, not page views. Leave public pages open so people and answer engines can read you. Turn Attackfee on for comments, forms, logins, and APIs.

The packages are not on npm yet. In a clone of this repo they are version 0.1.0.

- Widget: `@attackfee/widget`
- Server for Node: `@attackfee/server`
- Agent SDK: `@attackfee/agent`
- MCP server: `@attackfee/mcp`

The Attackfee WordPress plugin is GPL-2.0-or-later, on the [download page](/download).

## Add the check to a form

Serve `attackfee.js` from your own site. `@attackfee/server` does that at `/attackfee/v1/attackfee.js`.

```html
<script src="/attackfee/v1/attackfee.js" async></script>
<form method="post" action="/contact" data-attackfee="write">
  <button type="submit">Send</button>
  <noscript>This form needs JavaScript.</noscript>
</form>
```

While someone reads or types, the browser does a little background work. Your server checks that work and exchanges it for a short-lived pass. The pass rides along with the form post. One pass covers about 20 actions for 15 minutes.

## Check the write

On Node, install the server and reject a write that has no pass. The [server page](/docs/server) is the full setup, including PHP.

```sh
# From a clone of this repo: npm install && npm run build
npm install /path/to/attackfee/packages/server-node express
```

A request with no pass gets `403` and `attackfee_required`. Reads stay free.

## Next

- [Widget](/docs/widget)
- [Server](/docs/server)
- [Agent SDK](/docs/agent)
- [MCP server](/docs/mcp)
- [WordPress plugin](/docs/wordpress)
- [Self-hosting](/docs/self-hosting)
