import {
  useEffect,
  useState,
} from 'react'

import {
  useNavigate,
} from 'react-router-dom'

import {
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  GraduationCap,
  Languages,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Save,
  School,
  Settings,
  Sun,
  UserRound,
} from 'lucide-react'

import {
  useAuth,
} from '../context/AuthContext'

import {
  supabase,
} from '../lib/supabase'


const DEFAULT_NOTIFICATIONS = {
  grades: true,
  homework: true,
  attendance: true,
  quarterGrades: true,
  messages: true,
}


function SettingsPage() {
  const navigate =
    useNavigate()

  const {
    user,
    logout,
    refreshUser,
  } = useAuth()


  const [
    interfaceLanguage,
    setInterfaceLanguage,
  ] = useState('ru')

  const [
    contentLanguage,
    setContentLanguage,
  ] = useState('ru')

  const [
    theme,
    setTheme,
  ] = useState('light')

  const [
    notifications,
    setNotifications,
  ] = useState(
    DEFAULT_NOTIFICATIONS,
  )


  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    saving,
    setSaving,
  ] = useState(false)

  const [
    loggingOut,
    setLoggingOut,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const [
    success,
    setSuccess,
  ] = useState('')


  /* ========================================
     LOAD SETTINGS
  ======================================== */

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)

      return
    }


    void loadSettings()
  }, [
    user?.id,
  ])


  async function loadSettings() {
    try {
      setLoading(true)
      setError('')


      const {
        data,
        error:
          loadError,
      } =
        await supabase
          .from(
            'profiles',
          )
          .select(`
            interface_language,
            content_language,
            theme,
            notification_settings
          `)
          .eq(
            'id',
            user.id,
          )
          .single()


      if (loadError) {
        throw loadError
      }


      const loadedTheme =
        normalizeTheme(
          data?.theme,
        )


      setInterfaceLanguage(
        normalizeLanguage(
          data
            ?.interface_language,
        ),
      )


      setContentLanguage(
        normalizeLanguage(
          data
            ?.content_language,
        ),
      )


      setTheme(
        loadedTheme,
      )


      setNotifications({
        ...DEFAULT_NOTIFICATIONS,

        ...normalizeNotifications(
          data
            ?.notification_settings,
        ),
      })


      applyTheme(
        loadedTheme,
      )
    } catch (
      loadError
    ) {
      console.error(
        'Settings:',
        loadError,
      )


      setError(
        loadError?.message ||
          'Не удалось загрузить настройки.',
      )
    } finally {
      setLoading(false)
    }
  }


  /* ========================================
     SAVE
  ======================================== */

  async function handleSave() {
    if (!user?.id) {
      return
    }


    try {
      setSaving(true)
      setError('')
      setSuccess('')


      const payload = {
        interface_language:
          normalizeLanguage(
            interfaceLanguage,
          ),

        content_language:
          normalizeLanguage(
            contentLanguage,
          ),

        theme:
          normalizeTheme(
            theme,
          ),

        notification_settings: {
          grades:
            Boolean(
              notifications.grades,
            ),

          homework:
            Boolean(
              notifications.homework,
            ),

          attendance:
            Boolean(
              notifications.attendance,
            ),

          quarterGrades:
            Boolean(
              notifications
                .quarterGrades,
            ),

          messages:
            Boolean(
              notifications.messages,
            ),
        },
      }


      const {
        error:
          saveError,
      } =
        await supabase
          .from(
            'profiles',
          )
          .update(
            payload,
          )
          .eq(
            'id',
            user.id,
          )


      if (saveError) {
        throw saveError
      }


      applyTheme(
        payload.theme,
      )


      /*
        Обновляем профиль,
        чтобы остальные части
        приложения получили
        свежие данные.

        Пока AuthContext ещё
        не нормализует настройки,
        но refresh всё равно
        полезен для актуального
        профиля.
      */
      if (
        typeof refreshUser ===
        'function'
      ) {
        try {
          await refreshUser()
        } catch (
          refreshError
        ) {
          console.error(
            'Refresh profile:',
            refreshError,
          )
        }
      }


      setSuccess(
        interfaceLanguage ===
          'ky'
          ? 'Жөндөөлөр сакталды.'
          : 'Настройки сохранены.',
      )
    } catch (
      saveError
    ) {
      console.error(
        'Save settings:',
        saveError,
      )


      setError(
        saveError?.message ||
          'Не удалось сохранить настройки.',
      )
    } finally {
      setSaving(false)
    }
  }


  /* ========================================
     THEME
  ======================================== */

  function handleThemeChange(
    value,
  ) {
    const nextTheme =
      normalizeTheme(
        value,
      )


    setTheme(
      nextTheme,
    )


    /*
      Предпросмотр сразу.

      Полноценную тёмную тему
      всего EduBoost подключим
      потом через App.css.
    */
    applyTheme(
      nextTheme,
    )
  }


  /* ========================================
     NOTIFICATIONS
  ======================================== */

  function toggleNotification(
    key,
  ) {
    setNotifications(
      (
        current,
      ) => ({
        ...current,

        [key]:
          !current[
            key
          ],
      }),
    )
  }


  /* ========================================
     LOGOUT
  ======================================== */

  async function handleLogout() {
    const confirmed =
      window.confirm(
        interfaceLanguage ===
          'ky'
          ? 'Аккаунттан чыгууну каалайсызбы?'
          : 'Выйти из аккаунта?',
      )


    if (!confirmed) {
      return
    }


    try {
      setLoggingOut(true)
      setError('')


      await logout()


      navigate(
        '/login',
        {
          replace:
            true,
        },
      )
    } catch (
      logoutError
    ) {
      console.error(
        'Logout:',
        logoutError,
      )


      setError(
        logoutError?.message ||
          'Не удалось выйти из аккаунта.',
      )
    } finally {
      setLoggingOut(false)
    }
  }


  if (!user) {
    return null
  }


  if (loading) {
    return (
      <div
        style={
          pageStyle
        }
      >

        <div
          style={
            loadingCardStyle
          }
        >
          Загружаем настройки...
        </div>

      </div>
    )
  }


  const kyrgyz =
    interfaceLanguage ===
    'ky'


  return (
    <div
      style={
        pageStyle
      }
    >

      {/* HEADER */}

      <div
        style={
          pageHeaderStyle
        }
      >

        <div
          style={
            titleIconStyle
          }
        >
          <Settings
            size={23}
          />
        </div>


        <div>

          <p
            style={
              eyebrowStyle
            }
          >
            EDUBOOST
          </p>


          <h1
            style={
              titleStyle
            }
          >
            {kyrgyz
              ? 'Жөндөөлөр'
              : 'Настройки'}
          </h1>


          <p
            style={
              subtitleStyle
            }
          >
            {kyrgyz
              ? 'Аккаунтту жана колдонмону өзүңүзгө ылайыктаңыз.'
              : 'Настройте аккаунт и приложение под себя.'}
          </p>

        </div>

      </div>


      {error && (
        <div
          style={
            errorStyle
          }
        >
          {error}
        </div>
      )}


      {success && (
        <div
          style={
            successStyle
          }
        >

          <Check
            size={18}
          />

          {success}

        </div>
      )}


      {/* LANGUAGE */}

      <SettingsSection
        icon={
          Languages
        }
        title={
          kyrgyz
            ? 'Тил'
            : 'Язык'
        }
        description={
          kyrgyz
            ? 'Интерфейстин жана окуу материалдарынын тили.'
            : 'Язык интерфейса и учебных материалов.'
        }
      >

        <SettingSelect
          title={
            kyrgyz
              ? 'Интерфейс тили'
              : 'Язык интерфейса'
          }
          description={
            kyrgyz
              ? 'EduBoost баскычтары жана менюсу.'
              : 'Кнопки и меню EduBoost.'
          }
          value={
            interfaceLanguage
          }
          onChange={
            setInterfaceLanguage
          }
          options={[
            {
              value:
                'ru',

              label:
                'Русский',
            },

            {
              value:
                'ky',

              label:
                'Кыргызча',
            },
          ]}
        />


        <Divider />


        <SettingSelect
          title={
            kyrgyz
              ? 'Окуу материалдары'
              : 'Язык учебных материалов'
          }
          description={
            kyrgyz
              ? 'Курстар жана окуу контенти үчүн негизги тил.'
              : 'Предпочтительный язык курсов и учебного контента.'
          }
          value={
            contentLanguage
          }
          onChange={
            setContentLanguage
          }
          options={[
            {
              value:
                'ru',

              label:
                'Русский',
            },

            {
              value:
                'ky',

              label:
                'Кыргызча',
            },
          ]}
        />

      </SettingsSection>


      {/* NOTIFICATIONS */}

      <SettingsSection
        icon={
          Bell
        }
        title={
          kyrgyz
            ? 'Билдирмелер'
            : 'Уведомления'
        }
        description={
          kyrgyz
            ? 'Кайсы окуялар жөнүндө билдирүү келерин тандаңыз.'
            : 'Выберите, о каких событиях вас уведомлять.'
        }
      >

        <ToggleRow
          title={
            kyrgyz
              ? 'Жаңы баа'
              : 'Новая оценка'
          }
          description={
            kyrgyz
              ? 'Журналга жаңы баа коюлганда.'
              : 'Когда в журнале появляется новая оценка.'
          }
          checked={
            notifications.grades
          }
          onClick={() =>
            toggleNotification(
              'grades',
            )
          }
        />


        <Divider />


        <ToggleRow
          title={
            kyrgyz
              ? 'Үй тапшырмасы'
              : 'Домашние задания'
          }
          description={
            kyrgyz
              ? 'Жаңы тапшырма же мөөнөт өзгөргөндө.'
              : 'Новое задание или изменение срока.'
          }
          checked={
            notifications
              .homework
          }
          onClick={() =>
            toggleNotification(
              'homework',
            )
          }
        />


        <Divider />


        <ToggleRow
          title={
            kyrgyz
              ? 'Сабакка катышуу'
              : 'Посещаемость'
          }
          description={
            kyrgyz
              ? 'Калтыруу же кечигүү белгиленгенде.'
              : 'При пропуске или опоздании.'
          }
          checked={
            notifications
              .attendance
          }
          onClick={() =>
            toggleNotification(
              'attendance',
            )
          }
        />


        <Divider />


        <ToggleRow
          title={
            kyrgyz
              ? 'Чейректик баа'
              : 'Четвертная оценка'
          }
          description={
            kyrgyz
              ? 'Чейректик жыйынтык коюлганда.'
              : 'Когда выставлена итоговая оценка за четверть.'
          }
          checked={
            notifications
              .quarterGrades
          }
          onClick={() =>
            toggleNotification(
              'quarterGrades',
            )
          }
        />


        <Divider />


        <ToggleRow
          title={
            kyrgyz
              ? 'Билдирүүлөр'
              : 'Сообщения'
          }
          description={
            kyrgyz
              ? 'Жаңы жеке билдирүүлөр.'
              : 'Новые личные сообщения.'
          }
          checked={
            notifications.messages
          }
          onClick={() =>
            toggleNotification(
              'messages',
            )
          }
        />

      </SettingsSection>


      {/* APPEARANCE */}

      <SettingsSection
        icon={
          Palette
        }
        title={
          kyrgyz
            ? 'Көрүнүш'
            : 'Интерфейс'
        }
        description={
          kyrgyz
            ? 'EduBoost көрүнүшүн тандаңыз.'
            : 'Выберите внешний вид EduBoost.'
        }
      >

        <div
          style={
            themeGridStyle
          }
        >

          <ThemeButton
            icon={
              Sun
            }
            label={
              kyrgyz
                ? 'Жарык'
                : 'Светлая'
            }
            active={
              theme ===
              'light'
            }
            onClick={() =>
              handleThemeChange(
                'light',
              )
            }
          />


          <ThemeButton
            icon={
              Moon
            }
            label={
              kyrgyz
                ? 'Караңгы'
                : 'Тёмная'
            }
            active={
              theme ===
              'dark'
            }
            onClick={() =>
              handleThemeChange(
                'dark',
              )
            }
          />


          <ThemeButton
            icon={
              Monitor
            }
            label={
              kyrgyz
                ? 'Система'
                : 'Система'
            }
            active={
              theme ===
              'system'
            }
            onClick={() =>
              handleThemeChange(
                'system',
              )
            }
          />

        </div>

      </SettingsSection>


      {/* ACCOUNT */}

      <SettingsSection
        icon={
          UserRound
        }
        title={
          kyrgyz
            ? 'Аккаунт'
            : 'Аккаунт'
        }
        description={
          kyrgyz
            ? 'EduBoost профилиңиз.'
            : 'Данные вашего профиля EduBoost.'
        }
      >

        <AccountRow
          icon={
            UserRound
          }
          label={
            kyrgyz
              ? 'Аты-жөнү'
              : 'Имя'
          }
          value={
            user.name ||
            '—'
          }
        />


        <Divider />


        <AccountRow
          icon={
            GraduationCap
          }
          label={
            kyrgyz
              ? 'Роль'
              : 'Роль'
          }
          value={
            user.role ||
            '—'
          }
        />


        {user.className && (
          <>
            <Divider />

            <AccountRow
              icon={
                BookOpen
              }
              label={
                kyrgyz
                  ? 'Класс'
                  : 'Класс'
              }
              value={
                user.className
              }
            />
          </>
        )}


        {(user.school ||
          user.schoolId) && (
          <>
            <Divider />

            <AccountRow
              icon={
                School
              }
              label={
                kyrgyz
                  ? 'Мектеп'
                  : 'Школа'
              }
              value={
                user.school ||
                'Школа EduBoost'
              }
            />
          </>
        )}


        <Divider />


        <button
          type="button"
          style={
            profileButtonStyle
          }
          onClick={() =>
            navigate(
              '/profile',
            )
          }
        >

          <span>
            {kyrgyz
              ? 'Профилди ачуу'
              : 'Открыть профиль'}
          </span>

          <ChevronRight
            size={19}
          />

        </button>

      </SettingsSection>


      {/* SAVE */}

      <button
        type="button"
        style={
          saveButtonStyle
        }
        onClick={
          handleSave
        }
        disabled={
          saving
        }
      >

        <Save
          size={19}
        />

        {saving
          ? (
            kyrgyz
              ? 'Сакталууда...'
              : 'Сохраняем...'
          )
          : (
            kyrgyz
              ? 'Жөндөөлөрдү сактоо'
              : 'Сохранить настройки'
          )}

      </button>


      {/* LOGOUT */}

      <section
        style={
          logoutSectionStyle
        }
      >

        <div>

          <strong
            style={
              logoutTitleStyle
            }
          >
            {kyrgyz
              ? 'Аккаунттан чыгуу'
              : 'Выйти из аккаунта'}
          </strong>


          <p
            style={
              logoutTextStyle
            }
          >
            {kyrgyz
              ? 'Кийинки жолу кайра кирүү керек болот.'
              : 'При следующем входе потребуется авторизация.'}
          </p>

        </div>


        <button
          type="button"
          style={
            logoutButtonStyle
          }
          onClick={
            handleLogout
          }
          disabled={
            loggingOut
          }
        >

          <LogOut
            size={19}
          />

          {loggingOut
            ? (
              kyrgyz
                ? 'Чыгууда...'
                : 'Выходим...'
            )
            : (
              kyrgyz
                ? 'Чыгуу'
                : 'Выйти'
            )}

        </button>

      </section>


      <p
        style={
          versionStyle
        }
      >
        EduBoost · 2026
      </p>

    </div>
  )
}


