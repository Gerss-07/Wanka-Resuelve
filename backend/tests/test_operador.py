"""F2: bandeja y transiciones del operador contra la base de pruebas."""

import pytest

from apoyo import (
    CLAVES_DETALLE, CLAVES_RESUMEN, cabecera, contar, crear, datos_reporte, id_categoria,
    id_distrito,
)


ESTADOS = ["RECIBIDO", "ASIGNADO", "EN_ATENCION", "CERRADO", "RECHAZADO"]
ORIGEN = {
    "asignar": "RECIBIDO",
    "rechazar": "RECIBIDO",
    "iniciar-atencion": "ASIGNADO",
    "cerrar": "EN_ATENCION",
}
MENSAJE_ESTADO = "El reporte no está en un estado que permita esta acción"
MENSAJE_ENTIDAD = "La entidad no atiende la categoría del reporte"


def id_entidad(sql, nombre: str) -> int:
    return sql("SELECT id_entidad FROM entidad_responsable WHERE nombre = %s", (nombre,))[0]["id_entidad"]


@pytest.fixture
def cuerpos(sql) -> dict:
    """Cuerpos válidos de cada acción (el reporte de prueba es de «Pistas y veredas»)."""
    return {
        "asignar": {"prioridad": "ALTA", "id_entidad": id_entidad(sql, "Unidad Simulada de Vías y Veredas")},
        "rechazar": {"motivo": "La foto no corresponde a la vía pública"},
        "iniciar-atencion": {"comentario": "La cuadrilla va en camino"},
        "cerrar": {"comentario_solucion": "Se rellenó el hueco con asfalto"},
    }


@pytest.fixture
def operador(base_pruebas) -> dict:
    return cabecera(base_pruebas["operador"])


@pytest.fixture
def reporte(client, base_pruebas, sql) -> dict:
    """Un reporte RECIBIDO del ciudadano A."""
    respuesta = crear(client, sql, base_pruebas["ciudadano_a"])
    assert respuesta.status_code == 201
    return respuesta.json()


def accion(client, id_reporte, nombre, headers, cuerpo=None):
    return client.post(f"/operador/reportes/{id_reporte}/{nombre}", json=cuerpo, headers=headers)


def forzar_estado(sql, id_reporte, estado):
    sql("UPDATE reporte SET estado = %s WHERE id_reporte = %s", (estado, id_reporte))


def historial(sql, id_reporte) -> list[dict]:
    return sql(
        "SELECT estado_anterior, estado_nuevo, id_usuario, comentario FROM historial_estado "
        "WHERE id_reporte = %s ORDER BY id_historial",
        (id_reporte,),
    )


def estado_actual(sql, id_reporte) -> str:
    return sql("SELECT estado FROM reporte WHERE id_reporte = %s", (id_reporte,))[0]["estado"]


# ---------- permisos (V-11) ----------

def test_ciudadano_no_usa_endpoints_del_operador_403_v11(client, base_pruebas, sql, reporte, cuerpos):
    autor = cabecera(base_pruebas["ciudadano_a"])
    assert client.get("/operador/reportes", headers=autor).status_code == 403
    for nombre, cuerpo in cuerpos.items():
        respuesta = accion(client, reporte["id_reporte"], nombre, autor, cuerpo)
        assert respuesta.status_code == 403, nombre
    assert estado_actual(sql, reporte["id_reporte"]) == "RECIBIDO"
    assert len(historial(sql, reporte["id_reporte"])) == 1
    assert contar(sql, "asignacion_reporte") == 0


def test_sin_sesion_401(client, reporte, cuerpos):
    assert client.get("/operador/reportes").status_code == 401
    assert accion(client, reporte["id_reporte"], "asignar", {}, cuerpos["asignar"]).status_code == 401


# ---------- asignar (V-14, V-15) ----------

def test_asignar_entidad_de_otra_categoria_422_v14(client, sql, reporte, operador):
    otra = id_entidad(sql, "Unidad Simulada de Limpieza Pública")
    for id_ent in (otra, 999999):
        respuesta = accion(client, reporte["id_reporte"], "asignar", operador,
                           {"prioridad": "ALTA", "id_entidad": id_ent})
        assert respuesta.status_code == 422
        assert respuesta.json() == {"detail": MENSAJE_ENTIDAD}
    assert estado_actual(sql, reporte["id_reporte"]) == "RECIBIDO"
    assert contar(sql, "asignacion_reporte") == 0
    assert len(historial(sql, reporte["id_reporte"])) == 1


