import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './Layout'
import { DashboardPage } from '../features/dashboard/pages/DashboardPage'
import { HealthPage } from '../features/health/pages/HealthPage'
import { ArcLabPage } from '../features/arc-lab/pages/ArcLabPage'
import { AdminUsersPage } from '../features/admin-users/pages/AdminUsersPage'
import { AdminUserDetailPage } from '../features/admin-user-detail/pages/AdminUserDetailPage'
import { AdminUserEventGraphPage } from '../features/admin-user-detail/pages/AdminUserEventGraphPage'
import { AdminBatchesPage } from '../features/batches/pages/AdminBatchesPage'
import { MyTasksPage } from '../features/my-tasks/pages/MyTasksPage'

export function AppRouter() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/health" element={<HealthPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/users/:userId" element={<AdminUserDetailPage />} />
        <Route path="/admin/users/:userId/tasks/:taskId/graph" element={<AdminUserEventGraphPage />} />
        <Route path="/admin/batches" element={<AdminBatchesPage />} />
        <Route path="/my-tasks" element={<MyTasksPage />} />
        <Route path="/solve/:userId/:taskId" element={<ArcLabPage />} />
        <Route path="/solve/:taskId" element={<ArcLabPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
