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

import {
  ROLES,
} from './config/access'


/* ========================================
   COMMON / STUDENT
======================================== */

import AchievementsPage from './pages/AchievementsPage'
import ClassesPage from './pages/ClassesPage'
import CourseDetailsPage from './pages/CourseDetailsPage'
import CouponPage from './pages/CouponPage'
import DashboardPage from './pages/DashboardPage'
import LessonPage from './pages/LessonPage'
import SchoolLessonPage from './pages/SchoolLessonPage'
import LoginPage from './pages/LoginPage'
import MessagesPage from './pages/MessagesPage'
import MyCouponsPage from './pages/MyCouponsPage'
import NotificationsPage from './pages/NotificationsPage'
import ProfilePage from './pages/ProfilePage'
import RankingPage from './pages/RankingPage'
import RegisterPage from './pages/RegisterPage'
import RewardsStorePage from './pages/RewardsStorePage'
import StudentCoursesPage from './pages/StudentCoursesPage'
import StudentJournalPage from './pages/StudentJournalPage'
import StudentSchedulePage from './pages/StudentSchedulePage'
import StudentTestsPage from './pages/StudentTestsPage'
import TasksPage from './pages/TasksPage'
import TestAttemptPage from './pages/TestAttemptPage'


/* ========================================
   TEACHER
======================================== */

import TeacherCoursesPage from './pages/TeacherCoursesPage'
import TeacherJournalPage from './pages/TeacherJournalPage'
import TeacherSchedulePage from './pages/TeacherSchedulePage'
import TeacherTestsPage from './pages/TeacherTestsPage'


/* ========================================
   PARENT
======================================== */

import ParentAttendancePage from './pages/ParentAttendancePage'
import ParentDashboardPage from './pages/ParentDashboardPage'
import ParentGradesPage from './pages/ParentGradesPage'
import ParentQuarterGradesPage from './pages/ParentQuarterGradesPage'
import ParentTasksPage from './pages/ParentTasksPage'


/* ========================================
   PARTNER
======================================== */

import PartnerDashboardPage from './pages/PartnerDashboardPage'
import PartnerRewardsPage from './pages/PartnerRewardsPage'


/* ========================================
   SCHOOL MANAGEMENT
======================================== */

import AdministrationDashboardPage from './pages/AdministrationDashboardPage'
import AdminSchedulePage from './pages/AdminSchedulePage'
import AdminWorkloadPage from './pages/AdminWorkloadPage'
import AdminSubstitutionsPage from './pages/AdminSubstitutionsPage'
import AdminJournalsPage from './pages/AdminJournalsPage'
import AdminAttendancePage from './pages/AdminAttendancePage'
import AdminReportsPage from './pages/AdminReportsPage'
import DirectorDashboardPage from './pages/DirectorDashboardPage'


import './App.css'


/* ========================================
   ROLE GUARD
======================================== */

function RequireRoles({
  roles,
  children,
}) {
  const {
    user,
  } = useAuth()

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }

  if (
    !roles.includes(
      user.role,
    )
  ) {
    return (
      <Navigate
        to="/"
        replace
      />
    )
  }

  return children
}


/* ========================================
   HOME BY ROLE
======================================== */

function RoleDashboard() {
  const {
    user,
  } = useAuth()

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }


  if (
    user.role ===
    ROLES.PARENT
  ) {
    return (
      <ParentDashboardPage />
    )
  }


  if (
    user.role ===
    ROLES.PARTNER
  ) {
    return (
      <PartnerDashboardPage />
    )
  }


  if (
    user.role ===
    ROLES.DIRECTOR
  ) {
    return (
      <DirectorDashboardPage />
    )
  }


  if (
    [
      ROLES.SCHOOL_ADMIN,
      ROLES.VICE_PRINCIPAL,
    ].includes(
      user.role,
    )
  ) {
    return (
      <AdministrationDashboardPage />
    )
  }


  if (
    user.role ===
    ROLES.SUPER_ADMIN
  ) {
    return (
      <AdminPlaceholder
        eyebrow="EduBoost"
        title="Super Admin"
        text="Управление школами, пользователями и всей платформой EduBoost."
      />
    )
  }


  return (
    <DashboardPage />
  )
}


