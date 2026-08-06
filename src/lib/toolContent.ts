/**
 * Fuente única de verdad para cada "modo" (herramienta) de la app:
 * - El tipo Mode y la lista de modos válidos.
 * - El título/descripción que se muestra en pantalla (el mismo texto que usa
 *   el <h1> de la herramienta).
 * - El slug de URL usado por las páginas individuales /[tool] para SEO
 *   (en vez de depender solo de /?tool=id, que Google no indexa bien).
 *
 * Compartir este archivo entre el componente cliente y las rutas de servidor
 * evita que el texto del <h1> y el de <title>/<meta description> se desincronicen.
 */

export type Mode =
  | "image"
  | "pdf"
  | "merge"
  | "split"
  | "pdf-jpg"
  | "rotate"
  | "extract"
  | "remove"
  | "jpg-pdf"
  | "watermark"
  | "page-num"
  | "sign"
  | "redact"
  | "crop"
  | "word-pdf"
  | "ppt-pdf"
  | "excel-pdf"
  | "unlock"
  | "protect"
  | "pdf-a"
  | "pdf-word"
  | "pdf-ppt"
  | "pdf-excel"
  | "repair"
  | "ocr"
  | "html-pdf"
  | "png-pdf"
  | "webp-pdf"
  | "tiff-pdf"
  | "pdf-images"
  | "pdf-text"
  | "pdf-grayscale"
  | "pdf-zip";

export interface ToolContent {
  title: string;
  desc: string;
  slug: string;
}

