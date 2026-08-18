import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

import { supabase } from '../lib/supabase'

import {
  ROLES,
} from '../config/access'

import {
  getCurrentUser,
  getUsers,
  removeCurrentUser,
  saveCurrentUser,
  saveUsers,
} from '../services/storage'


const AuthContext =
  createContext(null)


/*
  Через обычную публичную регистрацию
  разрешаем создавать только:

  - ученика
  - родителя

  Остальные роли создаются
  через административную систему.
*/
const PUBLIC_REGISTRATION_ROLES = [
  ROLES.STUDENT,
  ROLES.PARENT,
]


const KNOWN_ROLES =
  Object.values(ROLES)


export function AuthProvider({
  children,
}) {
  const [
    user,
    setUser,
  ] = useState(() =>
    getCurrentUser(),
  )


  const [
    loading,
    setLoading,
  ] = useState(true)


  /*
    Нужен для защиты от ситуации,
    когда несколько запросов профиля
    приходят почти одновременно.
  */
  const profileRequestRef =
    useRef(0)


  /* =====================================
     RESTORE AUTH SESSION
  ===================================== */

  useEffect(() => {
    let isMounted = true


    async function restoreSession() {
      try {
        const {
          data: {
            session,
          },

          error,
        } =
          await supabase.auth
            .getSession()


        if (error) {
          throw error
        }


        if (!isMounted) {
          return
        }


        if (session?.user) {
          await loadProfile(
            session.user.id,
          )
        } else {
          removeCurrentUser()

          if (isMounted) {
            setUser(null)
          }
        }
      } catch (error) {
        console.error(
          'Ошибка восстановления сессии:',
          error,
        )


        removeCurrentUser()


        if (isMounted) {
          setUser(null)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }


    void restoreSession()


    const {
      data: {
        subscription,
      },
    } =
      supabase.auth
        .onAuthStateChange(
          async (
            event,
            session,
          ) => {
            if (!isMounted) {
              return
            }


            if (
              event ===
                'SIGNED_OUT' ||
              !session?.user
            ) {
              removeCurrentUser()

              setUser(null)

              setLoading(false)

              return
            }


            /*
              SIGNED_IN,
              TOKEN_REFRESHED,
              USER_UPDATED и т.д.
            */
            try {
              await loadProfile(
                session.user.id,
              )
            } catch (error) {
              console.error(
                'Ошибка обновления профиля:',
                error,
              )
            } finally {
              if (isMounted) {
                setLoading(false)
              }
            }
          },
        )


    return () => {
      isMounted = false

      subscription.unsubscribe()
    }
  }, [])


  /* =====================================
     REALTIME PROFILE

     Если profiles изменился в Supabase,
     обновляем React user автоматически.

     Например:
     учитель принял ДЗ
     -> PostgreSQL начислил баллы
     -> profiles UPDATE
     -> Realtime
     -> новый user
  ===================================== */

  useEffect(() => {
    if (!user?.id) {
      return undefined
    }


    const userId =
      user.id


    const channel =
      supabase
        .channel(
          `profile-live-${userId}`,
        )
        .on(
          'postgres_changes',
          {
            event:
              'UPDATE',

            schema:
              'public',

            table:
              'profiles',

            filter:
              `id=eq.${userId}`,
          },
          (payload) => {
            try {
              if (
                !payload?.new
              ) {
                return
              }


              const updatedUser =
                normalizeProfile(
                  payload.new,
                )


              persistUser(
                updatedUser,
              )


              setUser(
                updatedUser,
              )
            } catch (error) {
              console.error(
                'Ошибка Realtime профиля:',
                error,
              )
            }
          },
        )
        .subscribe(
          (status) => {
            if (
              status ===
              'CHANNEL_ERROR'
            ) {
              console.error(
                'Ошибка подключения Realtime профиля',
              )
            }
          },
        )


    return () => {
      void supabase
        .removeChannel(
          channel,
        )
    }
  }, [
    user?.id,
  ])


  /* =====================================
     FALLBACK REFRESH

     Если браузер был в фоне,
     после возвращения сразу
     перечитываем профиль.

     Это дополнительная страховка,
     даже если Realtime пропустил событие.
  ===================================== */

  useEffect(() => {
    if (!user?.id) {
      return undefined
    }


    const userId =
      user.id


    function handleFocus() {
      void loadProfile(
        userId,
        {
          silent:
            true,
        },
      )
    }


    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        'visible'
      ) {
        void loadProfile(
          userId,
          {
            silent:
              true,
          },
        )
      }
    }


    window.addEventListener(
      'focus',
      handleFocus,
    )


    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )


    return () => {
      window.removeEventListener(
        'focus',
        handleFocus,
      )


      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      )
    }
  }, [
    user?.id,
  ])


  /* =====================================
     LOAD PROFILE
  ===================================== */

  async function loadProfile(
    userId,
    options = {},
  ) {
    if (!userId) {
      return null
    }


    const requestId =
      profileRequestRef.current +
      1


    profileRequestRef.current =
      requestId


    const {
      data,
      error,
    } =
      await supabase
        .from('profiles')
        .select('*')
        .eq(
          'id',
          userId,
        )
        .single()


    if (error) {
      if (
        options.silent
      ) {
        console.error(
          'Не удалось тихо обновить профиль:',
          error,
        )

        return null
      }


      throw new Error(
        'Не удалось загрузить профиль пользователя',
      )
    }


    if (!data) {
      if (
        options.silent
      ) {
        return null
      }


      throw new Error(
        'Профиль пользователя не найден',
      )
    }


    /*
      Если после этого запроса уже
      был запущен более новый запрос,
      старый результат не применяем.
    */
    if (
      requestId !==
      profileRequestRef.current
    ) {
      return null
    }


    const normalizedUser =
      normalizeProfile(
        data,
      )


    persistUser(
      normalizedUser,
    )


    setUser(
      normalizedUser,
    )


    return normalizedUser
  }


  /* =====================================
     REGISTER
  ===================================== */

  async function register(
    formData,
  ) {
    const email =
      String(
        formData.email ||
          '',
      )
        .trim()
        .toLowerCase()


    const name =
      String(
        formData.name ||
          '',
      ).trim()


    const school =
      String(
        formData.school ||
          '',
      ).trim()


    const requestedRole =
      formData.role ||
      ROLES.STUDENT


    /*
      Через обычную регистрацию
      нельзя создать сотрудника,
      руководство или администратора.
    */
    if (
      !PUBLIC_REGISTRATION_ROLES.includes(
        requestedRole,
      )
    ) {
      throw new Error(
        'Эту роль нельзя выбрать при обычной регистрации',
      )
    }


    const className =
      requestedRole ===
      ROLES.STUDENT
        ? String(
            formData.className ||
              '',
          ).trim()
        : ''


    const {
      data,
      error,
    } =
      await supabase.auth
        .signUp({
          email,

          password:
            formData.password,

          options: {
            data: {
              name,

              role:
                requestedRole,

              school,

              className,
            },
          },
        })


    if (error) {
      throw new Error(
        translateAuthError(
          error.message,
        ),
      )
    }


    if (!data.user) {
      throw new Error(
        'Не удалось создать аккаунт',
      )
    }


    return await loadProfile(
      data.user.id,
    )
  }


  /* =====================================
     LOGIN
  ===================================== */

  async function login(
    email,
    password,
  ) {
    const normalizedEmail =
      String(
        email ||
          '',
      )
        .trim()
        .toLowerCase()


    const {
      data,
      error,
    } =
      await supabase.auth
        .signInWithPassword({
          email:
            normalizedEmail,

          password,
        })


    if (error) {
      throw new Error(
        translateAuthError(
          error.message,
        ),
      )
    }


    if (!data.user) {
      throw new Error(
        'Не удалось войти в аккаунт',
      )
    }


    return await loadProfile(
      data.user.id,
    )
  }


  /* =====================================
     LOGOUT
  ===================================== */

  async function logout() {
    const {
      error,
    } =
      await supabase.auth
        .signOut()


    if (error) {
      throw new Error(
        'Не удалось выйти из аккаунта',
      )
    }


    profileRequestRef.current +=
      1


    removeCurrentUser()

    setUser(null)
  }


  /* =====================================
     UPDATE USER
  ===================================== */

  async function updateUser(
    updatedData,
  ) {
    if (!user) {
      return null
    }


    const databaseData =
      convertProfileUpdate(
        updatedData,
      )


    if (
      Object.keys(
        databaseData,
      ).length ===
      0
    ) {
      return user
    }


    const {
      error,
    } =
      await supabase
        .from('profiles')
        .update(
          databaseData,
        )
        .eq(
          'id',
          user.id,
        )


    if (error) {
      throw new Error(
        'Не удалось сохранить изменения профиля',
      )
    }


    /*
      Не ждём только Realtime.
      Сразу перечитываем профиль.
    */
    return await loadProfile(
      user.id,
    )
  }


  /* =====================================
     REFRESH USER

     Можно вызывать из любых страниц:
     const { refreshUser } = useAuth()
  ===================================== */

  async function refreshUser() {
    if (!user?.id) {
      return null
    }


    return await loadProfile(
      user.id,
    )
  }


  return (
    <AuthContext.Provider
      value={{
        user,

        loading,

        register,
        login,
        logout,

        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}


/* ========================================
   PERSIST PROFILE LOCALLY
======================================== */

function persistUser(
  normalizedUser,
) {
  saveCurrentUser(
    normalizedUser,
  )


  mergeUserIntoLocalStorage(
    normalizedUser,
  )
}


/* ========================================
   NORMALIZE PROFILE
======================================== */

function normalizeProfile(
  profile,
) {
  const role =
    normalizeRole(
      profile.role,
    )


  return {
    id:
      profile.id,

    name:
      profile.name ||
      '',

    email:
      profile.email ||
      '',

    role,

    school:
      profile.school ||
      '',

    schoolId:
      profile.school_id ||
      null,

    className:
      profile.class_name ||
      '',

    position:
      profile.position ||
      '',

    permissions:
      Array.isArray(
        profile.permissions,
      )
        ? profile.permissions
        : [],

    points:
      Number(
        profile.points ??
          0,
      ),

    xp:
      Number(
        profile.xp ??
          0,
      ),

    streak:
      Number(
        profile.streak ??
          0,
      ),

    bestStreak:
      Number(
        profile.best_streak ??
          0,
      ),

    freezes:
      Number(
        profile.freezes ??
          0,
      ),

    completedTasks:
      Number(
        profile.completed_tasks ??
          0,
      ),

    achievements:
      Array.isArray(
        profile.achievements,
      )
        ? profile.achievements
        : [],

    lastActivityDate:
      profile.last_activity_date ||
      '',

    createdAt:
      profile.created_at ||
      '',
  }
}


/* ========================================
   ROLE NORMALIZATION
======================================== */

function normalizeRole(
  role,
) {
  if (
    KNOWN_ROLES.includes(
      role,
    )
  ) {
    return role
  }


  return ROLES.STUDENT
}


/* ========================================
   PROFILE UPDATE
======================================== */

function convertProfileUpdate(
  data,
) {
  const result = {}


  /*
    Служебные поля специально
    НЕ разрешаем менять отсюда:

    role
    school
    schoolId
    school_id
    position
    permissions
  */


  if (
    'name' in data
  ) {
    result.name =
      String(
        data.name ||
          '',
      ).trim()
  }


  if (
    'className' in data
  ) {
    result.class_name =
      String(
        data.className ||
          '',
      ).trim()
  }


  if (
    'points' in data
  ) {
    result.points =
      Number(
        data.points ||
          0,
      )
  }


  if (
    'xp' in data
  ) {
    result.xp =
      Number(
        data.xp ||
          0,
      )
  }


  if (
    'streak' in data
  ) {
    result.streak =
      Number(
        data.streak ||
          0,
      )
  }


  if (
    'bestStreak' in data
  ) {
    result.best_streak =
      Number(
        data.bestStreak ||
          0,
      )
  }


  if (
    'freezes' in data
  ) {
    result.freezes =
      Number(
        data.freezes ||
          0,
      )
  }


  if (
    'completedTasks' in data
  ) {
    result.completed_tasks =
      Number(
        data.completedTasks ||
          0,
      )
  }


  if (
    'achievements' in data
  ) {
    result.achievements =
      Array.isArray(
        data.achievements,
      )
        ? data.achievements
        : []
  }


  if (
    'lastActivityDate' in data
  ) {
    result.last_activity_date =
      data.lastActivityDate ||
      ''
  }


  return result
}


/* ========================================
   LOCAL STORAGE COMPATIBILITY
======================================== */

function mergeUserIntoLocalStorage(
  user,
) {
  const users =
    getUsers()


  const exists =
    users.some(
      (existingUser) =>
        existingUser.id ===
        user.id,
    )


  const updatedUsers =
    exists
      ? users.map(
          (
            existingUser,
          ) =>
            existingUser.id ===
            user.id
              ? {
                  ...existingUser,
                  ...user,
                }
              : existingUser,
        )
      : [
          ...users,
          user,
        ]


  saveUsers(
    updatedUsers,
  )
}


/* ========================================
   AUTH ERRORS
======================================== */

function translateAuthError(
  message,
) {
  const normalizedMessage =
    String(
      message ||
        '',
    ).toLowerCase()


  if (
    normalizedMessage.includes(
      'invalid login credentials',
    )
  ) {
    return 'Неверная почта или пароль'
  }


  if (
    normalizedMessage.includes(
      'user already registered',
    )
  ) {
    return 'Аккаунт с такой почтой уже существует'
  }


  if (
    normalizedMessage.includes(
      'password should be',
    )
  ) {
    return 'Пароль слишком короткий'
  }


  if (
    normalizedMessage.includes(
      'email rate limit',
    )
  ) {
    return 'Слишком много попыток. Попробуйте позже'
  }


  if (
    normalizedMessage.includes(
      'email not confirmed',
    )
  ) {
    return 'Сначала подтвердите электронную почту'
  }


  return (
    message ||
    'Произошла ошибка'
  )
}


/* ========================================
   AUTH HOOK
======================================== */

export function useAuth() {
  const context =
    useContext(
      AuthContext,
    )


  if (!context) {
    throw new Error(
      'useAuth должен находиться внутри AuthProvider',
    )
  }


  return context
}