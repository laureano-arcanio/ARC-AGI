import { useState } from 'react'
import reactLogo from '../../../assets/react.svg'

export function HomePage() {
  const [count, setCount] = useState(0)

  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <div className="flex justify-center gap-6">
        <a href="https://vite.dev" target="_blank" rel="noreferrer">
          <img src="/vite.svg" className="h-24 w-24 transition duration-300 hover:drop-shadow-[0_0_2em_#646cffaa]" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="h-24 w-24 transition duration-300 hover:drop-shadow-[0_0_2em_#61dafbaa] motion-safe:animate-[spin_20s_linear_infinite]" alt="React logo" />
        </a>
      </div>

      <h1 className="text-5xl font-bold">Vite + React</h1>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-8">
        <button
          onClick={() => setCount((c) => c + 1)}
          className="rounded-lg border border-transparent bg-gray-800 px-5 py-3 text-base font-medium transition hover:border-gray-600 focus:outline-4 focus:outline-blue-500"
        >
          count is {count}
        </button>
        <p className="mt-4 text-gray-400">
          Edit <code className="text-sm">src/features/home/pages/HomePage.tsx</code> and save to test HMR
        </p>
      </div>

      <p className="text-gray-500">Click on the Vite and React logos to learn more</p>
    </div>
  )
}
