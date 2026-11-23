# agent-pay-402

A runnable agent client for an Attackfee 402, and a script that funds it. Node 22.18 or later, run
from a clone after `npm install` (the scripts import the repo's TypeScript sources; no build step).

| File | What it does |
|---|---|
| `fund.mjs` | Asks the mint for a quote of N (1 to 50, hard cap), prints the amount and the invoice, waits until the invoice is paid, mints the proofs and adds them to the proof file (mode 0600). |
| `pay.mjs` | POSTs a write as an agent, reads the 402, pays one offer (`--mode cashu` from the proof file, or `--mode invoice`), gets a one-use pass and re-sends the write. |
| `pay.sh` | Same as `pay.mjs --mode invoice`, with curl and jq. |
| `proof-file.mjs` | Shared helpers for the proof file and the mint calls. |

## Fund a proof file

```sh
node examples/agent-pay-402/fund.mjs --amount 50 --out ~/attackfee-proofs.json
```

stdout is two lines, the amount and the invoice, and nothing else. Pay that invoice from any payment app.

- `--split <n>` mints the amount in groups that each add up to n (for example `--amount 50 --split 10`), so `pay.mjs` can pay an offer of n with those proofs as they are, without a swap.
- `--mint <url>` changes the mint. The default is the site's allow-listed mint. https only; plain http is accepted only for a loopback test mint.
- `--timeout <s>` (default 600) is how long it waits for the payment. If it is not paid in time the script exits 3 and keeps the quote in `<file>.pending`; if the invoice is paid later, `fund.mjs --resume --out <file>` mints it. Delete `<file>.pending` to drop an unpaid quote.
- The file is created with mode 0600 and checked afterwards. A proof file that group or others can read is refused. A second run adds to the same file.
- If the mint fails after the invoice is paid, the blinded outputs stay in `<file>.pending` (mode 0600); `fund.mjs --resume --out <file>` finishes the mint with the same outputs.
- Proofs, tokens and secrets are never printed, including in errors.

## Pay a 402

```sh
ATTACKFEE_CASHU_SOURCE=~/attackfee-proofs.json node examples/agent-pay-402/pay.mjs --base https://site.example --mode cashu --max-amount 10000
```

1. `POST <base><path>` (default `/demo/contact`) with `Attackfee-Client: agent`. The 402 lists the offers and a `payment` object with the mints, headers and steps.
2. `--max-amount <msat>` (default 10000) refuses an offer above it before anything is paid: exit 2, "offer over max-amount".
3. Cashu: if some of the file's proofs add up to the offer exactly, just those are sent and the rest stay in the file untouched. Otherwise all of them are swapped at the mint first and the change is written back to the file before redeeming. The sent proofs are kept under `unconfirmed` in the file until the site confirms them.
4. `POST /v1/redeem {offer_id, kind, token, credential}` returns a one-use pass (60 s).
5. The write is sent again with `Authorization: Attackfee <pass>`; the script prints `write: <status>`.

`--test` adds `attackfee-test: 1` to every request so the site counts the write in its test columns. Without it, a paid write counts in the site's real daily counters.

`--mode invoice` prints the invoice offer's amount and invoice and waits for Enter after you pay it. If the offer expires first it fetches a fresh 402 and prints a new invoice; do not pay the old one.

## Tests

`tests/agent-pay-fund.test.ts` and `tests/agent-pay-402.test.ts` run both scripts against the in-repo loopback mint and a local `wrangler dev --local` Worker. `ATTACKFEE_MINT_PROXY` (test only, loopback URLs only) sends the scripts' mint calls to that loopback mint, the way the Worker's `CASHU_FETCH_PROXY` does. No real mint is called and nothing is spent.
