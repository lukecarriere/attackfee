#!/usr/bin/env bash
# Reference agent client for an Attackfee 402 with curl and jq. Invoice mode only: paying the cashu
# offer needs blind signatures for the change, so use pay.mjs for that.
#
#   examples/agent-pay-402/pay.sh --base https://site.example [--path /demo/contact] [--max-amount 10000] [--test]
#
# POSTs the write as an agent, reads the 402, refuses an offer above --max-amount (msat), prints the
# invoice offer's amount and invoice, waits for Enter once it is paid from any wallet, presents
# `Authorization: L402 <macaroon>` for a one-use pass and re-sends the write with
# `Authorization: Attackfee <pass>`. An offer that expires first is replaced by a fresh 402.
# Never prints the macaroon or the pass.
set -euo pipefail

BASE=""
WPATH="/demo/contact"
MAX=10000
TEST=0
MODE="invoice"
BODY='{"message":"agent-pay-402 example"}'
while [ $# -gt 0 ]; do
  case "$1" in
    --base) BASE="${2:?--base needs a value}"; shift 2 ;;
    --path) WPATH="${2:?--path needs a value}"; shift 2 ;;
    --max-amount) MAX="${2:?--max-amount needs a value}"; shift 2 ;;
    --mode) MODE="${2:?--mode needs a value}"; shift 2 ;;
    --body) BODY="${2:?--body needs a value}"; shift 2 ;;
    --test) TEST=1; shift ;;
    *) echo "error: unknown argument $1" >&2; exit 1 ;;
  esac
done
[ -n "$BASE" ] || { echo "error: --base is required" >&2; exit 1; }
[ "$MODE" = "invoice" ] || { echo "error: pay.sh pays the invoice offer only; use pay.mjs --mode cashu" >&2; exit 1; }
[[ "$MAX" =~ ^[0-9]+$ ]] || { echo "error: --max-amount is a whole number of msat" >&2; exit 1; }
command -v jq >/dev/null || { echo "error: jq is required" >&2; exit 1; }
BASE="${BASE%/}"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
H=(-H 'attackfee-client: agent' -H 'accept: application/json' -H 'content-type: application/json')
[ "$TEST" = 1 ] && H+=(-H 'attackfee-test: 1')

post() { # post <outfile> [extra header]
  local out="$1"; shift
  curl -sS -o "$out" -w '%{http_code}' -X POST "${H[@]}" "$@" --data "$BODY" "$BASE$WPATH"
}

for _ in 1 2 3; do
  code="$(post "$TMP/first")"
  if [ "$code" != "402" ]; then
    echo "write: $code (no payment asked)"
    [[ "$code" =~ ^2 ]] && exit 0 || exit 1
  fi
  jq -e '[.offers[]? | select(.kind == "l402" or .kind == "ln402")][0]' "$TMP/first" > "$TMP/offer" 2>/dev/null || { echo "error: the 402 has no invoice offer" >&2; exit 1; }
  amount="$(jq -r '.amount_msat' "$TMP/offer")"
  [[ "$amount" =~ ^[0-9]+$ ]] || { echo "error: the offer has no amount" >&2; exit 1; }
  if [ "$amount" -gt "$MAX" ]; then
    echo "error: offer over max-amount ($amount msat > $MAX msat); nothing paid" >&2
    exit 2
  fi
  exp="$(jq -r '.exp' "$TMP/offer")"
  echo "offer: $(jq -r '.kind' "$TMP/offer") $amount msat, expires in $(( exp - $(date +%s) )) s"
  echo "amount: $(( (amount + 999) / 1000 )) sat"
  echo "invoice: $(jq -r '.invoice' "$TMP/offer")"
  echo "pay the invoice from any wallet, then press Enter" >&2
  while :; do
    left=$(( exp - $(date +%s) ))
    if [ "$left" -le 0 ]; then echo "the offer expired; fetching a fresh one. Do not pay the old invoice." >&2; continue 2; fi
    set +e
    read -r -t "$left" _line
    rc=$?
    set -e
    if [ "$rc" -gt 128 ]; then echo "the offer expired; fetching a fresh one. Do not pay the old invoice." >&2; continue 2; fi
    [ "$rc" -eq 0 ] || { echo "error: stdin closed before the invoice was confirmed" >&2; exit 1; }
    rcode="$(post "$TMP/redeem" -H "authorization: L402 $(jq -r '.macaroon' "$TMP/offer")")"
    pass="$(jq -r '.pass // empty' "$TMP/redeem" 2>/dev/null || true)"
    if [ "$rcode" = "200" ] && [ -n "$pass" ]; then
      echo "redeemed: one-use pass"
      wcode="$(post "$TMP/write" -H "authorization: Attackfee $pass")"
      echo "write: $wcode"
      [[ "$wcode" =~ ^2 ]] && exit 0 || exit 1
    fi
    echo "not settled yet ($rcode $(jq -r '.error // ""' "$TMP/redeem" 2>/dev/null || true)); press Enter to check again" >&2
  done
done
echo "error: no invoice was paid in 3 offers" >&2
exit 1