/* ========================================
   SECTION
======================================== */

function SettingsSection({
  icon:
    Icon,
  title,
  description,
  children,
}) {
  return (
    <section
      style={
        sectionStyle
      }
    >

      <div
        style={
          sectionHeaderStyle
        }
      >

        <div
          style={
            sectionIconStyle
          }
        >
          <Icon
            size={20}
          />
        </div>


        <div>

          <h2
            style={
              sectionTitleStyle
            }
          >
            {title}
          </h2>


          <p
            style={
              sectionDescriptionStyle
            }
          >
            {description}
          </p>

        </div>

      </div>


      <div
        style={
          sectionBodyStyle
        }
      >
        {children}
      </div>

    </section>
  )
}


/* ========================================
   SELECT
======================================== */

function SettingSelect({
  title,
  description,
  value,
  onChange,
  options,
}) {
  return (
    <div
      style={
        settingRowStyle
      }
    >

      <div
        style={
          settingTextStyle
        }
      >

        <strong>
          {title}
        </strong>


        <span
          style={
            settingDescriptionStyle
          }
        >
          {description}
        </span>

      </div>


      <select
        value={
          value
        }
        onChange={
          (event) =>
            onChange(
              event.target.value,
            )
        }
        style={
          selectStyle
        }
      >

        {options.map(
          (
            option,
          ) => (
            <option
              key={
                option.value
              }
              value={
                option.value
              }
            >
              {option.label}
            </option>
          ),
        )}

      </select>

    </div>
  )
}


