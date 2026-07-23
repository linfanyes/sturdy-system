# pre-start.ps1 - Prepare port before starting the dev server
param([int]$Port = 5201)

$connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($connections) {
    $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($pid in $pids) {
        if ($pid -eq 0) { continue }
        try {
            $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "[pre-start] Killing process $($proc.Name) (PID $pid) on port $Port"
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 1
            }
        } catch {
            Write-Host "[pre-start] Could not kill PID $pid, continuing..."
        }
    }
} else {
    Write-Host "[pre-start] Port $Port is free"
}
exit 0
