"""Datos y funciones de apoyo compartidos por las pruebas de reportes y del operador."""

JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 200
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 200
GIF = b"GIF89a" + b"\x00" * 200
JPEG_GRANDE = b"\xff\xd8\xff\xe0" + b"\x00" * 2_000_000

CLAVES_RESUMEN = {
    "id_reporte", "codigo", "ciudadano", "categoria", "distrito", "estado", "prioridad",
    "fecha_creacion",
}
CLAVES_DETALLE = CLAVES_RESUMEN | {
    "descripcion", "referencia", "latitud", "longitud", "entidad", "motivo_rechazo",
    "comentario_solucion", "fotos", "historial", "fecha_actualizacion",
}
TABLAS_CONTABLES = {"reporte", "foto_reporte", "historial_estado", "asignacion_reporte"}


def cabecera(id_usuario) -> dict:
    return {"X-Dev-Usuario-Id": str(id_usuario)}


def id_categoria(sql, nombre: str) -> int:
    return sql("SELECT id_categoria FROM categoria WHERE nombre = %s", (nombre,))[0]["id_categoria"]


def id_distrito(sql, nombre: str) -> int:
    return sql("SELECT id_distrito FROM distrito WHERE nombre = %s", (nombre,))[0]["id_distrito"]


def ids_catalogo(sql) -> tuple[int, int, int]:
    return (id_categoria(sql, "Pistas y veredas"), id_distrito(sql, "Huancayo"),
            id_distrito(sql, "El Tambo"))


def datos_reporte(sql, **cambios) -> dict:
    id_cat, id_dis, _ = ids_catalogo(sql)
    datos = {
        "id_categoria": id_cat,
        "id_distrito": id_dis,
        "descripcion": "Hueco profundo en la calzada",
        "referencia": "Av. Ferrocarril, frente a Mallplaza",
        "latitud": -12.0651,
        "longitud": -75.2049,
    }
    datos.update(cambios)
    return datos


def crear(client, sql, id_usuario, fotos=(("a.jpg", JPEG, "image/jpeg"), ("b.png", PNG, "image/png")),
          **cambios):
    archivos = [("fotos", foto) for foto in fotos]
    return client.post("/reportes", data=datos_reporte(sql, **cambios), files=archivos,
                       headers=cabecera(id_usuario))


def archivos_en_disco(uploads_dir) -> list:
    carpeta = uploads_dir / "reportes"
    return sorted(carpeta.iterdir()) if carpeta.exists() else []


def contar(sql, tabla: str) -> int:
    assert tabla in TABLAS_CONTABLES  # el nombre de tabla sale de una lista permitida
    return sql(f"SELECT COUNT(*) AS n FROM {tabla}")[0]["n"]
