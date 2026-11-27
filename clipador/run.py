"""Inicia o Clipador: python run.py  (painel em http://localhost:8000)"""
import os

import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.server:app", host=os.environ.get("HOST", "0.0.0.0"), port=int(os.environ.get("PORT", 8000)),
                log_level="warning")
