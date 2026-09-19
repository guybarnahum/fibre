FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json ./
COPY infra ./infra
COPY services ./services
COPY integrations ./integrations

RUN npm install --prefix integrations/content-credentials/c2pa-node --omit=dev --no-package-lock

ENV NODE_ENV=production
ENV FIBRE_C2PA_HOST=0.0.0.0

CMD ["node", "infra/deployments/content-credential-signer/local/server.mjs"]
