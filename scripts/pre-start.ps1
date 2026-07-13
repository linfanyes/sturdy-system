# pre-start.ps1 - Clean up port and old PID before starting the server
param(
    [Parameter(Mandatory = $true)]
    [int]$Port
)

$ErrorActionPreference = 'SilentlyContinue'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$RootDir = Split-Path -Parent $ScriptDir
$PidFile = Join-Path $RootDir 'app.pid'

# 1. Kill process by saved PID
if (Test-Path $PidFile) {
    $savedPid = Get-Content $PidFile -Raw
    if ($savedPid -match '^\d+$') {
        $proc = Get-Process -Id ([int]$savedPid) -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "[pre-start] Stopping old process (PID $savedPid)..."
            Stop-Process -Id ([int]$savedPid) -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 1
        }
    }
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
}

# 2. Kill process occupying the target port
$connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($connections) {
    $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($pid in $pids) {
        if ($pid -and $pid -ne 0) {
            Write-Host "[pre-start] Killing process on port ${Port} (PID $pid)..."
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    }
    Start-Sleep -Seconds 1
}

Write-Host "[pre-start] Port $Port is ready."