def test_asignar_prioridad_invalida_422(client, sql, reporte, operador, cuerpos):
    respuesta = accion(client, reporte["id_reporte"], "asignar", operador,
                       {**cuerpos["asignar"], "prioridad": "URGENTE"})
    assert respuesta.status_code == 422
    assert respuesta.json() == {"detail": "Prioridad inválida"}
    assert estado_actual(sql, reporte["id_reporte"]) == "RECIBIDO"


def test_asignar_alta_con_entidad_correcta_v15(client, base_pruebas, sql, reporte, operador, cuerpos):
    respuesta = accion(client, reporte["id_reporte"], "asignar", operador, cuerpos["asignar"])
    assert respuesta.status_code == 200
    detalle = respuesta.json()
    assert set(detalle) == CLAVES_DETALLE
    assert detalle["estado"] == "ASIGNADO" and detalle["prioridad"] == "ALTA"
    assert detalle["entidad"] == {
        "id_entidad": cuerpos["asignar"]["id_entidad"],
        "nombre": "Unidad Simulada de Vías y Veredas",
        "id_categoria": id_categoria(sql, "Pistas y veredas"),
    }
    assert len(detalle["historial"]) == 2
    ultimo = detalle["historial"][-1]
    assert (ultimo["estado_anterior"], ultimo["estado_nuevo"]) == ("RECIBIDO", "ASIGNADO")
    assert ultimo["usuario"] == {"id_usuario": base_pruebas["operador"],
                                 "nombre": "Operador Prueba", "rol": "OPERADOR"}
    assert sql("SELECT id_entidad, prioridad FROM asignacion_reporte WHERE id_reporte = %s",
               (reporte["id_reporte"],)) == [{"id_entidad": cuerpos["asignar"]["id_entidad"],
                                              "prioridad": "ALTA"}]
    bandeja = client.get("/operador/reportes", headers=operador).json()
    assert bandeja[0]["prioridad"] == "ALTA"


# ---------- cerrar desde ASIGNADO (V-17) ----------

def test_cerrar_directamente_un_asignado_409_v17(client, sql, reporte, operador, cuerpos):
    assert accion(client, reporte["id_reporte"], "asignar", operador, cuerpos["asignar"]).status_code == 200
    respuesta = accion(client, reporte["id_reporte"], "cerrar", operador, cuerpos["cerrar"])
    assert respuesta.status_code == 409
    assert respuesta.json() == {"detail": MENSAJE_ESTADO}
    assert estado_actual(sql, reporte["id_reporte"]) == "ASIGNADO"
    assert len(historial(sql, reporte["id_reporte"])) == 2


# ---------- camino feliz completo (V-18) ----------

def test_iniciar_atencion_y_cerrar_v18(client, base_pruebas, sql, reporte, operador, cuerpos):
    id_reporte = reporte["id_reporte"]
    assert accion(client, id_reporte, "asignar", operador, cuerpos["asignar"]).status_code == 200

    iniciado = accion(client, id_reporte, "iniciar-atencion", operador, cuerpos["iniciar-atencion"])
    assert iniciado.status_code == 200 and iniciado.json()["estado"] == "EN_ATENCION"

    cerrado = accion(client, id_reporte, "cerrar", operador, cuerpos["cerrar"])
    assert cerrado.status_code == 200
    assert cerrado.json()["estado"] == "CERRADO"
    assert cerrado.json()["comentario_solucion"] == "Se rellenó el hueco con asfalto"

    filas = historial(sql, id_reporte)
    assert [(h["estado_anterior"], h["estado_nuevo"]) for h in filas] == [
        (None, "RECIBIDO"), ("RECIBIDO", "ASIGNADO"),
        ("ASIGNADO", "EN_ATENCION"), ("EN_ATENCION", "CERRADO"),
    ]
    assert [h["comentario"] for h in filas] == [
        None, None, "La cuadrilla va en camino", "Se rellenó el hueco con asfalto",
    ]
    assert all(h["id_usuario"] == base_pruebas["operador"] for h in filas[1:])

    # El ciudadano autor ve la solución, la entidad, la prioridad y las 4 filas.
    visto = client.get(f"/reportes/{id_reporte}", headers=cabecera(base_pruebas["ciudadano_a"])).json()
    assert visto["estado"] == "CERRADO"
    assert visto["comentario_solucion"] == "Se rellenó el hueco con asfalto"
    assert visto["motivo_rechazo"] is None
    assert visto["prioridad"] == "ALTA"
    assert visto["entidad"]["nombre"] == "Unidad Simulada de Vías y Veredas"
    assert len(visto["historial"]) == 4


