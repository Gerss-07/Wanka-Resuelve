"""Construcción de servicios y dependencias de sesión para FastAPI."""

from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, Header, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from mysql.connector import MySQLConnection

from backend.core.config import get_settings
from backend.core.database import get_db
from backend.repositories.asignaciones import AsignacionRepository
from backend.repositories.catalogos import CatalogoRepository
from backend.repositories.fotos import FotoRepository
from backend.repositories.historial import HistorialRepository
from backend.repositories.reportes import ReporteRepository
from backend.repositories.usuarios import UsuarioRepository
from backend.schemas.auth import Usuario
from backend.services.auth import AuthService
from backend.services.catalogos import CatalogoService
from backend.services.exceptions import NoAutorizado, SinPermiso
from backend.services.fotos import FotoService
from backend.services.health import HealthService
from backend.services.operador import OperadorService
from backend.services.reportes import ReporteService
from backend.services.usuarios import UsuarioService


DbDep = Annotated[MySQLConnection, Depends(get_db)]


def get_health_service() -> HealthService:
    return HealthService()


HealthServiceDep = Annotated[HealthService, Depends(get_health_service)]


def get_usuario_service(connection: DbDep) -> UsuarioService:
    return UsuarioService(UsuarioRepository(connection))


UsuarioServiceDep = Annotated[UsuarioService, Depends(get_usuario_service)]


def get_auth_service(connection: DbDep) -> AuthService:
    return AuthService(UsuarioRepository(connection))


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]


_bearer = HTTPBearer(auto_error=False, description="Token JWT obtenido en POST /auth/login")


def get_current_user(
    request: Request,
    service: AuthServiceDep,
    credenciales: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    x_dev_usuario_id: Annotated[
        str | None,
        Header(description="Temporal, solo con AUTH_MODO=dev y sin Authorization (se elimina en F5-B)"),
    ] = None,
) -> Usuario:
    """Usuario de la sesión.

    1. Si llega la cabecera Authorization, debe ser «Bearer <token>» válido (si no, 401).
    2. Si no llega y AUTH_MODO=dev, se usa X-Dev-Usuario-Id (modo temporal).
    3. En cualquier otro caso, 401.
    """
    if "authorization" in request.headers:
        if credenciales is None or not credenciales.credentials:
            raise NoAutorizado("No autenticado")
        return service.usuario_por_token(credenciales.credentials)
    if get_settings().auth_modo == "dev" and x_dev_usuario_id is not None:
        valor = x_dev_usuario_id.strip()
        if valor.isdigit():
            return service.usuario_dev(int(valor))
    raise NoAutorizado("No autenticado")


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


def get_operador_service(connection: DbDep) -> OperadorService:
    return OperadorService(
        ReporteRepository(connection),
        HistorialRepository(connection),
        AsignacionRepository(connection),
        CatalogoRepository(connection),
        get_reporte_service(connection),
    )


OperadorServiceDep = Annotated[OperadorService, Depends(get_operador_service)]
