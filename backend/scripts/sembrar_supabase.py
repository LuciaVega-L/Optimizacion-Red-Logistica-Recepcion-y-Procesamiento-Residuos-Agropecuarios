"""Carga en Supabase los escenarios JSON de backend/data/escenarios/.

Uso (desde la carpeta backend/, con el .env configurado):

    python -m scripts.sembrar_supabase              # carga los que no existan
    python -m scripts.sembrar_supabase --reemplazar # sobrescribe los existentes

Cada archivo <nombre>.json se guarda como el escenario <nombre>;
dataConfig.json queda marcado como escenario base. Al final se lee cada
escenario de vuelta y se compara con el archivo para verificar la carga.
"""
import argparse
import json
import sys

from app.db.supabase_cliente import ErrorBaseDatos
from app.services.red import repositorio, repositorio_supabase as bd

CLAVES_A_VERIFICAR = ("parametros_globales", "plantas", "agroempresas", "matriz_distancias_km")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--reemplazar", action="store_true", help="sobrescribe escenarios existentes")
    args = parser.parse_args()

    existentes = set(bd.listar_escenarios())
    archivos = sorted(repositorio.DIR_ESCENARIOS.glob("*.json"))
    if not archivos:
        print(f"No hay archivos .json en {repositorio.DIR_ESCENARIOS}")
        return 1

    errores = 0
    for ruta in archivos:
        nombre = ruta.stem
        config = json.loads(ruta.read_text(encoding="utf-8"))
        if nombre in existentes and not args.reemplazar:
            print(f"  = {nombre}: ya existe (use --reemplazar para sobrescribir)")
            continue
        try:
            bd.guardar_escenario(
                nombre,
                config,
                descripcion=config.get("_meta", {}).get("descripcion"),
                es_base=(nombre == repositorio.ESCENARIO_BASE),
                reemplazar=args.reemplazar,
            )
        except ErrorBaseDatos as e:
            print(f"  ✘ {nombre}: {e}")
            errores += 1
            continue

        en_bd = bd.cargar_escenario(nombre)
        distintas = [k for k in CLAVES_A_VERIFICAR if en_bd.get(k) != config.get(k)]
        if distintas:
            print(f"  ✘ {nombre}: guardado, pero difiere en {distintas}")
            errores += 1
        else:
            print(f"  ✔ {nombre}: guardado y verificado")

    print("\nResumen en la base de datos:")
    for r in bd.resumen_escenarios():
        base = " (base)" if r["es_base"] else ""
        print(f"  {r['nombre']}{base}: {r['num_agroempresas']} agroempresas, {r['num_plantas']} plantas, "
              f"{r['num_rutas_habilitadas']} rutas · oferta {r['oferta_total']} / capacidad "
              f"{r['capacidad_total']} t/sem · {r['estado_balance']}")
    return 1 if errores else 0


if __name__ == "__main__":
    sys.exit(main())