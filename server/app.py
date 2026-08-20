# -*- coding: utf-8 -*-
"""
team-picker 后端 — FastAPI 单文件
职责: 存取 data.json(名单+历史) + 托管前端 dist 静态文件 + 简单口令

启动: uvicorn app:app --host 0.0.0.0 --port 8600
到家部署: 见 start.bat
"""
import json
import os

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

BASE = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE, 'data.json')
DIST = os.path.join(BASE, '..', 'dist')

app = FastAPI(title='team-picker')


def _read() -> dict:
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return {'roster': [], 'history': [], 'pwd': ''}


def _write(d: dict) -> None:
    tmp = DATA_FILE + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, indent=1)
    os.replace(tmp, DATA_FILE)  # 原子写


@app.get('/api/data')
def get_data():
    """前端拉取名单+历史(口令不返回)"""
    d = _read()
    return JSONResponse({'roster': d.get('roster', []), 'history': d.get('history', [])})


@app.put('/api/data')
async def put_data(request: Request):
    """保存名单+历史; 若服务器设置过口令则校验"""
    body = await request.json()
    saved = _read()
    server_pwd = saved.get('pwd', '')
    if server_pwd and body.get('pwd') != server_pwd:
        raise HTTPException(status_code=403, detail='口令错误')
    _write({
        'roster': body.get('roster', []),
        'history': body.get('history', [])[-50:],
        'pwd': server_pwd or body.get('pwd', ''),
    })
    return {'ok': True}


# ---- 前端静态托管(dist) ----
if os.path.isdir(DIST):
    app.mount('/assets', StaticFiles(directory=os.path.join(DIST, 'assets')), name='assets')

    @app.get('/')
    def index():
        return FileResponse(os.path.join(DIST, 'index.html'))
else:
    @app.get('/')
    def no_dist():
        return JSONResponse({'hint': 'dist/ 不存在, 先 npm run build'}, status_code=404)
