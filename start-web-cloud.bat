@echo off
REM ============================================================
REM  启动 Web 前端 —— 微信云托管后端模式
REM  - 自动把 config.js 切到云后端公网地址
REM  - 启动 Vite dev server（端口 5201，严格占用）
REM  用法: 双击 start-web-cloud.bat
REM ============================================================
setlocal EnableExtensions

set "SCRIPT_DIR=%~dp0"
set "WEB_DIR=%SCRIPT_DIR%web-app"
set "LOG_FILE=%SCRIPT_DIR%web-app-dev.log"
set "RUNNER=%SCRIPT_DIR%web-dev-runner.bat"
set "PORT=5201"

echo ==========================================
echo   Web 前端启动 [云后端模式]
echo ==========================================

where node >nul 2>nul || (echo [ERROR] 未找到 node，请先安装 Node.js & pause & exit /b 1)
if not exist "%WEB_DIR%\package.json" (
  echo [ERROR] 未找到 web-app 目录: %WEB_DIR%
  echo         请把本脚本放在仓库根目录（work-system\）。
  pause & exit /b 1
)

cd /d "%WEB_DIR%"

REM 1/3 切换后端配置为云托管
echo [1/3] 切换 config.js -^> 云后端
node "%SCRIPT_DIR%scripts\set-web-env.js" cloud
if errorlevel 1 (pause & exit /b 1)

REM 2/3 依赖缺失时安装
if exist "node_modules\.bin\vite.cmd" (
  echo [2/3] 依赖已存在，跳过安装
) else (
  echo [2/3] 首次安装依赖，请稍候...
  call npm install --no-audit --no-fund
  if errorlevel 1 (echo [ERROR] npm install 失败 & pause & exit /b 1)
)

REM 3/3 释放端口并启动
echo [3/3] 释放端口 %PORT% 并启动 Vite...
for /F "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":%PORT%" ^| findstr "LISTEN"') do (
  if not "%%p"=="" (
    taskkill /F /PID %%p >nul 2>&1 && echo   已释放占用端口的进程 PID=%%p
  )
)

REM 生成后台运行脚本（避免引号嵌套问题）
> "%RUNNER%" echo @echo off
>> "%RUNNER%" echo cd /d "%WEB_DIR%"
>> "%RUNNER%" echo echo Starting web [cloud] on http://localhost:%PORT%/
>> "%RUNNER%" echo npx vite --port %PORT% --strictPort --host localhost ^> "%LOG_FILE%" 2^>^&1

start "web-dev-cloud" /B cmd /c "%RUNNER%"

echo.
echo   服务启动中（约 5-10 秒就绪）...
echo   日志:   %LOG_FILE%
echo   访问:   http://localhost:%PORT%/
echo   状态:   浏览器打开上面地址，或运行 start.bat 的 open 参数
echo   停止:   结束 vite 进程，或双击 stop.bat
echo.
pause
endlocal & exit /b 0
