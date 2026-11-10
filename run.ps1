# ReadyTime - start the whole project with one command.
#
#   .\run.ps1
#
# If Windows says "running scripts is disabled", use:
#   powershell -ExecutionPolicy Bypass -File .\run.ps1
#
# What it does:
#   1. Checks Java, Node.js and PostgreSQL are installed and running
#   2. Creates backend\config.properties (if missing) and the database (if missing)
#   3. Starts the Spring Boot backend API  (new window, http://localhost:8080/api)
#   4. Installs the React frontend's packages (first time only) and starts it with Vite
#      (new window, http://localhost:5500)
#   5. Opens the browser
# To stop: close the two windows (or press Ctrl + C in each).

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"
$backendPort = 8080
$frontendPort = 5500

function Ok($text)   { Write-Host "  [OK]   $text" -ForegroundColor Green }
function Info($text) { Write-Host "  ...    $text" -ForegroundColor Cyan }
function Fail($text) {
    Write-Host "  [FAIL] $text" -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}

# True if something answers on host:port (tries for at most 1 second per address).
# "localhost" is checked on IPv4 (127.0.0.1) AND IPv6 (::1): the Vite dev server
# (Node.js 17+) often listens only on ::1.
function Test-Port($hostName, $port) {
    $addresses = if ($hostName -eq "localhost") { @("127.0.0.1", "::1") } else { @($hostName) }
    foreach ($address in $addresses) {
        $client = $null
        try {
            $ip = $null
            if ([System.Net.IPAddress]::TryParse($address, [ref]$ip)) {
                $client = New-Object System.Net.Sockets.TcpClient($ip.AddressFamily)
            } else {
                $client = New-Object System.Net.Sockets.TcpClient
            }
            if ($client.ConnectAsync($address, [int]$port).Wait(1000) -and $client.Connected) { return $true }
        } catch {
            # not reachable on this address - try the next one
        } finally {
            if ($client) { $client.Close() }
        }
    }
    return $false
}

Write-Host ""
Write-Host "=== ReadyTime ===" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Checking requirements"

# ---- Java (needs 24 or newer) ----
if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
    Fail "Java is not installed. Install JDK 24: https://www.oracle.com/java/technologies/downloads/"
}
$javaVersionLine = (cmd /c "java -version 2>&1") | Select-Object -First 1
if ($javaVersionLine -match '"(\d+)') {
    if ([int]$Matches[1] -lt 24) { Fail "Java 24 or newer is needed. Found: $javaVersionLine" }
}
Ok "Java: $javaVersionLine"

# ---- Node.js (runs the React frontend) ----
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Fail "Node.js is not installed. Install it from https://nodejs.org (needed for the React frontend)."
}
Ok "Node.js: $(node -v)"

# ---- Maven: not needed, the Maven Wrapper (mvnw.cmd) downloads it ----
if (-not (Test-Path (Join-Path $backend "mvnw.cmd"))) { Fail "backend\mvnw.cmd is missing." }
Ok "Maven Wrapper found (Maven is downloaded automatically)"

# ---- Config file ----
$configFile = Join-Path $backend "config.properties"
if (-not (Test-Path $configFile)) {
    Copy-Item (Join-Path $backend "config.example.properties") $configFile
    Info "Created backend\config.properties from the example. Edit db.password in it if your PostgreSQL needs one."
}
$config = @{}
foreach ($line in Get-Content $configFile) {
    if ($line -match '^\s*([^#=]+?)\s*=\s*(.*)$') { $config[$Matches[1]] = $Matches[2].Trim() }
}
if ($config["db.password"] -eq "CHANGE_ME") {
    Fail "Please put your PostgreSQL password in backend\config.properties (db.password=...), then run again."
}
Ok "Config: backend\config.properties"

# ---- PostgreSQL ----
if ($config["db.url"] -notmatch 'jdbc:postgresql://([^:/]+):?(\d*)/(\w+)') {
    Fail "db.url in config.properties should look like jdbc:postgresql://localhost:5432/readytime"
}
$dbHost = $Matches[1]
$dbPort = if ($Matches[2]) { $Matches[2] } else { "5432" }
$dbName = $Matches[3]

