# Widget

`@attackfee/widget` is `attackfee.js` for forms. Version 0.1.0. The files are self-hosted: your server serves them, and the page loads them from your own origin.

```sh
# From a clone of this repo: npm install && npm run build
npm install /path/to/attackfee/packages/widget
```

```html
<script src="/attackfee/v1/attackfee.js" async></script>
<form method="post" action="/contact" data-attackfee="write">
  <button type="submit">Send</button>
  <noscript>This form needs JavaScript.</noscript>
</form>
```

`data-attackfee="write"` marks a write. Use `data-attackfee="search"` for a search that is sent as a form post. A page view is not a write and stays free.

`@attackfee/server` serves the files from `Attackfee.router()`:

- `/attackfee/v1/attackfee.js`
- `/attackfee/v1/attackfee.worker.js`
- `/attackfee/v1/attackfee.worker-argon2id.js`
- `/attackfee/v1/LICENSES.txt`

You can also copy them out of the package.

```js
import { attackfeeJs, attackfeeWorker, attackfeeWorkerArgon2id, licenses } from "@attackfee/widget";
```

`attackfeeJs`, `attackfeeWorker` and `attackfeeWorkerArgon2id` are URLs of those files. `licenses` is the third-party notices.

## Visible check

Off by default. Add `data-attackfee-checkbox="true"` on the form to show a "Verify before sending" button instead of an invisible check. Most sites don't need it.

If a check would take longer than the limit, the visitor gets that button instead of waiting. Set `data-max-solve-ms` on the script tag to the same number as `max_solve_ms` on the server.

## What the visitor sees

- Working: Checking…
- Done after a visible check: Verified
- Button name: Verify before sending
- Error: Couldn't check this form.
- Error action: Try again
- No JavaScript. The line is "This form needs JavaScript."

The check never reads or sends what people type into the form.
