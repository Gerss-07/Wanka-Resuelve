"""Errores de dominio independientes de HTTP."""


class DomainError(Exception):
    pass


class NoAutorizado(DomainError):
    pass


class SinPermiso(DomainError):
    pass


class NoEncontrado(DomainError):
    pass


class Conflicto(DomainError):
    pass


class DatosInvalidos(DomainError):
    pass
