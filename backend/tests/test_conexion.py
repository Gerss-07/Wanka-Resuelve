"""Cada conexión fija la zona horaria de Perú (UTC-5) en su sesión."""

from backend.core.database import ZONA_HORARIA_SESION


def test_sesion_usa_hora_de_peru(base_pruebas, sql):
    assert ZONA_HORARIA_SESION == "-05:00"
    fila = sql(
        "SELECT @@session.time_zone AS zona, "
        "TIMESTAMPDIFF(MINUTE, UTC_TIMESTAMP(), NOW()) AS diferencia_minutos"
    )[0]
    assert fila["zona"] == "-05:00"
    assert fila["diferencia_minutos"] == -300
