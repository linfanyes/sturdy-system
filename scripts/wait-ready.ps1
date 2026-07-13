# wait-ready.ps1 - Wait for the dev/preview server to become ready
param(
    [Parameter(Mandatory = $true)]
    [int]$Port,

    [Parameter(Mandatory = $true)]
    [string]$LogFile,

    [Parameter(Mandatory = $true)]
    [string]$PidFile
)

$ErrorActionPreference = 'SilentlyContinue'
$timeout = 120        # max wait seconds
$interval = 1         # poll interval seconds
$elapsed = 0

Write-Host "[wait-ready] Waiting for http://localhost:${Port}/ ..."

while ($elapsed -lt $timeout) {
    # Check if any process is listening on the port
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        # Port is listening - try an HTTP request
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:${Port}/" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                # Server is ready - find and save PID
                $pids = $conn | Select-Object -ExpandProperty OwningProcess -Unique | Where-Object { $_ -and $_ -ne 0 }
                $serverPid = if ($pids) { $pids[0] } else { 0 }
                Set-Content -Path $PidFile -Value $serverPid -NoNewline
                Write-Host "[wait-ready] Server ready (PID $serverPid), responded with $($response.StatusCode)."
                exit 0
            }
        } catch {
            # HTTP request failed but port is listening - server still starting
        }
    }

    # Check log file for fatal errors
    if (Test-Path $LogFile) {
        $logContent = Get-Content $LogFile -Tail 20 -Raw -ErrorAction SilentlyContinue
        if ($logContent -match 'EADDRINUSE|Cannot find module|Error:|FATAL') {
            Write-Host "[wait-ready] Fatal error detected in log:"
            Write-Host $logContent
            exit 1
        }
    }

    Start-Sleep -Seconds $interval
    $elapsed += $interval

    # Print progress every 10 seconds
    if ($elapsed % 10 -eq 0) {
        Write-Host "[wait-ready] Still waiting... (${elapsed}s / ${timeout}s)"
    }
}

Write-Host "[wait-ready] Timeout after ${timeout}s. Server did not become ready."
if (Test-Path $LogFile) {
    Write-Host "[wait-ready] Last lines of log:"
    Get-Content $LogFile -Tail 10
}
exit 1
