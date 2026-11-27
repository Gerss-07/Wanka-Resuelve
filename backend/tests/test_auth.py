"""F5 parte A: registro, login, /auth/me, JWT y convivencia con el modo dev."""

import base64
import json
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import jwt
import pytest
from argon2 import PasswordHasher
from fastapi.testclient import TestClient

from apoyo import JPEG, cabecera, datos_reporte
from backend.core.config import get_settings
from backend.main import app
from backend.services.security import hash_password


CONTRASENA = "clave-de-prueba-123"
CLAVES_USUARIO = {"id_usuario", "nombre", "correo", "rol"}
CREDENCIALES_INVALIDAS = {"detail": "Credenciales inválidas"}


def correo_unico(prefijo: str = "persona") -> str:
    return f"{prefijo}.{uuid4().hex[:10]}@demo.test"


def registrar(client, correo=None, nombre="Ana Demo", contrasena=CONTRASENA, **extra):
    cuerpo = {"nombre": nombre, "correo": correo or correo_unico(), "contrasena": contrasena, **extra}
    return client.post("/auth/registro", json=cuerpo)


def login(client, correo, contrasena=CONTRASENA):
    return client.post("/auth/login", json={"correo": correo, "contrasena": contrasena})


def bearer(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def token_de(client, correo, contrasena=CONTRASENA) -> str:
    respuesta = login(client, correo, contrasena)
    assert respuesta.status_code == 200
    return respuesta.json()["access_token"]


def firmar(claims: dict, secreto: str | None = None) -> str:
    return jwt.encode(claims, secreto or get_settings().jwt_secreto, algorithm="HS256")


def claims_validos(id_usuario: int, rol: str = "CIUDADANO") -> dict:
    ahora = datetime.now(timezone.utc)
    return {"sub": str(id_usuario), "rol": rol, "iat": ahora, "exp": ahora + timedelta(minutes=5)}


def sin_secretos(respuesta) -> None:
    texto = respuesta.text
    assert "contrasena" not in texto and "$argon2" not in texto


@pytest.fixture
def ciudadano(client) -> dict:
    """Ciudadano registrado por la API, con su token."""
    correo = correo_unico("ciudadano")
    usuario = registrar(client, correo=correo).json()
    return {**usuario, "token": token_de(client, correo)}


@pytest.fixture
def operador_real(client, sql) -> dict:
    """Operador precargado como lo haría el script semilla (hash Argon2id real)."""
    correo = correo_unico("operador")
    sql("INSERT INTO usuario (nombre, correo, contrasena_hash, rol) VALUES (%s, %s, %s, %s)",
        ("Operador Real", correo, hash_password(CONTRASENA), "OPERADOR"))
    return {"correo": correo, "token": token_de(client, correo)}


# ---------- registro (V-01, V-02) ----------

def test_registro_crea_ciudadano_con_hash_argon2id_v01(client, sql):
    respuesta = registrar(client, correo="  Ana.Nueva@Demo.TEST ", nombre="  Ana Nueva  ")
    assert respuesta.status_code == 201
    usuario = respuesta.json()
    assert set(usuario) == CLAVES_USUARIO
    assert usuario["rol"] == "CIUDADANO"
    assert usuario["correo"] == "ana.nueva@demo.test" and usuario["nombre"] == "Ana Nueva"
    sin_secretos(respuesta)

    fila = sql("SELECT correo, rol, contrasena_hash FROM usuario WHERE id_usuario = %s",
               (usuario["id_usuario"],))[0]
    assert fila["correo"] == "ana.nueva@demo.test" and fila["rol"] == "CIUDADANO"
    assert fila["contrasena_hash"].startswith("$argon2id$")
    assert PasswordHasher().verify(fila["contrasena_hash"], CONTRASENA)


def test_registro_ignora_el_rol_enviado(client, sql):
    respuesta = registrar(client, rol="OPERADOR", id_usuario=1)
    assert respuesta.status_code == 201
    assert respuesta.json()["rol"] == "CIUDADANO"
    assert sql("SELECT rol FROM usuario WHERE id_usuario = %s",
               (respuesta.json()["id_usuario"],))[0]["rol"] == "CIUDADANO"


def test_registro_con_correo_repetido_409_v02(client, sql):
    correo = correo_unico()
    assert registrar(client, correo=correo).status_code == 201
    for variante in (correo, correo.upper()):
        respuesta = registrar(client, correo=variante, nombre="Otra Persona")
        assert respuesta.status_code == 409
        assert respuesta.json() == {"detail": "El correo ya está registrado"}
    assert sql("SELECT COUNT(*) AS n FROM usuario WHERE correo = %s", (correo,))[0]["n"] == 1


@pytest.mark.parametrize("cambios, mensaje", [
    ({"nombre": "A"}, "El nombre debe tener entre 2 y 100 caracteres"),
    ({"nombre": "   "}, "El nombre debe tener entre 2 y 100 caracteres"),
    ({"nombre": "N" * 101}, "El nombre debe tener entre 2 y 100 caracteres"),
    ({"correo": "no-es-un-correo"}, "Correo inválido"),
    ({"correo": "x" * 141 + "@demo.test"}, "Correo inválido"),  # 151 caracteres
    ({"contrasena": "1234567"}, "La contraseña debe tener al menos 8 caracteres"),
    ({"contrasena": "c" * 129}, "La contraseña debe tener al menos 8 caracteres"),
])
def test_registro_datos_invalidos_422(client, cambios, mensaje):
    respuesta = registrar(client, **cambios)
    assert respuesta.status_code == 422
    assert respuesta.json() == {"detail": mensaje}


def test_registro_acepta_correo_de_150_caracteres(client):
    correo = uuid4().hex[:10] + "x" * 130 + "@demo.test"
    assert len(correo) == 150
    assert registrar(client, correo=correo).status_code == 201


# ---------- login (V-03, V-04) ----------

def test_login_con_contrasena_incorrecta_o_correo_inexistente_401_v03(client, ciudadano):
    incorrecta = login(client, ciudadano["correo"], "otra-clave-incorrecta")
    inexistente = login(client, correo_unico("nadie"), CONTRASENA)
    assert incorrecta.status_code == inexistente.status_code == 401
    assert incorrecta.json() == inexistente.json() == CREDENCIALES_INVALIDAS
    assert "access_token" not in incorrecta.text


def test_login_correcto_devuelve_token_v04(client, ciudadano):
    respuesta = login(client, ciudadano["correo"].upper())
    assert respuesta.status_code == 200
    cuerpo = respuesta.json()
    assert set(cuerpo) == {"access_token", "token_type", "expires_in", "usuario"}
    assert cuerpo["token_type"] == "bearer" and cuerpo["expires_in"] == 3600
    assert cuerpo["usuario"] == {k: ciudadano[k] for k in CLAVES_USUARIO}
    sin_secretos(respuesta)

    claims = jwt.decode(cuerpo["access_token"], get_settings().jwt_secreto, algorithms=["HS256"])
    assert set(claims) == {"sub", "rol", "iat", "exp"}
    assert claims["sub"] == str(ciudadano["id_usuario"]) and claims["rol"] == "CIUDADANO"
    assert claims["exp"] - claims["iat"] == 3600


def test_auth_me_con_token(client, ciudadano):
    respuesta = client.get("/auth/me", headers=bearer(ciudadano["token"]))
    assert respuesta.status_code == 200
    assert respuesta.json() == {k: ciudadano[k] for k in CLAVES_USUARIO}
    sin_secretos(respuesta)


# ---------- sin sesión (V-12, parte API) ----------

@pytest.mark.parametrize("ruta", ["/auth/me", "/reportes/mis-reportes", "/operador/reportes", "/categorias"])
def test_sin_token_ni_cabecera_dev_401_v12(client, ruta):
    assert client.get(ruta).status_code == 401


# ---------- tokens inválidos ----------

def _payload_alterado(token: str, **cambios) -> str:
    cabecera_b64, payload_b64, firma = token.split(".")
    payload = json.loads(base64.urlsafe_b64decode(payload_b64 + "=" * (-len(payload_b64) % 4)))
    payload.update(cambios)
    nuevo = base64.urlsafe_b64encode(json.dumps(payload).encode()).rstrip(b"=").decode()
    return f"{cabecera_b64}.{nuevo}.{firma}"


@pytest.mark.parametrize("caso", [
    "vencido", "otro_secreto", "payload_alterado", "firma_alterada", "alg_none", "sin_exp",
    "usuario_inexistente", "sub_no_numerico", "basura",
])
def test_token_invalido_401(client, ciudadano, caso):
    ahora = datetime.now(timezone.utc)
    validos = claims_validos(ciudadano["id_usuario"])
    tokens = {
        "vencido": lambda: firmar({**validos, "iat": ahora - timedelta(hours=2),
                                   "exp": ahora - timedelta(hours=1)}),
        "otro_secreto": lambda: firmar(validos, "otro-secreto-de-al-menos-32-caracteres!!"),
        "payload_alterado": lambda: _payload_alterado(ciudadano["token"], sub="1", rol="OPERADOR"),
        "firma_alterada": lambda: ciudadano["token"][:-4] + ("AAAA" if not ciudadano["token"].endswith("AAAA") else "BBBB"),
        "alg_none": lambda: jwt.encode(validos, None, algorithm="none"),
        "sin_exp": lambda: firmar({k: v for k, v in validos.items() if k != "exp"}),
        "usuario_inexistente": lambda: firmar({**validos, "sub": "999999"}),
        "sub_no_numerico": lambda: firmar({**validos, "sub": "abc"}),
        "basura": lambda: "esto-no-es-un-jwt",
    }
    respuesta = client.get("/auth/me", headers=bearer(tokens[caso]()))
    assert respuesta.status_code == 401
    assert respuesta.json() == {"detail": "No autenticado"}


@pytest.mark.parametrize("authorization", ["Bearer", "Bearer    ", "Basic dXN1YXJpbzpjbGF2ZQ==", "token-suelto"])
def test_authorization_mal_formado_401_sin_pasar_al_modo_dev(client, base_pruebas, authorization):
    # Aunque venga la cabecera dev válida, una Authorization inválida no cae al modo dev.
    headers = {"Authorization": authorization, **cabecera(base_pruebas["operador"])}
    assert client.get("/auth/me", headers=headers).status_code == 401


def test_bearer_tiene_prioridad_sobre_la_cabecera_dev(client, base_pruebas, ciudadano):
    headers = {**bearer(ciudadano["token"]), **cabecera(base_pruebas["operador"])}
    respuesta = client.get("/auth/me", headers=headers)
    assert respuesta.status_code == 200
    assert respuesta.json()["id_usuario"] == ciudadano["id_usuario"]


def test_modo_dev_sigue_funcionando(client, base_pruebas):
    respuesta = client.get("/auth/me", headers=cabecera(base_pruebas["ciudadano_a"]))
    assert respuesta.status_code == 200 and respuesta.json()["nombre"] == "Ana Prueba"


def test_sin_auth_modo_dev_la_cabecera_dev_da_401(client, base_pruebas, ciudadano, monkeypatch):
    monkeypatch.setenv("AUTH_MODO", "jwt")
    assert client.get("/auth/me", headers=cabecera(base_pruebas["ciudadano_a"])).status_code == 401
    assert client.get("/auth/me", headers=bearer(ciudadano["token"])).status_code == 200


# ---------- reportes y operador con token ----------

def test_reportes_y_operador_con_token(client, sql, ciudadano, operador_real):
    archivos = [("fotos", ("a.jpg", JPEG, "image/jpeg"))]
    creado = client.post("/reportes", data=datos_reporte(sql), files=archivos,
                         headers=bearer(ciudadano["token"]))
    assert creado.status_code == 201
    assert creado.json()["ciudadano"]["id_usuario"] == ciudadano["id_usuario"]
    sin_secretos(creado)
    id_reporte = creado.json()["id_reporte"]

    lista = client.get("/reportes/mis-reportes", headers=bearer(ciudadano["token"])).json()
    assert [r["id_reporte"] for r in lista] == [id_reporte]

    # Permisos por rol también con token.
    assert client.get("/operador/reportes", headers=bearer(ciudadano["token"])).status_code == 403
    assert client.post("/reportes", data=datos_reporte(sql), files=archivos,
                       headers=bearer(operador_real["token"])).status_code == 403

    id_entidad = sql("SELECT id_entidad FROM entidad_responsable WHERE nombre = %s",
                     ("Unidad Simulada de Vías y Veredas",))[0]["id_entidad"]
    asignado = client.post(f"/operador/reportes/{id_reporte}/asignar",
                           json={"prioridad": "MEDIA", "id_entidad": id_entidad},
                           headers=bearer(operador_real["token"]))
    assert asignado.status_code == 200 and asignado.json()["estado"] == "ASIGNADO"
    assert asignado.json()["historial"][-1]["usuario"]["nombre"] == "Operador Real"
    sin_secretos(asignado)


# ---------- arranque ----------

@pytest.mark.parametrize("secreto", ["", "demasiado-corto"])
def test_la_app_no_arranca_sin_jwt_secreto_valido(monkeypatch, secreto):
    monkeypatch.setenv("JWT_SECRETO", secreto)
    with pytest.raises(ValueError, match="JWT_SECRETO"):
        with TestClient(app):
            pass
