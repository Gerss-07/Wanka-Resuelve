"""Rutas del ciudadano sobre sus reportes."""

from typing import Annotated

from fastapi import APIRouter, File, Form, Response, UploadFile, status

from backend.core.dependencies import AutenticadoDep, CiudadanoDep, ReporteServiceDep
from backend.schemas.reportes import (
    TAMANO_MAXIMO_FOTO, ReporteCreate, ReporteDetalle, ReporteResumen, ReporteUpdate,
)


router = APIRouter(prefix="/reportes", tags=["Reportes del ciudadano"])


@router.post("", response_model=ReporteDetalle, status_code=status.HTTP_201_CREATED)
def crear_reporte(
    usuario: CiudadanoDep,
    service: ReporteServiceDep,
    datos: Annotated[ReporteCreate, Form()],
    fotos: Annotated[
        list[UploadFile],
        File(
            description="De 1 a 3 fotos JPEG o PNG (el mismo campo se repite por cada foto)",
            # Swagger UI solo muestra selector de archivo con format: binary.
            # minItems/maxItems documentan el contrato; la validación real está en el servicio.
            json_schema_extra={
                "items": {"type": "string", "format": "binary"},
                "minItems": 1,
                "maxItems": 3,
            },
        ),
    ] = [],
):
    # Se lee como máximo un byte más del límite: si se alcanza, el servicio rechaza la foto.
    contenidos = [foto.file.read(TAMANO_MAXIMO_FOTO + 1) for foto in fotos]
    return service.crear(usuario, datos, contenidos)


# Debe declararse antes que /{id_reporte}; si no, "mis-reportes" se toma como id.
@router.get("/mis-reportes", response_model=list[ReporteResumen])
def mis_reportes(usuario: CiudadanoDep, service: ReporteServiceDep):
    return service.listar_mis_reportes(usuario)


@router.get("/{id_reporte}", response_model=ReporteDetalle)
def obtener_reporte(id_reporte: int, usuario: AutenticadoDep, service: ReporteServiceDep):
    return service.obtener(usuario, id_reporte)


@router.put("/{id_reporte}", response_model=ReporteDetalle)
def editar_reporte(
    id_reporte: int, datos: ReporteUpdate, usuario: CiudadanoDep, service: ReporteServiceDep
):
    return service.actualizar(usuario, id_reporte, datos)


@router.delete("/{id_reporte}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_reporte(id_reporte: int, usuario: CiudadanoDep, service: ReporteServiceDep):
    service.eliminar(usuario, id_reporte)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
