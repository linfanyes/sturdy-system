@echo off
chcp 65001 >nul
REM ============================================================
REM  停止服务脚本 (Windows)
REM  按端口定位并结束进程：后端 3000 / Web 前端 5201
REM  说明: 旧版 stop.bat 仅依赖已失效的 app.pid、且只停前端，无法停止后端。
REM        本版改为按 LISTENING 端口精确定位进程，前后端均可停止。
REM ============================================================
setlocal EnableExtensions
set "PORTS=3000 5201"
set "STOPPED=0"

for %%P in (%PORTS%) do (
  for /F "tokens=*" %%X in ('powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort %%P -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess"') do (
    if not "%%X"=="" (
      taskkill /F /PID %%X >nul 2>nul
      if not errorlevel 1 (
        echo [stop] 已停止端口 %%P 的进程 PID=%%X
        set "STOPPED=1"
      )
    )
  )
)

if "%STOPPED%"=="0" (
  echo [stop] 未发现有监听 3000 / 5201 的运行中实例
)
echo [stop] 完成
endlocal
