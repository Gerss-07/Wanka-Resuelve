"""Rutas de autenticación: registro, inicio de sesión y usuario actual."""

from fastapi import APIRouter, status

from backend.core.dependencies import AuthServiceDep, AutenticadoDep
from backend.schemas.auth import Token, Usuario, UsuarioLogin, UsuarioRegistro


router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/registro", response_model=Usuario, status_code=status.HTTP_201_CREATED)
def registro(datos: UsuarioRegistro, service: AuthServiceDep):
    return service.registrar(datos)


@router.post("/login", response_model=Token)
def login(datos: UsuarioLogin, service: AuthServiceDep):
    return service.login(datos)


@router.get("/me", response_model=Usuario)
def me(usuario: AutenticadoDep):
    return usuario
