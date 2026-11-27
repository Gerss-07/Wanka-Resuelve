"""Reglas del ciudadano sobre sus reportes (RR-01 a RR-05, RR-10 a RR-12)."""

from backend.repositories.catalogos import CatalogoRepository
from backend.repositories.fotos import FotoRepository
from backend.repositories.historial import HistorialRepository
from backend.repositories.reportes import ReporteRepository
from backend.schemas.auth import Usuario
from backend.schemas.catalogos import Categoria, Distrito, Entidad
from backend.schemas.reportes import (
    MENSAJES_CAMPO, Foto, HistorialEstado, ReporteCreate, ReporteDetalle, ReporteResumen,
    ReporteUpdate, UsuarioHistorial, UsuarioReferencia,
)
from backend.services.exceptions import Conflicto, DatosInvalidos, NoEncontrado
from backend.services.fotos import FotoGuardada, FotoService


RECIBIDO = "RECIBIDO"
MENSAJE_NO_ENCONTRADO = "Reporte no encontrado"
MENSAJE_ESTADO = "El reporte no está en un estado que permita esta acción"


def generar_codigo(id_reporte: int, anio: int) -> str:
    """RR-03: WR-AAAA-NNNNNN."""
    return f"WR-{anio}-{id_reporte:06d}"


