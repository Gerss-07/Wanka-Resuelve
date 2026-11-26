"""Configuración de desarrollo cargada desde backend/.env o el entorno."""

import os
from pathlib import Path

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR / ".env")


def db_config(*, test: bool = False) -> dict[str, str | int]:
    """Devuelve los parámetros de MySQL sin exponerlos en registros o errores."""
    required = ("DB_HOST", "DB_PORT", "DB_USUARIO", "DB_CONTRASENA")
    if any(not os.getenv(key) for key in required):
        raise ValueError("Configuración de MySQL incompleta")

    db_name_key = "DB_NOMBRE_TEST" if test else "DB_NOMBRE"
    name = os.getenv(db_name_key)
    if not name:
        raise ValueError("Configuración de MySQL incompleta")

    try:
        port = int(os.environ["DB_PORT"])
    except ValueError as exc:
        raise ValueError("Puerto de MySQL inválido") from exc
    if not 1 <= port <= 65535:
        raise ValueError("Puerto de MySQL inválido")

    return {
        "host": os.environ["DB_HOST"],
        "port": port,
        "database": name,
        "user": os.environ["DB_USUARIO"],
        "password": os.environ["DB_CONTRASENA"],
        "connection_timeout": 5,
    }


def cors_origenes() -> list[str]:
    return [
        origin.strip()
        for origin in os.getenv("CORS_ORIGENES", "").split(",")
        if origin.strip()
    ]
