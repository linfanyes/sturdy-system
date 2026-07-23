@echo off
REM ============================================================
REM Gardener Workstation - One-click Start (Windows)
REM Path: workSystem\start.bat
REM Usage:
REM   start.bat            (default: dev mode)
REM   start.bat preview    (build + preview)
REM   start.bat build      (build only)
REM   start.bat install    (install deps only)
REM   start.bat open       (open browser only)
REM ============================================================
setlocal EnableExtensions

set "SCRIPT_DIR=%~dp0"
set "APP_DIR=%SCRIPT_DIR%app"
set "LOG_FILE=%SCRIPT_DIR%app.log"
set "PID_FILE=%SCRIPT_DIR%app.pid"
set "RUNNER_BAT=%SCRIPT_DIR%start-server.bat"
if "%PORT%"=="" set "PORT=5201"

REM Branch: open browser only
if /I "%~1"=="open" goto :OPEN_BROWSER

echo ==========================================
echo   Gardener Workstation - One-click Start
echo ==========================================
echo.
echo [start.bat] PATH: %SCRIPT_DIR%
echo.

REM 1. Check Node.js
where node >nul 2>nul
if errorlevel 1 goto :NO_NODE
where npm >nul 2>nul
if errorlevel 1 goto :NO_NPM
for /F "tokens=*" %%v in ('node -v') do set "NODE_VER=%%v"
echo [start.bat] Node.js: %NODE_VER%

REM 2. Check app dir
if not exist "%APP_DIR%\package.json" goto :NO_APP
cd /d "%APP_DIR%"

set "MODE=%~1"
if "%MODE%"=="" set "MODE=dev"
echo [start.bat] Mode: %MODE%
echo.

REM 3-4. Cleanup port and old PID via PowerShell
echo [start.bat] Preparing port %PORT%...
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%scripts\pre-start.ps1" -Port %PORT%
if errorlevel 1 goto :PRE_START_FAIL

REM 5. Install deps (goto style, avoid nested parens blocks)
if exist "node_modules\.bin\vite.cmd" goto :DEPS_OK
echo [start.bat] Installing deps, please wait 1-3 min on first run...
call npm install --no-audit --no-fund
if errorlevel 1 goto :NPM_FAIL
goto :DEPS_DONE
:DEPS_OK
echo [start.bat] Deps present, skip install
:DEPS_DONE
echo.

REM 6. install mode
if /I not "%MODE%"=="install" goto :AFTER_INSTALL
echo [start.bat] Deps installed.
pause
goto :END_OK

REM 7. build mode
:AFTER_INSTALL
if /I not "%MODE%"=="build" goto :AFTER_BUILD
echo [start.bat] Building production...
call npm run build
if errorlevel 1 goto :BUILD_FAIL
echo [start.bat] Build done: %APP_DIR%\dist
pause
goto :END_OK

REM 8. Generate runner script (ASCII-only, no BOM)
:AFTER_BUILD
echo [start.bat] Preparing runner script...
> "%RUNNER_BAT%" echo @echo off
>> "%RUNNER_BAT%" echo chcp 65001 ^>nul
>> "%RUNNER_BAT%" echo cd /d "%APP_DIR%"

if /I "%MODE%"=="preview" goto :RUNNER_PREVIEW

REM dev runner
>> "%RUNNER_BAT%" echo echo Starting dev server on port %PORT%...
>> "%RUNNER_BAT%" echo call npx vite --port %PORT% --host localhost
goto :RUNNER_DONE

:RUNNER_PREVIEW
>> "%RUNNER_BAT%" echo echo Building production bundle...
>> "%RUNNER_BAT%" echo call npm run build
>> "%RUNNER_BAT%" echo if errorlevel 1 exit /b 1
>> "%RUNNER_BAT%" echo echo Starting preview server on port %PORT%...
>> "%RUNNER_BAT%" echo call npx vite preview --port %PORT% --host localhost
:RUNNER_DONE

if not exist "%RUNNER_BAT%" goto :RUNNER_FAIL

REM 9. Start runner in background
if /I "%MODE%"=="preview" goto :MSG_PREVIEW
echo [start.bat] Starting dev server on port %PORT%...
goto :START_RUNNER
:MSG_PREVIEW
echo [start.bat] Starting preview server on port %PORT%...
:START_RUNNER

REM Launch runner in background (write all output to log)
start "trace-app-runner" /B cmd /c "%RUNNER_BAT% > "%LOG_FILE%" 2>&1"

REM 10-12. Wait for port + health check + save PID
echo [start.bat] Waiting for service to be ready...
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%scripts\wait-ready.ps1" -Port %PORT% -LogFile "%LOG_FILE%" -PidFile "%PID_FILE%"
if errorlevel 1 goto :WAIT_READY_FAIL

REM Read PID
set "RUN_PID="
if exist "%PID_FILE%" (
    for /F "tokens=*" %%p in ('type "%PID_FILE%"') do (
        if not defined RUN_PID set "RUN_PID=%%p"
    )
)

REM 13. Print info
echo.
echo ==========================================
echo   Server is ready
echo ==========================================
echo   URL:        http://localhost:%PORT%/
echo   Login code: 1314520
echo   Log file:   %LOG_FILE%
echo   PID:        %RUN_PID% (in %PID_FILE%)
echo   Stop:       double-click stop.bat
echo ==========================================
echo.

REM 14. Open browser
echo [start.bat] Opening default browser...
powershell -NoProfile -Command "$ErrorActionPreference = 'SilentlyContinue'; Start-Process 'http://localhost:%PORT%/'"

if errorlevel 1 goto :OPEN_FAIL
echo [start.bat] Browser opened.
goto :END_OK_BROWSER

:OPEN_FAIL
echo [WARN] Auto-open failed, please visit: http://localhost:%PORT%/
:END_OK_BROWSER

echo.
echo You can close this window; the server keeps running.
echo To stop the server, double-click stop.bat
echo.

REM 15. Auto-close after 5s so user can read message
ping -n 6 127.0.0.1 >nul
goto :END_OK

:OPEN_BROWSER
echo [start.bat] Opening http://localhost:%PORT%/
powershell -NoProfile -Command "$ErrorActionPreference = 'SilentlyContinue'; Start-Process 'http://localhost:%PORT%/'"
echo Done.
goto :END_OK

REM ============================================================
REM Failure labels
REM ============================================================
:NO_NODE
echo [ERROR] Node.js not found. Install from https://nodejs.org
pause
goto :END_FAIL

:NO_NPM
echo [ERROR] npm not found. Reinstall Node.js.
pause
goto :END_FAIL

:NO_APP
echo [ERROR] App dir not found: %APP_DIR%
echo         Place this script in workSystem root.
pause
goto :END_FAIL

:PRE_START_FAIL
echo.
echo [ERROR] Port preparation failed. See messages above.
echo         If port %PORT% is held by a system process, close it or change PORT.
pause
goto :END_FAIL

:NPM_FAIL
echo [ERROR] npm install failed
pause
goto :END_FAIL

:BUILD_FAIL
echo [ERROR] Build failed
pause
goto :END_FAIL

:RUNNER_FAIL
echo [ERROR] Failed to create runner script
pause
goto :END_FAIL

:WAIT_READY_FAIL
echo.
echo [ERROR] Service did not become ready in time. See log: %LOG_FILE%
echo         Try: double-click stop.bat, then start.bat again.
pause
goto :END_FAIL

REM ============================================================
REM Exit points
REM ============================================================
:END_OK
endlocal & exit /b 0

:END_OK_BROWSER
endlocal & exit /b 0

:END_FAIL
endlocal & exit /b 1
