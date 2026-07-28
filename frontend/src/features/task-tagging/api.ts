import { http } from '../../lib/http'
import type { TaskTag, TaskTagRelation, TaskTagCreate, TaskTagUpdate, TaskTagRelationCreate } from './types'

export function getTaskTags(taskId: string): Promise<TaskTag[]> {
  return http.get<TaskTag[]>(`/v1/task-tags/${taskId}`)
}

export function createTaskTag(data: TaskTagCreate): Promise<TaskTag> {
  return http.post<TaskTag>('/v1/task-tags', data)
}

export function updateTaskTag(tagId: number, data: TaskTagUpdate): Promise<TaskTag> {
  return http.put<TaskTag>(`/v1/task-tags/${tagId}`, data)
}

export function deleteTaskTag(tagId: number): Promise<void> {
  return http.delete<void>(`/v1/task-tags/${tagId}`)
}

export function getTaskTagRelations(taskId: string): Promise<TaskTagRelation[]> {
  return http.get<TaskTagRelation[]>(`/v1/task-tags/${taskId}/relations`)
}

export function createTaskTagRelation(data: TaskTagRelationCreate): Promise<TaskTagRelation> {
  return http.post<TaskTagRelation>(`/v1/task-tags/${data.taskId}/relations`, data)
}

export function deleteTaskTagRelation(relationId: number): Promise<void> {
  return http.delete<void>(`/v1/task-tags/relations/${relationId}`)
}
