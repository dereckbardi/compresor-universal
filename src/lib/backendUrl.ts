export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "https://comprimeme-956795747152.us-central1.run.app";

export function apiUrl(path: string): string {
  return `${BACKEND_URL.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}
