"""Configuración de pruebas: base aislada (DB_NOMBRE_TEST) y UPLOADS_DIR temporal.

La carpeta de fotos se fija ANTES de importar la app, porque /uploads se monta al importar.
Las pruebas con MySQL usan solo la base de pruebas; schema.sql la borra y la recrea en cada
corrida. Hay una guarda que se niega a continuar si el nombre de esa base no es seguro.
"""

import os
import re
import secrets
import shutil
import tempfile
from pathlib import Path

import pytest

_UPLOADS_TEMPORAL = Path(tempfile.mkdtemp(prefix="wanka_uploads_"))
os.environ["UPLOADS_DIR"] = str(_UPLOADS_TEMPORAL)
# Autenticación de prueba: secreto aleatorio por corrida, independiente del .env real.
os.environ["JWT_SECRETO"] = secrets.token_urlsafe(48)
os.environ["JWT_EXPIRA_MINUTOS"] = "60"
os.environ["AUTH_MODO"] = "dev"

from backend.core.config import get_settings  # noqa: E402
from backend.core.database import connection_scope, get_db  # noqa: E402
from backend.repositories.usuarios import UsuarioRepository  # noqa: E402

RAIZ = Path(__file__).resolve().parents[2]
BASES_PROTEGIDAS = {"wkprueba", "wankaresuelve_db"}
HASH_FICTICIO = "hash-ficticio-solo-para-pruebas"


def nombre_base_pruebas() -> str:
    """Devuelve DB_NOMBRE_TEST o detiene pytest si no es seguro usarlo."""
    settings = get_settings()
    nombre = settings.db_nombre_test.strip()
    if (
        not nombre.endswith("_test")
        or nombre.lower() == settings.db_nombre.strip().lower()
        or nombre.lower() in BASES_PROTEGIDAS
    ):
        pytest.exit("DB_NOMBRE_TEST no es una base de pruebas segura; no se ejecuta schema.sql", returncode=2)
    return nombre


def sentencias_sql(ruta: Path) -> list[str]:
    """Quita comentarios '-- ' y divide el script en sentencias."""
    texto = re.sub(r"(^|\s)-- .*$", "", ruta.read_text(encoding="utf-8"), flags=re.MULTILINE)
    return [s.strip() for s in texto.split(";") if s.strip()]


def ejecutar_en_base_pruebas(sql: str, params: tuple = ()) -> list[dict]:
    nombre_base_pruebas()
    with connection_scope(test=True) as conexion:
        cursor = conexion.cursor(dictionary=True)
        try:
            cursor.execute(sql, params)
            return cursor.fetchall() if cursor.with_rows else []
        finally:
            cursor.close()


@pytest.fixture(scope="session")
def base_pruebas():
    """Recrea las tablas en la base de pruebas, carga catálogos y crea usuarios de prueba."""
    nombre = nombre_base_pruebas()
    with connection_scope(test=True) as conexion:
        cursor = conexion.cursor()
        try:
            cursor.execute("SELECT DATABASE()")
            # En Windows MySQL puede devolver el nombre en minúsculas (lower_case_table_names).
            actual = cursor.fetchone()[0]
            if actual is None or actual.lower() != nombre.lower():
                pytest.exit("La conexión de pruebas no apunta a DB_NOMBRE_TEST", returncode=2)
            for archivo in ("schema.sql", "seed.sql"):
                for sentencia in sentencias_sql(RAIZ / "database" / archivo):
                    cursor.execute(sentencia)
        finally:
            cursor.close()
        repo = UsuarioRepository(conexion)
        usuarios = {
            "ciudadano_a": repo.crear_usuario("Ana Prueba", "ana@prueba.test", HASH_FICTICIO, "CIUDADANO"),
            "ciudadano_b": repo.crear_usuario("Beto Prueba", "beto@prueba.test", HASH_FICTICIO, "CIUDADANO"),
            "operador": repo.crear_usuario("Operador Prueba", "operador@prueba.test", HASH_FICTICIO, "OPERADOR"),
        }
    yield usuarios
    shutil.rmtree(_UPLOADS_TEMPORAL, ignore_errors=True)


@pytest.fixture
def uploads_dir() -> Path:
    return _UPLOADS_TEMPORAL


@pytest.fixture
def client(base_pruebas, uploads_dir):
    """TestClient contra la base de pruebas; limpia reportes y fotos antes de cada prueba."""
    from fastapi.testclient import TestClient

    from backend.main import app

    ejecutar_en_base_pruebas("DELETE FROM reporte")
    shutil.rmtree(uploads_dir / "reportes", ignore_errors=True)

    def get_db_pruebas():
        with connection_scope(test=True) as conexion:
            yield conexion

    app.dependency_overrides[get_db] = get_db_pruebas
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def sql():
    """Ejecuta SQL parametrizado en la base de pruebas (para preparar o comprobar estados)."""
    return ejecutar_en_base_pruebas
