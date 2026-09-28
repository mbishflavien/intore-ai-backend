# IntoreAI API — production image (compiled TypeScript, no dev deps at runtime).
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY api/package.json ./api/
COPY packages/engine/package.json ./packages/engine/
COPY packages/shared/package.json ./packages/shared/
RUN npm ci
COPY api ./api
COPY packages ./packages
RUN npm run build

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app/api
COPY --from=builder /app/package.json /app/package-lock.json /app/
COPY --from=builder /app/api/package.json ./
COPY --from=builder /app/api/dist ./dist
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/api/node_modules ./node_modules
EXPOSE 4000
# Compiled entry (tsconfig emits api/dist/api/src + api/dist/packages).
CMD ["node", "dist/api/src/server.js"]
