# cache-bust-2: 2026-08-05 强制刷新构建缓存（规避云构建镜像层 commit 校验和错误）
# ---- 构建阶段（含 devDeps，用于编译） ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
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
