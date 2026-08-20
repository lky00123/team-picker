@echo off
title TeamPicker Deploy
cd /d "%~dp0"

echo ============================================
echo   TeamPicker - Deploy (first time setup)
echo   Target: http://localhost:8600
echo ============================================
echo.

REM [1/4] Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found.
    echo Install from: https://nodejs.org  ^(LTS version^)
    pause
    exit /b 1
)
echo [1/4] Node.js OK

REM [2/4] Frontend: install deps + build
if not exist "node_modules" (
    echo [2/4] npm install ... first time takes a few minutes
    call npm install
    if errorlevel 1 ( echo [ERROR] npm install failed & pause & exit /b 1 )
) else (
    echo [2/4] node_modules exists, skip install
)
echo       building frontend...
call npm run build
if errorlevel 1 ( echo [ERROR] build failed & pause & exit /b 1 )
echo       build OK -^> dist/

REM [3/4] Backend: Python deps
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Install from https://python.org
    pause
    exit /b 1
)
python -c "import fastapi, uvicorn" >nul 2>&1
if errorlevel 1 (
    echo [3/4] installing fastapi + uvicorn ...
    pip install fastapi uvicorn
    if errorlevel 1 ( echo [ERROR] pip install failed & pause & exit /b 1 )
) else (
    echo [3/4] fastapi/uvicorn already installed
)

REM [4/4] Start server
echo [4/4] starting server ...
call restart.bat

echo.
echo ============================================
echo   DONE!  Open http://localhost:8600
echo   LAN:   http://YOUR_PC_IP:8600
echo ============================================
pause
