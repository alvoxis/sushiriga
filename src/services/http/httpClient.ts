/** Minimal JSON client for the SUSHIRIGA backend (`server/`). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** The backend's error code (`{ error: { code } }`), if any. */
  get code(): string | undefined {
    const error = (this.body as { error?: { code?: unknown } } | undefined)?.error;
    return typeof error?.code === 'string' ? error.code : undefined;
  }
}

/** The request never reached the server (offline, DNS, CORS…). */
export class NetworkError extends Error {
  override name = 'NetworkError';
}

export interface HttpClient {
  get<T>(path: string, init?: RequestInit): Promise<T>;
  post<T>(path: string, body?: unknown, init?: RequestInit): Promise<T>;
  patch<T>(path: string, body?: unknown, init?: RequestInit): Promise<T>;
}

/**
 * `baseUrl` may be absolute ("https://api.sushiriga.lv") or relative to the site ("/") when the
 * backend serves the frontend itself. Paths are resolved against it.
 */
export function createHttpClient(baseUrl: string, getToken?: () => string | null): HttpClient {
  const base =
    typeof window !== 'undefined' ? new URL(baseUrl, window.location.origin) : new URL(baseUrl);
  if (!base.pathname.endsWith('/')) base.pathname += '/';

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    init?: RequestInit,
  ): Promise<T> {
    const headers = new Headers(init?.headers);
    headers.set('Accept', 'application/json');
    if (body !== undefined) headers.set('Content-Type', 'application/json');
    const token = getToken?.();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    let response: Response;
    try {
      response = await fetch(new URL(path.replace(/^\//, ''), base), {
        ...init,
        method,
        headers,
        body: body === undefined ? null : JSON.stringify(body),
      });
    } catch (error) {
      throw new NetworkError(error instanceof Error ? error.message : 'Network error');
    }
    const data: unknown =
      response.status === 204 ? undefined : await response.json().catch(() => undefined);
    if (!response.ok) throw new ApiError(response.status, `${method} ${path} failed`, data);
    return data as T;
  }
  return {
    get: (path, init) => request('GET', path, undefined, init),
    post: (path, body, init) => request('POST', path, body, init),
    patch: (path, body, init) => request('PATCH', path, body, init),
  };
}
