"""Validación de fotos por sus primeros bytes y manejo de archivos en disco."""

from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

from backend.schemas.reportes import (
    MAX_FOTOS, MENSAJE_FOTO_INVALIDA, MENSAJE_FOTOS_CANTIDAD, MIN_FOTOS, TAMANO_MAXIMO_FOTO,
)
from backend.services.exceptions import DatosInvalidos


_FIRMAS = (
    (b"\xff\xd8\xff", "image/jpeg", ".jpg"),
    (b"\x89PNG\r\n\x1a\n", "image/png", ".png"),
)
SUBCARPETA = "reportes"


@dataclass(frozen=True)
class FotoValidada:
    contenido: bytes
    tipo_mime: str
    extension: str


@dataclass(frozen=True)
class FotoGuardada:
    ruta_relativa: str
    tipo_mime: str
    tamano_bytes: int


class FotoService:
    def __init__(self, uploads_dir: Path):
        self.uploads_dir = Path(uploads_dir)

    def validar(self, archivos: list[bytes]) -> list[FotoValidada]:
        """Valida cantidad, tamaño y tipo real antes de escribir nada."""
        if not MIN_FOTOS <= len(archivos) <= MAX_FOTOS:
            raise DatosInvalidos(MENSAJE_FOTOS_CANTIDAD)
        validadas = []
        for contenido in archivos:
            if not 1 <= len(contenido) <= TAMANO_MAXIMO_FOTO:
                raise DatosInvalidos(MENSAJE_FOTO_INVALIDA)
            firma = next((f for f in _FIRMAS if contenido.startswith(f[0])), None)
            if firma is None:
                raise DatosInvalidos(MENSAJE_FOTO_INVALIDA)
            validadas.append(FotoValidada(contenido, firma[1], firma[2]))
        return validadas

    def guardar(self, fotos: list[FotoValidada]) -> list[FotoGuardada]:
        """Escribe las fotos con nombre aleatorio; si falla una, borra las ya escritas."""
        carpeta = self.uploads_dir / SUBCARPETA
        carpeta.mkdir(parents=True, exist_ok=True)
        guardadas: list[FotoGuardada] = []
        try:
            for foto in fotos:
                ruta_relativa = f"{SUBCARPETA}/{uuid4().hex}{foto.extension}"
                with open(self.uploads_dir / ruta_relativa, "xb") as archivo:
                    archivo.write(foto.contenido)
                guardadas.append(FotoGuardada(ruta_relativa, foto.tipo_mime, len(foto.contenido)))
        except BaseException:
            self.borrar([g.ruta_relativa for g in guardadas])
            raise
        return guardadas

    def borrar(self, rutas_relativas: list[str]) -> None:
        for ruta in rutas_relativas:
            try:
                (self.uploads_dir / ruta).unlink(missing_ok=True)
            except OSError:
                pass

    @staticmethod
    def url_publica(ruta_relativa: str) -> str:
        return f"/uploads/{ruta_relativa}"
