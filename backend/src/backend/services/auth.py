"""Registro, inicio de sesión y resolución del usuario de la sesión."""

from functools import cache

from backend.repositories.usuarios import UsuarioRepository
from backend.schemas.auth import Token, Usuario, UsuarioLogin, UsuarioRegistro
from backend.services.exceptions import NoAutorizado
from backend.services.security import (
    crear_token, decodificar_token, hash_password, verify_password,
)


MENSAJE_CREDENCIALES = "Credenciales inválidas"
MENSAJE_NO_AUTENTICADO = "No autenticado"
ROL_REGISTRO = "CIUDADANO"


@cache
def _hash_ficticio() -> str:
    """Hash para verificar aunque el correo no exista, y no delatarlo por el tiempo de respuesta."""
    return hash_password("contrasena-ficticia-solo-para-igualar-tiempos")


class AuthService:
    def __init__(self, repository: UsuarioRepository):
        self.repository = repository

    def registrar(self, datos: UsuarioRegistro) -> Usuario:
        # El rol siempre es CIUDADANO; el correo ya llega en minúsculas desde el schema.
        id_usuario = self.repository.crear_usuario(
            datos.nombre, datos.correo, hash_password(datos.contrasena), ROL_REGISTRO
        )
        return Usuario(id_usuario=id_usuario, nombre=datos.nombre, correo=datos.correo,
                       rol=ROL_REGISTRO)

    def login(self, datos: UsuarioLogin) -> Token:
        registro = self.repository.buscar_credenciales(datos.correo)
        if registro is None:
            verify_password(_hash_ficticio(), datos.contrasena)
            raise NoAutorizado(MENSAJE_CREDENCIALES)
        if not verify_password(registro.contrasena_hash, datos.contrasena):
            raise NoAutorizado(MENSAJE_CREDENCIALES)
        token, expires_in = crear_token(registro.id_usuario, registro.rol)
        usuario = Usuario(id_usuario=registro.id_usuario, nombre=registro.nombre,
                          correo=registro.correo, rol=registro.rol)
        return Token(access_token=token, expires_in=expires_in, usuario=usuario)

    def usuario_por_token(self, token: str) -> Usuario:
        claims = decodificar_token(token)
        sub = claims.get("sub")
        if not isinstance(sub, str) or not sub.isdigit():
            raise NoAutorizado(MENSAJE_NO_AUTENTICADO)
        return self._usuario_existente(int(sub))

    def usuario_dev(self, id_usuario: int) -> Usuario:
        """Modo temporal (AUTH_MODO=dev): se elimina en la parte B de F5."""
        return self._usuario_existente(id_usuario)

    def _usuario_existente(self, id_usuario: int) -> Usuario:
        fila = self.repository.buscar_por_id(id_usuario)
        if fila is None:
            raise NoAutorizado(MENSAJE_NO_AUTENTICADO)
        return Usuario(**fila)
