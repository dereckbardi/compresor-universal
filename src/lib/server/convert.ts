import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";

const execFileAsync = promisify(execFile);

/** Crea un directorio temporal único y devuelve su ruta. */
export async function makeTempDir(): Promise<string> {
  const dir = path.join(os.tmpdir(), `compresor-${crypto.randomUUID()}`);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Sanea un nombre de archivo proporcionado por el usuario:
 * - quita cualquier ruta (evita path traversal tipo "../../etc/passwd")
 * - conserva solo caracteres seguros para nombres de archivo
 * - garantiza que la extensión original se conserve
 */
function sanitizeFilename(filename: string): string {
  const base = path.basename(filename); // descarta cualquier componente de ruta
  const ext = path.extname(base);
  const name = base.slice(0, base.length - ext.length);
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) || "archivo";
  const safeExt = ext.replace(/[^a-zA-Z0-9.]/g, "").slice(0, 10);
  return safeName + safeExt;
}

/** Guarda un buffer a disco dentro de un directorio temporal, con nombre saneado. */
export async function writeInput(dir: string, filename: string, data: Buffer): Promise<string> {
  const safe = sanitizeFilename(filename);
  const filePath = path.join(dir, safe);
  await fs.writeFile(filePath, data);
  return filePath;
}

/** Limpia un directorio temporal (best-effort, nunca lanza). */
export async function cleanup(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    /* noop */
  }
}

/**
 * Ejecuta un binario con argumentos como array (NO por shell), evitando
 * inyección de comandos: los argumentos nunca se interpretan como shell
 * aunque contengan comillas, backticks, ; o $().
 */
export async function run(command: string, args: string[], cwd: string): Promise<void> {
  try {
    await execFileAsync(command, args, { cwd, timeout: 120_000, maxBuffer: 50 * 1024 * 1024 });
  } catch (err: unknown) {
    const e = err as { stderr?: string; stdout?: string; message?: string };
    const stderr = e?.stderr ? `\n${e.stderr}` : "";
    const stdout = e?.stdout ? `\n${e.stdout}` : "";
    // IMPORTANTE: nunca incluir `args` aquí (pueden contener contraseñas de usuario
    // en protectPdf/unlockPdf). Solo se registra el nombre del comando y su salida.
    throw new Error(`Comando falló: ${command}${stderr}${stdout}`);
  }
}

const OFFICE_EXT = [".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".odt", ".odp", ".ods", ".rtf", ".txt"];

/** ¿Es un formato de Office que LibreOffice puede convertir a PDF? */
export function isOfficeFile(filename: string): boolean {
  return OFFICE_EXT.includes(path.extname(filename).toLowerCase());
}

/**
 * Convierte un archivo de Office a PDF usando LibreOffice headless.
 * Devuelve el buffer del PDF resultante.
 */
export async function officeToPdf(inputPath: string, _filename: string): Promise<Buffer> {
  const dir = path.dirname(inputPath);
  await run("libreoffice", ["--headless", "--convert-to", "pdf", "--outdir", dir, inputPath], dir);

  // LibreOffice produce <nombre-sin-ext>.pdf a partir del nombre real en disco
  const actualBase = path.basename(inputPath, path.extname(inputPath));
  const pdfPath = path.join(dir, `${actualBase}.pdf`);
  return fs.readFile(pdfPath);
}

/**
 * Convierte HTML a PDF usando LibreOffice (soffice importa HTML y exporta a PDF).
 * Devuelve el buffer del PDF resultante.
 */
export async function htmlToPdf(inputPath: string, _filename: string): Promise<Buffer> {
  const dir = path.dirname(inputPath);
  await run("libreoffice", ["--headless", "--convert-to", "pdf", "--outdir", dir, inputPath], dir);

  const actualBase = path.basename(inputPath, path.extname(inputPath));
  const pdfPath = path.join(dir, `${actualBase}.pdf`);
  return fs.readFile(pdfPath);
}

/**
 * Convierte un PDF a un formato de Office (Word/PPT/Excel).
 * - target: "docx" | "pptx" | "xlsx"
 * Usa el script Python (pdf2docx / pdftoppm+python-pptx / pdfplumber+openpyxl)
 * porque LibreOffice no tiene importador de PDF.
 * Devuelve { buffer, name } con el archivo resultante.
 */
export async function pdfToOffice(
  inputPath: string,
  filename: string,
  target: "docx" | "pptx" | "xlsx"
): Promise<{ buffer: Buffer; name: string }> {
  const dir = path.dirname(inputPath);
  const actualBase = path.basename(inputPath, path.extname(inputPath));
  const outFile = `${actualBase}.${target}`;
  const outPath = path.join(dir, outFile);

  await run("python3", ["/app/scripts/convert_pdf.py", inputPath, target, outPath], dir);

  // Nombre "bonito" para descargar, basado en el filename original (saneado, sin rutas)
  const displayBase = path.basename(filename, path.extname(filename)).replace(/[^a-zA-Z0-9._ -]/g, "_") || "documento";
  return { buffer: await fs.readFile(outPath), name: `${displayBase}.${target}` };
}

/**
 * Elimina la contraseña de un PDF con qpdf.
 * Si el PDF tiene contraseña de propietario pero no de usuario, qpdf la elimina directo.
 * Si requiere contraseña de usuario, pásala en `password`.
 * Devuelve el buffer del PDF desbloqueado.
 */
export async function unlockPdf(inputPath: string, password?: string): Promise<Buffer> {
  const dir = path.dirname(inputPath);
  const outPath = path.join(dir, "unlocked.pdf");

  // password se pasa como argumento independiente: nunca se interpreta como shell
  const pwArg = password ? `--password=${password}` : "--password=";
  await run("qpdf", [pwArg, "--decrypt", inputPath, outPath], dir);
  return fs.readFile(outPath);
}

/**
 * Protege (cifra) un PDF con qpdf usando contraseña de usuario y/o propietario.
 * - userPassword: contraseña para abrir el PDF.
 * - ownerPassword: contraseña para permisos (si se omite, se usa la de usuario).
 * Devuelve el buffer del PDF protegido.
 */
export async function protectPdf(
  inputPath: string,
  userPassword: string,
  ownerPassword?: string
): Promise<Buffer> {
  const dir = path.dirname(inputPath);
  const outPath = path.join(dir, "protected.pdf");
  const owner = ownerPassword || userPassword;

  await run(
    "qpdf",
    ["--encrypt", userPassword, owner, "256", "--", inputPath, outPath],
    dir
  );
  return fs.readFile(outPath);
}

/**
 * Convierte un PDF al estándar PDF/A usando Ghostscript.
 * Devuelve el buffer del PDF/A resultante.
 */
export async function toPdfA(inputPath: string): Promise<Buffer> {
  const dir = path.dirname(inputPath);
  const outPath = path.join(dir, "pdfa.pdf");

  await run(
    "gs",
    [
      "-dPDFA",
      "-dBATCH",
      "-dNOPAUSE",
      "-dNOOUTERSAVE",
      "-sDEVICE=pdfwrite",
      "-sColorConversionStrategy=UseDeviceIndependentColor",
      "-sProcessColorModel=DeviceCMYK",
      "-dPDFACompatibilityPolicy=1",
      `-sOutputFile=${outPath}`,
      inputPath,
    ],
    dir
  );
  return fs.readFile(outPath);
}
