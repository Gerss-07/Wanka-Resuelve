"""Pruebas sin tocar MySQL ni los usuarios del entorno local."""

from argon2 import PasswordHasher
from fastapi.testclient import TestClient
from mysql.connector import Error as MySQLError

from backend.apis import health_api
from backend.config import cors_origenes, db_config
from backend.main import app
from backend.repositories import usuario_seed_repository
from backend.services import seed_usuarios_service


client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_health_db_disponible(monkeypatch):
    monkeypatch.setattr(health_api, "mysql_disponible", lambda: True)
    response = client.get("/health/db")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "disponible"}


def test_health_db_no_expone_errores(monkeypatch):
    def fallar():
        raise MySQLError("detalles internos de la conexión")

    monkeypatch.setattr(health_api, "mysql_disponible", fallar)
    response = client.get("/health/db")
    assert response.status_code == 503
    assert response.json() == {"detail": "Base de datos no disponible"}


def test_configuracion(monkeypatch):
    for key, value in {
        "DB_HOST": "127.0.0.1", "DB_PORT": "3307", "DB_USUARIO": "root",
        "DB_CONTRASENA": "valor-ficticio", "DB_NOMBRE": "wkPrueba",
        "DB_NOMBRE_TEST": "wkPrueba_test", "CORS_ORIGENES": "http://localhost:4200, http://127.0.0.1:4200",
    }.items():
        monkeypatch.setenv(key, value)
    assert db_config()["database"] == "wkPrueba"
    assert db_config(test=True)["database"] == "wkPrueba_test"
    assert db_config()["port"] == 3307
    assert cors_origenes() == ["http://localhost:4200", "http://127.0.0.1:4200"]
    monkeypatch.setenv("DB_PORT", "invalid")
    try:
        db_config()
    except ValueError as exc:
        assert str(exc) == "Puerto de MySQL inválido"
    else:
        raise AssertionError("El puerto inválido debe rechazarse")


class CursorFalso:
    def __init__(self, connection):
        self.connection = connection
        self.lastrowid = None

    def execute(self, sql, params):
        self.connection.consultas.append((sql, params))
        if sql.startswith("INSERT"):
            self.lastrowid = len(self.connection.usuarios) + 1
            nombre, correo, hash_contrasena, rol = params
            self.connection.usuarios[correo] = (self.lastrowid, rol, hash_contrasena)
        elif sql.startswith("SELECT"):
            self.connection.encontrado = self.connection.usuarios.get(params[0])

    def fetchone(self):
        return self.connection.encontrado[:2] if self.connection.encontrado else None

    def close(self):
        pass


class ConexionFalsa:
    def __init__(self):
        self.usuarios = {}
        self.consultas = []
        self.encontrado = None

    def cursor(self):
        return CursorFalso(self)

    def commit(self):
        pass

    def rollback(self):
        pass

    def close(self):
        pass


def test_seed_usuarios_parametrizado_argon2id_y_re_ejecutable(monkeypatch):
    connection = ConexionFalsa()
    monkeypatch.setattr(seed_usuarios_service, "conectar", lambda: connection)
    datos = (
        ("OPERADOR", "operador@demo.test", "Operador Demo", "clave-ficticia-1"),
        ("DEMO_CIUDADANO", "ciudadano@demo.test", "Ciudadano Demo", "clave-ficticia-2"),
    )
    for prefijo, correo, nombre, contrasena in datos:
        monkeypatch.setenv(f"{prefijo}_CORREO", correo)
        monkeypatch.setenv(f"{prefijo}_NOMBRE", nombre)
        monkeypatch.setenv(f"{prefijo}_CONTRASENA", contrasena)
    ids = seed_usuarios_service.crear_usuarios_semilla()
    assert ids == (1, 2)
    assert seed_usuarios_service.crear_usuarios_semilla() == ids
    assert len(connection.usuarios) == 2
    for _, correo, _, contrasena in datos:
        hash_contrasena = connection.usuarios[correo][2]
        assert hash_contrasena.startswith("$argon2id$")
        assert PasswordHasher().verify(hash_contrasena, contrasena)
    assert all("%s" in sql for sql, _ in connection.consultas)
    assert all("@demo.test" not in sql for sql, _ in connection.consultas)


def test_repositorio_busca_por_correo():
    connection = ConexionFalsa()
    usuario_seed_repository.crear_usuario(connection, "Demo", "demo@test.example", "hash", "OPERADOR")
    assert usuario_seed_repository.buscar_por_correo(connection, "demo@test.example") == (1, "OPERADOR")
    assert usuario_seed_repository.buscar_por_correo(connection, "inexistente@test.example") is None
