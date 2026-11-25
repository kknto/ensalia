# Alias heredado. Conservar para accesos directos existentes.
[CmdletBinding()]
param([switch]$NoBrowser)
Write-Host 'Aviso: este iniciador heredado ahora abre Ensalia.' -ForegroundColor Cyan
& (Join-Path $PSScriptRoot 'Start-Ensalia.ps1') -NoBrowser:$NoBrowser
exit $LASTEXITCODE
