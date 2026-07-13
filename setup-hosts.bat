@echo off
REM ============================================================
REM 园丁工作台 · 本地域名配置脚本 (Windows)
REM 路径: workSystem\setup-hosts.bat
REM 用法 (需要管理员权限):
REM   setup-hosts.bat            REM 添加 127.0.0.1 teacherWorkStation
REM   setup-hosts.bat remove     REM 移除 teacherWorkStation 记录
REM ============================================================

setlocal enabledelayedexpansion

set "ENTRY=127.0.0.1 teacherWorkStation"
set "HOSTS=%SystemRoot%\System32\drivers\etc\hosts"

for /F "tokens=*" %%i in ('echo prompt $E ^| cmd') do set "ESC=%%i"
set "GREEN=%ESC%[0;32m"
set "YELLOW=%ESC%[1;33m"
set "RED=%ESC%[0;31m"
set "NC=%ESC%[0m"

echo %GREEN%[setup-hosts]%NC% hosts 文件: %HOSTS%

REM 检查管理员权限
net session >nul 2>&1
if errorlevel 1 (
    echo %RED%[setup-hosts]%NC% 错误: 需要管理员权限, 请右键 -^> 以管理员身份运行
    pause
    exit /b 1
)

REM 检查 hosts 文件是否存在
if not exist "%HOSTS%" (
    echo %RED%[setup-hosts]%NC% 错误: hosts 文件不存在: %HOSTS%
    exit /b 1
)

set "ACTION=%~1"
if "%ACTION%"=="" set "ACTION=add"
if /I "%ACTION%"=="add" goto :do_add
if /I "%ACTION%"=="remove" goto :do_remove
echo %YELLOW%[setup-hosts]%NC% 未知操作: %ACTION%, 默认为 add
goto :do_add

:do_add
findstr /B /I /C:"127.0.0.1 teacherWorkStation" "%HOSTS%" >nul 2>&1
if not errorlevel 1 (
    echo %YELLOW%[setup-hosts]%NC% 已存在 teacherWorkStation 记录, 跳过
    echo %GREEN%[setup-hosts]%NC% 当前条目:
    findstr /N "teacherWorkStation" "%HOSTS%"
    echo %GREEN%[setup-hosts]%NC% 完成
    exit /b 0
)

REM 备份
copy /Y "%HOSTS%" "%HOSTS%.bak" >nul 2>&1

REM 追加
echo. >> "%HOSTS%"
echo # teacherWorkStation - 园丁工作台 本地域名 >> "%HOSTS%"
echo %ENTRY% >> "%HOSTS%"

echo %GREEN%[setup-hosts]%NC% 已添加: %ENTRY%
echo %GREEN%[setup-hosts]%NC% 完成, 现在可访问 http://teacherWorkStation:5201
echo %YELLOW%[setup-hosts]%NC% 如需恢复原 hosts, 删除最后两行即可, 或使用 setup-hosts.bat remove
exit /b 0

:do_remove
findstr /B /I /C:"127.0.0.1 teacherWorkStation" "%HOSTS%" >nul 2>&1
if errorlevel 1 (
    echo %YELLOW%[setup-hosts]%NC% 未找到 teacherWorkStation 记录, 无需移除
    exit /b 0
)

REM 备份
copy /Y "%HOSTS%" "%HOSTS%.bak" >nul 2>&1

REM 移除: 用 PowerShell 过滤掉包含 teacherWorkStation 的行
powershell -NoProfile -Command "(Get-Content '%HOSTS%') | Where-Object { $_ -notmatch 'teacherWorkStation' -and $_ -notmatch '# teacherWorkStation - 园丁工作台' } | Set-Content '%HOSTS%'"

echo %GREEN%[setup-hosts]%NC% 已移除 teacherWorkStation 记录
echo %GREEN%[setup-hosts]%NC% 备份保存在 %HOSTS%.bak
exit /b 0
