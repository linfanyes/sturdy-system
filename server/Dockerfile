# ---- 构建阶段 ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ---- 运行阶段 ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
# migrations 目录：供启动时自动 migration runner 执行（见 main.ts runMigrations）
COPY --from=build /app/migrations ./migrations
# 以非 root 用户运行，符合云托管安全最佳实践
RUN chown -R node:node /app
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
