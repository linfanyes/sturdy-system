@echo off
chcp 65001 >nul
cd /d "D:\workspace\qoder\work-system\app"
echo Starting dev server on port 5201...
call npx vite --port 5201 --host
