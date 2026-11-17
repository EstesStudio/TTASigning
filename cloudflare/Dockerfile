# The SignuDoc app as a container, for Cloudflare Containers. Built with the
# repository root as its context (see wrangler.jsonc).
FROM node:24-slim

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 8080

# Apply any new database migrations, then serve. The migration takes a lock
# in the database, so two containers starting together do not collide.
# "--optional" lets the app start before a database is connected: it then
# shows a page that says so, as it does on Vercel.
CMD ["sh", "-c", "node db/migrate.mjs --optional && exec node_modules/.bin/next start -H 0.0.0.0 -p 8080"]
