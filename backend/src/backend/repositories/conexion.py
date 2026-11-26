"""Conexión y comprobación de disponibilidad de MySQL."""

import mysql.connector

from backend.config import db_config


def conectar(*, test: bool = False):
    return mysql.connector.connect(**db_config(test=test))


def comprobar_conexion() -> bool:
    connection = conectar()
    try:
        cursor = connection.cursor()
        try:
            cursor.execute("SELECT 1")
            return cursor.fetchone() == (1,)
        finally:
            cursor.close()
    finally:
        connection.close()
