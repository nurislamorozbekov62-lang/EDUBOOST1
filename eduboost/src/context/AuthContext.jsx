import {
  createContext,
  useContext,
  useState,
} from 'react'

import {
  getCurrentUser,
  getUsers,
  removeCurrentUser,
  saveCurrentUser,
  saveUsers,
  updateStoredUser,
} from '../services/storage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() =>
    getCurrentUser(),
  )

  function register(formData) {
    const users = getUsers()
    const email =
      formData.email.trim().toLowerCase()

    const accountExists = users.some(
      (existingUser) =>
        existingUser.email === email,
    )

    if (accountExists) {
      throw new Error(
        'Аккаунт с такой почтой уже существует',
      )
    }

    const newUser = {
      id: crypto.randomUUID(),
      name: formData.name.trim(),
      email,
      password: formData.password,
      role: formData.role,
      school: formData.school.trim(),
      className:
        formData.role === 'Ученик'
          ? formData.className
          : '',
      points: 0,
      xp: 0,
      streak: 0,
      bestStreak: 0,
      freezes: 0,
      completedTasks: 0,
      achievements: [],
      lastActivityDate: '',
      createdAt: new Date().toISOString(),
    }

    const updatedUsers = [...users, newUser]

    saveUsers(updatedUsers)
    saveCurrentUser(newUser)
    setUser(newUser)
  }

  function login(email, password) {
    const normalizedEmail =
      email.trim().toLowerCase()

    const foundUser = getUsers().find(
      (existingUser) =>
        existingUser.email ===
          normalizedEmail &&
        existingUser.password === password,
    )

    if (!foundUser) {
      throw new Error(
        'Неверная почта или пароль',
      )
    }

    saveCurrentUser(foundUser)
    setUser(foundUser)
  }

  function logout() {
    removeCurrentUser()
    setUser(null)
  }

  function updateUser(updatedData) {
    if (!user) {
      return null
    }

    const updatedUser = updateStoredUser(
      user.id,
      updatedData,
    )

    saveCurrentUser(updatedUser)
    setUser(updatedUser)

    return updatedUser
  }

  function refreshUser() {
    if (!user) {
      return
    }

    const freshUser = getUsers().find(
      (existingUser) =>
        existingUser.id === user.id,
    )

    if (freshUser) {
      saveCurrentUser(freshUser)
      setUser(freshUser)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
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

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error(
      'useAuth должен находиться внутри AuthProvider',
    )
  }

  return context
}