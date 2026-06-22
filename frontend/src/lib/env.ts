export const env = {
  apiUrl: import.meta.env.DEV ? '/api' : (import.meta.env.VITE_API_URL || '/api'),
} as const
