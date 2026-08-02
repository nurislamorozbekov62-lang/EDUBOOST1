import { useEffect, useState } from 'react'
import {
  NavLink,
  Outlet,
  useLocation,
} from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import NotificationBell from './NotificationBell'

function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()

  const [isMenuOpen, setIsMenuOpen] =
    useState(false)

  const studentMenu = [
    {
      path: '/',
      label: '🏠 Главная',
    },
    {
      path: '/tasks',
      label: '✅ Мои задания',
    },
    {
      path: '/my-journal',
      label: '📘 Мой дневник',
    },
    {
      path: '/schedule',
      label: '📅 Моё расписание',
    },
    {
      path: '/tests',
      label: '🧠 Мои тесты',
    },
    {
      path: '/courses',
      label: '📚 Учебные курсы',
    },
    {
      path: '/partner-rewards',
      label: '🏷 Партнёрские награды',
    },
    {
      path: '/my-coupons',
      label: '🎟 Мои купоны',
    },
    {
      path: '/achievements',
      label: '🏆 Достижения',
    },
    {
      path: '/ranking',
      label: '📊 Рейтинг',
    },
    {
      path: '/store',
      label: '🎁 Магазин наград',
    },
    {
      path: '/profile',
      label: '👤 Мой профиль',
    },
    {
      path: '/classes',
      label: '🏫 Мой класс',
    },
  ]

  const teacherMenu = [
    {
      path: '/',
      label: '🏠 Главная',
    },
    {
      path: '/tasks',
      label: '📝 Задания',
    },
    {
      path: '/journal',
      label: '📘 Электронный дневник',
    },
    {
      path: '/classes',
      label: '🏫 Классы',
    },
    {
      path: '/teacher-schedule',
      label: '📅 Расписание',
    },
    {
      path: '/teacher-tests',
      label: '🧠 Конструктор тестов',
    },
    {
      path: '/teacher-courses',
      label: '📚 Мои курсы',
    },
    {
      path: '/partner-dashboard',
      label: '🤝 Кабинет партнёра',
    },
  ]

  const parentMenu = [
    {
      path: '/',
      label: '🏠 Родительский кабинет',
    },
    {
      path: '/schedule',
      label: '📅 Расписание ребёнка',
    },
  ]

  let menuItems = studentMenu

  if (user.role === 'Учитель') {
    menuItems = teacherMenu
  }

  if (user.role === 'Родитель') {
    menuItems = parentMenu
  }

  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow =
      isMenuOpen ? 'hidden' : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [isMenuOpen])

  const handleLogout = () => {
    setIsMenuOpen(false)
    logout()
  }

  return (
    <div className="app-layout">
      <header className="mobile-topbar">
        <button
          type="button"
          className="mobile-menu-button"
          onClick={() =>
            setIsMenuOpen((current) => !current)
          }
          aria-label={
            isMenuOpen
              ? 'Закрыть меню'
              : 'Открыть меню'
          }
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? '✕' : '☰'}
        </button>

        <h1 className="mobile-logo">
          Edu<span>Boost</span>
        </h1>

        <NotificationBell />
      </header>

      {isMenuOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          onClick={() => setIsMenuOpen(false)}
          aria-label="Закрыть боковое меню"
        />
      )}

      <aside
        className={
          isMenuOpen
            ? 'sidebar sidebar-open'
            : 'sidebar'
        }
      >
        <div className="sidebar-header">
          <h1 className="sidebar-logo">
            Edu<span>Boost</span>
          </h1>

          <button
            type="button"
            className="sidebar-close-button"
            onClick={() => setIsMenuOpen(false)}
            aria-label="Закрыть меню"
          >
            ✕
          </button>
        </div>

        <nav className="sidebar-menu">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                isActive
                  ? 'sidebar-link active'
                  : 'sidebar-link'
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {user.name
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="sidebar-user-info">
              <strong>{user.name}</strong>

              <p>
                {user.role}
                {user.className
                  ? ` · ${user.className}`
                  : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-logout"
            onClick={handleLogout}
          >
            🚪 Выйти
          </button>
        </div>
      </aside>

      <main className="layout-content">
        <div className="layout-topbar">
          <div>
            <strong>{user.name}</strong>

            <span>
              {user.role}
              {user.className
                ? ` · ${user.className}`
                : ''}
            </span>
          </div>

          <NotificationBell />
        </div>

        <Outlet />
      </main>
    </div>
  )
}

export default Layout