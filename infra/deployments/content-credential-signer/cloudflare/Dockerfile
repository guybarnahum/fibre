FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json ./
COPY infra ./infra
COPY services ./services
COPY integrations ./integrations

RUN npm install --prefix integrations/content-credentials/c2pa-node --omit=dev --no-package-lock

ENV NODE_ENV=production

CMD ["node", "infra/deployments/content-credential-signer/local/server.mjs"]
