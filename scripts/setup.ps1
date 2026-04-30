<#
.SYNOPSIS
    First-time setup script for Steering Studio.

.DESCRIPTION
    Installs dependencies, generates the Prisma client, initializes the
    SQLite database, and builds the application for production use.

.EXAMPLE
    .\scripts\setup.ps1
    .\scripts\setup.ps1 -SkipBuild   # install + DB only, no production build
#>

param(
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== Steering Studio Setup ===" -ForegroundColor Cyan
Write-Host ""

# ── Check Node.js ──────────────────────────────────────────────────────
$nodeVersion = $null
try {
    $nodeVersion = (node --version 2>$null)
} catch {}

if (-not $nodeVersion) {
    Write-Host "ERROR: Node.js is not installed or not on PATH." -ForegroundColor Red
    Write-Host "Download it from https://nodejs.org/ (v18.18 or later)."
    exit 1
}

Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green

# ── Create .env if missing ─────────────────────────────────────────────
if (-not (Test-Path ".env")) {
    Write-Host "Creating .env with default DATABASE_URL..." -ForegroundColor Yellow
    Set-Content -Path ".env" -Value 'DATABASE_URL="file:./dev.db"'
} else {
    Write-Host ".env already exists, skipping." -ForegroundColor Gray
}

# ── Install dependencies ───────────────────────────────────────────────
Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "npm install failed." -ForegroundColor Red; exit 1 }

# ── Generate Prisma client ─────────────────────────────────────────────
Write-Host ""
Write-Host "Generating Prisma client..." -ForegroundColor Cyan
npx prisma generate
if ($LASTEXITCODE -ne 0) { Write-Host "prisma generate failed." -ForegroundColor Red; exit 1 }

# ── Push database schema ──────────────────────────────────────────────
Write-Host ""
Write-Host "Initializing database..." -ForegroundColor Cyan
npx prisma db push
if ($LASTEXITCODE -ne 0) { Write-Host "prisma db push failed." -ForegroundColor Red; exit 1 }

# ── Build ──────────────────────────────────────────────────────────────
if (-not $SkipBuild) {
    Write-Host ""
    Write-Host "Building for production..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) { Write-Host "Build failed." -ForegroundColor Red; exit 1 }
}

# ── Done ───────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=== Setup complete! ===" -ForegroundColor Green
Write-Host ""
if (-not $SkipBuild) {
    Write-Host "Start the application with:"
    Write-Host "  npm run start" -ForegroundColor White
} else {
    Write-Host "Start in development mode with:"
    Write-Host "  npm run dev" -ForegroundColor White
}
Write-Host ""
Write-Host "Then open http://localhost:3000 in your browser."
Write-Host "Go to Settings > Provider to configure your AI connection."
Write-Host ""