/* ========================================
   TOGGLE
======================================== */

function ToggleRow({
  title,
  description,
  checked,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      style={
        toggleRowStyle
      }
    >

      <span
        style={
          settingTextStyle
        }
      >

        <strong>
          {title}
        </strong>


        <span
          style={
            settingDescriptionStyle
          }
        >
          {description}
        </span>

      </span>


      <span
        style={
          toggleStyle(
            checked,
          )
        }
      >

        <span
          style={
            toggleKnobStyle(
              checked,
            )
          }
        />

      </span>

    </button>
  )
}


/* ========================================
   THEME
======================================== */

function ThemeButton({
  icon:
    Icon,
  label,
  active,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      style={
        themeButtonStyle(
          active,
        )
      }
    >

      <Icon
        size={21}
      />

      <span>
        {label}
      </span>


      {active && (
        <Check
          size={16}
        />
      )}

    </button>
  )
}


/* ========================================
   ACCOUNT
======================================== */

function AccountRow({
  icon:
    Icon,
  label,
  value,
}) {
  return (
    <div
      style={
        accountRowStyle
      }
    >

      <div
        style={
          accountIconStyle
        }
      >
        <Icon
          size={18}
        />
      </div>


      <div
        style={{
          minWidth:
            0,

          flex:
            1,
        }}
      >

        <span
          style={
            accountLabelStyle
          }
        >
          {label}
        </span>


        <strong
          style={
            accountValueStyle
          }
        >
          {value}
        </strong>

      </div>

    </div>
  )
}


