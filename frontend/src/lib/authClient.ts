import { makeApiUrl } from "./apiBase";

const TOKEN_STORAGE_KEY = "sas_user";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    const token = parsed?.token;
    if (token && typeof token === "string") {
      return token;
    }
    return null;
  } catch {
    return null;
  }
}

type FetchOptions = RequestInit & {
  params?: Record<string, string | number | boolean | undefined | null>;
};

const buildUrl = (input: string, params?: FetchOptions["params"]): string => {
  const url = new URL(makeApiUrl(input));
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
};

export function withAuth(init?: FetchOptions): RequestInit {
  const token = getStoredToken();
  const headers = new Headers(init?.headers ?? {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const { params, ...rest } = init ?? {};
  return {
    ...rest,
    headers,
    credentials: rest.credentials ?? "include",
  };
}

export function apiFetch(input: string, init?: FetchOptions) {
  const url = buildUrl(input, init?.params);
  return fetch(url, withAuth(init));
}

type ErrorPayload = { message?: string };

export async function apiFetchJson<T>(input: string, init?: FetchOptions): Promise<T> {
  const response = await apiFetch(input, init);
  const data = (await response.json().catch(() => ({}))) as T | ErrorPayload;
  if (!response.ok) {
    const message = (data as ErrorPayload)?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return data as T;
}
