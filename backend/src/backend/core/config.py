"""Configuración leída de backend/.env sin registrar secretos."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    db_host: str = ""
    db_port: int = 3307
    db_nombre: str = ""
    db_usuario: str = ""
    db_contrasena: str = ""
    db_nombre_test: str = ""
    auth_modo: str = "dev"
    jwt_secreto: str = ""
    jwt_expira_minutos: int = 60
    cors_origenes: str = "http://localhost:4200,http://127.0.0.1:4200"
    uploads_dir: str = "uploads"
    operador_correo: str = ""
    operador_nombre: str = ""
    operador_contrasena: str = ""
    demo_ciudadano_correo: str = ""
    demo_ciudadano_nombre: str = ""
    demo_ciudadano_contrasena: str = ""

    def mysql_config(self, *, test: bool = False) -> dict[str, str | int]:
        nombre = self.db_nombre_test if test else self.db_nombre
        if not all((self.db_host, self.db_usuario, self.db_contrasena, nombre)):
            raise ValueError("Configuración de MySQL incompleta")
        if not 1 <= self.db_port <= 65535:
            raise ValueError("Puerto de MySQL inválido")
        return {
            "host": self.db_host,
            "port": self.db_port,
            "database": nombre,
            "user": self.db_usuario,
            "password": self.db_contrasena,
            "connection_timeout": 5,
        }

    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origenes.split(",") if origin.strip()]


def get_settings() -> Settings:
    return Settings()
