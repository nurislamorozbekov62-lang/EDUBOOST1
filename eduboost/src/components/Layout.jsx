import { useEffect, useMemo, useState } from 'react'
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import {
  Award,
  Bell,
  BookOpen,
  CalendarDays,
  CheckSquare,
  ClipboardList,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  School,
  Store,
  User,
  Users,
  X,
} from 'lucide-react'

import { useAuth } from '../context/AuthContext'

function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [isMenuOpen, setIsMenuOpen] =
    useState(false)

  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

  const studentMainMenu = useMemo(
    () => [
      {
        path: '/',
        label: 'Главная',
        icon: Home,
      },
      {
        path: '/schedule',
        label: 'Расписание',
        icon: CalendarDays,
      },
      {
        path: '/tasks',
        label: 'Задания',
        icon: ClipboardList,
      },
      {
        path: '/achievements',
        label: 'Достижения',
        icon: Award,
      },
      {
        path: '/profile',
        label: 'Профиль',
        icon: User,
      },
    ],
    [],
  )

  const studentExtraMenu = useMemo(
    () => [
      {
        path: '/my-journal',
        label: 'Успеваемость',
        icon: GraduationCap,
      },
      {
        path: '/tests',
        label: 'Мои тесты',
        icon: CheckSquare,
      },
      {
        path: '/courses',
        label: 'Учебные курсы',
        icon: BookOpen,
      },
      {
        path: '/messages',
        label: 'Сообщения',
        icon: MessageCircle,
      },
      {
        path: '/classes',
        label: 'Мой класс',
        icon: Users,
      },
      {
        path: '/ranking',
        label: 'Рейтинг',
        icon: Award,
      },
      {
        path: '/partner-rewards',
        label: 'Награды партнёров',
        icon: Store,
      },
      {
        path: '/my-coupons',
        label: 'Мои купоны',
        icon: CheckSquare,
      },
      {
        path: '/store',
        label: 'Магазин наград',
        icon: Store,
      },
    ],
    [],
  )

  const teacherMainMenu = useMemo(
    () => [
      {
        path: '/',
        label: 'Главная',
        icon: Home,
      },
      {
        path: '/teacher-schedule',
        label: 'Расписание',
        icon: CalendarDays,
      },
      {
        path: '/tasks',
        label: 'Задания',
        icon: ClipboardList,
      },
      {
        path: '/journal',
        label: 'Журнал',
        icon: GraduationCap,
      },
      {
        path: '/profile',
        label: 'Профиль',
        icon: User,
      },
    ],
    [],
  )

  const teacherExtraMenu = useMemo(
    () => [
      {
        path: '/teacher-tests',
        label: 'Конструктор тестов',
        icon: CheckSquare,
      },
      {
        path: '/teacher-courses',
        label: 'Учебные курсы',
        icon: BookOpen,
      },
      {
        path: '/classes',
        label: 'Классы',
        icon: School,
      },
      {
        path: '/messages',
        label: 'Сообщения',
        icon: MessageCircle,
      },
      {
        path: '/partner-dashboard',
        label: 'Кабинет партнёра',
        icon: Store,
      },
    ],
    [],
  )

  const parentMainMenu = useMemo(
    () => [
      {
        path: '/',
        label: 'Главная',
        icon: Home,
      },
      {
        path: '/schedule',
        label: 'Расписание',
        icon: CalendarDays,
      },
      {
        path: '/my-journal',
        label: 'Успеваемость',
        icon: GraduationCap,
      },
      {
        path: '/messages',
        label: 'Сообщения',
        icon: MessageCircle,
      },
      {
        path: '/profile',
        label: 'Профиль',
        icon: User,
      },
    ],
    [],
  )

  let mainMenu = studentMainMenu
  let extraMenu = studentExtraMenu

  if (user?.role === 'Учитель') {
    mainMenu = teacherMainMenu
    extraMenu = teacherExtraMenu
  }

  if (user?.role === 'Родитель') {
    mainMenu = parentMainMenu
    extraMenu = []
  }

  const allMenuItems = [
    ...mainMenu,
    ...extraMenu,
  ]

  function getPageTitle() {
    if (
      location.pathname.startsWith(
        '/notifications',
      )
    ) {
      return 'Уведомления'
    }

    const currentItem =
      allMenuItems.find((item) => {
        if (item.path === '/') {
          return location.pathname === '/'
        }

        return location.pathname.startsWith(
          item.path,
        )
      })

    return currentItem?.label || 'EduBoost'
  }

  function getInitial() {
    return String(user?.name || 'U')
      .charAt(0)
      .toUpperCase()
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <aside
        className={`app-sidebar ${
          isMenuOpen
            ? 'app-sidebar--open'
            : ''
        }`}
      >
        <div className="sidebar-header">
          <div className="brand">
            <div className="brand-icon">
              <BookOpen size={23} />
            </div>

            <span>EduBoost</span>
          </div>

          <button
            type="button"
            className="icon-button sidebar-close"
            onClick={() =>
              setIsMenuOpen(false)
            }
            aria-label="Закрыть меню"
          >
            <X size={22} />
          </button>
        </div>

        <div className="sidebar-user-card">
          <div className="user-avatar">
            {getInitial()}
          </div>

          <div className="sidebar-user-info">
            <strong>
              {user?.name ||
                'Пользователь'}
            </strong>

            <span>
              {user?.role || 'Ученик'}
            </span>
          </div>
        </div>

        <nav className="sidebar-navigation">
          {allMenuItems.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({
                  isActive,
                }) =>
                  `sidebar-link ${
                    isActive
                      ? 'sidebar-link--active'
                      : ''
                  }`
                }
              >
                <Icon
                  size={20}
                  strokeWidth={2}
                />

                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <button
          type="button"
          className="sidebar-logout"
          onClick={handleLogout}
        >
          <LogOut size={20} />
          <span>Выйти из аккаунта</span>
        </button>
      </aside>

      {isMenuOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          onClick={() =>
            setIsMenuOpen(false)
          }
          aria-label="Закрыть меню"
        />
      )}

      <div className="app-main">
        <header className="mobile-header">
          <button
            type="button"
            className="icon-button"
            onClick={() =>
              setIsMenuOpen(true)
            }
            aria-label="Открыть меню"
          >
            <Menu size={24} />
          </button>

          <div className="mobile-brand">
            <BookOpen size={22} />
            <span>EduBoost</span>
          </div>

          <button
            type="button"
            className="notification-button"
            onClick={() =>
              navigate('/notifications')
            }
            aria-label="Уведомления"
          >
            <Bell size={22} />
            <span className="notification-dot" />
          </button>
        </header>

        <header className="desktop-header">
          <div>
            <p className="page-eyebrow">
              Добро пожаловать
            </p>

            <h1 className="desktop-page-title">
              {getPageTitle()}
            </h1>
          </div>

          <button
            type="button"
            className="desktop-profile"
            onClick={() =>
              navigate('/profile')
            }
          >
            <div className="user-avatar user-avatar--small">
              {getInitial()}
            </div>

            <div>
              <strong>
                {user?.name ||
                  'Пользователь'}
              </strong>

              <span>
                {user?.role || 'Ученик'}
              </span>
            </div>
          </button>
        </header>

        <main className="app-content">
          <Outlet />
        </main>

        <nav className="bottom-navigation">
          {mainMenu.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({
                  isActive,
                }) =>
                  `bottom-navigation-item ${
                    isActive
                      ? 'bottom-navigation-item--active'
                      : ''
                  }`
                }
              >
                <Icon
                  size={22}
                  strokeWidth={2}
                />

                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

export default Layout