Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-LabsicoPaths {
    $appRoot = Split-Path -Parent $PSScriptRoot
    $stateRoot = Join-Path $env:LOCALAPPDATA 'LABSICO'
    $documents = [Environment]::GetFolderPath('MyDocuments')
    if ([string]::IsNullOrWhiteSpace($documents)) {
        $documents = if ($env:USERPROFILE) { Join-Path $env:USERPROFILE 'Documents' } else { Join-Path $stateRoot 'backups' }
    }
    [pscustomobject]@{
        AppRoot = $appRoot
        StateRoot = $stateRoot
        DataDir = Join-Path $stateRoot 'data'
        Database = Join-Path $stateRoot 'data\labsico.db'
        LogDir = Join-Path $stateRoot 'logs'
        BackupDir = Join-Path $documents 'LABSICO Respaldos'
        RuntimeEnv = Join-Path $stateRoot 'runtime.env'
    }
}

function Initialize-LabsicoDirectories {
    param([Parameter(Mandatory)]$Paths)
    @($Paths.StateRoot, $Paths.DataDir, $Paths.LogDir, $Paths.BackupDir) | ForEach-Object {
        if (-not (Test-Path -LiteralPath $_)) { New-Item -ItemType Directory -Path $_ -Force | Out-Null }
    }
}

function Get-LabsicoDatabaseUrl {
    param([Parameter(Mandatory)][string]$DatabasePath)
    'file:' + ($DatabasePath -replace '\\', '/')
}

function Enter-LabsicoMutex {
    param([int]$TimeoutMilliseconds = 0)
    $created = $false
    $mutex = [Threading.Mutex]::new($false, 'Local\LABSICO.LocalApplication', [ref]$created)
    try { $acquired = $mutex.WaitOne($TimeoutMilliseconds) }
    catch [Threading.AbandonedMutexException] { $acquired = $true }
    if (-not $acquired) { $mutex.Dispose(); return $null }
    $mutex
}

function Exit-LabsicoMutex {
    param($Mutex)
    if ($null -ne $Mutex) {
        try { $Mutex.ReleaseMutex() } finally { $Mutex.Dispose() }
    }
}

function Get-AvailableLabsicoPort {
    param([int]$First = 3210, [int]$Last = 3299)
    foreach ($port in $First..$Last) {
        $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $port)
        try { $listener.Start(); return $port } catch { } finally { $listener.Stop() }
    }
    throw "No hay un puerto local disponible entre $First y $Last."
}

function Write-LabsicoRuntimeEnv {
    param([Parameter(Mandatory)]$Paths, [Parameter(Mandatory)][int]$Port)
    @(
        "DATABASE_URL=`"$(Get-LabsicoDatabaseUrl $Paths.Database)`""
        "HOSTNAME=`"127.0.0.1`""
        "PORT=`"$Port`""
    ) -join [Environment]::NewLine | Set-Content -LiteralPath $Paths.RuntimeEnv -Encoding UTF8
}

function New-LabsicoBackupArchive {
    param([Parameter(Mandatory)]$Paths, [string]$Reason = 'manual')
    if (-not (Test-Path -LiteralPath $Paths.Database)) { throw 'Todavia no existe una base de datos para respaldar.' }
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $stage = Join-Path ([IO.Path]::GetTempPath()) "LABSICO-backup-$([guid]::NewGuid().ToString('N'))"
    $archive = Join-Path $Paths.BackupDir "LABSICO-$stamp.zip"
    New-Item -ItemType Directory -Path $stage | Out-Null
    try {
        Copy-Item -LiteralPath $Paths.Database -Destination (Join-Path $stage 'labsico.db')
        $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $stage 'labsico.db')).Hash
        [ordered]@{ formatVersion=1; product='LABSICO'; createdAt=(Get-Date).ToString('o'); reason=$Reason; databaseFile='labsico.db'; sha256=$hash } |
            ConvertTo-Json | Set-Content -LiteralPath (Join-Path $stage 'manifest.json') -Encoding UTF8
        Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $archive -CompressionLevel Optimal
        $archive
    } finally {
        if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
    }
}
