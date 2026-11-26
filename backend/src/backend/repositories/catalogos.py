"""Consultas parametrizadas de catálogos."""

from mysql.connector import MySQLConnection


class CatalogoRepository:
    def __init__(self, connection: MySQLConnection):
        self.connection = connection

    def _todas(self, sql: str, params: tuple = ()) -> list[dict]:
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(sql, params)
            return cursor.fetchall()
        finally:
            cursor.close()

    def _existe(self, sql: str, params: tuple) -> bool:
        cursor = self.connection.cursor()
        try:
            cursor.execute(sql, params)
            return cursor.fetchone() is not None
        finally:
            cursor.close()

    def listar_categorias(self) -> list[dict]:
        return self._todas("SELECT id_categoria, nombre FROM categoria ORDER BY id_categoria")

    def listar_distritos(self) -> list[dict]:
        return self._todas("SELECT id_distrito, nombre FROM distrito ORDER BY id_distrito")

    def listar_entidades(self, id_categoria: int | None = None) -> list[dict]:
        if id_categoria is None:
            return self._todas(
                "SELECT id_entidad, nombre, id_categoria FROM entidad_responsable ORDER BY id_entidad"
            )
        return self._todas(
            "SELECT id_entidad, nombre, id_categoria FROM entidad_responsable "
            "WHERE id_categoria = %s ORDER BY id_entidad",
            (id_categoria,),
        )

    def existe_categoria(self, id_categoria: int) -> bool:
        return self._existe("SELECT 1 FROM categoria WHERE id_categoria = %s", (id_categoria,))

    def existe_distrito(self, id_distrito: int) -> bool:
        return self._existe("SELECT 1 FROM distrito WHERE id_distrito = %s", (id_distrito,))
