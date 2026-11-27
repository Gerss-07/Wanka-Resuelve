"""Reglas para precargar cuentas de demostración."""

from backend.core.config import get_settings
from backend.repositories.usuarios import UsuarioRepository
from backend.services.security import hash_password


class UsuarioService:
    def __init__(self, repository: UsuarioRepository):
        self.repository = repository

    def crear_usuarios_semilla(self) -> tuple[int, int]:
        settings = get_settings()
        usuarios = []
        for correo, nombre, contrasena, rol in (
            (settings.operador_correo, settings.operador_nombre, settings.operador_contrasena, "OPERADOR"),
            (settings.demo_ciudadano_correo, settings.demo_ciudadano_nombre, settings.demo_ciudadano_contrasena, "CIUDADANO"),
        ):
            correo = correo.strip().lower()
            nombre = nombre.strip()
            if not 2 <= len(nombre) <= 100 or not 5 <= len(correo) <= 150 or not 8 <= len(contrasena) <= 128:
                raise ValueError("Datos de usuarios semilla incompletos o inválidos")
            usuarios.append((correo, nombre, contrasena, rol))

        if usuarios[0][0] == usuarios[1][0]:
            raise ValueError("Los usuarios semilla deben tener correos diferentes")

        ids = []
        for correo, nombre, contrasena, rol in usuarios:
            existente = self.repository.buscar_por_correo(correo)
            if existente:
                if existente["rol"] != rol:
                    raise ValueError("El usuario semilla existente tiene otro rol")
                ids.append(existente["id_usuario"])
            else:
                ids.append(self.repository.crear_usuario(nombre, correo, hash_password(contrasena), rol))
        return tuple(ids)
