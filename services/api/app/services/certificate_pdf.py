"""PDF del certificado con reportlab (Python puro: sin GTK, Cairo ni otras bibliotecas del sistema).

Las fuentes son DejaVu (`app/assets/fonts`, licencia en `docs/atribuciones.md`): cubren el latín
con todos sus diacríticos, además de griego y cirílico, así que los nombres reales salen bien.
Un carácter que la fuente no trae (por ejemplo ideogramas) se dibuja como el glifo vacío de la
fuente en lugar de romper la emisión.

Página A4 apaisada: el fondo es el diploma del nivel alcanzado (`app/assets/diplomas`, diseñados por
la usuaria) y encima se escriben el nombre completo, la identificación, el puntaje, la fecha, el
código de verificación y un QR con la URL pública de verificación.
"""

import contextlib
import io
import threading
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import simpleSplit
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas

from app.core.constants import CERT_UTC_OFFSET_HOURS, OVA_TITLE
from app.models.certificate import Certificate
from app.models.enums import TIPO_IDENTIFICACION_ETIQUETAS, TipoIdentificacion
from app.services.certificate import percentage

FONTS_DIR = Path(__file__).resolve().parents[1] / "assets" / "fonts"
SANS = "OVA-Sans"
SANS_BOLD = "OVA-Sans-Bold"
SERIF = "OVA-Serif"
SERIF_BOLD = "OVA-Serif-Bold"
_FONT_FILES = {
    SANS: "DejaVuSans.ttf",
    SANS_BOLD: "DejaVuSans-Bold.ttf",
    SERIF: "DejaVuSerif.ttf",
    SERIF_BOLD: "DejaVuSerif-Bold.ttf",
}

_MONTHS = (
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
)

_fonts_lock = threading.Lock()
_fonts_ready = False


def _register_fonts() -> None:
    global _fonts_ready
    with _fonts_lock:
        if _fonts_ready:
            return
        for name, filename in _FONT_FILES.items():
            pdfmetrics.registerFont(TTFont(name, str(FONTS_DIR / filename)))
        _fonts_ready = True


def format_spanish_date(moment: datetime) -> str:
    """`24 de septiembre de 2026`, en la hora de Colombia (UTC-5, sin horario de verano)."""
    local = moment.astimezone(timezone(timedelta(hours=CERT_UTC_OFFSET_HOURS)))
    return f"{local.day} de {_MONTHS[local.month - 1]} de {local.year}"


def _fit_lines(text: str, font: str, max_width: float, start: int, minimum: int, max_lines: int):
    """Mayor tamaño de letra (de `start` a `minimum`) con que el texto cabe en `max_lines`."""
    for size in range(start, minimum - 1, -1):
        lines = simpleSplit(text, font, size, max_width)
        if len(lines) <= max_lines:
            return size, lines
    return minimum, simpleSplit(text, font, minimum, max_width)


def _centered(c: Canvas, x: float, y: float, text: str, font: str, size: float, color) -> None:
    c.setFillColor(color)
    c.setFont(font, size)
    c.drawCentredString(x, y, text)


def _draw_qr(c: Canvas, url: str, x: float, y: float, size: float) -> None:
    widget = QrCodeWidget(url, barLevel="M", barBorder=0)
    x0, y0, x1, y1 = widget.getBounds()
    drawing = Drawing(size, size, transform=[size / (x1 - x0), 0, 0, size / (y1 - y0), 0, 0])
    drawing.add(widget)
    renderPDF.draw(drawing, c, x, y)


def verification_url(public_base_url: str, code: str) -> str:
    return f"{public_base_url.rstrip('/')}/verify/{code}"


@dataclass(frozen=True)
class NivelDiploma:
    clave: str
    titulo: str
    minimo: int  # % de las actividades obligatorias desde el que se otorga


# Diplomas de la usuaria (2026-10-29), del más alto al más bajo. El fondo trae el título, el texto
# «Por obtener un puntaje superior al N %…» y los rótulos; aquí se escriben solo los datos.
NIVELES_DIPLOMA = (
    NivelDiploma("excelencia", "Diploma de Excelencia", 95),
    NivelDiploma("sobresaliente", "Diploma Sobresaliente", 85),
    NivelDiploma("satisfactorio", "Diploma Satisfactorio", 70),
    NivelDiploma("cumplimiento", "Diploma de Cumplimiento", 60),
)
DIPLOMAS_DIR = Path(__file__).resolve().parents[1] / "assets" / "diplomas"


def nivel_de_diploma(porcentaje: float | None) -> NivelDiploma:
    """Nivel según el % de las obligatorias; sin porcentaje (sin manifiesto), el de cumplimiento."""
    if porcentaje is not None:
        for nivel in NIVELES_DIPLOMA:
            if porcentaje >= nivel.minimo:
                return nivel
    return NIVELES_DIPLOMA[-1]


# Los fondos miden 2000 x 1414 px (proporción A4); las posiciones se toman en píxeles de la imagen.
_FONDO_ANCHO_PX = 2000
TEXTO_DIPLOMA = HexColor("#3F3F3F")
TEXTO_SUAVE = HexColor("#6B6B6B")


