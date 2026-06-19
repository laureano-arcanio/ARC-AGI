import { useHealthStatus } from '../queries'

export function HealthPage() {
  const { data, isLoading, error } = useHealthStatus()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold">Health Check</h1>
      <p className="text-gray-400">
        This page checks the backend <code className="rounded bg-gray-800 px-2 py-0.5 text-sm">/health</code>{' '}
        endpoint to verify connectivity.
      </p>

      {isLoading && (
        <div className="flex items-center gap-3 text-gray-400">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-blue-400" />
          Checking backend health...
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
          <p className="font-semibold">Connection failed</p>
          <p className="mt-1 text-sm">{error.message}</p>
        </div>
      )}

      {data && (
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-6">
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
            <span className="font-medium text-green-400">Backend is reachable</span>
          </div>
          <pre className="overflow-x-auto rounded bg-gray-950 p-4 text-sm text-gray-300">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
