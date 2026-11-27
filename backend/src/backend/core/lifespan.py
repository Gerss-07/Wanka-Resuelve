"""Ciclo de vida de la aplicación, sin requerir MySQL al iniciar."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from backend.core.config import get_settings
from backend.services.security import validar_configuracion_jwt


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Sin un JWT_SECRETO válido la aplicación no arranca (el error no incluye el valor).
    validar_configuracion_jwt(get_settings())
    yield
