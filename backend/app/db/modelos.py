"""Modelos ORM (SQLAlchemy 2.0) de las tablas de la base de datos.

Tablas principales del enunciado:
    Escenario  -> escenarios  (id, nombre, fecha, parametros_entrada)
    Resultado  -> resultados  (id, escenario_id, algoritmo_utilizado, costo_total,
                               tiempo_ejecucion_ms, gap_desviacion, matriz_flujos_json)
Tablas de apoyo: Agroempresa, Planta, Ruta, PrecioSombra.

Los campos que calcula la base de datos (parametros_entrada, gap_desviacion,
costo_transporte, costo_operativo) se llenan con triggers; después de
insertar se hace session.refresh(obj) para leerlos.
"""
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, Numeric, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def _num(v: Any) -> Any:
    """Decimal -> float para responder JSON."""
    return float(v) if isinstance(v, Decimal) else v


class Base(DeclarativeBase):
    pass


class Escenario(Base):
    __tablename__ = "escenarios"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True,
                                          server_default=text("gen_random_uuid()"))
    nombre: Mapped[str] = mapped_column(Text, unique=True)
    fecha: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    descripcion: Mapped[str | None] = mapped_column(Text)
    parametros_entrada: Mapped[dict] = mapped_column(JSONB, server_default=text("'{}'::jsonb"))
    es_base: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    costo_transporte_km_ton: Mapped[Decimal] = mapped_column(Numeric, server_default=text("1200"))
    factor_penalizacion_oferta: Mapped[Decimal] = mapped_column(Numeric, server_default=text("1000"))
    factor_penalizacion_capacidad: Mapped[Decimal] = mapped_column(Numeric, server_default=text("1000"))
    escenario_origen_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("escenarios.id", ondelete="SET NULL"))
    variaciones: Mapped[dict] = mapped_column(JSONB, server_default=text("'{}'::jsonb"))
    actualizado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))

    agroempresas: Mapped[list["Agroempresa"]] = relationship(
        back_populates="escenario", order_by="Agroempresa.orden",
        cascade="all, delete-orphan", passive_deletes=True)
    plantas: Mapped[list["Planta"]] = relationship(
        back_populates="escenario", order_by="Planta.orden",
        cascade="all, delete-orphan", passive_deletes=True)
    resultados: Mapped[list["Resultado"]] = relationship(
        back_populates="escenario", order_by="Resultado.fecha.desc()",
        cascade="all, delete-orphan", passive_deletes=True)

    def a_dict(self, incluir_parametros: bool = True) -> dict:
        d = {
            "id": str(self.id),
            "nombre": self.nombre,
            "fecha": self.fecha,
            "descripcion": self.descripcion,
            "es_base": self.es_base,
            "costo_transporte_km_ton": _num(self.costo_transporte_km_ton),
            "escenario_origen_id": str(self.escenario_origen_id) if self.escenario_origen_id else None,
            "variaciones": self.variaciones,
            "actualizado_en": self.actualizado_en,
        }
        if incluir_parametros:
            d["parametros_entrada"] = self.parametros_entrada
        return d


class Agroempresa(Base):
    __tablename__ = "agroempresas"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True,
                                          server_default=text("gen_random_uuid()"))
    escenario_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True),
                                                    ForeignKey("escenarios.id", ondelete="CASCADE"))
    codigo: Mapped[str] = mapped_column(Text)
    nombre: Mapped[str] = mapped_column(Text)
    municipio: Mapped[str | None] = mapped_column(Text)
    sector: Mapped[str | None] = mapped_column(Text)
    oferta_ton_sem: Mapped[Decimal] = mapped_column(Numeric)
    orden: Mapped[int] = mapped_column(Integer)

    escenario: Mapped[Escenario] = relationship(back_populates="agroempresas")


class Planta(Base):
    __tablename__ = "plantas"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True,
                                          server_default=text("gen_random_uuid()"))
    escenario_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True),
                                                    ForeignKey("escenarios.id", ondelete="CASCADE"))
    codigo: Mapped[str] = mapped_column(Text)
    nombre: Mapped[str] = mapped_column(Text)
    municipio: Mapped[str | None] = mapped_column(Text)
    capacidad_maxima_ton_sem: Mapped[Decimal] = mapped_column(Numeric)
    costo_operativo_ton: Mapped[Decimal] = mapped_column(Numeric)
    orden: Mapped[int] = mapped_column(Integer)

    escenario: Mapped[Escenario] = relationship(back_populates="plantas")


