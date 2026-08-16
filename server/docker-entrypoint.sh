#!/bin/sh
# 园丁工作台后端容器初始化入口
# 流程：
#   1) 自动执行数据库迁移（migrations/*.sql，幂等 + 并发锁）
#   2) 迁移完成后启动后端服务
# 这样云端每次「重新拉取代码 → 跑流水线 → 重建部署」都会先对齐表结构再起服务，
# 新增实体只需在 server/src/migrations/ 添加 .sql 迁移文件并重新部署即可，无需手动建表。
set -e

echo "[entrypoint] 开始数据库初始化（自动迁移）..."
node dist/migrate.js
echo "[entrypoint] 迁移完成，启动后端服务..."

# exec 让 node 进程接管 PID 1，正确接收并转发 SIGTERM/SIGINT 等信号
exec node dist/main.js
