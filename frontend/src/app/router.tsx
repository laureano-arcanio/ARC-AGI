import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './Layout'
import { HomePage } from '../features/home/pages/HomePage'
import { HealthPage } from '../features/health/pages/HealthPage'

export function AppRouter() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/health" element={<HealthPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
