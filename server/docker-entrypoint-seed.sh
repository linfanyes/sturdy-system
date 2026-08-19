#!/bin/sh
# 园丁工作台后端容器初始化入口（含种子数据）
# 流程：
#   1) 自动执行数据库迁移（migrations/*.sql，幂等 + 并发锁）
#   2) 运行种子数据生成脚本
#   3) 启动后端服务
set -e

echo "[entrypoint] 开始数据库初始化（自动迁移）..."
node dist/migrate.js
echo "[entrypoint] 迁移完成"

echo "[entrypoint] 开始写入种子数据..."
node dist/scripts/seed-data.js
echo "[entrypoint] 种子数据写入完成，启动后端服务..."

exec node dist/main.js
