# Alias heredado. Conservar para accesos directos existentes.
[CmdletBinding()]
param()
Write-Host 'Aviso: este comando heredado genera un diagnostico Ensalia.' -ForegroundColor Cyan
& (Join-Path $PSScriptRoot 'Diagnostico-Ensalia.ps1')
exit $LASTEXITCODE
