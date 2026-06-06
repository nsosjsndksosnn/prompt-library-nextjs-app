$ErrorActionPreference = "Stop"

function Read-DotEnv {
  param([string] $Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    return
  }

  Get-Content -LiteralPath $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) {
      return
    }

    $parts = $line.Split("=", 2)
    if ($parts.Count -ne 2) {
      return
    }

    $name = $parts[0].Trim()
    $value = $parts[1].Trim().Trim('"').Trim("'")
    [Environment]::SetEnvironmentVariable($name, $value, "Process")
  }
}

function Require-Env {
  param([string] $Name)

  if (-not [Environment]::GetEnvironmentVariable($Name, "Process")) {
    throw "Missing $Name in .env.local"
  }
}

function Test-Command {
  param([string] $Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host ""
Write-Host "Prompt Library starter" -ForegroundColor Cyan
Write-Host "Workspace: $root"

$envPath = Join-Path $root ".env.local"
if (-not (Test-Path -LiteralPath $envPath)) {
  Copy-Item -LiteralPath (Join-Path $root ".env.example") -Destination $envPath
  Write-Host ""
  Write-Host "Created .env.local from .env.example." -ForegroundColor Yellow
  Write-Host "Fill in ORACLE_PASSWORD and DEEPSEEK_API_KEY, then run npm run app again."
  exit 1
}

Read-DotEnv $envPath
Require-Env "ORACLE_USER"
Require-Env "ORACLE_PASSWORD"
Require-Env "ORACLE_CONNECT_STRING"

if (-not (Test-Command "npm")) {
  throw "npm was not found. Install Node.js first."
}

if (-not (Test-Path -LiteralPath (Join-Path $root "node_modules"))) {
  Write-Host ""
  Write-Host "Installing dependencies..." -ForegroundColor Yellow
  npm install
}

if (Test-Command "sqlplus") {
  Write-Host ""
  Write-Host "Checking Oracle schema..." -ForegroundColor Cyan

  $connect = "$($env:ORACLE_USER)/$($env:ORACLE_PASSWORD)@$($env:ORACLE_CONNECT_STRING)"
  $checkSql = @"
SET HEADING OFF FEEDBACK OFF VERIFY OFF ECHO OFF
SELECT COUNT(*) FROM user_tables WHERE table_name = 'PROMPTS';
EXIT;
"@

  $tableCount = ($checkSql | sqlplus -L -S $connect | Out-String).Trim()
  if ($LASTEXITCODE -ne 0) {
    throw "Could not connect to Oracle with ORACLE_CONNECT_STRING=$($env:ORACLE_CONNECT_STRING)"
  }

  if ($tableCount -eq "0") {
    Write-Host "Schema not found. Running db/schema.sql..." -ForegroundColor Yellow
    sqlplus -L -S $connect "@db/schema.sql"
    if ($LASTEXITCODE -ne 0) {
      throw "Oracle schema initialization failed."
    }
  } else {
    Write-Host "Oracle schema is ready." -ForegroundColor Green
  }
} else {
  Write-Host ""
  Write-Host "sqlplus not found. Skipping schema check." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Starting app: http://localhost:3000" -ForegroundColor Green
npm run dev -- --port 3000
