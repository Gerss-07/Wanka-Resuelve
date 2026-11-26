"""Construcción de servicios y dependencias de sesión para FastAPI."""

from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, Header
from mysql.connector import MySQLConnection

from backend.core.config import get_settings
from backend.core.database import get_db
from backend.repositories.catalogos import CatalogoRepository
from backend.repositories.fotos import FotoRepository
from backend.repositories.historial import HistorialRepository
from backend.repositories.reportes import ReporteRepository
from backend.repositories.usuarios import UsuarioRepository
from backend.schemas.auth import Usuario
from backend.services.catalogos import CatalogoService
from backend.services.exceptions import NoAutorizado, SinPermiso
from backend.services.fotos import FotoService
from backend.services.health import HealthService
from backend.services.reportes import ReporteService
from backend.services.usuarios import UsuarioService


DbDep = Annotated[MySQLConnection, Depends(get_db)]


def get_health_service() -> HealthService:
    return HealthService()


HealthServiceDep = Annotated[HealthService, Depends(get_health_service)]


def get_usuario_service(connection: DbDep) -> UsuarioService:
    return UsuarioService(UsuarioRepository(connection))


UsuarioServiceDep = Annotated[UsuarioService, Depends(get_usuario_service)]


def get_current_user(
    service: UsuarioServiceDep,
    x_dev_usuario_id: Annotated[str | None, Header(description="Temporal, solo con AUTH_MODO=dev (se elimina en F5)")] = None,
) -> Usuario:
    """Usuario de la sesión.

    Modo temporal (AUTH_MODO=dev): se toma de la cabecera X-Dev-Usuario-Id.
    En la fase 5 solo cambia el interior de esta función (JWT).
    """
    if get_settings().auth_modo != "dev":
        raise NoAutorizado("No autenticado")
    if x_dev_usuario_id is None or not x_dev_usuario_id.strip().isdigit():
        raise NoAutorizado("No autenticado")
    return service.obtener_usuario_sesion(int(x_dev_usuario_id))


CurrentUserDep = Annotated[Usuario, Depends(get_current_user)]


def require_rol(*roles: str) -> Callable[[Usuario], Usuario]:
    def verificar(usuario: CurrentUserDep) -> Usuario:
        if usuario.rol not in roles:
            raise SinPermiso("No tienes permiso para esta acción")
        return usuario

    return verificar


CiudadanoDep = Annotated[Usuario, Depends(require_rol("CIUDADANO"))]
OperadorDep = Annotated[Usuario, Depends(require_rol("OPERADOR"))]
AutenticadoDep = Annotated[Usuario, Depends(require_rol("CIUDADANO", "OPERADOR"))]


def get_catalogo_service(connection: DbDep) -> CatalogoService:
    return CatalogoService(CatalogoRepository(connection))


CatalogoServiceDep = Annotated[CatalogoService, Depends(get_catalogo_service)]


def get_reporte_service(connection: DbDep) -> ReporteService:
    return ReporteService(
        ReporteRepository(connection),
        FotoRepository(connection),
        HistorialRepository(connection),
        CatalogoRepository(connection),
        FotoService(get_settings().uploads_path()),
    )


ReporteServiceDep = Annotated[ReporteService, Depends(get_reporte_service)]
