# Food Planner: the API serving the built client, one image.
# Built on the server by Docker Compose (see DEPLOYMENT.md).

# --- Build: install everything, build the client, then the API
FROM node:26-slim AS build
WORKDIR /app

# Dependencies first, so they stay cached while only the source changes
COPY package.json package-lock.json .npmrc ./
COPY packages/api/package.json packages/api/
COPY packages/client/package.json packages/client/
RUN npm ci

COPY packages packages
# Same origin: the client calls /api on the host that served it
RUN npm run build-only --workspace=packages/client \
    && npm run build --workspace=packages/api

# --- Run: production dependencies of the API and the built files only
FROM node:26-slim
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
COPY packages/api/package.json packages/api/
RUN npm ci --omit=dev --workspace=packages/api && npm cache clean --force

COPY --from=build /app/packages/api/dist packages/api/dist
COPY --from=build /app/packages/client/dist packages/client/dist

# The user and import CLIs run from here: npm run user -- list
WORKDIR /app/packages/api
USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/status').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"

CMD ["node", "dist/main.js"]
