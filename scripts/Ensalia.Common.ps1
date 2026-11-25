Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Get-EnsaliaPaths {
    $appRoot = Split-Path -Parent $PSScriptRoot
    $documents = [Environment]::GetFolderPath('MyDocuments')
    if ([string]::IsNullOrWhiteSpace($documents)) {
        $documents = if ($env:USERPROFILE) { Join-Path $env:USERPROFILE 'Documents' } else { Join-Path $ensaliaStateRoot 'backups' }
    }
    $ensaliaStateRoot = Join-Path $env:LOCALAPPDATA 'Ensalia'
    $legacyStateRoot = Join-Path $env:LOCALAPPDATA 'LABSICO'
    $ensaliaDatabase = Join-Path $ensaliaStateRoot 'data\ensalia.db'
    $legacyDatabase = Join-Path $legacyStateRoot 'data\labsico.db'
    $assetsDir = if ($env:ENSALIA_ASSETS_DIR) { [IO.Path]::GetFullPath($env:ENSALIA_ASSETS_DIR) } else { Join-Path $ensaliaStateRoot 'assets' }
    $documentsDir = if ($env:ENSALIA_DOCUMENTS_DIR) { [IO.Path]::GetFullPath($env:ENSALIA_DOCUMENTS_DIR) } else { Join-Path $ensaliaStateRoot 'documents' }
    $backupDir = if ($env:ENSALIA_BACKUP_DIR) { [IO.Path]::GetFullPath($env:ENSALIA_BACKUP_DIR) } else { Join-Path $documents 'Ensalia Respaldos' }

    # Compatibilidad no destructiva: una instalacion existente sigue usando su
    # base en LABSICO. La migracion fisica se hara en una entrega posterior,
    # mediante respaldo, verificacion y confirmacion explicita.
    if ((Test-Path -LiteralPath $legacyDatabase) -and -not (Test-Path -LiteralPath $ensaliaDatabase)) {
        $stateRoot = $legacyStateRoot
        $database = $legacyDatabase
        $compatibilityMode = 'legacy-alias'
    } else {
        $stateRoot = $ensaliaStateRoot
        $database = $ensaliaDatabase
        $compatibilityMode = 'native'
    }

    [pscustomobject]@{
        AppRoot = $appRoot
        StateRoot = $stateRoot
        DataDir = Split-Path -Parent $database
        Database = $database
        LogDir = Join-Path $stateRoot 'logs'
        AssetsDir = $assetsDir
        DocumentsDir = $documentsDir
        BackupDir = $backupDir
        RuntimeEnv = Join-Path $stateRoot 'runtime.env'
        CompatibilityMode = $compatibilityMode
        LegacyDatabase = $legacyDatabase
        NativeDatabase = $ensaliaDatabase
    }
}

function Initialize-EnsaliaDirectories {
    param([Parameter(Mandatory)]$Paths)
    @($Paths.StateRoot, $Paths.DataDir, $Paths.LogDir, $Paths.AssetsDir, $Paths.DocumentsDir, $Paths.BackupDir) | ForEach-Object {
        if (-not (Test-Path -LiteralPath $_)) { New-Item -ItemType Directory -Path $_ -Force | Out-Null }
    }
}

function Get-EnsaliaDatabaseUrl {
    param([Parameter(Mandatory)][string]$DatabasePath)
    $normalized = $DatabasePath -replace '\\', '/'
    if ($normalized.StartsWith('file:')) {
        if ($normalized -match '\?') { return $normalized }
        return $normalized + '?connection_limit=1&busy_timeout=5000'
    }
    'file:' + $normalized + '?connection_limit=1&busy_timeout=5000'
}

function Enter-EnsaliaMutex {
    param([int]$TimeoutMilliseconds = 0)
    $created = $false
    # Se conserva el nombre anterior para impedir que un lanzador heredado y
    # Ensalia abran simultaneamente la misma base.
    $mutex = [Threading.Mutex]::new($false, 'Local\LABSICO.LocalApplication', [ref]$created)
    try { $acquired = $mutex.WaitOne($TimeoutMilliseconds) }
    catch [Threading.AbandonedMutexException] { $acquired = $true }
    if (-not $acquired) { $mutex.Dispose(); return $null }
    $mutex
}

function Exit-EnsaliaMutex {
    param($Mutex)
    if ($null -ne $Mutex) {
        try { $Mutex.ReleaseMutex() } finally { $Mutex.Dispose() }
    }
}

function Get-AvailableEnsaliaPort {
    param([int]$First = 3210, [int]$Last = 3299)
    foreach ($port in $First..$Last) {
        $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $port)
        try { $listener.Start(); return $port } catch { } finally { $listener.Stop() }
    }
    throw "No hay un puerto local disponible entre $First y $Last."
}

