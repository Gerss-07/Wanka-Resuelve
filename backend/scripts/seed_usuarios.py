"""Carga el operador y el ciudadano demo sin guardar contraseñas en el código."""

from mysql.connector import Error as MySQLError

import backend.config  # Carga backend/.env antes de leer las variables.
from backend.services.seed_usuarios_service import crear_usuarios_semilla


def main() -> None:
    try:
        id_operador, id_ciudadano = crear_usuarios_semilla()
    except (MySQLError, ValueError, OSError):
        raise SystemExit("No se pudieron cargar los usuarios semilla; comprueba la configuración y la base de datos") from None

    print(f"OPERADOR: id_usuario={id_operador}")
    print(f"CIUDADANO: id_usuario={id_ciudadano}")


if __name__ == "__main__":
    main()
