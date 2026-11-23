# MCP server

`@attackfee/mcp` is a local MCP server for Attackfee's three write tools. Version 0.1.0. It speaks JSON-RPC on stdin and stdout, one message per line. It calls a site's existing `/v1` API and runs no network service of its own.

```sh
# From a clone of this repo: npm install && npm run build
npm install /path/to/attackfee/packages/mcp
```

```
# From a clone, after npm install && npm run build:
node packages/mcp/src/server.ts
# or: node packages/mcp/dist/index.js
```

```json
{
  "command": "node",
  "args": ["/path/to/attackfee/packages/mcp/src/server.ts"]
}
```

## Tools

- `price_write_action` returns the current check for one write, and the work alternative.
- `gate_form_write` asks the site for a one-use pass for one write.
- `verify_write_pass` is for the site's own server: it checks a pass.

Each tool takes a `site` argument, an origin such as `https://example.com`. The server reads `<site>/.well-known/attackfee.json` and calls that origin only. Nothing about the caller is sent or kept.

Counters are per UTC day, with no ids, and are written to stderr. Test mode only.

Page views need no call. The tools do not say whether the caller is a person or a program.