export const TOOL_CONTENT: Record<Mode, ToolContent> = {
  image: { title: "Comprime tus imágenes", desc: "Reduce el peso de tus imágenes sin perder calidad, ideal para compartirlas más rápido.", slug: "comprimir-imagenes" },
  pdf: { title: "Comprime tus PDF", desc: "Reduce el peso de tu PDF para que pese menos y sea más fácil de enviar, sin perder calidad.", slug: "comprimir-pdf" },
  merge: { title: "Unir PDF", desc: "Combina varios PDF en un solo archivo, en el orden que quieras. Perfecto para juntar documentos.", slug: "unir-pdf" },
  split: { title: "Dividir PDF", desc: "Extrae una o varias páginas de tu PDF, o convierte cada página del PDF en un archivo PDF independiente.", slug: "dividir-pdf" },
  "pdf-jpg": { title: "PDF a JPG", desc: "Convierte cada página de tu PDF en una imagen JPG independiente, lista para compartir.", slug: "pdf-a-jpg" },
  rotate: { title: "Rotar PDF", desc: "Gira todas las páginas de tu PDF 90°, 180° o 270° para corregir su orientación.", slug: "rotar-pdf" },
  extract: { title: "Extraer páginas", desc: "Guarda solo las páginas específicas de tu PDF en un documento nuevo, sin tocar el original.", slug: "extraer-paginas-pdf" },
  remove: { title: "Eliminar páginas", desc: "Quita las páginas que no necesitas de tu PDF y deja solo las que te interesan.", slug: "eliminar-paginas-pdf" },
  "jpg-pdf": { title: "JPG a PDF", desc: "Convierte tus imágenes en un PDF, perfecto para documentos escaneados o fotos.", slug: "jpg-a-pdf" },
  watermark: { title: "Marca de agua", desc: "Añade un texto semitransparente a todas las páginas de tu PDF para protegerlo o personalizarlo.", slug: "marca-de-agua-pdf" },
  "page-num": { title: "Números de página", desc: "Añade números de página a tu PDF para que sea más fácil de navegar y referenciar.", slug: "numeros-de-pagina-pdf" },
  sign: { title: "Firmar PDF", desc: "Añade tu firma a tu PDF sin necesidad de imprimirlo, perfecto para contratos.", slug: "firmar-pdf" },
  redact: { title: "Censurar PDF", desc: "Oculta de forma permanente la información sensible de tu PDF con barras negras.", slug: "censurar-pdf" },
  crop: { title: "Recortar PDF", desc: "Recorta el contenido de tu PDF a la zona que necesites, eliminando los márgenes.", slug: "recortar-pdf" },
  "word-pdf": { title: "WORD a PDF", desc: "Convierte documentos de Word en PDF manteniendo el formato original.", slug: "word-a-pdf" },
  "ppt-pdf": { title: "POWERPOINT a PDF", desc: "Convierte presentaciones de PowerPoint en PDF listas para compartir.", slug: "powerpoint-a-pdf" },
  "excel-pdf": { title: "EXCEL a PDF", desc: "Convierte hojas de cálculo de Excel en PDF con sus tablas intactas.", slug: "excel-a-pdf" },
  unlock: { title: "Desbloquear PDF", desc: "Elimina la contraseña de tu PDF para acceder libremente a su contenido.", slug: "desbloquear-pdf" },
  protect: { title: "Proteger PDF", desc: "Añade una contraseña para que solo las personas autorizadas puedan abrir tu PDF.", slug: "proteger-pdf" },
  "pdf-a": { title: "PDF a PDF/A", desc: "Convierte tu PDF al formato estándar para conservación a largo plazo.", slug: "convertir-a-pdfa" },
  "pdf-word": { title: "PDF a WORD", desc: "Convierte tu PDF en un documento de Word editable manteniendo el texto.", slug: "pdf-a-word" },
  "pdf-ppt": { title: "PDF a POWERPOINT", desc: "Convierte tu PDF en una presentación de PowerPoint editable.", slug: "pdf-a-powerpoint" },
  "pdf-excel": { title: "PDF a EXCEL", desc: "Convierte tu PDF en una hoja de cálculo de Excel editable.", slug: "pdf-a-excel" },
  repair: { title: "Reparar PDF", desc: "Arregla PDFs dañados o que no se abren correctamente, reconstruyendo su estructura.", slug: "reparar-pdf" },
  ocr: { title: "OCR PDF", desc: "Convierte escaneos en texto editable y buscable dentro del PDF usando reconocimiento óptico.", slug: "ocr-pdf" },
"png-pdf": { title: "PNG a PDF", desc: "Convierte tus imágenes PNG en un PDF.", slug: "png-a-pdf" },
"webp-pdf": { title: "WEBP a PDF", desc: "Convierte tus imágenes WebP en un PDF.", slug: "webp-a-pdf" },
"tiff-pdf": { title: "TIFF a PDF", desc: "Convierte tus imágenes TIFF en un PDF.", slug: "tiff-a-pdf" },
"pdf-images": { title: "Extraer imágenes", desc: "Extrae todas las imágenes de tu PDF en un ZIP.", slug: "extraer-imagenes-pdf" },
"pdf-text": { title: "PDF a texto", desc: "Extrae el texto de tu PDF a un archivo .txt.", slug: "pdf-a-texto" },
"pdf-grayscale": { title: "PDF a escala de grises", desc: "Convierte tu PDF a blanco y negro.", slug: "pdf-a-escala-de-grises" },
"pdf-zip": { title: "PDF a Zip", desc: "Comprime tu PDF dentro de un archivo ZIP sin extraer nada.", slug: "pdf-a-zip" },
  "html-pdf": { title: "HTML a PDF", desc: "Pega tu código HTML y conviértelo en un PDF descargable.", slug: "html-a-pdf" },
};

export const VALID_MODES = new Set<Mode>(Object.keys(TOOL_CONTENT) as Mode[]);

/** Busca el Mode correspondiente a un slug de URL (ej. "comprimir-pdf" -> "pdf"). */
export function getModeBySlug(slug: string): Mode | null {
  const entries = Object.entries(TOOL_CONTENT) as [Mode, ToolContent][];
  const found = entries.find(([, content]) => content.slug === slug);
  return found ? found[0] : null;
}

/** Devuelve la URL amigable (/slug) para un modo dado. */
export function getSlugForMode(mode: Mode): string {
  return TOOL_CONTENT[mode].slug;
}
