import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";

const execAsync = promisify(exec);

/** Crea un directorio temporal único y devuelve su ruta. */
export async function makeTempDir(): Promise<string> {
  const dir = path.join(os.tmpdir(), `compresor-${crypto.randomUUID()}`);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/** Guarda un buffer a disco dentro de un directorio temporal. */
export async function writeInput(dir: string, filename: string, data: Buffer): Promise<string> {
  const filePath = path.join(dir, filename);
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

/** Ejecuta un comando y lanza si falla, con el stderr en el mensaje. */
export async function run(cmd: string, cwd: string): Promise<void> {
  try {
    await execAsync(cmd, { cwd, timeout: 120_000, maxBuffer: 50 * 1024 * 1024 });
  } catch (err: any) {
    const stderr = err?.stderr ? `\n${err.stderr}` : "";
    const stdout = err?.stdout ? `\n${err.stdout}` : "";
    throw new Error(`Comando falló: ${cmd}${stderr}${stdout}`);
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
export async function officeToPdf(inputPath: string, filename: string): Promise<Buffer> {
  const dir = path.dirname(inputPath);
  await run(`libreoffice --headless --convert-to pdf --outdir "${dir}" "${inputPath}"`, dir);

  // LibreOffice produce <nombre-sin-ext>.pdf
  const base = path.basename(filename, path.extname(filename));
  const pdfPath = path.join(dir, `${base}.pdf`);
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
  const base = path.basename(filename, path.extname(filename));
  const outFile = `${base}.${target}`;
  const outPath = path.join(dir, outFile);

  await run(
    `python3 /app/scripts/convert_pdf.py "${inputPath}" ${target} "${outPath}"`,
    dir
  );

  return { buffer: await fs.readFile(outPath), name: outFile };
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

  // qpdf --decrypt requiere la contraseña de usuario si el PDF está cifrado con una.
  const pwArg = password ? `--password="${password}"` : "--password=";
  await run(`qpdf ${pwArg} --decrypt "${inputPath}" "${outPath}"`, dir);
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
    `qpdf --encrypt "${userPassword}" "${owner}" 256 -- "${inputPath}" "${outPath}"`,
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
    `gs -dPDFA -dBATCH -dNOPAUSE -dNOOUTERSAVE -sDEVICE=pdfwrite ` +
      `-sColorConversionStrategy=UseDeviceIndependentColor ` +
      `-sProcessColorModel=DeviceCMYK -dPDFACompatibilityPolicy=1 ` +
      `-sOutputFile="${outPath}" "${inputPath}"`,
    dir
  );
  return fs.readFile(outPath);
}
