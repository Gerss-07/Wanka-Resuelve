"""Conexiones MySQL y límites de transacción por request o script."""

from collections.abc import Iterator
from contextlib import contextmanager

import mysql.connector
from mysql.connector import MySQLConnection

from backend.core.config import get_settings


# Hora de Perú (UTC-5, sin horario de verano). El servidor MySQL corre en UTC, así que
# cada sesión la fija para que CURRENT_TIMESTAMP y las fechas guardadas sean hora local.
ZONA_HORARIA_SESION = "-05:00"


def _configurar_sesion(connection: MySQLConnection) -> None:
    cursor = connection.cursor()
    try:
        cursor.execute("SET time_zone = %s", (ZONA_HORARIA_SESION,))
    finally:
        cursor.close()


@contextmanager
def connection_scope(*, test: bool = False) -> Iterator[MySQLConnection]:
    connection = mysql.connector.connect(**get_settings().mysql_config(test=test))
    try:
        _configurar_sesion(connection)
        yield connection
        connection.commit()
    except BaseException:
        connection.rollback()
        raise
    finally:
        connection.close()


def get_db() -> Iterator[MySQLConnection]:
    """Dependencia FastAPI: una conexión y una transacción por petición."""
    with connection_scope() as connection:
        yield connection


def check_connection() -> bool:
    with connection_scope() as connection:
        cursor = connection.cursor()
        try:
            cursor.execute("SELECT 1")
            return cursor.fetchone() == (1,)
        finally:
            cursor.close()
