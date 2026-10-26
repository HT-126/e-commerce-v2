#!/bin/sh
# What the Docker image runs: bring the database up to date, fill it if it is empty, then start the server.
# Every step can run again safely, so a restart never fails and never seeds twice.
set -e

# npx would print "a new npm version is available" in the logs of every start.
export NPM_CONFIG_UPDATE_NOTIFIER=false

# Applies the migrations that have not run yet. Nothing to do on a database that is up to date.
npx knex migrate:latest

# `empty` or `filled`. If the database cannot be read this stops the script (set -e), it does not guess.
catalog=$(node scripts/catalog-state.js)

if [ "$catalog" = "empty" ]; then
  # Downloads the pinned dataset into db/data (a volume in docker-compose.yml, so it is kept there). Skipped when the
  # file is already there. Then fills the database. The seed also checks for itself that the catalog is empty.
  node scripts/download-data.js
  npx knex seed:run
else
  # The usual start of a database that already has its data: no download, so a restart is fast and does not
  # depend on GitHub being reachable.
  echo "Catalog already filled: no download, no seed."
fi

# `exec` makes the server the main process, so `docker stop` reaches it.
exec node src/server.js
