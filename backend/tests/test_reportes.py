"""F1: catálogos, usuario temporal y CRUD de reportes del ciudadano contra la base de pruebas."""

from datetime import datetime

import pytest


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


def cabecera(id_usuario) -> dict:
    return {"X-Dev-Usuario-Id": str(id_usuario)}


def ids_catalogo(sql) -> tuple[int, int, int]:
    cat = sql("SELECT id_categoria FROM categoria WHERE nombre = %s", ("Pistas y veredas",))[0]
    dis = sql("SELECT id_distrito FROM distrito WHERE nombre = %s", ("Huancayo",))[0]
    dis2 = sql("SELECT id_distrito FROM distrito WHERE nombre = %s", ("El Tambo",))[0]
    return cat["id_categoria"], dis["id_distrito"], dis2["id_distrito"]


def datos_reporte(sql, **cambios) -> dict:
    id_categoria, id_distrito, _ = ids_catalogo(sql)
    datos = {
        "id_categoria": id_categoria,
        "id_distrito": id_distrito,
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
    assert tabla in {"reporte", "foto_reporte", "historial_estado"}
    return sql(f"SELECT COUNT(*) AS n FROM {tabla}")[0]["n"]


# ---------- usuario temporal, permisos y catálogos ----------

def test_sin_cabecera_o_usuario_inexistente_401(client):
    assert client.get("/reportes/mis-reportes").status_code == 401
    assert client.get("/reportes/mis-reportes", headers=cabecera(999999)).status_code == 401
    assert client.get("/categorias", headers={"X-Dev-Usuario-Id": "abc"}).status_code == 401


def test_catalogos(client, base_pruebas, sql):
    ciudadano = cabecera(base_pruebas["ciudadano_a"])
    categorias = client.get("/categorias", headers=ciudadano).json()
    assert len(categorias) == 5 and set(categorias[0]) == {"id_categoria", "nombre"}
    distritos = client.get("/distritos", headers=ciudadano).json()
    assert [d["nombre"] for d in distritos] == ["Huancayo", "El Tambo", "Chilca"]

    assert client.get("/entidades", headers=ciudadano).status_code == 403
    operador = cabecera(base_pruebas["operador"])
    assert len(client.get("/entidades", headers=operador).json()) == 5
    id_categoria = ids_catalogo(sql)[0]
    filtradas = client.get("/entidades", params={"id_categoria": id_categoria}, headers=operador).json()
    assert filtradas == [{"id_entidad": filtradas[0]["id_entidad"],
                          "nombre": "Unidad Simulada de Vías y Veredas",
                          "id_categoria": id_categoria}]


def test_operador_no_crea_reportes_403(client, base_pruebas, sql, uploads_dir):
    response = crear(client, sql, base_pruebas["operador"])
    assert response.status_code == 403
    assert contar(sql, "reporte") == 0 and archivos_en_disco(uploads_dir) == []


# ---------- V-08 crear ----------

def test_crear_reporte_valido_v08(client, base_pruebas, sql, uploads_dir):
    response = crear(client, sql, base_pruebas["ciudadano_a"])
    assert response.status_code == 201
    reporte = response.json()
    assert set(reporte) == CLAVES_DETALLE
    assert reporte["codigo"] == f"WR-{datetime.now().year}-{reporte['id_reporte']:06d}"
    assert reporte["estado"] == "RECIBIDO"
    assert reporte["ciudadano"] == {"id_usuario": base_pruebas["ciudadano_a"], "nombre": "Ana Prueba"}
    assert reporte["categoria"]["nombre"] == "Pistas y veredas"
    assert reporte["distrito"]["nombre"] == "Huancayo"
    assert reporte["prioridad"] is None and reporte["entidad"] is None
    assert reporte["motivo_rechazo"] is None and reporte["comentario_solucion"] is None
    assert reporte["latitud"] == -12.0651 and reporte["longitud"] == -75.2049

    assert len(reporte["historial"]) == 1
    historial = reporte["historial"][0]
    assert historial["estado_anterior"] is None and historial["estado_nuevo"] == "RECIBIDO"
    assert historial["usuario"] == {"id_usuario": base_pruebas["ciudadano_a"],
                                    "nombre": "Ana Prueba", "rol": "CIUDADANO"}

    assert len(reporte["fotos"]) == 2
    assert all(set(f) == {"id_foto", "url"} for f in reporte["fotos"])
    assert reporte["fotos"][0]["url"].startswith("/uploads/reportes/")
    assert reporte["fotos"][0]["url"].endswith(".jpg")
    assert reporte["fotos"][1]["url"].endswith(".png")
    assert len(archivos_en_disco(uploads_dir)) == 2
    servida = client.get(reporte["fotos"][0]["url"])
    assert servida.status_code == 200 and servida.content == JPEG

    filas = sql("SELECT orden, tipo_mime, tamano_bytes FROM foto_reporte ORDER BY orden")
    assert filas == [{"orden": 1, "tipo_mime": "image/jpeg", "tamano_bytes": len(JPEG)},
                     {"orden": 2, "tipo_mime": "image/png", "tamano_bytes": len(PNG)}]
    assert contar(sql, "historial_estado") == 1


def test_textos_se_recortan_y_autor_es_la_sesion(client, base_pruebas, sql):
    response = crear(client, sql, base_pruebas["ciudadano_a"],
                     descripcion="   Basura acumulada en la esquina   ", id_ciudadano=base_pruebas["ciudadano_b"])
    assert response.status_code == 201
    assert response.json()["descripcion"] == "Basura acumulada en la esquina"
    assert response.json()["ciudadano"]["id_usuario"] == base_pruebas["ciudadano_a"]


# ---------- V-06 fotos inválidas ----------

@pytest.mark.parametrize("fotos, mensaje", [
    ([("a.jpg", JPEG, "image/jpeg")] * 4, "Adjunta entre 1 y 3 fotos"),
    ([], "Adjunta entre 1 y 3 fotos"),
    ([("falsa.jpg", GIF, "image/jpeg")], "Cada foto debe ser JPEG o PNG de hasta 2 MB"),
    ([("a.jpg", JPEG, "image/jpeg"), ("grande.jpg", JPEG_GRANDE, "image/jpeg")],
     "Cada foto debe ser JPEG o PNG de hasta 2 MB"),
    ([("vacia.jpg", b"", "image/jpeg")], "Cada foto debe ser JPEG o PNG de hasta 2 MB"),
], ids=["cuatro_fotos", "sin_fotos", "gif_renombrada", "mas_de_2mb", "vacia"])
def test_fotos_invalidas_v06(client, base_pruebas, sql, uploads_dir, fotos, mensaje):
    response = crear(client, sql, base_pruebas["ciudadano_a"], fotos=fotos)
    assert response.status_code == 422
    assert response.json() == {"detail": mensaje}
    assert contar(sql, "reporte") == 0 and contar(sql, "foto_reporte") == 0
    assert archivos_en_disco(uploads_dir) == []


@pytest.mark.parametrize("cambios, mensaje", [
    ({"descripcion": "  corta  "}, "Describe la incidencia (mínimo 10 caracteres)"),
    ({"referencia": "abc"}, "Indica una dirección o referencia (mínimo 5 caracteres)"),
    ({"latitud": 120}, "Marca la ubicación en el mapa"),
    ({"id_categoria": 999999}, "Categoría inválida"),
    ({"id_distrito": 999999}, "Distrito inválido"),
])
def test_datos_invalidos_422(client, base_pruebas, sql, uploads_dir, cambios, mensaje):
    response = crear(client, sql, base_pruebas["ciudadano_a"], **cambios)
    assert response.status_code == 422
    assert response.json() == {"detail": mensaje}
    assert contar(sql, "reporte") == 0 and archivos_en_disco(uploads_dir) == []


# ---------- listar y ver ----------

def test_mis_reportes_solo_propios_y_mas_reciente_primero(client, base_pruebas, sql):
    primero = crear(client, sql, base_pruebas["ciudadano_a"]).json()
    segundo = crear(client, sql, base_pruebas["ciudadano_a"]).json()
    crear(client, sql, base_pruebas["ciudadano_b"])

    lista = client.get("/reportes/mis-reportes", headers=cabecera(base_pruebas["ciudadano_a"])).json()
    assert [r["id_reporte"] for r in lista] == [segundo["id_reporte"], primero["id_reporte"]]
    assert all(set(r) == CLAVES_RESUMEN for r in lista)
    assert client.get("/reportes/mis-reportes", headers=cabecera(base_pruebas["operador"])).status_code == 403


def test_reporte_de_otro_ciudadano_404_v10(client, base_pruebas, sql):
    id_reporte = crear(client, sql, base_pruebas["ciudadano_a"]).json()["id_reporte"]
    otro = cabecera(base_pruebas["ciudadano_b"])
    assert client.get(f"/reportes/{id_reporte}", headers=otro).status_code == 404
    assert client.put(f"/reportes/{id_reporte}", json=datos_reporte(sql), headers=otro).status_code == 404
    assert client.delete(f"/reportes/{id_reporte}", headers=otro).status_code == 404
    assert client.get("/reportes/999999", headers=otro).json() == {"detail": "Reporte no encontrado"}

    detalle = client.get(f"/reportes/{id_reporte}", headers=cabecera(base_pruebas["operador"]))
    assert detalle.status_code == 200 and set(detalle.json()) == CLAVES_DETALLE
    assert contar(sql, "reporte") == 1


# ---------- V-09 editar ----------

def test_editar_v09(client, base_pruebas, sql):
    autor = cabecera(base_pruebas["ciudadano_a"])
    creado = crear(client, sql, base_pruebas["ciudadano_a"]).json()
    _, _, el_tambo = ids_catalogo(sql)
    cambios = datos_reporte(sql, descripcion="Hueco más grande que ayer", id_distrito=el_tambo,
                            latitud=-12.0601, longitud=-75.2101)
    response = client.put(f"/reportes/{creado['id_reporte']}", json=cambios, headers=autor)
    assert response.status_code == 200

    detalle = client.get(f"/reportes/{creado['id_reporte']}", headers=autor).json()
    assert detalle["descripcion"] == "Hueco más grande que ayer"
    assert detalle["distrito"]["nombre"] == "El Tambo"
    assert (detalle["latitud"], detalle["longitud"]) == (-12.0601, -75.2101)
    assert detalle["codigo"] == creado["codigo"] and detalle["estado"] == "RECIBIDO"
    assert detalle["fotos"] == creado["fotos"]
    assert len(detalle["historial"]) == 1  # editar no es una transición


def test_editar_sin_cambios_responde_200(client, base_pruebas, sql):
    creado = crear(client, sql, base_pruebas["ciudadano_a"]).json()
    response = client.put(f"/reportes/{creado['id_reporte']}", json=datos_reporte(sql),
                          headers=cabecera(base_pruebas["ciudadano_a"]))
    assert response.status_code == 200


def test_editar_datos_invalidos_422(client, base_pruebas, sql):
    creado = crear(client, sql, base_pruebas["ciudadano_a"]).json()
    response = client.put(f"/reportes/{creado['id_reporte']}", json=datos_reporte(sql, referencia="  "),
                          headers=cabecera(base_pruebas["ciudadano_a"]))
    assert response.status_code == 422
    assert response.json() == {"detail": "Indica una dirección o referencia (mínimo 5 caracteres)"}


# ---------- V-20 eliminar ----------

def test_eliminar_en_recibido_v20(client, base_pruebas, sql, uploads_dir):
    autor = cabecera(base_pruebas["ciudadano_a"])
    creado = crear(client, sql, base_pruebas["ciudadano_a"]).json()
    assert len(archivos_en_disco(uploads_dir)) == 2

    response = client.delete(f"/reportes/{creado['id_reporte']}", headers=autor)
    assert response.status_code == 204 and response.content == b""
    assert client.get(f"/reportes/{creado['id_reporte']}", headers=autor).status_code == 404
    assert client.get("/reportes/mis-reportes", headers=autor).json() == []
    assert archivos_en_disco(uploads_dir) == []
    assert contar(sql, "foto_reporte") == 0 and contar(sql, "historial_estado") == 0


# ---------- 409 fuera de RECIBIDO (RR-10, RR-11) ----------

@pytest.mark.parametrize("estado", ["ASIGNADO", "EN_ATENCION", "CERRADO", "RECHAZADO"])
def test_editar_o_eliminar_fuera_de_recibido_409(client, base_pruebas, sql, uploads_dir, estado):
    autor = cabecera(base_pruebas["ciudadano_a"])
    creado = crear(client, sql, base_pruebas["ciudadano_a"]).json()
    sql("UPDATE reporte SET estado = %s WHERE id_reporte = %s", (estado, creado["id_reporte"]))

    editar = client.put(f"/reportes/{creado['id_reporte']}",
                        json=datos_reporte(sql, descripcion="Intento de cambio tardío"), headers=autor)
    assert editar.status_code == 409
    assert editar.json() == {"detail": "El reporte no está en un estado que permita esta acción"}
    assert client.delete(f"/reportes/{creado['id_reporte']}", headers=autor).status_code == 409

    detalle = client.get(f"/reportes/{creado['id_reporte']}", headers=autor).json()
    assert detalle["estado"] == estado
    assert detalle["descripcion"] == "Hueco profundo en la calzada"
    assert len(archivos_en_disco(uploads_dir)) == 2
