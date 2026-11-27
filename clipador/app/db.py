"""Banco SQLite: canais, fontes, blocos, cortes, postagens, logs e configurações."""
from __future__ import annotations

import json
import sqlite3
import threading
import time
from contextlib import contextmanager

from . import config

_local = threading.local()
_write_lock = threading.RLock()

SCHEMA = """
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
    salt TEXT NOT NULL, created_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created_at REAL NOT NULL);
CREATE TABLE IF NOT EXISTS channels (
    id INTEGER PRIMARY KEY, platform TEXT NOT NULL, url TEXT NOT NULL UNIQUE, name TEXT,
    enabled INTEGER NOT NULL DEFAULT 1, min_score REAL, layout TEXT, auto_post INTEGER,
    status TEXT NOT NULL DEFAULT 'idle', is_live INTEGER NOT NULL DEFAULT 0,
    last_check REAL, last_live_check REAL, last_error TEXT, created_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS seen_videos (
    channel_id INTEGER NOT NULL, video_id TEXT NOT NULL, PRIMARY KEY (channel_id, video_id)
);
CREATE TABLE IF NOT EXISTS sources (
    id INTEGER PRIMARY KEY, channel_id INTEGER, kind TEXT NOT NULL, url TEXT NOT NULL,
    title TEXT, external_id TEXT, status TEXT NOT NULL, error TEXT, path TEXT,
    duration REAL, created_at REAL NOT NULL, updated_at REAL
);
CREATE TABLE IF NOT EXISTS blocks (
    id INTEGER PRIMARY KEY, source_id INTEGER NOT NULL, idx INTEGER NOT NULL, path TEXT NOT NULL,
    start_offset REAL NOT NULL DEFAULT 0, duration REAL, status TEXT NOT NULL DEFAULT 'pending',
    dead_ratio REAL, error TEXT, created_at REAL NOT NULL, updated_at REAL
);
CREATE TABLE IF NOT EXISTS clips (
    id INTEGER PRIMARY KEY, block_id INTEGER NOT NULL, source_id INTEGER NOT NULL, channel_id INTEGER,
    start REAL NOT NULL, end REAL NOT NULL, score REAL, heuristic_score REAL, ai_score REAL,
    title TEXT, caption TEXT, hashtags TEXT, transcript TEXT, reasons TEXT, layout TEXT,
    path TEXT, thumb TEXT, status TEXT NOT NULL DEFAULT 'rendering', error TEXT,
    created_at REAL NOT NULL, updated_at REAL
);
CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY, clip_id INTEGER NOT NULL, platform TEXT NOT NULL, status TEXT NOT NULL,
    external_id TEXT, url TEXT, error TEXT, created_at REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY, ts REAL NOT NULL, level TEXT NOT NULL, msg TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_blocks_status ON blocks(status);
CREATE INDEX IF NOT EXISTS idx_clips_status ON clips(status);
CREATE INDEX IF NOT EXISTS idx_clips_block ON clips(block_id);
"""


def conn() -> sqlite3.Connection:
    c = getattr(_local, "conn", None)
    if c is None:
        c = sqlite3.connect(config.DB_PATH, timeout=30, check_same_thread=False)
        c.row_factory = sqlite3.Row
        c.execute("PRAGMA journal_mode=WAL")
        c.execute("PRAGMA foreign_keys=ON")
        _local.conn = c
    return c


def init() -> None:
    with _write_lock:
        conn().executescript(SCHEMA)
        conn().commit()


def q(sql: str, args=()) -> list[dict]:
    return [dict(r) for r in conn().execute(sql, args).fetchall()]


def one(sql: str, args=()) -> dict | None:
    r = conn().execute(sql, args).fetchone()
    return dict(r) if r else None


def run(sql: str, args=()) -> int:
    with _write_lock:
        cur = conn().execute(sql, args)
        conn().commit()
        return cur.lastrowid


def insert(table: str, **fields) -> int:
    cols = ",".join(fields)
    marks = ",".join("?" for _ in fields)
    return run(f"INSERT INTO {table} ({cols}) VALUES ({marks})", tuple(fields.values()))


def update(table: str, row_id, **fields) -> None:
    if not fields:
        return
    sets = ",".join(f"{k}=?" for k in fields)
    run(f"UPDATE {table} SET {sets} WHERE id=?", (*fields.values(), row_id))


@contextmanager
def transaction():
    with _write_lock:
        c = conn()
        try:
            yield c
            c.commit()
        except Exception:
            c.rollback()
            raise


# ----------------------------------------------------------------- settings
def get_settings() -> dict:
    s = config.defaults()
    for row in q("SELECT key, value FROM settings"):
        if row["key"] in s:
            try:
                s[row["key"]] = json.loads(row["value"])
            except json.JSONDecodeError:
                pass
    return s


def save_settings(values: dict) -> dict:
    with transaction() as c:
        for k, v in values.items():
            c.execute("INSERT INTO settings(key, value) VALUES(?, ?) "
                      "ON CONFLICT(key) DO UPDATE SET value=excluded.value", (k, json.dumps(v)))
    return get_settings()


# ----------------------------------------------------------------- logs
def log(msg: str, level: str = "info") -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {level.upper():5} {msg}", flush=True)
    try:
        run("INSERT INTO logs(ts, level, msg) VALUES(?,?,?)", (time.time(), level, msg[:2000]))
        if int(time.time()) % 50 == 0:
            run("DELETE FROM logs WHERE id < (SELECT MAX(id) - 5000 FROM logs)")
    except sqlite3.Error:
        pass
