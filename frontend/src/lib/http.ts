import { env } from './env'

type HttpOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  params?: Record<string, string | undefined>
}

class HttpClientError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'HttpClientError'
    this.status = status
  }
}

function getToken(): string | null {
  try {
    return localStorage.getItem('authToken')
  } catch {
    return null
  }
}

async function request<T>(path: string, options: HttpOptions = {}): Promise<T> {
  const { body, params, ...init } = options

  const url = new URL(`${env.apiUrl}${path}`, window.location.origin)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) url.searchParams.set(key, value)
    })
  }

  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url.toString(), {
    ...init,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    throw new HttpClientError(response.status, `HTTP ${response.status}: ${response.statusText}`)
  }

  if (response.status === 204) return undefined as T

  return response.json() as Promise<T>
}

export const http = {
  get: <T>(path: string, options?: HttpOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: HttpOptions) => request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: HttpOptions) => request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: HttpOptions) => request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: HttpOptions) => request<T>(path, { ...options, method: 'DELETE' }),
}

export { HttpClientError }
