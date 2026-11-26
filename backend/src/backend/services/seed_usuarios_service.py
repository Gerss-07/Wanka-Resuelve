"""Creación idempotente de las cuentas semilla."""

import os

from argon2 import PasswordHasher

from backend.repositories.conexion import conectar
from backend.repositories.usuario_seed_repository import buscar_por_correo, crear_usuario


def crear_usuarios_semilla() -> tuple[int, int]:
    usuarios = []
    for prefijo, rol in (("OPERADOR", "OPERADOR"), ("DEMO_CIUDADANO", "CIUDADANO")):
        nombre = os.getenv(f"{prefijo}_NOMBRE", "").strip()
        correo = os.getenv(f"{prefijo}_CORREO", "").strip().lower()
        contrasena = os.getenv(f"{prefijo}_CONTRASENA", "")
        if len(nombre) < 2 or not correo or len(contrasena) < 8:
            raise ValueError("Datos de usuarios semilla incompletos o inválidos")
        usuarios.append((nombre, correo, contrasena, rol))

    if usuarios[0][1] == usuarios[1][1]:
        raise ValueError("Los usuarios semilla deben tener correos diferentes")

    hasher = PasswordHasher()
    connection = conectar()
    try:
        ids = []
        for nombre, correo, contrasena, rol in usuarios:
            existente = buscar_por_correo(connection, correo)
            if existente:
                if existente[1] != rol:
                    raise ValueError("El usuario semilla existente tiene otro rol")
                ids.append(existente[0])
            else:
                ids.append(crear_usuario(connection, nombre, correo, hasher.hash(contrasena), rol))
        connection.commit()
        return tuple(ids)
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()