@pytest.mark.parametrize("cuerpo", [None, {}, {"comentario": "   "}],
                         ids=["sin_cuerpo", "objeto_vacio", "solo_espacios"])
def test_iniciar_atencion_sin_comentario(client, sql, reporte, operador, cuerpos, cuerpo):
    assert accion(client, reporte["id_reporte"], "asignar", operador, cuerpos["asignar"]).status_code == 200
    respuesta = accion(client, reporte["id_reporte"], "iniciar-atencion", operador, cuerpo)
    assert respuesta.status_code == 200 and respuesta.json()["estado"] == "EN_ATENCION"
    assert historial(sql, reporte["id_reporte"])[-1]["comentario"] is None


def test_cerrar_sin_solucion_valida_422(client, sql, reporte, operador, cuerpos):
    forzar_estado(sql, reporte["id_reporte"], "EN_ATENCION")
    for cuerpo in ({}, {"comentario_solucion": "  corto  "}):
        respuesta = accion(client, reporte["id_reporte"], "cerrar", operador, cuerpo)
        assert respuesta.status_code == 422
        assert respuesta.json() == {"detail": "Describe la solución (mínimo 10 caracteres)"}
    assert estado_actual(sql, reporte["id_reporte"]) == "EN_ATENCION"


# ---------- rechazar (V-19) ----------

def test_rechazar_sin_motivo_y_con_motivo_v19(client, base_pruebas, sql, reporte, operador, cuerpos):
    id_reporte = reporte["id_reporte"]
    for cuerpo in ({}, {"motivo": "corto"}):
        respuesta = accion(client, id_reporte, "rechazar", operador, cuerpo)
        assert respuesta.status_code == 422
        assert respuesta.json() == {"detail": "Indica el motivo del rechazo (mínimo 10 caracteres)"}
    assert estado_actual(sql, id_reporte) == "RECIBIDO"

    respuesta = accion(client, id_reporte, "rechazar", operador, cuerpos["rechazar"])
    assert respuesta.status_code == 200
    assert respuesta.json()["estado"] == "RECHAZADO"
    assert respuesta.json()["motivo_rechazo"] == "La foto no corresponde a la vía pública"
    assert historial(sql, id_reporte)[-1] == {
        "estado_anterior": "RECIBIDO", "estado_nuevo": "RECHAZADO",
        "id_usuario": base_pruebas["operador"], "comentario": "La foto no corresponde a la vía pública",
    }

    # El ciudadano ve el motivo y ya no puede editar ni eliminar.
    autor = cabecera(base_pruebas["ciudadano_a"])
    visto = client.get(f"/reportes/{id_reporte}", headers=autor).json()
    assert visto["motivo_rechazo"] == "La foto no corresponde a la vía pública"
    assert visto["comentario_solucion"] is None and visto["entidad"] is None
    assert client.put(f"/reportes/{id_reporte}", json=datos_reporte(sql), headers=autor).status_code == 409
    assert client.delete(f"/reportes/{id_reporte}", headers=autor).status_code == 409


# ---------- 404 y 409 comunes (RR-11) ----------

@pytest.mark.parametrize("nombre", list(ORIGEN))
def test_reporte_inexistente_404(client, operador, cuerpos, nombre):
    respuesta = accion(client, 999999, nombre, operador, cuerpos[nombre])
    assert respuesta.status_code == 404
    assert respuesta.json() == {"detail": "Reporte no encontrado"}


@pytest.mark.parametrize("nombre, estado", [
    (nombre, estado) for nombre, origen in ORIGEN.items() for estado in ESTADOS if estado != origen
])
def test_transicion_invalida_409_no_cambia_nada(client, sql, reporte, operador, cuerpos, nombre, estado):
    id_reporte = reporte["id_reporte"]
    forzar_estado(sql, id_reporte, estado)
    filas_antes = historial(sql, id_reporte)

    respuesta = accion(client, id_reporte, nombre, operador, cuerpos[nombre])
    assert respuesta.status_code == 409
    assert respuesta.json() == {"detail": MENSAJE_ESTADO}
    assert estado_actual(sql, id_reporte) == estado
    assert historial(sql, id_reporte) == filas_antes
    assert contar(sql, "asignacion_reporte") == 0


