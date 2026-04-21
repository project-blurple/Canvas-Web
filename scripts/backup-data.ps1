param(
  [string]$OutDir = "backups",
  [string]$DatabaseUrl = $env:DATABASE_URL
)

$ErrorActionPreference = "Stop"

if (-not $DatabaseUrl) {
  Write-Error "DATABASE_URL is not set. Pass -DatabaseUrl or set env var."
  exit 1
}

if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
  Write-Error "pg_dump not found in PATH. Install PostgreSQL client tools and retry."
  exit 1
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$outFile = Join-Path $OutDir "db-data-$timestamp.sql"

pg_dump `
  --dbname="$DatabaseUrl" `
  --data-only `
  --format=plain `
  --encoding=UTF8 `
  --disable-triggers `
  --verbose `
  --file="$outFile"

Write-Host "Backup created: $outFile"
