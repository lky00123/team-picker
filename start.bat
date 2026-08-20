@echo off
title TeamPicker Server (port 8600)

echo ============================================
echo   TeamPicker - 分队器服务
echo   地址: http://localhost:8600
echo   数据: server\data.json
echo ============================================

cd /d "%~dp0\server"

if not exist "..\dist" (
    echo [WARN] dist/ 不存在, 请先在前端目录执行: npm run build
)

python -m uvicorn app:app --host 0.0.0.0 --port 8600
pause
