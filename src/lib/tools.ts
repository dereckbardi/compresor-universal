import {
  ArrowsClockwise,
  ArrowsIn,
  Camera,
  Crop,
  Drop,
  DropHalfBottom,
  EyeSlash,
  FileArchive,
  FileDoc,
  FileImage,
  FileText,
  FilePpt,
  FileXls,
  Globe,
  Hash,
  Image,
  LockSimple,
  LockSimpleOpen,
  MagnifyingGlass,
  Package,
  PenNib,
  PuzzlePiece,
  Scissors,
  Trash,
  UploadSimple,
  Wrench,
  type Icon,
} from "@phosphor-icons/react";

/** Mapa de nombre de icono Phosphor -> componente, usado por el catálogo de herramientas. */
export const TOOL_ICONS: Record<string, Icon> = {
  ArrowsClockwise,
  ArrowsIn,
  Camera,
  Crop,
  Drop,
  DropHalfBottom,
  EyeSlash,
  FileArchive,
  FileDoc,
  FileImage,
  FilePpt,
  FileText,
  FileXls,
  Globe,
  Hash,
  Image,
  LockSimple,
  LockSimpleOpen,
  MagnifyingGlass,
  Package,
  PenNib,
  PuzzlePiece,
  Scissors,
  Trash,
  UploadSimple,
  Wrench,
};

export interface Tool {
  id: string;
  name: string;
  desc: string;
  icon: string;
  category: string;
  available: boolean;
  /** Se muestra en la sección "Más populares" antes del catálogo completo. */
  popular?: boolean;
  /** Frase corta y directa, solo para la tarjeta de "Más populares" (más punchy que `desc`). */
  tagline?: string;
}

