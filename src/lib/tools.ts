export interface Tool {
  id: string;
  name: string;
  desc: string;
  icon: string;
  category: string;
  available: boolean;
}

export const TOOLS: Tool[] = [
  // ORDENAR
  { id: "merge", name: "Unir PDF", desc: "Combina varios PDF en un solo archivo, en el orden que quieras.", icon: "🧩", category: "ordenar", available: true },
  { id: "split", name: "Dividir PDF", desc: "Extrae una o varias páginas de tu PDF, o convierte cada página del PDF en un archivo PDF independiente.", icon: "✂️", category: "ordenar", available: true },
  { id: "remove", name: "Eliminar páginas", desc: "Quita las páginas que no necesitas y deja solo las que te interesan.", icon: "🗑️", category: "ordenar", available: true },
  { id: "extract", name: "Extraer páginas", desc: "Guarda solo las páginas específicas de tu PDF en un documento nuevo.", icon: "📤", category: "ordenar", available: true },
  { id: "rotate", name: "Rotar PDF", desc: "Gira todas las páginas de tu PDF 90°, 180° o 270° para corregir su orientación.", icon: "🔄", category: "ordenar", available: true },
  { id: "scan", name: "Escaneo a PDF", desc: "Convierte fotos o escaneos de tus documentos en un PDF legible.", icon: "📷", category: "ordenar", available: false },
  // OPTIMIZAR
  { id: "pdf", name: "Comprimir PDF", desc: "Reduce el peso de tu PDF para que pese menos y sea más fácil de compartir, sin perder calidad.", icon: "🗜️", category: "optimizar", available: true },
  { id: "repair", name: "Reparar PDF", desc: "Arregla PDFs dañados o que no se abren correctamente.", icon: "🔧", category: "optimizar", available: true },
  { id: "ocr", name: "OCR PDF", desc: "Convierte escaneos en texto editable y buscable dentro del PDF.", icon: "🔍", category: "optimizar", available: true },
  // CONVERTIR A PDF
  { id: "jpg-pdf", name: "JPG a PDF", desc: "Convierte tus imágenes en un PDF, perfecto para documentos escaneados o fotos.", icon: "🖼️", category: "a-pdf", available: true },
  { id: "word-pdf", name: "WORD a PDF", desc: "Convierte documentos de Word en PDF manteniendo el formato original.", icon: "W", category: "a-pdf", available: true },
  { id: "ppt-pdf", name: "POWERPOINT a PDF", desc: "Convierte presentaciones de PowerPoint en PDF listas para compartir.", icon: "P", category: "a-pdf", available: true },
  { id: "excel-pdf", name: "EXCEL a PDF", desc: "Convierte hojas de cálculo de Excel en PDF con sus tablas intactas.", icon: "X", category: "a-pdf", available: true },
  { id: "html-pdf", name: "HTML a PDF", desc: "Convierte una página web en un PDF descargable.", icon: "🌐", category: "a-pdf", available: true },
  // CONVERTIR DESDE PDF
  { id: "pdf-jpg", name: "PDF a JPG", desc: "Convierte cada página de tu PDF en una imagen JPG independiente.", icon: "🖼️", category: "desde-pdf", available: true },
  { id: "pdf-word", name: "PDF a WORD", desc: "Convierte tu PDF en un documento de Word editable.", icon: "W", category: "desde-pdf", available: true },
  { id: "pdf-ppt", name: "PDF a POWERPOINT", desc: "Convierte tu PDF en una presentación de PowerPoint editable.", icon: "P", category: "desde-pdf", available: true },
  { id: "pdf-excel", name: "PDF a EXCEL", desc: "Convierte tu PDF en una hoja de cálculo de Excel editable.", icon: "X", category: "desde-pdf", available: true },
  { id: "pdf-a", name: "PDF a PDF/A", desc: "Convierte tu PDF al formato de archivo estándar para conservación a largo plazo.", icon: "📦", category: "desde-pdf", available: true },
  // EDITAR
  { id: "page-num", name: "Números de página", desc: "Añade números de página a tu PDF en la posición que elijas.", icon: "🔢", category: "editar", available: true },
  { id: "watermark", name: "Marca de agua", desc: "Añade un texto semitransparente a todas las páginas de tu PDF.", icon: "💧", category: "editar", available: true },
  { id: "redact", name: "Censurar PDF", desc: "Oculta de forma permanente la información sensible de tu PDF.", icon: "🕶️", category: "editar", available: true },
  { id: "crop", name: "Recortar PDF", desc: "Recorta el contenido de las páginas de tu PDF a la zona que necesites.", icon: "✂️", category: "editar", available: true },
  // SEGURIDAD
  { id: "sign", name: "Firmar PDF", desc: "Añade tu firma a tu PDF sin necesidad de imprimirlo.", icon: "🖊️", category: "seguridad", available: true },
  { id: "unlock", name: "Desbloquear PDF", desc: "Elimina la contraseña de tu PDF para acceder libremente a su contenido.", icon: "🔓", category: "seguridad", available: true },
  { id: "protect", name: "Proteger PDF", desc: "Añade una contraseña para que solo las personas autorizadas puedan abrir tu PDF.", icon: "🔒", category: "seguridad", available: true },
];

export const CATEGORIES: { id: string; name: string }[] = [
  { id: "ordenar", name: "Ordenar PDF" },
  { id: "optimizar", name: "Optimizar PDF" },
  { id: "a-pdf", name: "Convertir a PDF" },
  { id: "desde-pdf", name: "Convertir desde PDF" },
  { id: "editar", name: "Editar PDF" },
  { id: "seguridad", name: "Seguridad" },
];
