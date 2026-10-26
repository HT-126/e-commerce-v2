#!/bin/sh
# What the Docker image runs: get the data, bring the database up to date, then start the server.
# Every step can run again safely, so a restart never fails and never seeds twice.
set -e

# Downloads the pinned dataset into db/data (a volume, so it is kept). Skipped when the file is there.
node scripts/download-data.js

# Applies the migrations that have not run yet. Nothing to do on a database that is up to date.
npx knex migrate:latest

# Seeds the catalog. It prints "Seed skipped: database not empty" and stops when the catalog has products.
npx knex seed:run

# `exec` makes the server the main process, so `docker stop` reaches it.
exec node src/server.js
