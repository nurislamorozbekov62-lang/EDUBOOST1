const USERS_KEY = 'eduboost_users'
const CURRENT_USER_KEY = 'eduboost_current_user'

export function getUsers() {
  try {
    return JSON.parse(
      localStorage.getItem(USERS_KEY),
    ) || []
  } catch {
    return []
  }
}

export function saveUsers(users) {
  localStorage.setItem(
    USERS_KEY,
    JSON.stringify(users),
  )
}

export function getCurrentUser() {
  try {
    return JSON.parse(
      localStorage.getItem(CURRENT_USER_KEY),
    ) || null
  } catch {
    return null
  }
}

export function saveCurrentUser(user) {
  localStorage.setItem(
    CURRENT_USER_KEY,
    JSON.stringify(user),
  )
}

export function removeCurrentUser() {
  localStorage.removeItem(CURRENT_USER_KEY)
}

export function updateStoredUser(
  userId,
  updatedData,
) {
  const users = getUsers()

  const updatedUsers = users.map((user) =>
    user.id === userId
      ? {
          ...user,
          ...updatedData,
        }
      : user,
  )

  saveUsers(updatedUsers)

  return updatedUsers.find(
    (user) => user.id === userId,
  )
}