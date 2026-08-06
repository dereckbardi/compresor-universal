import type { Mode } from "@/lib/toolContent";

export interface Faq {
  q: string;
  a: string;
}

/** Preguntas frecuentes generales que aplican a cualquier herramienta. */
const GENERAL: Faq[] = [
  { q: "¿Es gratis?", a: "Sí, COMPRIMEME es 100% gratuito y sin registro. No necesitas crear cuenta ni pagar nada." },
  { q: "¿Mis archivos se suben a algún servidor?", a: "En la mayoría de herramientas tus archivos se procesan directamente en tu navegador y nunca salen de tu dispositivo. Solo algunas conversiones (como Office a PDF) se procesan en un servidor y se eliminan automáticamente al terminar." },
  { q: "¿Hay límite de tamaño o de archivos?", a: "No hay límites artificiales. Al procesarse en tu navegador, el único límite práctico es la memoria de tu propio equipo." },
];

const FAQ_BY_MODE: Partial<Record<Mode, Faq[]>> = {
  pdf: [
    { q: "¿Qué significa comprimir un PDF?", a: "Reduce el tamaño del archivo para que pese menos, ideal para enviarlo por correo, WhatsApp o subirlo a una web, sin perder una calidad visible." },
    { q: "¿Se pierde calidad al comprimir?", a: "Intentamos mantener la máxima calidad posible. En PDFs muy pesados puede haber una leve reducción, pero el texto y las imágenes se mantienen legibles." },
  ],
  image: [
    { q: "¿Qué formatos puedo comprimir?", a: "JPG, PNG, WebP y GIF. Cada uno se optimiza manteniendo la transparencia cuando el formato la soporta." },
    { q: "¿Cuánto puedo reducir el peso?", a: "Depende del archivo, pero en fotos y capturas suele reducirse un 50-80% manteniendo buena calidad." },
  ],
  merge: [
    { q: "¿Cuántos PDF puedo unir a la vez?", a: "Todos los que quieras. Solo arrastra o agrega varios archivos y se combinan en el orden en que los coloques." },
    { q: "¿Puedo cambiar el orden antes de unir?", a: "Sí, puedes arrastrar las miniaturas para reordenarlas antes de unir." },
  ],
  split: [
    { q: "¿Puedo dividir por rangos de páginas?", a: "Sí, puedes indicar rangos específicos (por ejemplo páginas 1-3 y 5) o dividir cada página en un PDF independiente." },
  ],
  "pdf-images": [
    { q: "¿Qué imágenes se extraen?", a: "Se extraen las imágenes reales incrustadas en el PDF. Si el PDF es un escaneo o captura, se obtienen las páginas completas como imágenes." },
    { q: "¿Cómo se descargan?", a: "Si hay varias imágenes, se agrupan en un archivo ZIP para que las descargues todas a la vez." },
  ],
  "jpg-pdf": [
    { q: "¿Puedo ajustar la orientación o el tamaño de página?", a: "Sí, puedes elegir entre vertical/horizontal, el tamaño de página (A4, A5, Carta, Legal) y el margen, con vista previa en vivo." },
    { q: "¿Puedo unir varias imágenes en un solo PDF?", a: "Sí, activa la opción de unir todas las imágenes en un único PDF." },
  ],
  "png-pdf": [
    { q: "¿Qué es un PNG?", a: "Es un formato de imagen sin pérdida que soporta transparencia. Al convertirlo a PDF se conserva esa calidad." },
    { q: "¿Puedo agregar varias imágenes?", a: "Sí, usa el botón + para agregar varias y elígelas todas juntas para convertirlas en un PDF." },
  ],
  "webp-pdf": [
    { q: "¿Qué es un WebP?", a: "Es un formato de imagen moderno de Google, mucho más ligero que JPG o PNG con calidad similar." },
  ],
  "tiff-pdf": [
    { q: "¿Qué es un TIFF?", a: "Es un formato de imagen sin pérdida muy usado en escaneo profesional e imprenta. Se convierte a PDF para facilitar su distribución." },
  ],
  "pdf-zip": [
    { q: "¿Qué hace exactamente PDF a Zip?", a: "Mete tu PDF (o varios) tal cual dentro de un archivo ZIP, sin extraer ni modificar nada. Es útil para comprimir antes de enviar." },
    { q: "¿Si agrego varios PDFs?", a: "Todos se empaquetan en un solo ZIP, cada uno con su nombre, para que los descargues de una vez." },
  ],
  "pdf-jpg": [
    { q: "¿Cada página se convierte en una imagen?", a: "Sí, cada página de tu PDF se convierte en una imagen JPG independiente, lista para compartir." },
    { q: "¿Cómo se descargan las páginas?", a: "Si hay varias, se agrupan en un ZIP. Con una sola página se descarga la imagen directamente." },
  ],
  "pdf-png": [
    { q: "¿Por qué PNG y no JPG?", a: "PNG no tiene pérdida y soporta transparencia, ideal para conservar calidad o fondos transparentes." },
  ],
  "pdf-webp": [
    { q: "¿Qué ventaja tiene WebP?", a: "Es mucho más ligero que JPG o PNG con una calidad visual casi idéntica, perfecto para la web." },
  ],
  "pdf-tiff": [
    { q: "¿Para qué se usa TIFF?", a: "Es el estándar en escaneo profesional e imprenta por su alta calidad sin pérdida." },
    { q: "¿Por qué no se ve la vista previa?", a: "Algunos navegadores no muestran TIFF en la vista previa, pero el archivo se descarga y abre correctamente en visores compatibles." },
  ],
  "svg-pdf": [
    { q: "¿Qué es un SVG?", a: "Es una imagen vectorial que se ve nítida a cualquier tamaño. Al convertirla a PDF se conserva su calidad." },
  ],
  "pdf-word": [
    { q: "¿El PDF se convierte en un Word editable?", a: "Sí, el texto, las imágenes y la estructura se convierten a un documento de Word que puedes editar." },
  ],
  "pdf-text": [
    { q: "¿Qué pasa si mi PDF es un escaneo?", a: "Si no tiene texto real, prueba antes con la herramienta OCR PDF para reconocer el texto de las imágenes." },
  ],
  "count-words": [
    { q: "¿Qué incluye el reporte?", a: "El número de páginas, palabras totales, caracteres (sin espacios) y un desglose por página, en un archivo .txt." },
  ],
  "blank-page": [
    { q: "¿Dónde se añade la página en blanco?", a: "Se añade al final del PDF, sin modificar las páginas existentes." },
  ],
  "edit-meta": [
    { q: "¿Qué metadatos puedo cambiar?", a: "El título y el autor del PDF. Útil para organizar documentos y mejorar su identificación." },
  ],
  protect: [
    { q: "¿Qué tipo de contraseña añade?", a: "Una contraseña para abrir el PDF. Solo quien la tenga podrá visualizar el documento." },
  ],
  unlock: [
    { q: "¿Puede quitar cualquier contraseña?", a: "Solo si conoces la contraseña del PDF. No podemos eliminar la protección de documentos que no te pertenecen." },
  ],
  ocr: [
    { q: "¿Qué es el OCR?", a: "Reconocimiento óptico de caracteres: convierte el texto de escaneos o imágenes en texto editable y buscable dentro del PDF." },
  ],
  "pdf-a": [
    { q: "¿Qué es PDF/A?", a: "Es un formato estándar de PDF pensado para conservación a largo plazo, compatible con archivadores y sistemas de gestión documental." },
  ],
};

/** Devuelve las FAQs de una herramienta (específicas + generales). */
export function getFaqs(mode: Mode): Faq[] {
  const specific = FAQ_BY_MODE[mode] ?? [];
  // Evitar repetir preguntas generales duplicadas
  const generalQ = new Set(GENERAL.map((g) => g.q));
  const uniqueSpecific = specific.filter((f) => !generalQ.has(f.q));
  return [...uniqueSpecific, ...GENERAL];
}
