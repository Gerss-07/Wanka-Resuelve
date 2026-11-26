"""Funciones de hash; el JWT se implementa en la fase de autenticación."""

from argon2 import PasswordHasher


def hash_password(password: str) -> str:
    return PasswordHasher().hash(password)
