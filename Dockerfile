# SUSHIRIGA — one container: the backend API (server/) serving the built frontend.
# Build:  docker build -t sushiriga .
# Run:    docker run -p 8787:8787 -v sushiriga-data:/data \
#           -e ORDER_TOKEN_SECRET="$(openssl rand -base64 48)" sushiriga

FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# The frontend talks to the API on the same origin.
ENV VITE_API_URL=/
RUN npx vite build && npm run server:build

FROM node:22-slim
ENV NODE_ENV=production \
    PORT=8787 \
    PUBLIC_DIR=/app/dist \
    DATABASE_PATH=/data/sushiriga.db
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--disable-warning=ExperimentalWarning", "dist-server/main.js"]
