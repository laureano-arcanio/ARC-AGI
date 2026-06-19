import type { ArcSubset, ArcTask } from './types'

const GITHUB_CONTENTS_URL =
  'https://api.github.com/repos/fchollet/ARC/contents/data/'

export type GitHubContentsEntry = {
  name: string
  download_url: string
}

export type RandomTaskResult = {
  task: ArcTask
  name: string
  index: number
  total: number
  subset: ArcSubset
}

export async function listTasks(subset: ArcSubset): Promise<GitHubContentsEntry[]> {
  const response = await fetch(`${GITHUB_CONTENTS_URL}${subset}`, {
    headers: { Accept: 'application/vnd.github+json' },
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  return (await response.json()) as GitHubContentsEntry[]
}

export async function fetchTaskByUrl(url: string): Promise<ArcTask> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  return (await response.json()) as ArcTask
}

export async function fetchRandomTask(subset: ArcSubset = 'training'): Promise<RandomTaskResult> {
  const tasks = await listTasks(subset)
  if (tasks.length === 0) {
    throw new Error('No tasks available in subset')
  }
  const index = Math.floor(Math.random() * tasks.length)
  const entry = tasks[index]
  const task = await fetchTaskByUrl(entry.download_url)
  if (!Array.isArray(task.train) || !Array.isArray(task.test)) {
    throw new Error('Bad file format')
  }
  return { task, name: entry.name, index, total: tasks.length, subset }
}

export function readTaskFromFile(file: File): Promise<{ task: ArcTask; name: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const contents = e.target?.result
      if (typeof contents !== 'string') {
        reject(new Error('Could not read file'))
        return
      }
      try {
        const parsed = JSON.parse(contents) as ArcTask
        if (!Array.isArray(parsed.train) || !Array.isArray(parsed.test)) {
          reject(new Error('Bad file format'))
          return
        }
        resolve({ task: parsed, name: file.name })
      } catch {
        reject(new Error('Bad file format'))
      }
    }
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsText(file)
  })
}
