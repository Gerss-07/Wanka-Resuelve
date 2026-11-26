"""Comprobaciones de disponibilidad de servicios externos."""

from backend.repositories.conexion import comprobar_conexion


def mysql_disponible() -> bool:
    return comprobar_conexion()
