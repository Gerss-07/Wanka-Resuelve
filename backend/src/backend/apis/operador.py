"""Rutas del operador: bandeja y transiciones de estado."""

from typing import Annotated

from fastapi import APIRouter, Body, Query

from backend.core.dependencies import OperadorDep, OperadorServiceDep
from backend.schemas.reportes import (
    ReporteAsignar, ReporteCerrar, ReporteDetalle, ReporteFiltros, ReporteIniciarAtencion,
    ReporteRechazar, ReporteResumen,
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


@router.post("/{id_reporte}/iniciar-atencion", response_model=ReporteDetalle)
def iniciar_atencion(
    id_reporte: int,
    usuario: OperadorDep,
    service: OperadorServiceDep,
    datos: Annotated[ReporteIniciarAtencion | None, Body()] = None,
):
    return service.iniciar_atencion(usuario, id_reporte, datos or ReporteIniciarAtencion())


@router.post("/{id_reporte}/cerrar", response_model=ReporteDetalle)
def cerrar(id_reporte: int, datos: ReporteCerrar, usuario: OperadorDep,
           service: OperadorServiceDep):
    return service.cerrar(usuario, id_reporte, datos)
