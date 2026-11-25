[CmdletBinding(SupportsShouldProcess, ConfirmImpact='High')]
param([Parameter(Mandatory)][string]$BackupPath)
. (Join-Path $PSScriptRoot 'Ensalia.Common.ps1')
$paths = Get-EnsaliaPaths
$mutex = $null
$stage = $null
$requestedWhatIf = [bool]$WhatIfPreference
try {
    # WhatIf debe simular solamente la sustitucion final. La expansion y los
    # hashes son operaciones temporales necesarias para validar el respaldo.
    $WhatIfPreference = $false
    Initialize-EnsaliaDirectories $paths
    $resolvedBackup = (Resolve-Path -LiteralPath $BackupPath).Path
    $mutex = Enter-EnsaliaMutex
    if ($null -eq $mutex) { throw 'Cierre Ensalia antes de restaurar un respaldo.' }
    $stage = Join-Path ([IO.Path]::GetTempPath()) "Ensalia-restore-$([guid]::NewGuid().ToString('N'))"
    New-Item -ItemType Directory -Path $stage -WhatIf:$false | Out-Null
    Expand-Archive -LiteralPath $resolvedBackup -DestinationPath $stage -WhatIf:$false
    $manifestPath = Join-Path $stage 'manifest.json'
    if (-not (Test-Path -LiteralPath $manifestPath)) { throw 'El archivo no contiene un manifiesto de respaldo compatible.' }
    $manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
    $validProduct = $manifest.product -in @('ENSALIA', 'LABSICO')
    $validDatabaseFile = $manifest.databaseFile -in @('ensalia.db', 'labsico.db')
    if (-not $validProduct -or $manifest.formatVersion -notin @(1, 2, 3) -or -not $validDatabaseFile) { throw 'El formato del respaldo no es compatible.' }
    $sourceDb = Join-Path $stage $manifest.databaseFile
    if (-not (Test-Path -LiteralPath $sourceDb)) { throw 'El respaldo no contiene la base de datos.' }
    if ((Get-FileHash -Algorithm SHA256 -LiteralPath $sourceDb).Hash -ne $manifest.sha256) { throw 'El respaldo esta danado: la verificacion SHA-256 no coincide.' }
    if ($manifest.formatVersion -in @(2, 3)) {
        if ($null -eq $manifest.files -or @($manifest.files).Count -lt 1) { throw 'El manifiesto no contiene la lista de archivos.' }
        foreach ($entry in @($manifest.files)) {
            $relative = [string]$entry.path
            $isDatabase = $relative -eq $manifest.databaseFile
            $isManagedAsset = $relative -match '^assets/profiles/[A-Za-z0-9_-]+/[a-f0-9-]+\.(png|jpg|webp)$'
            $isManagedDocument = $manifest.formatVersion -eq 3 -and $relative -match '^documents/field-sheets/[A-Za-z0-9_-]+/(?:scans/)?[A-Za-z0-9_.-]+\.(?:pdf|png|jpg|webp)$'
            if (-not $isDatabase -and -not $isManagedAsset -and -not $isManagedDocument) { throw 'El respaldo contiene una ruta de recurso no permitida.' }
            $candidate = Join-Path $stage ($relative -replace '/', '\')
            $candidateFull = [IO.Path]::GetFullPath($candidate)
            $stagePrefix = [IO.Path]::GetFullPath($stage).TrimEnd('\') + '\'
            if (-not $candidateFull.StartsWith($stagePrefix, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $candidateFull)) { throw 'El respaldo contiene una ruta de recurso invalida.' }
            if ((Get-FileHash -Algorithm SHA256 -LiteralPath $candidateFull).Hash -ne [string]$entry.sha256) { throw 'El respaldo esta danado: un recurso no coincide con el manifiesto.' }
        }
    }
    $WhatIfPreference = $requestedWhatIf
    if ($PSCmdlet.ShouldProcess($paths.Database, "Restaurar desde $resolvedBackup")) {
        if (Test-Path -LiteralPath $paths.Database) { $safety = New-EnsaliaBackupArchive -Paths $paths -Reason 'antes-de-restaurar'; Write-Host "Copia de seguridad previa: $safety" }
        $incoming = "$($paths.Database).incoming"
        Copy-Item -LiteralPath $sourceDb -Destination $incoming -Force
        Move-Item -LiteralPath $incoming -Destination $paths.Database -Force
        if ($manifest.formatVersion -in @(2, 3)) {
            $incomingAssets = Join-Path $stage 'assets'
            $previousAssets = "$($paths.AssetsDir).previous-$([guid]::NewGuid().ToString('N'))"
            try {
                if (Test-Path -LiteralPath $paths.AssetsDir) { Move-Item -LiteralPath $paths.AssetsDir -Destination $previousAssets }
                if (Test-Path -LiteralPath $incomingAssets) { Copy-Item -LiteralPath $incomingAssets -Destination $paths.AssetsDir -Recurse }
                else { New-Item -ItemType Directory -Path $paths.AssetsDir | Out-Null }
                if (Test-Path -LiteralPath $previousAssets) { Remove-Item -LiteralPath $previousAssets -Recurse -Force }
            } catch {
                if (Test-Path -LiteralPath $paths.AssetsDir) { Remove-Item -LiteralPath $paths.AssetsDir -Recurse -Force }
                if (Test-Path -LiteralPath $previousAssets) { Move-Item -LiteralPath $previousAssets -Destination $paths.AssetsDir }
                throw
            }
        }
        if ($manifest.formatVersion -eq 3) {
            $incomingDocuments = Join-Path $stage 'documents'
            $previousDocuments = "$($paths.DocumentsDir).previous-$([guid]::NewGuid().ToString('N'))"
            try {
                if (Test-Path -LiteralPath $paths.DocumentsDir) { Move-Item -LiteralPath $paths.DocumentsDir -Destination $previousDocuments }
                if (Test-Path -LiteralPath $incomingDocuments) { Copy-Item -LiteralPath $incomingDocuments -Destination $paths.DocumentsDir -Recurse }
                else { New-Item -ItemType Directory -Path $paths.DocumentsDir | Out-Null }
                if (Test-Path -LiteralPath $previousDocuments) { Remove-Item -LiteralPath $previousDocuments -Recurse -Force }
            } catch {
                if (Test-Path -LiteralPath $paths.DocumentsDir) { Remove-Item -LiteralPath $paths.DocumentsDir -Recurse -Force }
                if (Test-Path -LiteralPath $previousDocuments) { Move-Item -LiteralPath $previousDocuments -Destination $paths.DocumentsDir }
                throw
            }
        }
        Write-Host 'Restauracion completada correctamente.' -ForegroundColor Green
    }
} catch { Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red; exit 1 }
finally {
    $WhatIfPreference = $false
    if ($stage -and (Test-Path -LiteralPath $stage)) { Remove-Item -LiteralPath $stage -Recurse -Force -WhatIf:$false }
    Exit-EnsaliaMutex $mutex
}
