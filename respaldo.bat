@echo off
chcp 65001 >nul
cd /d "%~dp0backend-saved-files"
call npm run respaldo
if errorlevel 1 (echo. & echo EL RESPALDO FALLO & pause & exit /b 1)
if "%1"=="silencioso" exit /b 0
pause
