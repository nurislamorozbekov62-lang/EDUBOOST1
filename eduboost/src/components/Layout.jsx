import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom'

import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  CheckCircle2,
  CheckSquare,
  ClipboardList,
  Database,
  FileBarChart,
  GraduationCap,
  Home,
  Import,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  School,
  Settings,
  Store,
  User,
  UserCog,
  Users,
  X,
} from 'lucide-react'

import {
  useAuth,
} from '../context/AuthContext'

import {
  PERMISSIONS,
  ROLES,
  hasPermission,
} from '../config/access'

function Layout() {
  const {
    user,
    logout,
  } = useAuth()

  const location =
    useLocation()

  const navigate =
    useNavigate()

  const [
    isMenuOpen,
    setIsMenuOpen,
  ] = useState(false)

  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

  const menus = useMemo(
    () => createMenus(user),
    [user],
  )

  const mainMenu =
    menus.main

  const extraMenu =
    menus.extra

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
      allMenuItems.find(
        (item) => {
          if (item.path === '/') {
            return (
              location.pathname ===
              '/'
            )
          }

          return (
            location.pathname.startsWith(
              item.path,
            )
          )
        },
      )

    return (
      currentItem?.label ||
      'EduBoost'
    )
  }

  function getInitial() {
    return String(
      user?.name ||
        'U',
    )
      .charAt(0)
      .toUpperCase()
  }

  function getWorkspaceLabel() {
    const labels = {
      [ROLES.STUDENT]:
        'Личный кабинет',

      [ROLES.PARENT]:
        'Дневник ребёнка',

      [ROLES.TEACHER]:
        'Кабинет учителя',

      [ROLES.SCHOOL_ADMIN]:
        'Администрирование школы',

      [ROLES.DIRECTOR]:
        'Кабинет директора',

      [ROLES.VICE_PRINCIPAL]:
        'Кабинет завуча',

      [ROLES.PARTNER]:
        'Кабинет партнёра',

      [ROLES.SUPER_ADMIN]:
        'Управление EduBoost',
    }

    return (
      labels[user?.role] ||
      'EduBoost'
    )
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
              <BookOpen
                size={23}
              />
            </div>

            <span>
              EduBoost
            </span>
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
              {user?.role ||
                'Пользователь'}
            </span>
          </div>
        </div>

        <nav className="sidebar-navigation">
          {allMenuItems.map(
            (item) => {
              const Icon =
                item.icon

              return (
                <NavLink
                  key={`${item.path}-${item.label}`}
                  to={item.path}
                  end={
                    item.path ===
                    '/'
                  }
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

                  <span>
                    {item.label}
                  </span>
                </NavLink>
              )
            },
          )}
        </nav>

        <button
          type="button"
          className="sidebar-logout"
          onClick={
            handleLogout
          }
        >
          <LogOut size={20} />

          <span>
            Выйти из аккаунта
          </span>
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

            <span>
              EduBoost
            </span>
          </div>

          <button
            type="button"
            className="notification-button"
            onClick={() =>
              navigate(
                '/notifications',
              )
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
              {getWorkspaceLabel()}
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
                {user?.role ||
                  'Пользователь'}
              </span>
            </div>
          </button>
        </header>

        <main className="app-content">
          <Outlet />
        </main>

        <nav className="bottom-navigation">
          {mainMenu
            .slice(0, 5)
            .map((item) => {
              const Icon =
                item.icon

              return (
                <NavLink
                  key={`${item.path}-${item.label}`}
                  to={item.path}
                  end={
                    item.path ===
                    '/'
                  }
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

                  <span>
                    {item.shortLabel ||
                      item.label}
                  </span>
                </NavLink>
              )
            })}
        </nav>
      </div>
    </div>
  )
}

/* ========================================
   MENU FACTORY
======================================== */

function createMenus(user) {
  if (!user) {
    return {
      main: [],
      extra: [],
    }
  }

  switch (user.role) {
    case ROLES.TEACHER:
      return createTeacherMenu(user)

    case ROLES.PARENT:
      return createParentMenu()

    case ROLES.SCHOOL_ADMIN:
      return createSchoolAdminMenu(user)

    case ROLES.DIRECTOR:
      return createDirectorMenu(user)

    case ROLES.VICE_PRINCIPAL:
      return createVicePrincipalMenu(user)

    case ROLES.PARTNER:
      return createPartnerMenu()

    case ROLES.SUPER_ADMIN:
      return createSuperAdminMenu(user)

    case ROLES.STUDENT:
    default:
      return createStudentMenu()
  }
}

