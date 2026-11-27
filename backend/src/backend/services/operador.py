"""Reglas del operador: bandeja y transiciones (RR-06 a RR-09, RR-11, RR-12)."""

from backend.repositories.asignaciones import AsignacionRepository
from backend.repositories.catalogos import CatalogoRepository
from backend.repositories.historial import HistorialRepository
from backend.repositories.reportes import ReporteRepository
from backend.schemas.auth import Usuario
from backend.schemas.reportes import (
    MENSAJES_CAMPO, ReporteAsignar, ReporteCerrar, ReporteDetalle, ReporteFiltros,
    ReporteIniciarAtencion, ReporteRechazar, ReporteResumen,
)
from backend.services.exceptions import Conflicto, DatosInvalidos, NoEncontrado
from backend.services.reportes import MENSAJE_ESTADO, MENSAJE_NO_ENCONTRADO, ReporteService


RECIBIDO = "RECIBIDO"
ASIGNADO = "ASIGNADO"
RECHAZADO = "RECHAZADO"
EN_ATENCION = "EN_ATENCION"
CERRADO = "CERRADO"


class OperadorService:
    def __init__(self, repository: ReporteRepository, historial: HistorialRepository,
                 asignaciones: AsignacionRepository, catalogos: CatalogoRepository,
                 lector: ReporteService):
        self.repository = repository
        self.historial = historial
        self.asignaciones = asignaciones
        self.catalogos = catalogos
        self.lector = lector

    def bandeja(self, filtros: ReporteFiltros) -> list[ReporteResumen]:
        return [self.lector.resumen(fila) for fila in self.repository.listar(filtros)]

    def asignar(self, operador: Usuario, id_reporte: int, datos: ReporteAsignar) -> ReporteDetalle:
        """RR-06: RECIBIDO → ASIGNADO con prioridad y entidad de la misma categoría."""
        reporte = self._reporte_en_estado(id_reporte, RECIBIDO)
        entidad = self.catalogos.obtener_entidad(datos.id_entidad)
        if entidad is None or entidad["id_categoria"] != reporte["id_categoria"]:
            raise DatosInvalidos(MENSAJES_CAMPO["id_entidad"])
        self._transicion(operador, id_reporte, RECIBIDO, ASIGNADO)
        self.asignaciones.insertar(id_reporte, datos.id_entidad, datos.prioridad)
        return self._detalle(id_reporte)

    def rechazar(self, operador: Usuario, id_reporte: int, datos: ReporteRechazar) -> ReporteDetalle:
        """RR-07: RECIBIDO → RECHAZADO (final); el motivo queda en el historial."""
        self._reporte_en_estado(id_reporte, RECIBIDO)
        self._transicion(operador, id_reporte, RECIBIDO, RECHAZADO, datos.motivo)
        return self._detalle(id_reporte)

    def iniciar_atencion(self, operador: Usuario, id_reporte: int,
                         datos: ReporteIniciarAtencion) -> ReporteDetalle:
        """RR-08: ASIGNADO → EN_ATENCION, con comentario opcional."""
        self._reporte_en_estado(id_reporte, ASIGNADO)
        self._transicion(operador, id_reporte, ASIGNADO, EN_ATENCION, datos.comentario or None)
        return self._detalle(id_reporte)

    def cerrar(self, operador: Usuario, id_reporte: int, datos: ReporteCerrar) -> ReporteDetalle:
        """RR-09: EN_ATENCION → CERRADO (final); la solución queda en el historial."""
        self._reporte_en_estado(id_reporte, EN_ATENCION)
        self._transicion(operador, id_reporte, EN_ATENCION, CERRADO, datos.comentario_solucion)
        return self._detalle(id_reporte)

    # ----- reglas comunes -----

    def _reporte_en_estado(self, id_reporte: int, estado_origen: str) -> dict:
        fila = self.repository.obtener(id_reporte)
        if fila is None:
            raise NoEncontrado(MENSAJE_NO_ENCONTRADO)
        if fila["estado"] != estado_origen:  # RR-11
            raise Conflicto(MENSAJE_ESTADO)
        return fila

    def _transicion(self, operador: Usuario, id_reporte: int, estado_origen: str,
                    estado_nuevo: str, comentario: str | None = None) -> None:
        """UPDATE con el estado de origen en el WHERE + fila de historial, en la misma transacción."""
        if self.repository.cambiar_estado(id_reporte, estado_origen, estado_nuevo) == 0:
            raise Conflicto(MENSAJE_ESTADO)  # otro cambio llegó antes (RR-11)
        self.historial.insertar(id_reporte, estado_origen, estado_nuevo,
                                operador.id_usuario, comentario)  # RR-12

    def _detalle(self, id_reporte: int) -> ReporteDetalle:
        return self.lector.detalle(id_reporte)
