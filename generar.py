"""Genera una landing por cliente a partir de plantilla.html + un archivo JSON.
Uso: python3 generar.py clientes/barberia.json  -> docs/barberia/index.html
"""
import json, sys, urllib.parse, pathlib

STACKRD_WA = "18293390257"

def wa(num, msg):
    return f"https://wa.me/{num}?text={urllib.parse.quote(msg)}"

def generar(ruta_json):
    c = json.loads(pathlib.Path(ruta_json).read_text(encoding="utf-8"))
    html = (pathlib.Path(__file__).parent / "plantilla" / "plantilla.html").read_text(encoding="utf-8")

    servicios = "".join(
        f'<div class="card"><div class="ico">{s["icono"]}</div><h3>{s["nombre"]}</h3>'
        f'<p>{s["detalle"]}</p><div class="precio">{s["precio"]}</div></div>'
        for s in c["servicios"])
    ventajas = "".join(f"<li>{v}</li>" for v in c["ventajas"])
    datos = "".join(f"<div><b>{d[0]}</b>{d[1]}</div>" for d in c["datos"])

    if c.get("demo"):
        wa_link = wa(STACKRD_WA, f"Hola, vi la página de demostración de {c['nombre']} y quiero una para mi negocio.")
        banner = ('<div class="demo">Página de demostración hecha por StackRD. '
                  f'<a href="{wa(STACKRD_WA, "Hola, quiero una página web para mi negocio.")}" target="_blank" rel="noopener">¿Quieres una así para tu negocio?</a></div>')
    else:
        wa_link = wa(c["whatsapp"], c["mensaje_whatsapp"])
        banner = ""

    valores = {
        **{k.upper(): v for k, v in c.items() if isinstance(v, str)},
        "FUENTE_TITULO_URL": c["fuente_titulo"].replace(" ", "+"),
        "FUENTE_TITULO": c["fuente_titulo"],
        "SERVICIOS": servicios, "VENTAJAS": ventajas, "DATOS": datos,
        "WA_LINK": wa_link, "BANNER_DEMO": banner,
        "WA_STACKRD": wa(STACKRD_WA, "Hola, vi una página hecha por StackRD y quiero una."),
        "MAPA": urllib.parse.quote(c["mapa"]),
        "TITULO_SERVICIOS_MIN": c["titulo_servicios"].lower(),
    }
    for k, v in valores.items():
        html = html.replace("{{" + k + "}}", v)
    assert "{{" not in html, [l for l in html.splitlines() if "{{" in l][:3]

    salida = pathlib.Path(__file__).parent / "docs" / pathlib.Path(ruta_json).stem
    salida.mkdir(parents=True, exist_ok=True)
    (salida / "index.html").write_text(html, encoding="utf-8")
    print("Listo:", salida / "index.html")

if __name__ == "__main__":
    for r in sys.argv[1:]:
        generar(r)
