"""Consultas parametrizadas de la tabla asignacion_reporte."""

from mysql.connector import MySQLConnection


class AsignacionRepository:
    def __init__(self, connection: MySQLConnection):
        self.connection = connection

    def insertar(self, id_reporte: int, id_entidad: int, prioridad: str) -> None:
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "INSERT INTO asignacion_reporte (id_reporte, id_entidad, prioridad) "
                "VALUES (%s, %s, %s)",
                (id_reporte, id_entidad, prioridad),
            )
        finally:
            cursor.close()
