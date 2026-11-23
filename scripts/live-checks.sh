#!/usr/bin/env bash
# Free read-only checks by default. --spend <cap> runs the real-ecash checks.
# Proofs and the wallet module come from --proofs/--wallet or ATTACKFEE_PROOFS/ATTACKFEE_WALLET.
# Tokens, proofs, and secrets are not printed.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
exec node "$here/live-checks.mjs" "$@"
