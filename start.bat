@echo off
chcp 65001 >nul 2>&1
title Arona WebUI

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Node.js is not installed or not in PATH.
    echo.
    echo  Please download and install Node.js 18+ from:
    echo    https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Auto-install dependencies if missing
if not exist "node_modules" (
    echo  Installing dependencies...
    npm install --production
)

:: Read PORT from .env.local (default 18790)
set PORT=18790
if exist .env.local (
    for /f "tokens=1,* delims==" %%A in (.env.local) do (
        if "%%A"=="PORT" set PORT=%%B
    )
)

:: Start server
echo  Starting Arona WebUI on port %PORT% ...
start "" "http://localhost:%PORT%"
node src/server.mjs
if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Server exited with an error.
    pause
)
