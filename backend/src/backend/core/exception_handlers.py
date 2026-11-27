"""Traducción de errores de dominio al contrato HTTP."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from backend.schemas.auth import MENSAJES_AUTH
from backend.schemas.reportes import MENSAJES_CAMPO
from backend.services.exceptions import (
    Conflicto, DatosInvalidos, DomainError, NoAutorizado, NoEncontrado, SinPermiso,
)


MENSAJES_VALIDACION = {**MENSAJES_CAMPO, **MENSAJES_AUTH}


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

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        """Formato {"detail": "mensaje"} con el mensaje del campo (sección 8), sin detalles internos."""
        mensaje = "Datos inválidos"
        for error in exc.errors():
            loc = tuple(error.get("loc") or ())
            if len(loc) > 1 and loc[0] in ("body", "query", "path"):
                campo = loc[1]
            else:
                campo = loc[-1] if loc else None
            if campo in MENSAJES_VALIDACION:
                mensaje = MENSAJES_VALIDACION[campo]
                break
        return JSONResponse(status_code=422, content={"detail": mensaje})
