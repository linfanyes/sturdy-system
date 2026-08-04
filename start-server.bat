@echo off
chcp 65001 >nul
REM ============================================================
REM  启动本地后端服务（NestJS，端口 3000）
REM  - 用法: 双击 start-server.bat
REM  - 前提: server/node_modules 已安装（cd server && npm install）
REM  - 注意: 本机 safe-delete 拦截器(genie-trash)会在 `nest start --watch` 清理 dist 时
REM         ETIMEDOUT，导致 nest start 启动失败、后端起不来、前端 local 模式接口全 404。
REM         故改用 `tsc 编译 + node 启动` 绕过该拦截（已验证可用）。
REM  - 停止: 双击 stop.bat，或 Ctrl+C
REM ============================================================
set "SCRIPT_DIR=%~dp0"
set "SERVER_DIR=%SCRIPT_DIR%server"
cd /d "%SERVER_DIR%"

echo [start-server] 编译后端 (tsc -p tsconfig.build.json)...
call npx tsc -p tsconfig.build.json
if errorlevel 1 (echo [ERROR] 编译失败，请检查 TypeScript 错误 & pause & exit /b 1)

echo [start-server] 启动后端于端口 3000 (Ctrl+C 停止)...
node dist/main.js
