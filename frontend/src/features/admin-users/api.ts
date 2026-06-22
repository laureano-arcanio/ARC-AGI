import { http } from '../../lib/http'
import type { UserCreate, UserRead, UserUpdate } from './types'

export function getUsers(): Promise<UserRead[]> {
  return http.get<UserRead[]>('/v1/users/')
}

export function createUser(data: UserCreate): Promise<UserRead> {
  return http.post<UserRead>('/v1/users/', data)
}

export function updateUser(id: number, data: UserUpdate): Promise<UserRead> {
  return http.put<UserRead>(`/v1/users/${id}`, data)
}

export function deleteUser(id: number): Promise<void> {
  return http.delete<void>(`/v1/users/${id}`)
}
