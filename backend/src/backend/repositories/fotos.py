"""Consultas parametrizadas de la tabla foto_reporte."""

from mysql.connector import MySQLConnection


class FotoRepository:
    def __init__(self, connection: MySQLConnection):
        self.connection = connection

    def insertar(self, id_reporte: int, orden: int, ruta_relativa: str,
                 tipo_mime: str, tamano_bytes: int) -> int:
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "INSERT INTO foto_reporte (id_reporte, orden, ruta_relativa, tipo_mime, tamano_bytes) "
                "VALUES (%s, %s, %s, %s, %s)",
                (id_reporte, orden, ruta_relativa, tipo_mime, tamano_bytes),
            )
            return cursor.lastrowid
        finally:
            cursor.close()

    def listar_por_reporte(self, id_reporte: int) -> list[dict]:
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT id_foto, ruta_relativa FROM foto_reporte WHERE id_reporte = %s ORDER BY orden",
                (id_reporte,),
            )
            return cursor.fetchall()
        finally:
            cursor.close()