# ---------- bandeja con filtros (V-13) ----------

@pytest.fixture
def bandeja_datos(client, base_pruebas, sql) -> dict:
    """Tres reportes con categoría, distrito, estado y fecha conocidos."""
    pistas = id_categoria(sql, "Pistas y veredas")
    limpieza = id_categoria(sql, "Limpieza pública y residuos")
    huancayo, el_tambo = id_distrito(sql, "Huancayo"), id_distrito(sql, "El Tambo")
    planes = {
        "r1": (base_pruebas["ciudadano_a"], pistas, huancayo, "RECIBIDO", "2026-11-01 10:00:00"),
        "r2": (base_pruebas["ciudadano_b"], limpieza, el_tambo, "RECIBIDO", "2026-11-15 23:59:59"),
        "r3": (base_pruebas["ciudadano_a"], pistas, el_tambo, "ASIGNADO", "2026-11-20 08:00:00"),
    }
    ids = {}
    for clave, (usuario, cat, dis, estado, fecha) in planes.items():
        id_reporte = crear(client, sql, usuario, id_categoria=cat, id_distrito=dis).json()["id_reporte"]
        sql("UPDATE reporte SET estado = %s, fecha_creacion = %s WHERE id_reporte = %s",
            (estado, fecha, id_reporte))
        ids[clave] = id_reporte
    return {"ids": ids, "pistas": pistas, "huancayo": huancayo, "el_tambo": el_tambo}


def test_bandeja_sin_filtros_del_mas_reciente_al_mas_antiguo(client, operador, bandeja_datos):
    ids = bandeja_datos["ids"]
    lista = client.get("/operador/reportes", headers=operador).json()
    assert [r["id_reporte"] for r in lista] == [ids["r3"], ids["r2"], ids["r1"]]
    assert all(set(r) == CLAVES_RESUMEN for r in lista)
    assert {r["ciudadano"]["nombre"] for r in lista} == {"Ana Prueba", "Beto Prueba"}


@pytest.mark.parametrize("filtros, esperados", [
    (lambda d: {"estado": "RECIBIDO"}, ["r2", "r1"]),
    (lambda d: {"estado": "ASIGNADO"}, ["r3"]),
    (lambda d: {"estado": "CERRADO"}, []),
    (lambda d: {"id_categoria": d["pistas"]}, ["r3", "r1"]),
    (lambda d: {"id_distrito": d["el_tambo"]}, ["r3", "r2"]),
    (lambda d: {"estado": "RECIBIDO", "id_distrito": d["huancayo"]}, ["r1"]),  # V-13
    (lambda d: {"fecha_desde": "2026-11-15", "fecha_hasta": "2026-11-15"}, ["r2"]),
    (lambda d: {"fecha_desde": "2026-11-16"}, ["r3"]),
    (lambda d: {"fecha_hasta": "2026-11-14"}, ["r1"]),
    (lambda d: {"fecha_desde": "2026-11-01", "fecha_hasta": "2026-11-20",
                "id_categoria": d["pistas"]}, ["r3", "r1"]),
], ids=["recibido", "asignado", "cerrado_vacio", "categoria", "distrito", "estado_y_distrito_v13",
        "un_dia_inclusivo", "desde", "hasta", "rango_y_categoria"])
def test_bandeja_filtros(client, operador, bandeja_datos, filtros, esperados):
    lista = client.get("/operador/reportes", params=filtros(bandeja_datos), headers=operador).json()
    assert [r["id_reporte"] for r in lista] == [bandeja_datos["ids"][c] for c in esperados]


@pytest.mark.parametrize("filtros, mensaje", [
    ({"fecha_desde": "15-11-2026"}, "Datos inválidos"),
    ({"fecha_hasta": "2026-13-01"}, "Datos inválidos"),
    ({"estado": "ABIERTO"}, "Datos inválidos"),
    ({"id_distrito": "abc"}, "Distrito inválido"),
    ({"id_categoria": "0"}, "Categoría inválida"),
])
def test_bandeja_filtros_invalidos_422(client, operador, filtros, mensaje):
    respuesta = client.get("/operador/reportes", params=filtros, headers=operador)
    assert respuesta.status_code == 422
    assert respuesta.json() == {"detail": mensaje}
