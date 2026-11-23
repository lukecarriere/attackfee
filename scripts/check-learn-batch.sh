#!/bin/sh
# Thin wrapper. The checker is GET-only and sets its own User-Agent.
exec node "$(CDPATH= cd -- "$(dirname "$0")" && pwd)/check-learn-batch.mjs" "$@"
