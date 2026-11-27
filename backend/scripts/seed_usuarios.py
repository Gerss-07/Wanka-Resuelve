"""Carga el operador y el ciudadano demo sin guardar contraseñas en el código."""

from mysql.connector import Error as MySQLError
from pydantic import ValidationError

from backend.core.database import connection_scope
from backend.repositories.usuarios import UsuarioRepository
from backend.services.exceptions import Conflicto
from backend.services.usuarios import UsuarioService


def main() -> None:
    try:
        with connection_scope() as connection:
            service = UsuarioService(UsuarioRepository(connection))
            id_operador, id_ciudadano = service.crear_usuarios_semilla()
    except (MySQLError, ValueError, ValidationError, OSError, Conflicto):
        raise SystemExit("No se pudieron cargar los usuarios semilla; comprueba la configuración y la base de datos") from None

    print(f"OPERADOR: id_usuario={id_operador}")
    print(f"CIUDADANO: id_usuario={id_ciudadano}")


if __name__ == "__main__":
    main()
