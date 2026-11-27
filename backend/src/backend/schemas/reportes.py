"""Contratos de entrada y salida de reportes (secciones 7 y 8)."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from backend.schemas.auth import Rol
from backend.schemas.catalogos import Categoria, Distrito, Entidad


Estado = Literal["RECIBIDO", "RECHAZADO", "ASIGNADO", "EN_ATENCION", "CERRADO"]
Prioridad = Literal["BAJA", "MEDIA", "ALTA"]

MIN_FOTOS = 1
MAX_FOTOS = 3
TAMANO_MAXIMO_FOTO = 2_000_000

MENSAJE_FOTOS_CANTIDAD = "Adjunta entre 1 y 3 fotos"
MENSAJE_FOTO_INVALIDA = "Cada foto debe ser JPEG o PNG de hasta 2 MB"

# Mensaje que se devuelve cuando falla la validación de cada campo (sección 8).
MENSAJES_CAMPO = {
    "id_categoria": "Categoría inválida",
    "id_distrito": "Distrito inválido",
    "descripcion": "Describe la incidencia (mínimo 10 caracteres)",
    "referencia": "Indica una dirección o referencia (mínimo 5 caracteres)",
    "latitud": "Marca la ubicación en el mapa",
    "longitud": "Marca la ubicación en el mapa",
    "fotos": MENSAJE_FOTOS_CANTIDAD,
    "prioridad": "Prioridad inválida",
    "id_entidad": "La entidad no atiende la categoría del reporte",
    "motivo": "Indica el motivo del rechazo (mínimo 10 caracteres)",
}


class ReporteCreate(BaseModel):
    """Campos que registra el ciudadano (RR-02). El autor sale de la sesión."""

    model_config = ConfigDict(str_strip_whitespace=True)

    id_categoria: int = Field(gt=0)
    id_distrito: int = Field(gt=0)
    descripcion: str = Field(min_length=10, max_length=1000)
    referencia: str = Field(min_length=5, max_length=255)
    latitud: float = Field(ge=-90, le=90)
    longitud: float = Field(ge=-180, le=180)


class ReporteUpdate(ReporteCreate):
    """Campos editables en RECIBIDO (RR-04); las fotos no se editan."""


class ReporteFiltros(BaseModel):
    """Filtros opcionales de la bandeja del operador (fechas AAAA-MM-DD)."""

    model_config = ConfigDict(extra="ignore")

    estado: Estado | None = None
    id_categoria: int | None = Field(default=None, gt=0)
    id_distrito: int | None = Field(default=None, gt=0)
    fecha_desde: date | None = None
    fecha_hasta: date | None = None


class ReporteAsignar(BaseModel):
    """RR-06: prioridad manual y entidad de la misma categoría del reporte."""

    prioridad: Prioridad
    id_entidad: int = Field(gt=0)


class ReporteRechazar(BaseModel):
    """RR-07: motivo obligatorio; se guarda en historial_estado.comentario."""

    model_config = ConfigDict(str_strip_whitespace=True)

    motivo: str = Field(min_length=10, max_length=500)


class ReporteIniciarAtencion(BaseModel):
    """RR-08: comentario opcional (vacío se guarda como NULL)."""

    model_config = ConfigDict(str_strip_whitespace=True)

    comentario: str | None = Field(default=None, max_length=1000)


class UsuarioReferencia(BaseModel):
    id_usuario: int
    nombre: str


class UsuarioHistorial(UsuarioReferencia):
    rol: Rol


class Foto(BaseModel):
    id_foto: int
    url: str


class HistorialEstado(BaseModel):
    estado_anterior: Estado | None
    estado_nuevo: Estado
    usuario: UsuarioHistorial
    comentario: str | None
    fecha: datetime


class ReporteResumen(BaseModel):
    id_reporte: int
    codigo: str
    ciudadano: UsuarioReferencia
    categoria: Categoria
    distrito: Distrito
    estado: Estado
    prioridad: Prioridad | None
    fecha_creacion: datetime


class ReporteDetalle(ReporteResumen):
    descripcion: str
    referencia: str
    latitud: float
    longitud: float
    entidad: Entidad | None
    motivo_rechazo: str | None
    comentario_solucion: str | None
    fotos: list[Foto]
    historial: list[HistorialEstado]
    fecha_actualizacion: datetime
