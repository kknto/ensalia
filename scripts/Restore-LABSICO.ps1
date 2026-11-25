# Alias heredado. Conservar para procedimientos documentados anteriormente.
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$BackupPath,
    [switch]$WhatIf
)
Write-Host 'Aviso: este comando heredado restaura mediante el mecanismo compatible de Ensalia.' -ForegroundColor Cyan
& (Join-Path $PSScriptRoot 'Restore-Ensalia.ps1') -BackupPath $BackupPath -WhatIf:$WhatIf
exit $LASTEXITCODE
