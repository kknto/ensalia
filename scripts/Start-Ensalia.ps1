[CmdletBinding()]
param([switch]$NoBrowser)

. (Join-Path $PSScriptRoot 'Ensalia.Common.ps1')
$paths = Get-EnsaliaPaths
$mutex = $null
try {
    Initialize-EnsaliaDirectories $paths
    $mutex = Enter-EnsaliaMutex
    if ($null -eq $mutex) { Write-Host 'Ensalia ya esta abierto en esta sesion de Windows.' -ForegroundColor Yellow; exit 2 }
    if ($paths.CompatibilityMode -eq 'legacy-alias') {
        Write-Host 'Se detectaron datos de una instalacion anterior. Ensalia los usara en su ubicacion actual, sin moverlos.' -ForegroundColor Cyan
    }
    $node = Get-Command node.exe -ErrorAction SilentlyContinue
    $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($null -eq $node -or $null -eq $npm) { throw 'No se encontro el entorno de ejecucion incluido. Esta carpeta requiere Node.js 20 o posterior hasta que se genere el instalador final.' }
    if (-not (Test-Path -LiteralPath (Join-Path $paths.AppRoot 'node_modules'))) { throw 'Faltan los componentes de la aplicacion (node_modules). Ejecute npm install durante la preparacion del paquete.' }

    $port = Get-AvailableEnsaliaPort
    Write-EnsaliaRuntimeEnv -Paths $paths -Port $port
    $env:DATABASE_URL = Get-EnsaliaDatabaseUrl $paths.Database
    $env:RUST_LOG = 'info'
    $env:HOSTNAME = '127.0.0.1'
    $env:PORT = [string]$port
    $env:NODE_ENV = 'production'
    $env:ENSALIA_REQUIRE_ACCESS_CODE = 'false'

    if (Test-Path -LiteralPath $paths.Database) {
        $latestBackup = Get-ChildItem -LiteralPath $paths.BackupDir -Filter 'Ensalia-*.zip' -File |
            Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($null -eq $latestBackup -or $latestBackup.LastWriteTime -lt (Get-Date).AddHours(-24)) {
            $automaticBackup = New-EnsaliaBackupArchive -Paths $paths -Reason 'automatico-antes-de-iniciar'
            Write-Host "Respaldo automatico creado: $automaticBackup"
        }
    }

    Write-Host 'Preparando la base de datos local de Ensalia...'
    & $npm.Source exec -- prisma migrate deploy
    if ($LASTEXITCODE -ne 0) { throw 'No fue posible actualizar la base de datos local. Sus datos no fueron eliminados.' }
    & $npm.Source run db:seed
    if ($LASTEXITCODE -ne 0) { throw 'No fue posible preparar los catalogos locales. Sus datos no fueron eliminados.' }
    if (-not (Test-Path -LiteralPath (Join-Path $paths.AppRoot '.next\BUILD_ID'))) {
        Write-Host 'Preparando la aplicacion por primera vez. Esto puede tardar unos minutos...'
        & $npm.Source run build
        if ($LASTEXITCODE -ne 0) { throw 'No fue posible preparar la aplicacion.' }
    }

    $log = Join-Path $paths.LogDir ("ensalia-{0}.log" -f (Get-Date -Format 'yyyyMMdd'))
    $errorLog = Join-Path $paths.LogDir ("ensalia-{0}.error.log" -f (Get-Date -Format 'yyyyMMdd'))
    $url = "http://127.0.0.1:$port"
    Write-Host "Iniciando Ensalia en $url"
    $process = Start-Process -FilePath $npm.Source -ArgumentList @('run','start','--','-H','127.0.0.1','-p',[string]$port) -WorkingDirectory $paths.AppRoot -RedirectStandardOutput $log -RedirectStandardError $errorLog -PassThru -WindowStyle Hidden
    $ready = $false
    foreach ($attempt in 1..40) {
        if ($process.HasExited) { throw "Ensalia se cerro durante el inicio. Revise: $log" }
        try { $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2; if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) { $ready = $true; break } } catch { }
        Start-Sleep -Milliseconds 500
    }
    if (-not $ready) { Stop-Process -Id $process.Id -Force; throw "Ensalia no respondio a tiempo. Revise: $log" }
    if (-not $NoBrowser) { Start-Process $url }
    Write-Host 'Ensalia esta listo. Mantenga esta ventana abierta; puede minimizarla.' -ForegroundColor Green
    Write-Host "Datos: $($paths.DataDir)"
    Write-Host "Respaldos: $($paths.BackupDir)"
    Wait-Process -Id $process.Id
} catch { Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red; exit 1 }
finally { Exit-EnsaliaMutex $mutex }
