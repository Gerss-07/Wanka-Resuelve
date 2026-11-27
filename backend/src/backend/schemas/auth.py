"""Contratos de usuario expuestos por la API (nunca incluyen el hash)."""

from typing import Literal

from pydantic import BaseModel


Rol = Literal["CIUDADANO", "OPERADOR"]


class Usuario(BaseModel):
    id_usuario: int
    nombre: str
    correo: str
    rol: Rol
