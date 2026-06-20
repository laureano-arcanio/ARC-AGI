import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './Layout'
import { HomePage } from '../features/home/pages/HomePage'
import { DashboardPage } from '../features/dashboard/pages/DashboardPage'
import { HealthPage } from '../features/health/pages/HealthPage'
import { ArcLabPage } from '../features/arc-lab/pages/ArcLabPage'

export function AppRouter() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/health" element={<HealthPage />} />
        <Route path="/solve/:uuid/:taskId" element={<ArcLabPage />} />
        <Route path="/solve/:taskId" element={<ArcLabPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
