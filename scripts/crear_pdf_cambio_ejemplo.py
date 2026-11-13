"""Genera el PDF ilustrativo de una compra con un solo pasaje cambiado."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "vista-cambio-pasaje.pdf"
DEMO = ROOT / "frontend-Portal" / "demo" / "pdf" / OUTPUT.name
FONT_DIR = Path(r"C:\Windows\Fonts")

pdfmetrics.registerFont(TTFont("Arial", str(FONT_DIR / "arial.ttf")))
pdfmetrics.registerFont(TTFont("Arial-Bold", str(FONT_DIR / "arialbd.ttf")))

TEAL = colors.HexColor("#0F4C5C")
GREEN = colors.HexColor("#0E7A3C")
LIGHT = colors.HexColor("#F0F7F8")
GREEN_LIGHT = colors.HexColor("#EAF8EF")
MUTED = colors.HexColor("#62788A")
BORDER = colors.HexColor("#CBDCE0")
INK = colors.HexColor("#193743")


def label(pdf, x, y, content, size=9, color=MUTED, bold=False):
    pdf.setFont("Arial-Bold" if bold else "Arial", size)
    pdf.setFillColor(color)
    pdf.drawString(x, y, content)


def rounded(pdf, x, y, width, height, fill, stroke=BORDER, radius=10):
    pdf.setFillColor(fill)
    pdf.setStrokeColor(stroke)
    pdf.roundRect(x, y, width, height, radius, fill=1, stroke=1)


def ticket(pdf, top, number, name, seat, route, departure, changed=False):
    x, width, height = 42, A4[0] - 84, 104 if changed else 78
    bottom = top - height
    rounded(pdf, x, bottom, width, height, GREEN_LIGHT if changed else colors.white,
            GREEN if changed else BORDER)
    label(pdf, x + 14, top - 19, number, 8, MUTED, True)
    label(pdf, x + 14, top - 39, name, 10, INK, True)
    label(pdf, x + 14, top - 56, f"Asiento vigente: {seat}", 9, INK)
    label(pdf, x + 246, top - 19, "VIAJE VIGENTE", 8, GREEN if changed else MUTED, True)
    label(pdf, x + 246, top - 38, route, 10, INK, True)
    label(pdf, x + 246, top - 55, departure, 9, INK)
    if changed:
        pdf.setStrokeColor(BORDER)
        pdf.line(x + 14, top - 69, x + width - 14, top - 69)
        label(pdf, x + 14, top - 86,
              "Antes: Trujillo - Cajamarca | 21 nov. 2026, 21:00 | asiento 4B",
              8, MUTED)
        label(pdf, x + width - 108, top - 19, "CAMBIADO", 8, GREEN, True)
    return bottom


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    DEMO.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(OUTPUT), pagesize=A4)
    pdf.setTitle("Ejemplo de compra con un pasaje cambiado")
    pdf.setAuthor("RutaLibre - vista local de ejemplo")
    width, height = A4

    pdf.setFillColor(TEAL)
    pdf.rect(0, height - 84, width, 84, fill=1, stroke=0)
    label(pdf, 42, height - 40, "RutaLibre", 19, colors.white, True)
    label(pdf, 42, height - 60, "Detalle actualizado de la compra", 10, colors.white)
    label(pdf, width - 177, height - 42, "VISTA DE EJEMPLO", 9, colors.white, True)
    label(pdf, width - 195, height - 60, "Sin validez para viajar", 9, colors.white)

    y = height - 107
    label(pdf, 42, y, "COMPRA RL-C-000022", 10, TEAL, True)
    label(pdf, 42, y - 22, "Compra original: Trujillo - Cajamarca", 12, INK, True)
    label(pdf, 42, y - 39, "Salida original: 21 nov. 2026, 21:00  |  Servicio: Bus Cama", 9, MUTED)

    y -= 63
    rounded(pdf, 42, y - 40, width - 84, 40, LIGHT)
    label(pdf, 55, y - 16, "Cada boleto indica su viaje vigente. Solo el boleto 2 fue cambiado.", 9, INK, True)
    label(pdf, 55, y - 31, "Los otros dos pasajeros conservan el trayecto y la salida originales.", 8, MUTED)

    y -= 64
    label(pdf, 42, y, "BOLETOS DE ESTA COMPRA", 10, TEAL, True)
    y -= 13
    y = ticket(pdf, y, "BOLETO 1 | RL-B-000025", "Lucas Leonardo Muñoz Wong", "4A",
               "Trujillo - Cajamarca", "21 nov. 2026, 21:00") - 9
    y = ticket(pdf, y, "BOLETO 2 | RL-B-000026", "Fátima del Carmen Muñoz Wong", "12A",
               "Trujillo - Lima", "24 nov. 2026, 08:00", changed=True) - 9
    y = ticket(pdf, y, "BOLETO 3 | RL-B-000027", "Karina Jacqueline Aguilar Zavaleta", "5B",
               "Trujillo - Cajamarca", "21 nov. 2026, 21:00") - 19

    label(pdf, 42, y, "RESUMEN DE PAGOS", 10, TEAL, True)
    y -= 24
    label(pdf, 42, y, "Compra original (3 boletos)", 9, INK)
    pdf.setFont("Arial", 9)
    pdf.setFillColor(INK)
    pdf.drawRightString(width - 42, y, "S/ 129.00")
    y -= 19
    label(pdf, 42, y, "Diferencia pagada por cambio del boleto 2", 9, INK)
    pdf.drawRightString(width - 42, y, "S/ 17.00")
    y -= 20
    pdf.setStrokeColor(BORDER)
    pdf.line(42, y + 7, width - 42, y + 7)
    label(pdf, 42, y - 9, "TOTAL PAGADO", 11, TEAL, True)
    pdf.setFont("Arial-Bold", 13)
    pdf.setFillColor(TEAL)
    pdf.drawRightString(width - 42, y - 9, "S/ 146.00")

    pdf.setStrokeColor(BORDER)
    pdf.line(42, 64, width - 42, 64)
    label(pdf, 42, 47, "Documento ilustrativo. El cambio no se ha registrado en el sistema.", 8, MUTED)
    label(pdf, 42, 33, "Los importes y datos del nuevo viaje son ficticios para mostrar el diseño.", 8, MUTED)
    pdf.save()
    DEMO.write_bytes(OUTPUT.read_bytes())
    print(OUTPUT)
    print(DEMO)


if __name__ == "__main__":
    main()
