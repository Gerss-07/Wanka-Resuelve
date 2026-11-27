"""Servicio de disponibilidad de MySQL."""

from backend.core.database import check_connection
from mysql.connector import Error as MySQLError


class HealthService:
    def check(self) -> bool:
        try:
            return check_connection()
        except (MySQLError, ValueError, OSError):
            return False
