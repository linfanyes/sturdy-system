@echo off
REM ============================================================
REM  重新构建微信小程序（uni-app -> mp-weixin）
REM  - 安装依赖（缺失时）
REM  - 执行 npm run build:mp-weixin
REM  产物: mini-program/dist/build/mp-weixin
REM        用微信开发者工具导入该目录 -> 上传版本即可发布到云托管
REM  用法: 双击 build-mini.bat
REM ============================================================
setlocal EnableExtensions

set "SCRIPT_DIR=%~dp0"
set "MINI_DIR=%SCRIPT_DIR%mini-program"
set "LOG_FILE=%SCRIPT_DIR%mini-build.log"

echo ==========================================
echo   重新构建微信小程序 (mp-weixin)
echo ==========================================

where node >nul 2>nul || (echo [ERROR] 未找到 node，请先安装 Node.js & pause & exit /b 1)
if not exist "%MINI_DIR%\package.json" (
  echo [ERROR] 未找到 mini-program 目录: %MINI_DIR%
  echo         请把本脚本放在仓库根目录（work-system\）。
  pause & exit /b 1
)

cd /d "%MINI_DIR%"

REM 1/2 安装依赖
if exist "node_modules\.bin\uni.cmd" (
  echo [1/2] 依赖已存在，跳过安装
) else (
  echo [1/2] 安装依赖，请稍候...
  call npm install --no-audit --no-fund
  if errorlevel 1 (echo [ERROR] npm install 失败 & pause & exit /b 1)
)

REM 2/2 构建
echo [2/2] 构建 mp-weixin...
call npm run build:mp-weixin > "%LOG_FILE%" 2>&1
if errorlevel 1 (
  echo [ERROR] 构建失败，详见日志: %LOG_FILE%
  pause & exit /b 1
)

echo.
echo   构建完成！
echo   产物目录: %MINI_DIR%\dist\build\mp-weixin
echo   下一步:   微信开发者工具 -> 导入该目录 -> 上传版本
echo.
pause
endlocal & exit /b 0