function Write-EnsaliaRuntimeEnv {
    param([Parameter(Mandatory)]$Paths, [Parameter(Mandatory)][int]$Port)
    @(
        "DATABASE_URL=`"$(Get-EnsaliaDatabaseUrl $Paths.Database)`""
        "HOSTNAME=`"127.0.0.1`""
        "PORT=`"$Port`""
    ) -join [Environment]::NewLine | Set-Content -LiteralPath $Paths.RuntimeEnv -Encoding UTF8
}

function New-EnsaliaBackupArchive {
    param([Parameter(Mandatory)]$Paths, [string]$Reason = 'manual')
    if (-not (Test-Path -LiteralPath $Paths.Database)) { throw 'Todavia no existe una base de datos para respaldar.' }
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $stage = Join-Path ([IO.Path]::GetTempPath()) "Ensalia-backup-$([guid]::NewGuid().ToString('N'))"
    $archive = Join-Path $Paths.BackupDir "Ensalia-$stamp.zip"
    New-Item -ItemType Directory -Path $stage | Out-Null
    try {
        $databaseFile = 'ensalia.db'
        $stagedDatabase = Join-Path $stage $databaseFile
        Copy-Item -LiteralPath $Paths.Database -Destination $stagedDatabase
        $files = @([ordered]@{ path = $databaseFile; sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $stagedDatabase).Hash })
        if (($Paths.PSObject.Properties.Name -contains 'AssetsDir') -and (Test-Path -LiteralPath $Paths.AssetsDir)) {
            $stagedAssets = Join-Path $stage 'assets'
            New-Item -ItemType Directory -Path $stagedAssets | Out-Null
            Get-ChildItem -LiteralPath $Paths.AssetsDir -File -Recurse | ForEach-Object {
                $assetRoot = [IO.Path]::GetFullPath($Paths.AssetsDir).TrimEnd('\\')
                $relative = $_.FullName.Substring($assetRoot.Length).TrimStart('\\')
                $target = Join-Path $stagedAssets $relative
                $targetParent = Split-Path -Parent $target
                if (-not (Test-Path -LiteralPath $targetParent)) { New-Item -ItemType Directory -Path $targetParent -Force | Out-Null }
                Copy-Item -LiteralPath $_.FullName -Destination $target
                $files += [ordered]@{ path = ('assets/' + ($relative -replace '\\', '/')); sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $target).Hash }
            }
        }
        if (($Paths.PSObject.Properties.Name -contains 'DocumentsDir') -and (Test-Path -LiteralPath $Paths.DocumentsDir)) {
            $stagedDocuments = Join-Path $stage 'documents'
            New-Item -ItemType Directory -Path $stagedDocuments | Out-Null
            Get-ChildItem -LiteralPath $Paths.DocumentsDir -File -Recurse | ForEach-Object {
                $documentRoot = [IO.Path]::GetFullPath($Paths.DocumentsDir).TrimEnd('\')
                $relative = $_.FullName.Substring($documentRoot.Length).TrimStart('\')
                $normalizedRel = $relative -replace '\\', '/'
                $isValidDoc = $normalizedRel -match '^(field-sheets/[A-Za-z0-9_-]+/(?:scans/)?[A-Za-z0-9_.-]+\.(pdf|png|jpg|webp)|field-photos/[A-Za-z0-9_-]+/[A-Za-z0-9_.-]+\.(pdf|png|jpg|webp)|scans/[A-Za-z0-9_.-]+\.(pdf|png|jpg|webp)|compression_photos/[A-Za-z0-9_-]+/[A-Za-z0-9_.-]+\.(pdf|png|jpg|webp)|calibrations/[A-Za-z0-9_-]+/[A-Za-z0-9_.-]+\.(pdf|png|jpg|webp)|maintenance/[A-Za-z0-9_-]+/[A-Za-z0-9_.-]+\.(pdf|png|jpg|webp))$'
                if (-not $isValidDoc) { throw 'La carpeta documental contiene una ruta no administrada.' }
                $target = Join-Path $stagedDocuments $relative
                $targetParent = Split-Path -Parent $target
                if (-not (Test-Path -LiteralPath $targetParent)) { New-Item -ItemType Directory -Path $targetParent -Force | Out-Null }
                Copy-Item -LiteralPath $_.FullName -Destination $target
                $files += [ordered]@{ path = ('documents/' + ($relative -replace '\\', '/')); sha256 = (Get-FileHash -Algorithm SHA256 -LiteralPath $target).Hash }
            }
        }
        [ordered]@{
            formatVersion = 3
            product = 'ENSALIA'
            createdAt = (Get-Date).ToString('o')
            reason = $Reason
            databaseFile = $databaseFile
            sha256 = $files[0].sha256
            files = $files
            sourceLayout = $Paths.CompatibilityMode
        } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $stage 'manifest.json') -Encoding UTF8
        Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $archive -CompressionLevel Optimal
        $archive
    } finally {
        if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
    }
}
