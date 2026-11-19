# PetskySign: imagem para o Coolify (ou qualquer Docker), em ARM ou x86.
# Guia: docs/staging-coolify.md.
#
#   docker build --build-arg NEXT_PUBLIC_APP_LOCALE=pt-BR -t petskysign .
#
# NEXT_PUBLIC_APP_LOCALE é lido no build (vai para o código do navegador):
# no Coolify, marque a variável como "Build Variable".

FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG NEXT_PUBLIC_APP_LOCALE=pt-BR
ENV NEXT_PUBLIC_APP_LOCALE=${NEXT_PUBLIC_APP_LOCALE}
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    STORAGE_DRIVER=local \
    STORAGE_LOCAL_DIR=/app/.data/storage
# Tudo do build: o `next start` lê next.config.ts, as fontes em src/assets e o
# wasm do harfbuzz em node_modules (pdf-fonts.ts).
# gosu: o entrypoint acerta o dono do volume como root e desce para `node`.
RUN apt-get update \
 && apt-get install -y --no-install-recommends gosu \
 && rm -rf /var/lib/apt/lists/*
COPY --from=build /app /app
COPY docker/entrypoint.sh /usr/local/bin/petskysign-entrypoint
RUN chmod +x /usr/local/bin/petskysign-entrypoint \
 && mkdir -p /app/.data/storage \
 && chown -R node:node /app/.data
# Os PDFs, os assinados e os certificados: precisa de volume persistente.
VOLUME ["/app/.data"]
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/icon.svg').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["petskysign-entrypoint"]
