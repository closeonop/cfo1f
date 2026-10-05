// API client. Access token lives in memory only; the refresh token is an
// httpOnly cookie managed by the backend. On a 401 we silently refresh once
// and retry. The custom header on refresh/logout doubles as a CSRF guard.

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;
  constructor(status: number, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { "X-Requested-With": "XMLHttpRequest" },
        });
        if (!res.ok) return false;
        const data = await res.json();
        accessToken = data.accessToken;
        return true;
      } catch {
        return false;
      } finally {
        setTimeout(() => (refreshing = null), 0);
      }
    })();
  }
  return refreshing;
}

interface Options {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  formData?: FormData;
  skipAuth?: boolean;
  raw?: boolean; // returns the Response (for CSV downloads)
}

export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const doFetch = () =>
    fetch(`${API_BASE}${path}`, {
      method: opts.method ?? "GET",
      credentials: "include",
      headers: {
        ...(opts.formData ? {} : opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(accessToken && !opts.skipAuth ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(opts.formData ? { "X-Requested-With": "XMLHttpRequest" } : {}),
      },
      body: opts.formData ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    });

  let res = await doFetch();
  if (res.status === 401 && !opts.skipAuth) {
    if (await tryRefresh()) {
      res = await doFetch();
    }
  }
  if (opts.raw) return res as T;
  if (!res.ok) {
    let message = "Something went wrong. Please try again.";
    let fieldErrors: Record<string, string> | undefined;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
      if (data?.fieldErrors) fieldErrors = data.fieldErrors;
    } catch {
      // non-JSON error body
    }
    throw new ApiError(res.status, message, fieldErrors);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

/** Download helper for CSV endpoints (returns the file as a blob URL). */
export async function downloadFile(path: string, filename: string) {
  const res = await api<Response>(path, { raw: true });
  if (!res.ok) throw new ApiError(res.status, "The download failed. Please try again.");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
