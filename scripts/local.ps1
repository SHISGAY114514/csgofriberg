param(
    [ValidateSet('setup', 'start', 'stop', 'test', 'backend-test', 'build', 'import')]
    [string]$Action = 'start',
    [string]$PlayersFile = ''
)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $repoRoot
$toolsDir = Join-Path $repoRoot '.local-tools'
$dataDir = Join-Path $repoRoot '.local-data'
$logsDir = Join-Path $repoRoot '.local-logs'
$nodeVersion = 'v26.10.0'
$nodeDir = Join-Path $toolsDir "node-$nodeVersion-win-x64"
$nodeExe = Join-Path $nodeDir 'node.exe'
$pnpmCli = Join-Path $toolsDir 'pnpm/node_modules/pnpm/bin/pnpm.cjs'
$redisDir = Join-Path $toolsDir 'redis/Redis-7.4.3-Windows-x64-cygwin'
$redisExe = Join-Path $redisDir 'redis-server.exe'
New-Item -ItemType Directory -Force $toolsDir, $dataDir, $logsDir | Out-Null

function Invoke-Pnpm {
    & $nodeExe $pnpmCli @args
    if ($LASTEXITCODE -ne 0) { throw "pnpm failed ($LASTEXITCODE)" }
}

function Start-LocalProcess([string]$Name, [string]$Exe, [string]$Arguments, [string]$Directory) {
    $pidFile = Join-Path $dataDir "$Name.pid"
    if (Test-Path -LiteralPath $pidFile) {
        $savedId = [int](Get-Content -LiteralPath $pidFile)
        $existing = Get-Process -Id $savedId -ErrorAction SilentlyContinue
        if ($existing -and $existing.Path -eq $Exe) { return }
    }
    $process = Start-Process -FilePath $Exe -ArgumentList $Arguments -WorkingDirectory $Directory -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput (Join-Path $logsDir "$Name.log") -RedirectStandardError (Join-Path $logsDir "$Name-error.log")
    $process.Id | Set-Content -LiteralPath $pidFile
}

function Start-LocalRedis {
    Start-LocalProcess 'redis' $redisExe '--bind 127.0.0.1 --port 16379 --save "" --appendonly no' $redisDir
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        $pong = & (Join-Path $redisDir 'redis-cli.exe') -p 16379 ping 2>$null
        if ($pong -eq 'PONG') { return }
        Start-Sleep -Milliseconds 200
    }
    throw 'Local Redis did not become ready; inspect .local-logs/redis-error.log.'
}