/* ========================================
   STUDENT
======================================== */

function createStudentMenu() {
  return {
    main: [
      {
        path: '/',
        label: 'Главная',
        icon: Home,
      },

      {
        path: '/schedule',
        label: 'Расписание',
        shortLabel: 'Уроки',
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
        shortLabel: 'Награды',
        icon: Award,
      },

      {
        path: '/profile',
        label: 'Профиль',
        icon: User,
      },
    ],

    extra: [
      {
        path: '/my-journal',
        label: 'Успеваемость',
        icon: GraduationCap,
      },

      {
        path: '/attendance',
        label: 'Посещаемость',
        icon: CheckCircle2,
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
  }
}

/* ========================================
   PARENT
======================================== */

function createParentMenu() {
  return {
    main: [
      {
        path: '/',
        label: 'Главная',
        icon: Home,
      },

      {
        path: '/schedule',
        label: 'Расписание',
        shortLabel: 'Уроки',
        icon: CalendarDays,
      },

      {
        path: '/parent-grades',
        label: 'Оценки',
        icon: GraduationCap,
      },

      {
        path: '/attendance',
        label: 'Посещаемость',
        shortLabel: 'Пропуски',
        icon: CheckCircle2,
      },

      {
        path: '/profile',
        label: 'Профиль',
        icon: User,
      },
    ],

    extra: [
      {
        path: '/quarter-grades',
        label: 'Четвертные оценки',
        icon: BarChart3,
      },

      {
        path: '/parent-tasks',
        label: 'Задания ребёнка',
        icon: ClipboardList,
      },

      {
        path: '/achievements',
        label: 'Достижения',
        icon: Award,
      },

      {
        path: '/messages',
        label: 'Сообщения',
        icon: MessageCircle,
      },

      {
        path: '/notifications',
        label: 'Уведомления',
        icon: Bell,
      },
    ],
  }
}

/* ========================================
   TEACHER
======================================== */

function createTeacherMenu(user) {
  const main = [
    {
      path: '/',
      label: 'Главная',
      icon: Home,
    },

    {
      path: '/teacher-schedule',
      label: 'Моё расписание',
      shortLabel: 'Уроки',
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
  ]

  const extra = []

  if (
    hasPermission(
      user,
      PERMISSIONS.VIEW_CLASSES,
    )
  ) {
    extra.push({
      path: '/classes',
      label: 'Мои классы',
      icon: School,
    })
  }

  if (
    hasPermission(
      user,
      PERMISSIONS.CREATE_TESTS,
    )
  ) {
    extra.push({
      path: '/teacher-tests',
      label: 'Конструктор тестов',
      icon: CheckSquare,
    })
  }

  if (
    hasPermission(
      user,
      PERMISSIONS.CREATE_COURSES,
    )
  ) {
    extra.push({
      path: '/teacher-courses',
      label: 'Учебные курсы',
      icon: BookOpen,
    })
  }

  extra.push(
    {
      path: '/messages',
      label: 'Сообщения',
      icon: MessageCircle,
    },
    {
      path: '/notifications',
      label: 'Уведомления',
      icon: Bell,
    },
  )

  return {
    main,
    extra,
  }
}

/* ========================================
   SCHOOL ADMIN
======================================== */

function createSchoolAdminMenu(user) {
  const main = [
    {
      path: '/',
      label: 'Главная',
      icon: LayoutDashboard,
    },

    {
      path: '/admin/users',
      label: 'Пользователи',
      icon: Users,
    },

    {
      path: '/admin/classes',
      label: 'Классы',
      icon: School,
    },

    {
      path: '/admin/staff',
      label: 'Сотрудники',
      icon: UserCog,
    },

    {
      path: '/profile',
      label: 'Профиль',
      icon: User,
    },
  ]

  const extra = []

  if (
    hasPermission(
      user,
      PERMISSIONS.MANAGE_SCHOOL_YEAR,
    )
  ) {
    extra.push({
      path: '/admin/school-year',
      label: 'Учебный год',
      icon: CalendarDays,
    })
  }

  if (
    hasPermission(
      user,
      PERMISSIONS.IMPORT_DATA,
    )
  ) {
    extra.push({
      path: '/admin/import',
      label: 'Импорт данных',
      icon: Import,
    })
  }

  if (
    hasPermission(
      user,
      PERMISSIONS.EXPORT_DATA,
    )
  ) {
    extra.push({
      path: '/admin/export',
      label: 'Экспорт данных',
      icon: Database,
    })
  }

  extra.push({
    path: '/admin/settings',
    label: 'Настройки школы',
    icon: Settings,
  })

  return {
    main,
    extra,
  }
}

/* ========================================
   VICE PRINCIPAL
======================================== */

function createVicePrincipalMenu(user) {
  const main = [
    {
      path: '/',
      label: 'Главная',
      icon: Home,
    },

    {
      path: '/admin/schedule',
      label: 'Расписание',
      shortLabel: 'Уроки',
      icon: CalendarDays,
    },

    {
      path: '/admin/workload',
      label: 'Нагрузка',
      icon: BriefcaseBusiness,
    },

    {
      path: '/admin/journals',
      label: 'Журналы',
      icon: GraduationCap,
    },

    {
      path: '/profile',
      label: 'Профиль',
      icon: User,
    },
  ]

  const extra = []

  if (
    hasPermission(
      user,
      PERMISSIONS.MANAGE_SUBSTITUTIONS,
    )
  ) {
    extra.push({
      path: '/admin/substitutions',
      label: 'Замены',
      icon: Users,
    })
  }

  extra.push(
    {
      path: '/admin/attendance',
      label: 'Посещаемость школы',
      icon: CheckCircle2,
    },

    {
      path: '/admin/reports',
      label: 'Отчёты',
      icon: FileBarChart,
    },

    {
      path: '/admin/classes',
      label: 'Классы',
      icon: School,
    },

    {
      path: '/messages',
      label: 'Сообщения',
      icon: MessageCircle,
    },
  )

  return {
    main,
    extra,
  }
}

/* ========================================
   DIRECTOR
======================================== */

function createDirectorMenu() {
  return {
    main: [
      {
        path: '/',
        label: 'Главная',
        icon: Home,
      },

      {
        path: '/admin/analytics',
        label: 'Аналитика',
        icon: ChartNoAxesCombined,
      },

      {
        path: '/admin/journals',
        label: 'Журналы',
        icon: GraduationCap,
      },

      {
        path: '/admin/reports',
        label: 'Отчёты',
        icon: FileBarChart,
      },

      {
        path: '/profile',
        label: 'Профиль',
        icon: User,
      },
    ],

    extra: [
      {
        path: '/admin/schedule',
        label: 'Расписание школы',
        icon: CalendarDays,
      },

      {
        path: '/admin/attendance',
        label: 'Посещаемость',
        icon: CheckCircle2,
      },

      {
        path: '/admin/workload',
        label: 'Нагрузка',
        icon: BriefcaseBusiness,
      },

      {
        path: '/admin/substitutions',
        label: 'Замены',
        icon: Users,
      },

      {
        path: '/admin/staff',
        label: 'Сотрудники',
        icon: UserCog,
      },

      {
        path: '/admin/classes',
        label: 'Классы',
        icon: School,
      },

      {
        path: '/messages',
        label: 'Сообщения',
        icon: MessageCircle,
      },
    ],
  }
}

/* ========================================
   PARTNER
======================================== */

function createPartnerMenu() {
  return {
    main: [
      {
        path: '/partner-dashboard',
        label: 'Главная',
        icon: Home,
      },

      {
        path: '/partner-offers',
        label: 'Предложения',
        icon: Store,
      },

      {
        path: '/partner-coupons',
        label: 'Купоны',
        icon: CheckSquare,
      },

      {
        path: '/partner-stats',
        label: 'Статистика',
        icon: BarChart3,
      },

      {
        path: '/profile',
        label: 'Профиль',
        icon: User,
      },
    ],

    extra: [],
  }
}

/* ========================================
   SUPER ADMIN
======================================== */

function createSuperAdminMenu() {
  return {
    main: [
      {
        path: '/super-admin',
        label: 'Главная',
        icon: LayoutDashboard,
      },

      {
        path: '/super-admin/schools',
        label: 'Школы',
        icon: Building2,
      },

      {
        path: '/super-admin/users',
        label: 'Пользователи',
        icon: Users,
      },

      {
        path: '/super-admin/analytics',
        label: 'Аналитика',
        icon: ChartNoAxesCombined,
      },

      {
        path: '/profile',
        label: 'Профиль',
        icon: User,
      },
    ],

    extra: [
      {
        path: '/super-admin/partners',
        label: 'Партнёры',
        icon: Store,
      },

      {
        path: '/super-admin/settings',
        label: 'Настройки системы',
        icon: Settings,
      },
    ],
  }
}

export default Layout