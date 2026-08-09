import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'

import { supabase } from '../lib/supabase'

import {
  getCurrentUser,
  getUsers,
  removeCurrentUser,
  saveCurrentUser,
  saveUsers,
} from '../services/storage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() =>
    getCurrentUser(),
  )

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function restoreSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!isMounted) {
        return
      }

      if (session?.user) {
        await loadProfile(session.user.id)
      } else {
        removeCurrentUser()
        setUser(null)
      }

      if (isMounted) {
        setLoading(false)
      }
    }

    restoreSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) {
          return
        }

        if (
          event === 'SIGNED_OUT' ||
          !session?.user
        ) {
          removeCurrentUser()
          setUser(null)
          setLoading(false)
          return
        }

        await loadProfile(session.user.id)

        if (isMounted) {
          setLoading(false)
        }
      },
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      throw new Error(
        'Не удалось загрузить профиль пользователя',
      )
    }

    const normalizedUser =
      normalizeProfile(data)

    saveCurrentUser(normalizedUser)
    mergeUserIntoLocalStorage(normalizedUser)
    setUser(normalizedUser)

    return normalizedUser
  }

  async function register(formData) {
    const email =
      formData.email.trim().toLowerCase()

    const {
      data,
      error,
    } = await supabase.auth.signUp({
      email,
      password: formData.password,
      options: {
        data: {
          name: formData.name.trim(),
          role: formData.role,
          school: formData.school.trim(),
          className:
            formData.role === 'Ученик'
              ? formData.className
              : '',
        },
      },
    })

    if (error) {
      throw new Error(
        translateAuthError(error.message),
      )
    }

    if (!data.user) {
      throw new Error(
        'Не удалось создать аккаунт',
      )
    }

    return loadProfile(data.user.id)
  }

  async function login(email, password) {
    const normalizedEmail =
      email.trim().toLowerCase()

    const {
      data,
      error,
    } =
      await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

    if (error) {
      throw new Error(
        translateAuthError(error.message),
      )
    }

    if (!data.user) {
      throw new Error(
        'Не удалось войти в аккаунт',
      )
    }

    return loadProfile(data.user.id)
  }

  async function logout() {
    const { error } =
      await supabase.auth.signOut()

    if (error) {
      throw new Error(
        'Не удалось выйти из аккаунта',
      )
    }

    removeCurrentUser()
    setUser(null)
  }

  async function updateUser(updatedData) {
    if (!user) {
      return null
    }

    const databaseData =
      convertProfileUpdate(updatedData)

    const { error } = await supabase
      .from('profiles')
      .update(databaseData)
      .eq('id', user.id)

    if (error) {
      throw new Error(
        'Не удалось сохранить изменения профиля',
      )
    }

    return loadProfile(user.id)
  }

  async function refreshUser() {
    if (!user) {
      return null
    }

    return loadProfile(user.id)
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

function normalizeProfile(profile) {
  return {
    id: profile.id,
    name: profile.name || '',
    email: profile.email || '',
    role: profile.role || 'Ученик',
    school: profile.school || '',
    className: profile.class_name || '',
    points: Number(profile.points ?? 0),
    xp: Number(profile.xp ?? 0),
    streak: Number(profile.streak ?? 0),
    bestStreak: Number(
      profile.best_streak ?? 0,
    ),
    freezes: Number(profile.freezes ?? 0),
    completedTasks: Number(
      profile.completed_tasks ?? 0,
    ),
    achievements: Array.isArray(
      profile.achievements,
    )
      ? profile.achievements
      : [],
    lastActivityDate:
      profile.last_activity_date || '',
    createdAt: profile.created_at || '',
  }
}

function convertProfileUpdate(data) {
  const result = {}

  if ('name' in data) {
    result.name = data.name
  }

  if ('role' in data) {
    result.role = data.role
  }

  if ('school' in data) {
    result.school = data.school
  }

  if ('className' in data) {
    result.class_name = data.className
  }

  if ('points' in data) {
    result.points = data.points
  }

  if ('xp' in data) {
    result.xp = data.xp
  }

  if ('streak' in data) {
    result.streak = data.streak
  }

  if ('bestStreak' in data) {
    result.best_streak = data.bestStreak
  }

  if ('freezes' in data) {
    result.freezes = data.freezes
  }

  if ('completedTasks' in data) {
    result.completed_tasks =
      data.completedTasks
  }

  if ('achievements' in data) {
    result.achievements =
      data.achievements
  }

  if ('lastActivityDate' in data) {
    result.last_activity_date =
      data.lastActivityDate
  }

  return result
}

function mergeUserIntoLocalStorage(user) {
  const users = getUsers()

  const exists = users.some(
    (existingUser) =>
      existingUser.id === user.id,
  )

  const updatedUsers = exists
    ? users.map((existingUser) =>
        existingUser.id === user.id
          ? {
              ...existingUser,
              ...user,
            }
          : existingUser,
      )
    : [...users, user]

  saveUsers(updatedUsers)
}

function translateAuthError(message) {
  const normalizedMessage =
    String(message || '').toLowerCase()

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

  return message || 'Произошла ошибка'
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error(
      'useAuth должен находиться внутри AuthProvider',
    )
  }

  return context
}