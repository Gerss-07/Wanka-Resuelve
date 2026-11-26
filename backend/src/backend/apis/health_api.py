"""Rutas de diagnóstico de disponibilidad."""

from fastapi import APIRouter, HTTPException
from mysql.connector import Error as MySQLError

from backend.services.health_service import mysql_disponible


router = APIRouter(tags=["Sistema"])


@router.get("/health/db")
def health_db():
    try:
        if mysql_disponible():
            return {"status": "ok", "database": "disponible"}
    except (MySQLError, ValueError, OSError):
        pass
    raise HTTPException(status_code=503, detail="Base de datos no disponible")
