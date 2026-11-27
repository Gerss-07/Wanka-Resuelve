"""Contratos de autenticación y de usuario expuestos por la API (nunca incluyen el hash)."""

from typing import Annotated, Literal

from email_validator import EmailNotValidError, validate_email
from pydantic import AfterValidator, BaseModel, BeforeValidator, ConfigDict, Field


Rol = Literal["CIUDADANO", "OPERADOR"]

MAX_CORREO = 150

# Mensajes de la sección 8 por campo; el handler de validación los usa para el 422.
MENSAJES_AUTH = {
    "nombre": "El nombre debe tener entre 2 y 100 caracteres",
    "correo": "Correo inválido",
    "contrasena": "La contraseña debe tener al menos 8 caracteres",
}


def _recortar(valor):
    return valor.strip() if isinstance(valor, str) else valor


def _normalizar_correo(valor):
    return valor.strip().lower() if isinstance(valor, str) else valor


def _validar_correo(correo: str) -> str:
    # test_environment=True acepta dominios .test (como en los ejemplos de la especificación).
    if len(correo) > MAX_CORREO:
        raise ValueError(MENSAJES_AUTH["correo"])
    try:
        validate_email(correo, check_deliverability=False, test_environment=True)
    except EmailNotValidError:
        raise ValueError(MENSAJES_AUTH["correo"]) from None
    return correo


Correo = Annotated[str, BeforeValidator(_normalizar_correo), AfterValidator(_validar_correo)]


class Usuario(BaseModel):
    id_usuario: int
    nombre: str
    correo: str
    rol: Rol


class UsuarioRegistro(BaseModel):
    """Registro público: siempre crea un CIUDADANO; un campo «rol» enviado se ignora."""

    model_config = ConfigDict(extra="ignore")

    nombre: Annotated[str, BeforeValidator(_recortar), Field(min_length=2, max_length=100)]
    correo: Correo
    contrasena: str = Field(min_length=8, max_length=128)  # no se recorta


class UsuarioLogin(BaseModel):
    model_config = ConfigDict(extra="ignore")

    correo: Annotated[str, BeforeValidator(_normalizar_correo)]
    contrasena: str


class Token(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    usuario: Usuario
