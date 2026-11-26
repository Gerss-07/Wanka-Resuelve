"""F0: pruebas con dobles; no conectan a las bases locales."""

from contextlib import contextmanager

from argon2 import PasswordHasher
from fastapi.testclient import TestClient
from mysql.connector import Error as MySQLError
from mysql.connector import IntegrityError
import pytest

from backend.core import database
from backend.core.config import Settings
from backend.core.dependencies import get_health_service
from backend.main import app
from backend.repositories.usuarios import UsuarioRepository
from backend.services.exceptions import Conflicto
from backend.services.health import HealthService
from backend.services import usuarios as usuarios_service


client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert client.get("/api/health").status_code == 404


def test_health_db(monkeypatch):
    service = HealthService()
    monkeypatch.setattr("backend.services.health.check_connection", lambda: True)
    app.dependency_overrides[get_health_service] = lambda: service
    try:
        assert client.get("/health/db").json() == {"status": "ok", "database": "disponible"}
        def fallar():
            raise MySQLError("detalle privado de conexión")
        monkeypatch.setattr("backend.services.health.check_connection", fallar)
        response = client.get("/health/db")
        assert response.status_code == 503
        assert response.json() == {"detail": "Base de datos no disponible"}
    finally:
        app.dependency_overrides.clear()


def test_configuracion_sin_leer_env_real():
    settings = Settings(
        _env_file=None, db_host="127.0.0.1", db_port=3307,
        db_nombre="wkPrueba", db_nombre_test="wkPrueba_test",
        db_usuario="root", db_contrasena="ficticia",
        cors_origenes="http://localhost:4200, http://127.0.0.1:4200",
    )
    assert settings.mysql_config()["database"] == "wkPrueba"
    assert settings.mysql_config(test=True)["database"] == "wkPrueba_test"
    assert settings.allowed_origins() == ["http://localhost:4200", "http://127.0.0.1:4200"]


class CursorFalso:
    def __init__(self, connection):
        self.connection = connection
        self.lastrowid = None

    def execute(self, sql, params=None):
        self.connection.consultas.append((sql, params))
        if sql.startswith("INSERT"):
            self.lastrowid = len(self.connection.usuarios) + 1
            _, correo, hash_contrasena, rol = params
            self.connection.usuarios[correo] = {
                "id_usuario": self.lastrowid, "rol": rol, "hash": hash_contrasena,
            }
        elif sql.startswith("SELECT") and params:
            self.connection.encontrado = self.connection.usuarios.get(params[0])
        else:
            self.connection.encontrado = None

    def fetchone(self):
        if self.connection.consultas[-1][0] == "SELECT 1":
            return (1,)
        return self.connection.encontrado

    def close(self):
        self.connection.cursores_cerrados += 1


class ConexionFalsa:
    def __init__(self):
        self.usuarios = {}
        self.consultas = []
        self.encontrado = None
        self.cursores_cerrados = 0
        self.commits = 0
        self.rollbacks = 0
        self.closed = False

    def cursor(self, **kwargs):
        return CursorFalso(self)

    def commit(self):
        self.commits += 1

    def rollback(self):
        self.rollbacks += 1

    def close(self):
        self.closed = True


def test_check_connection_select_1(monkeypatch):
    connection = ConexionFalsa()

    @contextmanager
    def fake_scope():
        yield connection

    monkeypatch.setattr(database, "connection_scope", fake_scope)
    assert database.check_connection()
    assert connection.consultas == [("SELECT 1", None)]
    assert connection.cursores_cerrados == 1


def test_connection_scope_commit_rollback_y_cierre(monkeypatch):
    connection = ConexionFalsa()
    monkeypatch.setattr(database.mysql.connector, "connect", lambda **kwargs: connection)
    monkeypatch.setattr(database, "get_settings", lambda: Settings(
        _env_file=None, db_host="127.0.0.1", db_nombre="wkPrueba",
        db_usuario="root", db_contrasena="ficticia",
    ))
    with database.connection_scope() as opened:
        assert opened is connection
    assert (connection.commits, connection.rollbacks, connection.closed) == (1, 0, True)
    connection.closed = False
    with pytest.raises(RuntimeError):
        with database.connection_scope():
            raise RuntimeError("fallo ficticio")
    assert (connection.commits, connection.rollbacks, connection.closed) == (1, 1, True)


def test_seed_argon2id_y_re_ejecutable(monkeypatch):
    connection = ConexionFalsa()
    settings = Settings(
        _env_file=None, operador_correo="OPERADOR@demo.test", operador_nombre="Operador Demo",
        operador_contrasena="clave-ficticia-1", demo_ciudadano_correo="ciudadano@demo.test",
        demo_ciudadano_nombre="Ciudadano Demo", demo_ciudadano_contrasena="clave-ficticia-2",
    )
    monkeypatch.setattr(usuarios_service, "get_settings", lambda: settings)
    service = usuarios_service.UsuarioService(UsuarioRepository(connection))
    assert service.crear_usuarios_semilla() == (1, 2)
    assert service.crear_usuarios_semilla() == (1, 2)
    assert len(connection.usuarios) == 2
    for correo, contrasena in (("operador@demo.test", "clave-ficticia-1"),
                               ("ciudadano@demo.test", "clave-ficticia-2")):
        hash_contrasena = connection.usuarios[correo]["hash"]
        assert hash_contrasena.startswith("$argon2id$")
        assert PasswordHasher().verify(hash_contrasena, contrasena)
    assert all("%s" in sql for sql, _ in connection.consultas)
    assert connection.cursores_cerrados == len(connection.consultas)


def test_correo_duplicado_se_traduce_sin_detalles():
    connection = ConexionFalsa()
    cursor = connection.cursor()

    def duplicado(sql, params):
        raise IntegrityError(errno=1062, msg="detalle privado")

    cursor.execute = duplicado
    connection.cursor = lambda **kwargs: cursor
    with pytest.raises(Conflicto, match="El correo ya está registrado"):
        UsuarioRepository(connection).crear_usuario("Demo", "demo@test.test", "hash", "CIUDADANO")
    assert connection.cursores_cerrados == 1
