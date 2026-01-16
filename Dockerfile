FROM node:20-alpine AS base

FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Install production dependencies and ensure permission security
RUN npm ci --only=production && \
    chown -R node:node /app

# Switch to non-root user for runtime security
USER node

EXPOSE 5000
CMD ["npm", "run", "start"]
