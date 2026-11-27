"""Rutas del operador: bandeja y transiciones de estado."""

from typing import Annotated

from fastapi import APIRouter, Query

from backend.core.dependencies import OperadorDep, OperadorServiceDep
from backend.schemas.reportes import (
    ReporteAsignar, ReporteDetalle, ReporteFiltros, ReporteRechazar, ReporteResumen,
)


router = APIRouter(prefix="/operador/reportes", tags=["Operador"])


@router.get("", response_model=list[ReporteResumen])
def bandeja(
    usuario: OperadorDep, service: OperadorServiceDep, filtros: Annotated[ReporteFiltros, Query()]
):
    return service.bandeja(filtros)


@router.post("/{id_reporte}/asignar", response_model=ReporteDetalle)
def asignar(id_reporte: int, datos: ReporteAsignar, usuario: OperadorDep,
            service: OperadorServiceDep):
    return service.asignar(usuario, id_reporte, datos)


@router.post("/{id_reporte}/rechazar", response_model=ReporteDetalle)
def rechazar(id_reporte: int, datos: ReporteRechazar, usuario: OperadorDep,
             service: OperadorServiceDep):
    return service.rechazar(usuario, id_reporte, datos)
