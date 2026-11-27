"""Rutas de catálogos."""

from fastapi import APIRouter

from backend.core.dependencies import AutenticadoDep, CatalogoServiceDep, OperadorDep
from backend.schemas.catalogos import Categoria, Distrito, Entidad


router = APIRouter(tags=["Catálogos"])


@router.get("/categorias", response_model=list[Categoria])
def listar_categorias(usuario: AutenticadoDep, service: CatalogoServiceDep):
    return service.listar_categorias()


@router.get("/distritos", response_model=list[Distrito])
def listar_distritos(usuario: AutenticadoDep, service: CatalogoServiceDep):
    return service.listar_distritos()


@router.get("/entidades", response_model=list[Entidad])
def listar_entidades(
    usuario: OperadorDep, service: CatalogoServiceDep, id_categoria: int | None = None
):
    return service.listar_entidades(id_categoria)
