import { http } from '../../lib/http'
import type { UserRead } from './types'

export function createUser(): Promise<UserRead> {
  return http.post<UserRead>('/v1/users/', {})
}

export function getUserByUuid(uuid: string): Promise<UserRead> {
  return http.get<UserRead>(`/v1/users/by-uuid/${encodeURIComponent(uuid)}`)
}
