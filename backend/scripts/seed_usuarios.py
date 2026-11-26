"""Carga el operador y el ciudadano demo sin guardar contraseñas en el código."""

import os

from argon2 import PasswordHasher
from mysql.connector import Error as MySQLError

import backend.config  # Carga backend/.env antes de leer las variables.
from backend.repositories.conexion import conectar
from backend.repositories.usuario_repository import buscar_por_correo, crear_usuario


USUARIOS = (
    ("OPERADOR", "OPERADOR"),
    ("DEMO_CIUDADANO", "CIUDADANO"),
)


def datos_usuarios() -> list[tuple[str, str, str, str]]:
    datos = []
    for prefijo, rol in USUARIOS:
        correo = os.getenv(f"{prefijo}_CORREO", "").strip().lower()
        nombre = os.getenv(f"{prefijo}_NOMBRE", "").strip()
        contrasena = os.getenv(f"{prefijo}_CONTRASENA", "")
        if not correo or not nombre or not contrasena:
            raise ValueError("Faltan datos de los usuarios semilla en backend/.env")
        if not 2 <= len(nombre) <= 100 or len(correo) > 150 or not 8 <= len(contrasena) <= 128:
            raise ValueError("Datos de usuarios semilla inválidos")
        datos.append((correo, nombre, contrasena, rol))
    if datos[0][0] == datos[1][0]:
        raise ValueError("Los correos de los usuarios semilla deben ser distintos")
    return datos


def cargar_usuarios(connection, datos: list[tuple[str, str, str, str]]) -> list[tuple[str, int]]:
    hasher = PasswordHasher()
    ids = []
    for correo, nombre, contrasena, rol in datos:
        existente = buscar_por_correo(connection, correo)
        if existente:
            id_usuario, rol_existente = existente
            if rol_existente != rol:
                raise ValueError("Un usuario semilla existente tiene un rol diferente")
        else:
            id_usuario = crear_usuario(connection, nombre, correo, hasher.hash(contrasena), rol)
        ids.append((rol, id_usuario))
    return ids


def main() -> None:
    try:
        datos = datos_usuarios()
        connection = conectar()
        try:
            try:
                ids = cargar_usuarios(connection, datos)
                connection.commit()
            except (MySQLError, ValueError):
                connection.rollback()
                raise
        finally:
            connection.close()
    except (MySQLError, ValueError, OSError):
        raise SystemExit("No se pudieron cargar los usuarios semilla; comprueba la configuración y la base de datos") from None

    for rol, id_usuario in ids:
        print(f"{rol}: id_usuario={id_usuario}")


if __name__ == "__main__":
    main()
