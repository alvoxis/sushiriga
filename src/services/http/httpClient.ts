/** Minimal JSON client for the future SUSHIRIGA backend. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface HttpClient {
  get<T>(path: string, init?: RequestInit): Promise<T>;
  post<T>(path: string, body?: unknown, init?: RequestInit): Promise<T>;
  patch<T>(path: string, body?: unknown, init?: RequestInit): Promise<T>;
}

export function createHttpClient(baseUrl: string, getToken?: () => string | null): HttpClient {
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
    const response = await fetch(new URL(path, baseUrl), {
      ...init,
      method,
      headers,
      body: body === undefined ? null : JSON.stringify(body),
    });
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
