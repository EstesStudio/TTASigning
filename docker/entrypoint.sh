#!/bin/sh
# PetskySign: aplica as migrations (só o que é novo) e sobe o app como o
# usuário `node`. Roda como root só o bastante para acertar o dono do volume,
# que o Docker/Coolify monta como root.
set -eu

DATA_DIR="${STORAGE_LOCAL_DIR:-/app/.data/storage}"

if [ "$(id -u)" = "0" ]; then
  mkdir -p "$DATA_DIR"
  chown -R node:node "$(dirname "$DATA_DIR")"
  exec gosu node "$0" "$@"
fi

node db/migrate.mjs
exec node_modules/.bin/next start -H 0.0.0.0 -p "${PORT:-3000}"