/* ========================================
   TASKS BY ROLE
======================================== */

function TasksByRole() {
  const {
    user,
  } = useAuth()

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }


  if (
    user.role ===
    ROLES.PARENT
  ) {
    return (
      <ParentTasksPage />
    )
  }


  if (
    user.role ===
      ROLES.STUDENT ||
    user.role ===
      ROLES.TEACHER
  ) {
    return (
      <TasksPage />
    )
  }


  return (
    <Navigate
      to="/"
      replace
    />
  )
}


/* ========================================
   COURSES BY ROLE
======================================== */

function CoursesByRole() {
  const {
    user,
  } = useAuth()

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }


  if (
    user.role ===
    ROLES.TEACHER
  ) {
    return (
      <TeacherCoursesPage />
    )
  }


  if (
    user.role ===
    ROLES.STUDENT
  ) {
    return (
      <StudentCoursesPage />
    )
  }


  return (
    <Navigate
      to="/"
      replace
    />
  )
}


/* ========================================
   ATTENDANCE BY ROLE
======================================== */

function AttendanceByRole() {
  const {
    user,
  } = useAuth()

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }


  if (
    user.role ===
    ROLES.PARENT
  ) {
    return (
      <ParentAttendancePage />
    )
  }


  if (
    user.role ===
    ROLES.STUDENT
  ) {
    return (
      <AdminPlaceholder
        eyebrow="Учебный процесс"
        title="Моя посещаемость"
        text="Здесь будет история посещений, пропусков и опозданий ученика."
      />
    )
  }


  return (
    <Navigate
      to="/"
      replace
    />
  )
}


/* ========================================
   APP ROUTES
======================================== */

