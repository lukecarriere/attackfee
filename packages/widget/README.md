# @attackfee/widget

`attackfee.js` for forms. The files are self-hosted: your server serves them, and the page loads them from your own origin.

```html
<script src="/attackfee/v1/attackfee.js" async></script>
<form method="post" action="/contact" data-attackfee="write">
  <button type="submit">Send</button>
  <noscript>This form needs JavaScript.</noscript>
</form>
```

`@attackfee/server` serves these files from `Attackfee.router()`. You can also copy them from this package.

```js
import { attackfeeJs, attackfeeWorker, attackfeeWorkerArgon2id, licenses } from "@attackfee/widget";
```

`attackfeeJs`, `attackfeeWorker` and `attackfeeWorkerArgon2id` are URLs of `dist/attackfee.js`, `dist/attackfee.worker.js` and `dist/attackfee.worker-argon2id.js`. `licenses` is `dist/LICENSES.txt`.
