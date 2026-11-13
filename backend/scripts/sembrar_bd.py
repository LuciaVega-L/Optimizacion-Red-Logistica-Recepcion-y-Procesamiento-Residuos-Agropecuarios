
import argparse
import json
import sys

from app.db.sesion import ErrorBaseDatos
from app.services.red import repositorio, repositorio_bd as bd

CLAVES_A_VERIFICAR = ("parametros_globales", "plantas", "agroempresas", "matriz_distancias_km")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--reemplazar", action="store_true", help="sobrescribe escenarios existentes")
    args = parser.parse_args()

    try:
        existentes = set(bd.listar_escenarios())
    except ErrorBaseDatos as e:
        print(f"✘ No se pudo consultar la base de datos: {e}")
        return 1

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
                nombre, config,
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

    print("\nHistorial de escenarios en la base de datos:")
    for r in bd.historial_escenarios():
        base = " (base)" if r["es_base"] else ""
        print(f"  {r['nombre']}{base}: {r['num_agroempresas']} agroempresas, {r['num_plantas']} plantas, "
              f"{r['num_rutas_habilitadas']} rutas · oferta {r['oferta_total']:g} / capacidad "
              f"{r['capacidad_total']:g} t/sem · {r['estado_balance']} · {r['num_resultados']} resultados")
    return 1 if errores else 0


if __name__ == "__main__":
    sys.exit(main())