/* ========================================
   HELPERS
======================================== */

function normalizeLanguage(
  value,
) {
  return value ===
    'ky'
    ? 'ky'
    : 'ru'
}


function normalizeTheme(
  value,
) {
  if (
    [
      'light',
      'dark',
      'system',
    ].includes(
      value,
    )
  ) {
    return value
  }


  return 'light'
}


function normalizeNotifications(
  value,
) {
  if (
    !value ||
    typeof value !==
      'object' ||
    Array.isArray(
      value,
    )
  ) {
    return {
      ...DEFAULT_NOTIFICATIONS,
    }
  }


  return {
    grades:
      value.grades !==
      false,

    homework:
      value.homework !==
      false,

    attendance:
      value.attendance !==
      false,

    quarterGrades:
      value
        .quarterGrades !==
      false,

    messages:
      value.messages !==
      false,
  }
}


function applyTheme(
  theme,
) {
  if (
    typeof document ===
      'undefined'
  ) {
    return
  }


  const safeTheme =
    normalizeTheme(
      theme,
    )


  document
    .documentElement
    .setAttribute(
      'data-eduboost-theme',
      safeTheme,
    )


  /*
    Пока это задаёт системным
    элементам правильную схему.

    Позже добавим полноценные
    dark CSS переменные всему сайту.
  */
  if (
    safeTheme ===
    'dark'
  ) {
    document
      .documentElement
      .style
      .colorScheme =
      'dark'
  } else if (
    safeTheme ===
    'light'
  ) {
    document
      .documentElement
      .style
      .colorScheme =
      'light'
  } else {
    document
      .documentElement
      .style
      .colorScheme =
      'normal'
  }
}


