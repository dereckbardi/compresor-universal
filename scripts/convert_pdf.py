#!/usr/bin/env python3
"""Conversión PDF -> Office con calidad.
- docx: cada página del PDF renderizada como imagen -> Word (se ve idéntico, conserva imágenes y estructura)
- pptx: cada página del PDF como imagen en una diapositiva (se ve idéntico)
- xlsx: extracción de texto con PyMuPDF -> openpyxl
Uso: convert_pdf.py <input.pdf> <target> <output>
"""
import sys, os, tempfile, subprocess, re

def pdf_to_docx(inp, out):
    """Convierte cada página del PDF a imagen y la inserta en un Word (fidelidad total)."""
    from docx import Document
    from docx.shared import Inches, Pt
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from PIL import Image

    wd = tempfile.mkdtemp()
    # Rasterizar cada página a PNG (300 dpi para buena calidad)
    subprocess.run(["pdftoppm", "-png", "-r", "150", inp, os.path.join(wd, "page")], check=True)
    pages = sorted([f for f in os.listdir(wd) if f.endswith(".png")])
    if not pages:
        raise RuntimeError("no se pudo rasterizar el PDF")

    d = Document()
    # Márgenes pequeños para que la imagen llene la página
    for section in d.sections:
        section.top_margin = Inches(0.3)
        section.bottom_margin = Inches(0.3)
        section.left_margin = Inches(0.3)
        section.right_margin = Inches(0.3)

    for p in pages:
        img_path = os.path.join(wd, p)
        # Ancho usable de página (letter/carta ~8.5in - márgenes)
        usable_w = 8.5 - 0.6
        para = d.add_paragraph()
        para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = para.add_run()
        run.add_picture(img_path, width=Inches(usable_w))
        # Salto de página entre páginas (excepto la última)
        if p != pages[-1]:
            d.add_page_break()
    d.save(out)

def pdf_to_pptx(inp, out):
    from pptx import Presentation
    from pptx.util import Inches
    from PIL import Image
    wd = tempfile.mkdtemp()
    subprocess.run(["pdftoppm", "-png", "-r", "110", inp, os.path.join(wd, "page")], check=True)
    pages = sorted([f for f in os.listdir(wd) if f.endswith(".png")])
    if not pages:
        raise RuntimeError("no se pudo rasterizar el PDF")
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    for p in pages:
        img_path = os.path.join(wd, p)
        im = Image.open(img_path)
        w, h = im.size
        max_w, max_h = 13.0, 7.0
        ratio = min(max_w / (w / 96.0), max_h / (h / 96.0))
        disp_w = (w / 96.0) * ratio
        disp_h = (h / 96.0) * ratio
        left = (13.333 - disp_w) / 2
        top = (7.5 - disp_h) / 2
        slide = prs.slides.add_slide(prs.slide_layouts[6])
        slide.shapes.add_picture(img_path, Inches(left), Inches(top), Inches(disp_w), Inches(disp_h))
    prs.save(out)

def pdf_to_xlsx(inp, out):
    import fitz  # PyMuPDF
    from openpyxl import Workbook
    wb = Workbook()
    ws = wb.active
    ws.title = "PDF"
    row = 1
    doc = fitz.open(inp)
    for page in doc:
        text = page.get_text("text") or ""
        for line in text.split("\n"):
            cells = [c.strip() for c in re.split(r"\s{2,}|\t", line) if c.strip()]
            if not cells:
                continue
            for col, val in enumerate(cells, start=1):
                ws.cell(row=row, column=col, value=val)
            row += 1
    wb.save(out)

def main():
    inp = sys.argv[1]
    target = sys.argv[2]
    out = sys.argv[3]
    if target == "docx":
        pdf_to_docx(inp, out)
    elif target == "pptx":
        pdf_to_pptx(inp, out)
    elif target == "xlsx":
        pdf_to_xlsx(inp, out)
    else:
        raise RuntimeError("target no válido")
    if not os.path.exists(out) or os.path.getsize(out) == 0:
        raise RuntimeError("conversión falló: sin archivo de salida")

if __name__ == "__main__":
    main()
