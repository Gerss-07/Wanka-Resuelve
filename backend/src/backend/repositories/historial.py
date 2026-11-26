"""Consultas parametrizadas de historial_estado (solo inserción y lectura, RR-12)."""

from mysql.connector import MySQLConnection


class HistorialRepository:
    def __init__(self, connection: MySQLConnection):
        self.connection = connection

    def insertar(self, id_reporte: int, estado_anterior: str | None, estado_nuevo: str,
                 id_usuario: int, comentario: str | None = None) -> int:
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "INSERT INTO historial_estado (id_reporte, estado_anterior, estado_nuevo, "
                "id_usuario, comentario) VALUES (%s, %s, %s, %s, %s)",
                (id_reporte, estado_anterior, estado_nuevo, id_usuario, comentario),
            )
            return cursor.lastrowid
        finally:
            cursor.close()

    def listar_por_reporte(self, id_reporte: int) -> list[dict]:
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "SELECT h.estado_anterior, h.estado_nuevo, h.id_usuario, "
                "u.nombre AS usuario_nombre, u.rol AS usuario_rol, h.comentario, h.fecha "
                "FROM historial_estado h JOIN usuario u ON u.id_usuario = h.id_usuario "
                "WHERE h.id_reporte = %s ORDER BY h.fecha, h.id_historial",
                (id_reporte,),
            )
            return cursor.fetchall()
        finally:
            cursor.close()
