@echo off
chcp 65001 >nul
cd /d "%~dp0backend-saved-files"
if not exist dist\main.js (echo ERROR: primero ejecuta instalar.bat & pause & exit /b 1)
echo Archivo Municipal en marcha: http://localhost:3000
echo Deja esta ventana abierta mientras se use el sistema. Ctrl+C para detenerlo.
node dist/main.js
pause
