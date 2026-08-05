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
import { MyReviewsPage } from '../features/my-reviews/pages/MyReviewsPage'
import { MyReviewPage } from '../features/my-reviews/pages/MyReviewPage'
import { BatchLeaderboardPage } from '../features/batch-leaderboard/pages/BatchLeaderboardPage'
import { ActivityPage } from '../features/activity/pages/ActivityPage'
import { TasksPage } from '../features/tasks/pages/TasksPage'
import { TaskSolutionsPage } from '../features/task-solutions/pages/TaskSolutionsPage'
import { SyntheticReviewsListPage } from '../features/synthetic-reviews/pages/SyntheticReviewsListPage'
import { SyntheticReviewDetailPage } from '../features/synthetic-reviews/pages/SyntheticReviewDetailPage'

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
        <Route path="/my-reviews" element={<MyReviewsPage />} />
        <Route path="/my-reviews/:taskId" element={<MyReviewPage />} />
        <Route path="/admin/leaderboard" element={<BatchLeaderboardPage />} />
        <Route path="/admin/activity" element={<ActivityPage />} />
        <Route path="/admin/tasks" element={<TasksPage />} />
        <Route path="/admin/tasks/:taskId/solutions" element={<TaskSolutionsPage />} />
        <Route path="/admin/synthetic-reviews" element={<SyntheticReviewsListPage />} />
        <Route path="/admin/synthetic-reviews/:taskId" element={<SyntheticReviewDetailPage />} />
        <Route path="/admin/task-search" element={<Navigate to="/admin/synthetic-reviews" replace />} />
        <Route path="/hypothesize/:userId/:taskId" element={<HypothesizePage />} />
        <Route path="/hypothesize/:taskId" element={<HypothesizePage />} />
        <Route path="/solve/:userId/:taskId" element={<ArcLabPage />} />
        <Route path="/solve/:taskId" element={<ArcLabPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
