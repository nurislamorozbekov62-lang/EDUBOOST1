const NOTIFICATIONS_KEY = 'eduboost_notifications'

function readNotifications() {
  try {
    return (
      JSON.parse(
        localStorage.getItem(NOTIFICATIONS_KEY),
      ) || []
    )
  } catch {
    return []
  }
}

function saveNotifications(notifications) {
  localStorage.setItem(
    NOTIFICATIONS_KEY,
    JSON.stringify(notifications),
  )
}

export function createNotification({
  userId,
  title,
  message,
  type = 'info',
  link = '/',
}) {
  if (!userId) {
    return null
  }

  const notifications = readNotifications()

  const notification = {
    id: crypto.randomUUID(),
    userId,
    title,
    message,
    type,
    link,
    isRead: false,
    createdAt: new Date().toISOString(),
  }

  notifications.push(notification)
  saveNotifications(notifications)

  return notification
}

export function createNotificationsForUsers(
  userIds,
  notificationData,
) {
  userIds.forEach((userId) => {
    createNotification({
      userId,
      ...notificationData,
    })
  })
}

export function getUserNotifications(userId) {
  return readNotifications()
    .filter(
      (notification) =>
        notification.userId === userId,
    )
    .sort(
      (first, second) =>
        new Date(second.createdAt) -
        new Date(first.createdAt),
    )
}

export function getUnreadCount(userId) {
  return getUserNotifications(userId).filter(
    (notification) => !notification.isRead,
  ).length
}

export function markNotificationAsRead(
  notificationId,
  userId,
) {
  const notifications = readNotifications()

  const updatedNotifications =
    notifications.map((notification) =>
      notification.id === notificationId &&
      notification.userId === userId
        ? {
            ...notification,
            isRead: true,
          }
        : notification,
    )

  saveNotifications(updatedNotifications)
}

export function markAllNotificationsAsRead(
  userId,
) {
  const notifications = readNotifications()

  const updatedNotifications =
    notifications.map((notification) =>
      notification.userId === userId
        ? {
            ...notification,
            isRead: true,
          }
        : notification,
    )

  saveNotifications(updatedNotifications)
}

export function deleteNotification(
  notificationId,
  userId,
) {
  const updatedNotifications =
    readNotifications().filter(
      (notification) =>
        !(
          notification.id === notificationId &&
          notification.userId === userId
        ),
    )

  saveNotifications(updatedNotifications)
}

export function clearUserNotifications(userId) {
  const updatedNotifications =
    readNotifications().filter(
      (notification) =>
        notification.userId !== userId,
    )

  saveNotifications(updatedNotifications)
}

export function getStudentsForTask(task) {
  try {
    const users =
      JSON.parse(
        localStorage.getItem('eduboost_users'),
      ) || []

    return users.filter(
      (user) =>
        user.role === 'Ученик' &&
        user.school === task.school &&
        user.className === task.className,
    )
  } catch {
    return []
  }
}

export function getParentsForStudent(
  studentId,
) {
  try {
    const links =
      JSON.parse(
        localStorage.getItem(
          'eduboost_parent_links',
        ),
      ) || []

    return links
      .filter(
        (link) =>
          link.studentId === studentId,
      )
      .map((link) => link.parentId)
  } catch {
    return []
  }
}