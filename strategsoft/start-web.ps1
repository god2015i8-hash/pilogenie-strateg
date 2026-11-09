# Запуск Strategsoft в браузере. Двойной щелчок или:
# powershell -ExecutionPolicy Bypass -File .\start-web.ps1

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

if (-not (Test-Path -LiteralPath "node_modules\expo\package.json")) {
  Write-Host "Ставлю зависимости. Это один раз и может занять несколько минут..."
  npm install --no-audit --no-fund --legacy-peer-deps
}

Write-Host "Открываю http://localhost:8081"
npx expo start --web --port 8081
