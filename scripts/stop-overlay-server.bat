@echo off
REM Stop NBA 2K Overlay Server

echo Stopping NBA 2K Overlay Server...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq *server.js*" 2>nul

if %errorlevel% equ 0 (
    echo Server stopped successfully!
) else (
    echo No server found running, or unable to stop.
)

pause