if ($Action -eq 'setup') {
    if (!(Test-Path -LiteralPath $nodeExe)) {
        $archive = Join-Path $toolsDir 'node.zip'
        Invoke-WebRequest "https://nodejs.org/dist/$nodeVersion/node-$nodeVersion-win-x64.zip" -OutFile $archive
        $checksums = (Invoke-WebRequest "https://nodejs.org/dist/$nodeVersion/SHASUMS256.txt").Content
        $expected = (($checksums -split "`n" | Where-Object { $_ -match " node-$nodeVersion-win-x64.zip$" }) -split '\s+')[0]
        if (!$expected -or (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $expected) { throw 'Node checksum mismatch.' }
        Expand-Archive -LiteralPath $archive -DestinationPath $toolsDir -Force
    }
    $env:PATH = "$nodeDir;$env:PATH"
    if (!(Test-Path -LiteralPath $pnpmCli)) {
        & (Join-Path $nodeDir 'npm.cmd') install --prefix (Join-Path $toolsDir 'pnpm') pnpm@11.13.1
        if ($LASTEXITCODE -ne 0) { throw 'Could not install the project-local pnpm.' }
    }
    if (!(Test-Path -LiteralPath $redisExe)) {
        $archive = Join-Path $toolsDir 'redis.zip'
        Invoke-WebRequest 'https://github.com/redis-windows/redis-windows/releases/download/7.4.3/Redis-7.4.3-Windows-x64-cygwin.zip' -OutFile $archive
        Expand-Archive -LiteralPath $archive -DestinationPath (Join-Path $toolsDir 'redis') -Force
    }
    Invoke-Pnpm install --frozen-lockfile
    & $nodeExe -e "const D=require('./server/node_modules/better-sqlite3'); const d=new D(':memory:'); console.log(d.prepare('select 1 as sqliteReady').get()); d.close();"
    if ($LASTEXITCODE -ne 0) { throw 'SQLite native binding is unavailable.' }
    Write-Output 'Local tools and dependencies are ready.'
    exit 0
}

if (!(Test-Path -LiteralPath $nodeExe) -or !(Test-Path -LiteralPath $pnpmCli) -or !(Test-Path -LiteralPath $redisExe)) {
    throw 'Run scripts/local.ps1 -Action setup first.'
}
$env:PATH = "$nodeDir;$(Join-Path $toolsDir 'pnpm/node_modules/.bin');$env:PATH"
$env:DB_CLIENT = 'sqlite'
$env:DB_URL = Join-Path $dataDir 'development.sqlite3'
$env:REDIS_URL = 'redis://127.0.0.1:16379'
$env:REDIS_PREFIX = 'csgofriberg-local:'
$env:REDIS_REQUIRED = 'true'
$env:PORT = '3000'
$env:NODE_ENV = 'development'
$secretFile = Join-Path $dataDir 'jwt-secret.txt'
if (!(Test-Path -LiteralPath $secretFile)) {
    & $nodeExe -e "console.log(require('crypto').randomBytes(32).toString('hex'))" | Set-Content -LiteralPath $secretFile
}
$env:JWT_SECRET = (Get-Content -LiteralPath $secretFile -Raw).Trim()

switch ($Action) {
    'start' {
        Start-LocalRedis
        Invoke-Pnpm migrate
        Start-LocalProcess 'server' $nodeExe '--import tsx src/index.ts' (Join-Path $repoRoot 'server')
        Start-LocalProcess 'client' $nodeExe 'node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort' (Join-Path $repoRoot 'client')
        for ($attempt = 0; $attempt -lt 40; $attempt++) {
            try {
                $health = Invoke-RestMethod 'http://localhost:3000/api/health'
                $page = Invoke-WebRequest 'http://localhost:5173' -UseBasicParsing
                if ($health.ok -and $health.redis -eq 'up' -and $page.StatusCode -eq 200) {
                    Write-Output 'Ready: http://localhost:5173 | API: http://localhost:3000/api/health'
                    exit 0
                }
            } catch { Start-Sleep -Milliseconds 250 }
        }
        throw 'Local services did not become ready; inspect .local-logs.'
    }
    'stop' {
        foreach ($name in @('client', 'server', 'redis')) {
            $pidFile = Join-Path $dataDir "$name.pid"
            if (Test-Path -LiteralPath $pidFile) {
                $savedId = [int](Get-Content -LiteralPath $pidFile)
                $process = Get-Process -Id $savedId -ErrorAction SilentlyContinue
                $expectedExe = if ($name -eq 'redis') { $redisExe } else { $nodeExe }
                if ($process -and $process.Path -eq $expectedExe) {
                    if ($name -eq 'redis') { & (Join-Path $redisDir 'redis-cli.exe') -p 16379 shutdown nosave }
                    else { Stop-Process -Id $savedId }
                }
                Remove-Item -LiteralPath $pidFile
            }
        }
        Write-Output 'Local services stopped.'
    }
    { $_ -in 'test', 'backend-test' } {
        Start-LocalRedis
        $testId = [Guid]::NewGuid().ToString('N')
        $env:NODE_ENV = 'test'
        # The legacy room-store unit tests explicitly exercise memory fallback.
        # Integration tests still connect to the real Redis instance above.
        $env:REDIS_REQUIRED = 'false'
        $env:DB_URL = Join-Path $dataDir "test-$testId.sqlite3"
        $env:REDIS_PREFIX = "csgofriberg-test-${testId}:"
        if ($Action -eq 'test') { Invoke-Pnpm test }
        else { Invoke-Pnpm --filter server test }
    }
    'build' { Invoke-Pnpm build }
    'import' {
        if (!$PlayersFile) { throw 'Specify -PlayersFile with a local players.json path.' }
        $inputFile = (Resolve-Path -LiteralPath $PlayersFile).Path
        Start-LocalRedis
        & $nodeExe server/node_modules/tsx/dist/cli.mjs scripts/import-local-players.ts $inputFile
        if ($LASTEXITCODE -ne 0) { throw 'Player import failed.' }
    }
}
