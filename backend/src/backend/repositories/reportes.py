"""Consultas parametrizadas de la tabla reporte."""

from mysql.connector import MySQLConnection

from backend.schemas.reportes import ReporteCreate, ReporteFiltros


_SELECT_REPORTE = """
    SELECT r.id_reporte, r.codigo, r.id_ciudadano, u.nombre AS ciudadano_nombre,
           r.id_categoria, c.nombre AS categoria_nombre,
           r.id_distrito, d.nombre AS distrito_nombre,
           r.estado, a.prioridad, r.fecha_creacion,
           r.descripcion, r.referencia, r.latitud, r.longitud,
           a.id_entidad, e.nombre AS entidad_nombre, e.id_categoria AS entidad_id_categoria,
           r.fecha_actualizacion
    FROM reporte r
    JOIN usuario u ON u.id_usuario = r.id_ciudadano
    JOIN categoria c ON c.id_categoria = r.id_categoria
    JOIN distrito d ON d.id_distrito = r.id_distrito
    LEFT JOIN asignacion_reporte a ON a.id_reporte = r.id_reporte
    LEFT JOIN entidad_responsable e ON e.id_entidad = a.id_entidad
"""


class ReporteRepository:
    def __init__(self, connection: MySQLConnection):
        self.connection = connection

    def insertar(self, id_ciudadano: int, datos: ReporteCreate) -> int:
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "INSERT INTO reporte (codigo, id_ciudadano, id_categoria, id_distrito, "
                "descripcion, referencia, latitud, longitud) "
                "VALUES (NULL, %s, %s, %s, %s, %s, %s, %s)",
                (id_ciudadano, datos.id_categoria, datos.id_distrito, datos.descripcion,
                 datos.referencia, datos.latitud, datos.longitud),
            )
            return cursor.lastrowid
        finally:
            cursor.close()

    def actualizar_codigo(self, id_reporte: int, codigo: str) -> None:
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "UPDATE reporte SET codigo = %s WHERE id_reporte = %s", (codigo, id_reporte)
            )
        finally:
            cursor.close()

    def obtener(self, id_reporte: int) -> dict | None:
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(_SELECT_REPORTE + " WHERE r.id_reporte = %s", (id_reporte,))
            return cursor.fetchone()
        finally:
            cursor.close()

    def listar_por_ciudadano(self, id_ciudadano: int) -> list[dict]:
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(
                _SELECT_REPORTE
                + " WHERE r.id_ciudadano = %s ORDER BY r.fecha_creacion DESC, r.id_reporte DESC",
                (id_ciudadano,),
            )
            return cursor.fetchall()
        finally:
            cursor.close()

    def listar(self, filtros: ReporteFiltros) -> list[dict]:
        """Bandeja: cláusulas fijas (lista permitida) y valores siempre parametrizados."""
        clausulas: list[str] = []
        params: list = []
        if filtros.estado is not None:
            clausulas.append("r.estado = %s")
            params.append(filtros.estado)
        if filtros.id_categoria is not None:
            clausulas.append("r.id_categoria = %s")
            params.append(filtros.id_categoria)
        if filtros.id_distrito is not None:
            clausulas.append("r.id_distrito = %s")
            params.append(filtros.id_distrito)
        if filtros.fecha_desde is not None:
            clausulas.append("r.fecha_creacion >= %s")
            params.append(filtros.fecha_desde)
        if filtros.fecha_hasta is not None:
            clausulas.append("r.fecha_creacion < DATE_ADD(%s, INTERVAL 1 DAY)")
            params.append(filtros.fecha_hasta)
        where = (" WHERE " + " AND ".join(clausulas)) if clausulas else ""
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(
                _SELECT_REPORTE + where + " ORDER BY r.fecha_creacion DESC, r.id_reporte DESC",
                tuple(params),
            )
            return cursor.fetchall()
        finally:
            cursor.close()

    def cambiar_estado(self, id_reporte: int, estado_origen: str, estado_nuevo: str) -> int:
        """Transición segura: solo cambia si sigue en el estado de origen; devuelve rowcount."""
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "UPDATE reporte SET estado = %s WHERE id_reporte = %s AND estado = %s",
                (estado_nuevo, id_reporte, estado_origen),
            )
            return cursor.rowcount
        finally:
            cursor.close()

    def actualizar_datos(self, id_reporte: int, datos: ReporteCreate, estado_requerido: str) -> int:
        """Actualiza solo si el reporte sigue en el estado indicado; devuelve rowcount."""
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "UPDATE reporte SET id_categoria = %s, id_distrito = %s, descripcion = %s, "
                "referencia = %s, latitud = %s, longitud = %s "
                "WHERE id_reporte = %s AND estado = %s",
                (datos.id_categoria, datos.id_distrito, datos.descripcion, datos.referencia,
                 datos.latitud, datos.longitud, id_reporte, estado_requerido),
            )
            return cursor.rowcount
        finally:
            cursor.close()

    def eliminar(self, id_reporte: int, estado_requerido: str) -> int:
        """Borra solo si sigue en el estado indicado; fotos e historial caen en cascada."""
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(
                "DELETE FROM reporte WHERE id_reporte = %s AND estado = %s",
                (id_reporte, estado_requerido),
            )
            return cursor.rowcount
        finally:
            cursor.close()
