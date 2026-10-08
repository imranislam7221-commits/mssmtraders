@echo off
title Jaia Hardware POS Server
cd /d "%~dp0"
echo.
echo   Starting Jaia Hardware POS...
echo.
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"
node server.js
pause
