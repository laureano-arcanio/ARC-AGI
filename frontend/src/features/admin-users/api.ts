import { http } from '../../lib/http'
import type { UserRead, UserUpdate } from './types'

export function getUsers(): Promise<UserRead[]> {
  return http.get<UserRead[]>('/v1/users/')
}

export function updateUser(id: number, data: UserUpdate): Promise<UserRead> {
  return http.put<UserRead>(`/v1/users/${id}`, data)
}

export function deleteUser(id: number): Promise<void> {
  return http.delete<void>(`/v1/users/${id}`)
}