class Ruta(Base):
    __tablename__ = "rutas"

    escenario_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True),
                                                    ForeignKey("escenarios.id", ondelete="CASCADE"))
    agroempresa_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True),
                                                      ForeignKey("agroempresas.id", ondelete="CASCADE"),
                                                      primary_key=True)
    planta_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True),
                                                 ForeignKey("plantas.id", ondelete="CASCADE"),
                                                 primary_key=True)
    distancia_km: Mapped[Decimal] = mapped_column(Numeric)
    habilitada: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))


class Resultado(Base):
    __tablename__ = "resultados"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True,
                                          server_default=text("gen_random_uuid()"))
    escenario_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True),
                                                    ForeignKey("escenarios.id", ondelete="CASCADE"))
    algoritmo_utilizado: Mapped[str] = mapped_column(Text)          # 'Exacto' | 'Genético'
    costo_total: Mapped[Decimal] = mapped_column(Numeric)
    tiempo_ejecucion_ms: Mapped[float] = mapped_column(Float)
    gap_desviacion: Mapped[Decimal | None] = mapped_column(Numeric)  # % (lo calcula la BD)
    matriz_flujos_json: Mapped[dict] = mapped_column(JSONB)
    costo_transporte: Mapped[Decimal | None] = mapped_column(Numeric)
    costo_operativo: Mapped[Decimal | None] = mapped_column(Numeric)
    factible: Mapped[bool | None] = mapped_column(Boolean)
    parametros_algoritmo: Mapped[dict] = mapped_column(JSONB, server_default=text("'{}'::jsonb"))
    historial_fitness: Mapped[list | None] = mapped_column(JSONB)
    resultado_exacto_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("resultados.id", ondelete="SET NULL"))
    fecha: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))

    escenario: Mapped[Escenario] = relationship(back_populates="resultados")
    precios_sombra: Mapped[list["PrecioSombra"]] = relationship(
        back_populates="resultado", cascade="all, delete-orphan", passive_deletes=True)

    def a_dict(self, incluir_matriz: bool = True, incluir_detalle: bool = False) -> dict:
        d = {
            "id": str(self.id),
            "escenario_id": str(self.escenario_id),
            "escenario": self.escenario.nombre if self.escenario else None,
            "algoritmo_utilizado": self.algoritmo_utilizado,
            "costo_total": _num(self.costo_total),
            "tiempo_ejecucion_ms": self.tiempo_ejecucion_ms,
            "gap_desviacion": _num(self.gap_desviacion),
            "costo_transporte": _num(self.costo_transporte),
            "costo_operativo": _num(self.costo_operativo),
            "factible": self.factible,
            "parametros_algoritmo": self.parametros_algoritmo,
            "resultado_exacto_id": str(self.resultado_exacto_id) if self.resultado_exacto_id else None,
            "fecha": self.fecha,
        }
        if incluir_matriz:
            d["matriz_flujos_json"] = self.matriz_flujos_json
        if incluir_detalle:
            d["historial_fitness"] = self.historial_fitness
            d["precios_sombra"] = [p.a_dict() for p in self.precios_sombra]
        return d


class PrecioSombra(Base):
    __tablename__ = "precios_sombra"

    resultado_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True),
                                                    ForeignKey("resultados.id", ondelete="CASCADE"),
                                                    primary_key=True)
    tipo: Mapped[str] = mapped_column(Text, primary_key=True)        # 'oferta' | 'capacidad'
    nodo_codigo: Mapped[str] = mapped_column(Text, primary_key=True)
    valor_dual: Mapped[Decimal] = mapped_column(Numeric)
    holgura: Mapped[Decimal | None] = mapped_column(Numeric)
    rango_inferior: Mapped[Decimal | None] = mapped_column(Numeric)
    rango_superior: Mapped[Decimal | None] = mapped_column(Numeric)

    resultado: Mapped[Resultado] = relationship(back_populates="precios_sombra")

    def a_dict(self) -> dict:
        return {
            "tipo": self.tipo,
            "nodo_codigo": self.nodo_codigo,
            "valor_dual": _num(self.valor_dual),
            "holgura": _num(self.holgura),
            "rango_inferior": _num(self.rango_inferior),
            "rango_superior": _num(self.rango_superior),
        }
