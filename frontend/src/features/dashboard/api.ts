import { http } from '../../lib/http'
import type { LoginResponse, UserRead } from './types'

export function createUser(
  email: string,
  password: string,
): Promise<UserRead> {
  return http.post<UserRead>('/v1/users/', { email, password })
}

export function loginUser(
  email: string,
  password: string,
): Promise<LoginResponse> {
  return http.post<LoginResponse>('/v1/users/login', { email, password })
}
