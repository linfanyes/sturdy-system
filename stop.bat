@echo off
REM ============================================================
REM 园丁工作台 · 一键停止脚本 (Windows)
REM 路径: workSystem\stop.bat
REM 用法:
REM   stop.bat
REM ============================================================

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "PID_FILE=%SCRIPT_DIR%app.pid"
set "PORT=5201"

for /F "tokens=*" %%i in ('echo prompt $E ^| cmd') do set "ESC=%%i"
set "GREEN=%ESC%[0;32m"
set "YELLOW=%ESC%[1;33m"
set "RED=%ESC%[0;31m"
set "NC=%ESC%[0m"

set "STOPPED=0"

REM 1. 通过 PID 文件结束 (Vite 是 npx 启动的 node.exe 进程, 需要找它的子进程)
if exist "%PID_FILE%" (
    set /p SAVED_PID=<"%PID_FILE%"
    if not "!SAVED_PID!"=="" (
        REM 强制结束所有 node.exe 进程中标题为 trace-app 的窗口
        taskkill /FI "WINDOWTITLE eq trace-app*" /T /F >nul 2>nul
        if not errorlevel 1 (
            echo %GREEN%[stop.bat]%NC% 已通过任务窗口结束进程
            set "STOPPED=1"
        )
    )
    del /f /q "%PID_FILE%" >nul 2>nul
) else (
    echo %YELLOW%[stop.bat]%NC% 未找到 PID 文件, 尝试根据端口清理
)

REM 2. 兜底: 占用端口的进程
for /F "tokens=*" %%P in ('powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort %PORT% -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess"') do (
    if not "%%P"=="" (
        echo %YELLOW%[stop.bat]%NC% 发现占用端口 %PORT% 的进程 PID=%%P
        taskkill /F /PID %%P >nul 2>nul
        set "STOPPED=1"
    )
)

REM 3. 兜底: 杀掉所有 npx / node 中含 vite 的进程
for /F "tokens=2" %%P in ('tasklist /FI "IMAGENAME eq node.exe" /NH 2^>nul ^| findstr /R "node"') do (
    wmic process where "ProcessId=%%P" get CommandLine /format:list 2>nul | findstr /I "vite" >nul
    if not errorlevel 1 (
        echo %YELLOW%[stop.bat]%NC% 结束 vite 进程 PID=%%P
        taskkill /F /PID %%P >nul 2>nul
        set "STOPPED=1"
    )
)

if "%STOPPED%"=="0" (
    echo %GREEN%[stop.bat]%NC% 未发现运行中的实例
)
echo %GREEN%[stop.bat]%NC% 完成
endlocal
