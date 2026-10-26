# Lumière in one image: the API also serves the built client, so http://localhost:3002 is the site and the API.
# Run it with `docker compose --profile app up --build` (see README.md). Daily coding uses `npm run dev` instead.

# 1. Build the client.
FROM node:22-alpine AS client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# 2. Install only what the server needs to run (no test or lint tools). The start script uses the Knex CLI and
#    the seed uses node-html-parser, so both are in `dependencies`.
FROM node:22-alpine AS server-deps
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev

# 3. The image that runs.
FROM node:22-alpine AS runtime
WORKDIR /app/server
ENV NODE_ENV=production
COPY --from=server-deps /app/server/node_modules ./node_modules
COPY server/ ./
COPY --from=client /app/client/dist ./public
# The dataset is downloaded into db/data on the first start. docker-compose.yml keeps it in a volume, and the
# `node` user must own the folder to write there.
RUN mkdir -p db/data && chown -R node:node db/data
USER node
EXPOSE 3002
CMD ["sh", "scripts/docker-start.sh"]
