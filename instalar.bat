@echo off
chcp 65001 >nul
echo === Instalacion del Sistema de Archivo Municipal ===
where node >nul 2>nul || (echo ERROR: instala Node.js 22 LTS desde https://nodejs.org y vuelve a ejecutar. & pause & exit /b 1)
if not exist "%~dp0backend-saved-files\.env" (echo ERROR: falta backend-saved-files\.env. Copia .env.example como .env y editalo primero. & pause & exit /b 1)
cd /d "%~dp0backend-saved-files"
call npm install || goto :error
call npm run build || goto :error
cd /d "%~dp0frontend-saved-files"
call npm install || goto :error
call npm run build || goto :error
echo.
echo Instalacion terminada. Ejecuta iniciar.bat para arrancar el sistema.
pause
exit /b 0
:error
echo.
echo ERROR: la instalacion fallo. Revisa los mensajes anteriores.
pause
exit /b 1
