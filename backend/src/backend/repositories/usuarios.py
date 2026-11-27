"""Persistencia parametrizada de usuarios."""

from dataclasses import dataclass

from mysql.connector import MySQLConnection
from mysql.connector import IntegrityError

from backend.services.exceptions import Conflicto


@dataclass(frozen=True)
class UsuarioRecord:
    """Fila interna con el hash; nunca sale del servicio ni llega a la API."""

    id_usuario: int
    nombre: str
    correo: str
    rol: str
    contrasena_hash: str


class UsuarioRepository:
    def __init__(self, connection: MySQLConnection):
        self.connection = connection

    def buscar_por_correo(self, correo: str) -> dict | None:
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute("SELECT id_usuario, rol FROM usuario WHERE correo = %s", (correo,))
            return cursor.fetchone()
        finally:
            cursor.close()

    def buscar_credenciales(self, correo: str) -> UsuarioRecord | None:
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT id_usuario, nombre, correo, rol, contrasena_hash FROM usuario WHERE correo = %s",
                (correo,),
            )
            fila = cursor.fetchone()
            return UsuarioRecord(**fila) if fila else None
        finally:
            cursor.close()

    def buscar_por_id(self, id_usuario: int) -> dict | None:
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT id_usuario, nombre, correo, rol FROM usuario WHERE id_usuario = %s",
                (id_usuario,),
            )
            return cursor.fetchone()
        finally:
            cursor.close()

    def crear_usuario(self, nombre: str, correo: str, hash_contrasena: str, rol: str) -> int:
        cursor = self.connection.cursor(dictionary=True)
        try:
            try:
                cursor.execute(
                    "INSERT INTO usuario (nombre, correo, contrasena_hash, rol) VALUES (%s, %s, %s, %s)",
                    (nombre, correo, hash_contrasena, rol),
                )
            except IntegrityError as exc:
                if exc.errno == 1062:
                    raise Conflicto("El correo ya está registrado") from None
                raise
            return cursor.lastrowid
        finally:
            cursor.close()