export const TOOLS: Tool[] = [
  // IMÁGENES
  { id: "image", name: "Comprimir imágenes", desc: "Reduce el peso de tus fotos JPG, PNG, WebP y GIF sin perder calidad, ideal para compartirlas más rápido.", icon: "Image", category: "imagenes", available: true, popular: true, tagline: "La forma más rápida de aligerar tus fotos" },
  // ORDENAR
  { id: "merge", name: "Unir PDF", desc: "Combina varios PDF en un solo archivo, en el orden que quieras.", icon: "PuzzlePiece", category: "ordenar", available: true, popular: true, tagline: "Junta varios PDF en uno solo en segundos" },
  { id: "split", name: "Dividir PDF", desc: "Extrae una o varias páginas de tu PDF, o convierte cada página del PDF en un archivo PDF independiente.", icon: "Scissors", category: "ordenar", available: true },
  { id: "remove", name: "Eliminar páginas", desc: "Quita las páginas que no necesitas y deja solo las que te interesan.", icon: "Trash", category: "ordenar", available: true },
  { id: "extract", name: "Extraer páginas", desc: "Guarda solo las páginas específicas de tu PDF en un documento nuevo.", icon: "UploadSimple", category: "ordenar", available: true },
  { id: "rotate", name: "Rotar PDF", desc: "Gira todas las páginas de tu PDF 90°, 180° o 270° para corregir su orientación.", icon: "ArrowsClockwise", category: "ordenar", available: true },
  { id: "scan", name: "Escaneo a PDF", desc: "Convierte fotos o escaneos de tus documentos en un PDF legible.", icon: "Camera", category: "ordenar", available: false },
  // OPTIMIZAR
  { id: "pdf", name: "Comprimir PDF", desc: "Reduce el peso de tu PDF para que pese menos y sea más fácil de compartir, sin perder calidad.", icon: "ArrowsIn", category: "optimizar", available: true, popular: true, tagline: "Envía tus PDF por correo o WhatsApp sin líos" },
  { id: "repair", name: "Reparar PDF", desc: "Arregla PDFs dañados o que no se abren correctamente.", icon: "Wrench", category: "optimizar", available: true },
  { id: "ocr", name: "OCR PDF", desc: "Convierte escaneos en texto editable y buscable dentro del PDF.", icon: "MagnifyingGlass", category: "optimizar", available: true },
  // CONVERTIR A PDF
  { id: "jpg-pdf", name: "JPG a PDF", desc: "Convierte tus imágenes en un PDF, perfecto para documentos escaneados o fotos.", icon: "FileImage", category: "a-pdf", available: true },
  { id: "png-pdf", name: "PNG a PDF", desc: "Convierte tus imágenes PNG en un PDF, manteniendo la calidad original.", icon: "FileImage", category: "a-pdf", available: true },
  { id: "webp-pdf", name: "WEBP a PDF", desc: "Convierte tus imágenes WebP en un PDF listo para compartir.", icon: "FileImage", category: "a-pdf", available: true },
  { id: "tiff-pdf", name: "TIFF a PDF", desc: "Convierte tus imágenes TIFF en un PDF para archivo o envío.", icon: "FileImage", category: "a-pdf", available: true },
  { id: "word-pdf", name: "WORD a PDF", desc: "Convierte documentos de Word en PDF manteniendo el formato original.", icon: "FileDoc", category: "a-pdf", available: true, popular: true, tagline: "Tu documento de Word, listo para enviar como PDF" },
  { id: "ppt-pdf", name: "POWERPOINT a PDF", desc: "Convierte presentaciones de PowerPoint en PDF listas para compartir.", icon: "FilePpt", category: "a-pdf", available: true },
  { id: "excel-pdf", name: "EXCEL a PDF", desc: "Convierte hojas de cálculo de Excel en PDF con sus tablas intactas.", icon: "FileXls", category: "a-pdf", available: true },
  { id: "html-pdf", name: "HTML a PDF", desc: "Convierte una página web en un PDF descargable.", icon: "Globe", category: "a-pdf", available: true },
  { id: "svg-pdf", name: "SVG a PDF", desc: "Convierte tus archivos SVG vectoriales en PDF manteniendo la calidad.", icon: "FileImage", category: "a-pdf", available: true },
  // CONVERTIR DESDE PDF
  { id: "pdf-jpg", name: "PDF a JPG", desc: "Convierte cada página de tu PDF en una imagen JPG independiente.", icon: "Image", category: "desde-pdf", available: true },
  { id: "pdf-png", name: "PDF a PNG", desc: "Convierte cada página de tu PDF en una imagen PNG con transparencia.", icon: "FileImage", category: "desde-pdf", available: true },
  { id: "pdf-webp", name: "PDF a WebP", desc: "Convierte cada página de tu PDF en una imagen WebP ligera.", icon: "FileImage", category: "desde-pdf", available: true },
  { id: "pdf-tiff", name: "PDF a TIFF", desc: "Convierte cada página de tu PDF en una imagen TIFF de alta calidad.", icon: "FileImage", category: "desde-pdf", available: true },
  { id: "pdf-word", name: "PDF a WORD", desc: "Convierte tu PDF en un documento de Word editable.", icon: "FileDoc", category: "desde-pdf", available: true, popular: true, tagline: "Edita ese PDF como si fuera un Word normal" },
  { id: "pdf-ppt", name: "PDF a POWERPOINT", desc: "Convierte tu PDF en una presentación de PowerPoint editable.", icon: "FilePpt", category: "desde-pdf", available: true },
  { id: "pdf-excel", name: "PDF a EXCEL", desc: "Convierte tu PDF en una hoja de cálculo de Excel editable.", icon: "FileXls", category: "desde-pdf", available: true },
  { id: "pdf-a", name: "PDF a PDF/A", desc: "Convierte tu PDF al formato de archivo estándar para conservación a largo plazo.", icon: "Package", category: "desde-pdf", available: true },
  { id: "pdf-images", name: "Extraer imágenes", desc: "Extrae todas las imágenes de tu PDF y descárgalas en un ZIP.", icon: "FileArchive", category: "desde-pdf", available: true, popular: true, tagline: "Saca las imágenes de tu PDF en segundos" },
  { id: "pdf-text", name: "PDF a texto", desc: "Extrae el texto de tu PDF y descárgalo como archivo .txt editable.", icon: "FileText", category: "desde-pdf", available: true },
  { id: "pdf-zip", name: "PDF a Zip", desc: "Mete tu PDF tal cual dentro de un archivo ZIP, sin extraer ni modificar nada.", icon: "FileArchive", category: "desde-pdf", available: true },
  // EDITAR
  { id: "page-num", name: "Números de página", desc: "Añade números de página a tu PDF en la posición que elijas.", icon: "Hash", category: "editar", available: true },
  { id: "watermark", name: "Marca de agua", desc: "Añade un texto semitransparente a todas las páginas de tu PDF.", icon: "Drop", category: "editar", available: true },
  { id: "redact", name: "Censurar PDF", desc: "Oculta de forma permanente la información sensible de tu PDF.", icon: "EyeSlash", category: "editar", available: true },
  { id: "crop", name: "Recortar PDF", desc: "Recorta el contenido de las páginas de tu PDF a la zona que necesites.", icon: "Crop", category: "editar", available: true },
  { id: "pdf-grayscale", name: "PDF a escala de grises", desc: "Convierte todas las páginas de tu PDF a blanco y negro (escala de grises).", icon: "DropHalfBottom", category: "editar", available: true },
  { id: "blank-page", name: "Agregar página en blanco", desc: "Añade una página en blanco al final de tu PDF.", icon: "FileDoc", category: "editar", available: true },
  { id: "edit-meta", name: "Editar metadatos", desc: "Cambia el título y el autor de tu PDF.", icon: "FileText", category: "editar", available: true },
  { id: "count-words", name: "Contador de palabras", desc: "Cuenta las palabras, caracteres y páginas de tu PDF y descárgalo como reporte.", icon: "Hash", category: "editar", available: true },
  // SEGURIDAD
  { id: "sign", name: "Firmar PDF", desc: "Añade tu firma a tu PDF sin necesidad de imprimirlo.", icon: "PenNib", category: "seguridad", available: true },
  { id: "unlock", name: "Desbloquear PDF", desc: "Elimina la contraseña de tu PDF para acceder libremente a su contenido.", icon: "LockSimpleOpen", category: "seguridad", available: true },
  { id: "protect", name: "Proteger PDF", desc: "Añade una contraseña para que solo las personas autorizadas puedan abrir tu PDF.", icon: "LockSimple", category: "seguridad", available: true },
];

export const CATEGORIES: { id: string; name: string }[] = [
  { id: "imagenes", name: "Imágenes" },
  { id: "ordenar", name: "Ordenar PDF" },
  { id: "optimizar", name: "Optimizar PDF" },
  { id: "a-pdf", name: "Convertir a PDF" },
  { id: "desde-pdf", name: "Convertir desde PDF" },
  { id: "editar", name: "Editar PDF" },
  { id: "seguridad", name: "Seguridad" },
];
