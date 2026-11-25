[CmdletBinding()]
param([switch]$OpenFolder)
. (Join-Path $PSScriptRoot 'Ensalia.Common.ps1')
$paths = Get-EnsaliaPaths
$mutex = $null
try {
    Initialize-EnsaliaDirectories $paths
    $mutex = Enter-EnsaliaMutex
    if ($null -eq $mutex) { throw 'Cierre Ensalia antes de crear el respaldo para garantizar una copia consistente.' }
    $archive = New-EnsaliaBackupArchive -Paths $paths -Reason 'manual'
    Write-Host "Respaldo creado correctamente:`n$archive" -ForegroundColor Green
    if ($paths.CompatibilityMode -eq 'legacy-alias') { Write-Host 'La base heredada no fue movida; el respaldo ya usa el formato Ensalia.' -ForegroundColor Cyan }
    if ($OpenFolder) { Start-Process explorer.exe -ArgumentList @('/select,', $archive) }
} catch { Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red; exit 1 }
finally { Exit-EnsaliaMutex $mutex }
