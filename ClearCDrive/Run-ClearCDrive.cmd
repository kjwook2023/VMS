@echo off
setlocal
set EXE=%~dp0dist\win-x64\ClearCDrive.exe
if not exist "%EXE%" (
  echo ClearCDrive.exe not found. Build it first with:
  echo   powershell -ExecutionPolicy Bypass -File "%~dp0build\Publish.ps1"
  exit /b 1
)
"%EXE%" %*
