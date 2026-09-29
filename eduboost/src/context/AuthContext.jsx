import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  supabase,
} from '../lib/supabase'

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


  const profileRequestRef =
    useRef(0)


  /* =====================================
     RESTORE SESSION
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


        if (
          session?.user
        ) {
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

          (
            payload,
          ) => {
            if (
              !payload?.new
            ) {
              return
            }


            try {
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
        .subscribe()


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
     REFRESH ON FOCUS
  ===================================== */

  useEffect(() => {
    if (!user?.id) {
      return undefined
    }


    const userId =
      user.id


    function refresh() {
      void loadProfile(
        userId,
        {
          silent:
            true,
        },
      )
    }


    function handleVisibility() {
      if (
        document
          .visibilityState ===
        'visible'
      ) {
        refresh()
      }
    }


    window.addEventListener(
      'focus',
      refresh,
    )


    document.addEventListener(
      'visibilitychange',
      handleVisibility,
    )


    return () => {
      window.removeEventListener(
        'focus',
        refresh,
      )


      document.removeEventListener(
        'visibilitychange',
        handleVisibility,
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


    const schoolId =
      String(
        formData.schoolId ||
          '',
      ).trim()


    const requestedRole =
      formData.role ||
      ROLES.STUDENT


    if (
      !PUBLIC_REGISTRATION_ROLES.includes(
        requestedRole,
      )
    ) {
      throw new Error(
        'Эту роль нельзя выбрать при обычной регистрации',
      )
    }


    if (!school) {
      throw new Error(
        'Выберите школу',
      )
    }


    if (!schoolId) {
      throw new Error(
        'Не удалось определить школу',
      )
    }


    /*
      Дополнительно проверяем,
      что schoolId действительно
      существует и школа активна.

      Не доверяем только данным формы.
    */
    const {
      data:
        schoolRow,

      error:
        schoolError,
    } =
      await supabase
        .from('schools')
        .select(`
          id,
          name,
          status
        `)
        .eq(
          'id',
          schoolId,
        )
        .eq(
          'status',
          'active',
        )
        .maybeSingle()


    if (
      schoolError
    ) {
      throw new Error(
        'Не удалось проверить школу',
      )
    }


    if (!schoolRow) {
      throw new Error(
        'Выбранная школа недоступна',
      )
    }


    const safeSchoolName =
      schoolRow.name


    const className =
      requestedRole ===
      ROLES.STUDENT
        ? String(
            formData.className ||
              '',
          ).trim()
        : ''


    if (
      requestedRole ===
        ROLES.STUDENT &&
      !className
    ) {
      throw new Error(
        'Выберите класс',
      )
    }


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

              school:
                safeSchoolName,

              schoolId:
                schoolRow.id,

              school_id:
                schoolRow.id,

              className,

              class_name:
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


    /*
      Если signup-trigger уже создал profile,
      наш BEFORE trigger сам заполнит
      school_id по school.

      Но дополнительно пробуем убедиться,
      что профиль уже существует.
    */
    const normalized =
      await loadProfile(
        data.user.id,
      )


    /*
      Если по какой-то причине старый
      auth-trigger создал профиль без
      school_id, пробуем дописать UUID.

      BEFORE UPDATE trigger также
      подстрахует это действие.
    */
    if (
      normalized &&
      !normalized.schoolId
    ) {
      const {
        error:
          updateSchoolError,
      } =
        await supabase
          .from('profiles')
          .update({
            school:
              safeSchoolName,

            school_id:
              schoolRow.id,

            class_name:
              className,
          })
          .eq(
            'id',
            data.user.id,
          )


      if (
        updateSchoolError
      ) {
        console.error(
          'Не удалось дополнительно записать school_id:',
          updateSchoolError,
        )
      }


      return await loadProfile(
        data.user.id,
      )
    }


    return normalized
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
        email || '',
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


    return await loadProfile(
      user.id,
    )
  }


  /* =====================================
     REFRESH USER
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
   PERSIST
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

    /*
      Сотрудники школы.
      В БД лежат в profiles:
      edu_login
      recovery_email
      recovery_email_verified_at
    */
    eduLogin:
      profile.edu_login ||
      '',

    recoveryEmail:
      profile.recovery_email ||
      '',

    recoveryEmailVerifiedAt:
      profile
        .recovery_email_verified_at ||
      null,

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
   ROLE
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
    ВАЖНО:

    role
    school
    schoolId
    school_id
    position
    permissions
    edu_login
    recovery_email

    обычный пользователь менять
    через профиль не может.
  */


  if (
    'name' in data
  ) {
    result.name =
      String(
        data.name || '',
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
        data.points || 0,
      )
  }


  if (
    'xp' in data
  ) {
    result.xp =
      Number(
        data.xp || 0,
      )
  }


  if (
    'streak' in data
  ) {
    result.streak =
      Number(
        data.streak || 0,
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
        data.freezes || 0,
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
   LOCAL STORAGE
======================================== */

function mergeUserIntoLocalStorage(
  user,
) {
  const users =
    getUsers()


  const exists =
    users.some(
      (
        existingUser,
      ) =>
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
      message || '',
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