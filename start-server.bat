@echo off
chcp 65001 >nul
REM ============================================================
REM  启动本地后端服务（NestJS，端口 3000）
REM  - 用法: 双击 start-server.bat
REM  - 前提: server/node_modules 已安装（cd server && npm install）
REM  - Web 前端请用 start-web-local.bat（本地联调）或 start-web-cloud.bat（云后端）
REM  - 注: 本脚本已修复旧版硬编码旧机器路径且误跑 vite 的问题（历史债 #13）
REM ============================================================
set "SCRIPT_DIR=%~dp0"
set "SERVER_DIR=%SCRIPT_DIR%server"
cd /d "%SERVER_DIR%"
echo Starting backend server on port 3000 (Ctrl+C to stop)...
call npm run start:dev
