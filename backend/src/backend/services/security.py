"""Contraseñas con Argon2id y tokens JWT (HS256). Nunca registra secretos ni tokens."""

from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from backend.core.config import Settings, get_settings
from backend.services.exceptions import NoAutorizado


ALGORITMO_JWT = "HS256"
LONGITUD_MINIMA_SECRETO = 32
CLAIMS_OBLIGATORIOS = ["sub", "rol", "iat", "exp"]

_hasher = PasswordHasher()  # el tipo por defecto es Argon2id


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(contrasena_hash: str, password: str) -> bool:
    try:
        return _hasher.verify(contrasena_hash, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def validar_configuracion_jwt(settings: Settings) -> None:
    """Falla (sin mostrar el valor) si el secreto o la vigencia no son aceptables."""
    if len(settings.jwt_secreto) < LONGITUD_MINIMA_SECRETO:
        raise ValueError(
            f"JWT_SECRETO debe estar definido y tener al menos {LONGITUD_MINIMA_SECRETO} caracteres"
        )
    if settings.jwt_expira_minutos <= 0:
        raise ValueError("JWT_EXPIRA_MINUTOS debe ser mayor que 0")


def crear_token(id_usuario: int, rol: str) -> tuple[str, int]:
    """Devuelve el token y su vigencia en segundos."""
    settings = get_settings()
    validar_configuracion_jwt(settings)
    ahora = datetime.now(timezone.utc)
    vigencia = timedelta(minutes=settings.jwt_expira_minutos)
    claims = {"sub": str(id_usuario), "rol": rol, "iat": ahora, "exp": ahora + vigencia}
    token = jwt.encode(claims, settings.jwt_secreto, algorithm=ALGORITMO_JWT)
    return token, int(vigencia.total_seconds())


def decodificar_token(token: str) -> dict:
    """Valida firma, algoritmo, claims y vencimiento; cualquier fallo es 401."""
    settings = get_settings()
    validar_configuracion_jwt(settings)
    try:
        return jwt.decode(
            token, settings.jwt_secreto, algorithms=[ALGORITMO_JWT],
            options={"require": CLAIMS_OBLIGATORIOS},
        )
    except jwt.InvalidTokenError:
        raise NoAutorizado("No autenticado") from None
