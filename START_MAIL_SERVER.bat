@echo off
echo ========================================
echo   EchoDay - Mail Bridge Server
echo ========================================
echo.
echo Mail sunucusu baslatiliyor...
echo Port: 5123
echo.

cd /d "%~dp0server"
npm start

pause
