"""Contratos de los catálogos precargados."""

from pydantic import BaseModel


class Categoria(BaseModel):
    id_categoria: int
    nombre: str


class Distrito(BaseModel):
    id_distrito: int
    nombre: str


class Entidad(BaseModel):
    id_entidad: int
    nombre: str
    id_categoria: int