function AppRoutes() {
  return (
    <Routes>

      {/* =================================
          AUTH
      ================================= */}

      <Route
        path="/login"
        element={
          <LoginPage />
        }
      />

      <Route
        path="/register"
        element={
          <RegisterPage />
        }
      />


      {/* =================================
          PROTECTED
      ================================= */}

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >

        {/* HOME */}

        <Route
          index
          element={
            <RoleDashboard />
          }
        />


        {/* =================================
            COMMON
        ================================= */}

        <Route
          path="profile"
          element={
            <ProfilePage />
          }
        />

        <Route
          path="notifications"
          element={
            <NotificationsPage />
          }
        />

        <Route
          path="messages"
          element={
            <MessagesPage />
          }
        />

        <Route
          path="tasks"
          element={
            <TasksByRole />
          }
        />


        {/* =================================
            SCHOOL LESSON
        ================================= */}

        <Route
          path="school-lessons/:lessonId"
          element={
            <RequireRoles
              roles={[
                ROLES.TEACHER,
                ROLES.VICE_PRINCIPAL,
                ROLES.DIRECTOR,
              ]}
            >
              <SchoolLessonPage />
            </RequireRoles>
          }
        />


        {/* =================================
            STUDENT
        ================================= */}

        <Route
          path="schedule"
          element={
            <RequireRoles
              roles={[
                ROLES.STUDENT,
                ROLES.PARENT,
              ]}
            >
              <StudentSchedulePage />
            </RequireRoles>
          }
        />

        <Route
          path="my-journal"
          element={
            <RequireRoles
              roles={[
                ROLES.STUDENT,
              ]}
            >
              <StudentJournalPage />
            </RequireRoles>
          }
        />

        <Route
          path="tests"
          element={
            <RequireRoles
              roles={[
                ROLES.STUDENT,
              ]}
            >
              <StudentTestsPage />
            </RequireRoles>
          }
        />

        <Route
          path="tests/:testId"
          element={
            <RequireRoles
              roles={[
                ROLES.STUDENT,
              ]}
            >
              <TestAttemptPage />
            </RequireRoles>
          }
        />

        <Route
          path="achievements"
          element={
            <RequireRoles
              roles={[
                ROLES.STUDENT,
                ROLES.PARENT,
              ]}
            >
              <AchievementsPage />
            </RequireRoles>
          }
        />

        <Route
          path="ranking"
          element={
            <RequireRoles
              roles={[
                ROLES.STUDENT,
              ]}
            >
              <RankingPage />
            </RequireRoles>
          }
        />

        <Route
          path="store"
          element={
            <RequireRoles
              roles={[
                ROLES.STUDENT,
              ]}
            >
              <RewardsStorePage />
            </RequireRoles>
          }
        />


        {/* =================================
            PARENT
        ================================= */}

        <Route
          path="parent-tasks"
          element={
            <RequireRoles
              roles={[
                ROLES.PARENT,
              ]}
            >
              <ParentTasksPage />
            </RequireRoles>
          }
        />

        <Route
          path="parent-grades"
          element={
            <RequireRoles
              roles={[
                ROLES.PARENT,
              ]}
            >
              <ParentGradesPage />
            </RequireRoles>
          }
        />

        <Route
          path="quarter-grades"
          element={
            <RequireRoles
              roles={[
                ROLES.PARENT,
              ]}
            >
              <ParentQuarterGradesPage />
            </RequireRoles>
          }
        />

        <Route
          path="attendance"
          element={
            <AttendanceByRole />
          }
        />


        {/* =================================
            TEACHER
        ================================= */}

        <Route
          path="teacher-schedule"
          element={
            <RequireRoles
              roles={[
                ROLES.TEACHER,
              ]}
            >
              <TeacherSchedulePage />
            </RequireRoles>
          }
        />

        <Route
          path="journal"
          element={
            <RequireRoles
              roles={[
                ROLES.TEACHER,
              ]}
            >
              <TeacherJournalPage />
            </RequireRoles>
          }
        />

        <Route
          path="teacher-tests"
          element={
            <RequireRoles
              roles={[
                ROLES.TEACHER,
              ]}
            >
              <TeacherTestsPage />
            </RequireRoles>
          }
        />

        <Route
          path="teacher-courses"
          element={
            <RequireRoles
              roles={[
                ROLES.TEACHER,
              ]}
            >
              <TeacherCoursesPage />
            </RequireRoles>
          }
        />


        {/* =================================
            CLASSES
        ================================= */}

        <Route
          path="classes"
          element={
            <RequireRoles
              roles={[
                ROLES.STUDENT,
                ROLES.TEACHER,
              ]}
            >
              <ClassesPage />
            </RequireRoles>
          }
        />


        {/* =================================
            COURSES
        ================================= */}

        <Route
          path="courses"
          element={
            <CoursesByRole />
          }
        />

        <Route
          path="courses/:courseId"
          element={
            <RequireRoles
              roles={[
                ROLES.STUDENT,
                ROLES.TEACHER,
              ]}
            >
              <CourseDetailsPage />
            </RequireRoles>
          }
        />

        <Route
          path="courses/:courseId/lessons/:lessonId"
          element={
            <RequireRoles
              roles={[
                ROLES.STUDENT,
                ROLES.TEACHER,
              ]}
            >
              <LessonPage />
            </RequireRoles>
          }
        />


        {/* =================================
            REWARDS
        ================================= */}

        <Route
          path="partner-rewards"
          element={
            <RequireRoles
              roles={[
                ROLES.STUDENT,
              ]}
            >
              <PartnerRewardsPage />
            </RequireRoles>
          }
        />

        <Route
          path="my-coupons"
          element={
            <RequireRoles
              roles={[
                ROLES.STUDENT,
              ]}
            >
              <MyCouponsPage />
            </RequireRoles>
          }
        />

        <Route
          path="coupons/:couponId"
          element={
            <RequireRoles
              roles={[
                ROLES.STUDENT,
              ]}
            >
              <CouponPage />
            </RequireRoles>
          }
        />


        {/* =================================
            PARTNER
        ================================= */}

        <Route
          path="partner-dashboard"
          element={
            <RequireRoles
              roles={[
                ROLES.PARTNER,
              ]}
            >
              <PartnerDashboardPage />
            </RequireRoles>
          }
        />

        <Route
          path="partner-offers"
          element={
            <RequireRoles
              roles={[
                ROLES.PARTNER,
              ]}
            >
              <AdminPlaceholder
                eyebrow="Партнёр EduBoost"
                title="Предложения"
                text="Здесь партнёр сможет создавать и редактировать скидки, подарки и специальные предложения."
              />
            </RequireRoles>
          }
        />

        <Route
          path="partner-coupons"
          element={
            <RequireRoles
              roles={[
                ROLES.PARTNER,
              ]}
            >
              <AdminPlaceholder
                eyebrow="Партнёр EduBoost"
                title="Использование купонов"
                text="Здесь появится проверка QR-кодов и история погашенных купонов."
              />
            </RequireRoles>
          }
        />

        <Route
          path="partner-stats"
          element={
            <RequireRoles
              roles={[
                ROLES.PARTNER,
              ]}
            >
              <AdminPlaceholder
                eyebrow="Партнёр EduBoost"
                title="Статистика"
                text="Показы, выдачи купонов, погашения и эффективность предложений."
              />
            </RequireRoles>
          }
        />


        {/* =================================
            SCHOOL ADMIN
        ================================= */}

        <Route
          path="admin/users"
          element={
            <RequireRoles
              roles={[
                ROLES.SCHOOL_ADMIN,
              ]}
            >
              <AdminPlaceholder
                eyebrow="Администрирование"
                title="Пользователи школы"
                text="Ученики, родители, аккаунты и управление доступом."
              />
            </RequireRoles>
          }
        />

        <Route
          path="admin/classes"
          element={
            <RequireRoles
              roles={[
                ROLES.SCHOOL_ADMIN,
                ROLES.VICE_PRINCIPAL,
                ROLES.DIRECTOR,
              ]}
            >
              <AdminPlaceholder
                eyebrow="Структура школы"
                title="Классы"
                text="Классы, состав учеников, классные руководители и подгруппы."
              />
            </RequireRoles>
          }
        />

        <Route
          path="admin/staff"
          element={
            <RequireRoles
              roles={[
                ROLES.SCHOOL_ADMIN,
                ROLES.DIRECTOR,
              ]}
            >
              <AdminPlaceholder
                eyebrow="Школа"
                title="Сотрудники"
                text="Учителя, руководство и другие сотрудники школы."
              />
            </RequireRoles>
          }
        />

        <Route
          path="admin/school-year"
          element={
            <RequireRoles
              roles={[
                ROLES.SCHOOL_ADMIN,
              ]}
            >
              <AdminPlaceholder
                eyebrow="Настройки"
                title="Учебный год"
                text="Четверти, учебные периоды, каникулы и календарь школы."
              />
            </RequireRoles>
          }
        />

        <Route
          path="admin/import"
          element={
            <RequireRoles
              roles={[
                ROLES.SCHOOL_ADMIN,
              ]}
            >
              <AdminPlaceholder
                eyebrow="Данные школы"
                title="Импорт данных"
                text="Массовая загрузка учеников, сотрудников и классов."
              />
            </RequireRoles>
          }
        />

        <Route
          path="admin/export"
          element={
            <RequireRoles
              roles={[
                ROLES.SCHOOL_ADMIN,
              ]}
            >
              <AdminPlaceholder
                eyebrow="Данные школы"
                title="Экспорт данных"
                text="Выгрузка школьных данных и отчётов."
              />
            </RequireRoles>
          }
        />

        <Route
          path="admin/settings"
          element={
            <RequireRoles
              roles={[
                ROLES.SCHOOL_ADMIN,
              ]}
            >
              <AdminPlaceholder
                eyebrow="Администрирование"
                title="Настройки школы"
                text="Основные параметры и конфигурация школы."
              />
            </RequireRoles>
          }
        />


        {/* =================================
            VICE PRINCIPAL / DIRECTOR
        ================================= */}

        <Route
          path="admin/schedule"
          element={
            <RequireRoles
              roles={[
                ROLES.VICE_PRINCIPAL,
                ROLES.DIRECTOR,
              ]}
            >
              <AdminSchedulePage />
            </RequireRoles>
          }
        />

        <Route
          path="admin/workload"
          element={
            <RequireRoles
              roles={[
                ROLES.VICE_PRINCIPAL,
                ROLES.DIRECTOR,
              ]}
            >
              <AdminWorkloadPage />
            </RequireRoles>
          }
        />

        <Route
          path="admin/substitutions"
          element={
            <RequireRoles
              roles={[
                ROLES.VICE_PRINCIPAL,
                ROLES.DIRECTOR,
              ]}
            >
              <AdminSubstitutionsPage />
            </RequireRoles>
          }
        />

        <Route
          path="admin/journals"
          element={
            <RequireRoles
              roles={[
                ROLES.VICE_PRINCIPAL,
                ROLES.DIRECTOR,
              ]}
            >
              <AdminJournalsPage />
            </RequireRoles>
          }
        />

        <Route
          path="admin/attendance"
          element={
            <RequireRoles
              roles={[
                ROLES.VICE_PRINCIPAL,
                ROLES.DIRECTOR,
              ]}
            >
              <AdminAttendancePage />
            </RequireRoles>
          }
        />

        <Route
          path="admin/reports"
          element={
            <RequireRoles
              roles={[
                ROLES.VICE_PRINCIPAL,
                ROLES.DIRECTOR,
              ]}
            >
              <AdminReportsPage />
            </RequireRoles>
          }
        />


        {/* =================================
            DIRECTOR ONLY
        ================================= */}

        <Route
          path="admin/analytics"
          element={
            <RequireRoles
              roles={[
                ROLES.DIRECTOR,
              ]}
            >
              <DirectorDashboardPage />
            </RequireRoles>
          }
        />


        {/* =================================
            SUPER ADMIN
        ================================= */}

        <Route
          path="super-admin"
          element={
            <RequireRoles
              roles={[
                ROLES.SUPER_ADMIN,
              ]}
            >
              <AdminPlaceholder
                eyebrow="EduBoost"
                title="Управление платформой"
                text="Общее состояние системы EduBoost."
              />
            </RequireRoles>
          }
        />

        <Route
          path="super-admin/schools"
          element={
            <RequireRoles
              roles={[
                ROLES.SUPER_ADMIN,
              ]}
            >
              <AdminPlaceholder
                eyebrow="EduBoost"
                title="Школы"
                text="Подключённые школы и управление их аккаунтами."
              />
            </RequireRoles>
          }
        />

        <Route
          path="super-admin/users"
          element={
            <RequireRoles
              roles={[
                ROLES.SUPER_ADMIN,
              ]}
            >
              <AdminPlaceholder
                eyebrow="EduBoost"
                title="Пользователи"
                text="Пользователи всей платформы."
              />
            </RequireRoles>
          }
        />

        <Route
          path="super-admin/analytics"
          element={
            <RequireRoles
              roles={[
                ROLES.SUPER_ADMIN,
              ]}
            >
              <AdminPlaceholder
                eyebrow="EduBoost"
                title="Аналитика платформы"
                text="Статистика школ и использования EduBoost."
              />
            </RequireRoles>
          }
        />

        <Route
          path="super-admin/partners"
          element={
            <RequireRoles
              roles={[
                ROLES.SUPER_ADMIN,
              ]}
            >
              <AdminPlaceholder
                eyebrow="EduBoost"
                title="Партнёры"
                text="Управление партнёрами и программой наград."
              />
            </RequireRoles>
          }
        />

        <Route
          path="super-admin/settings"
          element={
            <RequireRoles
              roles={[
                ROLES.SUPER_ADMIN,
              ]}
            >
              <AdminPlaceholder
                eyebrow="EduBoost"
                title="Настройки платформы"
                text="Системные настройки EduBoost."
              />
            </RequireRoles>
          }
        />

      </Route>


      {/* =================================
          FALLBACK
      ================================= */}

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />

    </Routes>
  )
}


/* ========================================
   PLACEHOLDER
======================================== */

function AdminPlaceholder({
  eyebrow,
  title,
  text,
}) {
  return (
    <div
      className="page-container"
    >
      <section
        className="content-card"
      >
        <p
          style={{
            margin:
              '0 0 6px',

            color:
              '#1267e8',

            fontSize:
              '11px',

            fontWeight:
              800,

            textTransform:
              'uppercase',
          }}
        >
          {eyebrow}
        </p>

        <h1
          style={{
            margin:
              0,

            color:
              '#102343',
          }}
        >
          {title}
        </h1>

        <p
          style={{
            margin:
              '8px 0 0',

            color:
              '#718096',

            lineHeight:
              1.55,
          }}
        >
          {text}
        </p>
      </section>
    </div>
  )
}


/* ========================================
   APP
======================================== */

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