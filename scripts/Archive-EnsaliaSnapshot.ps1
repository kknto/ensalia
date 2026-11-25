[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$DatabaseSnapshotPath,
    [ValidateSet('antes-de-publicar','antes-de-restaurar')][string]$Reason = 'antes-de-publicar'
)

. (Join-Path $PSScriptRoot 'Ensalia.Common.ps1')
$resolvedSnapshot = (Resolve-Path -LiteralPath $DatabaseSnapshotPath).Path
$tempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
if (-not $resolvedSnapshot.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'La instantanea debe estar dentro de la carpeta temporal administrada.' }
if ([IO.Path]::GetExtension($resolvedSnapshot) -ne '.db') { throw 'La instantanea no tiene el formato esperado.' }

$paths = Get-EnsaliaPaths
Initialize-EnsaliaDirectories $paths
$archivePaths = [pscustomobject]@{
    Database = $resolvedSnapshot
    BackupDir = $paths.BackupDir
    AssetsDir = $paths.AssetsDir
    CompatibilityMode = 'online-snapshot'
}
$archive = New-EnsaliaBackupArchive -Paths $archivePaths -Reason $Reason
Write-Output "ARCHIVE_PATH=$archive"
