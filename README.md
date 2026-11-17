# StackRD Web
Sitio y portafolio de StackRD: páginas web para negocios en Santiago de los Caballeros.
## Estructura
- docs/ es el sitio publicado en GitHub Pages
- plantilla/plantilla.html es la plantilla base
- clientes/ tiene un JSON por cliente o demo
- generar.py crea la página de un cliente dentro de docs/
## Nuevo cliente
Copia un JSON en clientes/, edítalo, pon "demo": false y ejecuta python3 generar.py clientes/nombre.json