function Divider() {
  return (
    <div
      style={
        dividerStyle
      }
    />
  )
}


/* ========================================
   STYLES
======================================== */

const pageStyle = {
  width:
    '100%',

  maxWidth:
    820,

  margin:
    '0 auto',

  padding:
    '4px 0 32px',
}


const pageHeaderStyle = {
  display:
    'flex',

  alignItems:
    'flex-start',

  gap:
    14,

  marginBottom:
    20,
}


const titleIconStyle = {
  width:
    46,

  height:
    46,

  flexShrink:
    0,

  display:
    'grid',

  placeItems:
    'center',

  borderRadius:
    14,

  background:
    '#eaf2ff',

  color:
    '#2563eb',
}


const eyebrowStyle = {
  margin:
    0,

  color:
    '#64748b',

  fontSize:
    11,

  fontWeight:
    800,

  letterSpacing:
    '0.08em',
}


const titleStyle = {
  margin:
    '3px 0 4px',

  color:
    '#102a56',

  fontSize:
    26,

  lineHeight:
    1.15,
}


const subtitleStyle = {
  margin:
    0,

  color:
    '#64748b',

  lineHeight:
    1.45,

  fontSize:
    14,
}


const sectionStyle = {
  overflow:
    'hidden',

  marginBottom:
    16,

  border:
    '1px solid #e6ebf2',

  borderRadius:
    18,

  background:
    '#ffffff',

  boxShadow:
    '0 7px 24px rgba(15, 39, 77, 0.04)',
}


const sectionHeaderStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    12,

  padding:
    '16px 17px',

  background:
    '#f8fbff',

  borderBottom:
    '1px solid #edf1f6',
}


const sectionIconStyle = {
  width:
    38,

  height:
    38,

  flexShrink:
    0,

  display:
    'grid',

  placeItems:
    'center',

  borderRadius:
    11,

  background:
    '#eaf2ff',

  color:
    '#2563eb',
}


const sectionTitleStyle = {
  margin:
    0,

  color:
    '#102a56',

  fontSize:
    16,
}


const sectionDescriptionStyle = {
  margin:
    '3px 0 0',

  color:
    '#64748b',

  fontSize:
    12,

  lineHeight:
    1.4,
}


const sectionBodyStyle = {
  padding:
    '2px 17px',
}


const settingRowStyle = {
  minHeight:
    72,

  display:
    'flex',

  alignItems:
    'center',

  justifyContent:
    'space-between',

  gap:
    16,

  padding:
    '12px 0',
}


const settingTextStyle = {
  minWidth:
    0,

  flex:
    1,

  display:
    'flex',

  flexDirection:
    'column',

  gap:
    3,

  color:
    '#102a56',
}


const settingDescriptionStyle = {
  color:
    '#718096',

  fontSize:
    12,

  lineHeight:
    1.4,
}


const selectStyle = {
  minWidth:
    135,

  maxWidth:
    '45%',

  height:
    40,

  padding:
    '0 10px',

  border:
    '1px solid #dbe3ee',

  borderRadius:
    11,

  outline:
    'none',

  background:
    '#ffffff',

  color:
    '#102a56',

  fontSize:
    14,

  fontWeight:
    700,
}


const dividerStyle = {
  height:
    1,

  background:
    '#edf1f6',
}


const toggleRowStyle = {
  width:
    '100%',

  minHeight:
    69,

  display:
    'flex',

  alignItems:
    'center',

  justifyContent:
    'space-between',

  gap:
    16,

  padding:
    '11px 0',

  border:
    'none',

  background:
    'transparent',

  textAlign:
    'left',

  cursor:
    'pointer',

  font:
    'inherit',
}


function toggleStyle(
  checked,
) {
  return {
    position:
      'relative',

    width:
      48,

    height:
      28,

    flexShrink:
      0,

    borderRadius:
      999,

    background:
      checked
        ? '#2563eb'
        : '#cbd5e1',

    transition:
      'background 0.18s ease',
  }
}


function toggleKnobStyle(
  checked,
) {
  return {
    position:
      'absolute',

    top:
      4,

    left:
      checked
        ? 24
        : 4,

    width:
      20,

    height:
      20,

    borderRadius:
      '50%',

    background:
      '#ffffff',

    boxShadow:
      '0 2px 7px rgba(15, 23, 42, 0.18)',

    transition:
      'left 0.18s ease',
  }
}


const themeGridStyle = {
  display:
    'grid',

  gridTemplateColumns:
    'repeat(3, minmax(0, 1fr))',

  gap:
    9,

  padding:
    '14px 0',
}


