"""Operadores genéticos: selección (ruleta/torneo), cruce (1 y 2 puntos) y mutación."""


def seleccion_torneo(poblacion, aptitudes, k, rng):
    raise NotImplementedError


def seleccion_ruleta(poblacion, aptitudes, rng):
    raise NotImplementedError


def cruce_un_punto(padre1, padre2, rng):
    raise NotImplementedError


def cruce_dos_puntos(padre1, padre2, rng):
    raise NotImplementedError


def mutar(individuo, tasa, rng):
    raise NotImplementedError
