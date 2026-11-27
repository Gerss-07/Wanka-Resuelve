"""Rutas de disponibilidad de la aplicación."""

from fastapi import APIRouter, HTTPException

from backend.core.dependencies import HealthServiceDep


router = APIRouter(tags=["Sistema"])


@router.get("/health")
def health():
    return {"status": "ok", "message": "Wanka Resuelve API funcionando"}


@router.get("/health/db")
def health_db(service: HealthServiceDep):
    if service.check():
        return {"status": "ok", "database": "disponible"}
    raise HTTPException(status_code=503, detail="Base de datos no disponible")
