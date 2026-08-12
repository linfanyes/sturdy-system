# cache-bust: 2026-08-12 简化 shared 构建，纯靠 vendor/gardener-shared/dist 入库
# ---- 构建阶段（含 devDeps，用于编译） ----
FROM node:20-alpine AS build
WORKDIR /app
# 先拷贝依赖描述，尽量利用层缓存
COPY package*.json ./
COPY vendor ./vendor
# 剩余源码（包含 migrations / public / tsconfig 等）
COPY . .

# 确保 @gardener/shared 的编译产物 dist 存在
# 云托管构建上下文一般只有 server/ 目录，不会带上 ../shared；
# 因此优先使用随仓库入库的 vendor/gardener-shared/dist；
# 仅当 developer 本地存在 ../shared 源码时才现场构建。
RUN set -e; \
    if [ -d "../shared" ] && [ -f "../shared/package.json" ]; then \
      echo "[build] Developer mode: building @gardener/shared from ../shared"; \
      cp -r ../shared ./_shared && cd _shared && npm install --no-audit --no-fund && npm run build && cd ..; \
      rm -rf vendor/gardener-shared/dist; \
      cp -r _shared/dist vendor/gardener-shared/dist; \
      rm -rf _shared; \
    fi; \
    if [ ! -d "vendor/gardener-shared/dist" ]; then \
      echo "[build] ERROR: @gardener/shared/dist 缺失。请将 vendor/gardener-shared/dist 入库后再构建。"; \
      exit 1; \
    fi; \
    echo "[build] @gardener/shared/dist ready."

# 云构建上下文仅含 server/，../shared 不存在；
# file:../shared 依赖无法建立有效软链，会导致 tsc 解析 @gardener/shared/* 失败（TS2307）。
# 将其重定向到随仓库入库的 vendor 副本，确保 npm install 能正确链接 @gardener/shared。
RUN set -e; \
    if [ ! -d "../shared" ]; then \
      echo "[build] 云构建：@gardener/shared 依赖重定向到 vendor/gardener-shared"; \
      sed -i 's#"file:../shared"#"file:vendor/gardener-shared"#g' package.json; \
      sed -i 's#"file:../shared"#"file:vendor/gardener-shared"#g' package-lock.json; \
    fi

RUN npm install --no-audit --no-fund
# 兜底：强制构建期 node_modules/@gardener/shared 指向完整 vendor 副本
# （即便 npm install 软链异常，也用真实目录副本覆盖，保证 tsc 解析与运行时 require 一致）
RUN if [ -d vendor/gardener-shared/dist ]; then \
      if [ -L node_modules/@gardener/shared ]; then rm -f node_modules/@gardener/shared; fi; \
      rm -rf node_modules/@gardener/shared && cp -r vendor/gardener-shared node_modules/@gardener/shared; \
    fi
RUN npm run build

# ---- 生产依赖阶段（仅安装运行时依赖） ----
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package*.json ./
COPY vendor ./vendor
RUN npm install --production --ignore-scripts
# 兜底：确保 node_modules/@gardener/shared 包含完整 dist
RUN if [ -d vendor/gardener-shared/dist ]; then \
      if [ -L node_modules/@gardener/shared ]; then \
        rm -f node_modules/@gardener/shared; \
      fi; \
      rm -rf node_modules/@gardener/shared && \
      cp -r vendor/gardener-shared node_modules/@gardener/shared; \
    fi

# ---- 运行阶段 ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/migrations ./migrations
# 复制 vendor 目录以便运行时引用
COPY --from=build /app/vendor ./vendor
RUN chown -R node:node /app
USER node
EXPOSE 3000
# 健康检查（微信云托管使用 /health 端点）
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"
CMD ["node", "dist/main.js"]
