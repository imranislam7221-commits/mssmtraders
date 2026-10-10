@echo off
title M/S S.M. Traders POS Server
cd /d "%~dp0"
echo.
echo   Starting M/S S.M. Traders POS Server...
echo.
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"
node server.js
pause
