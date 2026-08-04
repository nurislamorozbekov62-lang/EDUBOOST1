import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import {
  AuthProvider,
  useAuth,
} from './context/AuthContext'

import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

import AchievementsPage from './pages/AchievementsPage'
import ClassesPage from './pages/ClassesPage'
import CourseDetailsPage from './pages/CourseDetailsPage'
import CouponPage from './pages/CouponPage'
import DashboardPage from './pages/DashboardPage'
import LessonPage from './pages/LessonPage'
import LoginPage from './pages/LoginPage'
import MessagesPage from './pages/MessagesPage'
import MyCouponsPage from './pages/MyCouponsPage'
import NotificationsPage from './pages/NotificationsPage'
import ParentDashboardPage from './pages/ParentDashboardPage'
import PartnerDashboardPage from './pages/PartnerDashboardPage'
import PartnerRewardsPage from './pages/PartnerRewardsPage'
import ProfilePage from './pages/ProfilePage'
import RankingPage from './pages/RankingPage'
import RegisterPage from './pages/RegisterPage'
import RewardsStorePage from './pages/RewardsStorePage'
import StudentCoursesPage from './pages/StudentCoursesPage'
import StudentJournalPage from './pages/StudentJournalPage'
import StudentSchedulePage from './pages/StudentSchedulePage'
import StudentTestsPage from './pages/StudentTestsPage'
import TasksPage from './pages/TasksPage'
import TeacherCoursesPage from './pages/TeacherCoursesPage'
import TeacherJournalPage from './pages/TeacherJournalPage'
import TeacherSchedulePage from './pages/TeacherSchedulePage'
import TeacherTestsPage from './pages/TeacherTestsPage'
import TestAttemptPage from './pages/TestAttemptPage'

import './App.css'

function RoleDashboard() {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role === 'Родитель') {
    return <ParentDashboardPage />
  }

  return <DashboardPage />
}

function CoursesByRole() {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role === 'Учитель') {
    return <TeacherCoursesPage />
  }

  if (user.role === 'Ученик') {
    return <StudentCoursesPage />
  }

  return (
    <div className="page-container">
      <div className="content-card">
        <h1>Учебные курсы</h1>

        <p>
          Раздел курсов доступен ученикам и учителям.
        </p>
      </div>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        path="/register"
        element={<RegisterPage />}
      />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route
          index
          element={<RoleDashboard />}
        />

        <Route
          path="tasks"
          element={<TasksPage />}
        />

        <Route
          path="notifications"
          element={<NotificationsPage />}
        />
<Route
  path="messages"
  element={<MessagesPage />}
/>


        <Route
          path="my-journal"
          element={<StudentJournalPage />}
        />

        <Route
          path="journal"
          element={<TeacherJournalPage />}
        />

        <Route
          path="schedule"
          element={<StudentSchedulePage />}
        />

        <Route
          path="teacher-schedule"
          element={<TeacherSchedulePage />}
        />

        <Route
          path="tests"
          element={<StudentTestsPage />}
        />

        <Route
          path="tests/:testId"
          element={<TestAttemptPage />}
        />

        <Route
          path="teacher-tests"
          element={<TeacherTestsPage />}
        />

        <Route
          path="courses"
          element={<CoursesByRole />}
        />

        <Route
          path="teacher-courses"
          element={<TeacherCoursesPage />}
        />

        <Route
          path="courses/:courseId"
          element={<CourseDetailsPage />}
        />

        <Route
          path="courses/:courseId/lessons/:lessonId"
          element={<LessonPage />}
        />

        <Route
          path="partner-rewards"
          element={<PartnerRewardsPage />}
        />

        <Route
          path="my-coupons"
          element={<MyCouponsPage />}
        />

        <Route
          path="coupons/:couponId"
          element={<CouponPage />}
        />

        <Route
          path="partner-dashboard"
          element={<PartnerDashboardPage />}
        />

        <Route
          path="achievements"
          element={<AchievementsPage />}
        />

        <Route
          path="ranking"
          element={<RankingPage />}
        />

        <Route
          path="store"
          element={<RewardsStorePage />}
        />

        <Route
          path="profile"
          element={<ProfilePage />}
        />

        <Route
          path="classes"
          element={<ClassesPage />}
        />
      </Route>

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App