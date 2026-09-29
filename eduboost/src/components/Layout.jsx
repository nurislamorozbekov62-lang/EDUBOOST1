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
  useLanguage,
} from '../context/LanguageContext'

import {
  PERMISSIONS,
  ROLES,
  hasPermission,
} from '../config/access'

import StaffAccessGuard from './StaffAccessGuard'


function Layout() {
  const {
    user,
    logout,
  } = useAuth()

  const {
    t,
    isKyrgyz,
  } = useLanguage()

  const location =
    useLocation()

  const navigate =
    useNavigate()

  const [
    isMenuOpen,
    setIsMenuOpen,
  ] = useState(false)


  /* ========================================
     CLOSE MOBILE MENU
  ======================================== */

  useEffect(() => {
    setIsMenuOpen(false)
  }, [
    location.pathname,
  ])


  /* ========================================
     MOBILE MENU UX
  ======================================== */

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined
    }

    const previousOverflow =
      document.body.style.overflow

    document.body.style.overflow =
      'hidden'

    function handleKeyDown(
      event,
    ) {
      if (
        event.key ===
        'Escape'
      ) {
        setIsMenuOpen(false)
      }
    }

    window.addEventListener(
      'keydown',
      handleKeyDown,
    )

    return () => {
      document.body.style.overflow =
        previousOverflow

      window.removeEventListener(
        'keydown',
        handleKeyDown,
      )
    }
  }, [
    isMenuOpen,
  ])


  /* ========================================
     MENUS
  ======================================== */

  const menus = useMemo(
    () =>
      createMenus(
        user,
        t,
      ),
    [
      user,
      t,
    ],
  )

  const mainMenu =
    menus.main

  const extraMenu =
    menus.extra

  const allMenuItems =
    useMemo(
      () => [
        ...mainMenu,
        ...extraMenu,
      ],
      [
        mainMenu,
        extraMenu,
      ],
    )


  /* ========================================
     PAGE TITLE
  ======================================== */

  function getPageTitle() {
    if (
      location.pathname ===
      '/settings'
    ) {
      return t(
        'navigation.settings',
      )
    }

    if (
      location.pathname.startsWith(
        '/notifications',
      )
    ) {
      return t(
        'navigation.notifications',
      )
    }

    const currentItem =
      [
        ...allMenuItems,
      ]
        .sort(
          (
            first,
            second,
          ) =>
            second.path.length -
            first.path.length,
        )
        .find(
          (
            item,
          ) => {
            if (
              item.path ===
              '/'
            ) {
              return (
                location.pathname ===
                '/'
              )
            }

            return (
              location.pathname ===
                item.path ||
              location.pathname.startsWith(
                `${item.path}/`,
              )
            )
          },
        )

    return (
      currentItem?.label ||
      'EduBoost'
    )
  }


  /* ========================================
     USER INITIAL
  ======================================== */

  function getInitial() {
    return String(
      user?.name ||
        'U',
    )
      .charAt(0)
      .toUpperCase()
  }


  /* ========================================
     WORKSPACE LABEL
  ======================================== */

  function getWorkspaceLabel() {
    const labels = {
      [ROLES.STUDENT]:
        t(
          'workspace.student',
        ),

      [ROLES.PARENT]:
        t(
          'workspace.parent',
        ),

      [ROLES.TEACHER]:
        t(
          'workspace.teacher',
        ),

      [ROLES.SCHOOL_ADMIN]:
        t(
          'workspace.schoolAdmin',
        ),

      [ROLES.DIRECTOR]:
        t(
          'workspace.director',
        ),

      [ROLES.VICE_PRINCIPAL]:
        t(
          'workspace.vicePrincipal',
        ),

      [ROLES.PARTNER]:
        t(
          'workspace.partner',
        ),

      [ROLES.SUPER_ADMIN]:
        t(
          'workspace.superAdmin',
        ),
    }

    return (
      labels[
        user?.role
      ] ||
      'EduBoost'
    )
  }


  /* ========================================
     LOGOUT
  ======================================== */

  async function handleLogout() {
    const confirmed =
      window.confirm(
        t(
          'account.logoutConfirm',
        ),
      )

    if (!confirmed) {
      return
    }

    try {
      await logout()

      navigate(
        '/login',
        {
          replace: true,
        },
      )
    } catch (
      error
    ) {
      console.error(
        'Logout:',
        error,
      )
    }
  }


  const openMenuLabel =
    isKyrgyz
      ? 'Менюну ачуу'
      : 'Открыть меню'

  const closeMenuLabel =
    isKyrgyz
      ? 'Менюну жабуу'
      : 'Закрыть меню'

  const homeLabel =
    isKyrgyz
      ? 'Башкы бетке өтүү'
      : 'На главную'


  return (
    <div className="app-shell">

      {/* ========================================
          STAFF ACCESS GUARD
      ======================================== */}

      <StaffAccessGuard />


      {/* ========================================
          SIDEBAR
      ======================================== */}

      <aside
        className={`app-sidebar ${
          isMenuOpen
            ? 'app-sidebar--open'
            : ''
        }`}
      >

        <div className="sidebar-header">

          <button
            type="button"
            className="brand"
            onClick={() =>
              navigate('/')
            }
            aria-label={
              homeLabel
            }
            title={
              homeLabel
            }
            style={{
              border: 'none',
              padding: 0,
              background:
                'transparent',
              cursor:
                'pointer',
              textAlign:
                'left',
            }}
          >

            <div className="brand-icon">
              <BookOpen
                size={23}
              />
            </div>

            <span>
              EduBoost
            </span>

          </button>


          <button
            type="button"
            className="icon-button sidebar-close"
            onClick={() =>
              setIsMenuOpen(
                false,
              )
            }
            aria-label={
              closeMenuLabel
            }
            title={
              closeMenuLabel
            }
          >
            <X
              size={22}
            />
          </button>

        </div>


        {/* USER */}

        <div className="sidebar-user-card">

          <div className="user-avatar">
            {getInitial()}
          </div>

          <div className="sidebar-user-info">

            <strong>
              {user?.name ||
                (isKyrgyz
                  ? 'Колдонуучу'
                  : 'Пользователь')}
            </strong>

            <span>
              {getRoleLabel(
                user?.role,
                isKyrgyz,
              )}
            </span>

          </div>

        </div>


        {/* NAVIGATION */}

        <nav className="sidebar-navigation">

          {allMenuItems.map(
            (
              item,
            ) => {
              const Icon =
                item.icon

              return (
                <NavLink
                  key={`${item.path}-${item.label}`}
                  to={
                    item.path
                  }
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


        {/* SETTINGS */}

        <NavLink
          to="/settings"
          className={({
            isActive,
          }) =>
            `sidebar-link ${
              isActive
                ? 'sidebar-link--active'
                : ''
            }`
          }
          style={{
            marginTop:
              '8px',
          }}
        >

          <Settings
            size={20}
            strokeWidth={2}
          />

          <span>
            {t(
              'navigation.settings',
            )}
          </span>

        </NavLink>


        {/* LOGOUT */}

        <button
          type="button"
          className="sidebar-logout"
          onClick={
            handleLogout
          }
        >

          <LogOut
            size={20}
          />

          <span>
            {t(
              'account.logoutFromAccount',
            )}
          </span>

        </button>

      </aside>


      {/* ========================================
          OVERLAY
      ======================================== */}

      {isMenuOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          onClick={() =>
            setIsMenuOpen(
              false,
            )
          }
          aria-label={
            closeMenuLabel
          }
        />
      )}


      <div className="app-main">

        {/* ========================================
            MOBILE HEADER
        ======================================== */}

        <header className="mobile-header">

          {/* MENU */}

          <button
            type="button"
            className="icon-button"
            onClick={() =>
              setIsMenuOpen(
                true,
              )
            }
            aria-label={
              openMenuLabel
            }
            title={
              openMenuLabel
            }
          >
            <Menu
              size={24}
            />
          </button>


          {/* LOGO */}

          <button
            type="button"
            className="mobile-brand"
            onClick={() =>
              navigate('/')
            }
            aria-label={
              homeLabel
            }
            title={
              homeLabel
            }
            style={{
              border:
                'none',

              background:
                'transparent',

              padding:
                0,

              color:
                'var(--primary)',

              cursor:
                'pointer',
            }}
          >

            <BookOpen
              size={22}
            />

            <span>
              EduBoost
            </span>

          </button>


          {/* RIGHT */}

          <div
            className="mobile-header-actions"
            style={{
              display:
                'flex',

              alignItems:
                'center',

              gap:
                '9px',
            }}
          >

            {/* SETTINGS */}

            <button
              type="button"
              className="notification-button"
              onClick={() =>
                navigate(
                  '/settings',
                )
              }
              aria-label={
                t(
                  'navigation.settings',
                )
              }
              title={
                t(
                  'navigation.settings',
                )
              }
              style={
                location.pathname ===
                '/settings'
                  ? {
                      color:
                        'var(--primary)',

                      background:
                        'var(--primary-light)',
                    }
                  : undefined
              }
            >

              <Settings
                size={22}
              />

            </button>


            {/* NOTIFICATIONS */}

            <button
              type="button"
              className="notification-button"
              onClick={() =>
                navigate(
                  '/notifications',
                )
              }
              aria-label={
                t(
                  'navigation.notifications',
                )
              }
              title={
                t(
                  'navigation.notifications',
                )
              }
              style={
                location.pathname.startsWith(
                  '/notifications',
                )
                  ? {
                      color:
                        'var(--primary)',

                      background:
                        'var(--primary-light)',
                    }
                  : undefined
              }
            >

              <Bell
                size={22}
              />

              <span className="notification-dot" />

            </button>

          </div>

        </header>


        {/* ========================================
            DESKTOP HEADER
        ======================================== */}

        <header className="desktop-header">

          <div>

            <p className="page-eyebrow">
              {getWorkspaceLabel()}
            </p>

            <h1 className="desktop-page-title">
              {getPageTitle()}
            </h1>

          </div>


          <div
            style={{
              display:
                'flex',

              alignItems:
                'center',

              gap:
                '10px',
            }}
          >

            {/* DESKTOP SETTINGS */}

            <button
              type="button"
              className="icon-button"
              onClick={() =>
                navigate(
                  '/settings',
                )
              }
              aria-label={
                t(
                  'navigation.settings',
                )
              }
              title={
                t(
                  'navigation.settings',
                )
              }
            >

              <Settings
                size={21}
              />

            </button>


            {/* PROFILE */}

            <button
              type="button"
              className="desktop-profile"
              onClick={() =>
                navigate(
                  '/profile',
                )
              }
            >

              <div className="user-avatar user-avatar--small">
                {getInitial()}
              </div>

              <div>

                <strong>
                  {user?.name ||
                    (isKyrgyz
                      ? 'Колдонуучу'
                      : 'Пользователь')}
                </strong>

                <span>
                  {getRoleLabel(
                    user?.role,
                    isKyrgyz,
                  )}
                </span>

              </div>

            </button>

          </div>

        </header>


        {/* ========================================
            CONTENT
        ======================================== */}

        <main className="app-content">
          <Outlet />
        </main>


        {/* ========================================
            MOBILE BOTTOM NAV
        ======================================== */}

        <nav className="bottom-navigation">

          {mainMenu
            .slice(
              0,
              5,
            )
            .map(
              (
                item,
              ) => {
                const Icon =
                  item.icon

                return (
                  <NavLink
                    key={`${item.path}-${item.label}`}
                    to={
                      item.path
                    }
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
              },
            )}

        </nav>

      </div>

    </div>
  )
}


/* ========================================
   ROLE LABEL
======================================== */

function getRoleLabel(
  role,
  isKyrgyz,
) {
  if (!isKyrgyz) {
    return (
      role ||
      'Пользователь'
    )
  }

  const labels = {
    [ROLES.STUDENT]:
      'Окуучу',

    [ROLES.PARENT]:
      'Ата-эне',

    [ROLES.TEACHER]:
      'Мугалим',

    [ROLES.SCHOOL_ADMIN]:
      'Мектеп администратору',

    [ROLES.DIRECTOR]:
      'Директор',

    [ROLES.VICE_PRINCIPAL]:
      'Директордун орун басары',

    [ROLES.PARTNER]:
      'Өнөктөш',

    [ROLES.SUPER_ADMIN]:
      'Башкы администратор',
  }

  return (
    labels[
      role
    ] ||
    'Колдонуучу'
  )
}


/* ========================================
   MENU FACTORY
======================================== */

function createMenus(
  user,
  t,
) {
  if (!user) {
    return {
      main: [],
      extra: [],
    }
  }

  switch (
    user.role
  ) {
    case ROLES.TEACHER:
      return createTeacherMenu(
        user,
        t,
      )

    case ROLES.PARENT:
      return createParentMenu(
        t,
      )

    case ROLES.SCHOOL_ADMIN:
      return createSchoolAdminMenu(
        user,
        t,
      )

    case ROLES.DIRECTOR:
      return createDirectorMenu(
        t,
      )

    case ROLES.VICE_PRINCIPAL:
      return createVicePrincipalMenu(
        user,
        t,
      )

    case ROLES.PARTNER:
      return createPartnerMenu(
        t,
      )

    case ROLES.SUPER_ADMIN:
      return createSuperAdminMenu(
        t,
      )

    case ROLES.STUDENT:

    default:
      return createStudentMenu(
        t,
      )
  }
}


/* ========================================
   STUDENT
======================================== */

function createStudentMenu(
  t,
) {
  return {
    main: [
      {
        path: '/',
        label:
          t(
            'navigation.home',
          ),
        icon: Home,
      },

      {
        path: '/schedule',
        label:
          t(
            'navigation.schedule',
          ),
        shortLabel:
          t(
            'navigation.lessons',
          ),
        icon:
          CalendarDays,
      },

      {
        path: '/tasks',
        label:
          t(
            'navigation.tasks',
          ),
        icon:
          ClipboardList,
      },

      {
        path: '/achievements',
        label:
          t(
            'navigation.achievements',
          ),
        shortLabel:
          isCompactRewardLabel(
            t,
          ),
        icon:
          Award,
      },

      {
        path: '/profile',
        label:
          t(
            'navigation.profile',
          ),
        icon:
          User,
      },
    ],

    extra: [
      {
        path:
          '/my-journal',

        label:
          t(
            'navigation.progress',
          ),

        icon:
          GraduationCap,
      },

      {
        path:
          '/attendance',

        label:
          t(
            'navigation.attendance',
          ),

        icon:
          CheckCircle2,
      },

      {
        path:
          '/tests',

        label:
          t(
            'navigation.tests',
          ),

        icon:
          CheckSquare,
      },

      {
        path:
          '/courses',

        label:
          t(
            'navigation.courses',
          ),

        icon:
          BookOpen,
      },

      {
        path:
          '/messages',

        label:
          t(
            'navigation.messages',
          ),

        icon:
          MessageCircle,
      },

      {
        path:
          '/classes',

        label:
          t(
            'navigation.myClass',
          ),

        icon:
          Users,
      },

      {
        path:
          '/ranking',

        label:
          t(
            'navigation.rating',
          ),

        icon:
          Award,
      },

      {
        path:
          '/partner-rewards',

        label:
          t(
            'navigation.partnerRewards',
          ),

        icon:
          Store,
      },

      {
        path:
          '/my-coupons',

        label:
          t(
            'navigation.myCoupons',
          ),

        icon:
          CheckSquare,
      },

      {
        path:
          '/store',

        label:
          t(
            'navigation.rewardsStore',
          ),

        icon:
          Store,
      },
    ],
  }
}


function isCompactRewardLabel(
  t,
) {
  const full =
    t(
      'navigation.achievements',
    )

  if (
    full ===
    'Жетишкендиктер'
  ) {
    return 'Сыйлыктар'
  }

  return 'Награды'
}


/* ========================================
   PARENT
======================================== */

function createParentMenu(
  t,
) {
  return {
    main: [
      {
        path: '/',
        label:
          t(
            'navigation.home',
          ),
        icon: Home,
      },

      {
        path:
          '/schedule',

        label:
          t(
            'navigation.schedule',
          ),

        shortLabel:
          t(
            'navigation.lessons',
          ),

        icon:
          CalendarDays,
      },

      {
        path:
          '/parent-grades',

        label:
          t(
            'navigation.grades',
          ),

        icon:
          GraduationCap,
      },

      {
        path:
          '/attendance',

        label:
          t(
            'navigation.attendance',
          ),

        shortLabel:
          t(
            'navigation.attendance',
          ),

        icon:
          CheckCircle2,
      },

      {
        path:
          '/profile',

        label:
          t(
            'navigation.profile',
          ),

        icon:
          User,
      },
    ],

    extra: [
      {
        path:
          '/quarter-grades',

        label:
          t(
            'navigation.quarterGrades',
          ),

        icon:
          BarChart3,
      },

      {
        path:
          '/parent-tasks',

        label:
          t(
            'navigation.childTasks',
          ),

        icon:
          ClipboardList,
      },

      {
        path:
          '/achievements',

        label:
          t(
            'navigation.achievements',
          ),

        icon:
          Award,
      },

      {
        path:
          '/messages',

        label:
          t(
            'navigation.messages',
          ),

        icon:
          MessageCircle,
      },

      {
        path:
          '/notifications',

        label:
          t(
            'navigation.notifications',
          ),

        icon:
          Bell,
      },
    ],
  }
}


/* ========================================
   TEACHER
======================================== */

function createTeacherMenu(
  user,
  t,
) {
  const main = [
    {
      path:
        '/',

      label:
        t(
          'navigation.home',
        ),

      icon:
        Home,
    },

    {
      path:
        '/teacher-schedule',

      label:
        t(
          'navigation.teacherSchedule',
        ),

      shortLabel:
        t(
          'navigation.lessons',
        ),

      icon:
        CalendarDays,
    },

    {
      path:
        '/tasks',

      label:
        t(
          'navigation.tasks',
        ),

      icon:
        ClipboardList,
    },

    {
      path:
        '/journal',

      label:
        t(
          'navigation.journal',
        ),

      icon:
        GraduationCap,
    },

    {
      path:
        '/profile',

      label:
        t(
          'navigation.profile',
        ),

      icon:
        User,
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
      path:
        '/classes',

      label:
        t(
          'navigation.myClasses',
        ),

      icon:
        School,
    })
  }


  if (
    hasPermission(
      user,
      PERMISSIONS.CREATE_TESTS,
    )
  ) {
    extra.push({
      path:
        '/teacher-tests',

      label:
        t(
          'navigation.testBuilder',
        ),

      icon:
        CheckSquare,
    })
  }


  if (
    hasPermission(
      user,
      PERMISSIONS.CREATE_COURSES,
    )
  ) {
    extra.push({
      path:
        '/teacher-courses',

      label:
        t(
          'navigation.courses',
        ),

      icon:
        BookOpen,
    })
  }


  extra.push(
    {
      path:
        '/messages',

      label:
        t(
          'navigation.messages',
        ),

      icon:
        MessageCircle,
    },

    {
      path:
        '/notifications',

      label:
        t(
          'navigation.notifications',
        ),

      icon:
        Bell,
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

function createSchoolAdminMenu(
  user,
  t,
) {
  const main = [
    {
      path:
        '/',

      label:
        t(
          'navigation.home',
        ),

      icon:
        LayoutDashboard,
    },

    {
      path:
        '/admin/users',

      label:
        t(
          'navigation.users',
        ),

      icon:
        Users,
    },

    {
      path:
        '/admin/classes',

      label:
        t(
          'navigation.classes',
        ),

      icon:
        School,
    },

    {
      path:
        '/admin/staff',

      label:
        t(
          'navigation.staff',
        ),

      icon:
        UserCog,
    },

    {
      path:
        '/profile',

      label:
        t(
          'navigation.profile',
        ),

      icon:
        User,
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
      path:
        '/admin/school-year',

      label:
        t(
          'navigation.schoolYear',
        ),

      icon:
        CalendarDays,
    })
  }


  if (
    hasPermission(
      user,
      PERMISSIONS.IMPORT_DATA,
    )
  ) {
    extra.push({
      path:
        '/admin/import',

      label:
        t(
          'navigation.importData',
        ),

      icon:
        Import,
    })
  }


  if (
    hasPermission(
      user,
      PERMISSIONS.EXPORT_DATA,
    )
  ) {
    extra.push({
      path:
        '/admin/export',

      label:
        t(
          'navigation.exportData',
        ),

      icon:
        Database,
    })
  }


  extra.push({
    path:
      '/admin/settings',

    label:
      t(
        'navigation.schoolSettings',
      ),

    icon:
      Settings,
  })


  return {
    main,
    extra,
  }
}


/* ========================================
   VICE PRINCIPAL
======================================== */

function createVicePrincipalMenu(
  user,
  t,
) {
  const main = [
    {
      path:
        '/',

      label:
        t(
          'navigation.home',
        ),

      icon:
        Home,
    },

    {
      path:
        '/admin/schedule',

      label:
        t(
          'navigation.schedule',
        ),

      shortLabel:
        t(
          'navigation.lessons',
        ),

      icon:
        CalendarDays,
    },

    {
      path:
        '/admin/workload',

      label:
        t(
          'navigation.workload',
        ),

      icon:
        BriefcaseBusiness,
    },

    {
      path:
        '/admin/journals',

      label:
        t(
          'navigation.journals',
        ),

      icon:
        GraduationCap,
    },

    {
      path:
        '/profile',

      label:
        t(
          'navigation.profile',
        ),

      icon:
        User,
    },
  ]


  const extra = []


  extra.push({
    path:
      '/admin/school-year',

    label:
      t(
        'navigation.schoolYear',
      ),

    icon:
      CalendarDays,
  })


  if (
    hasPermission(
      user,
      PERMISSIONS.MANAGE_SUBSTITUTIONS,
    )
  ) {
    extra.push({
      path:
        '/admin/substitutions',

      label:
        t(
          'navigation.substitutions',
        ),

      icon:
        Users,
    })
  }


  extra.push(
    {
      path:
        '/admin/attendance',

      label:
        t(
          'navigation.schoolAttendance',
        ),

      icon:
        CheckCircle2,
    },

    {
      path:
        '/admin/reports',

      label:
        t(
          'navigation.reports',
        ),

      icon:
        FileBarChart,
    },

    {
      path:
        '/admin/classes',

      label:
        t(
          'navigation.classes',
        ),

      icon:
        School,
    },

    {
      path:
        '/messages',

      label:
        t(
          'navigation.messages',
        ),

      icon:
        MessageCircle,
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

function createDirectorMenu(
  t,
) {
  return {
    main: [
      {
        path:
          '/',

        label:
          t(
            'navigation.home',
          ),

        icon:
          Home,
      },

      {
        path:
          '/admin/analytics',

        label:
          t(
            'navigation.analytics',
          ),

        icon:
          ChartNoAxesCombined,
      },

      {
        path:
          '/admin/journals',

        label:
          t(
            'navigation.journals',
          ),

        icon:
          GraduationCap,
      },

      {
        path:
          '/admin/reports',

        label:
          t(
            'navigation.reports',
          ),

        icon:
          FileBarChart,
      },

      {
        path:
          '/profile',

        label:
          t(
            'navigation.profile',
          ),

        icon:
          User,
      },
    ],

    extra: [

      {
        path:
          '/admin/school-year',

        label:
          t(
            'navigation.schoolYear',
          ),

        icon:
          CalendarDays,
      },

      {
        path:
          '/admin/schedule',

        label:
          t(
            'navigation.schoolSchedule',
          ),

        icon:
          CalendarDays,
      },

      {
        path:
          '/admin/attendance',

        label:
          t(
            'navigation.attendance',
          ),

        icon:
          CheckCircle2,
      },

      {
        path:
          '/admin/workload',

        label:
          t(
            'navigation.workload',
          ),

        icon:
          BriefcaseBusiness,
      },

      {
        path:
          '/admin/substitutions',

        label:
          t(
            'navigation.substitutions',
          ),

        icon:
          Users,
      },

      {
        path:
          '/admin/staff',

        label:
          t(
            'navigation.staff',
          ),

        icon:
          UserCog,
      },

      {
        path:
          '/admin/classes',

        label:
          t(
            'navigation.classes',
          ),

        icon:
          School,
      },

      {
        path:
          '/messages',

        label:
          t(
            'navigation.messages',
          ),

        icon:
          MessageCircle,
      },
    ],
  }
}


/* ========================================
   PARTNER
======================================== */

function createPartnerMenu(
  t,
) {
  return {
    main: [
      {
        path:
          '/partner-dashboard',

        label:
          t(
            'navigation.home',
          ),

        icon:
          Home,
      },

      {
        path:
          '/partner-offers',

        label:
          t(
            'navigation.offers',
          ),

        icon:
          Store,
      },

      {
        path:
          '/partner-coupons',

        label:
          t(
            'navigation.coupons',
          ),

        icon:
          CheckSquare,
      },

      {
        path:
          '/partner-stats',

        label:
          t(
            'navigation.statistics',
          ),

        icon:
          BarChart3,
      },

      {
        path:
          '/profile',

        label:
          t(
            'navigation.profile',
          ),

        icon:
          User,
      },
    ],

    extra: [],
  }
}


/* ========================================
   SUPER ADMIN
======================================== */

function createSuperAdminMenu(
  t,
) {
  return {
    main: [
      {
        path:
          '/super-admin',

        label:
          t(
            'navigation.home',
          ),

        icon:
          LayoutDashboard,
      },

      {
        path:
          '/super-admin/schools',

        label:
          t(
            'navigation.schools',
          ),

        icon:
          Building2,
      },

      {
        path:
          '/super-admin/users',

        label:
          t(
            'navigation.users',
          ),

        icon:
          Users,
      },

      {
        path:
          '/super-admin/analytics',

        label:
          t(
            'navigation.analytics',
          ),

        icon:
          ChartNoAxesCombined,
      },

      {
        path:
          '/profile',

        label:
          t(
            'navigation.profile',
          ),

        icon:
          User,
      },
    ],

    extra: [
      {
        path:
          '/super-admin/partners',

        label:
          t(
            'navigation.partners',
          ),

        icon:
          Store,
      },

      {
        path:
          '/super-admin/settings',

        label:
          t(
            'navigation.systemSettings',
          ),

        icon:
          Settings,
      },
    ],
  }
}


export default Layout