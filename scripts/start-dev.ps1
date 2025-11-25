# Start backend and frontend in separate PowerShell windows
# Usage: Open PowerShell as Administrator (if necessary) and run this script.

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Resolve-Path -Relative
$repoRoot = (Get-Item $repoRoot).FullName

$venvPython = Join-Path $repoRoot "campaign-sales-bot/.venv/Scripts/python.exe"
$backendCmd = "cd '$repoRoot'; & '$venvPython' -m uvicorn src.backend.app:app --reload --host 127.0.0.1 --port 8000"
$frontendCmd = "cd '$repoRoot/src/frontend'; npm run dev"

Write-Host "Starting backend in new window..."
Start-Process powershell -ArgumentList "-NoExit","-Command",$backendCmd

Start-Sleep -Milliseconds 600
Write-Host "Starting frontend in new window..."
Start-Process powershell -ArgumentList "-NoExit","-Command",$frontendCmd

Write-Host "Started both processes. Close the windows to stop them."