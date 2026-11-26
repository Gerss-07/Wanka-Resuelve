"""Lectura de catálogos."""

from backend.repositories.catalogos import CatalogoRepository
from backend.schemas.catalogos import Categoria, Distrito, Entidad


class CatalogoService:
    def __init__(self, repository: CatalogoRepository):
        self.repository = repository

    def listar_categorias(self) -> list[Categoria]:
        return [Categoria(**fila) for fila in self.repository.listar_categorias()]

    def listar_distritos(self) -> list[Distrito]:
        return [Distrito(**fila) for fila in self.repository.listar_distritos()]

    def listar_entidades(self, id_categoria: int | None = None) -> list[Entidad]:
        return [Entidad(**fila) for fila in self.repository.listar_entidades(id_categoria)]
