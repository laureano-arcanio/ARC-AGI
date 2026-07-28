import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getTaskTags,
  createTaskTag,
  updateTaskTag,
  deleteTaskTag,
  getTaskTagRelations,
  createTaskTagRelation,
  deleteTaskTagRelation,
} from './api'
import type { TaskTagCreate, TaskTagUpdate, TaskTagRelationCreate } from './types'

export const taskTagQueryKeys = {
  all: ['task-tags'] as const,
  tags: (taskId: string) => [...taskTagQueryKeys.all, 'tags', taskId] as const,
  relations: (taskId: string) => [...taskTagQueryKeys.all, 'relations', taskId] as const,
}

export function useTaskTags(taskId: string) {
  return useQuery({
    queryKey: taskTagQueryKeys.tags(taskId),
    queryFn: () => getTaskTags(taskId),
    enabled: !!taskId,
  })
}

export function useCreateTaskTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: TaskTagCreate) => createTaskTag(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taskTagQueryKeys.tags(data.taskId) })
    },
  })
}

export function useUpdateTaskTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ tagId, data }: { tagId: number; data: TaskTagUpdate }) =>
      updateTaskTag(tagId, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taskTagQueryKeys.tags(data.taskId) })
    },
  })
}

export function useDeleteTaskTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ tagId }: { tagId: number; taskId: string }) =>
      deleteTaskTag(tagId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: taskTagQueryKeys.tags(variables.taskId) })
      queryClient.invalidateQueries({ queryKey: taskTagQueryKeys.relations(variables.taskId) })
    },
  })
}

export function useTaskTagRelations(taskId: string) {
  return useQuery({
    queryKey: taskTagQueryKeys.relations(taskId),
    queryFn: () => getTaskTagRelations(taskId),
    enabled: !!taskId,
  })
}

export function useCreateTaskTagRelation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: TaskTagRelationCreate) => createTaskTagRelation(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: taskTagQueryKeys.relations(data.taskId) })
    },
  })
}

export function useDeleteTaskTagRelation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ relationId }: { relationId: number; taskId: string }) =>
      deleteTaskTagRelation(relationId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: taskTagQueryKeys.relations(variables.taskId) })
    },
  })
}
