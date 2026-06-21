@echo off
REM ============================================================
REM  Build.bat — calls Build.ps1 (PS 암호화 + build + ConfuserEx + publish)
REM ============================================================
chcp 65001 >nul
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Build.ps1" %*