$psql = (Get-Command psql -ErrorAction SilentlyContinue).Source
if (-not $psql) {
    $psql = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\psql.exe", "D:\PostgreSQL\*\bin\psql.exe",
            "C:\PostgreSQL\*\bin\psql.exe" -ErrorAction SilentlyContinue |
            Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName
}
if (-not $psql) { Fail "PostgreSQL (psql.exe) was not found. Install PostgreSQL 17: https://www.postgresql.org/download/" }

if (-not (Test-Port $dbHost $dbPort)) {
    Fail "PostgreSQL is not running on ${dbHost}:${dbPort}. Start it: Windows key > Services > postgresql > Start."
}
Ok "PostgreSQL is running on ${dbHost}:${dbPort}"

$env:PGPASSWORD = $config["db.password"]
$dbUser = $config["db.user"]
$exists = & $psql -U $dbUser -h $dbHost -p $dbPort -w -d postgres -t -A -c "SELECT 1 FROM pg_database WHERE datname = '$dbName'"
if ($LASTEXITCODE -ne 0) { Fail "Could not log in to PostgreSQL as '$dbUser'. Check db.user / db.password in backend\config.properties." }
if ($exists -ne "1") {
    & $psql -U $dbUser -h $dbHost -p $dbPort -w -d postgres -c "CREATE DATABASE $dbName;" | Out-Null
    Ok "Database '$dbName' created (tables are created when the backend starts)"
} else {
    Ok "Database '$dbName' exists"
}
Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue

# ---- Ports free? ----
if (Test-Port "localhost" $backendPort)  { Fail "Port $backendPort is already in use. Is ReadyTime already running? Close it first." }
if (Test-Port "localhost" $frontendPort) { Fail "Port $frontendPort is already in use. Is ReadyTime already running? Close it first." }
Ok "Ports $backendPort and $frontendPort are free"

# ---- Start backend ----
Write-Host ""
Write-Host "2. Starting the Spring Boot backend API (new window)"
Start-Process powershell -WorkingDirectory $backend -ArgumentList "-NoExit", "-Command",
    "`$host.UI.RawUI.WindowTitle = 'ReadyTime BACKEND (close to stop)'; .\mvnw.cmd spring-boot:run"

Info "Waiting for the backend (the first start can take a few minutes while Maven downloads)..."
$ready = $false
for ($i = 0; $i -lt 300; $i++) {
    Start-Sleep -Seconds 1
    try {
        Invoke-WebRequest "http://localhost:$backendPort/api/me" -UseBasicParsing -TimeoutSec 2 | Out-Null
        $ready = $true
    } catch {
        # A 401 answer means the API is up (we are simply not logged in)
        if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 401) { $ready = $true }
    }
    if ($ready) { break }
}
if (-not $ready) { Fail "The backend did not start. Look at the BACKEND window for the error." }
Ok "Backend API: http://localhost:$backendPort/api"

# ---- Start frontend ----
Write-Host ""
Write-Host "3. Starting the React frontend (new window)"
if (-not (Test-Path (Join-Path $frontend "node_modules"))) {
    Info "Installing frontend packages (npm install, first time only)..."
    Push-Location $frontend
    npm install --no-fund --no-audit
    $installOk = ($LASTEXITCODE -eq 0)
    Pop-Location
    if (-not $installOk) { Fail "npm install failed in the frontend folder. Look at the messages above." }
}
Start-Process powershell -WorkingDirectory $frontend -ArgumentList "-NoExit", "-Command",
    "`$host.UI.RawUI.WindowTitle = 'ReadyTime FRONTEND (close to stop)'; npm run dev"

$ready = $false
for ($i = 0; $i -lt 120; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Port "localhost" $frontendPort) {
        $ready = $true
        break
    }
}
if (-not $ready) { Fail "The frontend did not start. Look at the FRONTEND window for the error." }
Ok "Frontend: http://localhost:$frontendPort"

# ---- Open browser ----
Start-Process "http://localhost:$frontendPort"
Write-Host ""
Write-Host "ReadyTime is running!" -ForegroundColor Green
Write-Host "  Demo logins:"
Write-Host "    System Admin    admin@readytime.com    / Admin@1234"
Write-Host "    Provider        provider@readytime.com / Provider@1234"
Write-Host "    Client          client@readytime.com   / Client@1234"
Write-Host "  To stop: close the BACKEND and FRONTEND windows."
Write-Host ""
