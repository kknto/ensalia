# Alias heredado. Conservar para accesos directos existentes.
[CmdletBinding()]
param([switch]$OpenFolder)
Write-Host 'Aviso: este comando heredado crea un respaldo Ensalia.' -ForegroundColor Cyan
& (Join-Path $PSScriptRoot 'Backup-Ensalia.ps1') -OpenFolder:$OpenFolder
exit $LASTEXITCODE
