# wait-ready.ps1 - Wait for the dev server to become ready
param([int]$Port = 5201, [string]$LogFile = "", [string]$PidFile = "")

$maxWait = 30; $elapsed = 0
while ($elapsed -lt $maxWait) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $result = $tcp.BeginConnect("127.0.0.1", $Port, $null, $null)
        $success = $result.AsyncWaitHandle.WaitOne(1000, $false)
        if ($success) { $tcp.EndConnect($result); $tcp.Close()
            Write-Host "[wait-ready] Server ready on port $Port (${elapsed}s)"
            if ($PidFile) { $c = Get-NetTCPConnection -LocalPort $Port -State Listen -EA SilentlyContinue; if($c){$c.OwningProcess|Set-Content $PidFile} }
            exit 0
        }
        $tcp.Close()
    } catch {}
    if ($LogFile -and (Test-Path $LogFile)) {
        $tail = Get-Content $LogFile -Tail 5 -EA SilentlyContinue
        if ($tail -match "ERROR|Cannot find module") { Write-Host "[wait-ready] Error in log"; exit 1 }
    }
    Start-Sleep -Seconds 1; $elapsed++
    Write-Host "[wait-ready] Waiting for port $Port... (${elapsed}s)"
}
Write-Host "[wait-ready] Timeout after ${maxWait}s"; exit 1
