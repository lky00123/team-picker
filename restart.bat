@echo off
title TeamPicker Restart

REM Kill old server on port 8600 (if any)
for /f "tokens=5" %%p in ('netstat -ano ^| findstr :8600 ^| findstr LISTENING') do taskkill /F /PID %%p >nul 2>&1

timeout /t 1 /nobreak >nul

REM Start fresh
start "" "%~dp0start.bat"
echo Restarted. Open http://localhost:8600