def render_certificate_pdf(certificate: Certificate, public_base_url: str) -> bytes:
    """Bytes del PDF: el diploma del nivel alcanzado con los datos del estudiante encima."""
    _register_fonts()
    width, height = landscape(A4)
    escala = width / _FONDO_ANCHO_PX

    def x_px(px: float) -> float:
        return px * escala

    def y_px(px: float) -> float:
        return height - px * escala

    pct = None
    if certificate.puntaje_obligatorias is not None and certificate.puntaje_maximo:
        pct = percentage(certificate.puntaje_obligatorias, certificate.puntaje_maximo)
    nivel = nivel_de_diploma(pct)

    buffer = io.BytesIO()
    # invariant=1: mismos bytes cada vez que se descarga el mismo certificado.
    c = Canvas(buffer, pagesize=(width, height), invariant=1, pageCompression=1)
    full_name = f"{certificate.nombre} {certificate.apellido}".strip()
    url = verification_url(public_base_url, certificate.codigo)
    c.setTitle(f"{nivel.titulo} - {full_name}")
    c.setAuthor("OVA Metabolismo óseo")
    c.setSubject(OVA_TITLE)
    c.setCreator("OVA Metabolismo óseo (API)")

    c.drawImage(str(DIPLOMAS_DIR / f"diploma_{nivel.clave}.jpg"), 0, 0, width, height)

    # Capa de texto invisible con lo que el fondo dice en imagen: se puede buscar y copiar del PDF.
    oculto = c.beginText(x_px(1000), y_px(700))
    oculto.setTextRenderMode(3)
    oculto.setFont(SERIF_BOLD, 10)
    for linea in (
        nivel.titulo,
        f"Por obtener un puntaje superior al {nivel.minimo} % en el OVA",
        f"«{OVA_TITLE}»",
        "Se otorga a:",
    ):
        oculto.textLine(linea)
    oculto.setTextRenderMode(0)  # el modo persiste en la página: restablecerlo
    c.drawText(oculto)

    # Nombre sobre la línea larga (y = 995 px, de x = 420 a 1580 px).
    name_size, name_lines = _fit_lines(full_name, SERIF_BOLD, x_px(1100), 30, 12, 2)
    y = y_px(972) + (len(name_lines) - 1) * name_size * 1.12
    for line in name_lines:
        _centered(c, x_px(1000), y, line, SERIF_BOLD, name_size, TEXTO_DIPLOMA)
        y -= name_size * 1.12

    tipo_label = certificate.tipo_identificacion
    with contextlib.suppress(ValueError):  # tipo fuera del catálogo: se imprime el código tal cual
        tipo_label = TIPO_IDENTIFICACION_ETIQUETAS[TipoIdentificacion(tipo_label)]
    _centered(
        c,
        x_px(1000),
        y_px(1040),
        f"identificado(a) con {tipo_label}, n.º {certificate.numero_identificacion}",
        SANS,
        9.5,
        TEXTO_SUAVE,
    )
    if pct is not None:
        detalle = f"Puntaje en las actividades obligatorias: {pct:.1f} %".replace(".", ",")
        _centered(c, x_px(1000), y_px(1080), detalle, SANS, 9, TEXTO_SUAVE)

    # Fecha sobre la línea corta bajo el rótulo «Fecha» (y = 1305 px).
    date_text = format_spanish_date(certificate.created_at)
    _centered(c, x_px(995), y_px(1288), date_text, SERIF_BOLD, 12.5, TEXTO_DIPLOMA)

    # Código de verificación a la izquierda de la fecha y QR a la derecha, entre los cráneos.
    code_x = x_px(600)
    _centered(c, code_x, y_px(1200), "CÓDIGO DE VERIFICACIÓN", SANS_BOLD, 7, TEXTO_SUAVE)
    _centered(c, code_x, y_px(1240), certificate.codigo, SERIF_BOLD, 13, TEXTO_DIPLOMA)
    _centered(c, code_x, y_px(1272), "Comprueba su autenticidad en:", SANS, 6.5, TEXTO_SUAVE)
    # La URL en dos líneas (sitio y ruta) para no invadir la fecha; todo el bloque es un enlace.
    corte = url.index("/verify/")
    for fila, parte in enumerate((url[:corte], url[corte:])):
        _centered(c, code_x, y_px(1296 + fila * 22), parte, SANS, 6.5, TEXTO_DIPLOMA)
    url_width = max(pdfmetrics.stringWidth(p, SANS, 6.5) for p in (url[:corte], url[corte:]))
    c.linkURL(
        url,
        (code_x - url_width / 2, y_px(1318) - 2, code_x + url_width / 2, y_px(1296) + 8),
        relative=0,
    )
    qr_size = 54
    _draw_qr(c, url, x_px(1330), y_px(1312), qr_size)

    c.showPage()
    c.save()
    return buffer.getvalue()
