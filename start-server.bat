@echo off
chcp 65001 >nul
cd /d "D:\workspae\new\workSystem\app"
echo Starting dev server on port 5201...
call npx vite --port 5201 --host
