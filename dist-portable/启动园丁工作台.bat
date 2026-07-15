@echo off
chcp 65001 >nul
echo ==============================================
echo           园丁工作台 - 便携启动器
echo ==============================================
echo.

set "DIR=%~dp0"
set "INDEX=%DIR%index.html"

if exist "%INDEX%" (
    echo 正在启动园丁工作台...
    echo.
    echo 说明：
    echo - 本程序使用系统默认浏览器打开本地网页
    echo - 所有数据保存在浏览器本地存储中
    echo - AI对话功能需要联网并配置API Key
    echo - 关闭浏览器后再次打开可继续使用
    echo.
    start "" "%INDEX%"
    timeout /t 2 /nobreak >nul
) else (
    echo 错误：未找到 index.html
    echo 请确保本脚本与 index.html 在同一目录下
    pause
    exit /b 1
)