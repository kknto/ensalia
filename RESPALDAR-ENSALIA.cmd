@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Backup-Ensalia.ps1" -OpenFolder
if errorlevel 1 pause
endlocal
