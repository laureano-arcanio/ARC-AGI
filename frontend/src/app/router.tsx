import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './Layout'
import { DashboardPage } from '../features/dashboard/pages/DashboardPage'
import { HealthPage } from '../features/health/pages/HealthPage'
import { ArcLabPage } from '../features/arc-lab/pages/ArcLabPage'
import { HypothesizePage } from '../features/arc-lab/pages/HypothesizePage'
import { AdminUsersPage } from '../features/admin-users/pages/AdminUsersPage'
import { AdminUserDetailPage } from '../features/admin-user-detail/pages/AdminUserDetailPage'
import { AdminUserTaskDetailPage } from '../features/admin-user-detail/pages/AdminUserTaskDetailPage'
import { AdminBatchesPage } from '../features/batches/pages/AdminBatchesPage'
import { MyTasksPage } from '../features/my-tasks/pages/MyTasksPage'
import { ReviewTaskPage } from '../features/reviews/pages/ReviewTaskPage'
import { AdminReviewPairsPage } from '../features/reviews/pages/AdminReviewPairsPage'

export function AppRouter() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/health" element={<HealthPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/users/:userId" element={<AdminUserDetailPage />} />
        <Route path="/admin/users/:userId/task/:taskId" element={<AdminUserTaskDetailPage />} />
        <Route path="/admin/batches" element={<AdminBatchesPage />} />
        <Route path="/my-tasks" element={<MyTasksPage />} />
        <Route path="/review/:solverId/:taskId" element={<ReviewTaskPage />} />
        <Route path="/admin/review-pairs" element={<AdminReviewPairsPage />} />
        <Route path="/hypothesize/:userId/:taskId" element={<HypothesizePage />} />
        <Route path="/hypothesize/:taskId" element={<HypothesizePage />} />
        <Route path="/solve/:userId/:taskId" element={<ArcLabPage />} />
        <Route path="/solve/:taskId" element={<ArcLabPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
