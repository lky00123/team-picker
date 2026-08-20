@echo off
title TeamPicker Server (port 8600)

echo ============================================
echo   TeamPicker Server
echo   URL  : http://localhost:8600
echo   Data : server\data.json
echo ============================================

cd /d "%~dp0\server"

if not exist "..\dist" (
    echo [WARN] dist/ not found. Run: npm run build
)

python -m uvicorn app:app --host 0.0.0.0 --port 8600
pause
