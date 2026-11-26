"""Consultas de persistencia para usuarios de demostración."""


def buscar_por_correo(connection, correo: str):
    cursor = connection.cursor()
    try:
        cursor.execute(
            "SELECT id_usuario, rol FROM usuario WHERE correo = %s", (correo,)
        )
        return cursor.fetchone()
    finally:
        cursor.close()


def crear_usuario(connection, nombre: str, correo: str, password_hash: str, rol: str):
    cursor = connection.cursor()
    try:
        cursor.execute(
            "INSERT INTO usuario (nombre, correo, contrasena_hash, rol) "
            "VALUES (%s, %s, %s, %s)",
            (nombre, correo, password_hash, rol),
        )
        return cursor.lastrowid
    finally:
        cursor.close()
