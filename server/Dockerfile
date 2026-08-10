# cache-bust-2: 2026-08-05 强制刷新构建缓存（规避云构建镜像层 commit 校验和错误）
# cache-bust-shared: 2026-08-10 修复 @gardener/shared dist 缺失导致 TS2307
# ---- 构建阶段（含 devDeps，用于编译） ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY . .

# 确保 @gardener/shared 的编译产物 dist 存在（这是 TS2307 报错的根因）。
# - 若构建上下文为仓库根目录（../shared 存在），则从源码现编一份最新 dist；
# - 否则依赖已入库的 server/vendor/gardener-shared/dist（构建上下文为 server/ 时）。
# 二者任一共存即可，npm install 会把 vendor 包复制进 node_modules/@gardener/shared。
RUN set -e; \
    if [ -d "../shared" ]; then \
      echo "[build] Building @gardener/shared from ../shared"; \
      cp -r ../shared ./_shared && cd _shared && npm install --no-audit --no-fund && npm run build && cd ..; \
      rm -rf vendor/gardener-shared/dist; \
      cp -r _shared/dist vendor/gardener-shared/dist; \
      rm -rf _shared; \
    elif [ ! -d "vendor/gardener-shared/dist" ]; then \
      echo "[build] ERROR: @gardener/shared dist 缺失。请将 server/vendor/gardener-shared/dist 入库，或以仓库根为构建上下文重新构建。"; \
      exit 1; \
    fi

RUN npm install
RUN npm run build

# ---- 生产依赖阶段（仅安装运行时依赖） ----
# cache-bust-pd-2: 2026-08-05 强制刷新生产依赖缓存
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package*.json ./
RUN npm install --production --ignore-scripts

# ---- 运行阶段 ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
# migrations 目录：供启动时自动 migration runner 执行（见 main.ts runMigrations）
COPY --from=build /app/migrations ./migrations
# 以非 root 用户运行，符合云托管安全最佳实践
RUN chown -R node:node /app
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
