"""Construcción de servicios para las dependencias de FastAPI."""

from typing import Annotated

from fastapi import Depends
from mysql.connector import MySQLConnection

from backend.core.database import get_db
from backend.repositories.usuarios import UsuarioRepository
from backend.services.health import HealthService
from backend.services.usuarios import UsuarioService


DbDep = Annotated[MySQLConnection, Depends(get_db)]


def get_health_service() -> HealthService:
    return HealthService()


HealthServiceDep = Annotated[HealthService, Depends(get_health_service)]


def get_usuario_service(connection: DbDep) -> UsuarioService:
    return UsuarioService(UsuarioRepository(connection))


UsuarioServiceDep = Annotated[UsuarioService, Depends(get_usuario_service)]
