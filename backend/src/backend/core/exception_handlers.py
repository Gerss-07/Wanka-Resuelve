"""Traducción de errores de dominio al contrato HTTP."""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from backend.services.exceptions import (
    Conflicto, DatosInvalidos, DomainError, NoAutorizado, NoEncontrado, SinPermiso,
)


def register_exception_handlers(app: FastAPI) -> None:
    statuses = {
        NoAutorizado: 401,
        SinPermiso: 403,
        NoEncontrado: 404,
        Conflicto: 409,
        DatosInvalidos: 422,
    }

    @app.exception_handler(DomainError)
    async def domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
        return JSONResponse(
            status_code=statuses.get(type(exc), 500),
            content={"detail": str(exc) if type(exc) in statuses else "Error interno"},
        )
