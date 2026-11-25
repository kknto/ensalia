[CmdletBinding()]
param()
. (Join-Path $PSScriptRoot 'Ensalia.Common.ps1')
$paths = Get-EnsaliaPaths
Initialize-EnsaliaDirectories $paths
$report = Join-Path $paths.LogDir ("diagnostico-{0}.txt" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
$node = Get-Command node.exe -ErrorAction SilentlyContinue
$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
$lines = @('Diagnostico Ensalia', "Fecha: $((Get-Date).ToString('o'))", "Windows: $([Environment]::OSVersion.VersionString)", "PowerShell: $($PSVersionTable.PSVersion)", "Node disponible: $($null -ne $node)", "npm disponible: $($null -ne $npm)", "Aplicacion preparada: $(Test-Path -LiteralPath (Join-Path $paths.AppRoot '.next\BUILD_ID'))", "Base disponible: $(Test-Path -LiteralPath $paths.Database)", "Modo de datos: $($paths.CompatibilityMode)", "Carpeta de datos: $($paths.DataDir)", "Carpeta de respaldos: $($paths.BackupDir)")
if (Test-Path -LiteralPath $paths.Database) { $file = Get-Item -LiteralPath $paths.Database; $lines += "Tamano de base: $($file.Length) bytes"; $lines += "Base modificada: $($file.LastWriteTime.ToString('o'))" }
$latestBackup = Get-ChildItem -LiteralPath $paths.BackupDir -Filter 'Ensalia-*.zip' -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
$lines += if ($latestBackup) { "Ultimo respaldo: $($latestBackup.FullName) ($($latestBackup.LastWriteTime.ToString('o')))" } else { 'Ultimo respaldo: ninguno' }
$lines | Set-Content -LiteralPath $report -Encoding UTF8
Write-Host "Diagnostico guardado en:`n$report" -ForegroundColor Green
