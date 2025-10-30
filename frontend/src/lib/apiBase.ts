const DEFAULT_PORT = 8080;

const trimTrailingSlash = (value: string) => value.replace(/\/$/, "");

export function resolveBackendBase(): string {
  const envBase = process.env.NEXT_PUBLIC_API_BASE?.trim();
  if (envBase) {
    return trimTrailingSlash(envBase);
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    const forwardedMatch = hostname.match(/^(.*)-(\d+)(\..*)$/);

    if (forwardedMatch) {
      const [, prefix, , suffix] = forwardedMatch;
      return `${protocol}//${prefix}-${DEFAULT_PORT}${suffix}`;
    }

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//${hostname}:${DEFAULT_PORT}`;
    }

    return `${protocol}//${hostname}:${DEFAULT_PORT}`;
  }

  return `http://localhost:${DEFAULT_PORT}`;
}

export function makeApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const base = resolveBackendBase();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
