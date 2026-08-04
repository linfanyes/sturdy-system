@echo off
REM ============================================================
REM  启动 Web 前端 —— 本地联调模式
REM  - 把 config.js 切回本地（/api 由 Vite 代理到 localhost:3000 的本地 server）
REM  - 用 npm run dev 启动 Vite（端口 5201，来自 vite.config.ts）
REM  前提: 本地后端服务跑在 localhost:3000（先双击 start-server.bat）
REM  用法: 双击 start-web-local.bat
REM ============================================================
setlocal EnableExtensions

set "SCRIPT_DIR=%~dp0"
set "WEB_DIR=%SCRIPT_DIR%web-app"
set "LOG_FILE=%SCRIPT_DIR%web-app-dev.log"
set "RUNNER=%SCRIPT_DIR%web-dev-runner.bat"
set "PORT=5201"
set "ENV=local"

echo ==========================================
echo   Web 前端启动 [本地联调模式]
echo ==========================================

where node >nul 2>nul || (echo [ERROR] 未找到 node，请先安装 Node.js 并重启终端后重试 & pause & exit /b 1)
where npm  >nul 2>nul || (echo [ERROR] 未找到 npm（应随 Node.js 一起安装） & pause & exit /b 1)
if not exist "%WEB_DIR%\package.json" (
  echo [ERROR] 未找到 web-app 目录: %WEB_DIR%
  echo         请把本脚本放在仓库根目录（work-system\）。
  pause & exit /b 1
)

cd /d "%WEB_DIR%"

REM 1/4 切换后端配置为本地
echo [1/4] 切换 config.js -^> 本地联调（/api -^> localhost:3000）
node "%SCRIPT_DIR%scripts\set-web-env.js" %ENV%
if errorlevel 1 (pause & exit /b 1)

REM 2/4 依赖缺失时安装
if exist "node_modules\.bin\vite.cmd" (
  echo [2/4] 依赖已存在，跳过安装
) else (
  echo [2/4] 首次安装依赖，请稍候...
  call npm install --no-audit --no-fund
  if errorlevel 1 (echo [ERROR] npm install 失败 & pause & exit /b 1)
)

REM 3/4 释放端口并生成启动脚本
echo [3/4] 释放端口 %PORT% 并生成启动脚本
for /F "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":%PORT%" ^| findstr "LISTEN"') do (
  if not "%%p"=="" taskkill /F /PID %%p >nul 2>&1 && echo   已结束占用端口的进程 PID=%%p
)

> "%RUNNER%" echo @echo off
>> "%RUNNER%" echo cd /d "%WEB_DIR%"
>> "%RUNNER%" echo echo Starting web [local] on http://localhost:%PORT%/
>> "%RUNNER%" echo npm run dev ^> "%LOG_FILE%" 2^>^&1

start "web-dev-local" /B cmd /c "%RUNNER%"

REM 4/4 轮询端口确认启动成功
echo [4/4] 等待服务就绪（最多 20 秒）...
set "READY="
for /L %%i in (1,1,20) do (
  netstat -ano 2^>nul | findstr ":%PORT%" | findstr "LISTEN" >nul && (set "READY=1" & goto :checkdone)
  timeout /t 1 >nul
)
:checkdone
echo.
if defined READY (
  echo   ✅ 服务已就绪: http://localhost:%PORT%/
  echo   日志:   %LOG_FILE%
  echo   访问:   浏览器打开上面地址即可使用
  echo   注意:   本模式需要本地后端已在 localhost:3000 运行（双击 start-server.bat），否则接口会 404。
  echo   停止:   双击 stop.bat
) else (
  echo   [ERROR] 启动超时。Vite 可能报错，日志尾部如下:
  echo   --------------------------------------------------
  powershell -NoProfile -Command "Get-Content '%LOG_FILE%' -Tail 20" 2^>nul
  echo   --------------------------------------------------
  echo   请把上方红色错误发我，或打开 %LOG_FILE% 查看完整日志。
)
echo.
pause
endlocal & exit /b 0