class ReporteService:
    def __init__(self, repository: ReporteRepository, fotos: FotoRepository,
                 historial: HistorialRepository, catalogos: CatalogoRepository,
                 archivos: FotoService):
        self.repository = repository
        self.fotos = fotos
        self.historial = historial
        self.catalogos = catalogos
        self.archivos = archivos

    # ----- operaciones -----

    def crear(self, usuario: Usuario, datos: ReporteCreate, archivos: list[bytes]) -> ReporteDetalle:
        # RR-02: todo se valida antes de escribir en disco o en MySQL.
        self._validar_catalogos(datos)
        fotos_validas = self.archivos.validar(archivos)

        guardadas: list[FotoGuardada] = []
        try:
            id_reporte = self.repository.insertar(usuario.id_usuario, datos)  # RR-01
            # El año sale de fecha_creacion (hora del servidor MySQL en la zona de la sesión).
            fecha_creacion = self.repository.obtener(id_reporte)["fecha_creacion"]
            self.repository.actualizar_codigo(
                id_reporte, generar_codigo(id_reporte, fecha_creacion.year)
            )
            guardadas = self.archivos.guardar(fotos_validas)
            for orden, foto in enumerate(guardadas, start=1):
                self.fotos.insertar(id_reporte, orden, foto.ruta_relativa,
                                    foto.tipo_mime, foto.tamano_bytes)
            self.historial.insertar(id_reporte, None, RECIBIDO, usuario.id_usuario)  # RR-12
            return self._detalle(self.repository.obtener(id_reporte))
        except BaseException:
            # get_db hace rollback; aquí se borran los archivos ya escritos.
            self.archivos.borrar([g.ruta_relativa for g in guardadas])
            raise

    def listar_mis_reportes(self, usuario: Usuario) -> list[ReporteResumen]:
        filas = self.repository.listar_por_ciudadano(usuario.id_usuario)
        return [self._resumen(fila) for fila in filas]

    def obtener(self, usuario: Usuario, id_reporte: int) -> ReporteDetalle:
        return self._detalle(self._visible(usuario, id_reporte))

    def actualizar(self, usuario: Usuario, id_reporte: int, datos: ReporteUpdate) -> ReporteDetalle:
        fila = self._propio(usuario, id_reporte)
        if fila["estado"] != RECIBIDO:  # RR-04, RR-10
            raise Conflicto(MENSAJE_ESTADO)
        self._validar_catalogos(datos)
        if self.repository.actualizar_datos(id_reporte, datos, RECIBIDO) == 0:
            # MySQL también devuelve 0 si los valores no cambian: se distingue releyendo.
            actual = self.repository.obtener(id_reporte)
            if actual is None:
                raise NoEncontrado(MENSAJE_NO_ENCONTRADO)
            if actual["estado"] != RECIBIDO:  # RR-11
                raise Conflicto(MENSAJE_ESTADO)
        return self._detalle(self.repository.obtener(id_reporte))

    def eliminar(self, usuario: Usuario, id_reporte: int) -> None:
        fila = self._propio(usuario, id_reporte)
        if fila["estado"] != RECIBIDO:  # RR-05
            raise Conflicto(MENSAJE_ESTADO)
        rutas = [f["ruta_relativa"] for f in self.fotos.listar_por_reporte(id_reporte)]
        if self.repository.eliminar(id_reporte, RECIBIDO) == 0:  # RR-11
            raise Conflicto(MENSAJE_ESTADO)
        self.archivos.borrar(rutas)

    # ----- lectura compartida con el operador -----

    def detalle(self, id_reporte: int) -> ReporteDetalle:
        """Detalle sin control de propiedad (lo usa el operador, que ve todos)."""
        fila = self.repository.obtener(id_reporte)
        if fila is None:
            raise NoEncontrado(MENSAJE_NO_ENCONTRADO)
        return self._detalle(fila)

    def resumen(self, fila: dict) -> ReporteResumen:
        return self._resumen(fila)

    # ----- reglas auxiliares -----

    def _validar_catalogos(self, datos: ReporteCreate) -> None:
        if not self.catalogos.existe_categoria(datos.id_categoria):
            raise DatosInvalidos(MENSAJES_CAMPO["id_categoria"])
        if not self.catalogos.existe_distrito(datos.id_distrito):
            raise DatosInvalidos(MENSAJES_CAMPO["id_distrito"])

    def _visible(self, usuario: Usuario, id_reporte: int) -> dict:
        """El operador ve todos; el ciudadano solo los suyos (si no, 404)."""
        fila = self.repository.obtener(id_reporte)
        if fila is None:
            raise NoEncontrado(MENSAJE_NO_ENCONTRADO)
        if usuario.rol != "OPERADOR" and fila["id_ciudadano"] != usuario.id_usuario:
            raise NoEncontrado(MENSAJE_NO_ENCONTRADO)
        return fila

    def _propio(self, usuario: Usuario, id_reporte: int) -> dict:
        fila = self.repository.obtener(id_reporte)
        if fila is None or fila["id_ciudadano"] != usuario.id_usuario:
            raise NoEncontrado(MENSAJE_NO_ENCONTRADO)
        return fila

    # ----- armado de respuestas -----

    @staticmethod
    def _campos_resumen(fila: dict) -> dict:
        return {
            "id_reporte": fila["id_reporte"],
            "codigo": fila["codigo"],
            "ciudadano": UsuarioReferencia(
                id_usuario=fila["id_ciudadano"], nombre=fila["ciudadano_nombre"]
            ),
            "categoria": Categoria(id_categoria=fila["id_categoria"], nombre=fila["categoria_nombre"]),
            "distrito": Distrito(id_distrito=fila["id_distrito"], nombre=fila["distrito_nombre"]),
            "estado": fila["estado"],
            "prioridad": fila["prioridad"],
            "fecha_creacion": fila["fecha_creacion"],
        }

    def _resumen(self, fila: dict) -> ReporteResumen:
        return ReporteResumen(**self._campos_resumen(fila))

    def _detalle(self, fila: dict) -> ReporteDetalle:
        historial = self.historial.listar_por_reporte(fila["id_reporte"])

        def comentario_de(estado: str) -> str | None:
            return next((h["comentario"] for h in historial if h["estado_nuevo"] == estado), None)

        entidad = None
        if fila["id_entidad"] is not None:
            entidad = Entidad(id_entidad=fila["id_entidad"], nombre=fila["entidad_nombre"],
                              id_categoria=fila["entidad_id_categoria"])
        fotos = self.fotos.listar_por_reporte(fila["id_reporte"])
        return ReporteDetalle(
            **self._campos_resumen(fila),
            descripcion=fila["descripcion"],
            referencia=fila["referencia"],
            latitud=float(fila["latitud"]),
            longitud=float(fila["longitud"]),
            entidad=entidad,
            motivo_rechazo=comentario_de("RECHAZADO"),
            comentario_solucion=comentario_de("CERRADO"),
            fotos=[Foto(id_foto=f["id_foto"], url=FotoService.url_publica(f["ruta_relativa"]))
                   for f in fotos],
            historial=[
                HistorialEstado(
                    estado_anterior=h["estado_anterior"],
                    estado_nuevo=h["estado_nuevo"],
                    usuario=UsuarioHistorial(id_usuario=h["id_usuario"],
                                             nombre=h["usuario_nombre"], rol=h["usuario_rol"]),
                    comentario=h["comentario"],
                    fecha=h["fecha"],
                )
                for h in historial
            ],
            fecha_actualizacion=fila["fecha_actualizacion"],
        )
