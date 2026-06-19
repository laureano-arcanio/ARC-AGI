import type { ReactNode } from 'react'

type LayoutProps = {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="border-b border-gray-800 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-6">
          <a href="/" className="text-lg font-semibold tracking-tight">
            FastAPI Next Starter
          </a>
          <div className="flex gap-4 text-sm">
            <a href="/" className="text-gray-400 transition hover:text-white">
              Home
            </a>
            <a href="/health" className="text-gray-400 transition hover:text-white">
              Health
            </a>
            <a href="/arc-lab" className="text-gray-400 transition hover:text-white">
              ARC Lab
            </a>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-[1440px] px-6 py-12">{children}</main>
    </div>
  )
}