function themeButtonStyle(
  active,
) {
  return {
    minHeight:
      70,

    display:
      'flex',

    flexDirection:
      'column',

    alignItems:
      'center',

    justifyContent:
      'center',

    gap:
      5,

    border:
      active
        ? '2px solid #2563eb'
        : '1px solid #dbe3ee',

    borderRadius:
      13,

    background:
      active
        ? '#eff6ff'
        : '#ffffff',

    color:
      active
        ? '#1d4ed8'
        : '#475569',

    cursor:
      'pointer',

    font:
      'inherit',

    fontSize:
      12,

    fontWeight:
      700,
  }
}


const accountRowStyle = {
  display:
    'flex',

  alignItems:
    'center',

  gap:
    11,

  minHeight:
    64,

  padding:
    '9px 0',
}


const accountIconStyle = {
  width:
    34,

  height:
    34,

  flexShrink:
    0,

  display:
    'grid',

  placeItems:
    'center',

  borderRadius:
    10,

  background:
    '#f1f5f9',

  color:
    '#475569',
}


const accountLabelStyle = {
  display:
    'block',

  color:
    '#718096',

  fontSize:
    11,

  marginBottom:
    2,
}


const accountValueStyle = {
  display:
    'block',

  color:
    '#102a56',

  fontSize:
    14,

  overflow:
    'hidden',

  whiteSpace:
    'nowrap',

  textOverflow:
    'ellipsis',
}


const profileButtonStyle = {
  width:
    '100%',

  minHeight:
    54,

  display:
    'flex',

  alignItems:
    'center',

  justifyContent:
    'space-between',

  padding:
    0,

  border:
    'none',

  background:
    'transparent',

  color:
    '#2563eb',

  font:
    'inherit',

  fontWeight:
    700,

  cursor:
    'pointer',
}


const saveButtonStyle = {
  width:
    '100%',

  minHeight:
    50,

  marginBottom:
    16,

  display:
    'flex',

  alignItems:
    'center',

  justifyContent:
    'center',

  gap:
    9,

  border:
    'none',

  borderRadius:
    14,

  background:
    '#2563eb',

  color:
    '#ffffff',

  font:
    'inherit',

  fontSize:
    14,

  fontWeight:
    800,

  cursor:
    'pointer',

  boxShadow:
    '0 8px 22px rgba(37, 99, 235, 0.20)',
}


const logoutSectionStyle = {
  display:
    'flex',

  alignItems:
    'center',

  justifyContent:
    'space-between',

  gap:
    16,

  padding:
    17,

  border:
    '1px solid #fecaca',

  borderRadius:
    18,

  background:
    '#fffafa',
}


const logoutTitleStyle = {
  color:
    '#9f1239',

  fontSize:
    14,
}


const logoutTextStyle = {
  margin:
    '3px 0 0',

  color:
    '#9f5b6d',

  fontSize:
    12,

  lineHeight:
    1.4,
}


const logoutButtonStyle = {
  minHeight:
    42,

  flexShrink:
    0,

  display:
    'flex',

  alignItems:
    'center',

  justifyContent:
    'center',

  gap:
    7,

  padding:
    '0 15px',

  border:
    '1px solid #fecdd3',

  borderRadius:
    11,

  background:
    '#fff1f2',

  color:
    '#be123c',

  font:
    'inherit',

  fontWeight:
    800,

  cursor:
    'pointer',
}


const errorStyle = {
  marginBottom:
    14,

  padding:
    '12px 14px',

  border:
    '1px solid #fecaca',

  borderRadius:
    12,

  background:
    '#fff1f2',

  color:
    '#be123c',

  fontSize:
    13,
}


const successStyle = {
  marginBottom:
    14,

  padding:
    '12px 14px',

  display:
    'flex',

  alignItems:
    'center',

  gap:
    8,

  border:
    '1px solid #bbf7d0',

  borderRadius:
    12,

  background:
    '#f0fdf4',

  color:
    '#15803d',

  fontSize:
    13,

  fontWeight:
    700,
}


const loadingCardStyle = {
  minHeight:
    160,

  display:
    'grid',

  placeItems:
    'center',

  border:
    '1px solid #e5e7eb',

  borderRadius:
    18,

  background:
    '#ffffff',

  color:
    '#64748b',
}


const versionStyle = {
  margin:
    '20px 0 0',

  textAlign:
    'center',

  color:
    '#94a3b8',

  fontSize:
    11,
}


export default SettingsPage