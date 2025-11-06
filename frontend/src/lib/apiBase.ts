const DEFAULT_BACKEND_URL = "http://localhost:8080";

const trimTrailingSlash = (value: string) => value.replace(/\/$/, "");

export function resolveBackendBase(): string {
  // Ưu tiên NEXT_PUBLIC_API_URL từ environment variables
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envUrl) {
    return trimTrailingSlash(envUrl);
  }

  // Fallback về localhost (chỉ dùng trong development)
  return DEFAULT_BACKEND_URL;
}

export function makeApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const base = resolveBackendBase();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
