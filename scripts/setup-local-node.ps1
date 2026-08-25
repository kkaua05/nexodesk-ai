# Downloads a pinned Node 22 LTS binary into .tools/, used only to run the API
# (see apps/api/scripts/run-server.mjs) - works around a Node 24 + native-addon
# (better-sqlite3, Puppeteer/whatsapp-web.js) crash on Windows. Does not touch any
# system-wide Node installation.
$ErrorActionPreference = "Stop"

$version = "22.19.0"
$root = Split-Path -Parent $PSScriptRoot
$toolsDir = Join-Path $root ".tools"
$targetDir = Join-Path $toolsDir "node-v$version-win-x64"

if (Test-Path (Join-Path $targetDir "node.exe")) {
  Write-Host "Node $version local ja presente em $targetDir"
  exit 0
}

New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
$zipPath = Join-Path $toolsDir "node.zip"
$url = "https://nodejs.org/dist/v$version/node-v$version-win-x64.zip"

Write-Host "Baixando Node $version de $url..."
Invoke-WebRequest -Uri $url -OutFile $zipPath

Write-Host "Extraindo..."
Expand-Archive -Path $zipPath -DestinationPath $toolsDir -Force
Remove-Item $zipPath

Write-Host "Pronto: $targetDir"
Write-Host ""
Write-Host "Recompilando better-sqlite3 para o ABI do Node $version..."
$betterSqlite3Dir = Get-ChildItem -Path (Join-Path $root "node_modules\.pnpm") -Directory -Filter "better-sqlite3@*" | Select-Object -First 1
if ($betterSqlite3Dir) {
  $pkgPath = Join-Path $betterSqlite3Dir.FullName "node_modules\better-sqlite3"
  Push-Location $pkgPath
  npx --yes node-gyp rebuild --target=$version --dist-url=https://nodejs.org/dist
  Pop-Location
} else {
  Write-Warning "better-sqlite3 nao encontrado em node_modules/.pnpm - rode 'pnpm install' primeiro."
}
