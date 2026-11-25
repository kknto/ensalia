@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Start-LABSICO.ps1"
if errorlevel 1 (
  echo.
  echo Ensalia no pudo iniciarse. Revise el mensaje anterior.
  pause
)
endlocal
