"""Reglas del operador: bandeja y transiciones (RR-06 a RR-09, RR-11, RR-12)."""

from backend.repositories.historial import HistorialRepository
from backend.repositories.reportes import ReporteRepository
from backend.schemas.auth import Usuario
from backend.schemas.reportes import ReporteDetalle, ReporteFiltros, ReporteResumen
from backend.services.exceptions import Conflicto, NoEncontrado
from backend.services.reportes import MENSAJE_ESTADO, MENSAJE_NO_ENCONTRADO, ReporteService


class OperadorService:
    def __init__(self, repository: ReporteRepository, historial: HistorialRepository,
                 lector: ReporteService):
        self.repository = repository
        self.historial = historial
        self.lector = lector

    def bandeja(self, filtros: ReporteFiltros) -> list[ReporteResumen]:
        return [self.lector.resumen(fila) for fila in self.repository.listar(filtros)]

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
